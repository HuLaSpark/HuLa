<template>
  <div class="h-full bg-[--right-bg-color] transition-colors">
    <!-- 窗口头部 -->
    <div class="window-header flex items-center justify-between px-4 py-2" data-tauri-drag-region>
      <!-- Mac 关闭按钮 -->
      <!-- <div v-if="type() === 'macos'" @click="handleClose"
                  class="mac-close size-13px shadow-inner bg-#ed6a5eff rounded-50% mt-6px select-none absolute left-6px">
                  <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
                    <use href="#close" />
                  </svg>
                </div> -->

      <!-- 标题和图标 -->
      <div class="flex items-center gap-2">
        <n-icon size="18">
          <svg v-if="searchType === 'user'" class="icon text-[var(--text-color)]" aria-hidden="true">
            <use href="#people-search-one" />
          </svg>
          <svg v-else class="icon text-[var(--text-color)]" aria-hidden="true">
            <use href="#every-user" />
          </svg>
        </n-icon>
        <span class="text-16px font-medium text-[var(--text-color)]">
          {{ searchType === 'user' ? '搜索好友' : '搜索群聊' }}
        </span>
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

    <!-- 主要内容 -->
    <div class="p-4">
      <n-flex vertical class="!gap-3">
        <!-- 搜索类型切换 -->
        <n-tabs v-model:value="searchType" type="segment" size="small" class="mx-1" @update:value="handleTypeChange">
          <n-tab-pane name="user" tab="找好友">
            <!-- #tab -->
            <template>
              <n-space :size="4" align="center">
                <n-icon>
                  <svg class="icon" aria-hidden="true">
                    <use href="#user" />
                  </svg>
                </n-icon>
                <span>找好友</span>
              </n-space>
            </template>
          </n-tab-pane>
          <n-tab-pane name="group" tab="找群聊">
            <!--  #tab -->
            <template>
              <n-space :size="4" align="center">
                <n-icon>
                  <svg class="icon" aria-hidden="true">
                    <use href="#group" />
                  </svg>
                </n-icon>
                <span>找群聊</span>
              </n-space>
            </template>
          </n-tab-pane>
        </n-tabs>

        <!-- 搜索框 -->
        <n-input
          v-model:value="searchValue"
          type="text"
          :placeholder="searchType === 'user' ? '输入昵称或账号搜索好友' : '输入群昵称或群号搜索群聊'"
          :maxlength="20"
          round
          clearable
          @keydown.enter="handleSearch"
          @clear="handleClear">
          <template #prefix>
            <n-icon>
              <svg class="icon" aria-hidden="true">
                <use href="#search" />
              </svg>
            </n-icon>
          </template>
        </n-input>

        <!-- 搜索结果 -->
        <div class="search-results">
          <template v-if="searchResults.length">
            <n-list bordered class="search-list">
              <n-list-item v-for="item in searchResults" :key="item.id" class="search-list-item">
                <n-flex align="center" class="gap-3">
                  <n-avatar :size="48" :src="AvatarUtils.getAvatarUrl(item.avatar)" fallback-src="/logo.png" round />
                  <n-flex vertical justify="center" class="gap-1 flex-1">
                    <n-space align="center" :size="6">
                      <span class="text-16px font-medium text-[var(--text-color)]">{{
                        searchType === 'user' ? item.name : item.groupName
                      }}</span>
                      <n-tag
                        v-if="searchType === 'user' && item.badges?.length"
                        size="small"
                        :bordered="false"
                        class="badge">
                        <n-space align="center" :size="4">
                          <n-icon>
                            <svg class="icon" aria-hidden="true">
                              <use href="#crown" />
                            </svg>
                          </n-icon>
                          <span>{{ item.badges[0].name }}</span>
                        </n-space>
                      </n-tag>
                    </n-space>
                    <span class="text-13px text-[var(--text-color-3)]">{{
                      searchType === 'user' ? `账号：${item.account}` : `群号：${item.roomId}`
                    }}</span>
                  </n-flex>
                  <n-button secondary type="primary" size="small" class="add-button" @click="handleAddFriend(item)">
                    添加
                  </n-button>
                </n-flex>
              </n-list-item>
            </n-list>
          </template>
          <template v-else-if="hasSearched">
            <n-empty description="未找到相关结果" />
          </template>
          <template v-else-if="loading">
            <n-spin size="large" />
          </template>
        </div>
      </n-flex>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type } from '@tauri-apps/plugin-os'
