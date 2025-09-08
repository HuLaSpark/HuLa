import { useDebounceFn } from '@vueuse/core'
export type FixedScaleMode = 'zoom' | 'transform'

export type UseFixedScaleOptions = {
  /** 目标容器：CSS 选择器或元素，默认 '#app' */
  target?: string | HTMLElement
  /** 默认 'zoom' */
  mode?: FixedScaleMode
  /** 自定义计算缩放比例方法，默认返回 1 / devicePixelRatio */
  getScale?: () => number
  /** 限制最小缩放 */
  minScale?: number
  /** 限制最大缩放 */
  maxScale?: number
}

type FixedScaleController = {
  enable: () => void
  disable: () => void
  getCurrentScale: () => number
  forceUpdate: () => void
  /** 当前是否启用 */
  readonly isEnabled: ComputedRef<boolean>
  /** 当前缩放比例 */
  readonly currentScale: ComputedRef<number>
  /** 当前 DPR */
  readonly devicePixelRatio: ComputedRef<number>
}

const clamp = (n: number, min?: number, max?: number) => {
  let x = n
  if (typeof min === 'number') x = Math.max(min, x)
  if (typeof max === 'number') x = Math.min(max, x)
  return x
}

const resolveElement = (target?: string | HTMLElement): HTMLElement => {
  if (!target) return (document.getElementById('app') || document.body || document.documentElement) as HTMLElement
  if (typeof target === 'string') {
    const el = document.querySelector(target)
    return (el as HTMLElement) || (document.getElementById('app') as HTMLElement) || document.body
  }
  return target
}

// 检测是否支持 zoom 样式
const supportsZoom = (() => {
  const testEl = document.createElement('div')
  testEl.style.zoom = '1'
  return testEl.style.zoom === '1'
})()

/**
 * 保持页面在不同系统显示缩放(DPI)下视觉尺寸一致的组合式函数
 * - 当系统显示缩放为 125%、150%、200% 等导致 window.devicePixelRatio(DPR) 改变时，自动反向缩放页面，保持 UI 视觉尺寸一致
 * - 默认基于 zoom 方案（桌面端 Chromium/Edge/Tauri 环境表现较稳定）
 * - 提供 transform 方案作为兜底（当某些环境不支持 zoom 或有兼容问题时可切换）
 * - 监听窗口 resize / visualViewport 变化与 DPR 媒体查询变化，动态应用
 * - 提供启用/禁用接口，确保卸载时恢复样式与事件
 * @param options 配置选项
 */
