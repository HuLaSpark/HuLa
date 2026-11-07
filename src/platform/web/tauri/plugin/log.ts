/** Browser replacement of @tauri-apps/plugin-log: writes to the console. */
export async function trace(message: string) {
  console.debug(message)
}
export async function debug(message: string) {
  console.debug(message)
}
export async function info(message: string) {
  console.info(message)
}
export async function warn(message: string) {
  console.warn(message)
}
export async function error(message: string) {
  console.error(message)
}
export async function attachConsole(): Promise<() => void> {
  return () => {}
}
export async function attachLogger(): Promise<() => void> {
  return () => {}
}
