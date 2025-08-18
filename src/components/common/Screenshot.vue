<template>
  <div ref="canvasbox" class="canvasbox">
    <canvas ref="drawCanvas" class="draw-canvas"></canvas>
    <canvas ref="maskCanvas" class="mask-canvas"></canvas>
    <canvas ref="imgCanvas" class="img-canvas"></canvas>
    <div ref="magnifier" class="magnifier">
      <canvas ref="magnifierCanvas"></canvas>
    </div>
    <!-- 选区拖动区域 -->
    <div ref="selectionArea" class="selection-area" v-show="showButtonGroup" :style="selectionAreaStyle">
      <!-- 内部拖动区域 -->
      <div
        :class="['drag-area', currentDrawTool ? 'cannot-drag' : 'can-drag']"
        @mousedown="handleSelectionDragStart"
        @mousemove="handleSelectionDragMove"
        @mouseup="handleSelectionDragEnd"
        @dblclick="confirmSelection"></div>

      <!-- resize控制点 - 四个角 -->
      <div
        :class="['resize-handle', 'resize-nw', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'nw')"></div>
      <div
        :class="['resize-handle', 'resize-ne', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'ne')"></div>
      <div
        :class="['resize-handle', 'resize-sw', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'sw')"></div>
      <div
        :class="['resize-handle', 'resize-se', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'se')"></div>

      <!-- resize控制点 - 四条边的中间 -->
      <div
        :class="['resize-handle', 'resize-n', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'n')"></div>
      <div
        :class="['resize-handle', 'resize-e', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'e')"></div>
      <div
        :class="['resize-handle', 'resize-s', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 's')"></div>
      <div
        :class="['resize-handle', 'resize-w', { disabled: currentDrawTool }]"
        @mousedown.stop="handleResizeStart($event, 'w')"></div>

      <!-- 圆角控制器 -->
      <div class="border-radius-controller" :style="borderRadiusControllerStyle" @click.stop>
        <label>圆角:</label>
        <input type="range" :value="borderRadius" @input="handleBorderRadiusChange" min="0" max="50" step="1" />
        <span>{{ borderRadius }}px</span>
      </div>
    </div>

    <div ref="buttonGroup" class="button-group" v-show="showButtonGroup && !isDragging" :style="buttonGroupStyle">
      <button :class="{ active: currentDrawTool === 'rect' }" @click="drawImgCanvas('rect')">矩形</button>
      <button :class="{ active: currentDrawTool === 'circle' }" @click="drawImgCanvas('circle')">圆形</button>
      <button :class="{ active: currentDrawTool === 'arrow' }" @click="drawImgCanvas('arrow')">箭头</button>
      <button :class="{ active: currentDrawTool === 'mosaic' }" @click="drawImgCanvas('mosaic')">马赛克</button>
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
const magnifierWidth: number = 200 // 放大镜的宽度
const magnifierHeight: number = 120 // 放大镜的高度
const zoomFactor: number = 3 // 放大的倍数

// 按钮组
const buttonGroup: Ref<HTMLDivElement | null> = ref(null)
const showButtonGroup: Ref<boolean> = ref(false) // 控制按钮组显示

const buttonGroupStyle: Ref<ButtonGroupStyle> = ref({
  width: 300,
  height: 40
})

// 选区拖动区域
const selectionArea: Ref<HTMLDivElement | null> = ref(null)
const selectionAreaStyle: Ref<any> = ref({})
const isDragging: Ref<boolean> = ref(false)
const dragOffset: Ref<{ x: number; y: number }> = ref({ x: 0, y: 0 })

// 圆角控制器样式
const borderRadiusControllerStyle: Ref<any> = ref({})

// resize相关
const isResizing: Ref<boolean> = ref(false)
const resizeDirection: Ref<string> = ref('')
const resizeStartPosition: Ref<{ x: number; y: number; width: number; height: number; left: number; top: number }> =
  ref({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    left: 0,
    top: 0
  })

