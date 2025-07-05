/**
 * 图片处理工具类
 * 提供图片格式检测、转换、处理等功能
 */

/**
 * 图片信息类型
 */
type ImageInfo = {
  width: number
  height: number
  previewUrl?: string
  size?: number
}

/**
 * 获取图片信息选项
 */
type GetImageInfoOptions = {
  /** 是否返回预览URL（仅对File有效） */
  includePreviewUrl?: boolean
  /** 是否返回文件大小（仅对URL有效） */
  includeSize?: boolean
}

/**
 * 检测图片格式
 * @param imageUrl 图片 URL
 */
export const detectImageFormat = (imageUrl: string): string => {
  if (imageUrl.startsWith('data:image/')) {
    const formatMatch = imageUrl.match(/data:image\/([^;]+)/)
    return formatMatch ? formatMatch[1].toUpperCase() : 'UNKNOWN'
  } else {
    const extension = imageUrl.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'JPEG'
      case 'png':
        return 'PNG'
      case 'gif':
        return 'GIF'
      case 'webp':
        return 'WEBP'
      case 'bmp':
        return 'BMP'
      case 'svg':
        return 'SVG'
      default:
        return 'UNKNOWN'
    }
  }
}

/**
 * 将图片 URL 转换为 PNG 格式的 Uint8Array
 * 支持 base64 和 HTTP URL 格式的图片
 * @param imageUrl 图片 URL
 */
export const imageUrlToUint8Array = async (imageUrl: string): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        // 创建 canvas 并设置尺寸
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        // 获取 2D 上下文并绘制图片
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法获取 Canvas 上下文'))
          return
        }

        ctx.drawImage(img, 0, 0)

        // 将 canvas 转换为 PNG 格式的 blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('图片转换失败'))
            return
          }

          // 读取 blob 为 ArrayBuffer，然后转换为 Uint8Array
          const reader = new FileReader()
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer
            resolve(new Uint8Array(arrayBuffer))
          }
          reader.onerror = () => {
            reject(new Error('读取图片数据失败'))
          }
          reader.readAsArrayBuffer(blob)
        }, 'image/png') // 强制转换为 PNG 格式
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    // 处理跨域问题
    img.crossOrigin = 'anonymous'
    img.src = imageUrl
  })
}

/**
 * 将 Tauri 的 RGBA 图片数据转换为 PNG 格式的 File 对象
 * @param imageData RGBA 字节数组
 * @param width 图片宽度
 * @param height 图片高度
 * @param filename 文件名（可选）
 */
export const rgbaToFile = async (
  imageData: Uint8Array,
  width: number,
  height: number,
  filename: string = `image-${Date.now()}.png`
): Promise<File> => {
  return new Promise((resolve, reject) => {
    try {
      // 创建 Canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'))
        return
      }

      // 创建 ImageData 对象
      const canvasImageData = ctx.createImageData(width, height)

      // 处理不同的数据源格式
      let uint8Array: Uint8Array
      if (imageData.buffer instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength)
      } else {
        uint8Array = new Uint8Array(imageData)
      }

      // 复制数据到 canvas ImageData
      canvasImageData.data.set(uint8Array)

      // 将 ImageData 绘制到 canvas
      ctx.putImageData(canvasImageData, 0, 0)

      // 将 canvas 转换为 Blob，然后创建 File 对象
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas 转换为 Blob 失败'))
            return
          }

          const file = new File([blob], filename, { type: 'image/png' })
          resolve(file)
        },
        'image/png',
        1
      )
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 将 Tauri 的 RGBA 图片数据转换为 PNG 格式的 Uint8Array
 * @param imageData RGBA 字节数组
 * @param width 图片宽度
 * @param height 图片高度
 */
export const rgbaToUint8Array = async (imageData: Uint8Array, width: number, height: number): Promise<Uint8Array> => {
  return new Promise((resolve, reject) => {
    try {
      // 创建 Canvas
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'))
        return
      }

      // 创建 ImageData 对象
      const canvasImageData = ctx.createImageData(width, height)

      // 处理不同的数据源格式
      let uint8Array: Uint8Array
      if (imageData.buffer instanceof ArrayBuffer) {
        uint8Array = new Uint8Array(imageData.buffer, imageData.byteOffset, imageData.byteLength)
      } else {
        uint8Array = new Uint8Array(imageData)
      }

      // 复制数据到 canvas ImageData
      canvasImageData.data.set(uint8Array)

      // 将 ImageData 绘制到 canvas
      ctx.putImageData(canvasImageData, 0, 0)

      // 将 canvas 转换为 Blob，然后读取为 Uint8Array
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas 转换为 Blob 失败'))
            return
          }

          const reader = new FileReader()
          reader.onload = () => {
            const arrayBuffer = reader.result as ArrayBuffer
            resolve(new Uint8Array(arrayBuffer))
          }
          reader.onerror = () => {
            reject(new Error('读取图片数据失败'))
          }
          reader.readAsArrayBuffer(blob)
        },
        'image/png',
        1
      )
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * 获取图片的详细信息
 * 支持 File 对象和图片 URL，可选择性返回额外信息
 * @param input 图片源（File对象或URL字符串）
 * @param options 选项配置
 */
export const getImageDimensions = async (
  input: File | string,
  options: GetImageInfoOptions = {}
): Promise<ImageInfo> => {
  const { includePreviewUrl = false, includeSize = false } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    let previewUrl: string | undefined
    let shouldRevokeUrl = false

    // 处理不同的输入类型
    if (input instanceof File) {
      // File 对象处理
      previewUrl = URL.createObjectURL(input)
      shouldRevokeUrl = true
      img.src = previewUrl
    } else {
      // URL 字符串处理
      img.crossOrigin = 'anonymous'
      img.src = input
    }

    img.onload = async () => {
      try {
        const result: ImageInfo = {
          width: img.width,
          height: img.height
        }

        // 根据选项添加额外信息
        if (includePreviewUrl && previewUrl) {
          result.previewUrl = previewUrl
          shouldRevokeUrl = false // 不自动释放，由调用者决定
        }

        if (includeSize && typeof input === 'string') {
          try {
            // 获取远程图片大小
            const response = await fetch(input, { method: 'HEAD' })
            result.size = parseInt(response.headers.get('content-length') || '0')
          } catch (error) {
            // 如果无法获取大小，使用默认值
            result.size = 0
          }
        }

        // 如果不需要保留预览URL，则释放它
        if (shouldRevokeUrl && previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }

        resolve(result)
      } catch (error) {
        if (shouldRevokeUrl && previewUrl) {
          URL.revokeObjectURL(previewUrl)
        }
        reject(error)
      }
    }

    img.onerror = () => {
      if (shouldRevokeUrl && previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      reject(new Error('图片加载失败'))
    }
  })
}

/**
 * 检查是否为图片
 * @param url 待检查的 URL
 */
export const isImageUrl = (url: string): boolean => {
  if (url.startsWith('data:image/')) {
    return true
  }

  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
  const extension = url.split('.').pop()?.toLowerCase()
  return imageExtensions.includes(extension || '')
}

/**
 * 处理剪贴板图片数据
 * 简化版本，专门用于处理 Tauri 剪贴板读取的图片数据
 * @param clipboardImage Tauri 剪贴板图片对象
 */
export const processClipboardImage = async (clipboardImage: any): Promise<File> => {
  // 获取图片的宽度和高度
  const { width, height } = await clipboardImage.size()

  // 获取图片的 RGBA 数据
  const imageData = await clipboardImage.rgba()

  // 使用 rgbaToFile 函数转换为 File 对象
  return await rgbaToFile(imageData, width, height)
}
