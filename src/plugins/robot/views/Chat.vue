<template>
  <!-- 主体内容 -->
  <main class="chat-main-container">
    <div class="chat-content-area">
      <div
        data-tauri-drag-region
        class="chat-header flex truncate p-[8px_16px_10px_16px] justify-between items-center gap-50px">
        <n-flex :size="10" vertical class="truncate">
          <p
            v-if="!isEdit"
            @click="handleEdit"
            class="leading-6 text-(18px [--chat-text-color]) truncate font-500 hover:underline cursor-pointer">
            {{ currentChat.title || '新的会话' }}
          </p>
          <n-input
            v-else
            @blur="handleBlur"
            ref="inputInstRef"
            v-model:value="currentChat.title"
            clearable
            placeholder="输入标题"
            type="text"
            size="small"
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style="width: 200px; height: 28px"
            class="text-14px rounded-6px"></n-input>

          <!-- 当前选择的模型显示 -->
          <n-flex align="center" :size="8" class="mt-4px">
            <div class="flex items-center gap-6px">
              <span class="text-(11px #909090)">当前模型:</span>
              <n-tag
                v-if="selectedModel"
                size="small"
                :type="selectedModel.status === 0 ? 'success' : 'error'"
                class="cursor-pointer"
                @click="handleModelClick">
                {{ selectedModel.name }}
                <template #icon>
                  <Icon icon="mdi:robot" class="text-14px" />
                </template>
              </n-tag>
              <n-tag v-else size="small" type="warning" class="cursor-pointer" @click="handleModelClick">
                未选择模型
                <template #icon>
                  <Icon icon="mdi:robot-off" class="text-14px" />
                </template>
              </n-tag>
            </div>
            <p class="text-(11px #707070)">共{{ currentChat.messageCount }}条对话</p>
          </n-flex>
        </n-flex>

        <n-flex class="min-w-fit">
          <!-- 新增会话按钮 -->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="right-btn" @click="handleCreateNewChat">
                <svg><use href="#plus"></use></svg>
              </div>
            </template>
            <p>新建会话</p>
          </n-popover>

          <!-- 编辑标题按钮 -->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="right-btn" @click="handleEdit">
                <svg><use href="#edit"></use></svg>
              </div>
            </template>
            <p>编辑标题</p>
          </n-popover>

          <!-- 删除会话按钮 -->
          <n-popover
            v-model:show="showDeleteChatConfirm"
            trigger="click"
            placement="bottom"
            :show-arrow="true"
            style="padding: 16px; width: 280px">
            <template #trigger>
              <div class="right-btn right-btn-danger" title="删除会话">
                <svg><use href="#delete"></use></svg>
              </div>
            </template>
            <n-flex vertical :size="12">
              <p class="text-(14px [--chat-text-color]) font-500">确定要删除当前会话吗？</p>
              <p class="text-(12px #d5304f)">删除后将无法恢复！</p>

              <!-- 是否同时删除消息选项 -->
              <n-checkbox v-model:checked="deleteWithMessages" size="small">
                <span class="text-(12px [--chat-text-color])">同时删除会话中的所有消息</span>
              </n-checkbox>

              <n-flex justify="end" :size="8">
                <n-button size="small" @click="showDeleteChatConfirm = false">取消</n-button>
                <n-button size="small" type="error" @click="handleDeleteChat">确定删除</n-button>
              </n-flex>
            </n-flex>
          </n-popover>

          <!-- 分享按钮 -->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="right-btn">
                <svg><use href="#Sharing"></use></svg>
              </div>
            </template>
            <p>分享</p>
          </n-popover>
        </n-flex>
      </div>
      <div class="h-1px bg-[--line-color]"></div>

      <!-- 聊天信息框 -->
      <div :class="{ 'shadow-inner': page.shadow }" class="chat-messages-container w-full box-border flex flex-col">
        <div
          ref="scrollContainerRef"
          class="chat-scrollbar flex-1 min-h-0 scrollbar-container"
          :class="{ 'hide-scrollbar': !showScrollbar }"
          @scroll="handleScroll"
          @mouseenter="showScrollbar = true"
          @mouseleave="showScrollbar = false">
          <div ref="messageContentRef" class="p-[16px_16px] box-border">
            <!-- 欢迎消息 -->
            <div class="flex gap-12px mb-12px">
              <n-avatar
                class="rounded-8px flex-shrink-0"
                :src="getModelAvatar(selectedModel)"
                :fallback-src="getDefaultAvatar()" />
              <n-flex vertical justify="space-between">
                <p class="text-(12px [--chat-text-color])">
                  {{ selectedModel ? selectedModel.name : 'GPT-4' }}
                  <n-tag
                    v-if="selectedModel"
                    :type="selectedModel.status === 0 ? 'success' : 'error'"
                    size="tiny"
                    class="ml-8px">
                    {{ selectedModel.status === 0 ? '可用' : '不可用' }}
                  </n-tag>
                </p>
                <div class="bubble select-text text-14px">
                  <p>{{ `你好，我是${selectedModel?.name || ''}，很高兴为您服务。` }}</p>
                </div>
              </n-flex>
            </div>

            <!-- 加载状态 -->
            <div v-if="loadingMessages" class="flex justify-center items-center py-20px text-(12px #909090)">
              <n-spin size="small" />
              <span class="ml-10px">加载消息中...</span>
            </div>

            <!-- 消息列表 -->
            <div
              v-for="(message, index) in messageList"
              class="message-row group flex flex-col mb-12px"
              :data-message-index="index"
              :data-message-id="message.id">
              <div class="flex items-start gap-10px" :class="message.type === 'user' ? 'flex-row-reverse' : ''">
                <n-avatar
                  v-if="message.type === 'user'"
                  :size="34"
                  class="select-none rounded-8px flex-shrink-0"
                  :class="message.type === 'user' ? 'ml-2px' : 'mr-2px'"
                  :src="userStore.userInfo?.avatar ? AvatarUtils.getAvatarUrl(userStore.userInfo.avatar) : ''"
                  :fallback-src="getDefaultAvatar()" />
                <n-avatar
                  v-else
                  :size="34"
                  class="select-none rounded-8px flex-shrink-0"
                  :class="message.type === 'assistant' ? 'mr-2px' : 'ml-2px'"
                  :src="getModelAvatar(selectedModel)"
                  :fallback-src="getDefaultAvatar()" />
                <n-flex
                  vertical
                  :size="6"
                  class="flex-1"
                  :class="message.type === 'user' ? 'items-end' : 'items-start'">
                  <n-flex
                    align="center"
                    :size="8"
                    class="select-none text-(12px #909090)"
                    :class="message.type === 'user' ? 'flex-row-reverse' : ''">
                    <p>
                      {{ message.type === 'user' ? '我' : selectedModel ? selectedModel.name : 'AI' }}
                    </p>
                    <n-popconfirm
                      v-if="message.id"
                      @positive-click="() => handleDeleteMessage(message.id!, index)"
                      positive-text="删除"
                      negative-text="取消">
                      <template #trigger>
                        <div
                          class="delete-btn opacity-0 group-hover:opacity-100 cursor-pointer text-#909090 hover:text-#d5304f transition-all"
                          title="删除消息">
                          <svg class="w-14px h-14px"><use href="#delete"></use></svg>
                        </div>
                      </template>
                      <p>确定要删除这条消息吗？</p>
                    </n-popconfirm>
                  </n-flex>
                  <div
                    class="bubble select-text text-14px"
                    :class="message.type === 'user' ? 'bubble-oneself' : 'bubble-ai'"
                    style="white-space: pre-wrap">
                    <template v-if="message.type === 'user'">
                      {{ message.content }}
                    </template>
                    <template v-else>
                      <div class="code-block-wrapper" :class="isDarkTheme ? 'code-block-dark' : 'code-block-light'">
                        <MarkdownRender
                          :content="message.content"
                          :is-dark="isDarkTheme"
                          :viewportPriority="false"
                          :code-block-light-theme="'vitesse-light'"
                          :code-block-dark-theme="'vitesse-dark'"
                          :themes="['vitesse-light', 'vitesse-dark']"
                          :code-block-props="{
                            showPreviewButton: false,
                            showFontSizeButtons: false,
                            enableFontSizeControl: false,
                            showExpandButton: false,
                            showLanguageSelect: false,
                            showCopyButton: true,
                            showLineNumber: false,
                            monacoOptions: {
                              MAX_HEIGHT: Number.MAX_SAFE_INTEGER,
                              readOnly: true,
                              minimap: { enabled: false }
                            }
                          }" />
                      </div>
                    </template>
                  </div>
                </n-flex>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="h-1px bg-[--line-color]"></div>
      <!-- 下半部分输入框以及功能栏 -->
      <div class="chat-input-container min-h-180px">
        <n-flex vertical :size="6" class="p-[8px_16px] box-border">
          <n-flex align="center" :size="26" class="options">
            <!-- 角色选择 -->
            <n-popover
              v-model:show="showRolePopover"
              trigger="click"
              placement="top-start"
              :show-arrow="false"
              style="padding: 0; width: 320px">
              <template #trigger>
                <div class="flex items-center gap-6px cursor-pointer" @click="showRolePopover = !showRolePopover">
                  <n-avatar
                    v-if="selectedRole"
                    :src="selectedRole.avatar"
                    :size="24"
                    round
                    :fallback-src="getDefaultAvatar()" />
                  <Icon v-else icon="mdi:account-circle" class="text-24px color-#909090" />
                  <span class="text-(12px [--chat-text-color])">
                    {{ selectedRole ? selectedRole.name : '选择角色' }}
                  </span>
                  <Icon icon="mdi:chevron-down" class="text-16px color-#909090" />
                </div>
              </template>
              <div class="role-selector">
                <div class="role-header">
                  <span class="role-title">选择角色</span>
                  <n-button size="small" @click="handleOpenRoleManagement">
                    <template #icon>
                      <Icon icon="mdi:cog" />
                    </template>
                    管理
                  </n-button>
                </div>

                <div class="role-list">
                  <div v-if="roleLoading" class="loading-container">
                    <n-spin size="small" />
                    <span class="loading-text">加载中...</span>
                  </div>

                  <div v-else-if="roleList.length === 0" class="empty-container">
                    <n-empty description="暂无角色数据" size="small">
                      <template #icon>
                        <Icon icon="mdi:account-off" class="text-24px color-#909090" />
                      </template>
                    </n-empty>
                  </div>

                  <div v-else class="roles-container">
                    <div
                      v-for="role in roleList"
                      :key="role.id"
                      class="role-item"
                      :class="{ active: selectedRole?.id === role.id }"
                      @click="handleSelectRole(role)">
                      <n-avatar :src="role.avatar" :size="32" round :fallback-src="getDefaultAvatar()" />
                      <n-flex vertical :size="2" class="flex-1 min-w-0">
                        <n-flex align="center" :size="8">
                          <span class="role-name">{{ role.name }}</span>
                          <n-tag v-if="role.status === 0" size="tiny" type="success">可用</n-tag>
                        </n-flex>
                        <span class="role-desc">{{ role.description }}</span>
                      </n-flex>
                      <Icon
                        v-if="selectedRole?.id === role.id"
                        icon="mdi:check-circle"
                        class="text-18px color-[--primary-color]" />
                    </div>
                  </div>
                </div>
              </div>
            </n-popover>

            <!-- 模型选择 -->
            <n-popover
              v-model:show="showModelPopover"
              trigger="click"
              placement="top-start"
              :show-arrow="false"
              style="padding: 0; width: 320px">
              <template #trigger>
                <div class="flex items-center gap-6px cursor-pointer" @click="handleModelClick">
                  <svg><use href="#model"></use></svg>
                  <span class="text-(12px [--chat-text-color])">
                    {{ selectedModel ? selectedModel.name : '选择模型' }}
                  </span>
                </div>
              </template>
              <div class="model-selector">
                <div class="model-header">
                  <span class="model-title">选择模型</span>
                  <n-flex :size="8">
                    <n-button size="small" @click="handleOpenModelManagement">
                      <template #icon>
                        <Icon icon="mdi:cog" />
                      </template>
                      管理
                    </n-button>
                    <n-input
                      v-model:value="modelSearch"
                      placeholder="搜索模型..."
                      clearable
                      size="small"
                      style="width: 140px">
                      <template #prefix>
                        <Icon icon="mdi:magnify" class="text-16px color-#909090" />
                      </template>
                    </n-input>
                  </n-flex>
                </div>

                <div class="model-list">
                  <div v-if="modelLoading" class="loading-container">
                    <n-spin size="small" />
                    <span class="loading-text">加载中...</span>
                  </div>

                  <div v-else-if="filteredModels.length === 0" class="empty-container">
                    <n-empty description="暂无模型数据" size="small">
                      <template #icon>
                        <Icon icon="mdi:package-variant-closed" class="text-24px color-#909090" />
                      </template>
                    </n-empty>
                  </div>

                  <div v-else class="models-container">
                    <div
                      v-for="model in filteredModels"
                      :key="model.id"
                      :class="['model-item', { 'model-item-active': selectedModel?.id === model.id }]"
                      @click="selectModel(model)">
                      <!-- 模型头像 -->
                      <n-avatar
                        round
                        :size="40"
                        :src="getModelAvatar(model)"
                        :fallback-src="getDefaultAvatar()"
                        class="mr-12px flex-shrink-0" />

                      <div class="model-info">
                        <div class="model-name">{{ model.name }}</div>
                        <div class="model-description">{{ model.description || '暂无描述' }}</div>
                        <div class="model-meta">
                          <span class="model-provider">{{ model.platform }}</span>
                          <span class="model-version">v{{ model.model }}</span>
                        </div>
                      </div>
                      <div class="model-status">
                        <n-tag v-if="model.status === 0" type="success" size="small">可用</n-tag>
                        <n-tag v-else type="error" size="small">不可用</n-tag>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 分页控件 -->
                <div v-if="modelPagination.total > modelPagination.pageSize" class="model-pagination">
                  <n-pagination
                    v-model:page="modelPagination.pageNo"
                    :page-size="modelPagination.pageSize"
                    :page-count="Math.ceil(modelPagination.total / modelPagination.pageSize)"
                    size="small"
                    @update:page="handleModelPageChange" />
                </div>
              </div>
            </n-popover>

            <!-- 其他功能图标 -->
            <n-popover
              v-for="(item, index) in otherFeatures"
              :key="index"
              trigger="hover"
              :show-arrow="false"
              placement="top">
              <template #trigger>
                <svg><use :href="`#${item.icon}`"></use></svg>
              </template>
              <p>{{ item.label }}</p>
            </n-popover>

            <div class="flex items-center gap-6px bg-[--chat-hover-color] rounded-50px w-fit h-fit p-[4px_6px]">
              <svg style="width: 22px; height: 22px; outline: none; cursor: pointer"><use href="#explosion"></use></svg>
              <p class="text-(12px #707070) cursor-default select-none pr-6px">使用0</p>
            </div>
          </n-flex>

          <div style="height: 100px" class="flex flex-col items-end gap-6px">
            <MsgInput ref="MsgInputRef" :isAIMode="!!selectedModel" @send-ai="handleSendAI" />
          </div>
        </n-flex>
      </div>
    </div>
  </main>