// 圆角控制
const borderRadius: Ref<number> = ref(0)

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

// 当前选择的绘图工具
const currentDrawTool: Ref<string | null> = ref(null)

/**
 * 绘制图形
 * @param {string} type - 图形类型
 */
const drawImgCanvas = (type: string) => {
  if (!drawTools) {
    console.warn('🚫 绘图工具未初始化')
    return
  }

  const drawableTypes = ['rect', 'circle', 'arrow', 'mosaic']

  if (drawableTypes.includes(type)) {
    // 如果点击的是当前已激活的工具，保持选中，不进行任何操作（不可取消，只能切换其他选项）
    if (currentDrawTool.value === type) {
      return
    }

    // 先停止之前的工具
    if (currentDrawTool.value) {
      drawTools.stopDrawing && drawTools.stopDrawing()
    }

    // 激活新的绘图工具
    currentDrawTool.value = type

    // 启用绘图Canvas事件接收
    if (drawCanvas.value) {
      drawCanvas.value.style.pointerEvents = 'auto'
    }

    // 绘制马赛克时设置笔宽
    if (type === 'mosaic') {
      drawTools.drawMosaicBrushSize && drawTools.drawMosaicBrushSize(20)
    }

    // 调用绘图方法，确保绘图工具被正确激活
    try {
      drawTools.draw(type)
      console.log(`🎨 绘图工具已激活: ${type}`)
    } catch (error) {
      console.error(`🚫 绘图工具激活失败: ${type}`, error)
      currentDrawTool.value = null
      // 激活失败时也要禁用事件
      if (drawCanvas.value) {
        drawCanvas.value.style.pointerEvents = 'none'
      }
    }
  } else if (type === 'redo') {
    drawTools.redo && drawTools.redo()
    console.log('🔄 执行重做')
  } else if (type === 'undo') {
    drawTools.undo && drawTools.undo()
    console.log('↩️ 执行撤销')
  }
}

// 重置绘图工具状态
const resetDrawTools = () => {
  currentDrawTool.value = null
  if (drawTools) {
    // 停止当前绘图操作
    drawTools.stopDrawing && drawTools.stopDrawing()
    // 重置绘图工具到默认状态
    drawTools.resetState && drawTools.resetState()
    // 清除绘图工具的事件监听
    drawTools.clearEvents && drawTools.clearEvents()
  }

  // 清除绘图canvas的内容
  if (drawCtx.value && drawCanvas.value) {
    drawCtx.value.clearRect(0, 0, drawCanvas.value.width, drawCanvas.value.height)
    console.log('🧹 绘图内容已清除')
  }

  // 重置时禁用绘图canvas事件，让事件穿透到选区
  if (drawCanvas.value) {
    drawCanvas.value.style.pointerEvents = 'none'
    drawCanvas.value.style.zIndex = '5'
  }

  console.log('🔄 绘图工具已重置')
}

/**
 * 初始化canvas
 */
