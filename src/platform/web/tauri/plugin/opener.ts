/**
 * Browser replacement of @tauri-apps/plugin-opener. URLs open in a new tab; staged files open as
 * blob URLs, and "show in folder" downloads them.
 */
import { opened } from '../../runtime/diagnostics'
import { browserDownload, vfsHas, vfsUrl } from '../../runtime/vfs'

export async function openUrl(url: string | URL): Promise<void> {
  window.open(String(url), '_blank', 'noopener')
}

export async function openPath(path: string): Promise<void> {
  const isUrl = /^(https?|blob):/.test(path)
  if (!isUrl && !vfsHas(path)) throw `file not found: ${path}`
  opened.push(path)
  window.open(isUrl ? path : vfsUrl(path), '_blank')
}

export async function revealItemInDir(path: string | string[]): Promise<void> {
  for (const item of ([] as string[]).concat(path)) {
    if (vfsHas(item)) browserDownload(item)
  }
}
