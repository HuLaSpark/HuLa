interface ViewTransition {
  ready: Promise<void>
}

interface Document {
  startViewTransition?: (callback: () => Promise<void> | void) => ViewTransition
}

/** 通用类型 */
declare namespace Common {
  /**
   * 策略模式
   * [状态, 为true时执行的回调函数]
   */
  type StrategyAction = [boolean, () => void]

  /** 选项数据 */
  type OptionWithKey<K> = { value: K; label: string }
}

/** 构建时间 */
declare const PROJECT_BUILD_TIME: string

export type ProxySettings = {
  apiType: string
  apiIp: string
  apiPort: string
  apiSuffix: string
  wsType: string
  wsIp: string
  wsPort: string
  wsSuffix: string
}
