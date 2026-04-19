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
 * Run with:
 *   tsx --env-file=.env server/scripts/ingest.ts
 * or via `make ingest` (added in a later step).
 */

import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import { and, eq } from 'drizzle-orm'

import { db, pool } from '../database/index'
import { chunks, documents } from '../database/schema'

// Directory holding the source markdown. Gitignored — treated as read-only.
const SOURCE_DIR = 'professional-experience-context'

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
  const embeddings = await embedChunks(prepared.map((c) => c.content))

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
 * TODO (micro-step 2b): implement heading-aware + token-capped chunking
 * using `js-tiktoken`. Current stub returns the whole document as one chunk
 * with a placeholder token count so the upsert path is exercisable.
 */
function prepareChunks(raw: string): PreparedChunk[] {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return []
  return [{ content: trimmed, tokenCount: 0 }]
}

/**
 * Embeds each chunk with OpenAI `text-embedding-3-small` (1536 dims).
 *
 * TODO (micro-step 2c): call the OpenAI embeddings API in a single batch.
 */
async function embedChunks(_contents: string[]): Promise<number[][]> {
  throw new Error('embedChunks not implemented yet — stub for micro-step 2c')
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
