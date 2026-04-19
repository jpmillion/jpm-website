// Drizzle schema. Add table definitions here as the app grows;
// run `make db-generate` then `make db-migrate` after changes.
//
// RAG pipeline tables: source markdown files in `professional-experience-context/`
// are ingested into `documents`, chunked, embedded with OpenAI
// `text-embedding-3-small` (1536 dims), and stored in `chunks` for pgvector
// similarity search.

import { pgTable, text, integer, timestamp, uuid, vector, index, uniqueIndex } from 'drizzle-orm/pg-core'

// One row per ingested source file.
// `contentHash` lets ingestion skip unchanged files on re-run.
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourcePath: text('source_path').notNull(),
    title: text('title').notNull(),
    contentHash: text('content_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('documents_source_path_idx').on(t.sourcePath)],
)

// One row per chunk. `embedding` is the OpenAI `text-embedding-3-small` vector.
// HNSW index with cosine distance for fast top-k retrieval.
export const chunks = pgTable(
  'chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('chunks_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    index('chunks_document_id_idx').on(t.documentId),
  ],
)
