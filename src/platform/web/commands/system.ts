/**
 * Settings, window payloads, OAuth callback server and native-only commands.
 */
import { API_BASE, WS_URL } from '../runtime/config'
import { log } from '../runtime/label'
import { registerCommands } from './registry'

const PAYLOAD_PREFIX = '__web_payload:'
export const OAUTH_SECRET_KEY = '__web_oauth_secret'

const PUBLIC_ASSET_BASE = import.meta.env.BASE_URL || '/'

// README 里的图片按仓库路径书写（public/ 与 preview/），浏览器版需映射到站点可访问的地址。
const toWebAssetUrl = (src: string) => {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src) || src.startsWith('#')) return src
  const path = src.replace(/^\.\//, '')
  return PUBLIC_ASSET_BASE + (path.startsWith('public/') ? path.slice('public/'.length) : path)
}

const rewriteAssetUrls = (html: string) =>
  html.replace(/(<img\b[^>]*?\bsrc=")([^"]+)(")/gi, (_, pre, src, post) => pre + toWebAssetUrl(src) + post)

const renderMarkdown = async (markdown: string) => {
  const { marked } = await import('marked')
  return rewriteAssetUrls(marked.parse(markdown, { async: false }))
}

const noop = () => null

registerCommands({
  get_settings: () => ({
    database: { sqlite_file: '' },
    backend: { base_url: API_BASE, ws_url: WS_URL }
  }),
  // the backend address is fixed by the page's origin and the reverse proxy
  update_settings: noop,
  is_app_state_ready: () => true,
  switch_user_database: noop,

  // Window payloads live in localStorage so a window opened in another tab can read them.
  get_window_payload(args) {
    const key = PAYLOAD_PREFIX + args.label
    try {
      const text = localStorage.getItem(key)
      if (args.once !== false) localStorage.removeItem(key)
      return text == null ? null : JSON.parse(text)
    } catch {
      return null
    }
  },
  push_window_payload(args) {
    const key = PAYLOAD_PREFIX + args.label
    let old = null
    try {
      const text = localStorage.getItem(key)
      old = text == null ? null : JSON.parse(text)
      localStorage.setItem(key, JSON.stringify(args.payload === undefined ? null : args.payload))
    } catch (e) {
      log('payload store failed', e)
    }
    return old
  },

  // The desktop app listens on a local port for the OAuth redirect. Here the redirect comes back to
  // this origin; the callback tab checks the one-time secret (see runtime/oauth.ts).
  start_oauth_server() {
    const secret = crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()
    localStorage.setItem(OAUTH_SECRET_KEY, secret)
    return { port: Number(location.port) || (location.protocol === 'https:' ? 443 : 80), secret }
  },

  async get_readme_html(args) {
    const readme = String(args.language || '').startsWith('en')
      ? await import('~/README.en.md?raw')
      : await import('~/README.md?raw')
    return renderMarkdown(readme.default)
  },
  async parse_markdown(args) {
    const path: string = args.filePath || ''
    if (!/^(https?:)?\//.test(path)) throw `file not available in the browser: ${path}`
    const res = await fetch(path)
    if (!res.ok) throw `failed to load ${path}: ${res.status}`
    return renderMarkdown(await res.text())
  },

  get_windows_scale_info: () => ({ scale: window.devicePixelRatio || 1 }),
  default_window_icon: noop,

  // Native window chrome, splash screen and mobile-only features have no browser equivalent.
  set_height: noop,
  hide_title_bar_buttons: noop,
  show_title_bar_buttons: noop,
  set_window_movable: noop,
  set_window_level_above_menubar: noop,
  set_macos_traffic_lights_spacing: noop,
  hide_splash_screen: noop,
  set_complete: noop,
  set_badge_count: noop,
  set_ios_badge: noop,
  request_ios_badge_authorization: noop,
  set_webview_keyboard_adjustment: noop,
  trigger_haptic_feedback: noop,
  screenshot() {
    throw '浏览器版暂不支持截图'
  }
})
