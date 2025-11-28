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
        :title="t('message.screenshot.tooltip_drag')"
        @mousedown="handleSelectionDragStart"
        @mousemove="handleSelectionDragMove"
        @mouseup="handleSelectionDragEnd"
        @dblclick="confirmSelection"></div>

      <!-- resize控制点 - 四个角 -->
      <div
        :class="['resize-handle', 'resize-nw', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'nw')"></div>
      <div
        :class="['resize-handle', 'resize-ne', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'ne')"></div>
      <div
        :class="['resize-handle', 'resize-sw', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'sw')"></div>
      <div
        :class="['resize-handle', 'resize-se', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'se')"></div>

      <!-- resize控制点 - 四条边的中间 -->
      <div
        :class="['resize-handle', 'resize-n', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'n')"></div>
      <div
        :class="['resize-handle', 'resize-e', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'e')"></div>
      <div
        :class="['resize-handle', 'resize-s', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 's')"></div>
      <div
        :class="['resize-handle', 'resize-w', { disabled: currentDrawTool }]"
        :title="t('message.screenshot.tooltip_resize')"
        @mousedown.stop="handleResizeStart($event, 'w')"></div>

      <!-- 圆角控制器 -->
      <div class="border-radius-controller" :style="borderRadiusControllerStyle" @click.stop>
        <label>{{ t('message.screenshot.border_radius') }}:</label>
        <input type="range" :value="borderRadius" @input="handleBorderRadiusChange" min="0" max="100" step="1" />
        <span>{{ borderRadius }}px</span>
      </div>
    </div>

    <div ref="buttonGroup" class="button-group" v-show="showButtonGroup && !isDragging && !isResizing">
      <span
        :class="{ active: currentDrawTool === 'rect' }"
        :title="t('message.screenshot.tool_rect')"
        @click="drawImgCanvas('rect')">
        <svg><use href="#square"></use></svg>
      </span>
      <span
        :class="{ active: currentDrawTool === 'circle' }"
        :title="t('message.screenshot.tool_circle')"
        @click="drawImgCanvas('circle')">
        <svg><use href="#round"></use></svg>
      </span>
      <span
        :class="{ active: currentDrawTool === 'arrow' }"
        :title="t('message.screenshot.tool_arrow')"
        @click="drawImgCanvas('arrow')">
        <svg><use href="#arrow-right-up"></use></svg>
      </span>
      <span
        :class="{ active: currentDrawTool === 'mosaic' }"
        :title="t('message.screenshot.tool_mosaic')"
        @click="drawImgCanvas('mosaic')">
        <svg><use href="#mosaic"></use></svg>
      </span>
      <!-- 重做 -->
      <span :title="t('message.screenshot.redo')" @click="drawImgCanvas('redo')">
        <svg><use href="#refresh"></use></svg>
      </span>
      <!-- 撤回：当没有涂鸦时禁用 -->
      <span
        :class="{ disabled: !canUndo }"
        :aria-disabled="!canUndo"
        :title="t('message.screenshot.undo')"
        @click.stop="drawImgCanvas('undo')">
        <svg><use href="#return"></use></svg>
      </span>
      <span :title="t('message.screenshot.confirm')" @click="confirmSelection">
        <svg><use href="#check-small"></use></svg>
      </span>
      <span :title="t('message.screenshot.cancel')" @click="cancelSelection">
        <svg><use href="#close"></use></svg>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { emitTo } from '@tauri-apps/api/event'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { writeImage } from '@tauri-apps/plugin-clipboard-manager'