</template>
<script setup lang="ts">
import { type InputInst, NPagination, NTag, NEmpty, NSpin, NAvatar } from 'naive-ui'
import { Icon } from '@iconify/vue'
import MsgInput from '@/components/rightBox/MsgInput.vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import MarkdownRender from 'vue-renderer-markdown'
import { useResizeObserver } from '@vueuse/core'
import { ThemeEnum } from '@/enums'
import 'vue-renderer-markdown/index.css'
import {
  modelPage,
  conversationCreateMy,
  conversationUpdateMy,
  conversationDeleteMy,
  messageListByConversationId,
  messageDelete,
  messageDeleteByConversationId,
  chatRolePage
} from '@/utils/ImRequestUtils'
import { messageSendStream } from '@/utils/ImRequestUtils'
import { AvatarUtils } from '@/utils/AvatarUtils'
import router from '@/router'
import { storeToRefs } from 'pinia'

const settingStore = useSettingStore()
const userStore = useUserStore()
const { page, themes } = storeToRefs(settingStore)

const MsgInputRef = ref()
/** 是否是编辑模式 */
const isEdit = ref(false)
const inputInstRef = ref<InputInst | null>(null)
/** 原始标题 */
const originalTitle = ref('')
/** 当前聊天的标题、id 以及元信息 */
const currentChat = ref({
  id: '0',
  title: '',
  messageCount: 0,
  createTime: 0
})

