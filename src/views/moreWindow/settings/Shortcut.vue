<template>
  <n-flex vertical :size="40">
    <!-- 全局快捷键总开关 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">全局快捷键</span>

      <n-flex class="item" align="center" justify="space-between">
        <n-flex vertical :size="8">
          <span>启用全局快捷键</span>
          <span class="text-(12px #909090)">关闭后下方所有快捷键将失效</span>
        </n-flex>

        <n-switch v-model:value="globalShortcutEnabled" @update:value="handleGlobalShortcutToggle" size="small" />
      </n-flex>
    </n-flex>

    <!-- 截图快捷键设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">功能快捷键</span>

      <n-flex class="item" :size="12" vertical>
        <!-- 截图快捷键 -->
        <n-flex align="center" justify="space-between">
          <n-flex vertical :size="8">
            <span>{{ shortcutConfigs.screenshot.displayName }}</span>
            <span class="text-(12px #909090)">按下快捷键即可开始截图</span>
          </n-flex>

          <n-flex align="center" :size="12">
            <n-tag v-if="shortcutRegistered !== null" :type="shortcutRegistered ? 'success' : 'error'" size="small">
              {{ shortcutRegistered ? '已绑定' : '未绑定' }}
            </n-tag>
            <n-input
              :value="screenshotShortcutDisplay"
              :placeholder="screenshotShortcutDisplay"
              style="width: 130px"
              class="border-(1px solid #90909080)"
              readonly
              size="small"
              :disabled="!globalShortcutEnabled"
              @keydown="handleShortcutInput"
              @focus="handleScreenshotFocus"
              @blur="handleScreenshotBlur">
              <template #suffix>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <svg
                      @click="resetScreenshotShortcut"
                      class="size-14px"
                      :class="globalShortcutEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'">
                      <use href="#return"></use>
                    </svg>
                  </template>
                  <span>重置</span>
                </n-tooltip>
              </template>
            </n-input>
          </n-flex>
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <!-- 打开主面板快捷键 -->
        <n-flex align="center" justify="space-between">
          <n-flex vertical :size="8">
            <span>{{ shortcutConfigs.openMainPanel.displayName }}</span>
            <span class="text-(12px #909090)">按下快捷键即可切换主面板显示状态</span>
          </n-flex>

          <n-flex align="center" :size="12">
            <n-tag
              v-if="openMainPanelShortcutRegistered !== null"
              :type="openMainPanelShortcutRegistered ? 'success' : 'error'"
              size="small">
              {{ openMainPanelShortcutRegistered ? '已绑定' : '未绑定' }}
            </n-tag>
            <n-input
              :value="openMainPanelShortcutDisplay"
              :placeholder="openMainPanelShortcutDisplay"
              style="width: 130px"
              class="border-(1px solid #90909080)"
              readonly
              size="small"
              :disabled="!globalShortcutEnabled"
              @keydown="handleOpenMainPanelShortcutInput"
              @focus="handleOpenMainPanelFocus"
              @blur="handleOpenMainPanelBlur">
              <template #suffix>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <svg
                      @click="resetOpenMainPanelShortcut"
                      class="size-14px"
                      :class="globalShortcutEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'">
                      <use href="#return"></use>
                    </svg>
                  </template>
                  <span>重置</span>
                </n-tooltip>
              </template>
            </n-input>
          </n-flex>
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 消息快捷键设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">消息快捷键</span>

      <n-flex class="item" align="center" justify="space-between">
        <n-flex vertical :size="8">
          <span>发送消息快捷键</span>
          <span class="text-(12px #909090)">在聊天输入框中按下快捷键发送消息</span>
        </n-flex>

        <n-flex align="center" :size="12">
          <n-select
            v-model:value="sendMessageShortcut"
            class="w-200px"
            size="small"
            label-field="label"
            :options="sendOptions"
            @blur="handleSendMessageBlur" />
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { emit, listen } from '@tauri-apps/api/event'
import { isRegistered } from '@tauri-apps/plugin-global-shortcut'
import { MacOsKeyEnum } from '@/enums'
import { useGlobalShortcut } from '@/hooks/useGlobalShortcut.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { isMac } from '@/utils/PlatformConstants'
import { sendOptions } from './config.ts'

// 快捷键配置管理
type ShortcutConfig = {
  key: 'screenshot' | 'openMainPanel'
  value: Ref<string>
  isCapturing: Ref<boolean>
  isRegistered: Ref<boolean | null>
  original: Ref<string>
  defaultValue: string
  eventName: string
  registrationEventName: string
  displayName: string
}

