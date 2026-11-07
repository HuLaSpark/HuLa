/**
 * In-memory file system.
 *
 * The client stages picked, pasted and cached files on disk before uploading or displaying them by
 * path. In the browser those bytes live here, keyed by the path string the client uses. Content is
 * per tab and gone after a reload; cached media is downloaded again from the server when needed.
 */
import { concatBytes, toBytes } from './bytes'
import { downloads } from './diagnostics'

export type VfsEntry = { bytes: Uint8Array; type: string; mtime: number }

/** Every base directory resolves to APP_ROOT, so a relative path and its absolute form share one key. */
export const APP_ROOT = '/web/app'
/** "Save as" target: writing a file here triggers a browser download. */
export const SAVE_DIR = '/browser-downloads/'

const files = new Map<string, VfsEntry>()
const blobUrls = new Map<string, { entry: VfsEntry; mtime: number; url: string }>()

export const vfsKey = (path: string) =>
  String(path || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(new RegExp(`^${APP_ROOT}/`), '')

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  txt: 'text/plain',
  json: 'application/json',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

export function extOf(path: string) {
  const m = String(path || '').match(/\.([^./\\]+)$/)
  return m ? m[1] : ''
}

export function mimeOf(path: string) {
  return MIME[extOf(path).toLowerCase()] || 'application/octet-stream'
}

export function vfsPut(path: string, bytes: Uint8Array, type?: string) {
  files.set(vfsKey(path), { bytes, type: type || mimeOf(path), mtime: Date.now() })
}

export function vfsFind(path: string): VfsEntry | undefined {
  return files.get(vfsKey(path))
}

export function vfsGet(path: string): VfsEntry {
  const entry = vfsFind(path)
  if (!entry) throw `file not found: ${path}`
  return entry
}

export function vfsHas(path: string) {
  return files.has(vfsKey(path))
}

export function vfsDelete(path: string) {
  const key = vfsKey(path)
  files.delete(key)
  const prefix = `${key.replace(/\/$/, '')}/`
  for (const k of [...files.keys()]) if (k.startsWith(prefix)) files.delete(k)
}

export function vfsAppend(path: string, data: Uint8Array | ArrayBuffer) {
  const entry = vfsGet(path)
  entry.bytes = concatBytes(entry.bytes, toBytes(data))
  entry.mtime = Date.now()
}

export function vfsIsDir(path: string) {
  const prefix = `${vfsKey(path).replace(/\/$/, '')}/`
  for (const key of files.keys()) if (key.startsWith(prefix)) return true
  return false
}

/** Direct children of a directory, like readDir(). */
export function vfsList(path: string) {
  const prefix = vfsKey(path).replace(/\/$/, '')
  const base = prefix ? `${prefix}/` : ''
  const seen = new Map<string, boolean>()
  for (const key of files.keys()) {
    if (!key.startsWith(base)) continue
    const rest = key.slice(base.length)
    const slash = rest.indexOf('/')
    const name = slash < 0 ? rest : rest.slice(0, slash)
    if (name) seen.set(name, seen.get(name) || slash >= 0)
  }
  return [...seen].map(([name, isDirectory]) => ({ name, isDirectory, isFile: !isDirectory, isSymlink: false }))
}

export function vfsEntries() {
  return files.entries()
}

/** convertFileSrc(): staged files become blob URLs, everything else is returned unchanged. */
export function vfsUrl(path: string): string {
  const key = vfsKey(path)
  const entry = files.get(key)
  if (!entry) return path
  const cached = blobUrls.get(key)
  if (cached && cached.entry === entry && cached.mtime === entry.mtime) return cached.url
  if (cached) URL.revokeObjectURL(cached.url)
  const url = URL.createObjectURL(new Blob([entry.bytes as BlobPart], { type: entry.type }))
  blobUrls.set(key, { entry, mtime: entry.mtime, url })
  return url
}

/** Saves a staged file through the browser's download. */
export function browserDownload(path: string) {
  const entry = vfsGet(path)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([entry.bytes as BlobPart], { type: entry.type }))
  a.download = String(path).split('/').pop() || 'download'
  downloads.push({ name: a.download, size: entry.bytes.byteLength })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 60000)
}

let pickSeq = 1

/** Files chosen through a picker or dropped are kept under a pseudo absolute path. */
export async function storeBrowserFile(file: File): Promise<string> {
  const path = `/browser-files/${pickSeq++}/${file.name}`
  vfsPut(path, new Uint8Array(await file.arrayBuffer()), file.type || mimeOf(file.name))
  return path
}

export function fileInfo(entry: VfsEntry | null) {
  const now = Date.now()
  const isDir = entry == null
  return {
    isFile: !isDir,
    isDirectory: isDir,
    isSymlink: false,
    size: isDir ? 0 : entry.bytes.byteLength,
    mtime: new Date(isDir ? now : entry.mtime),
    atime: new Date(isDir ? now : entry.mtime),
    birthtime: new Date(isDir ? now : entry.mtime),
    readonly: false,
    fileAttributes: null,
    dev: null,
    ino: null,
    mode: null,
    nlink: null,
    uid: null,
    gid: null,
    rdev: null,
    blksize: null,
    blocks: null
  }
}
