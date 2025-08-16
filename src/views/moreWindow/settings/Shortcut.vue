<template>
  <n-flex vertical :size="40">
    <!-- 截图快捷键设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">截图快捷键</span>

      <n-flex class="item" :size="12" vertical>
        <!-- 截图快捷键 -->
        <n-flex align="center" justify="space-between">
          <n-flex vertical :size="4">
            <span>截图快捷键</span>
            <span class="text-(12px #909090)">按下快捷键即可开始截图</span>
          </n-flex>

          <n-flex align="center" :size="12">
            <n-tag v-if="shortcutRegistered !== null" :type="shortcutRegistered ? 'success' : 'error'" size="small">
              {{ shortcutRegistered ? '已注册' : '未注册' }}
            </n-tag>
            <n-input
              :value="screenshotShortcutDisplay"
              :placeholder="screenshotShortcutDisplay"
              style="width: 120px"
              class="border-(1px solid #90909080)"
              readonly
              @keydown="handleShortcutInput"
              @focus="handleScreenshotFocus"
              @blur="handleScreenshotBlur" />
            <n-button @click="resetScreenshotShortcut" size="small" secondary>重置</n-button>
          </n-flex>
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 聊天快捷键设置 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">聊天快捷键</span>

      <n-flex class="item" :size="12" vertical>
        <!-- 发送消息快捷键 -->
        <n-flex align="center" justify="space-between">
          <n-flex vertical :size="4">
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
  </n-flex>
</template>

<script setup lang="ts">
import { emit, listen } from '@tauri-apps/api/event'
import { isRegistered } from '@tauri-apps/plugin-global-shortcut'
import { type } from '@tauri-apps/plugin-os'
import { useMessage } from 'naive-ui'
import { useSettingStore } from '@/stores/setting.ts'
import { sendOptions } from './config.ts'

const message = useMessage()
const settingStore = useSettingStore()

// 从 store 获取设置，添加防护性检查
const screenshotShortcut = ref(settingStore.shortcuts?.screenshot)
const sendMessageShortcut = ref(settingStore.chat?.sendKey)

// 状态变量
const isCapturingShortcut = ref(false)
const shortcutRegistered = ref<boolean | null>(null) // null 表示未知状态，避免初始化闪烁
const originalScreenshotShortcut = ref(settingStore.shortcuts?.screenshot)

