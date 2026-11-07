/**
 * Login, tokens, sessions, messages and rooms. The desktop build keeps these in a local SQLite
 * database and syncs it with the server; the browser asks the server directly and returns the
 * same shapes the Rust commands return.
 */
import { channelSend } from '../runtime/channel'
import { emitEvent } from '../runtime/bus'
import { log } from '../runtime/label'
import { api, auth, rawRequest, refreshToken } from './http'
import { roomMessages, searchableText, serverSearch } from './messageScan'
import { IM_URLS } from './imUrls'
import { registerCommands } from './registry'

const TIME_BLOCK_MS = 10 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

type MsgItem = {
  message?: { id?: string; sendTime?: number; [k: string]: any }
  timeBlock?: number | null
  [k: string]: any
}

/** Sorted by send time with the time separators the Rust page_msg computes. */
function sortAndBlock(list: MsgItem[] | undefined) {
  const items = (list || []).slice().sort((a, b) => (a.message?.sendTime || 0) - (b.message?.sendTime || 0))
  let prev: number | null = null
  items.forEach((item, i) => {
    const sendTime = item.message?.sendTime || 0
    if (i === 0) item.timeBlock = 1
    else if (prev != null && sendTime - prev >= TIME_BLOCK_MS) item.timeBlock = sendTime - prev
    else item.timeBlock = null
    prev = sendTime
  })
  return items
}

type Member = { groupRole?: number | null; activeStatus?: number | null; name?: string }

/** Owner/admin first, then online, then by name, like the Rust member query. */
function sortMembers(members: Member[] | undefined) {
  return (members || []).slice().sort((a, b) => {
    const ra = a.groupRole ?? null
    const rb = b.groupRole ?? null
    if (ra != null && rb != null && ra !== rb) return ra - rb
    const sa = a.activeStatus ?? 255
    const sb = b.activeStatus ?? 255
    if (sa !== sb) return sa - sb
    return String(a.name || '')
      .toLowerCase()
      .localeCompare(String(b.name || '').toLowerCase())
  })
}

/** Server ChatMessageResp -> the Rust MessageResp shape */
function toMessageResp(item: any) {
  const msg = item.message || {}
  return {
    createId: msg.id,
    createTime: msg.sendTime,
    updateId: null,
    updateTime: null,
    fromUser: { uid: String(item.fromUser?.uid || ''), nickname: item.fromUser?.name || null },
    message: {
      id: msg.id,
      roomId: msg.roomId,
      type: msg.type,
      body: msg.body,
      messageMarks: msg.messageMarks && Object.keys(msg.messageMarks).length ? msg.messageMarks : null,
      sendTime: msg.sendTime
    },
    oldMsgId: null,
    timeBlock: null
  }
}

function isLocalMidnight(ms: number) {
  const d = new Date(ms)
  return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0
}

const HISTORY_TYPES: Record<string, number[]> = { image: [3, 6], file: [4] }

async function queryChatHistory(param: any = {}) {
  const pagination = param.pagination || { page: 1, pageSize: 20 }
  const range = param.dateRange || {}
  let endTime = range.endTime ?? null
  // The date picker yields midnight of the last day; include that whole day.
  if (endTime != null && isLocalMidnight(endTime)) endTime += DAY_MS - 1
  const keyword: string = param.searchKeyword?.trim() || ''
  const types = HISTORY_TYPES[param.messageType] || []
  const asc = param.sortOrder === 'asc'

  const page = await serverSearch<any>('im/chat/msg/search', {
    roomId: param.roomId,
    types: types.join(','),
    keyword,
    startTime: range.startTime ?? '',
    endTime: endTime ?? '',
    sort: asc ? 'asc' : 'desc',
    pageNo: pagination.page,
    pageSize: pagination.pageSize
  })
  if (page) {
    const list = page.list || []
    return { messages: list.map(toMessageResp), hasMore: !page.isLast, currentPage: pagination.page }
  }

  // no server search: filter the room history here
  const kw = keyword.toLowerCase()
  const matched = (await roomMessages(String(param.roomId)))
    .filter((item) => {
      const msg = item.message || {}
      const time = msg.sendTime || 0
      if (types.length && !types.includes(msg.type as number)) return false
      if (range.startTime != null && time < range.startTime) return false
      if (endTime != null && time > endTime) return false
      return !kw || searchableText(item).includes(kw)
    })
    .sort((a, b) => ((a.message?.sendTime || 0) - (b.message?.sendTime || 0)) * (asc ? 1 : -1))
  const from = (pagination.page - 1) * pagination.pageSize
  return {
    messages: matched.slice(from, from + pagination.pageSize).map(toMessageResp),
    hasMore: from + pagination.pageSize < matched.length,
    currentPage: pagination.page
  }
}

