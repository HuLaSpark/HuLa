import DOMPurify from 'dompurify'
import { compact } from 'es-toolkit'

/**
 * 文件大小格式化
 */
export const formatBytes = (bytes: number): string => {
  if (bytes <= 0 || isNaN(bytes)) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const base = 1024
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base))
  const size = parseFloat((bytes / base ** unitIndex).toFixed(2))

  return size + ' ' + units[unitIndex]
}

/** 文件图标映射关系表 */
const fileSuffixMap: Record<string, string> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'jpg',
  webp: 'jpg',
  mp4: 'mp4',
  mov: 'mp4',
  avi: 'mp4',
  rmvb: 'mp4',
  doc: 'doc',
  docx: 'doc',
  mp3: 'mp3',
  wav: 'mp3',
  aac: 'mp3',
  flac: 'mp3',
  pdf: 'pdf',
  ppt: 'ppt',
  pptx: 'ppt',
  xls: 'xls',
  xlsx: 'xls',
  zip: 'zip',
  rar: 'zip',
  '7z': 'zip',
  txt: 'txt',
  log: 'log',
  svg: 'svg',
  sketch: 'sketch',
  exe: 'exe',
  md: 'md',
  ts: 'ts'
}
/**
 * 获取文件对应的Icon
 * @param fileName 文件名
 * @returns Icon
 */
export const getFileSuffix = (fileName: string): string => {
  if (!fileName) return 'other'

  const suffix = fileName.toLowerCase().split('.').pop()
  if (!suffix) return 'other'

  return fileSuffixMap[suffix] || 'other'
}

/**
 * 从文件路径中提取文件名
 * @param path 文件路径
 * @returns 文件名
 */
export const extractFileName = (path: string): string => {
  // 同时处理 Unix 和 Windows 路径分隔符
  const fileName = path.split(/[/\\]/).pop()
  return fileName || 'file'
}

/**
 * 根据文件扩展名获取MIME类型
 * @param fileName 文件名
 * @returns MIME类型
 */
export const getMimeTypeFromExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml'
  }
  return mimeMap[ext] || 'image/png'
}

/**
 * @param fragment 字符串
 * @returns 去除元素标记后的字符串
 * */
export const removeTag = (fragment: string) => {
  const sanitizedFragment = DOMPurify.sanitize(fragment)
  const normalizedFragment = sanitizedFragment
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|tr|td|blockquote|h[1-6])>/gi, '')
    .replace(/<(div|p|li|tr|td|blockquote|h[1-6])[^>]*>/gi, '\n')
    .replace(/\r\n|\r/g, '\n')

  const textContent = new DOMParser().parseFromString(normalizedFragment, 'text/html').body.textContent || fragment

  return textContent.replace(/\u00A0/g, ' ')
}

/**
 * 非中文文本超过指定非空格字符数时截断并追加省略号
 */
export const formatBottomText = (text: string, maxLength = 6, omission = '...') => {
  const pureText = text.replace(/\s/g, '')
  const hasChinese = /[\u4e00-\u9fa5]/.test(pureText)
  if (hasChinese || pureText.length <= maxLength) {
    return text
  }

  const nonSpaceIndexes = compact(Array.from(text).map((char, idx) => (char.trim().length > 0 ? idx : undefined)))
  const cutIndex = nonSpaceIndexes[maxLength - 1] ?? text.length - 1

  return `${text.slice(0, cutIndex + 1).trimEnd()}${omission}`
}
