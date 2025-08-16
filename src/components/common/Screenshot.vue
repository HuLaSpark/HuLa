<template>
  <div ref="canvasbox" class="canvasbox">
    <canvas ref="drawCanvas" class="draw-canvas"></canvas>
    <canvas ref="maskCanvas" class="mask-canvas"></canvas>
    <canvas ref="imgCanvas" class="img-canvas"></canvas>
    <div ref="magnifier" class="magnifier">
      <canvas ref="magnifierCanvas"></canvas>
    </div>
    <div ref="buttonGroup" class="button-group" v-show="showButtonGroup" :style="buttonGroupStyle">
      <button @click="drawImgCanvas('rect')">矩形</button>
      <button @click="drawImgCanvas('circle')">圆形</button>
      <button @click="drawImgCanvas('arrow')">箭头</button>
      <button @click="drawImgCanvas('mosaic')">马赛克</button>
      <button @click="drawImgCanvas('redo')">重做</button>
      <button @click="drawImgCanvas('undo')">撤销</button>
      <button @click="confirmSelection">确定</button>
      <button @click="cancelSelection">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeImage } from '@tauri-apps/plugin-clipboard-manager'
import type { Ref } from 'vue'
import { useCanvasTool } from '@/hooks/useCanvasTool'
import { useTauriListener } from '@/hooks/useTauriListener'
import { ErrorType, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'

type ScreenConfig = {
  startX: number
  startY: number
  endX: number
  endY: number
  scaleX: number
  scaleY: number
  isDrawing: boolean
  width: number
  height: number
}

type ButtonGroupStyle = {
  width: number
  height: number
  [key: `--${string}`]: any
}

const appWindow = WebviewWindow.getCurrent()
const { addListener } = useTauriListener()
const canvasbox: Ref<HTMLDivElement | null> = ref(null)

// 图像层
const imgCanvas: Ref<HTMLCanvasElement | null> = ref(null)
const imgCtx: Ref<CanvasRenderingContext2D | null> = ref(null)

// 蒙版层
const maskCanvas: Ref<HTMLCanvasElement | null> = ref(null)
const maskCtx: Ref<CanvasRenderingContext2D | null> = ref(null)

// 绘图层
const drawCanvas: Ref<HTMLCanvasElement | null> = ref(null)
const drawCtx: Ref<CanvasRenderingContext2D | null> = ref(null)
let drawTools: any

// 放大镜
const magnifier: Ref<HTMLDivElement | null> = ref(null)
const magnifierCanvas: Ref<HTMLCanvasElement | null> = ref(null)
const magnifierCtx: Ref<CanvasRenderingContext2D | null> = ref(null)
const magnifierSize: number = 150 // 放大镜的尺寸
const zoomFactor: number = 3 // 放大的倍数

// 按钮组
const buttonGroup: Ref<HTMLDivElement | null> = ref(null)
const showButtonGroup: Ref<boolean> = ref(false) // 控制按钮组显示

const buttonGroupStyle: Ref<ButtonGroupStyle> = ref({
  width: 300,
  height: 40
})

// 截屏信息
const screenConfig: Ref<ScreenConfig> = ref({
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  scaleX: 0,
  scaleY: 0,
  isDrawing: false,
  width: 0,
  height: 0
})

// 截屏图片
let screenshotImage: HTMLImageElement
let isImageLoaded: boolean = false

/**
 * 绘制图形
 * @param {string} type - 图形类型
 */
const drawImgCanvas = (type: string) => {
  if (!drawTools) return

  //isDrawGraphics.value = true;

  const drawableTypes = ['rect', 'circle', 'arrow', 'mosaic']
  // 绘制马赛克时设置笔宽
  if (type === 'mosaic') {
    drawTools.drawMosaicBrushSize(20) // 设置马赛克笔刷大小
  }

  if (drawableTypes.includes(type)) {
    drawTools.draw(type) // 调用绘图方法
  } else if (type === 'redo') {
    drawTools.redo() // 调用重做方法
  } else if (type === 'undo') {
    drawTools.undo() // 调用撤销方法
  }
}

/**
 * 初始化canvas
 */
const initCanvas = async () => {
  // 重置图像加载状态
  isImageLoaded = false

  const canvasWidth = screen.width * window.devicePixelRatio
  const canvasHeight = screen.height * window.devicePixelRatio

  const config = {
    x: '0',
    y: '0',
    width: `${canvasWidth}`,
    height: `${canvasHeight}`
  }

  const screenshotData = await invokeWithErrorHandler('screenshot', config, {
    customErrorMessage: '截图失败',
    errorType: ErrorType.Client
  })

  if (imgCanvas.value && maskCanvas.value) {
    imgCanvas.value.width = canvasWidth
    imgCanvas.value.height = canvasHeight
    maskCanvas.value.width = canvasWidth
    maskCanvas.value.height = canvasHeight
    drawCanvas.value!.width = canvasWidth
    drawCanvas.value!.height = canvasHeight

    imgCtx.value = imgCanvas.value.getContext('2d')
    maskCtx.value = maskCanvas.value.getContext('2d')
    drawCtx.value = drawCanvas.value!.getContext('2d', { willReadFrequently: true })

    // 获取屏幕缩放比例
    const { clientWidth: containerWidth, clientHeight: containerHeight } = imgCanvas.value!
    screenConfig.value.scaleX = canvasWidth / containerWidth
    screenConfig.value.scaleY = canvasHeight / containerHeight

    screenshotImage = new Image()

    screenshotImage.onload = () => {
      if (imgCtx.value) {
        try {
          imgCtx.value.drawImage(screenshotImage, 0, 0, canvasWidth, canvasHeight)

          // 绘制全屏绿色边框
          if (maskCtx.value) {
            drawRectangle(
              maskCtx.value,
              screenConfig.value.startX,
              screenConfig.value.startY,
              canvasWidth,
              canvasHeight,
              4
            )
          }

          if (drawCanvas.value && drawCtx.value && imgCtx.value) {
            drawTools = useCanvasTool(drawCanvas, drawCtx, imgCtx, screenConfig)
          }
          isImageLoaded = true
        } catch (error) {
          console.error('绘制图像到canvas失败:', error)
        }
      } else {
        console.error('imgCtx.value为空')
      }
    }

    // 直接将原始buffer绘制到canvas，不使用Image对象
    if (screenshotData && imgCtx.value) {
      try {
        // 解码base64数据
        const binaryString = atob(screenshotData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // 创建ImageData并绘制到canvas
        const imageData = new ImageData(new Uint8ClampedArray(bytes), canvasWidth, canvasHeight)
        imgCtx.value.putImageData(imageData, 0, 0)

        // 绘制全屏绿色边框
        if (maskCtx.value) {
          drawRectangle(
            maskCtx.value,
            screenConfig.value.startX,
            screenConfig.value.startY,
            canvasWidth,
            canvasHeight,
            4
          )
        }

        if (drawCanvas.value && drawCtx.value && imgCtx.value) {
          drawTools = useCanvasTool(drawCanvas, drawCtx, imgCtx, screenConfig)
        }
        isImageLoaded = true
      } catch (error) {
        // 如果直接绘制失败，回退到Image对象方式
        screenshotImage.src = `data:image/png;base64,${screenshotData}`
      }
    } else {
      screenshotImage.src = `data:image/png;base64,${screenshotData}`
    }
  }

  // 添加鼠标监听事件
  maskCanvas.value?.addEventListener('mousedown', handleMaskMouseDown)
  maskCanvas.value?.addEventListener('mousemove', handleMaskMouseMove)
  maskCanvas.value?.addEventListener('mouseup', handleMaskMouseUp)
  maskCanvas.value?.addEventListener('contextmenu', handleRightClick)

  // 添加键盘监听事件
  document.addEventListener('keydown', handleKeyDown)
}

const handleMaskMouseDown = (event: MouseEvent) => {
  // 如果已经显示按钮组，则不执行任何操作
  if (showButtonGroup.value) return
  const offsetEvent = event as any
  screenConfig.value.startX = offsetEvent.offsetX * screenConfig.value.scaleX
  screenConfig.value.startY = offsetEvent.offsetY * screenConfig.value.scaleY
  screenConfig.value.isDrawing = true
  if (!screenConfig.value.isDrawing) {
    drawMask()
  } // 先绘制遮罩层
}

const handleMaskMouseMove = (event: MouseEvent) => {
  handleMagnifierMouseMove(event)
  if (!screenConfig.value.isDrawing || !maskCtx.value || !maskCanvas.value) return

  const offsetEvent = event as any
  const mouseX = offsetEvent.offsetX * screenConfig.value.scaleX
  const mouseY = offsetEvent.offsetY * screenConfig.value.scaleY
  const width = mouseX - screenConfig.value.startX
  const height = mouseY - screenConfig.value.startY

  // 清除之前的矩形区域
  maskCtx.value.clearRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)

  // 重新绘制整个遮罩层
  drawMask()

  // 清除矩形区域内的遮罩，实现透明效果
  maskCtx.value.clearRect(screenConfig.value.startX, screenConfig.value.startY, width, height)

  // 绘制矩形边框
  drawRectangle(maskCtx.value, screenConfig.value.startX, screenConfig.value.startY, width, height)
}

const handleMaskMouseUp = (event: MouseEvent) => {
  if (!screenConfig.value.isDrawing) return
  screenConfig.value.isDrawing = false
  // 记录矩形区域的结束坐标
  const offsetEvent = event as any
  screenConfig.value.endX = offsetEvent.offsetX * screenConfig.value.scaleX
  screenConfig.value.endY = offsetEvent.offsetY * screenConfig.value.scaleY

  // 记录矩形区域的宽高
  screenConfig.value.width = Math.abs(screenConfig.value.endX - screenConfig.value.startX)
  screenConfig.value.height = Math.abs(screenConfig.value.endY - screenConfig.value.startY)
  // 判断矩形区域是否有效
  if (screenConfig.value.width > 5 && screenConfig.value.height > 5) {
    // 隐藏放大镜，避免干扰后续操作
    if (magnifier.value) {
      magnifier.value.style.display = 'none'
    }

    // 根据矩形位置计算按钮组位置
    updateButtonGroupPosition()
    showButtonGroup.value = true // 显示按钮组
  }
}

// 计算矩形区域工具栏位置
const updateButtonGroupPosition = () => {
  if (!buttonGroup.value) return

  const { scaleX, scaleY, startX, startY, endX, endY } = screenConfig.value

  // 矩形的边界
  const minX = Math.min(startX, endX) / scaleX
  const minY = Math.min(startY, endY) / scaleY
  const maxX = Math.max(startX, endX) / scaleX
  const maxY = Math.max(startY, endY) / scaleY

  // 按钮组尺寸
  const buttonGroupHeight = buttonGroupStyle.value.height
  const buttonGroupWidth = buttonGroupStyle.value.width

  // 可用屏幕尺寸
  const availableHeight = screen.availHeight
  const availableWidth = screen.availWidth

  // 根据矩形的位置计算按钮组的垂直位置
  let topPosition = maxY + 10 + buttonGroupHeight > availableHeight ? minY - 10 - buttonGroupHeight : maxY + 10

  // 根据矩形的位置计算按钮组的水平位置
  const leftPosition = maxX + buttonGroupWidth > availableWidth ? maxX - buttonGroupWidth : minX

  // 判断矩形高度选取是否超过 屏幕高度，则放置在框选矩形内
  if (Math.abs(maxY - minY) + buttonGroupHeight + 10 > screen.height) {
    topPosition = screen.height - buttonGroupHeight - 10
  }

  buttonGroup.value.style.top = `${topPosition}px`
  buttonGroup.value.style.left = `${leftPosition}px`
}

/**
 * 绘制矩形
 */
const drawRectangle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number = 2
) => {
  context.strokeStyle = 'green'
  context.lineWidth = lineWidth
  context.strokeRect(x, y, width, height)

  drawSizeText(context, x, y, width, height)
}

