/**
 * File manager, upload and media helpers.
 */
import { Channel } from '../runtime/channel'
import { deliver } from '../runtime/bus'
import { log } from '../runtime/label'
import { extOf, mimeOf, vfsEntries, vfsFind, vfsGet, vfsHas, vfsKey } from '../runtime/vfs'
import { type ChatMessage, roomMessages, serverSearch, userRoomIds } from './messageScan'
import { registerCommands } from './registry'

const DAY_MS = 24 * 60 * 60 * 1000
const pad2 = (n: number) => String(n).padStart(2, '0')

function formatLocal(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

function displayDate(dateText: string) {
  const [y, m, d] = dateText.split('-').map(Number)
  const day = new Date(y, m - 1, d)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diff = Math.round((today.getTime() - day.getTime()) / DAY_MS)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  if (y === today.getFullYear()) return `${pad2(m)}月${pad2(d)}日`
  return `${y}年${pad2(m)}月${pad2(d)}日`
}

/** File/video message -> the Rust FileInfo shape */
function toFileInfo(item: any) {
  const msg = item.message || {}
  const body = msg.body || {}
  if (msg.type !== 4 && msg.type !== 6) return null
  let fileName = body.fileName
  if (!fileName && msg.type === 6 && body.url) fileName = String(body.url).split('/').pop()!.split('?')[0]
  if (!fileName) return null
  const sender = item.fromUser || {}
  return {
    id: msg.id,
    fileName,
    fileSize: Number(body.fileSize ?? body.size) || 0,
    fileType: msg.type === 4 ? 'file' : 'video',
    uploadTime: formatLocal(msg.sendTime || 0),
    sender: {
      id: String(sender.uid || ''),
      name: sender.name || '未知用户',
      avatar: sender.avatar || '/avatars/default.jpg',
      isOnline: null
    },
    downloadUrl: body.url || body.downloadUrl || null,
    isDownloaded: false,
    status: 'completed',
    thumbnailUrl: body.thumbnailUrl || body.thumbUrl || null
  }
}

type FileInfo = NonNullable<ReturnType<typeof toFileInfo>>

async function queryFiles(param: any = {}) {
  const pageSize = param.pageSize || 20
  const query: Record<string, unknown> = {
    keyword: param.searchKeyword?.trim() || '',
    pageNo: param.page || 1,
    pageSize
  }
  switch (param.navigationType) {
    case 'myFiles':
      break
    case 'senders':
      query.senderUid = param.selectedUser || ''
      break
    case 'sessions':
    case 'groups':
      query.roomId = param.roomId || ''
      break
    default:
      throw '不支持的导航类型'
  }
  const page = await serverSearch<any>('im/chat/msg/files', query)
  const source = page ? page.list || [] : await scanFileMessages(query)
  let files = (source as any[]).map(toFileInfo).filter(Boolean) as FileInfo[]
  const users = new Map<string, FileInfo['sender']>()
  for (const f of files) users.set(f.sender.id, f.sender)
  if (query.keyword) {
    const kw = String(query.keyword).toLowerCase()
    files = files.filter((f) => f.fileName.toLowerCase().includes(kw))
  }
  const groups = new Map<string, FileInfo[]>()
  for (const f of files) {
    const date = f.uploadTime.slice(0, 10)
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(f)
  }
  const timeGroupedFiles = [...groups.keys()]
    .sort()
    .reverse()
    .map((date) => ({
      date,
      displayDate: displayDate(date),
      files: groups.get(date)!.sort((a, b) => b.uploadTime.localeCompare(a.uploadTime))
    }))
  return {
    timeGroupedFiles,
    userList: [...users.values()],
    hasMore: files.length >= pageSize,
    currentPage: param.page || 1
  }
}

/** File and video messages without a server endpoint: read the rooms' history (newest first). */
async function scanFileMessages(query: Record<string, unknown>) {
  const rooms = query.roomId ? [String(query.roomId)] : await userRoomIds()
  const all: ChatMessage[] = []
  for (const roomId of rooms) all.push(...(await roomMessages(roomId)))
  const pageNo = Number(query.pageNo) || 1
  const pageSize = Number(query.pageSize) || 20
  return all
    .filter((item) => {
      const msg = item.message || {}
      if (msg.type !== 4 && msg.type !== 6) return false
      return !query.senderUid || String(item.fromUser?.uid) === String(query.senderUid)
    })
    .sort((a, b) => (b.message?.sendTime || 0) - (a.message?.sendTime || 0))
    .slice((pageNo - 1) * pageSize, pageNo * pageSize)
}

/** First frame of a staged video, like the desktop get_video_thumbnail */
function videoThumbnail(args: any) {
  const entry = vfsGet(args.videoPath)
  const url = URL.createObjectURL(new Blob([entry.bytes as BlobPart], { type: entry.type || 'video/mp4' }))
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const done = (fn: (v: any) => void, value: unknown) => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      fn(value)
    }
    video.muted = true
    video.preload = 'auto'
    video.onerror = () => done(reject, '视频文件无法解码')
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(args.targetTime || 0, Math.max(0, (video.duration || 0) - 0.05))
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d')!.drawImage(video, 0, 0)
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
      done(resolve, {
        thumbnail_base64: base64,
        width: canvas.width,
        height: canvas.height,
        duration: video.duration || 0
      })
    }
    video.src = url
  })
}

