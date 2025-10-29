<template>
  <!-- 主体内容 -->
  <main class="chat-main-container">
    <div
      data-tauri-drag-region
      class="chat-header flex truncate p-[8px_16px_10px_16px] justify-between items-center gap-50px">
      <n-flex :size="10" vertical class="truncate">
        <p
          v-if="!isEdit"
          @click="handleEdit"
          class="leading-6 text-(18px [--chat-text-color]) truncate font-500 hover:underline cursor-pointer">
          {{ currentChat.title }}
        </p>
        <n-input
          v-else
          @blur="handleBlur"
          ref="inputInstRef"
          v-model:value="currentChat.title"
          clearable
          placeholder="输入标题"
          type="text"
          size="tiny"
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          style="width: 200px"
          class="leading-7 min-h-100px text-14px rounded-6px"></n-input>

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
        <div class="right-btn" @click="handleEdit">
          <svg><use href="#edit"></use></svg>
        </div>

        <div class="right-btn">
          <svg><use href="#Sharing"></use></svg>
        </div>
      </n-flex>
    </div>
    <div class="h-1px bg-[--line-color]"></div>

    <!-- 聊天信息框 -->
    <div
      ref="chatContainerRef"
      :class="{ 'shadow-inner': page.shadow }"
      class="chat-messages-container w-full p-[16px_16px] box-border overflow-y-auto">
      <!-- 欢迎消息 -->
      <n-flex :size="6" class="mb-12px">
        <n-avatar class="rounded-8px" :src="getModelAvatar(selectedModel)" :fallback-src="getDefaultAvatar()" />
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

          <!--  气泡样式  -->
          <ContextMenu>
            <div style="white-space: pre-wrap" class="bubble select-text">
              <span v-html="'你好，我是' + selectedModel?.name + '，很高兴为您服务。'"></span>
            </div>
          </ContextMenu>
        </n-flex>
      </n-flex>

      <!-- 消息列表 -->
      <n-flex vertical :size="12">
        <template v-for="(message, index) in messageList" :key="index">
          <!-- 用户消息 -->
          <n-flex v-if="message.type === 'user'" :size="6" justify="end">
            <n-flex vertical align="end" class="max-w-70%">
              <p class="text-(12px #909090)">我</p>
              <ContextMenu>
                <div style="white-space: pre-wrap" class="bubble bubble-user select-text">
                  {{ message.content }}
                </div>
              </ContextMenu>
            </n-flex>
            <n-avatar
              class="rounded-8px"
              :src="userStore.userInfo?.avatar ? AvatarUtils.getAvatarUrl(userStore.userInfo.avatar) : ''"
              :fallback-src="getDefaultAvatar()" />
          </n-flex>

          <!-- AI消息 -->
          <n-flex v-else :size="6">
            <n-avatar class="rounded-8px" :src="getModelAvatar(selectedModel)" :fallback-src="getDefaultAvatar()" />
            <n-flex vertical class="max-w-70%">
              <p class="text-(12px [--chat-text-color])">
                {{ selectedModel ? selectedModel.name : 'AI' }}
              </p>
              <ContextMenu>
                <div style="white-space: pre-wrap" class="bubble select-text">
                  <span v-if="message.streaming" class="streaming-cursor">{{ message.content }}</span>
                  <span v-else>{{ message.content }}</span>
                </div>
              </ContextMenu>
            </n-flex>
          </n-flex>
        </template>
      </n-flex>
    </div>

    <div class="h-1px bg-[--line-color]"></div>
    <!-- 下半部分输入框以及功能栏 -->
    <div class="chat-input-container min-h-180px">
      <n-flex vertical :size="6" class="p-[8px_16px] box-border">
        <n-flex align="center" :size="26" class="options">
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
                <n-input
                  v-model:value="modelSearch"
                  placeholder="搜索模型..."
                  clearable
                  size="small"
                  style="width: 180px">
                  <template #prefix>
                    <Icon icon="mdi:magnify" class="text-16px color-#909090" />
                  </template>
                </n-input>
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
  </main>
</template>
<script setup lang="ts">
import { type InputInst, NIcon, NPagination, NTag, NEmpty, NSpin, NAvatar } from 'naive-ui'
import { Icon } from '@iconify/vue'
import MsgInput from '@/components/rightBox/MsgInput.vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import { modelPage } from '@/utils/ImRequestUtils'
import { messageSendStream } from '@/utils/ImRequestUtils'
import { AvatarUtils } from '@/utils/AvatarUtils'

const settingStore = useSettingStore()
const userStore = useUserStore()
const { page } = storeToRefs(settingStore)
const MsgInputRef = ref()
/** 是否是编辑模式 */
const isEdit = ref(false)
const inputInstRef = ref<InputInst | null>(null)
/** 原始标题 */
const originalTitle = ref('')
/** 当前聊天的标题和id */
const currentChat = ref({
  id: '0',
  title: '',
  messageCount: 0
})

// 消息列表
interface Message {
  type: 'user' | 'assistant'
  content: string
  streaming?: boolean
  timestamp?: number
}

