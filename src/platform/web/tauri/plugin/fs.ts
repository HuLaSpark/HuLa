/**
 * Browser replacement of @tauri-apps/plugin-fs on top of the in-memory file system.
 * Writing into the "save as" folder downloads the file through the browser.
 */
import { toBytes } from '../../runtime/bytes'
import {
  browserDownload,
  fileInfo,
  SAVE_DIR,
  vfsAppend,
  vfsDelete,
  vfsFind,
  vfsGet,
  vfsHas,
  vfsIsDir,
  vfsList,
  vfsPut
} from '../../runtime/vfs'
import { BaseDirectory } from '../api/path'

export { BaseDirectory }

type PathLike = string | URL
const p = (path: PathLike) => (path instanceof URL ? path.pathname : String(path))

export enum SeekMode {
  Start = 0,
  Current = 1,
  End = 2
}

export async function exists(path: PathLike): Promise<boolean> {
  return vfsHas(p(path)) || vfsIsDir(p(path))
}

// directories exist implicitly when files are below them
export async function mkdir(): Promise<void> {}

export async function readDir(path: PathLike) {
  return vfsList(p(path))
}

export async function readFile(path: PathLike): Promise<Uint8Array> {
  return vfsGet(p(path)).bytes.slice()
}

export async function readTextFile(path: PathLike): Promise<string> {
  return new TextDecoder().decode(vfsGet(p(path)).bytes)
}

function afterWrite(path: string) {
  if (path.startsWith(SAVE_DIR)) browserDownload(path)
}

export async function writeFile(
  path: PathLike,
  data: Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>,
  options?: { append?: boolean }
): Promise<void> {
  let bytes: Uint8Array
  if (typeof ReadableStream !== 'undefined' && data instanceof ReadableStream) {
    bytes = new Uint8Array(await new Response(data).arrayBuffer())
  } else {
    bytes = toBytes(data)
  }
  if (options?.append && vfsHas(p(path))) vfsAppend(p(path), bytes)
  else vfsPut(p(path), bytes)
  afterWrite(p(path))
}

export async function writeTextFile(path: PathLike, data: string, options?: { append?: boolean }): Promise<void> {
  return writeFile(path, new TextEncoder().encode(data), options)
}

export async function remove(path: PathLike): Promise<void> {
  vfsDelete(p(path))
}

export async function copyFile(fromPath: PathLike, toPath: PathLike): Promise<void> {
  const entry = vfsGet(p(fromPath))
  vfsPut(p(toPath), entry.bytes.slice(), entry.type)
  afterWrite(p(toPath))
}

export async function rename(oldPath: PathLike, newPath: PathLike): Promise<void> {
  const entry = vfsGet(p(oldPath))
  vfsDelete(p(oldPath))
  vfsPut(p(newPath), entry.bytes, entry.type)
}

export async function stat(path: PathLike) {
  const entry = vfsFind(p(path))
  if (entry) return fileInfo(entry)
  if (vfsIsDir(p(path))) return fileInfo(null)
  throw `file not available in the browser: ${p(path)}`
}

export const lstat = stat

export async function size(path: PathLike): Promise<number> {
  return vfsGet(p(path)).bytes.byteLength
}

export async function truncate(path: PathLike, len = 0): Promise<void> {
  const entry = vfsGet(p(path))
  vfsPut(p(path), entry.bytes.slice(0, len), entry.type)
}

/** File handle with sequential writes, as used by create()/open(). */
export class FileHandle {
  #path: string
  #pos = 0
  readonly rid = 0
  constructor(path: string) {
    this.#path = path
  }
  async write(data: Uint8Array | ArrayBuffer): Promise<number> {
    const bytes = toBytes(data)
    vfsAppend(this.#path, bytes)
    return bytes.byteLength
  }
  async read(buffer: Uint8Array): Promise<number | null> {
    const bytes = vfsGet(this.#path).bytes
    if (this.#pos >= bytes.byteLength) return null
    const chunk = bytes.subarray(this.#pos, this.#pos + buffer.byteLength)
    buffer.set(chunk)
    this.#pos += chunk.byteLength
    return chunk.byteLength
  }
  async seek(offset: number, whence: SeekMode): Promise<number> {
    const length = vfsGet(this.#path).bytes.byteLength
    this.#pos = whence === SeekMode.Start ? offset : whence === SeekMode.Current ? this.#pos + offset : length + offset
    return this.#pos
  }
  async stat() {
    return stat(this.#path)
  }
  async truncate(len = 0) {
    return truncate(this.#path, len)
  }
  async close(): Promise<void> {
    afterWrite(this.#path)
  }
}

export async function create(path: PathLike): Promise<FileHandle> {
  vfsPut(p(path), new Uint8Array(0))
  return new FileHandle(p(path))
}

export async function open(
  path: PathLike,
  options: {
    create?: boolean
    createNew?: boolean
    write?: boolean
    append?: boolean
    truncate?: boolean
    read?: boolean
  } = {}
): Promise<FileHandle> {
  const key = p(path)
  if (!vfsHas(key)) {
    if (!options.create && !options.createNew && !options.write && !options.append) throw `file not found: ${key}`
    vfsPut(key, new Uint8Array(0))
  } else if (options.truncate || (options.write && !options.append && !options.read)) {
    vfsPut(key, new Uint8Array(0))
  }
  return new FileHandle(key)
}

export async function watch(): Promise<() => void> {
  return () => {}
}

export const watchImmediate = watch