/**
 * 绘制矩形尺寸文本
 */
const drawSizeText = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  if (context) {
    // 对宽度和高度进行取整
    const roundedWidth = Math.round(Math.abs(width))
    const roundedHeight = Math.round(Math.abs(height))
    const sizeText = `${roundedWidth} x ${roundedHeight}`

    // 确保文本始终显示在矩形的左上角
    const textX = width >= 0 ? x : x + width
    const textY = height >= 0 ? y : y + height

    // 设置字体和样式
    context.font = '14px Arial'
    context.fillStyle = 'white'
    // 设置图像插值质量
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.fillText(sizeText, textX + 5, textY - 10) // 在矩形左上角并稍微偏移的位置绘制文本
  }
}

/**
 * 绘制蒙版
 */
const drawMask = () => {
  if (maskCtx.value && maskCanvas.value) {
    maskCtx.value.fillStyle = 'rgba(0, 0, 0, 0.4)'
    maskCtx.value.fillRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)
  }
}

/**
 * 初始化放大镜
 */
const initMagnifier = () => {
  if (magnifierCanvas.value) {
    magnifierCanvas.value.width = magnifierSize
    magnifierCanvas.value.height = magnifierSize
    magnifierCtx.value = magnifierCanvas.value.getContext('2d', { willReadFrequently: true })
  }
}

