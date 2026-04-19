/**
 * RAG ingestion script.
 *
 * Reads every `*.md` file in `professional-experience-context/`, chunks it,
 * embeds each chunk with OpenAI `text-embedding-3-small`, and upserts the
 * result into the `documents` / `chunks` tables for pgvector similarity
 * search.
 *
 * Idempotent: a document whose content hash already matches the DB row is
 * skipped; a changed document has its old chunks deleted and replaced.
 *
 * Requires `OPENAI_API_KEY` plus the Postgres env vars in `.env`.
 *
 * Run with:
 *   tsx --env-file=.env server/scripts/ingest.ts
 * or via `make ingest` (added in a later step).
 */

import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import { and, eq } from 'drizzle-orm'
import { getEncoding, type Tiktoken } from 'js-tiktoken'

import { db, pool } from '../database/index'
import { chunks, documents } from '../database/schema'
import { embedBatch } from '../utils/embed'

// Directory holding the source markdown. Gitignored — treated as read-only.
const SOURCE_DIR = 'professional-experience-context'

// Chunking budget. text-embedding-3-small accepts up to 8191 tokens per input,
// but retrieval works best with small, focused chunks. 500 with 50-token
// overlap keeps each chunk tight while preserving cross-chunk context.
const MAX_TOKENS = 500
const OVERLAP_TOKENS = 50

// text-embedding-3-small uses the `cl100k_base` encoding. Loading the
// encoding is not free (~1MB BPE table), so reuse one instance per run.
let encoderInstance: Tiktoken | null = null
function encoder(): Tiktoken {
  if (!encoderInstance) encoderInstance = getEncoding('cl100k_base')
  return encoderInstance
}

// One chunk-sized slice of a source document, ready for embedding.
type PreparedChunk = {
  content: string
  tokenCount: number
}

/**
 * Entry point. Walks the source directory, processes each markdown file,
 * and prints a summary.
 */
async function main() {
  const files = await findMarkdownFiles(SOURCE_DIR)
  if (files.length === 0) {
    console.warn(`No markdown files found in ${SOURCE_DIR}/`)
    return
  }

  let processed = 0
  let skipped = 0

  for (const file of files) {
    const result = await ingestFile(file)
    if (result === 'skipped') skipped++
    else processed++
  }

  console.log(`Ingest complete: ${processed} processed, ${skipped} unchanged.`)
}

/**
 * Returns absolute-ish paths to every `.md` file directly inside `dir`.
 * Non-recursive — the source directory is flat today.
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.md')
    .map((e) => join(dir, e.name))
}

/**
 * Ingests a single markdown file.
 *
 * Returns `'skipped'` when the file's content hash already matches the stored
 * document (nothing to do), otherwise `'processed'`.
 */
async function ingestFile(path: string): Promise<'processed' | 'skipped'> {
  const raw = await readFile(path, 'utf8')
  const contentHash = sha256(raw)
  const title = basename(path, extname(path))

  // Fast path: same file, same content — no re-embedding needed.
  const existing = await db.query.documents.findFirst({
    where: and(eq(documents.sourcePath, path), eq(documents.contentHash, contentHash)),
  })
  if (existing) return 'skipped'

  const prepared = prepareChunks(raw)
  const embeddings = await embedBatch(prepared.map((c) => c.content))

  // Upsert the document row and replace its chunks in a single transaction
  // so a partial failure can't leave orphaned or stale chunks behind.
  await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(documents)
      .values({ sourcePath: path, title, contentHash })
      .onConflictDoUpdate({
        target: documents.sourcePath,
        set: { title, contentHash, updatedAt: new Date() },
      })
      .returning({ id: documents.id })

    await tx.delete(chunks).where(eq(chunks.documentId, doc.id))

    if (prepared.length > 0) {
      await tx.insert(chunks).values(
        prepared.map((c, i) => ({
          documentId: doc.id,
          chunkIndex: i,
          content: c.content,
          tokenCount: c.tokenCount,
          embedding: embeddings[i]!,
        })),
      )
    }
  })

  console.log(`  ${title}: ${prepared.length} chunk(s)`)
  return 'processed'
}

/**
 * Splits raw markdown into embedding-sized chunks with token counts.
 *
 * Strategy:
 *   1. Split the document on blank lines into paragraph-level segments.
 *      Markdown headings sit on their own line and naturally become their
 *      own segments, which keeps them next to the content they introduce.
 *   2. Hard-split any single paragraph larger than `MAX_TOKENS` into
 *      token-sized slices so the greedy packer always has fitting pieces.
 *   3. Greedy-pack segments into chunks of up to `MAX_TOKENS` tokens.
 *   4. Prepend the tail `OVERLAP_TOKENS` of the previous chunk to each
 *      subsequent chunk so retrieval at chunk boundaries still has context.
 */
function prepareChunks(raw: string): PreparedChunk[] {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return []
  const enc = encoder()

  // Step 1 & 2: build paragraph-level segments with their token encodings.
  type Segment = { text: string; tokens: number[] }
  const segments: Segment[] = []
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  for (const paragraph of paragraphs) {
    const tokens = enc.encode(paragraph)
    if (tokens.length <= MAX_TOKENS) {
      segments.push({ text: paragraph, tokens })
      continue
    }
    // Oversized paragraph — slice it into MAX_TOKENS-wide pieces.
    for (let i = 0; i < tokens.length; i += MAX_TOKENS) {
      const slice = tokens.slice(i, i + MAX_TOKENS)
      segments.push({ text: enc.decode(slice), tokens: slice })
    }
  }

  // Step 3: greedy-pack segments into chunks without overlap.
  type Packed = { text: string; tokens: number[] }
  const packed: Packed[] = []
  let bufferText: string[] = []
  let bufferTokens: number[] = []

  const flush = () => {
    if (bufferTokens.length === 0) return
    packed.push({ text: bufferText.join('\n\n'), tokens: bufferTokens })
    bufferText = []
    bufferTokens = []
  }

  for (const seg of segments) {
    if (bufferTokens.length > 0 && bufferTokens.length + seg.tokens.length > MAX_TOKENS) {
      flush()
    }
    bufferText.push(seg.text)
    bufferTokens.push(...seg.tokens)
  }
  flush()

  // Step 4: prepend a small overlap from the previous chunk's tail.
  const result: PreparedChunk[] = []
  for (let i = 0; i < packed.length; i++) {
    const current = packed[i]!
    if (i === 0) {
      result.push({ content: current.text, tokenCount: current.tokens.length })
      continue
    }
    const overlapTokens = packed[i - 1]!.tokens.slice(-OVERLAP_TOKENS)
    const overlapText = enc.decode(overlapTokens)
    result.push({
      content: `${overlapText}\n\n${current.text}`,
      tokenCount: overlapTokens.length + current.tokens.length,
    })
  }

  return result
}

/** Hex-encoded SHA-256 of the input. Used as the document content hash. */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