// 计算是否是暗色主题，处理空值和未初始化的情况
const isDarkTheme = computed(() => {
  const content = themes.value.content
  // 如果 content 为空，尝试从 document.documentElement.dataset.theme 获取
  if (!content) {
    const datasetTheme = document.documentElement.dataset.theme
    return datasetTheme === ThemeEnum.DARK
  }
  return content === ThemeEnum.DARK
})

// 同时监听 isDarkTheme 的变化，确保在主题切换时组件能正确更新
watch(
  isDarkTheme,
  (newVal) => {
    // 主题切换时，确保 CSS 类正确应用
    nextTick(() => {
      // 查找所有 code-block-wrapper 元素，确保它们有正确的类
      const wrappers = document.querySelectorAll('.code-block-wrapper')
      wrappers.forEach((wrapper) => {
        wrapper.classList.remove('code-block-dark', 'code-block-light')
        wrapper.classList.add(newVal ? 'code-block-dark' : 'code-block-light')
      })
    })
  },
  { immediate: true }
)

// 消息列表
interface Message {
  type: 'user' | 'assistant'
  content: string
  streaming?: boolean
  createTime?: number
  id?: string // 消息ID，用于删除
  replyId?: string | null // 回复的消息ID
  model?: string // 使用的模型
}

const messageList = ref<Message[]>([])
const scrollContainerRef = ref<HTMLElement | null>(null)
const messageContentRef = ref<HTMLElement | null>(null)
const shouldAutoStickBottom = ref(true)
const showScrollbar = ref(true)
const loadingMessages = ref(false) // 消息加载状态

