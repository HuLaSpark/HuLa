import { MsgEnum } from '@/enums'

/**
 * 支持的视频扩展名（统一定义）
 */
export const SUPPORTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v'] as const

/**
 * 支持的音频扩展名
 */
export const SUPPORTED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'] as const

/**
 * 支持的图片扩展名
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'] as const

/**
 * 视频MIME类型映射
 */
export const VIDEO_MIME_TYPE_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  mkv: 'video/x-matroska',
  flv: 'video/x-flv',
  webm: 'video/webm',
  m4v: 'video/mp4'
} as const

/**
 * 音频MIME类型映射
 */
export const AUDIO_MIME_TYPE_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  flac: 'audio/flac'
} as const

/**
 * 图片MIME类型映射
 */
export const IMAGE_MIME_TYPE_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml'
} as const

/**
 * 从文件名获取扩展名
 * @param fileName 文件名
 * @returns 小写的扩展名（不含点）
 */
export const getFileExtension = (fileName: string): string => {
  const parts = fileName.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

/**
 * 通用文件类型检查函数
 * @param fileOrName File对象或文件名
 * @param supportedExtensions 支持的扩展名数组
 * @param mimeTypePrefix MIME类型前缀（如 'video/', 'audio/', 'image/'）
 * @returns 是否为指定类型的文件
 */
const checkFileType = (
  fileOrName: File | string,
  supportedExtensions: readonly string[],
  mimeTypePrefix: string
): boolean => {
  if (typeof fileOrName === 'string') {
    // 如果是字符串，检查扩展名
    const extension = getFileExtension(fileOrName)
    return supportedExtensions.includes(extension as any)
  }

  // 如果是File对象，先检查MIME类型，再检查扩展名
  const file = fileOrName as File

  // 优先检查MIME类型
  if (file.type && file.type.startsWith(mimeTypePrefix)) {
    return true
  }

  // 如果MIME类型为空或不明确，检查文件扩展名
  const extension = getFileExtension(file.name)
  return supportedExtensions.includes(extension as any)
}

/**
 * 根据文件扩展名获取视频MIME类型
 * @param fileName 文件名
 * @returns 视频MIME类型
 */
export const getVideoMimeType = (fileName: string): string => {
  const extension = getFileExtension(fileName)
  return VIDEO_MIME_TYPE_MAP[extension] || 'video/mp4' // 默认返回mp4类型
}

/**
 * 根据文件扩展名获取音频MIME类型
 * @param fileName 文件名
 * @returns 音频MIME类型
 */
export const getAudioMimeType = (fileName: string): string => {
  const extension = getFileExtension(fileName)
  return AUDIO_MIME_TYPE_MAP[extension] || 'audio/mpeg' // 默认返回mp3类型
}

/**
 * 根据文件扩展名获取图片MIME类型
 * @param fileName 文件名
 * @returns 图片MIME类型
 */
export const getImageMimeType = (fileName: string): string => {
  const extension = getFileExtension(fileName)
  return IMAGE_MIME_TYPE_MAP[extension] || 'image/jpeg' // 默认返回jpeg类型
}

/**
 * 修复文件的MIME类型（如果MIME类型为空或不正确）
 * @param file 原始文件
 * @returns 修复MIME类型后的文件
 */
export const fixFileMimeType = (file: File): File => {
  // 如果已经有正确的MIME类型，直接返回
  if (
    file.type &&
    (file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/'))
  ) {
    return file
  }

  const extension = getFileExtension(file.name)
  let correctMimeType = ''

  // 根据扩展名确定正确的MIME类型
  if (SUPPORTED_VIDEO_EXTENSIONS.includes(extension as any)) {
    correctMimeType = getVideoMimeType(file.name)
  } else if (SUPPORTED_AUDIO_EXTENSIONS.includes(extension as any)) {
    correctMimeType = getAudioMimeType(file.name)
  } else if (SUPPORTED_IMAGE_EXTENSIONS.includes(extension as any)) {
    correctMimeType = getImageMimeType(file.name)
  } else {
    // 如果不是媒体文件，保持原有类型
    return file
  }

  // 创建新的File对象，修复MIME类型
  return new File([file], file.name, {
    type: correctMimeType,
    lastModified: file.lastModified
  })
}

/**
 * 根据文件类型获取对应的消息枚举
 * @param file File对象
 * @returns 消息类型枚举
 */
export const getMessageTypeByFile = (file: File): MsgEnum => {
  if (checkFileType(file, SUPPORTED_VIDEO_EXTENSIONS, 'video/')) {
    return MsgEnum.VIDEO
  } else if (checkFileType(file, SUPPORTED_AUDIO_EXTENSIONS, 'audio/')) {
    return MsgEnum.VOICE
  } else if (checkFileType(file, SUPPORTED_IMAGE_EXTENSIONS, 'image/') && !file.type.includes('svg')) {
    return MsgEnum.IMAGE
  } else {
    return MsgEnum.FILE
  }
}

/**
 * 检查URL是否为视频链接
 * @param url 链接地址
 * @returns 是否为视频链接
 */
export const isVideoUrl = (url: string): boolean => {
  try {
    new URL(url)
    return checkFileType(url, SUPPORTED_VIDEO_EXTENSIONS, 'video/')
  } catch {
    return false
  }
}