/**
 * 放大镜事件
 */
const handleMagnifierMouseMove = (event: MouseEvent) => {
  const offsetEvent = event as any
  const { offsetX, offsetY } = offsetEvent

  // 可用屏幕尺寸
  const winHeight = window.innerHeight
  const winWidth = window.innerWidth

  // 计算放大镜的位置，使其跟随鼠标移动
  let magnifierLeft = offsetX + 20
  let magnifierTop = offsetY + 20

  // 防止放大镜超出屏幕边界
  if (magnifierLeft + magnifierSize > winWidth) {
    magnifierLeft = winWidth - magnifierSize
  }

  if (magnifierTop + magnifierSize > winHeight) {
    magnifierTop = winHeight - magnifierSize
  }

  if (magnifier.value) {
    magnifier.value.style.left = `${magnifierLeft}px`
    magnifier.value.style.top = `${magnifierTop}px`
    magnifier.value.style.display = 'block'
  }

  // 在放大镜中绘制放大内容
  drawMagnifiedContent(offsetX, offsetY)
}

/**
 * 绘制放大镜内容
 */
const drawMagnifiedContent = (mouseX: number, mouseY: number) => {
  if (!imgCanvas.value || !magnifierCtx.value) return

  const canvasWidth = imgCanvas.value.width
  const canvasHeight = imgCanvas.value.height

  // 计算放大镜区域的左上角坐标，确保放大区域以鼠标为中心
  const magnifierX = Math.max(0, mouseX * window.devicePixelRatio - magnifierSize / (2 * zoomFactor))
  const magnifierY = Math.max(0, mouseY * window.devicePixelRatio - magnifierSize / (2 * zoomFactor))

  // 调整放大镜的位置，避免超出画布边界
  const adjustedX = Math.min(magnifierX, canvasWidth - magnifierSize / zoomFactor)
  const adjustedY = Math.min(magnifierY, canvasHeight - magnifierSize / zoomFactor)

  magnifierCtx.value.clearRect(0, 0, magnifierSize, magnifierSize)

  // 绘制放大区域，以鼠标位置为中心
  magnifierCtx.value.drawImage(
    imgCanvas.value!,
    adjustedX,
    adjustedY,
    magnifierSize / zoomFactor,
    magnifierSize / zoomFactor,
    0,
    0,
    magnifierSize,
    magnifierSize
  )
}

