const QINIU_HOST_KEYWORDS = ['cdn.hulaspark.com']

const isQiniuHost = (hostname: string) => {
  const lowerHost = hostname.toLowerCase()
  return QINIU_HOST_KEYWORDS.some((keyword) => lowerHost.includes(keyword))
}

export type QiniuImageFormat = 'webp' | 'avif'

export type QiniuThumbOptions = {
  width?: number
  height?: number
  quality?: number
  format?: QiniuImageFormat
}

export const buildQiniuThumbnailUrl = (url?: string | null, options: QiniuThumbOptions = {}): string | undefined => {
  if (!url) return url ?? undefined

  try {
    const parsedUrl = new URL(url)
    if (!isQiniuHost(parsedUrl.hostname)) {
      return url
    }

    // 如果已经带有 imageView/imageMogr 等后处理参数，直接返回原链接
    const existingQuery = parsedUrl.search.toLowerCase()
    if (
      existingQuery.includes('imageview') ||
      existingQuery.includes('imagemogr') ||
      existingQuery.includes('imageview2')
    ) {
      return url
    }

    const { width, height, quality = 75 } = options
    const segments = ['imageView2', '2']
    if (width) segments.push('w', Math.round(width).toString())
    if (height) segments.push('h', Math.round(height).toString())
    if (quality) segments.push('q', Math.round(quality).toString())
    if (options.format) segments.push('format', options.format)

    const directive = segments.join('/')
    const hasQuery = parsedUrl.search.length > 0
    parsedUrl.search += `${hasQuery ? '&' : '?'}${directive}`

    return parsedUrl.toString()
  } catch {
    return url
  }
}

let preferredFormat: QiniuImageFormat | null | undefined

const canUseDataUrl = (type: string) => {
  if (typeof document === 'undefined') return false
  const canvas = document.createElement('canvas')
  if (!canvas.getContext) return false
  try {
    return canvas.toDataURL(type).startsWith(`data:${type}`)
  } catch {
    return false
  }
}

const detectPreferredFormat = (): QiniuImageFormat | undefined => {
  try {
    if (canUseDataUrl('image/avif')) {
      return 'avif'
    }
    if (canUseDataUrl('image/webp')) {
      return 'webp'
    }
  } catch {
    // ignore detection errors
  }
  return void 0
}

export const getPreferredQiniuFormat = (): QiniuImageFormat | undefined => {
  if (preferredFormat === null) {
    return undefined
  }

  if (preferredFormat === undefined) {
    preferredFormat = detectPreferredFormat() ?? null
  }

  return preferredFormat === null ? undefined : preferredFormat
}
