/** Browser replacement of @tauri-apps/plugin-process */
export async function exit(): Promise<void> {
  window.close()
}
export async function relaunch(): Promise<void> {
  location.reload()
}
