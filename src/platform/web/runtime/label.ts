/**
 * Window label of the current browser tab.
 *
 * In Tauri every window has a label. In the browser each "window" is a tab: the label survives
 * in-tab navigation through window.name, and window.open(url, label) sets it for new tabs.
 * Without a name the first path segment is used (`/home` -> `home`, `/` -> `login`).
 */
const firstSegment = location.pathname.split('/')[1] || ''

export const LABEL: string = window.name || (firstSegment === '' ? 'login' : firstSegment)
window.name = LABEL

/** Main windows replace the current page; every other window opens in its own tab. */
export const PAGE_WINDOWS = new Set(['home', 'login'])

export const log = (...args: unknown[]) => console.debug('[web]', ...args)
