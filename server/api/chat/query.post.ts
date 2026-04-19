/**
 * RAG retrieval endpoint. Embeds the caller's query with OpenAI
 * `text-embedding-3-small` and returns the top-K closest chunks from
 * pgvector by cosine distance. The HNSW index on `chunks.embedding`
 * is what makes this fast.
 *
 * Request body:  { query: string, topK?: number }
 * Response body: { results: [{ content, title, sourcePath, chunkIndex, distance }] }
 */

import { cosineDistance, eq } from 'drizzle-orm'

import { db } from '../../database/index'
import { chunks, documents } from '../../database/schema'
import { embedQuery } from '../../utils/embed'

// Query-shape guardrails. The embedding model itself accepts up to 8191
// tokens, but real user questions are much shorter — a hard cap keeps
// runaway inputs from burning tokens or destabilising retrieval.
const MAX_QUERY_LENGTH = 2000
const DEFAULT_TOP_K = 6
const MAX_TOP_K = 20

export default defineEventHandler(async (event) => {
  const body = await readBody<{ query?: unknown; topK?: unknown }>(event)

  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  if (!query) {
    throw createError({ statusCode: 400, statusMessage: '`query` is required' })
  }
  if (query.length > MAX_QUERY_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `\`query\` must be <= ${MAX_QUERY_LENGTH} characters`,
    })
  }
  const topK = clampTopK(body?.topK)

  const embedding = await embedQuery(query)
  const distance = cosineDistance(chunks.embedding, embedding)

  // Ordering by the same expression lets Postgres use the HNSW cosine index.
  const results = await db
    .select({
      content: chunks.content,
      chunkIndex: chunks.chunkIndex,
      title: documents.title,
      sourcePath: documents.sourcePath,
      distance,
    })
    .from(chunks)
    .innerJoin(documents, eq(documents.id, chunks.documentId))
    .orderBy(distance)
    .limit(topK)

  return { results }
})

/** Coerces an arbitrary `topK` to an integer in [1, MAX_TOP_K]. */
function clampTopK(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_TOP_K
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_TOP_K)
}
