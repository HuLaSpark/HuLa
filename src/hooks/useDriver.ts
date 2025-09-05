import { type Config, type Driver, type DriveStep, driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import '@/styles/scss/global/driver.scss'

/**
 * Driver.js 步骤配置接口
 */
export interface DriverStepConfig extends Omit<DriveStep, 'popover'> {
  element: string
  popover?: {
    title?: string
    description?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    onNextClick?: () => void
    onPrevClick?: () => void
    onCloseClick?: () => void
  }
}

/**
 * Driver.js 配置选项接口
 */
export interface DriverConfig extends Omit<Config, 'steps'> {
  nextBtnText?: string
  prevBtnText?: string
  doneBtnText?: string
  showButtons?: Array<'next' | 'previous' | 'close'>
  showProgress?: boolean
  allowClose?: boolean
  popoverClass?: string
  progressText?: string
}

/**
 * useDriver hooks 返回值接口
 */
export interface UseDriverReturn {
  /** Driver 实例 */
  driverInstance: Driver | null
  /** 开始引导 */
  startTour: () => void
  /** 停止引导 */
  stopTour: () => void
  /** 移动到下一步 */
  moveNext: () => void
  /** 移动到上一步 */
  movePrevious: () => void
  /** 移动到指定步骤 */
  moveTo: (stepIndex: number) => void
  /** 重新初始化引导 */
  reinitialize: (newSteps: DriverStepConfig[], newConfig?: Partial<DriverConfig>) => void
}

/**
 * Driver.js 引导功能 hooks
 * @param steps 引导步骤配置数组
 * @param config 可选的 Driver 配置
 * @returns useDriver 返回值对象
 */
export const useDriver = (steps: DriverStepConfig[], config: DriverConfig = {}): UseDriverReturn => {
  let driverInstance: Driver | null = null

  // 默认配置
  const defaultConfig: DriverConfig = {
    progressText: '{{current}}/{{total}}',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    doneBtnText: '完成',
    showButtons: ['next', 'previous'],
    showProgress: true,
    allowClose: false,
    popoverClass: 'driverjs-theme'
  }

  // 合并配置
  const mergedConfig = { ...defaultConfig, ...config }

  /**
   * 处理步骤中的自定义点击事件
   * @param step 步骤配置
   * @returns 处理后的步骤配置
   */
  const processStep = (step: DriverStepConfig): DriveStep => {
    const processedStep: DriveStep = {
      element: step.element,
      popover: step.popover
        ? {
            title: step.popover.title,
            description: step.popover.description,
            side: step.popover.side,
            align: step.popover.align
          }
        : undefined
    }

    // 处理自定义点击事件
    if (step.popover?.onNextClick) {
      processedStep.popover = {
        ...processedStep.popover,
        onNextClick: () => {
          step.popover!.onNextClick!()
          // 如果有自定义的 onNextClick，需要在 nextTick 后手动移动到下一步
          nextTick(() => {
            if (driverInstance) {
              driverInstance.moveNext()
            }
          })
        }
      }
    }

    if (step.popover?.onPrevClick) {
      processedStep.popover = {
        ...processedStep.popover,
        onPrevClick: step.popover.onPrevClick
      }
    }

    if (step.popover?.onCloseClick) {
      processedStep.popover = {
        ...processedStep.popover,
        onCloseClick: step.popover.onCloseClick
      }
    }

    return processedStep
  }

  /**
   * 初始化 Driver 实例
   */
  const initializeDriver = () => {
    const processedSteps = steps.map(processStep)

    driverInstance = driver({
      ...mergedConfig,
      steps: processedSteps
    })
  }

  /**
   * 开始引导
   */
  const startTour = () => {
    if (!driverInstance) {
      initializeDriver()
    }
    driverInstance?.drive()
  }

  /**
   * 停止引导
   */
  const stopTour = () => {
    driverInstance?.destroy()
    driverInstance = null
  }

  /**
   * 移动到下一步
   */
  const moveNext = () => {
    driverInstance?.moveNext()
  }

  /**
   * 移动到上一步
   */
  const movePrevious = () => {
    driverInstance?.movePrevious()
  }

  /**
   * 移动到指定步骤
   * @param stepIndex 步骤索引（从0开始）
   */
  const moveTo = (stepIndex: number) => {
    driverInstance?.moveTo(stepIndex)
  }

  /**
   * 重新初始化引导
   * @param newSteps 新的步骤配置
   * @param newConfig 新的配置（可选）
   */
  const reinitialize = (newSteps: DriverStepConfig[], newConfig?: Partial<DriverConfig>) => {
    // 销毁现有实例
    stopTour()

    // 更新步骤和配置
    steps.splice(0, steps.length, ...newSteps)
    if (newConfig) {
      Object.assign(mergedConfig, newConfig)
    }

    // 重新初始化
    initializeDriver()
  }

  // 初始化 Driver 实例
  initializeDriver()

  return {
    driverInstance,
    startTour,
    stopTour,
    moveNext,
    movePrevious,
    moveTo,
    reinitialize
  }
}
