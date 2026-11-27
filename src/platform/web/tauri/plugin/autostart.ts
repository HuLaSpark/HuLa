/** Browser replacement of @tauri-apps/plugin-autostart: not applicable to a web page. */
export async function enable(): Promise<void> {}
export async function disable(): Promise<void> {}
export async function isEnabled(): Promise<boolean> {
  return false
}