const initCanvas = async () => {
  // 重置绘图工具状态
  resetDrawTools()

  // 重置图像加载状态
  isImageLoaded = false

  // 重置其他状态
  borderRadius.value = 0
  isDragging.value = false
  isResizing.value = false

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

    // 清除绘图canvas的内容
    if (drawCtx.value) {
      drawCtx.value.clearRect(0, 0, canvasWidth, canvasHeight)
      console.log('🧹 绘图canvas已清除')
    }

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
            // 初始化时禁用绘图canvas事件，让事件穿透到选区
            drawCanvas.value.style.pointerEvents = 'none'
            drawCanvas.value.style.zIndex = '5'
            console.log('🎨 绘图工具初始化完成 (备用方式)')
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
          // 初始化时禁用绘图canvas事件，让事件穿透到选区
          drawCanvas.value.style.pointerEvents = 'none'
          drawCanvas.value.style.zIndex = '5'
          console.log('🎨 绘图工具初始化完成')
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

  // 添加全局右键监听事件
  document.addEventListener('contextmenu', handleRightClick)

  // 添加全局点击监听，用于取消绘图工具
  document.addEventListener('mousedown', handleGlobalMouseDown)
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

  // 选区尺寸
  const selectionWidth = maxX - minX
  // const selectionHeight = maxY - minY

  // 按钮组尺寸
  const buttonGroupHeight = buttonGroupStyle.value.height
  const buttonGroupWidth = buttonGroupStyle.value.width

  // 可用屏幕尺寸
  const availableHeight = window.innerHeight
  const availableWidth = window.innerWidth

  let leftPosition: number
  let topPosition: number

  // 首先检查选区下方是否有足够空间放置buttonGroup
  const spaceBelow = availableHeight - maxY
  const canFitBelow = spaceBelow >= buttonGroupHeight + 10 // 留10px缓冲

  if (canFitBelow) {
    // 优先放在选区下方
    topPosition = maxY + 5

    // 计算水平位置：优先右对齐，但确保在选区范围内且不超出屏幕
    leftPosition = maxX - buttonGroupWidth

    // 确保不超出选区左边界
    if (leftPosition < minX) {
      leftPosition = minX
    }

    // 限制buttonGroup宽度不超过选区宽度
    if (buttonGroupWidth > selectionWidth) {
      // 如果按钮组宽度超过选区宽度，以选区左边界为准
      leftPosition = minX
      // 可以考虑动态调整按钮组宽度或分行显示，这里先简单处理
    }

    // 确保不超出屏幕右边界
    if (leftPosition + buttonGroupWidth > availableWidth) {
      leftPosition = availableWidth - buttonGroupWidth - 10
    }

    // 确保不超出屏幕左边界
    leftPosition = Math.max(10, leftPosition)
  } else {
    // 选区下方空间不足，放在选区右上角
    topPosition = minY - 5 // 稍微向上偏移

    // 水平位置：尽量靠右，但不超出选区右边界
    leftPosition = maxX - buttonGroupWidth

    // 确保不超出选区左边界
    if (leftPosition < minX) {
      leftPosition = minX
    }

    // 限制buttonGroup宽度不超过选区宽度
    if (buttonGroupWidth > selectionWidth) {
      leftPosition = minX
    }

    // 确保不超出屏幕边界
    if (leftPosition + buttonGroupWidth > availableWidth) {
      leftPosition = availableWidth - buttonGroupWidth - 10
    }

    if (topPosition < 0) {
      topPosition = 10 // 确保不超出屏幕上边界
    }

    // 确保不超出屏幕左边界
    leftPosition = Math.max(10, leftPosition)
  }

  buttonGroup.value.style.top = `${topPosition}px`
  buttonGroup.value.style.left = `${leftPosition}px`

  console.log(`🎯 ButtonGroup positioned at: left=${leftPosition}px, top=${topPosition}px, canFitBelow=${canFitBelow}`)

  // 更新选区拖动区域位置
  updateSelectionAreaPosition()
}

// 更新选区拖动区域位置
const updateSelectionAreaPosition = () => {
  if (!selectionArea.value) return

  const { scaleX, scaleY, startX, startY, endX, endY } = screenConfig.value

  // 矩形的边界
  const minX = Math.min(startX, endX) / scaleX
  const minY = Math.min(startY, endY) / scaleY
  const maxX = Math.max(startX, endX) / scaleX
  const maxY = Math.max(startY, endY) / scaleY

  selectionAreaStyle.value = {
    left: `${minX}px`,
    top: `${minY}px`,
    width: `${maxX - minX}px`,
    height: `${maxY - minY}px`,
    borderRadius: `${borderRadius.value}px`,
    border: '2px solid #13987f'
  }

  // 更新圆角控制器位置，确保不超出屏幕边界
  updateBorderRadiusControllerPosition(minX, minY)
}

