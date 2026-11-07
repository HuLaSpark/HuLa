/** Browser replacement of @tauri-apps/plugin-global-shortcut: system-wide shortcuts do not exist in a page. */
export async function register(): Promise<void> {}
export async function unregister(): Promise<void> {}
export async function unregisterAll(): Promise<void> {}
export async function isRegistered(): Promise<boolean> {
  return false
}
