/**
 * Backend addresses for the browser build. Requests go to the page's own origin under
 * VITE_WEB_API_BASE (default /api); the dev server / reverse proxy forwards them to the backend.
 */
const base = (import.meta.env.VITE_WEB_API_BASE || '/api').replace(/\/$/, '')

export const API_BASE = /^https?:\/\//.test(base) ? base : location.origin + base

export const WS_URL = (() => {
  const configured = import.meta.env.VITE_WEB_WS_URL
  if (configured) return /^wss?:\/\//.test(configured) ? configured : wsOrigin() + configured
  return API_BASE.replace(/^http/, 'ws') + '/ws/ws'
})()

function wsOrigin() {
  return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host
}

/** Client credentials sent as Authorization, base64 without a scheme like the desktop build (src-tauri/src/im_request_client.rs). */
export const BASIC_AUTH = btoa('luohuo_web_pro:luohuo_web_pro_secret')
