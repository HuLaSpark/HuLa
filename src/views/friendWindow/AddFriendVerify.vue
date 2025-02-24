<template>
  <div class="h-full bg-[--right-bg-color] transition-colors">
    <!-- 标题栏 -->
    <div class="window-header flex items-center justify-between px-4" data-tauri-drag-region>
      <div class="flex items-center gap-2">
        <n-icon size="18">
          <svg class="icon text-[var(--text-color)]" aria-hidden="true">
            <use href="#people-plus" />
          </svg>
        </n-icon>
        <span class="text-16px font-medium text-[var(--text-color)]">申请加好友</span>
      </div>

      <!-- Windows 关闭按钮 -->
      <div v-if="type() === 'windows'" class="flex items-center gap-3 text-[var(--text-color)]">
        <svg class="size-16px cursor-pointer select-none hover:text-primary transition-colors" @click="handleMinimize">
          <use href="#maximize" />
        </svg>
        <svg class="size-14px cursor-pointer select-none hover:text-primary transition-colors" @click="handleClose">
          <use href="#close" />
        </svg>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="p-4">
      <!-- 用户信息 -->
      <div class="flex items-center gap-3 p-3 bg-[var(--body-color)] rounded-lg mb-4">
        <n-avatar :size="48" :src="AvatarUtils.getAvatarUrl(userInfo?.avatar)" fallback-src="/logo.png" round />
        <div class="flex-1">
          <div class="flex items-center gap-2 text-[var(--text-color)]">
            <span class="text-16px font-medium">{{ userInfo?.name }}</span>
            <n-tag v-if="userInfo?.badges?.length" size="small" :bordered="false">
              {{ userInfo?.badges[0]?.name }}
            </n-tag>
          </div>
          <span class="text-13px text-[var(--text-color)]">账号：{{ userInfo?.account }}</span>
        </div>
      </div>

      <!-- 验证消息输入框 -->
      <n-input
        v-model:value="verifyMessage"
        type="textarea"
        :allow-input="(value: string) => !value.startsWith(' ') && !value.endsWith(' ')"
        placeholder="输入几句话，对TA说些什么吧"
        :maxlength="60"
        :clearable="true"
        :autosize="{
          minRows: 3,
          maxRows: 3
        }"
        show-count
        class="mb-4" />
      <!-- 按钮组 -->
      <div class="flex justify-end gap-2">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" :loading="loading" @click="handleConfirm"> 发送 </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type } from '@tauri-apps/plugin-os'
import { useMessage } from 'naive-ui'
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { useUserStore } from '@/stores/user.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { MittEnum } from '@/enums/index.ts'

import apis from '@/services/apis'
import { onMounted, onUnmounted } from 'vue'

// 验证消息
const verifyMessage = ref('')
// 获取用户信息
const userStore = useUserStore()
const userInfo = ref()

const message = useMessage()
// 加载状态
const loading = ref(false)
// 在 setup 作用域内定义清理函数引用
const unlistenRef = ref<() => void>()

// 打开窗口
// 获取全局状态的用户信息 userInfo 和 userUid
onMounted(async () => {
  await getCurrentWebviewWindow().show()
  // 发送就绪事件
  emit(MittEnum.ADD_FRIEND_READY)

  // 监听数据事件
  const unlisten = await listen(MittEnum.ADD_FRIEND_INIT, (event) => {
    userInfo.value = event.payload
  })
  unlistenRef.value = unlisten

  verifyMessage.value = `我是 ${userStore.userInfo.name || ''}`
})

// 在同步上下文中注册卸载钩子
onUnmounted(() => {
  if (unlistenRef.value) {
    unlistenRef.value() // ✅ 安全执行清理
  }
  verifyMessage.value = ''
})

// 处理关闭
const handleClose = async () => {
  const webview = await WebviewWindow.getByLabel('addFriendVerify')
  webview?.close()
}

// 处理最小化
const handleMinimize = async () => {
  const webview = await WebviewWindow.getByLabel('addFriendVerify')
  webview?.minimize()
}

// 处理取消
const handleCancel = () => {
  handleClose()
}

// 处理确认
const handleConfirm = async () => {
  if (!verifyMessage.value.trim()) {
    message.warning('请输入验证消息')
    return
  }
  console.log(userInfo.value)
  try {
    loading.value = true
    await apis.sendAddFriendRequest({
      targetUid: userInfo.value.id as number,
      msg: verifyMessage.value.trim()
    })
    window.$message.success('已发送好友申请')
    setTimeout(async () => {
      handleClose()
    }, 300)
  } catch (error: any) {
    message.error(error.message || '发送失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.window-header {
  height: 48px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--divider-color);
  background-color: var(--card-color);
  transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-header svg {
  -webkit-app-region: no-drag;
}

/* 用户信息卡片样式 */
.user-info-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.user-info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* 输入框样式 */
:deep(.n-input) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.n-input:focus-within) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

/* 按钮样式 */
:deep(.n-button) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.9;
  position: relative;
  overflow: hidden;
}

:deep(.n-button:hover) {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.25);
}

:deep(.n-button:active) {
  transform: scale(0.98);
}

/* 标签样式 */
:deep(.n-tag) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--primary-color-hover);
  color: var(--primary-text-color);
}

:deep(.n-tag:hover) {
  transform: translateY(-1px) scale(1.05);
}

/* 头像样式 */
:deep(.n-avatar) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

:deep(.n-avatar:hover) {
  transform: scale(1.05);
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.25);
}
</style>
