/**
 * Browser replacement of @tauri-apps/plugin-os. The browser build always presents itself as a
 * Linux desktop: that layout uses the client's own window controls and no macOS-specific chrome.
 */
export type OsType = 'linux' | 'windows' | 'macos' | 'ios' | 'android'
export type Platform =
  | 'linux'
  | 'macos'
  | 'ios'
  | 'freebsd'
  | 'dragonfly'
  | 'netbsd'
  | 'openbsd'
  | 'solaris'
  | 'android'
  | 'windows'
export type Family = 'unix' | 'windows'

export function type(): OsType {
  return 'linux'
}
export function platform(): Platform {
  return 'linux'
}
export function family(): Family {
  return 'unix'
}
export function version(): string {
  return 'web'
}
export function arch(): string {
  return 'x86_64'
}
export function eol(): string {
  return '\n'
}
export function exeExtension(): string {
  return ''
}
export async function locale(): Promise<string | null> {
  return navigator.language || null
}
export async function hostname(): Promise<string | null> {
  return location.hostname
}
