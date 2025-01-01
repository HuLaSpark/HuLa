import { Ref, nextTick } from 'vue'
import { TriggerEnum } from '@/enums/index'

interface TriggerContext {
  range: Range
  selection: Selection
  keyword: string
}

interface TriggerStrategy {
  shouldTrigger: (text: string, cursorPosition: number) => boolean
  extractKeyword: (text: string, cursorPosition: number) => string | null
  handleTrigger: (context: TriggerContext) => Promise<void>
  resetState: () => void
}

/**
 * 特殊符号唤起的触发策略抽象类(已经用hooks实现，暂时不用，后续有多种唤起才使用)
 */
abstract class AbstractTriggerStrategy implements TriggerStrategy {
  protected readonly triggerSymbol: string
  protected readonly pattern: RegExp

  constructor(triggerSymbol: string) {
    this.triggerSymbol = triggerSymbol
    this.pattern = new RegExp(`\\${triggerSymbol}([^\\${triggerSymbol}]*)$`)
  }

  shouldTrigger(text: string, cursorPosition: number): boolean {
    const searchStr = text.slice(0, cursorPosition)
    return this.pattern.test(searchStr)
  }

  extractKeyword(text: string, cursorPosition: number): string | null {
    const searchStr = text.slice(0, cursorPosition)
    const matches = this.pattern.exec(searchStr)
    return matches && matches.length > 1 ? matches[1] : null
  }

  abstract handleTrigger(context: TriggerContext): Promise<void>
  abstract resetState(): void
}

interface TriggerState {
  list: Ref<unknown[]>
  isVisible: Ref<boolean>
  keyword: Ref<string>
  optionsClass: string
}

class UnifiedTriggerStrategy extends AbstractTriggerStrategy {
  private readonly state: TriggerState

  constructor(triggerSymbol: string, state: TriggerState) {
    super(triggerSymbol)
    this.state = state
  }

  async handleTrigger(context: TriggerContext): Promise<void> {
    if (this.state.list.value.length === 0) {
      this.resetState()
      return
    }

    this.state.isVisible.value = true
    this.state.keyword.value = context.keyword

    const res = context.range.getBoundingClientRect()
    await nextTick(() => {
      const dom = document.querySelector(this.state.optionsClass) as HTMLElement
      dom.style.position = 'fixed'
      dom.style.height = 'auto'
      dom.style.maxHeight = '190px'
      dom.style.left = `${res.x - 20}px`
      dom.style.top = `${res.y - (dom.offsetHeight + 5)}px`
    })
  }

  resetState(): void {
    this.state.isVisible.value = false
    this.state.keyword.value = ''
  }
}

/** 触发策略映射实例 */
let triggerStrategyMap: Record<TriggerEnum, TriggerStrategy> | null = null

/** 创建触发策略映射工厂函数 */
export const createTriggerStrategyMap = (
  personList: Ref<unknown[]>,
  aiModelList: Ref<unknown[]>,
  topicList: Ref<unknown[]>,
  ait: Ref<boolean>,
  aitKey: Ref<string>,
  aiDialogVisible: Ref<boolean>,
  aiKeyword: Ref<string>,
  topicDialogVisible: Ref<boolean>,
  topicKeyword: Ref<string>
): Record<TriggerEnum, TriggerStrategy> => {
  triggerStrategyMap = {
    [TriggerEnum.MENTION]: new UnifiedTriggerStrategy(TriggerEnum.MENTION, {
      list: personList,
      isVisible: ait,
      keyword: aitKey,
      optionsClass: '.ait-options'
    }),
    [TriggerEnum.AI]: new UnifiedTriggerStrategy(TriggerEnum.AI, {
      list: aiModelList,
      isVisible: aiDialogVisible,
      keyword: aiKeyword,
      optionsClass: '.AI-options'
    }),
    [TriggerEnum.TOPIC]: new UnifiedTriggerStrategy(TriggerEnum.TOPIC, {
      list: topicList,
      isVisible: topicDialogVisible,
      keyword: topicKeyword,
      optionsClass: '.topic-options'
    })
  }
  return triggerStrategyMap
}

/** 重置所有触发状态 */
export const resetAllTriggerStates = () => {
  if (triggerStrategyMap) {
    Object.values(triggerStrategyMap).forEach((strategy) => strategy.resetState())
  }
}