// 更新圆角控制器位置
const updateBorderRadiusControllerPosition = (selectionLeft: number, selectionTop: number) => {
  const controllerHeight = 35 // 控制器高度
  const controllerWidth = 120 // 控制器宽度（估算）

  let left = selectionLeft
  let top = selectionTop - controllerHeight

  // 确保控制器不超出屏幕左边界
  if (left < 0) {
    left = 0
  }

  // 确保控制器不超出屏幕右边界
  if (left + controllerWidth > window.innerWidth) {
    left = window.innerWidth - controllerWidth - 10
  }

  // 确保控制器不超出屏幕上边界
  if (top < 0) {
    top = selectionTop + 10 // 如果超出上边界，显示在选区内部
  }

  borderRadiusControllerStyle.value = {
    left: `${left - selectionLeft}px`, // 相对于选区的位置
    top: `${top - selectionTop}px`
  }
}

// 选区拖动开始
const handleSelectionDragStart = (event: MouseEvent) => {
  // 如果有绘图工具处于激活状态，禁止拖动
  if (currentDrawTool.value) {
    event.preventDefault()
    event.stopPropagation()
    return // 直接返回，不执行拖动
  }

  // 确保拖动功能不受绘图工具状态影响
  event.preventDefault()
  event.stopPropagation()

  isDragging.value = true
  dragOffset.value = {
    x: event.clientX - parseFloat(selectionAreaStyle.value.left),
    y: event.clientY - parseFloat(selectionAreaStyle.value.top)
  }

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleSelectionDragMove)
  document.addEventListener('mouseup', handleSelectionDragEnd)

  console.log('🎯 开始拖动，隐藏按钮组')
}

// 选区拖动移动
const handleSelectionDragMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  event.preventDefault()

  const newLeft = event.clientX - dragOffset.value.x
  const newTop = event.clientY - dragOffset.value.y

  // 确保选区不超出屏幕边界
  const selectionWidth = parseFloat(selectionAreaStyle.value.width)
  const selectionHeight = parseFloat(selectionAreaStyle.value.height)
  const maxLeft = window.innerWidth - selectionWidth
  const maxTop = window.innerHeight - selectionHeight

  const constrainedLeft = Math.max(0, Math.min(newLeft, maxLeft))
  const constrainedTop = Math.max(0, Math.min(newTop, maxTop))

  selectionAreaStyle.value.left = `${constrainedLeft}px`
  selectionAreaStyle.value.top = `${constrainedTop}px`
  selectionAreaStyle.value.borderRadius = `${borderRadius.value}px`
  selectionAreaStyle.value.border = '2px solid #13987f'

  // 更新screenConfig
  const { scaleX, scaleY } = screenConfig.value
  screenConfig.value.startX = constrainedLeft * scaleX
  screenConfig.value.startY = constrainedTop * scaleY
  screenConfig.value.endX = (constrainedLeft + selectionWidth) * scaleX
  screenConfig.value.endY = (constrainedTop + selectionHeight) * scaleY

  // 重新绘制矩形和更新按钮组位置
  redrawSelection()
  updateButtonGroupPosition()
}

// 选区拖动结束
const handleSelectionDragEnd = () => {
  isDragging.value = false

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleSelectionDragMove)
  document.removeEventListener('mouseup', handleSelectionDragEnd)

  console.log('🎯 拖动结束，显示按钮组')
}

// 重新绘制选区
const redrawSelection = () => {
  if (!maskCtx.value || !maskCanvas.value) return

  const { startX, startY, endX, endY } = screenConfig.value
  const width = endX - startX
  const height = endY - startY

  // 清除之前的矩形区域
  maskCtx.value.clearRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)

  // 重新绘制整个遮罩层
  drawMask()

  // 清除矩形区域内的遮罩，实现透明效果
  maskCtx.value.clearRect(startX, startY, width, height)

  // 绘制矩形边框
  drawRectangle(maskCtx.value, startX, startY, width, height)
}

