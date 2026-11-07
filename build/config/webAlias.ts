import { fileURLToPath, URL } from 'node:url'
import type { Alias, Plugin } from 'vite'

/**
 * Browser build (`vite --mode web`): every Tauri module the app imports is replaced by a browser
 * implementation under src/platform/web/tauri. The desktop build uses none of these aliases.
 * Exact-match patterns keep e.g. `@tauri-apps/api/window` from catching `.../webviewWindow`.
 */
const WEB_MODULES: Record<string, string> = {
  '@tauri-apps/api/core': 'api/core.ts',
  '@tauri-apps/api/event': 'api/event.ts',
  '@tauri-apps/api/window': 'api/window.ts',
  '@tauri-apps/api/webviewWindow': 'api/webviewWindow.ts',
  '@tauri-apps/api/webview': 'api/webview.ts',
  '@tauri-apps/api/path': 'api/path.ts',
  '@tauri-apps/api/dpi': 'api/dpi.ts',
  '@tauri-apps/api/app': 'api/app.ts',
  '@tauri-apps/api/tray': 'api/tray.ts',
  '@tauri-apps/plugin-fs': 'plugin/fs.ts',
  '@tauri-apps/plugin-log': 'plugin/log.ts',
  '@tauri-apps/plugin-dialog': 'plugin/dialog.ts',
  '@tauri-apps/plugin-process': 'plugin/process.ts',
  '@tauri-apps/plugin-updater': 'plugin/updater.ts',
  '@tauri-apps/plugin-os': 'plugin/os.ts',
  '@tauri-apps/plugin-opener': 'plugin/opener.ts',
  '@tauri-apps/plugin-http': 'plugin/http.ts',
  '@tauri-apps/plugin-clipboard-manager': 'plugin/clipboard-manager.ts',
  '@tauri-apps/plugin-global-shortcut': 'plugin/global-shortcut.ts',
  '@tauri-apps/plugin-barcode-scanner': 'plugin/barcode-scanner.ts',
  '@tauri-apps/plugin-shell': 'plugin/shell.ts',
  '@tauri-apps/plugin-notification': 'plugin/notification.ts',
  '@tauri-apps/plugin-autostart': 'plugin/autostart.ts',
  'tauri-plugin-mic-recorder-api': 'plugin/mic-recorder.ts'
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

export const createWebAliases = (): Alias[] =>
  Object.entries(WEB_MODULES).map(([find, file]) => ({
    find: new RegExp(`^${escapeRegExp(find)}$`),
    replacement: fileURLToPath(new URL(`../../src/platform/web/tauri/${file}`, import.meta.url))
  }))

/**
 * Fails the browser build when a Tauri module without a browser replacement is imported, instead
 * of silently bundling the native package. Runs after the aliases, so covered modules never get here.
 */
export const webAliasGuard = (): Plugin => ({
  name: 'web-tauri-alias-guard',
  enforce: 'pre',
  resolveId(source, importer) {
    if (/^(@tauri-apps\/|tauri-plugin-)/.test(source)) {
      this.error(`${source} has no browser replacement (imported by ${importer}); add one in build/config/webAlias.ts`)
    }
    return null
  }
})
