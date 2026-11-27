/**
 * Browser replacement of @tauri-apps/api/core (wired up by the vite alias in web mode).
 * invoke() runs the browser implementation of the Rust command or plugin command.
 */
import '../../runtime/bootstrap'
import { runCommand } from '../../commands'
import { Channel } from '../../runtime/channel'
import { vfsUrl } from '../../runtime/vfs'

export { Channel }

export type InvokeArgs = Record<string, unknown> | number[] | ArrayBuffer | Uint8Array
export type InvokeOptions = { headers: Headers | Record<string, string> }

export function invoke<T>(cmd: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> {
  const headers = options?.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) : options?.headers
  return runCommand<T>(cmd, args as Record<string, unknown>, headers ? { headers } : undefined)
}

/** Staged files become blob URLs; URLs and unknown paths are returned unchanged. */
export function convertFileSrc(filePath: string): string {
  return vfsUrl(filePath)
}

const callbacks = new Map<number, (data: unknown) => void>()
let callbackSeq = 1

export function transformCallback<T = unknown>(callback?: (response: T) => void, once = false): number {
  const id = callbackSeq++
  callbacks.set(id, (data) => {
    if (once) callbacks.delete(id)
    callback?.(data as T)
  })
  return id
}

export function isTauri(): boolean {
  return false
}

export class Resource {
  readonly #rid: number
  constructor(rid: number) {
    this.#rid = rid
  }
  get rid(): number {
    return this.#rid
  }
  async close(): Promise<void> {}
}

export class PluginListener {
  constructor(
    public plugin: string,
    public event: string,
    public channelId: number
  ) {}
  async unregister(): Promise<void> {}
}

export async function addPluginListener(plugin: string, event: string): Promise<PluginListener> {
  return new PluginListener(plugin, event, 0)
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'

export async function checkPermissions<T>(): Promise<T> {
  return {} as T
}

export async function requestPermissions<T>(): Promise<T> {
  return {} as T
}

export const SERIALIZE_TO_IPC_FN = '__TAURI_TO_IPC_KEY__'