// resize开始
const handleResizeStart = (event: MouseEvent, direction: string) => {
  // 如果有绘图工具处于激活状态，禁止resize
  if (currentDrawTool.value) {
    event.preventDefault()
    event.stopPropagation()
    return // 直接返回，不执行resize
  }

  event.preventDefault()
  event.stopPropagation()

  isResizing.value = true
  resizeDirection.value = direction

  resizeStartPosition.value = {
    x: event.clientX,
    y: event.clientY,
    width: parseFloat(selectionAreaStyle.value.width),
    height: parseFloat(selectionAreaStyle.value.height),
    left: parseFloat(selectionAreaStyle.value.left),
    top: parseFloat(selectionAreaStyle.value.top)
  }

  // 添加全局鼠标事件监听
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
}

// resize移动
const handleResizeMove = (event: MouseEvent) => {
  if (!isResizing.value) return

  event.preventDefault()

  const deltaX = event.clientX - resizeStartPosition.value.x
  const deltaY = event.clientY - resizeStartPosition.value.y

  let newLeft = resizeStartPosition.value.left
  let newTop = resizeStartPosition.value.top
  let newWidth = resizeStartPosition.value.width
  let newHeight = resizeStartPosition.value.height

  // 根据resize方向调整位置和尺寸
  switch (resizeDirection.value) {
    case 'nw': // 左上角
      newLeft += deltaX
      newTop += deltaY
      newWidth -= deltaX
      newHeight -= deltaY
      break
    case 'ne': // 右上角
      newTop += deltaY
      newWidth += deltaX
      newHeight -= deltaY
      break
    case 'sw': // 左下角
      newLeft += deltaX
      newWidth -= deltaX
      newHeight += deltaY
      break
    case 'se': // 右下角
      newWidth += deltaX
      newHeight += deltaY
      break
    case 'n': // 上边
      newTop += deltaY
      newHeight -= deltaY
      break
    case 'e': // 右边
      newWidth += deltaX
      break
    case 's': // 下边
      newHeight += deltaY
      break
    case 'w': // 左边
      newLeft += deltaX
      newWidth -= deltaX
      break
  }

  // 确保最小尺寸
  const minSize = 20
  if (newWidth < minSize) {
    if (resizeDirection.value.includes('w')) {
      newLeft = resizeStartPosition.value.left + resizeStartPosition.value.width - minSize
    }
    newWidth = minSize
  }
  if (newHeight < minSize) {
    if (resizeDirection.value.includes('n')) {
      newTop = resizeStartPosition.value.top + resizeStartPosition.value.height - minSize
    }
    newHeight = minSize
  }

  // 确保不超出屏幕边界
  newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - newWidth))
  newTop = Math.max(0, Math.min(newTop, window.innerHeight - newHeight))

  // 更新样式
  selectionAreaStyle.value = {
    left: `${newLeft}px`,
    top: `${newTop}px`,
    width: `${newWidth}px`,
    height: `${newHeight}px`,
    borderRadius: `${borderRadius.value}px`,
    border: '2px solid #13987f'
  }

  // 更新screenConfig
  const { scaleX, scaleY } = screenConfig.value
  screenConfig.value.startX = newLeft * scaleX
  screenConfig.value.startY = newTop * scaleY
  screenConfig.value.endX = (newLeft + newWidth) * scaleX
  screenConfig.value.endY = (newTop + newHeight) * scaleY

  // 重新绘制选区和更新按钮组位置
  redrawSelection()
  updateButtonGroupPosition()
}

// resize结束
const handleResizeEnd = () => {
  isResizing.value = false
  resizeDirection.value = ''

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
}

// 圆角变化处理
const handleBorderRadiusChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  borderRadius.value = parseInt(target.value, 10)

  // 更新选区样式，包括边框显示
  updateSelectionAreaPosition()
}

/**
 * 绘制矩形（支持圆角）
 */
