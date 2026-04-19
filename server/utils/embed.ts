/**
 * OpenAI embedding helpers. Shared between the ingestion script
 * (`server/scripts/ingest.ts`) and any retrieval endpoints that need
 * to embed a user query before searching `chunks.embedding`.
 *
 * Requires `OPENAI_API_KEY` in the environment.
 */

import OpenAI from 'openai'

// `text-embedding-3-small` produces 1536-dim vectors, matching the
// `chunks.embedding` column in the Drizzle schema.
export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

// The batch endpoint accepts up to 2048 inputs per request; staying well
// below keeps progress visible and caps retry cost on transient failures.
const EMBEDDING_BATCH_SIZE = 128

let openaiClient: OpenAI | null = null
function client(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI() // reads OPENAI_API_KEY from env
  return openaiClient
}

/**
 * Embeds a single string — used at query time to vectorise the user's
 * question before the cosine-distance search.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedBatch([text])
  return embedding!
}

/**
 * Embeds a list of strings, preserving input order. Splits into batches
 * of `EMBEDDING_BATCH_SIZE` so large documents don't exceed per-request
 * token limits. Used by the ingestion script.
 */
export async function embedBatch(contents: string[]): Promise<number[][]> {
  if (contents.length === 0) return []
  const c = client()
  const embeddings: number[][] = []

  for (let start = 0; start < contents.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = contents.slice(start, start + EMBEDDING_BATCH_SIZE)
    const response = await c.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    })
    // OpenAI returns embeddings in input order; sort on `index` as a
    // safety net in case that ever changes.
    const sorted = [...response.data].sort((a, b) => a.index - b.index)
    for (const item of sorted) embeddings.push(item.embedding)
  }

  return embeddings
}
