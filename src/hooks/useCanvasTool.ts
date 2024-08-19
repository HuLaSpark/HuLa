export function useCanvasTool(canvas: any, ctx: any) {
  const startX = ref(0)
  const startY = ref(0)
  const isDrawing = ref(false)
  const currentTool = ref('rect')
  const brushSize = ref(10) // 笔的宽度

  const actions = ref([])
  const undoStack = ref([])

  let overlayCanvas: HTMLCanvasElement | null = null
  let overlayCtx: CanvasRenderingContext2D | null = null

  const getOverlayCanvas = () => {
    return overlayCanvas
  }

  // 创建工具
  const create = () => {
    if (!canvas) return
    overlayCanvas = document.createElement('canvas')
    overlayCanvas.width = canvas.width
    overlayCanvas.height = canvas.height
    overlayCanvas.style.position = 'absolute'
    overlayCanvas.style.top = canvas.offsetTop + 'px'
    overlayCanvas.style.left = canvas.offsetLeft + 'px'
    overlayCanvas.style.pointerEvents = 'none' // 让事件穿透
    canvas.parentElement?.appendChild(overlayCanvas)

    overlayCtx = overlayCanvas.getContext('2d')

    saveAction() // 保存当前画布状态
  }

  const draw = (type: string) => {
    currentTool.value = type
    canvas.addEventListener('mousedown', onMouseDown)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  onBeforeUnmount(() => {
    canvas.removeEventListener('mousedown', onMouseDown)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)

    if (overlayCanvas) {
      canvas.parentElement?.removeChild(overlayCanvas)
    }
  })

  const onMouseDown = (event: any) => {
    if (!overlayCtx) return

    const rect = canvas.getBoundingClientRect()
    startX.value = event.clientX - rect.left
    startY.value = event.clientY - rect.top
    isDrawing.value = true

    if (currentTool.value === 'mosaic') {
      drawMosaic(overlayCtx, startX.value, startY.value, brushSize.value)
    }
  }

  const onMouseMove = (event: any) => {
    if (!isDrawing.value || !overlayCtx) return

    const rect = canvas.getBoundingClientRect()
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top

    if (currentTool.value === 'mosaic') {
      drawMosaic(overlayCtx, currentX, currentY, brushSize.value)
    } else {
      overlayCtx.clearRect(0, 0, overlayCanvas?.width || 0, overlayCanvas?.height || 0)

      switch (currentTool.value) {
        case 'rect':
          drawRectangle(overlayCtx, startX.value, startY.value, currentX - startX.value, currentY - startY.value)
          break
        case 'circle':
          drawCircle(overlayCtx, startX.value, startY.value, currentX, currentY)
          break
        case 'arrow':
          drawArrow(overlayCtx, startX.value, startY.value, currentX, currentY)
          break
        default:
          break
      }
    }
  }

  const onMouseUp = () => {
    if (!isDrawing.value || !overlayCtx) return

    ctx.drawImage(overlayCanvas!, 0, 0)

    isDrawing.value = false
    saveAction()
    overlayCtx.clearRect(0, 0, overlayCanvas?.width || 0, overlayCanvas?.height || 0)
  }

  const drawRectangle = (context: any, x: any, y: any, width: any, height: any) => {
    context.strokeStyle = 'red'
    context.lineWidth = 2
    context.strokeRect(x, y, width, height)
  }

  const drawCircle = (context: any, x: any, y: any, endX: any, endY: any) => {
    const radius = Math.sqrt(Math.pow(endX - x, 2) + Math.pow(endY - y, 2))
    context.strokeStyle = 'red'
    context.lineWidth = 2
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.stroke()
  }

  const drawArrow = (context: any, fromX: any, fromY: any, toX: any, toY: any) => {
    const headLength = 10
    const angle = Math.atan2(toY - fromY, toX - fromX)
    context.strokeStyle = 'red'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.lineTo(toX, toY)
    context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
    context.moveTo(toX, toY)
    context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
    context.stroke()
  }

  // 设置马赛克画笔大小
  const drawMosaicBrushSize = (size: any) => {
    brushSize.value = size
  }

  // 实时马赛克涂抹
  const drawMosaic = (context: any, x: any, y: any, size: any) => {
    const imageData = ctx.getImageData(x - size / 2, y - size / 2, size, size)
    const blurredData = blurImageData(imageData)
    context.putImageData(blurredData, x - size / 2, y - size / 2)
  }

  const blurImageData = (imageData: ImageData): ImageData => {
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height

    const radius = 2 // 模糊半径
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

  //马赛克
  // const mskDraw = (imageData: any) => {
  //   //修改像素点
  //   function setPxInfo(imgData: any, x: any, y: any, color: any) {
  //     const data = imgData.data
  //     data[(y * imgData.width + x) * 4] = color[0]
  //     data[(y * imgData.width + x) * 4 + 1] = color[1]
  //     data[(y * imgData.width + x) * 4 + 2] = color[2]
  //     data[(y * imgData.width + x) * 4 + 3] = color[3]
  //   }
  //   //获取像素点
  //   function getPxInfo(imgData: any, x: any, y: any) {
  //     const data = imgData.data
  //     const color = []
  //     color[0] = data[(y * imgData.width + x) * 4]
  //     color[1] = data[(y * imgData.width + x) * 4 + 1]
  //     color[2] = data[(y * imgData.width + x) * 4 + 2]
  //     color[3] = data[(y * imgData.width + x) * 4 + 3]
  //     return color
  //   }
  //   //ctx.clearRect(0, 0, canvas.width, canvas.height)
  //   const size = 10
  //   for (let i = 0; i < imageData.width / size; i++) {
  //     for (let j = 0; j < imageData.height / size; j++) {
  //       const color = getPxInfo(
  //         imageData,
  //         Math.floor(i * size + Math.random() * size),
  //         Math.floor(j * size + Math.random() * size)
  //       )
  //       for (let a = 0; a < size; a++) {
  //         for (let b = 0; b < size; b++) {
  //           setPxInfo(imageData, i * size + a, j * size + b, color)
  //         }
  //       }
  //     }
  //   }
  //   return imageData
  // }

  const saveAction = () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    actions.value.push(imageData as never)
    undoStack.value = [] // 清空撤销堆栈
  }

  const undo = () => {
    if (actions.value.length > 1) {
      undoStack.value.push(actions.value.pop() as never)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (actions.value.length > 0) {
        ctx.putImageData(actions.value[actions.value.length - 1], 0, 0)
      }
    }
  }

  const redo = () => {
    if (undoStack.value.length > 0) {
      const imageData = undoStack.value.pop()
      actions.value.push(imageData as never)
      ctx.putImageData(imageData, 0, 0)
    }
  }

  return {
    getOverlayCanvas,
    create,
    draw,
    drawRectangle,
    drawCircle,
    drawArrow,
    drawMosaic,
    drawMosaicBrushSize,
    undo,
    redo
  }
}