const showDeleteChatConfirm = ref(false) // 删除会话确认框显示状态
const deleteWithMessages = ref(false) // 是否同时删除消息
const showRolePopover = ref(false) // 角色选择弹窗显示状态
const selectedRole = ref<any>(null) // 当前选中的角色
const roleList = ref<any[]>([]) // 角色列表
const roleLoading = ref(false) // 角色加载状态

// 滚动到底部
const getScrollContainer = () => scrollContainerRef.value

const isNearBottom = () => {
  const container = getScrollContainer()
  if (!container) return true
  const offset = container.scrollHeight - (container.scrollTop + container.clientHeight)
  return offset <= 80
}

const scrollToBottom = (retryCount = 2) => {
  shouldAutoStickBottom.value = true
  const raf =
    typeof window === 'undefined'
      ? (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16)
      : window.requestAnimationFrame

  const scroll = () => {
    const container = getScrollContainer()
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
  }

  const runWithRetry = (remaining: number) => {
    raf(() => {
      scroll()
      if (remaining > 0) {
        runWithRetry(remaining - 1)
      }
    })
  }

  nextTick(() => {
    runWithRetry(retryCount)
  })
}

const handleScroll = () => {
  shouldAutoStickBottom.value = isNearBottom()
}

watch(scrollContainerRef, () => {
  handleScroll()
})