import type { Ref } from 'vue'
import { useCanvasTool } from '@/hooks/useCanvasTool'
import { isMac } from '@/utils/PlatformConstants'
import { ErrorType, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'
import { useI18n } from 'vue-i18n'

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

// 获取当前窗口实例
const { t } = useI18n()
const appWindow = WebviewWindow.getCurrent()
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
// 是否可撤回
const canUndo = ref(false)

// 放大镜
const magnifier: Ref<HTMLDivElement | null> = ref(null)
const magnifierCanvas: Ref<HTMLCanvasElement | null> = ref(null)
const magnifierCtx: Ref<CanvasRenderingContext2D | null> = ref(null)
const magnifierWidth: number = 120 // 放大镜的宽度
const magnifierHeight: number = 120 // 放大镜的高度
const zoomFactor: number = 3 // 放大的倍数

// 按钮组
const buttonGroup: Ref<HTMLDivElement | null> = ref(null)
const showButtonGroup: Ref<boolean> = ref(false) // 控制按钮组显示

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

// 性能优化：鼠标移动事件节流（仅 macOS）
let mouseMoveThrottleId: number | null = null
const mouseMoveThrottleDelay = 16 // 约60FPS，在菜单栏区域降低频率

// 窗口状态恢复函数
const restoreWindowState = async () => {
  await appWindow.hide()
}

/**
 * 绘制图形
 * @param {string} type - 图形类型
 */
const drawImgCanvas = (type: string) => {
  if (!drawTools) {
    console.warn('绘图工具未初始化')
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
      console.log(`绘图工具已激活: ${type}`)
    } catch (error) {
      console.error(`绘图工具激活失败: ${type}`, error)
      currentDrawTool.value = null
      // 激活失败时也要禁用事件
      if (drawCanvas.value) {
        drawCanvas.value.style.pointerEvents = 'none'
      }
    }
  } else if (type === 'redo') {
    // 需求：点击“重做”清空绘图画布的全部涂鸦
    if (drawTools.clearAll) {
      drawTools.clearAll()
    }
    // 清空后重置工具状态并禁用绘图事件穿透
    currentDrawTool.value = null
    drawTools.resetState && drawTools.resetState()
    drawTools.clearEvents && drawTools.clearEvents()
    if (drawCanvas.value) {
      drawCanvas.value.style.pointerEvents = 'none'
      drawCanvas.value.style.zIndex = '5'
    }
    console.log('已清空全部涂鸦 (通过重做按钮)')
  } else if (type === 'undo') {
    // 没有可撤回的内容时直接忽略点击
    if (!canUndo.value) return
    // 先停止可能正在进行的绘制，确保一次点击立即生效
    drawTools.stopDrawing && drawTools.stopDrawing()
    drawTools.undo && drawTools.undo()
    console.log('执行撤销')
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
    console.log('绘图内容已清除')
  }

  // 重置时禁用绘图canvas事件，让事件穿透到选区
  if (drawCanvas.value) {
    drawCanvas.value.style.pointerEvents = 'none'
    drawCanvas.value.style.zIndex = '5'
  }

  console.log('绘图工具已重置')
}

/**
 * 初始化canvas
 */
