import { LABEL, log } from './label'

/** Tauri event target: a window label, or { kind, label } like the real API. */
export type EventTarget = string | { kind: string; label?: string } | null | undefined

export type EventHandler = (event: { event: string; id: number; payload: any }) => void

type Listener = { id: number; handler: EventHandler; label: string | null }

const listeners = new Map<string, Listener[]>()
let listenerSeq = 1

/** Cross-tab channel: events, WebSocket relay and window close requests between tabs. */
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('web-runtime-events') : null

type BusMessage = { event: string; payload: unknown; target: EventTarget }
type ControlHandler = (data: any) => void
const controlHandlers = new Map<string, ControlHandler>()

function targetMatches(target: EventTarget): boolean {
  if (target == null) return true
  if (typeof target === 'string') return target === LABEL
  if (target.kind === 'Any') return true
  return target.label === LABEL
}

/** Runs the listeners of this tab. A listener bound to another window label never fires here. */
export function deliver(event: string, payload: unknown) {
  for (const item of (listeners.get(event) || []).slice()) {
    if (item.label != null && item.label !== LABEL) continue
    try {
      item.handler({ event, id: item.id, payload })
    } catch (e) {
      console.error('[web] event handler failed', event, e)
    }
  }
}

/** Emits to this tab (when the target matches) and to every other tab. */
export function emitEvent(event: string, payload: unknown, target?: EventTarget) {
  if (targetMatches(target)) deliver(event, payload)
  channel?.postMessage({ event, payload: clone(payload), target: target ?? null } satisfies BusMessage)
}

/** Delivers only inside this tab. */
export function emitLocal(event: string, payload: unknown) {
  deliver(event, payload)
}

export function addListener(event: string, handler: EventHandler, label: string | null = null): number {
  const id = listenerSeq++
  const list = listeners.get(event) || []
  list.push({ id, handler, label })
  listeners.set(event, list)
  return id
}

export function removeListener(event: string, id: number) {
  const list = listeners.get(event)
  if (list)
    listeners.set(
      event,
      list.filter((item) => item.id !== id)
    )
}

/** Sends a control message (not an app event) to the other tabs. */
export function postControl(type: string, data: unknown) {
  channel?.postMessage({ control: type, data: clone(data) })
}

export function onControl(type: string, handler: ControlHandler) {
  controlHandlers.set(type, handler)
}

if (channel) {
  channel.onmessage = (e: MessageEvent) => {
    const msg = e.data || {}
    if (msg.control !== undefined) {
      controlHandlers.get(msg.control)?.(msg.data)
      return
    }
    if (targetMatches(msg.target)) deliver(msg.event, msg.payload)
  }
}

// BroadcastChannel uses structured clone; Vue proxies and functions would throw.
function clone<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value
  try {
    return structuredClone(value)
  } catch {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch (e) {
      log('payload not cloneable', e)
      return null as T
    }
  }
}
