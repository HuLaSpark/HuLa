/**
 * Browser replacement of @tauri-apps/api/window, also the base of webview and webviewWindow.
 *
 * Every window is a browser tab. Size, position and decoration calls have no effect; show/focus
 * focuses the tab, close closes secondary tabs. Methods that are not implemented resolve to null.
 */
import { addListener, emitEvent, removeListener } from '../../runtime/bus'
import { LABEL, log } from '../../runtime/label'
import { storeBrowserFile } from '../../runtime/vfs'
import { closeWindow, focusWindow, openLabels, openWindow, windowExists } from '../../runtime/windows'
import { LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize } from './dpi'
import type { EventCallback, EventName, EventTarget, UnlistenFn } from './event'

export { LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize }

export enum UserAttentionType {
  Critical = 1,
  Informational = 2
}

export type Theme = 'light' | 'dark'

export interface Monitor {
  name: string | null
  size: PhysicalSize
  position: PhysicalPosition
  workArea: { position: PhysicalPosition; size: PhysicalSize }
  scaleFactor: number
}

export class CloseRequestedEvent {
  event: EventName
  id: number
  #prevented = false
  constructor(event: { event: EventName; id: number }) {
    this.event = event.event
    this.id = event.id
  }
  preventDefault() {
    this.#prevented = true
  }
  isPreventDefault() {
    return this.#prevented
  }
}

function monitor(): Monitor {
  const scale = window.devicePixelRatio || 1
  const size = new PhysicalSize(screen.width * scale, screen.height * scale)
  const position = new PhysicalPosition(0, 0)
  return { name: 'browser', size, position, workArea: { position, size }, scaleFactor: scale }
}

export async function currentMonitor(): Promise<Monitor | null> {
  return monitor()
}
export async function primaryMonitor(): Promise<Monitor | null> {
  return monitor()
}
export async function monitorFromPoint(): Promise<Monitor | null> {
  return monitor()
}
export async function availableMonitors(): Promise<Monitor[]> {
  return [monitor()]
}
export async function cursorPosition(): Promise<PhysicalPosition> {
  return new PhysicalPosition(0, 0)
}

type LocalHandler = EventCallback<any>

const instances = new Map<string, WebWindow>()
let localEventSeq = 1

/** One class for Window, Webview and WebviewWindow. */
export class WebWindow {
  label: string
  /** listeners of window lifecycle events (tauri://created, ...) on this instance */
  #local = new Map<string, Set<LocalHandler>>()

  constructor(label: string) {
    this.label = label
  }

  // ---------- events ----------
  async listen<T>(event: EventName, handler: EventCallback<T>): Promise<UnlistenFn> {
    if (event.startsWith('tauri://')) {
      const set = this.#local.get(event) || new Set()
      set.add(handler as LocalHandler)
      this.#local.set(event, set)
      const unbindDom =
        this.label === LABEL ? bindDomEvent(event, (payload) => this.emitLocal(event, payload)) : undefined
      return () => {
        set.delete(handler as LocalHandler)
        unbindDom?.()
      }
    }
    const id = addListener(event, handler as LocalHandler, this.label)
    return () => removeListener(event, id)
  }

  async once<T>(event: EventName, handler: EventCallback<T>): Promise<UnlistenFn> {
    const unlisten = await this.listen<T>(event, (e) => {
      unlisten()
      handler(e)
    })
    return unlisten
  }

  async emit<T>(event: string, payload?: T): Promise<void> {
    emitEvent(event, payload ?? null)
  }

  async emitTo<T>(target: string | EventTarget, event: string, payload?: T): Promise<void> {
    emitEvent(event, payload ?? null, target)
  }

