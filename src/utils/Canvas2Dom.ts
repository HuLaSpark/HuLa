export interface CanvasToImageOptions {
  /**
   * 目标导出宽度（像素）
   */
  targetWidth?: number
  /**
   * 目标导出高度（像素）
   */
  targetHeight?: number
  /**
   * 导出图片类型，默认 WebP
   */
  type?: string
  /**
   * 导出图片质量，部分类型支持
   */
  quality?: number
}

export interface CanvasExportResult {
  bytes: Uint8Array
  width: number
  height: number
}

export async function canvasToImageBytes(
  canvas: HTMLCanvasElement,
  options?: CanvasToImageOptions
): Promise<CanvasExportResult | null> {
  const { targetWidth, targetHeight, type = 'image/webp', quality } = options || {}
  const desiredWidth = targetWidth ?? canvas.width
  const desiredHeight = targetHeight ?? canvas.height

  let targetCanvas = canvas

  if (canvas.width !== desiredWidth || canvas.height !== desiredHeight) {
    const resizedCanvas = document.createElement('canvas')
    resizedCanvas.width = desiredWidth
    resizedCanvas.height = desiredHeight
    const ctx = resizedCanvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(canvas, 0, 0, desiredWidth, desiredHeight)
    targetCanvas = resizedCanvas
  }

  const blob = await new Promise<Blob | null>((resolve) => targetCanvas.toBlob(resolve, type, quality))
  if (!blob) {
    return null
  }

  const buffer = await blob.arrayBuffer()
  return {
    bytes: new Uint8Array(buffer),
    width: desiredWidth,
    height: desiredHeight
  }
}