const settingStore = useSettingStore()
const { getDefaultShortcuts } = useGlobalShortcut()
const isMacPlatform = isMac()

// 统一的快捷键配置
const shortcutConfigs: Record<string, ShortcutConfig> = {
  screenshot: {
    key: 'screenshot',
    value: ref(settingStore.shortcuts?.screenshot),
    isCapturing: ref(false),
    isRegistered: ref<boolean | null>(null),
    original: ref(settingStore.shortcuts?.screenshot),
    defaultValue: getDefaultShortcuts().screenshot,
    eventName: 'shortcut-updated',
    registrationEventName: 'shortcut-registration-updated',
    displayName: '截图快捷键'
  },
  openMainPanel: {
    key: 'openMainPanel',
    value: ref(settingStore.shortcuts?.openMainPanel),
    isCapturing: ref(false),
    isRegistered: ref<boolean | null>(null),
    original: ref(settingStore.shortcuts?.openMainPanel),
    defaultValue: getDefaultShortcuts().openMainPanel,
    eventName: 'open-main-panel-shortcut-updated',
    registrationEventName: 'open-main-panel-shortcut-registration-updated',
    displayName: '切换主面板快捷键'
  }
}

// 向后兼容的别名（仅保留模板中使用的）
const screenshotShortcut = shortcutConfigs.screenshot.value
const openMainPanelShortcut = shortcutConfigs.openMainPanel.value
const shortcutRegistered = shortcutConfigs.screenshot.isRegistered
const openMainPanelShortcutRegistered = shortcutConfigs.openMainPanel.isRegistered

// 全局快捷键开关状态
const globalShortcutEnabled = ref(settingStore.shortcuts?.globalEnabled ?? false)

// 发送消息快捷键单独处理
const sendMessageShortcut = ref(settingStore.chat?.sendKey)

// 将快捷键转换为平台对应的显示文本
const formatShortcutDisplay = (shortcut: string) => {
  if (isMacPlatform) {
    // Mac 平台特殊处理：按照标准顺序排列修饰键
    const keys = shortcut.split('+').map((key) => key.trim())

    const displayKeys: string[] = []
    const mainKeys: string[] = []

    // 解析按键类型
    keys.forEach((key) => {
      if (['Cmd', 'Command'].includes(key)) {
        displayKeys.push(MacOsKeyEnum['⌘'])
      } else if (key === 'Ctrl') {
        displayKeys.push(MacOsKeyEnum['^'])
      } else if (key === 'Alt') {
        displayKeys.push(MacOsKeyEnum['⌥'])
      } else if (key === 'Shift') {
        displayKeys.push(MacOsKeyEnum['⇧'])
      } else {
        mainKeys.push(key.toLowerCase())
      }
    })

    // Mac 标准顺序：⌘ -> ^ -> ⌥ -> ⇧
    const orderedKeys: string[] = []
    if (displayKeys.includes(MacOsKeyEnum['⌘'])) orderedKeys.push(MacOsKeyEnum['⌘'])
    if (displayKeys.includes(MacOsKeyEnum['^'])) orderedKeys.push(MacOsKeyEnum['^'])
    if (displayKeys.includes(MacOsKeyEnum['⌥'])) orderedKeys.push(MacOsKeyEnum['⌥'])
    if (displayKeys.includes(MacOsKeyEnum['⇧'])) orderedKeys.push(MacOsKeyEnum['⇧'])

    // 添加主键
    orderedKeys.push(...mainKeys)

    return orderedKeys.join(' + ')
  }

  // 其他平台的处理
  return shortcut
    .split('+')
    .map((key) => key.trim())
    .map((key) => {
      if (['Ctrl', 'Command', 'Alt', 'Shift'].includes(key)) {
        return key.toLowerCase()
      }
      return key.toLowerCase()
    })
    .join(' + ')
}

// 输入框显示的快捷键文本（用于显示，不用于绑定）
const screenshotShortcutDisplay = computed(() => {
  return formatShortcutDisplay(screenshotShortcut.value)
})

const openMainPanelShortcutDisplay = computed(() => {
  return formatShortcutDisplay(openMainPanelShortcut.value)
})

// 通用的store变化监听
const createShortcutWatcher = (config: ShortcutConfig, storeGetter: () => string | undefined) => {
  return watch(
    storeGetter,
    (newValue) => {
      if (newValue && !config.isCapturing.value) {
        config.value.value = newValue
        config.original.value = newValue
      }
    },
    { immediate: true }
  )
}

