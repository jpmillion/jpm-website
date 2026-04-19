/**
 * RAG chat endpoint (Server-Sent Events).
 *
 * Runs the same top-K retrieval as `POST /api/chat/query`, then asks
 * OpenAI `gpt-4o-mini` to answer grounded in those chunks, streaming the
 * response back as SSE so the UI can render tokens as they arrive.
 *
 * Request body: { query: string, history?: ChatMessage[], topK?: number }
 *
 * Response is `text/event-stream` with three kinds of frames:
 *   { type: 'citations', citations: Citation[] }   — sent once, first
 *   { type: 'token', value: string }               — one per streamed delta
 *   { type: 'done' }                               — final frame on success
 *   { type: 'error', message: string }             — sent instead of 'done'
 *                                                    if generation fails
 *
 * The model is instructed to cite excerpts by their numeric index
 * (e.g. `[1]`), which the UI can map back to the titles/source paths
 * in the initial `citations` frame.
 *
 * ChatMessage = { role: 'user' | 'assistant', content: string }
 * Citation    = { index, title, sourcePath, distance }
 */

import OpenAI from 'openai'

import { clampTopK, retrieve, type RetrievedChunk } from '../../utils/retrieve'

// Query-shape guardrails — same cap as the retrieval endpoint.
const MAX_QUERY_LENGTH = 2000

// History limits. 6 messages ≈ 3 turns of back-and-forth, enough for
// short follow-ups while keeping the prompt tight.
const MAX_HISTORY_MESSAGES = 6
const MAX_HISTORY_CONTENT_LENGTH = 4000

// Answer generation model. `gpt-4o-mini` is cheap and plenty capable
// for answering from pre-retrieved excerpts.
const CHAT_MODEL = 'gpt-4o-mini'
const MAX_OUTPUT_TOKENS = 1024

// Instructs the model to stay grounded in retrieved context and cite
// excerpts by the numeric index assigned in the CONTEXT block below.
const SYSTEM_PROMPT = `You are a helpful assistant on John Million's personal website, answering questions about his professional experience.

Ground every claim in the numbered CONTEXT excerpts below. Speak in the third person ("John worked on...", "He built..."). If the excerpts don't contain enough information to answer the question, say so — do not invent details.

Cite the excerpts you use with bracketed indices like [1] or [2, 3], matching the CONTEXT entries. Place citations at the end of the sentence they support.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type Citation = { index: number; title: string; sourcePath: string; distance: number }

let openaiClient: OpenAI | null = null
function openai(): OpenAI {
  if (!openaiClient) openaiClient = new OpenAI() // reads OPENAI_API_KEY from env
  return openaiClient
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    query?: unknown
    history?: unknown
    topK?: unknown
  }>(event)

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
  const history = sanitizeHistory(body?.history)
  const topK = clampTopK(body?.topK)

  const chunks = await retrieve(query, topK)

  // Switch into SSE mode. Headers must be set before the first write,
  // and we only reach this line after validation + retrieval have
  // already succeeded, so earlier failures can still use normal JSON
  // error responses via `createError`.
  setResponseHeader(event, 'Content-Type', 'text/event-stream; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setResponseHeader(event, 'Connection', 'keep-alive')
  // Tells nginx (and similar proxies) not to buffer the stream.
  setResponseHeader(event, 'X-Accel-Buffering', 'no')

  const res = event.node.res
  const write = (frame: unknown) => {
    res.write(`data: ${JSON.stringify(frame)}\n\n`)
  }

  // Send citations up front so the UI can render source chips
  // alongside the still-streaming answer.
  write({ type: 'citations', citations: toCitations(chunks) })

  try {
    const stream = await openai().chat.completions.create({
      model: CHAT_MODEL,
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\n${formatContext(chunks)}` },
        ...history,
        { role: 'user', content: query },
      ],
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) write({ type: 'token', value: delta })
    }
    write({ type: 'done' })
  } catch (err) {
    // Headers are already sent, so we can't use createError here.
    // Surface a terminal frame and let the caller decide how to recover.
    console.error('[chat] generation failed:', err)
    write({ type: 'error', message: 'Generation failed' })
  } finally {
    res.end()
  }
})

/**
 * Renders retrieved chunks as a numbered CONTEXT block. The indices
 * match what we return to the caller as `citations`, so the model's
 * `[n]` references are unambiguous on the client side.
 */
function formatContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'CONTEXT:\n\n(no relevant excerpts were retrieved)'
  }
  const entries = chunks
    .map((c, i) => `[${i + 1}] From "${c.title}":\n${c.content}`)
    .join('\n\n')
  return `CONTEXT:\n\n${entries}`
}

/** Pairs each chunk with the 1-based index the model sees in the prompt. */
function toCitations(chunks: RetrievedChunk[]): Citation[] {
  return chunks.map((c, i) => ({
    index: i + 1,
    title: c.title,
    sourcePath: c.sourcePath,
    distance: c.distance,
  }))
}

/**
 * Validates and truncates history. Silently drops malformed entries and
 * caps the tail to `MAX_HISTORY_MESSAGES` to keep the prompt bounded.
 */
function sanitizeHistory(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const cleaned: ChatMessage[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const { role, content } = item as { role?: unknown; content?: unknown }
    if (role !== 'user' && role !== 'assistant') continue
    if (typeof content !== 'string' || content.length === 0) continue
    cleaned.push({
      role,
      content: content.length > MAX_HISTORY_CONTENT_LENGTH
        ? content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
        : content,
    })
  }
  return cleaned.slice(-MAX_HISTORY_MESSAGES)
}