const messageList = ref<Message[]>([])
const chatContainerRef = ref<HTMLElement | null>(null)

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
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
  console.log('🎯 Chat页面收到AI发送请求:', {
    内容: data.content,
    当前模型: selectedModel.value?.name,
    时间: new Date().toISOString()
  })

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
      timestamp: Date.now()
    })

    // 添加AI消息占位符（用于流式更新）
    const aiMessageIndex = messageList.value.length
    messageList.value.push({
      type: 'assistant',
      content: '',
      streaming: true,
      timestamp: Date.now()
    })

    // 滚动到底部
    scrollToBottom()

    // 用于累积AI回复内容
    let accumulatedContent = ''

    // 调用流式 API，使用 Promise 包装
    await messageSendStream(
      {
        conversationId: currentChat.value.id,
        content: content,
        useContext: true
      },
      {
        // 接收到数据块时的回调
        onChunk: (chunk: string) => {
          try {
            // 解析JSON数据
            const data = JSON.parse(chunk)
            if (data.success && data.data?.receive?.content) {
              const incrementalContent = data.data.receive.content

              // 手动累加内容（服务器返回的是增量内容）
              accumulatedContent += incrementalContent

              // 更新AI消息内容
              messageList.value[aiMessageIndex].content = accumulatedContent

              // 滚动到底部
              scrollToBottom()

              console.log('📨 收到AI流式数据 [增量]:', {
                增量内容: incrementalContent,
                累积长度: accumulatedContent.length,
                完整内容: accumulatedContent
              })
            }
          } catch (e) {
            console.error('❌ 解析JSON失败:', e, '原始数据:', chunk)
          }
        },
        // 流结束时的回调
        onDone: () => {
          console.log('✅ AI流式响应完成，最终内容:', accumulatedContent)
          // 标记流式结束
          messageList.value[aiMessageIndex].streaming = false
          scrollToBottom()
        },
        // 错误回调
        onError: (error: string) => {
          console.error('❌ AI流式响应错误:', error)
          messageList.value[aiMessageIndex].content = '抱歉，发生了错误：' + error
          messageList.value[aiMessageIndex].streaming = false
        }
      }
    )

    console.log('✅ AI消息发送成功')

    // 清空输入框
    if (MsgInputRef.value?.clearInput) {
      MsgInputRef.value.clearInput()
    }

    // 更新消息计数
    currentChat.value.messageCount += 2 // 用户消息 + AI消息

    window.$message.success('AI回复完成')
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

    console.log('📋 获取到模型列表:', {
      数量: modelList.value.length,
      模型名称: modelList.value.map((m) => m.name)
    })

    // 如果模型列表不为空且当前没有选择模型，自动选择第一个
    if (modelList.value.length > 0 && !selectedModel.value) {
      // 优先选择可用的模型，否则选择第一个
      const firstAvailableModel = modelList.value.find((model) => model.status === 0) || modelList.value[0]
      if (firstAvailableModel) {
        console.log('🤖 自动选择模型:', firstAvailableModel.name)
        // 使用 nextTick 确保 DOM 更新完成
        nextTick(() => {
          selectModel(firstAvailableModel)
        })
      }
    }
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
const selectModel = (model: any) => {
  selectedModel.value = model
  console.log('✅ 选择模型:', model.name)

  // 这里可以添加选择模型后的逻辑，比如更新当前会话的模型
  window.$message.success(`已选择模型: ${selectedModel.value.name}`)
  showModelPopover.value = false

  // 可以通过mitt通知其他组件模型已选择
  useMitt.emit('model-selected', model)
}

// 处理模型分页变化
const handleModelPageChange = (page: number) => {
  modelPagination.value.pageNo = page
  fetchModelList()
}

const handleBlur = () => {
  isEdit.value = false
  if (originalTitle.value === currentChat.value.title) {
    return
  }
  if (currentChat.value.title === '') {
    currentChat.value.title = `新的聊天${currentChat.value.id}`
  }
  window.$message.success(`已重命名为 ${currentChat.value.title}`, {
    icon: () => h(NIcon, null, { default: () => h('svg', null, [h('use', { href: '#face' })]) })
  })
  useMitt.emit('update-chat-title', { title: currentChat.value.title, id: currentChat.value.id })
}

const handleEdit = () => {
  originalTitle.value = currentChat.value.title
  isEdit.value = true
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

onMounted(() => {
  console.log('为什么会被挂载两次?')
  fetchModelList()

  useMitt.on('left-chat-title', (e) => {
    const { title, id } = e
    if (id === currentChat.value.id) {
      currentChat.value.title = title
      currentChat.value.messageCount = e.messageCount
    }
  })
  useMitt.on('chat-active', (e) => {
    const { title, id, messageCount } = e
    currentChat.value.title = title || `新的聊天${currentChat.value.id}`
    currentChat.value.id = id
    currentChat.value.messageCount = messageCount
  })
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/render-message';

/* 主容器布局 */
.chat-main-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
  overflow-y: auto;
  min-height: 0;
}

/* 输入框容器固定在底部 */
.chat-input-container {
  flex-shrink: 0;
  background: var(--bg-color);
}

.right-btn {
  @apply size-fit border-(1px solid [--line-color]) cursor-pointer bg-[--chat-bt-color] color-[--chat-text-color] rounded-8px custom-shadow p-[10px_11px];
  svg {
    @apply size-18px;
  }
}

.options {
  padding-left: 4px;
  svg {
    @apply size-22px cursor-pointer outline-none;
  }
}

/* 消息气泡样式 */
.bubble-user {
  background: var(--primary-color, #18a058);
  color: white;
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 100%;
  word-wrap: break-word;
}

/* 流式光标效果 */
.streaming-cursor::after {
  content: '▋';
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
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
</style>