  /** Runs the lifecycle listeners registered on this instance. */
  emitLocal(event: string, payload: unknown) {
    for (const handler of [...(this.#local.get(event) || [])]) {
      try {
        handler({ event, id: localEventSeq++, payload })
      } catch (e) {
        console.error('[web] window event handler failed', event, e)
      }
    }
  }

  async onCloseRequested(handler: (event: CloseRequestedEvent) => void | Promise<void>): Promise<UnlistenFn> {
    return this.listen('tauri://close-requested', (e) => handler(new CloseRequestedEvent(e)))
  }
  async onResized(handler: EventCallback<PhysicalSize>): Promise<UnlistenFn> {
    return this.listen('tauri://resize', handler)
  }
  async onMoved(handler: EventCallback<PhysicalPosition>): Promise<UnlistenFn> {
    return this.listen('tauri://move', handler)
  }
  async onFocusChanged(handler: EventCallback<boolean>): Promise<UnlistenFn> {
    const a = await this.listen('tauri://focus', (e) => handler({ ...e, payload: true }))
    const b = await this.listen('tauri://blur', (e) => handler({ ...e, payload: false }))
    return () => {
      a()
      b()
    }
  }
  async onScaleChanged(): Promise<UnlistenFn> {
    return () => {}
  }
  async onThemeChanged(): Promise<UnlistenFn> {
    return () => {}
  }
  async onDragDropEvent(handler: EventCallback<DragDropEvent>): Promise<UnlistenFn> {
    if (this.label !== LABEL) return () => {}
    return bindFileDrop((payload) => handler({ event: 'tauri://drag-drop', id: localEventSeq++, payload }))
  }

  // ---------- state ----------
  async scaleFactor() {
    return window.devicePixelRatio || 1
  }
  async innerSize() {
    return new PhysicalSize(window.innerWidth, window.innerHeight)
  }
  async outerSize() {
    return new PhysicalSize(window.outerWidth || window.innerWidth, window.outerHeight || window.innerHeight)
  }
  async innerPosition() {
    return new PhysicalPosition(0, 0)
  }
  async outerPosition() {
    return new PhysicalPosition(window.screenX || 0, window.screenY || 0)
  }
  async size() {
    return this.innerSize()
  }
  async position() {
    return this.outerPosition()
  }
  async isVisible() {
    return this.label !== LABEL || document.visibilityState === 'visible'
  }
  async isFocused() {
    return this.label === LABEL && document.hasFocus()
  }
  async isMaximized() {
    return false
  }
  async isMinimized() {
    return false
  }
  async isFullscreen() {
    return !!document.fullscreenElement
  }
  async isDecorated() {
    return true
  }
  async isResizable() {
    return true
  }
  async isEnabled() {
    return true
  }
  async isClosable() {
    return true
  }
  async isMovable() {
    return true
  }
  async isMaximizable() {
    return true
  }
  async isMinimizable() {
    return true
  }
  async isAlwaysOnTop() {
    return false
  }
  async title() {
    return document.title
  }
  async theme(): Promise<Theme | null> {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // ---------- actions ----------
  async show() {
    focusWindow(this.label)
  }
  async setFocus() {
    focusWindow(this.label)
  }
  async unminimize() {
    focusWindow(this.label)
  }
  async requestUserAttention() {
    focusWindow(this.label)
  }
  async close() {
    closeWindow(this.label)
  }
  async destroy() {
    closeWindow(this.label)
  }
  async setTitle(title: string) {
    if (this.label === LABEL) document.title = title
  }
  async setFullscreen(fullscreen: boolean) {
    if (this.label !== LABEL) return
    if (fullscreen) await document.documentElement.requestFullscreen?.().catch(() => {})
    else if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
  }
  async startDragging() {}
  async startResizeDragging() {}
}

export type DragDropEvent =
  | { type: 'enter'; paths: string[]; position: PhysicalPosition }
  | { type: 'over'; position: PhysicalPosition }
  | { type: 'drop'; paths: string[]; position: PhysicalPosition }
  | { type: 'leave' }

/** Native-only window methods: no effect in a browser tab, they resolve to null. */
const NATIVE_ONLY = [
  'hide',
  'minimize',
  'maximize',
  'unmaximize',
  'toggleMaximize',
  'center',
  'setSize',
  'setMinSize',
  'setMaxSize',
  'setSizeConstraints',
  'setPosition',
  'setResizable',
  'setEnabled',
  'setAlwaysOnTop',
  'setAlwaysOnBottom',
  'setShadow',
  'setBadgeCount',
  'setBadgeLabel',
  'setOverlayIcon',
  'setDecorations',
  'setSkipTaskbar',
  'setIcon',
  'setCursorIcon',
  'setCursorGrab',
  'setCursorVisible',
  'setCursorPosition',
  'setIgnoreCursorEvents',
  'setProgressBar',
  'setContentProtected',
  'setVisibleOnAllWorkspaces',
  'setTitleBarStyle',
  'setMaximizable',
  'setMinimizable',
  'setClosable',
  'setFocusable',
  'setEffects',
  'clearEffects',
  'setBackgroundColor',
  'setTheme',
  'setZoom',
  'setAutoResize',
  'reparent'
] as const

for (const name of NATIVE_ONLY) {
  Object.defineProperty(WebWindow.prototype, name, { value: async () => null, writable: true, configurable: true })
}

export function windowFor(label: string): WebWindow {
  let win = instances.get(label)
  if (!win) {
    win = new WebWindow(label)
    instances.set(label, win)
  }
  return win
}

/** Opens a new window (tab) and reports tauri://created, or tauri://error when it already exists. */
export function createWindow(win: WebWindow, options: { url?: string } = {}) {
  const exists = windowExists(win.label)
  if (!exists) openWindow(win.label, options.url)
  setTimeout(() => {
    if (exists) win.emitLocal('tauri://error', `a window with label \`${win.label}\` already exists`)
    else win.emitLocal('tauri://created', null)
  }, 0)
}

export function getAllLabels(): string[] {
  return openLabels()
}

// DOM events behind the window lifecycle events of the current tab
function bindDomEvent(event: string, emit: (payload: unknown) => void): (() => void) | undefined {
  const on = (name: string, fn: () => void) => {
    window.addEventListener(name, fn)
    return () => window.removeEventListener(name, fn)
  }
  switch (event) {
    case 'tauri://resize':
      return on('resize', () => emit(new PhysicalSize(window.innerWidth, window.innerHeight)))
    case 'tauri://focus':
      return on('focus', () => emit(null))
    case 'tauri://blur':
      return on('blur', () => emit(null))
    default:
      return undefined
  }
}

function bindFileDrop(handler: (payload: DragDropEvent) => void): UnlistenFn {
  const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')
  const position = (e: DragEvent) => new PhysicalPosition(e.clientX, e.clientY)
  let depth = 0
  const onEnter = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    if (depth++ === 0) handler({ type: 'enter', paths: ['(files)'], position: position(e) })
  }
  const onOver = (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    handler({ type: 'over', position: position(e) })
  }
  const onLeave = (e: DragEvent) => {
    if (!hasFiles(e)) return
    if (--depth <= 0) {
      depth = 0
      handler({ type: 'leave' })
    }
  }
  const onDrop = async (e: DragEvent) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth = 0
    const files = Array.from(e.dataTransfer?.files || [])
    try {
      const paths = await Promise.all(files.map(storeBrowserFile))
      handler({ type: 'drop', paths, position: position(e) })
    } catch (err) {
      log('file drop failed', err)
      handler({ type: 'leave' })
    }
  }
  document.addEventListener('dragenter', onEnter)
  document.addEventListener('dragover', onOver)
  document.addEventListener('dragleave', onLeave)
  document.addEventListener('drop', onDrop)
  return () => {
    document.removeEventListener('dragenter', onEnter)
    document.removeEventListener('dragover', onOver)
    document.removeEventListener('dragleave', onLeave)
    document.removeEventListener('drop', onDrop)
  }
}

export class Window extends WebWindow {
  constructor(label: string, options: { url?: string } = {}) {
    super(label)
    createWindow(this, options)
  }
  static getCurrent(): Window {
    return windowFor(LABEL) as Window
  }
  static async getAll(): Promise<Window[]> {
    return getAllLabels().map((label) => windowFor(label) as Window)
  }
  static async getByLabel(label: string): Promise<Window | null> {
    return windowExists(label) ? (windowFor(label) as Window) : null
  }
  static async getFocusedWindow(): Promise<Window | null> {
    return document.hasFocus() ? Window.getCurrent() : null
  }
}

export function getCurrentWindow(): Window {
  return Window.getCurrent()
}

export async function getAllWindows(): Promise<Window[]> {
  return Window.getAll()
}