// 监听 store 变化，确保数据同步
createShortcutWatcher(shortcutConfigs.screenshot, () => settingStore.shortcuts?.screenshot)
createShortcutWatcher(shortcutConfigs.openMainPanel, () => settingStore.shortcuts?.openMainPanel)

watch(
  () => settingStore.chat?.sendKey,
  (newValue) => {
    if (newValue) {
      sendMessageShortcut.value = newValue
    }
  },
  { immediate: true }
)

// 监听 store 中全局快捷键开关状态变化
watch(
  () => settingStore.shortcuts?.globalEnabled,
  (newValue) => {
    if (newValue !== undefined) {
      globalShortcutEnabled.value = newValue
    }
  },
  { immediate: true }
)

// 通用的快捷键绑定检查
const checkShortcutRegistration = async (config: ShortcutConfig) => {
  // 如果全局快捷键被关闭，则显示为未绑定状态
  if (!globalShortcutEnabled.value) {
    config.isRegistered.value = false
    return
  }

  config.isRegistered.value = await isRegistered(config.value.value)
}

// 通用的快捷键输入处理
const createShortcutInputHandler = (config: ShortcutConfig) => {
  return (event: KeyboardEvent) => {
    if (!config.isCapturing.value || !globalShortcutEnabled.value) return

    event.preventDefault()
    event.stopPropagation()

    const keys: string[] = []

    // 检查修饰键
    if (isMacPlatform) {
      // Mac 上区分 Control 键和 Command 键
      if (event.ctrlKey) {
        keys.push('Ctrl')
      }
      if (event.metaKey) {
        keys.push('Cmd')
      }
    } else {
      // 其他平台只使用 Ctrl 键
      if (event.ctrlKey) {
        keys.push('Ctrl')
      }
    }

    if (event.altKey) {
      keys.push('Alt')
    }
    if (event.shiftKey) {
      keys.push('Shift')
    }

    // 获取主键
    const mainKey = event.key
    if (mainKey && !['Control', 'Alt', 'Shift', 'Meta', 'Cmd'].includes(mainKey)) {
      keys.push(mainKey.toUpperCase())
    }

    // 至少需要一个修饰键和一个主键
    if (keys.length >= 2) {
      config.value.value = keys.join('+')
    }
  }
}

// 创建具体的处理函数
const handleShortcutInput = createShortcutInputHandler(shortcutConfigs.screenshot)
const handleOpenMainPanelShortcutInput = createShortcutInputHandler(shortcutConfigs.openMainPanel)

// 通用的焦点处理
const createFocusHandler = (config: ShortcutConfig) => {
  return async () => {
    // 如果全局快捷键被关闭，则不允许进入编辑模式
    if (!globalShortcutEnabled.value) {
      return
    }

    config.isCapturing.value = true
    config.original.value = config.value.value
    console.log(`🎯 开始编辑${config.displayName}`)
  }
}

const createBlurHandler = (config: ShortcutConfig, saveFunction: () => Promise<void>) => {
  return async () => {
    config.isCapturing.value = false
    console.log(`✅ 结束编辑${config.displayName}`)

    // 如果快捷键有变化，则保存
    if (config.value.value !== config.original.value) {
      await saveFunction()
    }
  }
}

// 创建具体的焦点处理函数
const handleScreenshotFocus = createFocusHandler(shortcutConfigs.screenshot)
const handleOpenMainPanelFocus = createFocusHandler(shortcutConfigs.openMainPanel)

// 处理发送消息快捷键失去焦点事件（自动保存）
const handleSendMessageBlur = async () => {
  // 如果快捷键有变化，则保存
  const currentSendKey = settingStore.chat?.sendKey || 'Enter'
  if (sendMessageShortcut.value !== currentSendKey) {
    await saveSendMessageShortcut()
  }
}

// 通用的保存快捷键方法
const createSaveShortcutFunction = (config: ShortcutConfig) => {
  return async () => {
    try {
      console.log(`💾 [Settings] 开始保存${config.displayName}: ${config.value.value}`)

      // 根据快捷键类型调用对应的store方法
      if (config.key === 'screenshot') {
        settingStore.setScreenshotShortcut(config.value.value)
      } else if (config.key === 'openMainPanel') {
        settingStore.setOpenMainPanelShortcut(config.value.value)
      }

      config.original.value = config.value.value
      console.log(`💾 [Settings] 已保存到 Pinia store`)

      // 通知主窗口更新快捷键（跨窗口事件）
      console.log(`📡 [Settings] 发送 ${config.eventName} 事件到主窗口`)
      await emit(config.eventName, { shortcut: config.value.value })
      console.log(`📡 [Settings] ${config.eventName} 事件已发送`)

      window.$message.success(`${config.displayName}已更新`)
    } catch (error) {
      console.error(`Failed to save ${config.key} shortcut:`, error)
      window.$message.error(`${config.displayName}设置失败`)

      // 恢复原来的快捷键
      config.value.value = config.original.value
    }
  }
}

