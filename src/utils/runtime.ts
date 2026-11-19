/**
 * True in the browser build (`vite --mode web`). Constant at build time, so desktop-only or
 * browser-only branches are removed from the other build.
 */
export const isWeb = import.meta.env.VITE_RUNTIME === 'web'