const drawRectangle = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  lineWidth: number = 2
) => {
  context.strokeStyle = '#13987f'
  context.lineWidth = lineWidth

  // 如果有圆角，绘制圆角矩形
  if (borderRadius.value > 0) {
    const radius = borderRadius.value * screenConfig.value.scaleX // 根据缩放调整圆角大小
    const adjustedRadius = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2)

    context.beginPath()

    // 确保坐标正确（处理负宽高的情况）
    const rectX = width >= 0 ? x : x + width
    const rectY = height >= 0 ? y : y + height
    const rectWidth = Math.abs(width)
    const rectHeight = Math.abs(height)

    // 绘制圆角矩形路径
    context.moveTo(rectX + adjustedRadius, rectY)
    context.lineTo(rectX + rectWidth - adjustedRadius, rectY)
    context.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + adjustedRadius)
    context.lineTo(rectX + rectWidth, rectY + rectHeight - adjustedRadius)
    context.quadraticCurveTo(
      rectX + rectWidth,
      rectY + rectHeight,
      rectX + rectWidth - adjustedRadius,
      rectY + rectHeight
    )
    context.lineTo(rectX + adjustedRadius, rectY + rectHeight)
    context.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - adjustedRadius)
    context.lineTo(rectX, rectY + adjustedRadius)
    context.quadraticCurveTo(rectX, rectY, rectX + adjustedRadius, rectY)
    context.closePath()

    context.stroke()
  } else {
    // 普通矩形
    context.strokeRect(x, y, width, height)
  }

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
    magnifierCanvas.value.width = magnifierWidth
    magnifierCanvas.value.height = magnifierHeight
    magnifierCtx.value = magnifierCanvas.value.getContext('2d', { willReadFrequently: true })
  }
}

/**
 * 放大镜事件
 */
