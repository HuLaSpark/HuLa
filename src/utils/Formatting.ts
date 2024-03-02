/**
 * 文件大小格式化
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0 || !bytes) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const base = 1024
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base))
  const size = parseFloat((bytes / Math.pow(base, unitIndex)).toFixed(2))

  return size + ' ' + units[unitIndex]
}

/**
 * 图片尺寸格式化
 * @param width 图片宽度
 * @param height 图片高度
 * @param option 选项: { maxWidth: number, maxHeight: number }
 */
export const formatImage = (
  width: number,
  height: number,
  option = {
    maxWidth: 200,
    maxHeight: 150
  }
): number => {
  const { maxWidth, maxHeight } = option
  // 小： 如果图片宽高都小于最大宽高，直接返回原高度
  if (width < maxWidth && height < maxHeight) {
    return height
    // 宽： 根据宽度等比缩放
  } else if (width > height) {
    return (maxWidth / width) * height
    // 窄：返回最大高度
  } else if (width === height || width < height) {
    return maxHeight
  }
  return maxHeight
}

/** 注意！这是文件图标映射关系表，如有修改需求-请联系前端管理同学 */
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
  md: 'md'
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
 * 地址转Blob
 */
export const urlToBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url)
  return await response.blob()
}

/**
 * 地址转文件
 */
export const urlToFile = async (url: string, fileName?: string): Promise<File> => {
  const blob = await urlToBlob(url)
  const fileType = blob.type
  const name = fileName || Date.now() + '_emoji.png' // 时间戳生成唯一文件名
  return new File([blob], name, { type: fileType })
}