import { WebviewWindow, getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useMessage } from 'naive-ui'
import { useWindow } from '@/hooks/useWindow'
import { debounce } from 'lodash-es'
import { AvatarUtils } from '@/utils/AvatarUtils'
import apis from '@/services/apis'
import { listen } from '@tauri-apps/api/event'
import { MittEnum } from '@/enums/index.ts'

const { createWebviewWindow } = useWindow()
const message = useMessage()

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})

// 搜索类型
const searchType = ref<'user' | 'group'>('user')
// 搜索值
const searchValue = ref('')
// 搜索结果
const searchResults = ref<any[]>([])
// 是否已经搜索过
const hasSearched = ref(false)
// 加载状态
const loading = ref(false)

// 处理关闭
const handleClose = async () => {
  const webview = await WebviewWindow.getByLabel('searchFriend')
  webview?.close()
}

// 处理最小化
const handleMinimize = async () => {
  const webview = await WebviewWindow.getByLabel('searchFriend')
  webview?.minimize()
}

// 清空搜索结果
const clearSearchResults = () => {
  searchResults.value = []
  hasSearched.value = false
  searchValue.value = ''
}

// 处理清空按钮点击
const handleClear = () => {
  clearSearchResults()
}

// 切换搜索类型
const handleTypeChange = () => {
  clearSearchResults()
}

// 处理搜索
const handleSearch = debounce(async () => {
  if (!searchValue.value.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  try {
    loading.value = true
    const response = await (searchType.value === 'user'
      ? apis.searchUsers(searchValue.value)
      : apis.searchGroups(searchValue.value))
    searchResults.value = response || []
    hasSearched.value = true
  } catch (error: any) {
    message.error(error.message || '搜索失败')
  } finally {
    loading.value = false
  }
})

// 处理添加好友或群聊
const handleAddFriend = async (item: any) => {
  if (searchType.value === 'user') {
    // 创建窗口并获取实例
    const webview = await createWebviewWindow('申请加好友', 'addFriendVerify', 350, 300, '', false, 350, 300)

    // 监听子窗口就绪事件
    const unlisten = await listen(MittEnum.ADD_FRIEND_READY, async () => {
      // 发送数据到指定窗口
      await webview.emit(MittEnum.ADD_FRIEND_INIT, item)
      unlisten() // 移除监听
    })
  } else {
    message.info('加入群聊功能开发中')
  }
}
</script>

<style scoped>
.window-header {
  height: 38px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--divider-color);
  background-color: var(--card-color);
  transition: background-color 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.window-header svg {
  -webkit-app-region: no-drag;
}

.search-results {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-color) transparent;
  padding-right: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-thumb {
  background-color: var(--scrollbar-color);
  border-radius: 10px;
  border: 2px solid transparent;
  background-clip: padding-box;
  transition: background-color 0.3s ease;
}

.search-results::-webkit-scrollbar-track {
  background-color: transparent;
  border-radius: 10px;
}

.search-results::-webkit-scrollbar-thumb:hover {
  background-color: var(--primary-color);
}

:deep(.search-list) {
  background-color: var(--card-color);
  border-radius: 12px;
  border: 1px solid var(--divider-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

:deep(.search-list-item) {
  padding: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-bottom: 1px solid var(--divider-color);
  background-color: var(--card-color);
  transform-origin: center;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.search-list-item:last-child) {
  border-bottom: none;
}

:deep(.search-list-item:hover) {
  background-color: var(--hover-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.add-button) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.9;
  background-color: var(--primary-color);
  color: var(--primary-text-color);
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  padding: 4px 12px;
  font-weight: 500;
}

:deep(.add-button:hover) {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(var(--primary-color-rgb), 0.25);
}

:deep(.add-button:active) {
  transform: scale(0.98);
}

:deep(.badge) {
  background-color: var(--primary-color-hover);
  color: var(--primary-text-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 6px;
  padding: 2px 8px;
}

:deep(.badge:hover) {
  transform: translateY(-1px) scale(1.05);
}

:deep(.n-input) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--input-color);
  border-radius: 20px;
}

:deep(.n-input:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.n-input:focus-within) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

:deep(.n-tabs-tab) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-color);
  padding: 4px 12px;
  border-radius: 16px;
}

:deep(.n-tabs-tab:hover) {
  transform: translateY(-2px);
  color: var(--primary-color);
  background-color: var(--hover-color);
}

:deep(.n-avatar) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
}

:deep(.n-avatar:hover) {
  transform: scale(1.05);
  border-color: var(--primary-color);
}

/* 搜索结果动画 */
.search-results .n-list-enter-active,
.search-results .n-list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-results .n-list-enter-from,
.search-results .n-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