const initCanvas = async () => {
  // 在截图前隐藏放大镜，避免被截进去
  if (magnifier.value) {
    magnifier.value.style.display = 'none'
  }
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
      console.log('绘图canvas已清除')
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
            // 同步 canUndo 状态到本组件用于禁用撤回按钮
            if (drawTools?.canUndo) {
              watch(drawTools.canUndo, (val: boolean) => (canUndo.value = val), { immediate: true })
            }
            console.log('绘图工具初始化完成 (备用方式)')
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
          // 同步 canUndo 状态到本组件用于禁用撤回按钮
          if (drawTools?.canUndo) {
            watch(drawTools.canUndo, (val: boolean) => (canUndo.value = val), { immediate: true })
          }
          console.log('绘图工具初始化完成')
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

const handleMagnifierMouseMove = (event: MouseEvent) => {
  if (!magnifier.value || !imgCanvas.value || !imgCtx.value) return

  // 在拖动选区时隐藏放大镜，仅在调整大小和绘制时显示
  if (isDragging.value) {
    magnifier.value.style.display = 'none'
    return
  }

  // 如果已经选择了区域，但当前不在拖动或调整大小，则隐藏放大镜
  if (showButtonGroup.value && !isDragging.value && !isResizing.value) {
    magnifier.value.style.display = 'none'
    return
  }

  // 确保图像已加载
  if (!isImageLoaded) {
    magnifier.value.style.display = 'none'
    return
  }

  // 初始化放大镜画布
  if (magnifierCanvas.value && magnifierCtx.value === null) {
    magnifierCanvas.value.width = magnifierWidth
    magnifierCanvas.value.height = magnifierHeight
    magnifierCtx.value = magnifierCanvas.value.getContext('2d')
  }

  if (!magnifierCtx.value) return

  magnifier.value.style.display = 'block'

  // 统一使用 clientX/clientY + canvas 的 boundingClientRect 计算相对画布的坐标
  const clientX = (event as MouseEvent).clientX
  const clientY = (event as MouseEvent).clientY
  const rect = imgCanvas.value.getBoundingClientRect()
  const mouseX = clientX - rect.left
  const mouseY = clientY - rect.top

  // 定位放大镜（使用视口坐标放置，避免偏移）
  let magnifierTop = clientY + 20
  let magnifierLeft = clientX + 20

  if (magnifierTop + magnifierHeight > window.innerHeight) {
    magnifierTop = clientY - magnifierHeight - 20
  }
  if (magnifierLeft + magnifierWidth > window.innerWidth) {
    magnifierLeft = clientX - magnifierWidth - 20
  }

  magnifier.value.style.top = `${magnifierTop}px`
  magnifier.value.style.left = `${magnifierLeft}px`

  // 计算源图像中的采样区域（相对画布坐标再乘缩放因子）
  const sourceX = mouseX * screenConfig.value.scaleX - magnifierWidth / zoomFactor / 2
  const sourceY = mouseY * screenConfig.value.scaleY - magnifierHeight / zoomFactor / 2
  const sourceWidth = magnifierWidth / zoomFactor
  const sourceHeight = magnifierHeight / zoomFactor

  // 清除放大镜画布
  magnifierCtx.value.clearRect(0, 0, magnifierWidth, magnifierHeight)

  // 绘制放大的图像
  magnifierCtx.value.drawImage(
    imgCanvas.value,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    magnifierWidth,
    magnifierHeight
  )

  // 在放大镜中心绘制十字线
  magnifierCtx.value.strokeStyle = '#13987f'
  magnifierCtx.value.lineWidth = 1
  magnifierCtx.value.beginPath()
  magnifierCtx.value.moveTo(magnifierWidth / 2, 0)
  magnifierCtx.value.lineTo(magnifierWidth / 2, magnifierHeight)
  magnifierCtx.value.moveTo(0, magnifierHeight / 2)
  magnifierCtx.value.lineTo(magnifierWidth, magnifierHeight / 2)
  magnifierCtx.value.stroke()
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

  // 只在 macOS 上应用性能优化
  if (isMac()) {
    // 在菜单栏区域（y < 30）使用更强的节流来减少卡顿
    const currentY = offsetEvent.offsetY * screenConfig.value.scaleY
    const isInMenuBar = currentY < 30 // 菜单栏区域
    const throttleDelay = isInMenuBar ? 32 : mouseMoveThrottleDelay // 菜单栏区域降低到30FPS

    if (mouseMoveThrottleId) {
      return
    }

    mouseMoveThrottleId = window.setTimeout(() => {
      mouseMoveThrottleId = null

      if (!screenConfig.value.isDrawing || !maskCtx.value || !maskCanvas.value) return

      const mouseX = offsetEvent.offsetX * screenConfig.value.scaleX
      const mouseY = offsetEvent.offsetY * screenConfig.value.scaleY
      const width = mouseX - screenConfig.value.startX
      const height = mouseY - screenConfig.value.startY

      // 优化：使用 save/restore 来减少重绘开销
      maskCtx.value.save()

      // 清除之前的矩形区域
      maskCtx.value.clearRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)

      // 重新绘制整个遮罩层
      drawMask()

      // 清除矩形区域内的遮罩，实现透明效果
      maskCtx.value.clearRect(screenConfig.value.startX, screenConfig.value.startY, width, height)

      // 绘制矩形边框
      drawRectangle(maskCtx.value, screenConfig.value.startX, screenConfig.value.startY, width, height)

      maskCtx.value.restore()
    }, throttleDelay)
  } else {
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

    // 重绘蒙版
    redrawSelection()

    showButtonGroup.value = true // 显示按钮组
    nextTick(() => {
      updateButtonGroupPosition()
    })
  }
}

