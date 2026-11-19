/**
 * AI streaming (ai_message_send_stream / ai_message_cancel_stream). Like the Rust command, the call
 * returns once the response headers arrive; every `data:` line becomes a "chunk" event and the end
 * of the stream sends "done" with all payloads concatenated.
 */
import { errorText } from '../runtime/bytes'
import type { Channel } from '../runtime/channel'
import { authHeaders, buildUrl, refreshToken } from './http'
import { IM_URLS } from './imUrls'
import { registerCommands } from './registry'

const streams = new Map<string, AbortController>()

function streamError(status: number) {
  if (status === 406) return 'token过期，请刷新后重试'
  if (status === 401) return '请重新登录'
  return `请求失败，状态码: ${status}`
}

// The server reports auth failures as a JSON body: turn it into an error (after one refresh for 406).
async function openStream(body: unknown, signal: AbortSignal): Promise<Response> {
  const [method, path] = IM_URLS.messageSendStream
  for (let attempt = 0; attempt <= 1; attempt++) {
    const res = await fetch(buildUrl(path), {
      method,
      headers: { ...authHeaders(), Accept: 'text/event-stream' },
      body: JSON.stringify(body || {}),
      signal
    })
    if (!res.ok) throw streamError(res.status)
    if (!(res.headers.get('content-type') || '').includes('application/json')) return res
    const result = await res.json().catch(() => null)
    const code = result?.code
    if (code === 406 && attempt === 0) {
      await refreshToken()
      continue
    }
    throw code === 406 || code === 401 ? streamError(code) : result?.msg || '请求失败'
  }
  throw streamError(406)
}

async function sendStream(args: any) {
  const requestId: string = args.requestId
  const channel = args.onEvent as Channel<unknown> | undefined
  const event = (eventType: string, data?: unknown, error?: string) => ({
    eventType,
    data: data ?? null,
    error: error ?? null,
    requestId
  })
  const controller = new AbortController()
  let res: Response
  try {
    res = await openStream(args.body, controller.signal)
  } catch (e) {
    const message = errorText(e)
    channel?.send(event('error', null, message))
    throw message
  }
  streams.set(requestId, controller)
  void (async () => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let full = ''
    const handleText = (text: string) => {
      buffer += text
      let pos = buffer.indexOf('\n\n')
      while (pos >= 0) {
        const message = buffer.slice(0, pos)
        buffer = buffer.slice(pos + 2)
        for (const line of message.split(/\r?\n/)) {
          if (!line.startsWith('data:')) continue
          const data = line.startsWith('data: ') ? line.slice(6) : line.slice(5)
          full += data
          channel?.send(event('chunk', data))
        }
        pos = buffer.indexOf('\n\n')
      }
    }
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) {
          handleText(decoder.decode())
          break
        }
        handleText(decoder.decode(value, { stream: true }))
      }
    } catch (e) {
      if (controller.signal.aborted) return
      channel?.send(event('error', null, errorText(e)))
    }
    if (controller.signal.aborted) return
    channel?.send(event('done', full))
  })()
  return null
}

registerCommands({
  ai_message_send_stream: (args) => sendStream(args),
  ai_message_cancel_stream(args) {
    const controller = streams.get(args.requestId)
    if (!controller) throw `未找到指定请求ID的任务: ${args.requestId}`
    streams.delete(args.requestId)
    controller.abort()
    return null
  }
})
