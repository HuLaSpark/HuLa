import { defineStore } from 'pinia'
import { StoresEnum } from '@/enums'

type BotViewType = 'readme' | 'markdown' | 'web' | 'assistant'

export const useBotStore = defineStore(StoresEnum.BOT, () => {
  const viewType = ref<BotViewType>('readme')
  const readmeLang = ref<'zh' | 'en'>('zh')
  const markdownSource = ref('')
  const webUrl = ref('')
  const assistantText = ref('正在预览模型')

  const displayText = computed(() => {
    switch (viewType.value) {
      case 'readme':
        return readmeLang.value === 'zh' ? 'README (中文)' : 'README (English)'
      case 'markdown':
        if (!markdownSource.value) return 'Markdown 文档'
        return markdownSource.value.split('/').pop() || markdownSource.value
      case 'web':
        if (!webUrl.value) return '外部链接'
        return webUrl.value
      case 'assistant':
        return assistantText.value || '正在预览模型'
      default:
        return ''
    }
  })

  const setReadme = (lang: 'zh' | 'en') => {
    viewType.value = 'readme'
    readmeLang.value = lang
    markdownSource.value = ''
    webUrl.value = ''
  }

  const setMarkdown = (source: string) => {
    const decoded = (() => {
      try {
        return decodeURIComponent(source)
      } catch {
        return source
      }
    })()
    viewType.value = 'markdown'
    markdownSource.value = decoded
    webUrl.value = ''
  }

  const setWeb = (url: string) => {
    viewType.value = 'web'
    webUrl.value = url
  }

  const setAssistant = (text?: string) => {
    viewType.value = 'assistant'
    assistantText.value = text && text.trim().length ? text : '正在预览模型'
    markdownSource.value = ''
    webUrl.value = ''
  }

  const reset = () => {
    setReadme('zh')
  }

  return {
    viewType,
    readmeLang,
    markdownSource,
    webUrl,
    displayText,
    setReadme,
    setMarkdown,
    setWeb,
    setAssistant,
    reset
  }
})
