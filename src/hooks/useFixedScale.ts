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

/**
 * 保持页面在不同系统显示缩放(DPI)下视觉尺寸一致的组合式函数
 * - 当系统显示缩放为 125%、150% 等导致 window.devicePixelRatio(DPR) 改变时，自动反向缩放页面，保持 UI 视觉尺寸一致
 * - 默认基于 zoom 方案（桌面端 Chromium/Edge/Tauri 环境表现较稳定）
 * - 提供 transform 方案作为兜底（当某些环境不支持 zoom 或有兼容问题时可切换）
 * - 监听窗口 resize / visualViewport 变化与 DPR 媒体查询变化，动态应用
 * - 提供启用/禁用接口，确保卸载时恢复样式与事件
 * @param options 配置选项
 */
export const useFixedScale = (options: UseFixedScaleOptions = {}): FixedScaleController => {
  const {
    target = '#app',
    mode = 'zoom',
    getScale = () => 1 / (window.devicePixelRatio || 1),
    minScale,
    maxScale
  } = options

  let el: HTMLElement | null = null
  let mqlList: MediaQueryList[] = []
  let visualViewportListener: (() => void) | null = null
  let resizeListener: (() => void) | null = null
  let isEnabled = false

  // 保存进入前的样式，便于恢复
  const originalStyles: Partial<CSSStyleDeclaration> = {}

  const readCurrentScale = () => clamp(getScale(), minScale, maxScale)

  const applyZoom = (scale: number) => {
    if (!el) return
    ;(el.style as any).zoom = String(scale)
    el.style.transformOrigin = ''
    el.style.transform = ''
    el.style.width = ''
    el.style.height = ''
  }

  const applyTransform = (scale: number) => {
    if (!el) return
    el.style.transformOrigin = '0 0'
    el.style.transform = `scale(${scale})`
    // 为保持可视区域充满，需要反向扩大容器尺寸
    el.style.width = `${100 / scale}%`
    el.style.height = `${100 / scale}%`
    // 清理 zoom 以避免叠加
    ;(el.style as any).zoom = ''
  }

  const apply = () => {
    if (!el) return
    const s = readCurrentScale()
    document.documentElement.style.setProperty('--page-scale', String(s))
    if (mode === 'zoom') applyZoom(s)
    else applyTransform(s)
  }

  const setupListeners = () => {
    const onViewportChange = () => apply()
    const onResize = () => apply()

    // window.resize 基本可覆盖大部分 DPI 改变与显示器切换
    resizeListener = () => onResize()
    window.addEventListener('resize', resizeListener, { passive: true })

    // visualViewport 在部分环境下能更快感知缩放变化
    if (window.visualViewport) {
      const handler = () => onViewportChange()
      window.visualViewport.addEventListener('resize', handler, { passive: true })
      window.visualViewport.addEventListener('scroll', handler, { passive: true })
      visualViewportListener = () => {
        window.visualViewport?.removeEventListener('resize', handler)
        window.visualViewport?.removeEventListener('scroll', handler)
      }
    }

    // 监听可能的 DPR 变化（不同浏览器支持度不同）
    const dprs = [0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]
    mqlList = dprs.map((d) => matchMedia(`(resolution: ${d}dppx)`)).filter((mql) => !!mql)
    mqlList.forEach((mql) => mql.addEventListener?.('change', onViewportChange))
  }

  const removeListeners = () => {
    if (resizeListener) {
      window.removeEventListener('resize', resizeListener as any)
      resizeListener = null
    }
    if (visualViewportListener) {
      visualViewportListener()
      visualViewportListener = null
    }
    if (mqlList.length) {
      const onViewportChange = () => apply()
      mqlList.forEach((mql) => mql.removeEventListener?.('change', onViewportChange))
      mqlList = []
    }
  }

  const saveOriginal = () => {
    if (!el) return
    originalStyles.zoom = (el.style as any).zoom
    originalStyles.transform = el.style.transform
    originalStyles.transformOrigin = el.style.transformOrigin
    originalStyles.width = el.style.width
    originalStyles.height = el.style.height
  }

  const restoreOriginal = () => {
    if (!el) return
    document.documentElement.style.removeProperty('--page-scale')
    if (originalStyles.zoom !== undefined) (el.style as any).zoom = originalStyles.zoom as any
    if (originalStyles.transform !== undefined) el.style.transform = originalStyles.transform as string
    if (originalStyles.transformOrigin !== undefined)
      el.style.transformOrigin = originalStyles.transformOrigin as string
    if (originalStyles.width !== undefined) el.style.width = originalStyles.width as string
    if (originalStyles.height !== undefined) el.style.height = originalStyles.height as string
  }

  const enable = () => {
    if (isEnabled) return
    el = resolveElement(target)
    if (!el) return
    saveOriginal()
    setupListeners()
    apply()
    isEnabled = true
  }

  const disable = () => {
    if (!isEnabled) return
    removeListeners()
    restoreOriginal()
    isEnabled = false
  }

  onBeforeUnmount(() => {
    disable()
  })

  return { enable, disable }
}
