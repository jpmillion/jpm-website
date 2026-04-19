/**
 * Shared top-K retrieval over `chunks`. Used by both the raw retrieval
 * endpoint (`POST /api/chat/query`) and the generation endpoint
 * (`POST /api/chat`), so the ranking logic can't drift between them.
 */

import { cosineDistance, eq, sql } from 'drizzle-orm'

import { db } from '../database/index'
import { chunks, documents } from '../database/schema'
import { embedQuery } from './embed'

export const DEFAULT_TOP_K = 6
export const MAX_TOP_K = 20

// A single retrieved chunk plus its source document metadata and the
// cosine distance to the query (lower is closer).
export type RetrievedChunk = {
  content: string
  chunkIndex: number
  title: string
  sourcePath: string
  distance: number
}

/**
 * Embeds `query` and returns the `topK` closest chunks by cosine
 * distance, joined to `documents` for title/source-path metadata.
 *
 * Callers are expected to have already validated/clamped `topK`
 * (see `clampTopK`).
 */
export async function retrieve(query: string, topK: number): Promise<RetrievedChunk[]> {
  const embedding = await embedQuery(query)
  // `cosineDistance` returns `SQL<unknown>`; wrap it to tag the scalar
  // as a number for the select's return-type inference.
  const distance = sql<number>`${cosineDistance(chunks.embedding, embedding)}`

  // Ordering by the same expression lets Postgres use the HNSW cosine index.
  return db
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
}

/** Coerces an arbitrary `topK` to an integer in `[1, MAX_TOP_K]`. */
export function clampTopK(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return DEFAULT_TOP_K
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_TOP_K)
}