export const useFixedScale = (options: UseFixedScaleOptions = {}): FixedScaleController => {
  const { target = '#app', mode = 'zoom', getScale, minScale = 0.1, maxScale = 3.0 } = options

  const isEnabled = ref(false)
  const currentDPR = ref(window.devicePixelRatio || 1)
  const targetElement = ref<HTMLElement | null>(null)

  // 保存进入前的样式，便于恢复
  const originalStyles: Partial<CSSStyleDeclaration> = {}

  // 事件监听器管理 - 使用 Map 来跟踪监听器
  const eventListeners = new Map<string, () => void>()
  const mediaQueryListeners = new Set<MediaQueryList>()

  // 改进的缩放计算逻辑 - 针对不同缩放比例的优化
  const calculateOptimalScale = (): number => {
    const dpr = currentDPR.value

    if (getScale) {
      return getScale()
    }

    // 针对常见系统缩放的优化计算
    // 使用更精确的数值来处理浮点数精度问题
    if (Math.abs(dpr - 2.0) < 0.01) {
      // 200% 缩放：精确的 0.5
      return 0.5
    } else if (Math.abs(dpr - 1.5) < 0.01) {
      // 150% 缩放：精确的 2/3
      return 2 / 3
    } else if (Math.abs(dpr - 1.25) < 0.01) {
      // 125% 缩放：精确的 0.8
      return 0.8
    }

    // 默认反向缩放，但使用更安全的计算
    const scale = 1 / dpr
    return scale
  }

  // 计算属性 - Vue 响应式系统的优势
  const currentScale = computed(() => clamp(calculateOptimalScale(), minScale, maxScale))
  const devicePixelRatio = computed(() => currentDPR.value)

  const applyZoom = (scale: number) => {
    if (!targetElement.value) return
    const el = targetElement.value
    ;(el.style as any).zoom = String(scale)
    el.style.transformOrigin = ''
    el.style.transform = ''
    el.style.width = ''
    el.style.height = ''
  }

  const applyTransform = (scale: number) => {
    if (!targetElement.value) return
    const el = targetElement.value
    el.style.transformOrigin = '0 0'
    el.style.transform = `scale(${scale})`
    // 为保持可视区域充满，需要反向扩大容器尺寸
    el.style.width = `${100 / scale}%`
    el.style.height = `${100 / scale}%`
    // 清理 zoom 以避免叠加
    ;(el.style as any).zoom = ''
  }

  const apply = () => {
    if (!targetElement.value) return

    const scale = currentScale.value
    // 设置 CSS 自定义属性供其他组件使用
    document.documentElement.style.setProperty('--page-scale', String(scale))
    document.documentElement.style.setProperty('--device-pixel-ratio', String(currentDPR.value))

    // 检查模式并应用相应的缩放方法
    const effectiveMode = mode === 'zoom' && !supportsZoom ? 'transform' : mode

    if (effectiveMode === 'zoom') {
      applyZoom(scale)
    } else {
      applyTransform(scale)
    }

    // 触发窗口尺寸调整事件
    // 使用 CustomEvent 来需要重新定义DPR窗口需要调整尺寸
    window.dispatchEvent(
      new CustomEvent('resize-needed', {
        detail: { scale, devicePixelRatio: currentDPR.value }
      })
    )
  }

  // 改进的 DPR 更新函数
  const updateDPR = () => {
    const newDPR = window.devicePixelRatio || 1
    if (Math.abs(newDPR - currentDPR.value) > 0.001) {
      // 避免浮点数比较问题
      currentDPR.value = newDPR
      if (isEnabled.value) {
        // 使用 nextTick 确保响应式更新完成后再应用
        nextTick(() => {
          apply()
        })
      }
    }
  }

  const setupListeners = () => {
    // 防抖函数，避免频繁触发
    const debounceApply = useDebounceFn(() => {
      updateDPR()
    }, 100)

    // window.resize 监听器
    const resizeHandler = () => {
      debounceApply()
    }
    eventListeners.set('resize', resizeHandler)
    window.addEventListener('resize', resizeHandler, { passive: true })

    // visualViewport 监听器
    if (window.visualViewport) {
      const viewportHandler = () => {
        debounceApply()
      }

      window.visualViewport.addEventListener('resize', viewportHandler, { passive: true })
      window.visualViewport.addEventListener('scroll', viewportHandler, { passive: true })

      eventListeners.set('visualViewport', () => {
        window.visualViewport?.removeEventListener('resize', viewportHandler)
        window.visualViewport?.removeEventListener('scroll', viewportHandler)
      })
    }

    // 更精确的 DPR 监听 - 使用更全面的范围
    const dprValues = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4]

    dprValues.forEach((dpr) => {
      try {
        const mql = matchMedia(`(resolution: ${dpr}dppx)`)
        if (mql) {
          const handler = (e: MediaQueryListEvent) => {
            if (e.matches) {
              debounceApply()
            }
          }

          mql.addEventListener('change', handler)
          mediaQueryListeners.add(mql)

          // 存储清理函数
          eventListeners.set(`mql-${dpr}`, () => {
            mql.removeEventListener('change', handler)
          })
        }
      } catch (error) {
        console.log(`Failed to create media query for ${dpr}dppx:`, error)
      }
    })
  }

  const removeListeners = () => {
    // 移除所有事件监听器
    eventListeners.forEach((cleanup, key) => {
      try {
        if (key === 'resize') {
          window.removeEventListener('resize', cleanup as EventListener)
        } else {
          cleanup()
        }
      } catch (error) {
        console.log(`Error removing listener ${key}:`, error)
      }
    })

    eventListeners.clear()
    mediaQueryListeners.clear()
  }

  const saveOriginal = () => {
    if (!targetElement.value) return
    const el = targetElement.value
    originalStyles.zoom = (el.style as any).zoom
    originalStyles.transform = el.style.transform
    originalStyles.transformOrigin = el.style.transformOrigin
    originalStyles.width = el.style.width
    originalStyles.height = el.style.height
  }

  const restoreOriginal = () => {
    if (!targetElement.value) return
    const el = targetElement.value

    // 移除 CSS 自定义属性
    document.documentElement.style.removeProperty('--page-scale')
    document.documentElement.style.removeProperty('--device-pixel-ratio')

    // 恢复原始样式
    if (originalStyles.zoom !== undefined) (el.style as any).zoom = originalStyles.zoom
    if (originalStyles.transform !== undefined) el.style.transform = originalStyles.transform
    if (originalStyles.transformOrigin !== undefined) el.style.transformOrigin = originalStyles.transformOrigin
    if (originalStyles.width !== undefined) el.style.width = originalStyles.width
    if (originalStyles.height !== undefined) el.style.height = originalStyles.height
  }

  const enable = () => {
    if (isEnabled.value) {
      return
    }

    const el = resolveElement(target)
    if (!el) {
      return
    }

    targetElement.value = el
    currentDPR.value = window.devicePixelRatio || 1

    saveOriginal()
    setupListeners()
    apply()
    isEnabled.value = true
  }

  const disable = () => {
    if (!isEnabled.value) {
      return
    }

    removeListeners()
    restoreOriginal()
    isEnabled.value = false
    targetElement.value = null
  }

  // Vue 生命周期管理
  onBeforeUnmount(() => {
    disable()
  })

  return {
    enable,
    disable,
    getCurrentScale: () => currentScale.value,
    forceUpdate: () => {
      updateDPR()
      apply()
    },
    isEnabled: computed(() => isEnabled.value),
    currentScale,
    devicePixelRatio
  }
}
