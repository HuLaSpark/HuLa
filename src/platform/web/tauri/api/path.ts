/**
 * Browser replacement of @tauri-apps/api/path. Every base directory is the in-memory file system
 * root, so `join(await appDataDir(), p)` and `p` with `{ baseDir }` name the same file.
 */
import { APP_ROOT } from '../../runtime/vfs'

export enum BaseDirectory {
  Audio = 1,
  Cache = 2,
  Config = 3,
  Data = 4,
  LocalData = 5,
  Document = 6,
  Download = 7,
  Picture = 8,
  Public = 9,
  Video = 10,
  Resource = 11,
  Temp = 12,
  AppConfig = 13,
  AppData = 14,
  AppLocalData = 15,
  AppCache = 16,
  AppLog = 17,
  Desktop = 18,
  Executable = 19,
  Font = 20,
  Home = 21,
  Runtime = 22,
  Template = 23
}

const normalizeParts = (parts: string[]) =>
  parts
    .filter((p) => p != null && p !== '')
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')

const root = async () => APP_ROOT

export const appCacheDir = root
export const appConfigDir = root
export const appDataDir = root
export const appLocalDataDir = root
export const appLogDir = root
export const audioDir = root
export const cacheDir = root
export const configDir = root
export const dataDir = root
export const desktopDir = root
export const documentDir = root
export const downloadDir = root
export const executableDir = root
export const fontDir = root
export const homeDir = root
export const localDataDir = root
export const pictureDir = root
export const publicDir = root
export const resourceDir = root
export const runtimeDir = root
export const templateDir = root
export const videoDir = root
export const tempDir = root

export async function resolveResource(resourcePath: string) {
  return normalizeParts([APP_ROOT, resourcePath])
}

export function sep() {
  return '/'
}

export function delimiter() {
  return ':'
}

export async function join(...paths: string[]) {
  return normalizeParts(paths)
}

export async function normalize(path: string) {
  return normalizeParts([path])
}

export async function resolve(...paths: string[]) {
  return normalizeParts(paths)
}

export async function dirname(path: string) {
  return (
    String(path)
      .replace(/[\\/]+$/, '')
      .replace(/[\\/][^\\/]*$/, '') || '/'
  )
}

export async function basename(path: string, ext?: string) {
  const base =
    String(path)
      .replace(/[\\/]+$/, '')
      .split(/[\\/]/)
      .pop() || ''
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base
}

export async function extname(path: string) {
  return (String(path).match(/\.([^./\\]+)$/) || [null, ''])[1] as string
}

export async function isAbsolute(path: string) {
  return String(path).startsWith('/')
}
