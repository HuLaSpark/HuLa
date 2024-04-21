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
    // canvas的尺寸
    canvas.width = 225
    canvas.height = 85
    // 加载SVG文件并绘制到canvas,根据文件类型，设置SVG图标
    loadSVG(`/file/${file.name.split('.').pop()}.svg`)
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
        roundRect(ctx, 0, 0, canvas.width, canvas.height, 8)
        ctx.fill()

        // 绘制圆角矩形边框
        roundRect(ctx, 0, 0, canvas.width, canvas.height, 8)
        ctx.stroke()

        /** 文本过长时截取并使用省略号代替 */
        function truncateText(text: string, maxWidth: number) {
          const ellipsis = '...'
          const ellipsisWidth = ctx.measureText(ellipsis).width

          if (ctx.measureText(text).width <= maxWidth || maxWidth <= ellipsisWidth) {
            return text // 字符串宽度或省略号宽度本身就小于等于最大宽度，无需截取
          }

          let left = 0
          let right = text.length
          let currentText
          let currentWidth

          // 尝试逐步减去字符并测试宽度
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

          // 创建带有省略号的最终文本
          currentText = text.substring(0, left) + ellipsis + text.substring(text.length - left, text.length)
          return currentText
        }
        /** 更新canvas的背景颜色和边框 */
        function updateCanvasBackground(
          canvas: HTMLCanvasElement,
          ctx: CanvasRenderingContext2D,
          isImgSelected: boolean
        ) {
          // 更新canvas的背景颜色和边框
          ctx.fillStyle = isImgSelected ? selectedBgColor : unselectedBgColor
          ctx.strokeStyle = '#ccc'
          ctx.lineWidth = 2

          // 重新绘制圆角矩形
          roundRect(ctx, 0, 0, canvas.width, canvas.height, 8)
          ctx.fill()
          roundRect(ctx, 0, 0, canvas.width, canvas.height, 8)
          ctx.stroke()

          // 修改原来的文本绘制部分，使用truncateText函数来截断文本
          ctx.fillStyle = '#333' // 文本颜色
          ctx.font = 'bold 14px Arial' // 文本样式
          const truncatedFileName = truncateText(fileName, maxTextWidth)
          ctx.fillText(truncatedFileName, 15, 25)

          ctx.fillStyle = '#909090' // 文本颜色
          ctx.font = 'normal 12px Arial' // 文本样式
          ctx.fillText(fileSize, 15, canvas.height - 15) // 修改 y 坐标来调整 fileSize 的位置

          // 在右边绘制SVG图标
          ctx.drawImage(svgImage, canvas.width - svgImage.width - 10, (canvas.height - svgImage.height) / 2)

          // 更新ImageDataURL
          return canvas.toDataURL('image/png')
        }

        // Canvas 转化为 Data URL
        const dataURL = updateCanvasBackground(canvas, ctx, isImgSelected)

        // img样式
        const imgStyle = 'border-radius: 8px; margin-right: 6px; cursor: pointer;'
        // 创建Image DOM元素并指定src为canvas的data url
        const img = new Image()
        img.src = dataURL
        img.dataset.type = 'file-canvas'
        img.style.cssText = imgStyle
        img.onload = () => resolve(img)
        img.onerror = reject

        // img元素点击事件监听
        img.addEventListener('click', (e) => {
          // 防止事件冒泡
          e.stopPropagation()
          // 切换选中状态并更新canvas背景
          isImgSelected = !isImgSelected
          img.src = updateCanvasBackground(canvas, ctx, isImgSelected)
        })

        // document点击事件监听
        document.addEventListener(
          'click',
          () => {
            if (isImgSelected) {
              // 如果图片当前是选中状态，则恢复背景色
              isImgSelected = false
              img.src = updateCanvasBackground(canvas, ctx, isImgSelected)
            }
          },
          true
        )
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