const handleMagnifierMouseMove = (event: MouseEvent) => {
  // 如果已经显示按钮组（选区完成），则隐藏放大镜
  if (showButtonGroup.value) {
    if (magnifier.value) {
      magnifier.value.style.display = 'none'
    }
    return
  }

  const offsetEvent = event as any
  const { offsetX, offsetY } = offsetEvent

  // 可用屏幕尺寸
  const winHeight = window.innerHeight
  const winWidth = window.innerWidth

  // 计算放大镜的位置，位于鼠标右下角
  let magnifierLeft = offsetX + 15
  let magnifierTop = offsetY + 15

  // 防止放大镜超出屏幕边界，如果超出则显示在鼠标左上角
  if (magnifierLeft + magnifierWidth > winWidth) {
    magnifierLeft = offsetX - magnifierWidth - 15
  }

  if (magnifierTop + magnifierHeight > winHeight) {
    magnifierTop = offsetY - magnifierHeight - 15
  }

  // 确保不会超出屏幕左边和上边
  magnifierLeft = Math.max(0, magnifierLeft)
  magnifierTop = Math.max(0, magnifierTop)

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
  const magnifierX = Math.max(0, mouseX * window.devicePixelRatio - magnifierWidth / (2 * zoomFactor))
  const magnifierY = Math.max(0, mouseY * window.devicePixelRatio - magnifierHeight / (2 * zoomFactor))

  // 调整放大镜的位置，避免超出画布边界
  const adjustedX = Math.min(magnifierX, canvasWidth - magnifierWidth / zoomFactor)
  const adjustedY = Math.min(magnifierY, canvasHeight - magnifierHeight / zoomFactor)

  magnifierCtx.value.clearRect(0, 0, magnifierWidth, magnifierHeight)

  // 绘制放大区域，以鼠标位置为中心
  magnifierCtx.value.drawImage(
    imgCanvas.value!,
    adjustedX,
    adjustedY,
    magnifierWidth / zoomFactor,
    magnifierHeight / zoomFactor,
    0,
    0,
    magnifierWidth,
    magnifierHeight
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
    // 重置绘图工具状态
    resetDrawTools()

    // 重置所有状态
    showButtonGroup.value = false
    isImageLoaded = false
    borderRadius.value = 0 // 重置圆角
    isDragging.value = false
    isResizing.value = false

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
      // 重置时禁用绘图canvas事件
      drawCanvas.value.style.pointerEvents = 'none'
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

// 全局鼠标点击处理，用于取消绘图工具
const handleGlobalMouseDown = (event: MouseEvent) => {
  // 只有在绘图工具激活且按钮组显示时才考虑处理
  if (!currentDrawTool.value || !showButtonGroup.value) return

  // 如果点击发生在按钮组内，直接返回，避免误操作
  if (buttonGroup.value && buttonGroup.value.contains(event.target as Node)) {
    return
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
  // 每次开始截图时重置所有状态
  resetDrawTools()
  appWindow.show()
  initCanvas()
  initMagnifier()
}

onMounted(async () => {
  addListener(
    appWindow.listen('capture', () => {
      resetDrawTools()
      initCanvas()
      initMagnifier()
    }),
    'capture'
  )

  // 监听窗口隐藏时的重置事件
  addListener(
    appWindow.listen('capture-reset', () => {
      resetDrawTools()
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

  // 清理全局右键监听事件
  document.removeEventListener('contextmenu', handleRightClick)

  // 清理全局点击监听事件
  document.removeEventListener('mousedown', handleGlobalMouseDown)

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
  width: 200px;
  height: 120px;
  border: 2px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
  display: none;
  background: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.img-canvas {
  z-index: 0;
}

.mask-canvas {
  z-index: 1;
}

.draw-canvas {
  z-index: 5;
  pointer-events: none;
}

.magnifier canvas {
  display: block;
  z-index: 2;
}

.selection-area {
  position: absolute;
  z-index: 2;
  background: transparent;
  box-sizing: border-box;
}

.drag-area {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 10;
  background: transparent;
}

.drag-area.can-drag {
  cursor: move;
}

.drag-area.cannot-drag {
  cursor: not-allowed;
}

.resize-handle {
  position: absolute;
  background: white;
  border: 1px solid #ccc;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  z-index: 4;
  transition: all 0.2s;
}

.resize-handle.disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.5;
}

/* 四个角的控制点 */
.resize-nw {
  top: -4px;
  left: -4px;
  cursor: nw-resize;
}

.resize-ne {
  top: -4px;
  right: -4px;
  cursor: ne-resize;
}

.resize-sw {
  bottom: -4px;
  left: -4px;
  cursor: sw-resize;
}

.resize-se {
  bottom: -4px;
  right: -4px;
  cursor: se-resize;
}

/* 四条边中间的控制点 */
.resize-n {
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-e {
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-s {
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-w {
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  cursor: w-resize;
}

.border-radius-controller {
  position: absolute;
  top: -35px;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 5;
  white-space: nowrap;

  label {
    margin: 0;
  }

  input[type='range'] {
    width: 60px;
    height: 4px;
    background: #ddd;
    border-radius: 2px;
    outline: none;
    margin: 0;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
    }

    &::-moz-range-thumb {
      width: 12px;
      height: 12px;
      background: white;
      border-radius: 50%;
      border: none;
      cursor: pointer;
    }
  }

  span {
    font-size: 11px;
    min-width: 25px;
  }
}

.button-group {
  position: absolute;
  display: flex;
  gap: 10px;
  transform: translate(-50%, 0);
  background: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 5px;
  z-index: 100;
  pointer-events: auto;

  button {
    padding: 5px 10px;
    cursor: pointer;
    background: white;
    border: 1px solid #ccc;
    border-radius: 3px;
    transition: all 0.2s;

    &:hover {
      background: #f0f0f0;
    }

    &.active {
      background: #13987f;
      color: white;
      border-color: #13987f;
    }
  }
}
</style>
