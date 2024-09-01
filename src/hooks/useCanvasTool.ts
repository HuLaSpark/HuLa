import { ref, onBeforeUnmount } from 'vue'

export function useCanvasTool(drawCanvas: any, drawCtx: any, imgCtx: any, screenConfig: any) {
  const drawConfig = ref({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    scaleX: 1,
    scaleY: 1,
    lineWidth: 2, // 线宽
    color: 'red', // 颜色
    isDrawing: false, // 正在绘制
    brushSize: 10, // 马赛克大小
    actions: [], // 存储绘制动作
    undoStack: []
  })

  const currentTool = ref('')

  const draw = (type: string) => {
    const { clientWidth: containerWidth, clientHeight: containerHeight } = drawCanvas.value
    drawConfig.value.scaleX = (screen.width * window.devicePixelRatio) / containerWidth
    drawConfig.value.scaleY = (screen.height * window.devicePixelRatio) / containerHeight
    currentTool.value = type
    startListen()
  }

  onBeforeUnmount(() => {
    closeListen()
  })

  const handleMouseDown = (event: MouseEvent) => {
    const { offsetX, offsetY } = event
    drawConfig.value.isDrawing = true

    // 限制起点坐标在框选矩形区域内
    drawConfig.value.startX = Math.min(
      Math.max(offsetX * drawConfig.value.scaleX, screenConfig.value.startX),
      screenConfig.value.endX
    )
    drawConfig.value.startY = Math.min(
      Math.max(offsetY * drawConfig.value.scaleY, screenConfig.value.startY),
      screenConfig.value.endY
    )
  }

  const handleMouseMove = (event: MouseEvent) => {
    const { offsetX, offsetY } = event
    if (!drawConfig.value.isDrawing || !drawCtx.value) return

    // 限制绘制区域在框选矩形区域内
    const limitedX = Math.min(
      Math.max(offsetX * drawConfig.value.scaleX, screenConfig.value.startX),
      screenConfig.value.endX
    )
    const limitedY = Math.min(
      Math.max(offsetY * drawConfig.value.scaleY, screenConfig.value.startY),
      screenConfig.value.endY
    )

    drawConfig.value.endX = limitedX
    drawConfig.value.endY = limitedY

    // 清除非马赛克的情况下重新绘制
    if (currentTool.value !== 'mosaic') {
      drawCtx.value.clearRect(0, 0, drawCanvas.value.width, drawCanvas.value.height)
      drawConfig.value.actions.forEach((action) => {
        drawCtx.value.putImageData(action, 0, 0)
      })
    }

    const x = Math.min(drawConfig.value.startX, drawConfig.value.endX)
    const y = Math.min(drawConfig.value.startY, drawConfig.value.endY)

    const width = Math.abs(drawConfig.value.startX - drawConfig.value.endX)
    const height = Math.abs(drawConfig.value.startY - drawConfig.value.endY)

    switch (currentTool.value) {
      case 'rect':
        drawRectangle(drawCtx.value, x, y, width, height)
        break
      case 'circle':
        drawCircle(
          drawCtx.value,
          drawConfig.value.startX,
          drawConfig.value.startY,
          drawConfig.value.endX,
          drawConfig.value.endY
        )
        break
      case 'arrow':
        drawArrow(
          drawCtx.value,
          drawConfig.value.startX,
          drawConfig.value.startY,
          drawConfig.value.endX,
          drawConfig.value.endY
        )
        break
      case 'mosaic':
        drawMosaic(drawCtx.value, limitedX, limitedY, drawConfig.value.brushSize)
        break
      default:
        break
    }
  }

  const handleMouseUp = () => {
    // const { offsetX, offsetY } = event;
    drawConfig.value.isDrawing = false

    drawCtx.value.drawImage(drawCanvas.value!, 0, 0, drawCanvas.value.width, drawCanvas.value.height)

    saveAction()
  }

  const drawRectangle = (context: any, x: any, y: any, width: any, height: any) => {
    context.strokeStyle = drawConfig.value.color
    context.lineWidth = drawConfig.value.lineWidth
    context.strokeRect(x, y, width, height)
  }

  const drawCircle = (context: any, startX: any, startY: any, endX: any, endY: any) => {
    // 限制圆形的绘制范围在框选矩形区域内
    const limitedEndX = Math.min(Math.max(endX, screenConfig.value.startX), screenConfig.value.endX)
    const limitedEndY = Math.min(Math.max(endY, screenConfig.value.startY), screenConfig.value.endY)

    // 计算半径，保证半径不会超过限定矩形的边界
    const deltaX = limitedEndX - startX
    const deltaY = limitedEndY - startY

    // 检查圆形是否会超出矩形区域的边界
    const maxRadiusX = Math.min(startX - screenConfig.value.startX, screenConfig.value.endX - startX)
    const maxRadiusY = Math.min(startY - screenConfig.value.startY, screenConfig.value.endY - startY)
    const maxRadius = Math.min(maxRadiusX, maxRadiusY)

    // 使用 min 函数确保半径不会超过限定范围
    const radius = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY), maxRadius)

    // 绘制圆形
    context.strokeStyle = drawConfig.value.color
    context.lineWidth = drawConfig.value.lineWidth
    context.beginPath()
    context.arc(startX, startY, radius, 0, Math.PI * 2)
    context.stroke()
  }

  const drawArrow = (context: any, fromX: any, fromY: any, toX: any, toY: any) => {
    const headLength = 15 // 箭头的长度
    const angle = Math.atan2(toY - fromY, toX - fromX) // 算出箭头的角度

    context.strokeStyle = drawConfig.value.color
    context.lineWidth = drawConfig.value.lineWidth

    // 绘制箭头的主线
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.lineTo(toX, toY)
    context.stroke()

    // 计算箭头三角形的三个角
    context.beginPath()
    context.moveTo(toX, toY)
    context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
    context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
    context.closePath()

    // 填充箭头三角形
    context.fillStyle = drawConfig.value.color
    context.fill()
  }

  // 设置马赛克画笔大小
  const drawMosaicBrushSize = (size: any) => {
    drawConfig.value.brushSize = size
  }

  // 实时马赛克涂抹
  const drawMosaic = (context: any, x: any, y: any, size: any) => {
    const imageData = imgCtx.value.getImageData(x - size, y - size, size, size)
    const blurredData = blurImageData(imageData, size)
    context.putImageData(blurredData, x - size, y - size)
  }

  const blurImageData = (imageData: ImageData, size: any): ImageData => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    const radius = size / 2 // 模糊半径
    const tempData = new Uint8ClampedArray(data) // 用于保存原始图像数据

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4

        let r = 0,
          g = 0,
          b = 0,
          a = 0
        let count = 0

        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const newX = x + kx
            const newY = y + ky

            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
              const newIndex = (newY * width + newX) * 4
              r += tempData[newIndex]
              g += tempData[newIndex + 1]
              b += tempData[newIndex + 2]
              a += tempData[newIndex + 3]
              count++
            }
          }
        }

        data[index] = r / count
        data[index + 1] = g / count
        data[index + 2] = b / count
        data[index + 3] = a / count
      }
    }

    return imageData
  }

  const saveAction = () => {
    const imageData = drawCtx.value.getImageData(0, 0, drawCanvas.value.width, drawCanvas.value.height)
    drawConfig.value.actions.push(imageData as never)
    drawConfig.value.undoStack = [] // 清空撤销堆栈
  }

  const undo = () => {
    closeListen()
    if (drawConfig.value.actions.length > 0) {
      drawConfig.value.undoStack.push(drawConfig.value.actions.pop() as never)
      drawCtx.value.clearRect(0, 0, drawCanvas.value.width, drawCanvas.value.height)
      if (drawConfig.value.actions.length > 0) {
        drawCtx.value.putImageData(drawConfig.value.actions[drawConfig.value.actions.length - 1], 0, 0)
      }
    }
  }

  const redo = () => {
    closeListen()
    if (drawConfig.value.undoStack.length > 0) {
      const imageData = drawConfig.value.undoStack.pop()
      drawConfig.value.actions.push(imageData as never)
      drawCtx.value.putImageData(imageData, 0, 0)
    }
  }

  const startListen = () => {
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const closeListen = () => {
    document.removeEventListener('mousedown', handleMouseDown)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  return {
    draw,
    drawMosaicBrushSize,
    drawRectangle,
    drawCircle,
    drawArrow,
    undo,
    redo
  }
}