// 计算矩形区域工具栏位置
const updateButtonGroupPosition = () => {
  if (!buttonGroup.value) return

  // 按钮组不可见、正在拖动或正在调整大小时，不进行尺寸测量和定位
  if (!showButtonGroup.value || isDragging.value || isResizing.value) {
    updateSelectionAreaPosition()
    return
  }

  const { scaleX, scaleY, startX, startY, endX, endY } = screenConfig.value

  // 矩形的边界
  const minY = Math.min(startY, endY) / scaleY
  const maxX = Math.max(startX, endX) / scaleX
  const maxY = Math.max(startY, endY) / scaleY

  // 可用屏幕尺寸
  const availableHeight = window.innerHeight
  const availableWidth = window.innerWidth

  const el = buttonGroup.value
  el.style.flexWrap = 'nowrap'
  el.style.whiteSpace = 'nowrap'
  el.style.width = 'max-content'
  el.style.overflow = 'visible'

  const rect = el.getBoundingClientRect()
  const measuredHeight = rect.height
  const contentWidth = el.scrollWidth || rect.width

  const maxAllowedWidth = availableWidth - 20
  const finalWidth = Math.min(contentWidth, maxAllowedWidth)

  // 判断是否能放在选区下方
  const spaceBelow = availableHeight - maxY
  const canFitBelow = spaceBelow >= measuredHeight + 10 // 留10px缓冲

  let leftPosition: number
  let topPosition: number

  if (canFitBelow) {
    // 优先放在选区下方
    topPosition = maxY + 4

    // 与选区右对齐
    leftPosition = maxX - finalWidth
    leftPosition = Math.max(10, Math.min(leftPosition, availableWidth - finalWidth - 10))
  } else {
    // 选区下方空间不足，放在选区上方
    topPosition = minY - (measuredHeight + 4)
    if (topPosition < 0) topPosition = 10

    // 与选区右对齐
    leftPosition = maxX - finalWidth
    leftPosition = Math.max(10, Math.min(leftPosition, availableWidth - finalWidth - 10))
  }

  // 应用最终位置与宽度
  el.style.top = `${topPosition}px`
  el.style.left = `${leftPosition}px`
  el.style.width = `${finalWidth}px`
  el.style.boxSizing = 'border-box'

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
  const controllerWidth = 120 // 控制器宽度

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
    top = selectionTop + 4 // 如果超出上边界，显示在选区内部
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

  console.log('开始拖动，隐藏按钮组')
}

// 选区拖动移动
const handleSelectionDragMove = (event: MouseEvent) => {
  if (!isDragging.value) return

  event.preventDefault()

  // 拖动选区时不显示放大镜
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

  // 重新绘制矩形
  redrawSelection()
  // 拖动过程中不定位按钮组
  if (!isDragging.value) {
    updateButtonGroupPosition()
  }
}

// 选区拖动结束
const handleSelectionDragEnd = () => {
  isDragging.value = false

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleSelectionDragMove)
  document.removeEventListener('mouseup', handleSelectionDragEnd)

  // 结束拖动后隐藏放大镜
  if (magnifier.value) {
    magnifier.value.style.display = 'none'
  }

  nextTick(() => {
    updateButtonGroupPosition()
  })

  console.log('拖动结束，显示按钮组')
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

  // 调整大小时也显示放大镜，辅助精确定位
  handleMagnifierMouseMove(event)

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

  // 重新绘制选区
  redrawSelection()
  if (showButtonGroup.value) {
    updateButtonGroupPosition()
  }
}

// resize结束
const handleResizeEnd = () => {
  isResizing.value = false
  resizeDirection.value = ''

  // 移除全局鼠标事件监听
  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)

  // 结束调整后隐藏放大镜
  if (magnifier.value) {
    magnifier.value.style.display = 'none'
  }

  // 调整结束后再定位按钮组
  nextTick(() => {
    if (showButtonGroup.value) {
      updateButtonGroupPosition()
    }
  })
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

