/**
 * RAG retrieval endpoint. Embeds the caller's query with OpenAI
 * `text-embedding-3-small` and returns the top-K closest chunks from
 * pgvector by cosine distance. The HNSW index on `chunks.embedding`
 * is what makes this fast.
 *
 * Request body:  { query: string, topK?: number }
 * Response body: { results: [{ content, title, sourcePath, chunkIndex, distance }] }
 */

import { clampTopK, retrieve } from '../../utils/retrieve'

// The embedding model itself accepts up to 8191 tokens, but real user
// questions are much shorter — a hard cap keeps runaway inputs from
// burning tokens or destabilising retrieval.
const MAX_QUERY_LENGTH = 2000

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

  const results = await retrieve(query, clampTopK(body?.topK))
  return { results }
})
