import { nextTick, type Ref } from 'vue'
import { TriggerEnum } from '@/enums'

// 添加选择器常量
const SELECTORS = {
  MENTION: '.ait-options',
  AI: '.AI-options',
  TOPIC: '.topic-options'
} as const

interface TriggerContext {
  range: Range
  selection: Selection
  keyword: string
}

export const useTrigger = (
  personList: Ref<unknown[]>,
  groupedAIModels: Ref<unknown[]>,
  topicList: Ref<unknown[]>,
  ait: Ref<boolean>,
  aitKey: Ref<string>,
  aiDialogVisible: Ref<boolean>,
  aiKeyword: Ref<string>,
  topicDialogVisible: Ref<boolean>,
  topicKeyword: Ref<string>
) => {
  // 产品阶段暂不使用 / 唤起 AI，保留开关便于后续快速恢复
  const enableAITrigger = false

  /** 重置所有状态 */
  const resetAllStates = () => {
    ait.value = false
    aitKey.value = ''
    aiDialogVisible.value = false
    aiKeyword.value = ''
    topicDialogVisible.value = false
    topicKeyword.value = ''
  }

  /** 处理 @ 提及 */
  const handleMention = async (context: TriggerContext) => {
    if (personList.value.length === 0) {
      resetAllStates()
      return
    }

    ait.value = true
    aitKey.value = context.keyword

    const res = context.range.getBoundingClientRect()
    await nextTick(() => {
      const dom = document.querySelector(SELECTORS.MENTION) as HTMLElement
      if (!dom) return
      dom.style.position = 'fixed'
      dom.style.height = 'auto'
      dom.style.maxHeight = '190px'
      dom.style.left = `${res.x - 20}px`
      dom.style.top = `${res.y - (dom.offsetHeight + 5)}px`
    })
  }

  /** 处理AI对话 */
  const handleAI = async (context: TriggerContext) => {
    if (!enableAITrigger) {
      // 当功能关闭时直接返回，避免弹层状态被重新打开
      return
    }

    if (groupedAIModels.value.length === 0) {
      resetAllStates()
      return
    }

    const keyword = context.keyword?.trim?.() ?? ''
    if (!keyword) {
      resetAllStates()
      return
    }

    aiKeyword.value = keyword

    const res = context.range.getBoundingClientRect()
    await nextTick()
    if (groupedAIModels.value.length === 0) {
      resetAllStates()
      return
    }
    aiDialogVisible.value = true
    const dom = document.querySelector(SELECTORS.AI) as HTMLElement
    if (!dom) return
    dom.style.position = 'fixed'
    dom.style.height = 'auto'
    dom.style.maxHeight = '190px'
    dom.style.left = `${res.x - 20}px`
    dom.style.top = `${res.y - (dom.offsetHeight + 5)}px`
  }

  /** 处理话题标签 */
  const handleTopic = async (context: TriggerContext) => {
    if (topicList.value.length === 0) {
      resetAllStates()
      return
    }

    topicDialogVisible.value = true
    topicKeyword.value = context.keyword

    const res = context.range.getBoundingClientRect()
    await nextTick(() => {
      const dom = document.querySelector(SELECTORS.TOPIC) as HTMLElement
      if (!dom) return
      dom.style.position = 'fixed'
      dom.style.height = 'auto'
      dom.style.maxHeight = '190px'
      dom.style.left = `${res.x - 20}px`
      dom.style.top = `${res.y - (dom.offsetHeight + 5)}px`
    })
  }

  /** 检查是否应该触发 */
  const shouldTrigger = (text: string, cursorPosition: number, triggerSymbol: string) => {
    try {
      // 确保有效的文本和光标位置
      if (!text || cursorPosition === undefined || cursorPosition < 0) {
        return false
      }

      const searchStr = text.slice(0, cursorPosition)
      const pattern = new RegExp(`\\${triggerSymbol}([^\\${triggerSymbol}]*)$`)
      return pattern.test(searchStr)
    } catch (err) {
      console.error('检查触发条件出错:', err)
      return false
    }
  }

  /** 提取关键词 */
  const extractKeyword = (text: string, cursorPosition: number, triggerSymbol: string) => {
    try {
      if (!text || cursorPosition === undefined || cursorPosition < 0) {
        return null
      }

      const searchStr = text.slice(0, cursorPosition)
      const pattern = new RegExp(`\\${triggerSymbol}([^\\${triggerSymbol}]*)$`)
      const matches = pattern.exec(searchStr)
      return matches && matches.length > 1 ? matches[1] : null
    } catch (err) {
      console.error('提取关键词出错:', err)
      return null
    }
  }

  /** 处理触发 */
  const handleTrigger = async (text: string, cursorPosition: number, context: TriggerContext) => {
    try {
      let hasTriggered = false

      // 检查@提及
      if (shouldTrigger(text, cursorPosition, TriggerEnum.MENTION)) {
        const keyword = extractKeyword(text, cursorPosition, TriggerEnum.MENTION)
        if (keyword !== null) {
          await handleMention({ ...context, keyword })
          hasTriggered = ait.value
        }
      }
      // 检查AI对话
      // 仅在开关开启时解析 / 触发，避免误触发已禁用的逻辑
      else if (enableAITrigger && shouldTrigger(text, cursorPosition, TriggerEnum.AI)) {
        const keyword = extractKeyword(text, cursorPosition, TriggerEnum.AI)
        if (keyword !== null) {
          await handleAI({ ...context, keyword })
          hasTriggered = aiDialogVisible.value
        }
      }
      // 检查话题标签
      else if (shouldTrigger(text, cursorPosition, TriggerEnum.TOPIC)) {
        const keyword = extractKeyword(text, cursorPosition, TriggerEnum.TOPIC)
        if (keyword !== null) {
          await handleTopic({ ...context, keyword })
          hasTriggered = topicDialogVisible.value
        }
      }

      if (!hasTriggered) {
        resetAllStates()
      }

      return hasTriggered
    } catch (err) {
      console.error('处理触发事件出错:', err)
      resetAllStates()
      return false
    }
  }

  return {
    handleTrigger,
    resetAllStates
  }
}