/** PUT of a staged file to a presigned URL, reporting progress on the channel. */
function uploadPut(args: any) {
  const entry = vfsGet(args.path)
  const progress = args.onProgress as Channel<{ progressTotal: number; total: number }> | undefined
  const total = entry.bytes.byteLength
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', args.url)
    for (const [k, v] of Object.entries(args.headers || {})) xhr.setRequestHeader(k, String(v))
    xhr.upload.onprogress = (e) =>
      progress?.send({ progressTotal: e.loaded, total: e.lengthComputable ? e.total : total })
    xhr.onload = () => {
      progress?.send({ progressTotal: total, total })
      if (xhr.status >= 200 && xhr.status < 300) resolve(null)
      else reject(`Upload failed with status ${xhr.status}: ${xhr.responseText}`)
    }
    xhr.onerror = () => reject('Upload request failed')
    xhr.send(new Blob([entry.bytes as BlobPart], { type: args.headers?.['Content-Type'] || entry.type }))
  })
}

const NAVIGATION_ITEMS = [
  { key: 'myFiles', label: '我的文件', icon: 'file', active: true },
  { key: 'senders', label: '发送人', icon: 'avatar', active: false },
  { key: 'sessions', label: '会话', icon: 'message', active: false },
  { key: 'groups', label: '群聊', icon: 'peoples', active: false }
]

registerCommands({
  get_navigation_items: () => NAVIGATION_ITEMS.map((item) => ({ ...item })),
  query_files: (args) => queryFiles(args.param),
  get_video_thumbnail: (args) => videoThumbnail(args),
  upload_file_put: (args) => uploadPut(args),
  qiniu_upload_resumable() {
    throw 'Qiniu resumable upload is not available in the browser; use the MinIO storage engine'
  },

  get_files_meta(args) {
    return ((args.filesPath || []) as string[]).map((path) => {
      const isUrl = /^https?:\/\//.test(path)
      return {
        name: String(path).split(/[\\/]/).pop(),
        path,
        file_type: extOf(path),
        mime_type: isUrl ? mimeOf(path) : vfsFind(path)?.type || mimeOf(path),
        exists: !isUrl && vfsHas(path)
      }
    })
  },

  // Storage settings: the "disk" is the browser's storage quota, the directory is the in-memory file system.
  async get_directory_usage_info_with_progress(args) {
    const prefix = vfsKey(args.directoryPath || '').replace(/\/$/, '')
    let total = 0
    let count = 0
    for (const [key, entry] of vfsEntries()) {
      if (!prefix || key === prefix || key.startsWith(`${prefix}/`)) {
        total += entry.bytes.byteLength
        count++
      }
    }
    let quota = 0
    let usage = 0
    try {
      const estimate = await navigator.storage.estimate()
      quota = estimate.quota || 0
      usage = estimate.usage || 0
    } catch (e) {
      log('storage estimate failed', e)
    }
    deliver('directory-scan-complete', {
      current_path: args.directoryPath || '',
      files_processed: count,
      total_size: total,
      elapsed_time: 0,
      elapsed_seconds: 0,
      progress_percentage: 100
    })
    return {
      path: args.directoryPath || '',
      total_size: total,
      disk_mount_point: '/',
      disk_total_space: quota,
      disk_used_space: usage,
      disk_usage_percentage: quota ? (usage / quota) * 100 : 0,
      usage_percentage: quota ? (total / quota) * 100 : 0
    }
  },
  cancel_directory_scan: () => null
})
