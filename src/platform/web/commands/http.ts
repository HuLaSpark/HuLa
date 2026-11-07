/**
 * HTTP layer of the Rust ImRequestClient (src-tauri/src/im_request_client.rs): token header,
 * automatic token refresh on 406, "请重新登录" on 401, business errors as plain strings.
 */
import { API_BASE, BASIC_AUTH } from '../runtime/config'
import { log } from '../runtime/label'
import { IM_URLS } from './imUrls'

const AUTH_KEY = '__web_auth'

export type AuthState = { token?: string; refreshToken?: string; uid?: string }

export const auth = {
  get(): AuthState {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}')
    } catch {
      return {}
    }
  },
  set(value: AuthState) {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(value))
    } catch (e) {
      log('auth store failed', e)
    }
  },
  patch(value: AuthState) {
    this.set({ ...this.get(), ...value })
  }
}

export function buildUrl(path: string, params?: Record<string, unknown> | null) {
  let url = `${API_BASE}/${path}`
  if (params && typeof params === 'object') {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)))
      else qs.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
    }
    const s = qs.toString()
    if (s) url += `?${s}`
  }
  return url
}

export function authHeaders(withToken = true): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: BASIC_AUTH }
  const token = auth.get().token
  if (withToken && token) headers.token = token
  return headers
}

type ApiResult = { code?: number; msg?: string; data?: unknown; success?: boolean }

export async function rawRequest(
  method: string,
  path: string,
  body: unknown,
  params: Record<string, unknown> | null,
  withToken: boolean
): Promise<ApiResult> {
  const init: RequestInit = { method, headers: authHeaders(withToken) }
  if (method !== 'GET' && method !== 'HEAD') init.body = JSON.stringify(body == null ? {} : body)
  let res: Response
  try {
    res = await fetch(buildUrl(path, params), init)
  } catch (e) {
    throw `network_error: ${e}`
  }
  try {
    return await res.json()
  } catch {
    throw `network_error: invalid response ${res.status}`
  }
}

let refreshing: Promise<void> | null = null

/** Refreshes the token once even when several requests hit 406 together. */
export function refreshToken(): Promise<void> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function doRefresh() {
  const refresh = auth.get().refreshToken
  if (!refresh) throw '请重新登录'
  const result = await rawRequest('POST', IM_URLS.refreshToken[1], { refreshToken: refresh }, null, false)
  const data = result?.data as AuthState | undefined
  if (!result || result.code !== 200 || !data?.token) throw '请重新登录'
  auth.patch({ token: data.token, refreshToken: data.refreshToken || refresh })
}

export async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, unknown> | null
): Promise<T> {
  const isLogout = path === IM_URLS.logout[1]
  for (let attempt = 0; attempt <= 2; attempt++) {
    const result = await rawRequest(method, path, body, params || null, true)
    const code = result?.code
    if (code === 200) return (result.data === undefined ? null : result.data) as T
    if (isLogout && (code === 406 || code === 401)) return (result.data ?? null) as T
    if (code === 406) {
      await refreshToken()
      continue
    }
    if (code === 401) throw '请重新登录'
    throw result?.msg || '请求失败'
  }
  throw 'token过期，刷新token失败'
}

/** Calls an endpoint by its ImUrlEnum name. */
export function api<T = unknown>(name: string, body?: unknown, params?: Record<string, unknown> | null): Promise<T> {
  const entry = IM_URLS[name]
  if (!entry) return Promise.reject(`unknown url: ${name}`)
  return request<T>(entry[0], entry[1], body, params)
}
