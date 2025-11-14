<template>
  <div class="size-full rounded-8px bg-[--chat-right-bg]">
    <n-flex class="size-full" :size="0">
      <!-- 左边侧边栏 -->
      <Left />
      <!--  右边主体  -->
      <Right />
    </n-flex>

    <!-- 角色管理弹窗 -->
    <ChatRoleManagement v-model="showRoleManagement" @refresh="handleRoleManagementRefresh" />

    <!-- 模型管理弹窗 -->
    <ModelManagement v-model="showModelManagement" @refresh="handleModelManagementRefresh" />
  </div>
</template>
<script setup lang="ts">
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useMitt } from '@/hooks/useMitt'
import Left from './layout/Left.vue'
import Right from './layout/Right.vue'
import ChatRoleManagement from './components/ChatRoleManagement.vue'
import ModelManagement from './components/ModelManagement.vue'
import { getUseMonaco } from 'vue-renderer-markdown'
import { initMarkdownRenderer } from '@/plugins/robot/utils/markdown'

const showRoleManagement = ref(false)
const showModelManagement = ref(false)
/** 初始化 Markdown 渲染器 */
initMarkdownRenderer()

// 监听打开角色管理事件
useMitt.on('open-role-management', () => {
  console.log('📝 打开角色管理')
  showRoleManagement.value = true
})

// 监听打开模型管理事件
useMitt.on('open-model-management', () => {
  console.log('🤖 打开模型管理')
  showModelManagement.value = true
})

// 角色管理刷新后的回调
const handleRoleManagementRefresh = () => {
  console.log('🔄 角色管理刷新')
  // 通知其他组件刷新角色列表
  useMitt.emit('refresh-role-list')
}

// 模型管理刷新后的回调
const handleModelManagementRefresh = () => {
  console.log('🔄 模型管理刷新')
  // 通知其他组件刷新模型列表
  useMitt.emit('refresh-model-list')
}

onMounted(async () => {
  await getCurrentWebviewWindow().show()
  await getUseMonaco()
})
</script>
