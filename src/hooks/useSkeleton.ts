/**
 * 骨架屏时间控制 Hook
 *
 * 功能特性：
 * 1. 数据在指定时间内（默认1秒）没有加载完成才显示骨架屏
 * 2. 骨架屏有最大显示时间限制（默认10秒），超时后显示回退内容
 * 3. 支持加载失败时的回退策略
 * 4. 自动管理定时器，避免内存泄漏
 */

import type { Ref } from 'vue'

/**
 * 骨架屏状态枚举
 */
export enum SkeletonState {
  IDLE = 'idle', // 初始状态/空闲状态
  LOADING = 'loading', // 数据正在加载中（延迟期间不显示骨架屏）
  SKELETON = 'skeleton', // 显示骨架屏状态
  LOADED = 'loaded', // 数据加载完成
  ERROR = 'error', // 加载失败
  TIMEOUT = 'timeout' // 骨架屏显示超时
}

/**
 * 骨架屏配置选项
 */
export interface SkeletonOptions {
  /** 显示骨架屏的延迟时间（毫秒），默认1000ms */
  showDelay?: number
  /** 骨架屏最大显示时间（毫秒），默认10000ms */
  maxDuration?: number
  /** 失败或超时时的回退数据 */
  fallbackData?: any
  /** 失败或超时时的提示文本 */
  fallbackMessage?: string
  /** 是否启用回退功能，默认true */
  enableFallback?: boolean
  /** 是否在组件卸载时自动重置，默认true */
  autoReset?: boolean
}

/**
 * 骨架屏控制器返回的状态和方法
 */
export interface SkeletonController {
  /** 当前状态 */
  readonly state: Ref<SkeletonState>
  /** 是否正在加载（用于API调用状态） */
  readonly isLoading: Ref<boolean>
  /** 是否显示骨架屏 */
  readonly showSkeleton: Ref<boolean>
  /** 是否显示内容 */
  readonly showContent: Ref<boolean>
  /** 是否显示回退内容 */
  readonly showFallback: Ref<boolean>
  /** 错误信息 */
  readonly error: Ref<Error | null>
  /** 回退数据 */
  readonly fallbackData: Ref<any>
  /** 回退提示文本 */
  readonly fallbackMessage: Ref<string>

  /** 开始加载 */
  startLoading: () => void
  /** 完成加载 */
  finishLoading: (data?: any) => void
  /** 加载失败 */
  failLoading: (error: Error) => void
  /** 重置状态 */
  reset: () => void
  /** 强制显示骨架屏（用于测试） */
  forceSkeleton: () => void
}

/**
 * 骨架屏控制 Hook
 * @param options 配置选项
 * @returns 骨架屏控制器
 */
export const useSkeleton = (options: SkeletonOptions = {}): SkeletonController => {
  // 默认配置
  const {
    showDelay = 1000,
    maxDuration = 10000,
    fallbackData = null,
    fallbackMessage = '数据加载失败，请重试',
    enableFallback = true,
    autoReset = true
  } = options

  // 响应式状态
  const state = ref<SkeletonState>(SkeletonState.IDLE)
  const error = ref<Error | null>(null)
  const fallbackDataRef = ref(fallbackData)
  const fallbackMessageRef = ref(fallbackMessage)

  // 定时器引用
  let showTimer: NodeJS.Timeout | null = null
  let timeoutTimer: NodeJS.Timeout | null = null

  // 计算属性
  const isLoading = computed(() => state.value === SkeletonState.LOADING || state.value === SkeletonState.SKELETON)

  const showSkeleton = computed(() => state.value === SkeletonState.SKELETON)

  const showContent = computed(() => state.value === SkeletonState.LOADED)

  const showFallback = computed(
    () => enableFallback && (state.value === SkeletonState.ERROR || state.value === SkeletonState.TIMEOUT)
  )

  /**
   * 清理所有定时器
   */
  const clearTimers = () => {
    if (showTimer) {
      clearTimeout(showTimer)
      showTimer = null
    }
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }

  /**
   * 开始加载
   */
  const startLoading = () => {
    clearTimers()
    error.value = null
    state.value = SkeletonState.LOADING

    // 设置延迟显示骨架屏的定时器
    showTimer = setTimeout(() => {
      if (state.value === SkeletonState.LOADING) {
        state.value = SkeletonState.SKELETON

        // 设置骨架屏超时定时器
        timeoutTimer = setTimeout(() => {
          if (state.value === SkeletonState.SKELETON) {
            state.value = SkeletonState.TIMEOUT
            clearTimers()
          }
        }, maxDuration)
      }
    }, showDelay)
  }

  /**
   * 完成加载
   * @param data 加载的数据（可选）
   */
  const finishLoading = (data?: any) => {
    clearTimers()
    if (data !== undefined) {
      fallbackDataRef.value = data
    }
    state.value = SkeletonState.LOADED
  }

  /**
   * 加载失败
   * @param err 错误信息
   */
  const failLoading = (err: Error) => {
    clearTimers()
    error.value = err
    state.value = SkeletonState.ERROR
  }

  /**
   * 重置状态
   */
  const reset = () => {
    clearTimers()
    error.value = null
    state.value = SkeletonState.IDLE
  }

  /**
   * 强制显示骨架屏（主要用于测试）
   */
  const forceSkeleton = () => {
    clearTimers()
    error.value = null
    state.value = SkeletonState.SKELETON

    // 仍然设置超时定时器
    timeoutTimer = setTimeout(() => {
      if (state.value === SkeletonState.SKELETON) {
        state.value = SkeletonState.TIMEOUT
        clearTimers()
      }
    }, maxDuration)
  }

  // 组件卸载时自动清理
  if (autoReset) {
    onUnmounted(() => {
      clearTimers()
    })
  }

  return {
    state: readonly(state),
    isLoading: readonly(isLoading),
    showSkeleton: readonly(showSkeleton),
    showContent: readonly(showContent),
    showFallback: readonly(showFallback),
    error: readonly(error),
    fallbackData: readonly(fallbackDataRef),
    fallbackMessage: readonly(fallbackMessageRef),

    startLoading,
    finishLoading,
    failLoading,
    reset,
    forceSkeleton
  }
}

/**
 * 创建多个骨架屏控制器的工厂函数
 * 用于需要多个独立骨架屏的组件（如 ChatSidebar）
 * @param configs 配置对象，key为控制器名称，value为配置选项
 * @returns 包含多个控制器的对象
 */
export function createSkeletonControllers<T extends Record<string, SkeletonOptions>>(
  configs: T
): { [K in keyof T]: SkeletonController } {
  const controllers = {} as { [K in keyof T]: SkeletonController }

  for (const [key, options] of Object.entries(configs)) {
    controllers[key as keyof T] = useSkeleton(options)
  }

  return controllers
}

/**
 * 预设的骨架屏配置
 */
export const SkeletonPresets = {
  /** 快速响应场景（500ms延迟，5秒超时） */
  fast: {
    showDelay: 500,
    maxDuration: 5000
  },
  /** 标准场景（1秒延迟，10秒超时） */
  standard: {
    showDelay: 1000,
    maxDuration: 10000
  },
  /** 慢速场景（2秒延迟，15秒超时） */
  slow: {
    showDelay: 2000,
    maxDuration: 15000
  },
  /** 即时显示（无延迟，10秒超时） */
  immediate: {
    showDelay: 0,
    maxDuration: 10000
  }
} as const