useResizeObserver(messageContentRef, () => {
  if (shouldAutoStickBottom.value) {
    scrollToBottom()
  }
})

/** 通知会话元信息变化 */
const notifyConversationMetaChange = (payload: { messageCount?: number; createTime: number }) => {
  if (!currentChat.value.id || currentChat.value.id === '0') {
    return
  }

  if (payload.messageCount !== undefined) {
    currentChat.value.messageCount = payload.messageCount
  }

  const resolvedCreateTime =
    typeof payload.createTime === 'number' && Number.isFinite(payload.createTime)
      ? payload.createTime
      : currentChat.value.createTime || Date.now()
  currentChat.value.createTime = resolvedCreateTime

  useMitt.emit('update-chat-meta', {
    id: currentChat.value.id,
    messageCount: currentChat.value.messageCount,
    createTime: resolvedCreateTime
  })
}

// 模型选择相关状态
const showModelPopover = ref(false)
const modelLoading = ref(false)
const modelSearch = ref('')
const selectedModel = ref<any>(null)

// 模型分页数据
const modelPagination = ref({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 模型列表
const modelList = ref<any[]>([])

// 过滤后的模型列表
const filteredModels = computed(() => {
  if (!modelSearch.value) {
    return modelList.value
  }
  const search = modelSearch.value.toLowerCase()
  return modelList.value.filter(
    (model) =>
      model.name.toLowerCase().includes(search) ||
      model.description?.toLowerCase().includes(search) ||
      model.provider?.toLowerCase().includes(search)
  )
})

// AI消息发送处理
const handleSendAI = (data: { content: string }) => {
  if (!selectedModel.value) {
    window.$message.warning('请先选择AI模型')
    return
  }

  if (!data.content.trim()) {
    window.$message.warning('消息内容不能为空')
    return
  }

  // 调用AI消息发送逻辑
  sendAIMessage(data.content, selectedModel.value)
}

// AI消息发送实现
const sendAIMessage = async (content: string, model: any) => {
  try {
    window.$message.loading('AI思考中...', { duration: 0 })

    console.log('🚀 开始发送AI消息:', {
      内容: content,
      模型: model.name,
      会话ID: currentChat.value.id
    })

    // 添加用户消息到列表
    messageList.value.push({
      type: 'user',
      content: content,
      createTime: Date.now()
    })

    // 添加AI消息占位符（用于流式更新）
    const aiMessageIndex = messageList.value.length
    messageList.value.push({
      type: 'assistant',
      content: '',
      createTime: Date.now()
    })

    // 滚动到底部、用于累积AI回复内容
    scrollToBottom()
    let accumulatedContent = ''

    if (!currentChat.value.messageCount) {
      currentChat.value.messageCount = 0
    }
    currentChat.value.messageCount += 2 // 用户消息 + AI消息
    notifyConversationMetaChange({
      messageCount: currentChat.value.messageCount,
      createTime: Date.now()
    })

    await messageSendStream(
      {
        conversationId: currentChat.value.id,
        content: content,
        useContext: true
      },
      {
        onChunk: (chunk: string) => {
          try {
            const data = JSON.parse(chunk)
            if (data.success && data.data?.receive?.content) {
              const incrementalContent = data.data.receive.content
              // 手动累加内容、更新AI消息内容
              accumulatedContent += incrementalContent
              messageList.value[aiMessageIndex].content = accumulatedContent

              scrollToBottom()
            }
          } catch (e) {
            console.error('❌ 解析JSON失败:', e, '原始数据:', chunk)
          }
        },
        onDone: () => {
          scrollToBottom()
          const latestEntry = messageList.value[messageList.value.length - 1]
          const latestTimestamp = latestEntry?.createTime ?? currentChat.value.createTime ?? Date.now()
          notifyConversationMetaChange({
            createTime: latestTimestamp
          })
        },
        onError: (error: string) => {
          console.error('❌ AI流式响应错误:', error)
          messageList.value[aiMessageIndex].content = '抱歉，发生了错误：' + error
        }
      }
    )

    // 清空输入框
    if (MsgInputRef.value?.clearInput) {
      MsgInputRef.value.clearInput()
    }

    // 更新消息计数
  } catch (error) {
    console.error('❌ AI消息发送失败:', error)
    window.$message.error('发送失败，请检查网络连接')
  } finally {
    window.$message.destroyAll()
  }
}

// 功能列表
const features = ref([
  {
    icon: 'model',
    label: '模型'
  },
  {
    icon: 'voice',
    label: '语音输入'
  },
  {
    icon: 'plugins2',
    label: '插件'
  }
])

// 其他功能
const otherFeatures = computed(() => features.value.filter((item) => item.icon !== 'model'))

// 获取默认头像
const getDefaultAvatar = () => {
  return 'https://img1.baidu.com/it/u=3613958228,3522035000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'
}

// 获取模型头像
const getModelAvatar = (model: any) => {
  if (!model) {
    return getDefaultAvatar()
  }

  if (model.avatar) {
    return model.avatar
  }

  // 根据模型名称生成默认头像
  const modelName = model.name || ''

  // 常见模型的默认头像映射
  const defaultAvatars: Record<string, string> = {
    'gpt-4': getDefaultAvatar()
  }

  // 检查模型名称是否包含关键词
  const lowerName = modelName.toLowerCase()
  for (const [key, avatar] of Object.entries(defaultAvatars)) {
    if (lowerName.includes(key)) {
      return avatar
    }
  }

  // 默认返回通用头像
  return getDefaultAvatar()
}

// 获取模型列表
const fetchModelList = async () => {
  modelLoading.value = true
  try {
    const data = await modelPage({
      pageNo: modelPagination.value.pageNo,
      pageSize: modelPagination.value.pageSize
    })

    modelList.value = data.list || []
    modelPagination.value.total = data.total || 0
  } catch (error) {
    console.error('获取模型列表失败:', error)
    window.$message.error('获取模型列表失败')
  } finally {
    modelLoading.value = false
  }
}

// 处理模型点击
const handleModelClick = () => {
  showModelPopover.value = !showModelPopover.value
  if (showModelPopover.value && modelList.value.length === 0) {
    fetchModelList()
  }
}

// 选择模型
const selectModel = async (model: any) => {
  selectedModel.value = model ? { ...model } : null
  showModelPopover.value = false

  // 如果当前有会话，则调用后端API更新会话的模型
  if (currentChat.value.id && currentChat.value.id !== '0') {
    try {
      await conversationUpdateMy({
        id: currentChat.value.id,
        modelId: String(model.id)
      })
    } catch (error) {
      console.error('切换模型失败:', error)
      window.$message.destroyAll()
      window.$message.error('切换模型失败')
    }
  } else {
    window.$message.success(`已选择模型: ${model.name}`)
  }

  // 可以通过mitt通知其他组件模型已选择
  useMitt.emit('model-selected', model)
}

// 处理模型分页变化
const handleModelPageChange = (page: number) => {
  modelPagination.value.pageNo = page
  fetchModelList()
}

// 打开模型管理
const handleOpenModelManagement = () => {
  showModelPopover.value = false
  useMitt.emit('open-model-management')
}

// 加载角色列表
const loadRoleList = async () => {
  roleLoading.value = true
  try {
    const data = await chatRolePage({ pageNo: 1, pageSize: 100 })
    roleList.value = (data.list || []).filter((item: any) => item.status === 0) // 只显示可用的角色

    // 如果没有选中角色，默认选中第一个
    if (!selectedRole.value && roleList.value.length > 0) {
      selectedRole.value = roleList.value[0]
    }
  } catch (error) {
    console.error('加载角色列表失败:', error)
    window.$message.error('加载角色列表失败')
  } finally {
    roleLoading.value = false
  }
}

// 选择角色
const handleSelectRole = async (role: any) => {
  selectedRole.value = role ? { ...role } : null
  showRolePopover.value = false

  try {
    // 如果当前有会话，则调用后端API更新会话的角色
    if (currentChat.value.id && currentChat.value.id !== '0') {
      await conversationUpdateMy({
        id: currentChat.value.id,
        roleId: String(role.id)
      })
    } else {
      // 如果没有会话，只选择角色，不创建会话
      window.$message.success(`已选择角色: ${role.name}`)
    }
  } catch (error) {
    console.error('切换角色失败:', error)
    window.$message.destroyAll()
    window.$message.error('切换角色失败')
  }
}

// 打开角色管理
const handleOpenRoleManagement = () => {
  showRolePopover.value = false
  useMitt.emit('open-role-management')
}

const handleBlur = async () => {
  isEdit.value = false
  if (originalTitle.value === currentChat.value.title) {
    return
  }
  if (currentChat.value.title === '') {
    currentChat.value.title = `新的聊天${currentChat.value.id}`
  }

  try {
    await conversationUpdateMy({
      id: currentChat.value.id,
      title: currentChat.value.title
    })

    useMitt.emit('update-chat-title', { title: currentChat.value.title, id: currentChat.value.id })
  } catch (error) {
    console.error('❌ 更新会话标题失败:', error)
    window.$message.error('重命名失败')
    currentChat.value.title = originalTitle.value
  }
}

const handleEdit = () => {
  originalTitle.value = currentChat.value.title
  isEdit.value = true
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

// 加载会话的历史消息
const loadMessages = async (conversationId: string) => {
  if (!conversationId || conversationId === '0') {
    console.log('⚠️ 会话ID无效，跳过加载消息')
    return
  }

  try {
    loadingMessages.value = true
    const data = await messageListByConversationId({
      conversationId: conversationId,
      pageNo: 1,
      pageSize: 100
    })

    if (data && Array.isArray(data) && data.length > 0) {
      // 清空当前消息列表
      messageList.value = []

      data.forEach((msg: any) => {
        messageList.value.push({
          type: msg.type,
          content: msg.content || '',
          createTime: msg.createTime ?? Date.now(),
          id: msg.id,
          replyId: msg.replyId,
          model: msg.model
        })
      })

      nextTick(() => {
        scrollToBottom()
      })
    } else {
      messageList.value = []
    }
  } catch (error) {
    console.error('❌ 加载消息失败:', error)
    window.$message.error('加载消息失败')
    messageList.value = []
  } finally {
    loadingMessages.value = false
  }
}

// 新增会话
const handleCreateNewChat = async () => {
  try {
    const data = await conversationCreateMy({
      roleId: selectedRole.value?.id,
      knowledgeId: undefined,
      title: selectedRole.value?.name || '新的会话'
    })

    if (data) {
      window.$message.success('会话创建成功')

      // ✅ 直接通知左侧列表添加新会话，不需要刷新整个列表
      const rawCreateTime = Number(data.createTime)
      const newChat = {
        id: data.id || data,
        title: data.title || selectedRole.value?.name || '新的会话',
        createTime: Number.isFinite(rawCreateTime) ? rawCreateTime : Date.now(),
        messageCount: data.messageCount || 0,
        isPinned: data.pinned || false
      }

      useMitt.emit('add-conversation', newChat)

      // 跳转到聊天页面
      router.push('/chat')
    }
  } catch (error) {
    console.error('❌ 创建会话失败:', error)
    window.$message.error('创建会话失败')
  }
}

// 删除单条消息
const handleDeleteMessage = async (messageId: string, index: number) => {
  if (!messageId) {
    window.$message.warning('消息ID无效')
    return
  }

  try {
    await messageDelete({ id: messageId })

    // 从消息列表中移除
    messageList.value.splice(index, 1)
    window.$message.success('消息已删除')

    // 更新会话的消息数量
    currentChat.value.messageCount = Math.max((currentChat.value.messageCount || 0) - 1, 0)
    const latestEntry = messageList.value[messageList.value.length - 1]
    const latestTimestamp = latestEntry?.createTime ?? currentChat.value.createTime ?? Date.now()
    notifyConversationMetaChange({
      messageCount: currentChat.value.messageCount,
      createTime: latestTimestamp
    })
  } catch (error) {
    console.error('❌ 删除消息失败:', error)
    window.$message.error('删除消息失败')
  }
}

// 删除会话
const handleDeleteChat = async () => {
  if (!currentChat.value.id || currentChat.value.id === '0') {
    window.$message.warning('请先选择一个会话')
    showDeleteChatConfirm.value = false
    return
  }

  try {
    if (deleteWithMessages.value) {
      try {
        await messageDeleteByConversationId({ conversationIdList: [currentChat.value.id] })
      } catch (error) {
        console.error('❌ 删除会话消息失败:', error)
      }
    }

    // 删除会话
    await conversationDeleteMy({ conversationIdList: [currentChat.value.id] })
    window.$message.success(deleteWithMessages.value ? '会话及消息已删除' : '会话删除成功')

    // 关闭确认框
    showDeleteChatConfirm.value = false
    deleteWithMessages.value = false // 重置选项

    // 清空当前会话数据
    currentChat.value = {
      id: '0',
      title: '',
      messageCount: 0,
      createTime: 0
    }
    messageList.value = []

    // 先跳转到欢迎页、然后通知左侧列表刷新
    await router.push('/welcome')
    useMitt.emit('refresh-conversations')
  } catch (error) {
    console.error('❌ 删除会话失败:', error)
    window.$message.error('删除会话失败')
    showDeleteChatConfirm.value = false
  }
}

// 提前监听会话切换事件
useMitt.on('chat-active', async (e) => {
  const { title, id, messageCount, roleId, modelId, createTime } = e

  currentChat.value.title = title || `新的聊天${currentChat.value.id}`
  currentChat.value.id = id
  currentChat.value.messageCount = messageCount ?? 0
  currentChat.value.createTime = createTime ?? currentChat.value.createTime ?? Date.now()

  if (modelList.value.length === 0) {
    await fetchModelList()
  }

  // 确保角色列表已加载
  if (roleList.value.length === 0) {
    await loadRoleList()
  }

  if (roleId) {
    const role = roleList.value.find((r: any) => String(r.id) === String(roleId))
    if (role) {
      selectedRole.value = role
    }
  }

  if (modelId) {
    const model = modelList.value.find((m: any) => String(m.id) === String(modelId))
    if (model) {
      selectedModel.value = model
    }
  }

  await loadMessages(id)
})

onMounted(async () => {
  // 等待模型列表加载完成
  if (modelList.value.length === 0) {
    await fetchModelList()
  }

  // 等待角色列表加载完成
  await loadRoleList()

  // 监听角色列表刷新事件
  useMitt.on('refresh-role-list', () => {
    console.log('🔄 收到角色列表刷新事件')
    loadRoleList()
  })

  // 监听模型列表刷新事件
  useMitt.on('refresh-model-list', () => {
    console.log('🔄 收到模型列表刷新事件')
    fetchModelList()
  })

  useMitt.on('left-chat-title', (e) => {
    const { title, id, messageCount, createTime } = e
    if (id === currentChat.value.id) {
      currentChat.value.title = title ?? ''
      currentChat.value.messageCount = messageCount ?? 0
      currentChat.value.createTime = createTime ?? currentChat.value.createTime ?? Date.now()
    }
  })
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/render-message';
@use '@/styles/scss/chatBot/code-block';

/* 主容器布局 */
.chat-main-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

/* 左侧角色选择区域 */
.chat-role-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--line-color);
  background: var(--bg-color);

  .role-sidebar-header {
    padding: 16px;
    border-bottom: 1px solid var(--line-color);
  }

  .role-sidebar-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
}

/* 右侧聊天区域 */
.chat-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部区域 */
.chat-header {
  flex-shrink: 0;
  min-height: 60px;
  max-height: 80px;
}

/* 聊天消息区域 */
.chat-messages-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 原生滚动条样式与交互 */
.scrollbar-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
  transform: translateZ(0);

  &::-webkit-scrollbar {
    width: 6px;
    transition: opacity 0.3s ease;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 144, 144, 0.3);
    border-radius: 3px;
    transition:
      opacity 0.3s ease,
      background-color 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 144, 144, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &.hide-scrollbar {
    &::-webkit-scrollbar,
    &::-webkit-scrollbar-thumb,
    &::-webkit-scrollbar-track {
      background: transparent;
    }

    padding-right: 0.01px;
  }
}

/* 输入框容器固定在底部 */
.chat-input-container {
  flex-shrink: 0;
  background: var(--bg-color);
}

.right-btn {
  @apply size-fit border-(1px solid [--line-color]) cursor-pointer bg-[--chat-bt-color] color-[--chat-text-color] rounded-8px custom-shadow p-[10px_11px];
  transition: all 0.2s ease;
  svg {
    @apply size-18px;
  }

  // &:hover {
  //   @apply bg-[--chat-hover-color];
  // }

  &.right-btn-disabled {
    @apply opacity-50 cursor-not-allowed;
    &:hover {
      @apply bg-[--chat-bt-color];
    }
  }
}

.options {
  padding-left: 4px;
  svg {
    @apply size-22px cursor-pointer outline-none;
  }
}

/* AI 消息气泡样式 */
.bubble-ai {
  display: flex;
  flex-direction: column;
  width: fit-content;
  max-width: 80%;
  line-height: 2;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 18px;
    line-height: 1.6;
  }
}

/* 模型选择器样式 */
.model-selector {
  background: var(--chat-bt-color);
  border-radius: 8px;
  padding: 12px;
  max-height: 400px;
  display: flex;
  flex-direction: column;

  .model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .model-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--chat-text-color);
    }
  }

  .model-list {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;

      .loading-text {
        margin-left: 8px;
        font-size: 12px;
        color: #909090;
      }
    }

    .empty-container {
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .models-container {
      .model-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 4px;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
          background: var(--chat-hover-color);
        }

        &.model-item-active {
          border-color: #13987f;
          background: rgba(19, 152, 127, 0.1);
        }

        .model-info {
          flex: 1;
          margin-left: 12px;

          .model-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--chat-text-color);
            margin-bottom: 2px;
          }

          .model-description {
            font-size: 11px;
            color: #909090;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .model-meta {
            display: flex;
            gap: 8px;

            .model-provider,
            .model-version {
              font-size: 10px;
              color: #707070;
              background: rgba(0, 0, 0, 0.05);
              padding: 1px 4px;
              border-radius: 3px;
            }
          }
        }

        .model-status {
          margin-left: 8px;
        }
      }
    }
  }

  .model-pagination {
    display: flex;
    justify-content: center;
    padding-top: 8px;
    border-top: 1px solid var(--line-color);
  }
}

/* 角色选择器样式 */
.role-selector {
  background: var(--chat-bt-color);
  border-radius: 8px;
  padding: 12px;
  max-height: 400px;
  display: flex;
  flex-direction: column;

  .role-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .role-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--chat-text-color);
    }
  }

  .role-list {
    flex: 1;
    overflow-y: auto;

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;

      .loading-text {
        margin-left: 8px;
        font-size: 12px;
        color: #909090;
      }
    }

    .empty-container {
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .roles-container {
      .role-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 4px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
        gap: 12px;

        &:hover {
          background: var(--chat-hover-color);
        }

        &.active {
          border-color: #13987f;
          background: rgba(19, 152, 127, 0.1);
        }

        .role-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--chat-text-color);
        }

        .role-desc {
          font-size: 11px;
          color: #909090;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}

:deep(.paragraph-node) {
  margin: 0.5rem 0;
}
</style>
