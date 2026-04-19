<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue'

// Shape of a single citation returned in the SSE `citations` frame,
// matching `Citation` in server/api/chat/index.post.ts.
type Citation = {
  index: number
  title: string
  sourcePath: string
  distance: number
}

// A message in the locally-held transcript. `error` takes priority over
// `content` during render and is set when the request fails (pre-stream
// 400/500 JSON body, network error, or a terminal SSE `error` frame).
type Message = {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  error?: string
}

const messages = ref<Message[]>([])
const input = ref('')
const streaming = ref(false)

const transcriptEl = useTemplateRef<HTMLDivElement>('transcript')

/**
 * Sends the current input as a chat query, opening an SSE stream to
 * `/api/chat`. Each streamed token is appended to the in-flight
 * assistant message so the transcript updates live.
 */
async function submit() {
  const query = input.value.trim()
  if (!query || streaming.value) return

  // Snapshot `history` *before* appending the new user message so it
  // lines up with what the server expects: prior turns only.
  const history = messages.value
    .filter((m) => !m.error && m.content.length > 0)
    .map((m) => ({ role: m.role, content: m.content }))

  messages.value.push({ role: 'user', content: query })
  const assistantIndex = messages.value.push({ role: 'assistant', content: '' }) - 1
  input.value = ''
  streaming.value = true
  await nextTick()
  scrollToBottom()

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, history }),
    })

    // Non-OK means validation/500 — the server still responds with JSON,
    // not SSE, so we can read the body as JSON and surface the message.
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { statusMessage?: string; message?: string }
        | null
      setError(
        assistantIndex,
        data?.statusMessage || data?.message || `Request failed (${res.status})`,
      )
      return
    }
    if (!res.body) {
      setError(assistantIndex, 'No response body')
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames end in a blank line. There may be several per read.
      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const raw = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        if (raw.startsWith('data: ')) {
          handleFrame(JSON.parse(raw.slice(6)), assistantIndex)
        }
        boundary = buffer.indexOf('\n\n')
      }
      await nextTick()
      scrollToBottom()
    }
  } catch (err) {
    setError(assistantIndex, err instanceof Error ? err.message : 'Network error')
  } finally {
    streaming.value = false
    await nextTick()
    scrollToBottom()
  }
}

/** Applies one parsed SSE frame to the in-flight assistant message. */
function handleFrame(
  frame:
    | { type: 'citations'; citations: Citation[] }
    | { type: 'token'; value: string }
    | { type: 'error'; message: string }
    | { type: 'done' },
  idx: number,
) {
  const msg = messages.value[idx]
  if (!msg) return
  if (frame.type === 'citations') msg.citations = frame.citations
  else if (frame.type === 'token') msg.content += frame.value
  else if (frame.type === 'error') msg.error = frame.message
  // 'done' frames are a no-op — the stream closing is the real signal.
}

function setError(idx: number, message: string) {
  const msg = messages.value[idx]
  if (msg) msg.error = message
}

function scrollToBottom() {
  const el = transcriptEl.value
  if (el) el.scrollTop = el.scrollHeight
}
</script>

<template>
  <section id="chat" class="py-20 px-6 bg-white dark:bg-gray-900">
    <UContainer>
      <div class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-bold mb-4">
            Ask Me Anything
          </h2>
          <p class="text-gray-500 dark:text-gray-400">
            Chat with an AI assistant grounded in my resume and project history.
          </p>
        </div>

        <UCard>
          <div class="flex flex-col h-[32rem]">
            <!-- Transcript -->
            <div
              ref="transcript"
              class="flex-1 overflow-y-auto pb-4 space-y-4"
            >
              <div
                v-if="messages.length === 0"
                class="text-sm text-gray-500 dark:text-gray-400 italic text-center py-16"
              >
                Ask about specific projects, roles, or skills — answers are grounded in John's
                resume and project write-ups, with citations back to the source.
              </div>

              <div
                v-for="(msg, i) in messages"
                :key="i"
                :class="msg.role === 'user' ? 'text-right' : 'text-left'"
              >
                <div
                  class="inline-block max-w-[90%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap break-words"
                  :class="
                    msg.role === 'user'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800'
                  "
                >
                  <span v-if="msg.error" class="text-red-500 dark:text-red-400">
                    {{ msg.error }}
                  </span>
                  <span v-else-if="msg.content">{{ msg.content }}</span>
                  <span
                    v-else-if="msg.role === 'assistant'"
                    class="text-gray-400 italic"
                  >
                    thinking…
                  </span>
                </div>

                <div
                  v-if="msg.role === 'assistant' && msg.citations && msg.citations.length"
                  class="mt-2 flex flex-wrap gap-1.5"
                >
                  <UBadge
                    v-for="c in msg.citations"
                    :key="c.index"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    :title="c.sourcePath"
                  >
                    [{{ c.index }}] {{ c.title }}
                  </UBadge>
                </div>
              </div>
            </div>

            <!-- Input -->
            <form
              class="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-800"
              @submit.prevent="submit"
            >
              <UInput
                v-model="input"
                :disabled="streaming"
                placeholder="Ask about John's experience..."
                class="flex-1"
                size="lg"
              />
              <UButton
                type="submit"
                :loading="streaming"
                :disabled="!input.trim() || streaming"
                size="lg"
              >
                Ask
              </UButton>
            </form>
          </div>
        </UCard>
      </div>
    </UContainer>
  </section>
</template>
