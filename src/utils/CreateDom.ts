import { formatBytes } from '@/utils/Formatting.ts'

/**
 * 创建一个带有SVG图标的img标签
 * @param {File} file 文件对象
 */
export const createFileOrVideoDom = (file: File) => {
  // 获取文件的名称和大小
  const fileName = file.name
  // 计算文件或者视频大小
  const fileSize = formatBytes(file.size)

  return new Promise((resolve, reject) => {
    // 创建带有圆角和SVG图标的canvas元素
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    // 获取设备像素比
    const dpr = window.devicePixelRatio || 1

    // canvas的实际尺寸
    const actualWidth = 225
    const actualHeight = 85

    // 设置canvas的显示尺寸
    canvas.style.width = `${actualWidth}px`
    canvas.style.height = `${actualHeight}px`

    // 设置canvas的缓冲区尺寸
    canvas.width = actualWidth * dpr
    canvas.height = actualHeight * dpr

    // 根据dpr缩放上下文
    ctx.scale(dpr, dpr)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
    // 加载SVG文件并绘制到canvas,根据文件类型，设置SVG图标
    loadSVG(`/file/${extension}.svg`)
      .then((svgImage: any) => {
        // 圆角矩形的背景和边框，您可以根据需要调整样式
        ctx.fillStyle = '#fdfdfd' // 背景颜色
        ctx.strokeStyle = '#ccc' // 边框颜色
        ctx.lineWidth = 2 // 边框宽度
        const selectedBgColor = '#e4e4e4' // 点击时的背景颜色
        const unselectedBgColor = '#fdfdfd' // 未点击时的背景颜色
        let isImgSelected = false // 标记图片是否被选中
        const maxTextWidth = 160 // 文件名称的最大宽度

        // 绘制圆角矩形背景
        roundRect(ctx, 0, 0, actualWidth, actualHeight, 8)
        ctx.fill()

        // 绘制圆角矩形边框
        roundRect(ctx, 0, 0, actualWidth, actualHeight, 8)
        ctx.stroke()

        /** 文本过长时截取并使用省略号代替 */
        function truncateText(text: string, maxWidth: number) {
          const ellipsis = '...'
          const ellipsisWidth = ctx.measureText(ellipsis).width

          if (ctx.measureText(text).width <= maxWidth || maxWidth <= ellipsisWidth) {
            return text
          }

          let left = 0
          let right = text.length
          let currentText
          let currentWidth

          while (left < right - 1) {
            const middle = Math.floor((left + right) / 2)
            currentText = text.substring(0, middle) + ellipsis + text.substring(text.length - middle, text.length)
            currentWidth = ctx.measureText(currentText).width

            if (currentWidth < maxWidth) {
              left = middle
            } else {
              right = middle
            }
          }

          currentText = text.substring(0, left) + ellipsis + text.substring(text.length - left, text.length)
          return currentText
        }

        /** 更新canvas的背景颜色和边框 */
        function updateCanvasBackground(
          canvas: HTMLCanvasElement,
          ctx: CanvasRenderingContext2D,
          isImgSelected: boolean
        ) {
          // 清除之前的内容
          ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

          // 更新canvas的背景颜色和边框
          ctx.fillStyle = isImgSelected ? selectedBgColor : unselectedBgColor
          ctx.strokeStyle = '#ccc'
          ctx.lineWidth = 2

          // 重新绘制圆角矩形
          roundRect(ctx, 0, 0, actualWidth, actualHeight, 8)
          ctx.fill()
          roundRect(ctx, 0, 0, actualWidth, actualHeight, 8)
          ctx.stroke()

          // 修改原来的文本绘制部分，使用truncateText函数来截断文本
          ctx.fillStyle = '#333' // 文本颜色
          ctx.font = 'bold 14px Arial' // 文本样式
          const truncatedFileName = truncateText(fileName, maxTextWidth)
          ctx.fillText(truncatedFileName, 15, 25)

          ctx.fillStyle = '#909090' // 文本颜色
          ctx.font = 'normal 12px Arial' // 文本样式
          ctx.fillText(fileSize, 15, actualHeight - 15)

          // 在右边绘制SVG图标，需要根据dpr调整位置
          ctx.drawImage(svgImage, actualWidth - svgImage.width / dpr - 25, (actualHeight - svgImage.height / dpr) / 2)

          return canvas.toDataURL('image/png')
        }

        // Canvas 转化为 Data URL
        const dataURL = updateCanvasBackground(canvas, ctx, isImgSelected)
        const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv']
        const imgStyle = 'border-radius: 8px; margin-right: 6px; cursor: pointer;'
        const isVideo = VIDEO_EXTENSIONS.includes(extension)
        if (isVideo) {
          // 创建video元素
          const video = document.createElement('video')
          try {
            // 1. 先验证文件对象有效性
            if (!(file instanceof File) || file.size === 0) {
              throw new Error('无效的视频文件')
            }
            video.src = URL.createObjectURL(file)
            video.dataset.type = 'video'
            video.poster = dataURL
            video.style.cssText = imgStyle
            video.width = actualWidth
            video.height = actualHeight
            // 确保video元素不会干扰光标显示
            video.setAttribute('contenteditable', 'false')
            video.setAttribute('draggable', 'false')
            video.onloadeddata = () => resolve(video)
            video.onerror = reject
          } catch (error) {
            reject(error)
            window.$message.error('视频处理失败: ' + error)
          }
        } else {
          // 创建Image DOM元素并指定src为canvas的data url
          const img = new Image()
          img.src = dataURL
          img.dataset.type = 'file-canvas'
          img.style.cssText = imgStyle
          img.width = actualWidth
          img.height = actualHeight
          img.onload = () => resolve(img)
          img.onerror = reject

          // img元素点击事件监听
          img.addEventListener('click', (e) => {
            e.stopPropagation()
            isImgSelected = !isImgSelected
            img.src = updateCanvasBackground(canvas, ctx, isImgSelected)
          })

          // document点击事件监听
          document.addEventListener(
            'click',
            () => {
              if (isImgSelected) {
                isImgSelected = false
                img.src = updateCanvasBackground(canvas, ctx, isImgSelected)
              }
            },
            true
          )
        }
      })
      .catch((error) => {
        reject(error)
        window.$message.error('暂不支持此类型文件')
      })
  })
}

/**
 * 加载本地的SVG文件，并在加载完成后回调
 * @param {string} path SVG文件的路径
 * @example
 * loadSVG('public/file/file.svg').then((svgImage) => {}
 * 使用时，将SVG文件放在public/file文件夹下，并且使用文件类型做svg名
 */
const loadSVG = (path: string) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = path
  })
}

/**
 * 画一个带圆角的矩形
 * @param {CanvasRenderingContext2D} ctx Canvas绘图上下文
 * @param {number} x 矩形左上角x坐标
 * @param {number} y 矩形左上角y坐标
 * @param {number} width 矩形宽度
 * @param {number} height 矩形高度
 * @param {number} radius 圆角的半径
 */
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  if (width < 2 * radius) radius = width / 2
  if (height < 2 * radius) radius = height / 2
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}