const confirmSelection = async () => {
  // 立即隐藏放大镜，防止被截取到
  if (magnifier.value) {
    magnifier.value.style.display = 'none'
  }

  // 检查图像是否已加载
  if (!isImageLoaded) {
    console.error('图像尚未加载完成，请稍后再试')
    await resetScreenshot()
    return
  }

  const { startX, startY, endX, endY } = screenConfig.value

  // 计算选区的宽高
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  // 计算选区的左上角位置
  const rectX = Math.min(startX, endX)
  const rectY = Math.min(startY, endY)

  // 创建一个临时 canvas 来合成最终图像
  const mergedCanvas = document.createElement('canvas')
  const mergedCtx = mergedCanvas.getContext('2d')

  // 设置合成canvas的尺寸与imgCanvas相同
  mergedCanvas.width = imgCanvas.value!.width
  mergedCanvas.height = imgCanvas.value!.height

  if (mergedCtx) {
    try {
      // 先绘制原始截图（从imgCanvas）
      mergedCtx.drawImage(imgCanvas.value!, 0, 0)

      // 然后绘制用户的绘图内容（从drawCanvas），使用source-over模式确保正确合成
      mergedCtx.globalCompositeOperation = 'source-over'
      mergedCtx.drawImage(drawCanvas.value!, 0, 0)

      // 创建最终的裁剪canvas
      const offscreenCanvas = document.createElement('canvas')
      const offscreenCtx = offscreenCanvas.getContext('2d')

      // 设置临时 canvas 的尺寸
      offscreenCanvas.width = width
      offscreenCanvas.height = height

      if (offscreenCtx) {
        // 从合成后的canvas裁剪选区
        offscreenCtx.drawImage(
          mergedCanvas,
          rectX,
          rectY,
          width,
          height, // 裁剪区域
          0,
          0,
          width,
          height // 绘制到临时 canvas 的区域
        )

        // 测试：检查canvas数据是否有效
        try {
          offscreenCtx.getImageData(0, 0, Math.min(10, width), Math.min(10, height))
        } catch (error) {
          console.error('获取ImageData失败,可能是安全限制:', error)
        }

        // 将裁剪后的图像转换为 Blob 并复制到剪贴板
        offscreenCanvas.toBlob(async (blob) => {
          if (blob && blob.size > 0) {
            try {
              const arrayBuffer = await blob.arrayBuffer()
              const buffer = new Uint8Array(arrayBuffer)

              await writeImage(buffer)
              await resetScreenshot()
            } catch (error) {
              await resetScreenshot()
            }
          } else {
            await resetScreenshot()
          }
        }, 'image/png')
      }
    } catch (error) {
      console.error('Canvas操作失败:', error)
      await resetScreenshot()
    }
  }
}

