/**
 * Client-side message search for servers without search endpoints.
 *
 * The desktop build searches its local SQLite copy of the messages. In the browser the server's
 * search endpoints are used when available (im/chat/msg/search, im/chat/msg/files); otherwise the
 * room history is read through the regular page endpoint and filtered here.
 */
import { log } from '../runtime/label'
import { api, request } from './http'

export type ChatMessage = {
  fromUser?: { uid?: string | number; name?: string; avatar?: string }
  message?: { id?: string; roomId?: string; type?: number; body?: any; sendTime?: number; [k: string]: unknown }
  [k: string]: unknown
}

const PAGE_SIZE = 100
const MAX_PAGES = 50
const CACHE_MS = 15_000

const cache = new Map<string, { at: number; list: ChatMessage[] }>()

/** All messages of a room (newest pages first, at most MAX_PAGES * PAGE_SIZE). */
export async function roomMessages(roomId: string): Promise<ChatMessage[]> {
  const hit = cache.get(roomId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.list
  const list: ChatMessage[] = []
  let cursor = ''
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = (await api<any>('getMsgPage', null, { roomId, pageSize: PAGE_SIZE, cursor })) || {}
    list.push(...((page.list || []) as ChatMessage[]))
    if (page.isLast || !page.cursor || !(page.list || []).length) break
    cursor = page.cursor
  }
  cache.set(roomId, { at: Date.now(), list })
  return list
}

/** Rooms of the current user, from the session list. */
export async function userRoomIds(): Promise<string[]> {
  const contacts = (await api<any[]>('getContactList')) || []
  return contacts.map((c) => String(c.roomId)).filter(Boolean)
}

const unsupported = new Set<string>()

/**
 * Calls a server search endpoint; returns null when the server does not provide it, so the caller
 * falls back to scanning. Business errors of a supported endpoint are still thrown.
 */
export async function serverSearch<T>(path: string, params: Record<string, unknown>): Promise<T | null> {
  if (unsupported.has(path)) return null
  try {
    return await request<T>('GET', path, null, params)
  } catch (e) {
    if (e === '请重新登录') throw e
    log('server search not available, scanning messages instead', path, e)
    unsupported.add(path)
    return null
  }
}

/** Text a keyword search looks at: message text and file name. */
export function searchableText(item: ChatMessage): string {
  const body = item.message?.body || {}
  return [body.content, body.fileName, typeof body === 'string' ? body : ''].filter(Boolean).join(' ').toLowerCase()
}