// 通用的重置快捷键方法
const createResetShortcutFunction = (config: ShortcutConfig, saveFunction: () => Promise<void>) => {
  return async () => {
    // 如果全局快捷键被关闭，则不执行重置操作
    if (!globalShortcutEnabled.value) {
      return
    }

    config.value.value = config.defaultValue
    await saveFunction()
  }
}

// 创建具体的保存函数
const saveScreenshotShortcut = createSaveShortcutFunction(shortcutConfigs.screenshot)
const saveOpenMainPanelShortcut = createSaveShortcutFunction(shortcutConfigs.openMainPanel)

// 创建具体的重置函数
const resetScreenshotShortcut = createResetShortcutFunction(shortcutConfigs.screenshot, saveScreenshotShortcut)
const resetOpenMainPanelShortcut = createResetShortcutFunction(shortcutConfigs.openMainPanel, saveOpenMainPanelShortcut)

// 创建失焦处理函数
const handleScreenshotBlur = createBlurHandler(shortcutConfigs.screenshot, saveScreenshotShortcut)
const handleOpenMainPanelBlur = createBlurHandler(shortcutConfigs.openMainPanel, saveOpenMainPanelShortcut)

// 处理全局快捷键开关切换
const handleGlobalShortcutToggle = async (enabled: boolean) => {
  try {
    console.log(`🔧 [Settings] 全局快捷键开关切换为: ${enabled ? '开启' : '关闭'}`)

    // 保存到 store
    settingStore.setGlobalShortcutEnabled(enabled)

    // 通知主窗口更新全局快捷键状态
    await emit('global-shortcut-enabled-changed', { enabled })

    window.$message.success(`全局快捷键已${enabled ? '开启' : '关闭'}`)
  } catch (error) {
    console.error('Failed to toggle global shortcut:', error)
    window.$message.error('全局快捷键开关设置失败')

    // 恢复原来的值
    globalShortcutEnabled.value = !enabled
  }
}

// 保存发送消息快捷键设置
const saveSendMessageShortcut = async () => {
  try {
    // 保存到 pinia store
    settingStore.setSendMessageShortcut(sendMessageShortcut.value)

    window.$message.success('发送消息快捷键已更新')
  } catch (error) {
    console.error('Failed to save send message shortcut:', error)
    window.$message.error('发送消息快捷键设置失败')

    // 恢复原来的值
    sendMessageShortcut.value = settingStore.chat?.sendKey || 'Enter'
  }
}

// 通用的事件监听器创建
const createRegistrationListener = (config: ShortcutConfig) => {
  return listen(config.registrationEventName, (event: any) => {
    const { shortcut, registered } = event.payload
    console.log(`📡 [Settings] 收到${config.displayName}状态更新: ${shortcut} -> ${registered ? '已绑定' : '未绑定'}`)

    // 只有当前快捷键匹配时才更新状态
    if (shortcut === config.value.value) {
      console.log(`📡 [Settings] ${config.displayName}匹配，更新状态为: ${registered ? '已绑定' : '未绑定'}`)
      config.isRegistered.value = registered
    } else {
      console.log(`📡 [Settings] ${config.displayName}不匹配，忽略状态更新`)
    }
  })
}

onMounted(async () => {
  // 检查所有快捷键的绑定状态
  await Promise.all([
    checkShortcutRegistration(shortcutConfigs.screenshot),
    checkShortcutRegistration(shortcutConfigs.openMainPanel)
  ])

  // 创建事件监听器
  const unlistenScreenshot = await createRegistrationListener(shortcutConfigs.screenshot)
  const unlistenOpenMainPanel = await createRegistrationListener(shortcutConfigs.openMainPanel)

  // 组件卸载时取消监听
  onUnmounted(() => {
    unlistenScreenshot()
    unlistenOpenMainPanel()
  })
})
</script>

<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full p-12px box-border border-(solid 1px [--line-color]) custom-shadow;
}

:deep(.n-input.n-input--focus) {
  border-width: 2px;
  border-color: #13987f !important;
}
</style>