const resetScreenshot = async () => {
  try {
    // 重置所有状态
    showButtonGroup.value = false
    isImageLoaded = false
    screenConfig.value = {
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      scaleX: 0,
      scaleY: 0,
      isDrawing: false,
      width: 0,
      height: 0
    }

    // 清除所有canvas内容
    if (imgCtx.value && imgCanvas.value) {
      imgCtx.value.clearRect(0, 0, imgCanvas.value.width, imgCanvas.value.height)
    }
    if (maskCtx.value && maskCanvas.value) {
      maskCtx.value.clearRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)
    }
    if (drawCtx.value && drawCanvas.value) {
      drawCtx.value.clearRect(0, 0, drawCanvas.value.width, drawCanvas.value.height)
    }

    // 隐藏放大镜
    if (magnifier.value) {
      magnifier.value.style.display = 'none'
    }

    // 隐藏截图窗口而不是关闭
    await appWindow.hide()
  } catch (error) {
    // 即使出错也要尝试隐藏窗口
    await appWindow.hide()
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    resetScreenshot()
  }
}

const handleRightClick = (event: MouseEvent) => {
  // 阻止默认右键菜单
  event.preventDefault()
  resetScreenshot()
}

const cancelSelection = () => {
  resetScreenshot()
}

// 截图处理函数
const handleScreenshot = () => {
  appWindow.show()
  initCanvas()
  initMagnifier()
}

onMounted(async () => {
  addListener(
    appWindow.listen('capture', () => {
      initCanvas()
      initMagnifier()
    }),
    'capture'
  )

  // 监听窗口隐藏时的重置事件
  addListener(
    appWindow.listen('capture-reset', () => {
      resetScreenshot()
      console.log('📷 Screenshot组件已重置')
    }),
    'capture-reset'
  )

  // 监听自定义截图事件
  window.addEventListener('trigger-screenshot', handleScreenshot)
})

onUnmounted(async () => {
  // 清理键盘监听事件
  document.removeEventListener('keydown', handleKeyDown)

  // 清理右键监听事件
  if (maskCanvas.value) {
    maskCanvas.value.removeEventListener('contextmenu', handleRightClick)
  }

  // 清理自定义事件监听
  window.removeEventListener('trigger-screenshot', handleScreenshot)
})
</script>

<style scoped lang="scss">
.canvasbox {
  width: 100vw;
  height: 100vh;
  position: relative;
  background-color: transparent;
}

canvas {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.magnifier {
  position: absolute;
  pointer-events: none;
  width: 150px;
  height: 150px;
  border: 2px solid #ccc;
  border-radius: 50%;
  overflow: hidden;
  display: none;
}

.img-canvas {
  z-index: 0;
}

.mask-canvas {
  z-index: 1;
}

.draw-canvas {
  z-index: 1;
  pointer-events: none;
  /* 确保事件穿透到下面的 canvas */
}

.magnifier canvas {
  display: block;
  z-index: 2;
}

.button-group {
  position: absolute;
  display: flex;
  gap: 10px;
  //transform: translate(-50%, 0);
  background: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 5px;
  z-index: 3;

  button {
    padding: 5px 10px;
    cursor: pointer;
  }
}
</style>
