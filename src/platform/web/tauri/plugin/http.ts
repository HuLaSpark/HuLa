/** Browser replacement of @tauri-apps/plugin-http: the browser's fetch (subject to CORS). */
export function fetch(
  input: URL | Request | string,
  init?: RequestInit & { connectTimeout?: number }
): Promise<Response> {
  if (!init?.connectTimeout) return window.fetch(input, init)
  const { connectTimeout, ...rest } = init
  return window.fetch(input, { ...rest, signal: rest.signal ?? AbortSignal.timeout(connectTimeout) })
}
