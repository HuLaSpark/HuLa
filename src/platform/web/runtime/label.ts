/**
 * Window label of the current browser tab.
 *
 * In Tauri every window has a label. In the browser each "window" is a tab: the label survives
 * in-tab navigation through window.name, and window.open(url, label) sets it for new tabs.
 * Without a name the first path segment is used (`/home` -> `home`, `/` -> `login`).
 */
const firstSegment = location.pathname.split('/')[1] || ''

// The desktop app has a single "home" window for the whole main layout; its routes (/message,
// /friendsList, ...) must not leak into the label, otherwise events addressed to "home" are dropped.
const MAIN_SEGMENTS = new Set(['home', 'message', 'friendsList', 'searchDetails'])

const hasWebSession = () => {
  try {
    const auth = JSON.parse(localStorage.getItem('__web_auth') || '{}')
    return Boolean(auth.token && auth.refreshToken)
  } catch {
    return false
  }
}

const routeLabel = () => {
  if (firstSegment === '') return hasWebSession() ? 'home' : 'login'
  return MAIN_SEGMENTS.has(firstSegment) ? 'home' : firstSegment
}

export const LABEL: string = routeLabel()
window.name = LABEL

/** Main windows replace the current page; every other window opens in its own tab. */
export const PAGE_WINDOWS = new Set(['home', 'login'])

export const log = (...args: unknown[]) => console.debug('[web]', ...args)
