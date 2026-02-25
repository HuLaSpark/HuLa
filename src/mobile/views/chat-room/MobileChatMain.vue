<template>
  <MobileScaffold>
    <template #header>
      <HeaderBar
        ref="headerBar"
        :room-name="currentSession?.remark || currentSession?.name || ''"
        :msg-count="globalUnreadCount"
        :is-official="globalStore.currentSessionRoomId === '1'"
        @room-name-click="handleRoomNameClick" />
    </template>
    <template #container>
      <div v-if="isBotSession" class="mobile-assistant-container">
        <div class="mobile-assistant-toolbar">
          <n-dropdown
            trigger="click"
            :show-arrow="false"
            placement="bottom-end"
            :options="assistantModelDropdownOptions"
            @select="handleAssistantModelSelect">
            <div :class="['mobile-assistant-select', { active: selectedModelKey && selectedModelKey !== 'local' }]">
              <span class="mobile-assistant-select__text">{{ selectedModelLabel }}</span>
              <svg class="mobile-assistant-select__icon"><use href="#down"></use></svg>
            </div>
          </n-dropdown>
          <n-button class="mobile-assistant-import" size="small" strong secondary @click="handleAssistantImport">
            导入模型
          </n-button>
        </div>
        <HuLaAssistant :active="true" :custom-model="customModelPath" class="mobile-assistant-view" />
      </div>
      <div v-else @click="handleChatMainClick" class="h-full overflow-y-auto">
        <ChatMain @scroll="handleScroll" />
      </div>
    </template>
    <template #footer>
      <FooterBar v-if="!isBotSession" ref="footerBar"></FooterBar>
    </template>
  </MobileScaffold>
</template>

<script setup lang="ts">
import router from '@/router'
import { useGlobalStore } from '@/stores/global'
import { storeToRefs } from 'pinia'
import { UserType } from '@/enums'
import { open } from '@tauri-apps/plugin-dialog'
import HuLaAssistant from '@/components/rightBox/chatBox/HuLaAssistant.vue'
import { useAssistantModelPresets, type AssistantModelPreset } from '@/hooks/useAssistantModelPresets'

defineOptions({
  name: 'mobileChatRoomDefault'
})

const globalStore = useGlobalStore()
const { currentSession } = storeToRefs(globalStore)
const globalUnreadCount = computed(() => globalStore.unReadMark.newMsgUnreadCount ?? 0)

const props = defineProps<{
  uid?: ''
}>()

const isBotSession = computed(() => globalStore.currentSession?.account === UserType.BOT)
const selectedModelKey = ref<string | null>(null)
const customModelPath = ref<string | null>(null)

const { presets: assistantModelPresets, fetchAssistantModelPresets } = useAssistantModelPresets()
void fetchAssistantModelPresets()

const findPresetByKey = (key: string | null | undefined): AssistantModelPreset | undefined => {
  if (!key) return void 0
  return assistantModelPresets.value.find((preset) => preset.modelKey === key)
}

const formatPresetLabel = (preset: AssistantModelPreset) => {
  if (!preset.version || preset.modelName.includes(preset.version)) {
    return preset.modelName
  }
  return `${preset.modelName} (${preset.version})`
}

const assistantModelDropdownOptions = computed(() =>
  assistantModelPresets.value.map((preset) => ({
    key: preset.modelKey,
    label: formatPresetLabel(preset),
    extra: preset.description ?? (preset.version ? `版本 ${preset.version}` : void 0)
  }))
)

const selectedModelLabel = computed(() => {
  if (selectedModelKey.value === 'local') {
    return '本地模型'
  }
  const preset = findPresetByKey(selectedModelKey.value)
  if (preset) {
    return formatPresetLabel(preset)
  }
  const first = assistantModelPresets.value[0]
  return first ? formatPresetLabel(first) : '选择模型'
})

const handleChatMainClick = () => {
  // 移动端点击聊天区域不再自动关闭面板
  // 用户需要手动点击按钮来关闭面板
}

const handleScroll = () => {
  // 移动端滚动聊天区域不再自动关闭面板
  // 用户需要手动点击按钮来关闭面板
}

const handleRoomNameClick = () => {
  if (props.uid) {
    router.push(`/mobile/mobileFriends/friendInfo/${props.uid}`)
  }
}

const applyFirstPreset = (options?: { force?: boolean }) => {
  const firstPreset = assistantModelPresets.value[0]
  if (!firstPreset) {
    if (options?.force && selectedModelKey.value !== 'local') {
      selectedModelKey.value = null
      customModelPath.value = null
    }
    return
  }
  if (!options?.force && selectedModelKey.value === 'local') {
    return
  }
  selectedModelKey.value = firstPreset.modelKey
  customModelPath.value = firstPreset.modelUrl
}

const resetAssistantModel = (options?: { reapplyFirst?: boolean }) => {
  if (selectedModelKey.value !== 'local') {
    selectedModelKey.value = null
    customModelPath.value = null
  }
  if (options?.reapplyFirst) {
    applyFirstPreset({ force: true })
  }
}

watch(
  assistantModelPresets,
  (presets) => {
    if (!presets.length) {
      if (selectedModelKey.value !== 'local') {
        selectedModelKey.value = null
        customModelPath.value = null
      }
      return
    }
    if (selectedModelKey.value === 'local') {
      return
    }
    const current = presets.find((preset) => preset.modelKey === selectedModelKey.value)
    if (current) {
      customModelPath.value = current.modelUrl
    } else {
      applyFirstPreset({ force: true })
    }
  },
  { immediate: true }
)

watch(
  isBotSession,
  (isBot) => {
    if (isBot) {
      void fetchAssistantModelPresets(assistantModelPresets.value.length <= 1)
      applyFirstPreset({ force: true })
    } else {
      resetAssistantModel()
    }
  },
  { immediate: true }
)

watch(
  () => globalStore.currentSessionRoomId,
  () => {
    resetAssistantModel({ reapplyFirst: true })
  }
)

const handleAssistantModelSelect = (key: string | number) => {
  const preset = findPresetByKey(String(key))
  if (!preset) return
  if (selectedModelKey.value === preset.modelKey && customModelPath.value === preset.modelUrl) {
    return
  }
  selectedModelKey.value = preset.modelKey
  customModelPath.value = preset.modelUrl
}

const handleAssistantImport = async () => {
  try {
    const selected = await open({
      filters: [
        {
          name: '3D Models',
          extensions: ['glb', 'gltf', 'vrm']
        }
      ],
      multiple: false
    })
    if (!selected) return
    const filePath = Array.isArray(selected) ? selected[0] : selected
    selectedModelKey.value = 'local'
    customModelPath.value = filePath
  } catch (error) {
    console.error('选择模型文件失败:', error)
    window.$message?.error?.('选择模型文件失败，请重试')
  }
}
</script>

<style lang="scss">
@use '@/styles/scss/render-message';

.mobile-assistant-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.mobile-assistant-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding-bottom: 12px;
}

.mobile-assistant-select {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  color: #333;
  font-size: 13px;
  border: 1px solid #e3e3e3;

  &.active {
    color: #13987f;
    background: rgba(19, 152, 127, 0.15);
  }
}

.mobile-assistant-select__text {
  white-space: nowrap;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-assistant-select__icon {
  width: 12px;
  height: 12px;
  color: currentColor;
}

.mobile-assistant-import {
  white-space: nowrap;
}

.mobile-assistant-view {
  flex: 1;
  display: flex;
}
</style>