registerCommands({
  async login_command(args) {
    const data = args.data || {}
    if (data.isAutoLogin) {
      const stored = auth.get()
      if (!stored.refreshToken || (data.uid && stored.uid !== data.uid)) throw '自动登录失败，请手动登录'
      await refreshToken()
      const now = auth.get()
      return { token: now.token, client: '', refreshToken: now.refreshToken, expire: '', uid: now.uid }
    }
    const result = await rawRequest('POST', IM_URLS.login[1], data, null, false)
    const resp = result?.data as any
    if (!result || result.code !== 200 || !resp) throw result?.msg || '登录失败'
    auth.set({ token: resp.token, refreshToken: resp.refreshToken, uid: String(resp.uid) })
    return {
      token: resp.token,
      client: resp.client || '',
      refreshToken: resp.refreshToken,
      expire: resp.expire == null ? '' : String(resp.expire),
      uid: String(resp.uid)
    }
  },

  async im_request_command(args) {
    try {
      return await api(args.url, args.body ?? null, args.params ?? null)
    } catch (e) {
      // like the Rust command: a dead session sends the main window back to login
      if (e === '请重新登录' && auth.get().uid) emitEvent('relogin', null, 'home')
      throw e
    }
  },

  get_user_tokens() {
    const a = auth.get()
    return { token: a.token || null, refreshToken: a.refreshToken || null }
  },
  update_token(args) {
    const req = args.req || {}
    auth.patch({ token: req.token, refreshToken: req.refreshToken, uid: req.uid || auth.get().uid })
    return null
  },
  remove_tokens() {
    auth.set({})
    return null
  },
  save_user_info: () => null,
  update_user_last_opt_time: () => null,

  list_contacts_command: () => api('getContactList'),
  hide_contact_command: (args) => api('setHide', args.data).then(() => null),

  async page_msg(args) {
    const param = args.param || {}
    const page =
      (await api<any>('getMsgPage', null, {
        roomId: param.roomId,
        pageSize: param.pageSize,
        cursor: param.cursor || ''
      })) || {}
    return { cursor: page.cursor, isLast: !!page.isLast, list: sortAndBlock(page.list), total: page.total }
  },
  // nothing to sync: every query goes to the server
  sync_messages: () => null,
  async send_msg(args) {
    const data = args.data
    try {
      const resp = await api<any>('sendMsg', data)
      if (!resp) throw 'empty response'
      resp.oldMsgId = data.id
      channelSend(args.successChannel, resp)
    } catch (e) {
      log('send_msg failed', e)
      channelSend(args.errorChannel, data.id)
    }
    return null
  },
  save_msg: () => null,
  save_message_mark: () => null,
  update_message_recall_status: () => null,
  delete_message: () => null,
  delete_room_messages: () => 0,
  query_chat_history: (args) => queryChatHistory(args.param),

  page_room: (args) => api('groupList', null, args.pageParam),
  async get_room_members(args) {
    return sortMembers(await api<Member[]>('groupListMember', null, { roomId: args.roomId || args.room_id }))
  },
  async cursor_page_room_members(args) {
    const param = args.param || {}
    const members = sortMembers(await api<Member[]>('groupListMember', null, { roomId: param.roomId }))
    return { cursor: '', isLast: true, list: members, total: members.length }
  },
  update_my_room_info: (args) => api('updateMyRoomInfo', args.myRoomInfo).then(() => null)
})
