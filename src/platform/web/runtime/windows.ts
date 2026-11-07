/**
 * Registry of open "windows" (tabs) so getByLabel() can tell whether a window exists, plus the
 * open/close behaviour that replaces native windows.
 */
import { onControl, postControl } from './bus'
import { LABEL, PAGE_WINDOWS } from './label'

const REGISTRY_KEY = '__web_windows'
const HEARTBEAT_MS = 3000
const STALE_MS = 10000

type Registry = Record<string, number>

function readRegistry(): Registry {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeRegistry(update: (r: Registry) => void) {
  const registry = readRegistry()
  update(registry)
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
  } catch {}
}

/** Labels of the tabs that are open now. */
export function openLabels(): string[] {
  const now = Date.now()
  const labels = Object.entries(readRegistry())
    .filter(([, seen]) => now - seen < STALE_MS)
    .map(([label]) => label)
  if (!labels.includes(LABEL)) labels.push(LABEL)
  return labels
}

export function windowExists(label: string) {
  return label === LABEL || openLabels().includes(label)
}

export function registerWindow() {
  const beat = () =>
    writeRegistry((r) => {
      r[LABEL] = Date.now()
    })
  beat()
  setInterval(beat, HEARTBEAT_MS)
  window.addEventListener('pagehide', () =>
    writeRegistry((r) => {
      delete r[LABEL]
    })
  )
}

/** Main windows replace the current page; every other window opens in a new tab named after its label. */
export function openWindow(label: string, url?: string) {
  const target = url || `/${label}`
  if (label === LABEL) return
  if (PAGE_WINDOWS.has(label)) {
    window.name = label
    setTimeout(() => location.assign(target), 50)
    return
  }
  window.open(target, label)
}

/** Secondary tabs were opened by window.open, so the browser lets them close themselves. */
export function closeWindow(label: string = LABEL) {
  if (label !== LABEL) {
    postControl('closeWindow', label)
    return
  }
  if (!PAGE_WINDOWS.has(LABEL)) setTimeout(() => window.close(), 50)
}

export function focusWindow(label: string) {
  if (label !== LABEL) postControl('focusWindow', label)
  else window.focus()
}

onControl('closeWindow', (label) => {
  if (label === LABEL) closeWindow()
})
onControl('focusWindow', (label) => {
  if (label === LABEL) window.focus()
})