// 重绘蒙版为透明选区 + 无描边，避免与 DOM 选区边框重复
const redrawSelection = () => {
  if (!maskCtx.value || !maskCanvas.value) return

  const { startX, startY, endX, endY } = screenConfig.value
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  // 清空并重绘蒙版
  maskCtx.value.clearRect(0, 0, maskCanvas.value.width, maskCanvas.value.height)
  drawMask()

  maskCtx.value.clearRect(x, y, width, height)
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
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  if (width < 1 || height < 1) {
    console.error('❌选区尺寸无效:', { width, height })
    await resetScreenshot()
    return
  }

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

        // 如果设置了圆角，则将裁剪结果应用圆角蒙版，导出带透明圆角的 PNG
        if (borderRadius.value > 0) {
          const scale = screenConfig.value.scaleX || 1
          const r = Math.min(borderRadius.value * scale, width / 2, height / 2)
          if (r > 0) {
            offscreenCtx.save()
            // 仅保留圆角矩形内的内容
            offscreenCtx.globalCompositeOperation = 'destination-in'

            offscreenCtx.beginPath()
            // 在 (0,0,width,height) 上构建圆角矩形路径
            offscreenCtx.moveTo(r, 0)
            offscreenCtx.lineTo(width - r, 0)
            offscreenCtx.quadraticCurveTo(width, 0, width, r)
            offscreenCtx.lineTo(width, height - r)
            offscreenCtx.quadraticCurveTo(width, height, width - r, height)
            offscreenCtx.lineTo(r, height)
            offscreenCtx.quadraticCurveTo(0, height, 0, height - r)
            offscreenCtx.lineTo(0, r)
            offscreenCtx.quadraticCurveTo(0, 0, r, 0)
            offscreenCtx.closePath()
            offscreenCtx.fill()

            offscreenCtx.restore()
          }
        }

        // 测试：检查canvas数据是否有效
        try {
          offscreenCtx.getImageData(0, 0, Math.min(10, width), Math.min(10, height))
        } catch (error) {
          console.error('获取ImageData失败,可能是安全限制:', error)
        }

        offscreenCanvas.toBlob(async (blob) => {
          if (blob && blob.size > 0) {
            try {
              // 将 Blob 转换为 ArrayBuffer 以便通过 Tauri 事件传递
              const arrayBuffer = await blob.arrayBuffer()
              const buffer = new Uint8Array(arrayBuffer)

              try {
                await emitTo('home', 'screenshot', {
                  type: 'image',
                  buffer: Array.from(buffer),
                  mimeType: 'image/png'
                })
              } catch (e) {
                console.warn('发送截图到主窗口失败:', e)
              }

              try {
                await writeImage(buffer)
                window.$message?.success(t('message.screenshot.save_success'))
              } catch (clipboardError) {
                console.error('复制到剪贴板失败:', clipboardError)
                window.$message?.error(t('message.screenshot.save_failed'))
              }

              await resetScreenshot()
            } catch (error) {
              window.$message?.error(t('message.screenshot.save_failed'))
              await resetScreenshot()
            }
          } else {
            window.$message?.error(t('message.screenshot.save_failed'))
            await resetScreenshot()
          }
        }, 'image/png')
      }
    } catch (error) {
      console.error('Canvas操作失败:', error)
      window.$message?.error(t('message.screenshot.save_failed'))
      await resetScreenshot()
    }
  }
}

const resetScreenshot = async () => {
  try {
    // 清理性能优化相关的定时器（仅 macOS）
    if (isMac() && mouseMoveThrottleId) {
      clearTimeout(mouseMoveThrottleId)
      mouseMoveThrottleId = null
    }

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

    // 恢复窗口状态（macOS需要退出全屏）
    await restoreWindowState()
  } catch (error) {
    // 即使出错也要尝试恢复窗口状态
    await restoreWindowState()
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
  appWindow.listen('capture', () => {
    resetDrawTools()
    initCanvas()
    initMagnifier()
  })

  // 监听窗口隐藏时的重置事件
  appWindow.listen('capture-reset', () => {
    resetDrawTools()
    resetScreenshot()
    console.log('📷 Screenshot组件已重置')
  })

  // 监听自定义截图事件
  window.addEventListener('trigger-screenshot', handleScreenshot)
})

onUnmounted(async () => {
  // 清理性能优化相关的定时器（仅 macOS）
  if (isMac() && mouseMoveThrottleId) {
    clearTimeout(mouseMoveThrottleId)
    mouseMoveThrottleId = null
  }

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
  width: 120px;
  height: 120px;
  border: 1px solid #ccc;
  border-radius: 12px;
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
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  cursor: n-resize;
}

.resize-e {
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: e-resize;
}

.resize-s {
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  cursor: s-resize;
}

.resize-w {
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  cursor: w-resize;
}

.button-group {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 999;
  white-space: nowrap;
  overflow: visible;

  span {
    cursor: pointer;
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    flex: 0 0 auto;

    svg {
      width: 22px;
      height: 22px;
    }

    &:hover svg {
      color: #13987f;
    }

    &.active svg {
      color: #13987f;
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}

.border-radius-controller {
  position: absolute;
  left: 0;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  z-index: 999;
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
</style>
