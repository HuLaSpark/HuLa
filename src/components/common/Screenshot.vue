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

<script setup>
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { writeImage } from '@tauri-apps/plugin-clipboard-manager'
import { useCanvasTool } from '@/hooks/useCanvasTool'

const canvasbox = ref(null)

// 图像层
const imgCanvas = ref(null)
const imgCtx = ref(null)

// 蒙版层
const maskCanvas = ref(null)
const maskCtx = ref(null)

// 绘图层
const drawCanvas = ref(null)
const drawCtx = ref(null)
let drawTools

// 放大镜
const magnifier = ref(null)
const magnifierCanvas = ref(null)
const magnifierCtx = ref(null)
const magnifierSize = 150 // 放大镜的尺寸
const zoomFactor = 3 // 放大的倍数

// 按钮组
const buttonGroup = ref(null)
const showButtonGroup = ref(false) // 控制按钮组显示

const buttonGroupStyle = ref({
  width: 300,
  height: 40
})

// 截屏信息
const screenConfig = ref({
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
let screenshotImage

onMounted(async () => {
  await listen('capture', () => {
    initCanvas()
    initMagnifier()
  })
})

/**
 * 绘制图形
 * @param {string} type - 图形类型
 */
function drawImgCanvas(type) {
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
async function initCanvas() {
  const canvasWidth = screen.width * window.devicePixelRatio
  const canvasHeight = screen.height * window.devicePixelRatio

  const config = {
    x: '0',
    y: '0',
    width: `${canvasWidth}`,
    height: `${canvasHeight}`
  }

  const screenshotData = await invoke('screenshot', config)

  if (imgCanvas.value && maskCanvas.value) {
    imgCanvas.value.width = canvasWidth
    imgCanvas.value.height = canvasHeight
    maskCanvas.value.width = canvasWidth
    maskCanvas.value.height = canvasHeight
    drawCanvas.value.width = canvasWidth
    drawCanvas.value.height = canvasHeight

    imgCtx.value = imgCanvas.value.getContext('2d')
    maskCtx.value = maskCanvas.value.getContext('2d')
    drawCtx.value = drawCanvas.value.getContext('2d', { willReadFrequently: true })

    // 获取屏幕缩放比例
    const { clientWidth: containerWidth, clientHeight: containerHeight } = imgCanvas.value
    screenConfig.value.scaleX = canvasWidth / containerWidth
    screenConfig.value.scaleY = canvasHeight / containerHeight

    screenshotImage = new Image()
    screenshotImage.src = `data:image/png;base64,${screenshotData}`

    screenshotImage.onload = () => {
      if (imgCtx.value) {
        imgCtx.value.drawImage(screenshotImage, 0, 0, canvasWidth, canvasHeight)
        // 绘制全屏绿色边框
        drawRectangle(maskCtx.value, screenConfig.value.startX, screenConfig.value.startY, canvasWidth, canvasHeight, 4)

        drawTools = useCanvasTool(drawCanvas, drawCtx, imgCtx, screenConfig)
      }
    }
  }

  // 添加鼠标监听事件
  maskCanvas.value.addEventListener('mousedown', handleMaskMouseDown)
  maskCanvas.value.addEventListener('mousemove', handleMaskMouseMove)
  maskCanvas.value.addEventListener('mouseup', handleMaskMouseUp)
}

function handleMaskMouseDown(event) {
  // 如果已经显示按钮组，则不执行任何操作
  if (showButtonGroup.value) return
  screenConfig.value.startX = event.offsetX * screenConfig.value.scaleX
  screenConfig.value.startY = event.offsetY * screenConfig.value.scaleY
  screenConfig.value.isDrawing = true
  if (!screenConfig.value.isDrawing) {
    drawMask()
  } // 先绘制遮罩层
}

function handleMaskMouseMove(event) {
  handleMagnifierMouseMove(event)
  if (!screenConfig.value.isDrawing || !maskCtx.value) return

  const mouseX = event.offsetX * screenConfig.value.scaleX
  const mouseY = event.offsetY * screenConfig.value.scaleY
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

function handleMaskMouseUp(event) {
  if (!screenConfig.value.isDrawing) return
  screenConfig.value.isDrawing = false
  // 记录矩形区域的结束坐标
  screenConfig.value.endX = event.offsetX * screenConfig.value.scaleX
  screenConfig.value.endY = event.offsetY * screenConfig.value.scaleY

  // 记录矩形区域的宽高
  screenConfig.value.width = Math.abs(screenConfig.value.endX - screenConfig.value.startX)
  screenConfig.value.height = Math.abs(screenConfig.value.endY - screenConfig.value.startY)
  // 判断矩形区域是否有效
  if (screenConfig.value.width > 5 && screenConfig.value.height > 5) {
    // 根据矩形位置计算按钮组位置
    updateButtonGroupPosition()
    showButtonGroup.value = true // 显示按钮组
  }
}

// 计算矩形区域工具栏位置
function updateButtonGroupPosition() {
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
  let leftPosition = maxX + buttonGroupWidth > availableWidth ? maxX - buttonGroupWidth : minX

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
function drawRectangle(context, x, y, width, height, lineWidth = 2) {
  context.strokeStyle = 'green'
  context.lineWidth = lineWidth
  context.strokeRect(x, y, width, height)

  drawSizeText(context, x, y, width, height)
}

/**
 * 绘制矩形尺寸文本
 */
function drawSizeText(context, x, y, width, height) {
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
function drawMask() {
  if (maskCtx.value) {
    maskCtx.value.fillStyle = 'rgba(0, 0, 0, 0.4)'
    maskCtx.value.fillRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)
  }
}

/**
 * 初始化放大镜
 */
function initMagnifier() {
  if (magnifierCanvas.value) {
    magnifierCanvas.value.width = magnifierSize
    magnifierCanvas.value.height = magnifierSize
    magnifierCtx.value = magnifierCanvas.value.getContext('2d', { willReadFrequently: true })
  }
}

/**
 * 放大镜事件
 */
function handleMagnifierMouseMove(event) {
  const { offsetX, offsetY } = event

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

  magnifier.value.style.left = `${magnifierLeft}px`
  magnifier.value.style.top = `${magnifierTop}px`
  magnifier.value.style.display = 'block'

  // 在放大镜中绘制放大内容
  drawMagnifiedContent(offsetX, offsetY)
}

/**
 * 绘制放大镜内容
 */
function drawMagnifiedContent(mouseX, mouseY) {
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
    imgCanvas.value,
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

function confirmSelection() {
  const { startX, startY, endX, endY } = screenConfig.value

  // 计算选区的宽高
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  // 计算选区的左上角位置
  const rectX = Math.min(startX, endX)
  const rectY = Math.min(startY, endY)

  const devicePixelRatio = window.devicePixelRatio || 1

  imgCtx.value.scale(devicePixelRatio, devicePixelRatio)

  // 将 drawCanvas 的内容绘制到 imgCanvas 上
  imgCtx.value.drawImage(drawCanvas.value, 0, 0)

  // 创建一个临时 canvas 来存储裁剪后的图像
  const offscreenCanvas = document.createElement('canvas')
  const offscreenCtx = offscreenCanvas.getContext('2d')

  // 设置临时 canvas 的尺寸
  offscreenCanvas.width = width
  offscreenCanvas.height = height

  if (offscreenCtx) {
    // 裁剪 imgCanvas 上的选区并绘制到临时 canvas 上
    offscreenCtx.drawImage(
      imgCanvas.value,
      rectX,
      rectY,
      width,
      height, // 裁剪区域
      0,
      0,
      width,
      height // 绘制到临时 canvas 的区域
    )

    // 将裁剪后的图像转换为 Blob 并复制到剪贴板
    offscreenCanvas.toBlob(async (blob) => {
      if (blob) {
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        writeImage(buffer).then(() => {
          cancelSelection()
        })
      }
    }, 'image/png')
  }

  showButtonGroup.value = false // 隐藏按钮组
}

function cancelSelection() {
  console.log('取消选区')
  // 在此处理取消按钮的逻辑
  showButtonGroup.value = false // 隐藏按钮组
}
</script>

<style lang="scss" scoped>
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
