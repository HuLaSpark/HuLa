import { ref } from 'vue'
import { ImUrlEnum } from '@/enums'
import { imRequest } from '@/utils/ImRequestUtils'

export type AssistantModelPreset = {
  id: string
  modelKey: string
  modelName: string
  modelUrl: string
  description: string
  status: boolean
  version: string
}

const assistantModelPresets = ref<AssistantModelPreset[]>([])
const assistantModelLoaded = ref(false)
const assistantModelLoading = ref(false)
const assistantModelError = ref<unknown>(null)
const assistantModelMeta = ref<Record<string, { name: string; version: string }>>({})

const appendVersionQuery = (url: string, version: string) => {
  const encoded = encodeURIComponent(version)
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encoded}`
}

const fetchAssistantModelPresets = async (force = false) => {
  if (assistantModelLoading.value || (assistantModelLoaded.value && !force)) return
  assistantModelLoading.value = true
  assistantModelError.value = null
  try {
    const response = await imRequest<AssistantModelPreset[]>({
      url: ImUrlEnum.GET_ASSISTANT_MODEL_LIST
    })
    const normalized = (response ?? []).map((preset) => ({
      ...preset,
      modelUrl: appendVersionQuery(preset.modelUrl, preset.version)
    }))
    const sorted = normalized.slice().sort((a, b) => Number(a.id) - Number(b.id))
    const metaMap: Record<string, { name: string; version: string }> = {}
    for (const preset of sorted) {
      metaMap[preset.modelUrl] = {
        name: preset.modelName,
        version: preset.version
      }
    }
    assistantModelMeta.value = metaMap
    assistantModelPresets.value = sorted
  } catch (error) {
    console.error('获取 AI 模型列表失败:', error)
    assistantModelError.value = error
    assistantModelPresets.value = []
    assistantModelMeta.value = {}
  } finally {
    assistantModelLoading.value = false
    assistantModelLoaded.value = true
  }
}

export const useAssistantModelPresets = () => ({
  presets: assistantModelPresets,
  loaded: assistantModelLoaded,
  loading: assistantModelLoading,
  error: assistantModelError,
  fetchAssistantModelPresets,
  metaMap: assistantModelMeta
})
