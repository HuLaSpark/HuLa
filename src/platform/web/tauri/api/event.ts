/**
 * Browser replacement of @tauri-apps/api/event: events inside a tab and between tabs.
 */
import { addListener, emitEvent, removeListener, type EventTarget as BusTarget } from '../../runtime/bus'
import { LABEL } from '../../runtime/label'

export type EventName = string
export type EventTarget =
  | { kind: 'Any' }
  | { kind: 'AnyLabel'; label: string }
  | { kind: 'App' }
  | { kind: 'Window'; label: string }
  | { kind: 'Webview'; label: string }
  | { kind: 'WebviewWindow'; label: string }

export interface Event<T> {
  event: EventName
  id: number
  payload: T
}

export type EventCallback<T> = (event: Event<T>) => void
export type UnlistenFn = () => void

export interface Options {
  target?: string | EventTarget
}

export enum TauriEvent {
  WINDOW_RESIZED = 'tauri://resize',
  WINDOW_MOVED = 'tauri://move',
  WINDOW_CLOSE_REQUESTED = 'tauri://close-requested',
  WINDOW_DESTROYED = 'tauri://destroyed',
  WINDOW_FOCUS = 'tauri://focus',
  WINDOW_BLUR = 'tauri://blur',
  WINDOW_SCALE_FACTOR_CHANGED = 'tauri://scale-change',
  WINDOW_THEME_CHANGED = 'tauri://theme-changed',
  WINDOW_CREATED = 'tauri://window-created',
  WEBVIEW_CREATED = 'tauri://webview-created',
  DRAG_ENTER = 'tauri://drag-enter',
  DRAG_OVER = 'tauri://drag-over',
  DRAG_DROP = 'tauri://drag-drop',
  DRAG_LEAVE = 'tauri://drag-leave'
}

/** Label a listener is bound to: null for "any target" listeners. */
function listenerLabel(target?: string | EventTarget): string | null {
  if (target == null) return null
  if (typeof target === 'string') return target
  if (target.kind === 'Any' || target.kind === 'App') return null
  return target.label
}

export async function listen<T>(event: EventName, handler: EventCallback<T>, options?: Options): Promise<UnlistenFn> {
  const id = addListener(event, handler as EventCallback<unknown>, listenerLabel(options?.target))
  return () => removeListener(event, id)
}

export async function once<T>(event: EventName, handler: EventCallback<T>, options?: Options): Promise<UnlistenFn> {
  const unlisten = await listen<T>(
    event,
    (e) => {
      unlisten()
      handler(e)
    },
    options
  )
  return unlisten
}

export async function emit<T>(event: string, payload?: T): Promise<void> {
  emitEvent(event, payload ?? null)
}

export async function emitTo<T>(target: EventTarget | string, event: string, payload?: T): Promise<void> {
  emitEvent(event, payload ?? null, target as BusTarget)
}

/** Label of this tab, used by the window modules. */
export const currentLabel = LABEL