// 将快捷键转换为平台对应的显示文本
const formatShortcutDisplay = (shortcut: string) => {
  const isWindows = type() === 'windows'
  return shortcut
    .replace('CmdOrCtrl', isWindows ? 'Ctrl' : 'Command')
    .replace('Cmd', 'Command')
    .split('+')
    .map((key) => key.trim())
    .map((key) => {
      // 将按键名称格式化为小写（除了特殊键）
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

// 检查快捷键是否已注册
const checkShortcutRegistration = async () => {
  shortcutRegistered.value = await isRegistered(screenshotShortcut.value)
}

// 处理快捷键输入
const handleShortcutInput = (event: KeyboardEvent) => {
  if (!isCapturingShortcut.value) return

  event.preventDefault()
  event.stopPropagation()

  const keys: string[] = []

  // 检查修饰键 - 统一使用CmdOrCtrl以保证跨平台兼容性
  if (event.ctrlKey || event.metaKey) {
    keys.push('CmdOrCtrl')
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
    // 更新内部存储值（使用CmdOrCtrl格式，显示会通过computed自动格式化）
    screenshotShortcut.value = keys.join('+')
  }
}

// 处理截图快捷键焦点事件
const handleScreenshotFocus = async () => {
  isCapturingShortcut.value = true
  originalScreenshotShortcut.value = screenshotShortcut.value

  console.log('🎯 开始编辑截图快捷键')
  // 注意：快捷键的注册/取消注册由主窗口负责，这里只处理UI状态
}

// 处理截图快捷键失去焦点事件（自动保存）
const handleScreenshotBlur = async () => {
  isCapturingShortcut.value = false

  console.log('✅ 结束编辑截图快捷键')

  // 如果快捷键有变化，则保存
  if (screenshotShortcut.value !== originalScreenshotShortcut.value) {
    await saveScreenshotShortcut()
  }
  // 注意：快捷键的重新注册由主窗口负责，这里只处理保存逻辑
}

// 处理发送消息快捷键失去焦点事件（自动保存）
const handleSendMessageBlur = async () => {
  // 如果快捷键有变化，则保存
  const currentSendKey = settingStore.chat?.sendKey || 'Enter'
  if (sendMessageShortcut.value !== currentSendKey) {
    await saveSendMessageShortcut()
  }
}

// 重置截图快捷键
const resetScreenshotShortcut = async () => {
  screenshotShortcut.value = 'CmdOrCtrl+Alt+H'
  // 重置后自动保存
  await saveScreenshotShortcut()
}

// 保存截图快捷键设置
const saveScreenshotShortcut = async () => {
  try {
    console.log(`💾 [Settings] 开始保存截图快捷键: ${screenshotShortcut.value}`)

    // 保存到 pinia store
    settingStore.setScreenshotShortcut(screenshotShortcut.value)
    originalScreenshotShortcut.value = screenshotShortcut.value
    console.log(`💾 [Settings] 已保存到 Pinia store`)

    // 通知主窗口更新快捷键（跨窗口事件）
    console.log(`📡 [Settings] 发送 shortcut-updated 事件到主窗口`)
    await emit('shortcut-updated', { shortcut: screenshotShortcut.value })
    console.log(`📡 [Settings] shortcut-updated 事件已发送`)

    // 不再使用固定延迟，而是等待主窗口的反馈事件
    // 主窗口处理完成后会发送 'shortcut-registration-updated' 事件

    message.success('截图快捷键已更新')
  } catch (error) {
    console.error('Failed to save shortcut:', error)
    message.error('快捷键设置失败')

    // 恢复原来的快捷键
    screenshotShortcut.value = originalScreenshotShortcut.value
  }
}

// 保存发送消息快捷键设置
const saveSendMessageShortcut = async () => {
  try {
    // 保存到 pinia store
    settingStore.setSendMessageShortcut(sendMessageShortcut.value)

    message.success('发送消息快捷键已更新')
  } catch (error) {
    console.error('Failed to save send message shortcut:', error)
    message.error('发送消息快捷键设置失败')

    // 恢复原来的值
    sendMessageShortcut.value = settingStore.chat?.sendKey || 'Enter'
  }
}

// 监听 store 变化，确保数据同步
watch(
  () => settingStore.shortcuts?.screenshot,
  (newValue) => {
    if (newValue && !isCapturingShortcut.value) {
      screenshotShortcut.value = newValue
      originalScreenshotShortcut.value = newValue
    }
  },
  { immediate: true }
)

watch(
  () => settingStore.chat?.sendKey,
  (newValue) => {
    if (newValue) {
      sendMessageShortcut.value = newValue
    }
  },
  { immediate: true }
)

onMounted(async () => {
  await checkShortcutRegistration()

  // 监听主窗口的快捷键注册状态更新事件
  const unlisten = await listen('shortcut-registration-updated', (event: any) => {
    const { shortcut, registered } = event.payload
    console.log(`📡 [Settings] 收到快捷键状态更新: ${shortcut} -> ${registered ? '已注册' : '未注册'}`)
    console.log(`📡 [Settings] 当前快捷键值: ${screenshotShortcut.value}`)

    // 只有当前快捷键匹配时才更新状态
    if (shortcut === screenshotShortcut.value) {
      console.log(`📡 [Settings] 快捷键匹配，更新状态为: ${registered ? '已注册' : '未注册'}`)
      shortcutRegistered.value = registered
    } else {
      console.log(`📡 [Settings] 快捷键不匹配，忽略状态更新`)
    }
  })

  // 组件卸载时取消监听
  onUnmounted(() => {
    unlisten()
  })
})
</script>

<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full p-12px box-border border-(solid 1px [--line-color]) custom-shadow;
}
</style>
