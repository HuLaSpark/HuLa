/** Browser replacement of @tauri-apps/api/app */
import pkg from '~/package.json'

export async function getVersion() {
  return pkg.version
}
export async function getName() {
  return document.title || pkg.name
}
export async function getTauriVersion() {
  return 'web'
}
export async function getIdentifier() {
  return 'web'
}
export async function show() {}
export async function hide() {}
export async function setTheme() {}
export async function defaultWindowIcon() {
  return null
}
export async function setDockVisibility() {}
