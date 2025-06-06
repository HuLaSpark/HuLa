<template>
  <!-- 主体内容 -->
  <!--  // TODO 考虑是否需要添加一个欢迎页面，而不是直接使用聊天窗口 (nyh -> 2024-07-01 10:44:14)-->
  <main>
    <div data-tauri-drag-region class="flex truncate p-[8px_20px_14px_20px] justify-between items-center gap-50px">
      <n-flex :size="10" vertical class="truncate">
        <p
          v-if="!isEdit"
          @click="handleEdit"
          class="leading-7 text-(22px [--chat-text-color]) truncate font-500 hover:underline cursor-pointer">
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
          style="width: 200px"
          class="leading-7 text-14px rounded-6px">
        </n-input>
        <p class="text-(14px #707070)">共0条对话</p>
      </n-flex>

      <n-flex class="min-w-fit">
        <div class="right-btn" @click="handleEdit">
          <svg>
            <use href="#edit"></use>
          </svg>
        </div>

        <div class="right-btn">
          <svg>
            <use href="#Sharing"></use>
          </svg>
        </div>
      </n-flex>
    </div>
    <div class="h-1px bg-[--line-color]"></div>

    <!-- 聊天信息框 -->
    <div
      :class="{ 'shadow-inner': page.shadow }"
      class="w-full p-[10px_16px_10px_16px] box-border relative"
      style="height: calc(100vh - 380px)">
      <Transition name="chat-init" appear mode="out-in" @after-leave="handleTransitionComplete">
        <div class="flex flex-col-reverse h-full">
          <!-- 初次加载的骨架屏 -->
          <n-flex
            v-if="messageLoading"
            vertical
            :size="18"
            :style="{ 'max-height': `calc(98%)` }"
            class="relative h-100vh box-border p-20px">
            <n-flex justify="end">
              <n-skeleton style="border-radius: 14px" height="40px" width="46%" :sharp="false" />
              <n-skeleton height="40px" circle />
            </n-flex>

            <n-flex>
              <n-skeleton height="40px" circle />
              <n-skeleton style="border-radius: 14px" height="60px" width="58%" :sharp="false" />
            </n-flex>

            <n-flex>
              <n-skeleton height="40px" circle />
              <n-skeleton style="border-radius: 14px" height="40px" width="26%" :sharp="false" />
            </n-flex>

            <n-flex justify="end">
              <n-skeleton style="border-radius: 14px" height="40px" width="60%" :sharp="false" />
              <n-skeleton height="40px" circle />
            </n-flex>
          </n-flex>

          <!-- 聊天内容 -->
          <VirtualList
            v-else
            ref="virtualListInst"
            :items="chatMessageList"
            :estimatedItemHeight="60"
            :buffer="5"
            :is-loading-more="isLoadingMore"
            :is-last="isTop"
            @scroll="handleScroll"
            @scroll-direction-change="handleScrollDirectionChange"
            @load-more="handleLoadMore"
            class="scrollbar-container w-full"
            :class="{ 'hide-scrollbar': !showScrollbar }"
            :style="{ maxHeight: 'calc(100vh - 400px)' }"
            @mouseenter="showScrollbar = true"
            @mouseleave="showScrollbar = false">
            <template #default="{ item, index }">
              <div
                class="flex flex-col w-full"
                :key="index"
                :class="[{ 'items-end': item.type === 'user' }, 'gap-2px']">
                <div class="flex items-start" :class="item.type === 'user' ? 'flex-row-reverse' : ''">
                  <!-- 头像 -->
                  <n-avatar
                    :class="item.type === 'user' ? 'ml-8px' : 'mr-8px'"
                    bordered
                    round
                    :src="AvatarUtils.getAvatarUrl(userStore.userInfo.avatar!)"
                    :size="35" />

                  <n-flex
                    vertical
                    justify="center"
                    :size="6"
                    class="color-[--text-color] flex-1"
                    :class="item.type === 'user' ? 'items-end mr-10px' : ''">
                    <n-flex :size="6" align="center" :style="item.type === 'user' ? 'flex-direction: row-reverse' : ''">
                      <n-flex
                        :size="6"
                        class="select-none"
                        align="center"
                        :style="item.type === 'user' ? 'flex-direction: row-reverse' : ''">
                        <span class="text-12px select-none color-#909090 inline-block align-top">
                          {{ userStore.userInfo.name }}
                        </span>
                      </n-flex>
                    </n-flex>

                    <!--  气泡样式  -->
                    <ContextMenu
                      class="w-fit relative flex flex-col"
                      :class="item.type === 'user' ? 'items-end' : 'items-start'"
                      :style="{ '--bubble-max-width': '50vw' }">
                      <div
                        style="white-space: pre-wrap"
                        class="select-text mb-[10px] relative"
                        :class="item.type === 'user' ? 'bubble-oneself' : 'bubble'">
                        <span v-if="item.content === 'think'" class="thinking-animation">
                          正在思考
                          <span class="thinking-dots">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                          </span>
                        </span>
                        <span v-else class="relative">
                          <span v-html="item.content" class="streaming-text"></span>
                          <!-- 添加闪烁光标，只在AI回复且对话进行中时显示 -->
                          <span
                            v-if="
                              item.type === 'assistant' &&
                              conversationInProgress &&
                              index === chatMessageList.length - 1
                            "
                            class="typing-cursor"
                            >|</span
                          >
                        </span>
                      </div>
                    </ContextMenu>
                  </n-flex>
                </div>
              </div>
            </template>
          </VirtualList>
        </div>
      </Transition>

      <!-- 回到底部按钮 -->
      <Transition name="scroll-to-bottom">
        <div
          v-if="!isNearBottom && !messageLoading && chatMessageList.length > 0"
          @click="forceScrollToBottom"
          class="scroll-to-bottom-btn bg-[--chat-right-bg]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
          </svg>
          <span v-if="conversationInProgress" class="text-xs">AI正在回复...</span>
          <!-- <span v-else class="text-xs"></span> -->
        </div>
      </Transition>
    </div>

    <div class="h-1px bg-[--line-color]"></div>
    <!-- 下半部分输入框以及功能栏 -->
    <n-flex vertical :size="6" class="size-full p-[8px_22px] box-border">
      <n-flex align="center" :size="26" class="options">
        <n-popselect
          v-model:value="currentModel"
          scrollable
          :options="modelscOptions"
          :on-update:value="handleModelChange"
          size="medium">
          <n-popover trigger="hover" :show-arrow="false" placement="top">
            <template #trigger>
              <div
                :class="[
                  'cursor-default size-[30px] flex-center rounded-5px',
                  currentModel ? 'text-(12px #707070) bg-[--chat-hover-color] rounded-5px' : ''
                ]">
                <svg>
                  <use :href="`#model`"></use>
                </svg>
              </div>
            </template>
            <p>模型</p>
          </n-popover>
        </n-popselect>
        <n-popover trigger="hover" :show-arrow="false" placement="top">
          <template #trigger>
            <svg>
              <use :href="`#voice`"></use>
            </svg>
          </template>
          <p>语音输入</p>
        </n-popover>
        <n-popover trigger="hover" :show-arrow="false" placement="top">
          <template #trigger>
            <svg>
              <use :href="`#plugins2`"></use>
            </svg>
          </template>
          <p>插件</p>
        </n-popover>

        <div class="flex items-center gap-6px bg-[--chat-hover-color] rounded-50px w-fit h-fit p-[4px_6px]">
          <svg style="width: 22px; height: 22px; outline: none; cursor: pointer">
            <use href="#explosion"></use>
          </svg>
          <p class="text-(12px #707070) cursor-default select-none pr-6px">使用0</p>
        </div>
      </n-flex>

      <div class="flex flex-col items-end gap-6px">
        <n-auto-complete class="w-full">
          <template #default="{ handleInput, handleBlur, handleFocus }">
            <n-input
              class="w-full bg-transparent rounded-1"
              ref="inputRef"
              v-model:value="prompt"
              type="textarea"
              :placeholder="'来说点什么吧'"
              :autosize="{ minRows: 8, maxRows: 8 }"
              @input="handleInput"
              @focus="handleFocus"
              @blur="handleBlur"
              @keypress="handleEnter"></n-input>
          </template>
        </n-auto-complete>
        <n-button
          class="mt-[8px] cursor-default"
          type="primary"
          size="medium"
          :loading="conversationInProgress"
          v-if="conversationInProgress == false"
          @click="handleSubmit"
          >发送</n-button
        >
        <n-button
          class="mt-[8px] cursor-default stop-button"
          type="error"
          size="medium"
          v-if="conversationInProgress"
          @click="stopStream">
          <template #icon>
            <div class="stop-icon">⏹</div>
          </template>
          停止
        </n-button>
      </div>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
import { NAvatar } from 'naive-ui'
import { useMitt } from '@/hooks/useMitt.ts'
import { InputInst, NIcon } from 'naive-ui'
import { useSettingStore } from '@/stores/setting.ts'
// useAiChatStore
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useAiChatStore } from '@/stores/aiChat.ts'
import { ChatMessageApi } from '../api/chat/message'
import { ChatConversationApi, ChatConversationVO } from '../api/chat/conversation'
import VirtualList, { type VirtualListExpose } from '@/components/common/VirtualList.vue'
import { AvatarUtils } from '@/utils/AvatarUtils.ts'
import { useUserStore } from '@/stores/user.ts'
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const settingStore = useSettingStore()
const aiChatStore = useAiChatStore()
const { page } = storeToRefs(settingStore)
/** 是否是编辑模式 */
const isEdit = ref(false)
const inputInstRef = ref<InputInst | null>(null)
/** 原始标题 */
const originalTitle = ref('')
/** 当前聊天的标题和id */
const currentChat = ref({
  id: '0',
  title: ''
})
/** 输入框的值 */
const prompt = ref('')
/** message loading */
const messageLoading = ref(false)
const chatMessageList = ref<Array<any>>([])
/** 是否第一次发消息 */
const isFirstSend = ref(true)
/** 模型列表 */
const modelscOptions = computed(() => aiChatStore.aiModels)
/**  */
const currentModel = ref('')

const pageNum = ref<number>(1)
const size = ref<number>(10)
const isLoading = ref(false)
const isTop = ref(false)
// 添加标记，用于识别是否正在加载历史消息
const isLoadingMore = ref(false)
/** 虚拟列表 */
const virtualListInst = useTemplateRef<VirtualListExpose>('virtualListInst')
// 记录当前滚动位置相关信息
const isAutoScrolling = ref(false)

/** 记录是否正在向上滚动 */
const isScrollingUp = ref(false)
/** 记录是否正在向下滚动 */
const isScrollingDown = ref(false)
// 是否显示滚动条
const showScrollbar = ref(false)
// 记录 requestAnimationFrame 的返回值
const rafId = ref<number>()
// 滚动节流器
let scrollThrottleTimer: number | null = null
// 用户滚动状态
const isUserScrolling = ref(false)
const userScrollTimeout = ref<number | null>(null)
const isNearBottom = ref(false) // 初始化为false，等实际检测后再更新

const conversationInProgress = ref(false) // 对话是否正在进行中。目前只有【发送】消息时，会更新为 true，避免切换对话、删除对话等操作
const conversationInAbortController = ref<any>() // 对话进行中 abort 控制器(控制 stream 对话)
const enableContext = ref<boolean>(true) // 是否开启上下文
const { scrollTop } = useChatMain()

const handleModelChange = (value: string) => {
  currentModel.value = value
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

const handleEnter = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}

// 处理过渡动画完成后的滚动
const handleTransitionComplete = () => {
  nextTick(() => {
    // 动画完成后，用户还没有滚动操作，可以安全滚动到底部
    isNearBottom.value = true
    safeScrollToBottom('过渡动画完成')
  })
}

const scrollToBottom = () => {
  if (!virtualListInst.value) return

  // 详细的条件检查和日志
  const shouldSkip = isUserScrolling.value && !isNearBottom.value && !conversationInProgress.value

  // 如果用户正在手动滚动且不在底部附近，且不是对话进行中，则不自动滚动
  if (shouldSkip) {
    return
  }

  // 滚动节流，避免过于频繁的滚动
  if (scrollThrottleTimer) {
    return
  }

  scrollThrottleTimer = requestAnimationFrame(() => {
    virtualListInst.value?.scrollTo({
      position: 'bottom',
      behavior: 'smooth' // 改为smooth滚动
    })
    scrollThrottleTimer = null
  })
}

// 安全的滚动到底部函数 - 只在特定情况下才滚动
const safeScrollToBottom = (reason: string = '') => {
  // 只在以下情况才允许自动滚动：
  // 1. 用户没有在滚动
  // 2. 或者用户虽然在滚动但是接近底部
  // 3. 或者是强制滚动场景（如发送新消息）
  const forceScenarios = ['发送新消息', '添加思考消息', '过渡动画完成']
  const isForceScenario = forceScenarios.some((scenario) => reason.includes(scenario))

  if (isForceScenario || !isUserScrolling.value || isNearBottom.value) {
    // 如果是强制场景，临时设置为底部状态
    if (isForceScenario) {
      isNearBottom.value = true
    }
    scrollToBottom()
  }
}

// 强制滚动到底部（用户主动点击按钮）
const forceScrollToBottom = () => {
  if (!virtualListInst.value) return

  // 重置用户滚动状态
  isUserScrolling.value = false
  isNearBottom.value = true

  // 清除用户滚动超时
  if (userScrollTimeout.value) {
    clearTimeout(userScrollTimeout.value)
    userScrollTimeout.value = null
  }

  // 立即滚动到底部
  virtualListInst.value.scrollTo({
    position: 'bottom',
    behavior: 'smooth'
  })
}

// 处理滚动事件(用于页脚显示功能)
const handleScroll = () => {
  if (isAutoScrolling.value) return // 如果是自动滚动，不处理
  const container = virtualListInst.value?.getContainer()
  if (!container) return

  // 获取已滚动的距离
  scrollTop.value = container.scrollTop

  // 检测用户是否在手动滚动
  isUserScrolling.value = true

  // 清除之前的超时
  if (userScrollTimeout.value) {
    clearTimeout(userScrollTimeout.value)
  }

  // 800ms后认为用户停止滚动（延长时间）
  userScrollTimeout.value = window.setTimeout(() => {
    isUserScrolling.value = false
  }, 800)

  // 检测是否接近底部（距离底部100px以内算接近）
  const scrollHeight = container.scrollHeight
  const currentScrollTop = container.scrollTop
  const clientHeight = container.clientHeight
  const distanceFromBottom = scrollHeight - currentScrollTop - clientHeight

  isNearBottom.value = distanceFromBottom <= 100

  // 存储 requestAnimationFrame 的返回值
  if (rafId.value) {
    cancelAnimationFrame(rafId.value)
  }

  rafId.value = requestAnimationFrame(async () => {
    // 这里移除触顶加载逻辑，改为由VirtualList的@load-more事件处理
    // 只保留其他必要的滚动相关逻辑（如果有的话）
  })
}

// 处理滚动方向变化
const handleScrollDirectionChange = (direction: 'up' | 'down') => {
  isScrollingUp.value = direction === 'up'
  isScrollingDown.value = direction === 'down'
}

// 处理加载更多
const handleLoadMore = async () => {
  // 如果已经到达顶部，禁止继续加载
  if (isTop.value) {
    return
  }

  // 如果正在加载或已经触发了加载，则不重复触发
  if (isLoadingMore.value) {
    return
  }
  // 记录当前的内容高度
  const container = virtualListInst.value?.getContainer()
  if (!container) return
  const oldScrollHeight = container.scrollHeight
  const oldScrollTop = container.scrollTop

  isLoadingMore.value = true

  // 使用CSS变量控制滚动行为，避免直接操作DOM样式
  container.classList.add('loading-history')

  try {
    // 加载历史消息 - 注意这里传入false，避免自动滚动到底部
    pageNum.value++
    await handleGetMessageList(false)

    // 加载完成后，计算新增内容的高度差，并设置滚动位置
    await nextTick()
    const newScrollHeight = container.scrollHeight
    const heightDiff = newScrollHeight - oldScrollHeight

    // 保持用户当前的阅读位置，将滚动位置调整到加载前相对应的位置
    if (heightDiff > 0) {
      container.scrollTop = oldScrollTop + heightDiff
    }
  } catch (error) {
    // 处理错误但不输出console
  } finally {
    // 恢复滚动交互
    setTimeout(() => {
      container.classList.remove('loading-history')
      isLoadingMore.value = false
    }, 100)
  }
}

// 提交事件
const handleSubmit = async () => {
  if (!currentModel.value) {
    window.$message.error('请选择模型')
    return
  }
  if (isFirstSend.value) {
    isFirstSend.value = false
    if (chatMessageList.value.length === 0) {
      currentChat.value.title = prompt.value
      useMitt.emit('update-chat-title', { title: currentChat.value.title, id: currentChat.value.id })
    }
    await ChatConversationApi.updateChatConversationMy({
      id: Number(currentChat.value.id),
      title: currentChat.value.title,
      modelId: Number(currentModel.value)
    } as ChatConversationVO)
  }
  await handleSend()
}

/** 停止 stream 流式调用 */
const stopStream = async () => {
  // tip：如果 stream 进行中的 message，就需要调用 controller 结束
  if (conversationInAbortController.value) {
    conversationInAbortController.value.abort()
    conversationInAbortController.value = null
  }
  // 设置为 false
  conversationInProgress.value = false
}

/** 发送消息 */
const handleSend = async () => {
  const content = prompt.value

  // 如果已有进行中的对话，先停止
  if (conversationInProgress.value) {
    await stopStream()
  }

  // 创建 AbortController 实例，以便中止请求
  conversationInAbortController.value = new AbortController()
  // 标记对话进行中
  conversationInProgress.value = true

  chatMessageList.value.push({
    id: '-1',
    content: content,
    type: 'user',
    conversationId: currentChat.value.id
  })
  safeScrollToBottom('发送新消息')

  let answer: any = {
    id: '-2',
    content: 'think',
    type: 'assistant',
    conversationId: currentChat.value.id
  }
  chatMessageList.value.push(answer)
  safeScrollToBottom('添加思考消息')

  prompt.value = ''

  let isFirstChunk = true // 是否是第一个 chunk 消息段
  let updateTimer: number | null = null // 更新节流器
  let shouldScroll = false // 是否需要滚动

  // 高性能的节流更新函数
  const smoothUpdate = (newContent: string) => {
    // 直接更新内容，不使用节流缓存，避免内容丢失
    const lastIndex = chatMessageList.value.length - 1
    if (lastIndex >= 0 && chatMessageList.value[lastIndex].type === 'assistant') {
      // 立即更新内容
      chatMessageList.value[lastIndex].content = newContent

      // 检查新增内容是否足够长，需要滚动
      const contentLines = newContent.split('\n').length
      const isLongContent = contentLines > 5 || newContent.length > 500

      // 当内容较长或用户已接近底部时自动滚动
      const shouldAutoScroll = isLongContent || !isUserScrolling.value || isNearBottom.value

      if (shouldAutoScroll) {
        // 节流滚动操作
        if (!shouldScroll) {
          shouldScroll = true
          if (updateTimer) {
            cancelAnimationFrame(updateTimer)
          }
          updateTimer = requestAnimationFrame(() => {
            nextTick(() => {
              // 再次检查滚动条件，避免用户在这期间开始滚动
              scrollToBottom()
              shouldScroll = false
            })
            updateTimer = null
          })
        }
      }
    }
  }

  try {
    await ChatMessageApi.sendChatMessageStream(
      Number(currentChat.value.id),
      content,
      conversationInAbortController.value,
      enableContext.value,
      async (res: any) => {
        try {
          // 检查连接是否已被中止
          if (conversationInAbortController.value?.signal.aborted) {
            return
          }
          const parsedData = JSON.parse(res.data)

          const { data, msg } = parsedData
          if (!data) {
            window.$message.error(`对话异常! ${msg}`)
            await stopStream()
            return
          }

          // 如果内容为空，就不处理。
          if (!data?.receive?.content || data.receive.content === '') {
            return
          }

          // 首次返回需要添加一个 message 到页面，后面的都是更新
          if (isFirstChunk) {
            isFirstChunk = false
            // 弹出两个假数据
            chatMessageList.value.pop()
            chatMessageList.value.pop()
            // 更新返回的数据
            chatMessageList.value.push(data.send)
            chatMessageList.value.push(data.receive)

            // 确保AI开始回复时滚动到底部
            isNearBottom.value = true
            safeScrollToBottom('首次收到AI回复')
          } else {
            // 检查当前消息内容，决定更新策略
            const lastIndex = chatMessageList.value.length - 1
            if (lastIndex >= 0 && chatMessageList.value[lastIndex].type === 'assistant') {
              // 检查是否需要累积追加还是直接替换
              const currentContent = chatMessageList.value[lastIndex].content || ''
              let finalContent = ''

              // 更精确的内容判断逻辑
              if (currentContent === '' || data.receive.content.startsWith(currentContent)) {
                // 情况1：当前为空（首次）
                // 情况2：新内容以当前内容开头（完整内容模式）
                finalContent = data.receive.content
              } else if (currentContent.length > 0 && !data.receive.content.includes(currentContent)) {
                // 情况3：新内容不包含当前内容（增量模式）
                finalContent = currentContent + data.receive.content
              } else {
                // 情况4：其他情况，优先使用完整内容
                finalContent = data.receive.content
              }

              // 使用高性能的平滑更新
              smoothUpdate(finalContent)

              // 更新消息ID（如果有变化）
              if (data.receive.id && data.receive.id !== chatMessageList.value[lastIndex].id) {
                chatMessageList.value[lastIndex].id = data.receive.id
              }
            }
          }
        } catch (error) {
          // 不要因为单个消息解析错误就断开整个流
        }
      },
      async (err: any) => {
        // 检查是否是主动中止的
        if (err.name === 'AbortError' || conversationInAbortController.value?.signal.aborted) {
          return
        }

        // 显示错误消息
        if (err.message?.includes('连接失败')) {
          window.$message.error('连接失败，请检查网络或稍后重试')
          await stopStream()
        }
      },
      async () => {
        await stopStream()
      }
    )
  } catch (error) {
    // 检查是否是主动中止的错误
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      return
    }

    window.$message.error('发送消息失败，请重试')
    await stopStream()
  }
}

// 修改为返回 Promise，方便在 handleScroll 中处理
const handleGetMessageList = (isToBottom: boolean = true): Promise<void> => {
  isLoadingMore.value = true
  return new Promise((resolve, reject) => {
    if (currentChat.value.id === '0' || !currentChat.value.id || currentChat.value.id === '-1') {
      messageLoading.value = false
      isLoading.value = false
      isLoadingMore.value = false
      return resolve()
    }
    ChatMessageApi.getChatMessagePage({
      pageNo: pageNum.value,
      pageSize: size.value,
      conversationId: currentChat.value.id
    })
      .then((res: any) => {
        // 处理消息列表数据
        if (pageNum.value === 1) {
          // 首次加载，直接设置数据（最新消息在前，需要reverse）
          chatMessageList.value = res.list ? [...res.list].reverse() : []
          // 首次加载时，如果返回的数据少于页面大小，说明已经到顶了
          if (!res.list || res.list.length < size.value) {
            isTop.value = true
          }
        } else {
          // 加载历史消息
          if (!res.list || res.list.length === 0) {
            // 没有更多历史消息了
            isTop.value = true
          } else {
            // 有历史消息，添加到当前消息列表的前面
            // API返回的历史消息是从新到旧，所以需要reverse后添加到前面
            const historyMessages = [...res.list].reverse()
            chatMessageList.value = [...historyMessages, ...chatMessageList.value]
            // 如果返回的数据少于页面大小，说明已经到顶了
            if (res.list.length < size.value) {
              isTop.value = true
            }
          }
        }
        resolve()
      })
      .catch((error) => {
        reject(error)
      })
      .finally(() => {
        setTimeout(() => {
          messageLoading.value = false
          isLoading.value = false
          isLoadingMore.value = false
          if (isToBottom) {
            setTimeout(() => {
              scrollToBottom()
            }, 200)
          }
        }, 1000)
      })
  })
}

onMounted(() => {
  useMitt.on('left-chat-title', (e) => {
    const { title, id } = e
    if (id === currentChat.value.id) {
      currentChat.value.title = title
    }
  })
  useMitt.on('chat-active', (e) => {
    const { title, id } = e
    if (id) {
      currentChat.value.title = title || `新的聊天${currentChat.value.id}`
      currentChat.value.id = id
      // 初始化消息列表
      pageNum.value = 1
      isTop.value = false // 重置到顶部状态
      messageLoading.value = true
      handleGetMessageList()
    }
  })
})

// 组件卸载前清理
onBeforeUnmount(() => {
  if (conversationInProgress.value) {
    stopStream()
  }

  // 清理所有定时器，防止内存泄漏
  if (rafId.value) {
    cancelAnimationFrame(rafId.value)
  }
  if (scrollThrottleTimer) {
    cancelAnimationFrame(scrollThrottleTimer)
  }
  if (userScrollTimeout.value) {
    clearTimeout(userScrollTimeout.value)
  }
})
</script>
<style scoped lang="scss">
@use '@/styles/scss/chat-main';

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

/* 思考动画 */
.thinking-animation {
  display: inline-flex;
  align-items: center;
  color: #666;
  font-style: italic;
  will-change: auto;
  /* GPU优化 */
}

.thinking-dots {
  margin-left: 4px;
  display: inline-flex;

  span {
    animation: thinking-bounce 1.4s infinite ease-in-out;
    will-change: transform, opacity;
    /* GPU优化 */

    &:nth-child(1) {
      animation-delay: -0.32s;
    }

    &:nth-child(2) {
      animation-delay: -0.16s;
    }

    &:nth-child(3) {
      animation-delay: 0s;
    }
  }
}

@keyframes thinking-bounce {
  0%,
  80%,
  100% {
    transform: scale3d(0.8, 0.8, 1);
    /* 使用3D变换 */
    opacity: 0.5;
  }

  40% {
    transform: scale3d(1, 1, 1);
    opacity: 1;
  }
}

/* 打字光标动画 */
.typing-cursor {
  display: inline-block;
  color: #007acc;
  font-weight: bold;
  animation: cursor-blink 1s infinite;
  margin-left: 2px;
  will-change: opacity;
  /* GPU优化 */
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

/* 流式文本动画 - 简化版本 */
.streaming-text {
  /* 移除淡入动画，减少重排 */
  backface-visibility: hidden;
  /* 防止闪烁 */
  -webkit-font-smoothing: antialiased;
  /* 字体平滑 */
  overflow-wrap: break-word;
  word-break: break-word;
}

/* 气泡容器 - 移除过度动画 */
.bubble,
.bubble-oneself {
  /* 只保留必要的transition */
  transition: none;
  backface-visibility: hidden;
  /* 防止闪烁 */
  transform: translateZ(0);
  /* 强制GPU加速 */
}

/* 停止按钮动画 - 优化版本 */
.stop-button {
  animation: pulse-red 2s infinite;
  will-change: box-shadow;
  /* GPU优化 */

  &:hover {
    animation: none;
    transform: scale3d(1.05, 1.05, 1);
    /* 使用3D变换 */
    transition: transform 0.2s ease;
  }
}

.stop-icon {
  animation: rotate-stop 2s linear infinite;
  will-change: transform;
  /* GPU优化 */
}

@keyframes pulse-red {
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

@keyframes rotate-stop {
  0% {
    transform: rotate3d(0, 0, 1, 0deg);
    /* 使用3D变换 */
  }

  100% {
    transform: rotate3d(0, 0, 1, 360deg);
  }
}

/* 滚动优化 */
.scrollbar-container {
  /* 使用GPU加速的滚动 */
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
  /* 减少重绘 */
  contain: layout style paint;

  /* 优化滚动行为 */
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

/* 响应式优化 */
@media (prefers-reduced-motion: reduce) {
  .thinking-dots span,
  .typing-cursor,
  .streaming-text,
  .bubble,
  .bubble-oneself,
  .stop-button,
  .stop-icon {
    animation: none !important;
    transition: none !important;
    will-change: auto !important;
  }
}

/* 回到底部按钮 */
.scroll-to-bottom-btn {
  position: absolute;
  bottom: 30px;
  right: 30px;
  // background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 25px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  z-index: 100;
  will-change: transform, opacity;
  max-width: 150px;
  /* 限制最大宽度 */

  &:hover {
    background: rgba(255, 255, 255, 0.95);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    animation: bounce-arrow 2s infinite;
    flex-shrink: 0;
    /* 防止图标被压缩 */
  }

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* AI回复时按钮样式加强 */
.scroll-to-bottom-btn:has(span:first-child) {
  animation: pulse-attention 2s infinite;
}

@keyframes pulse-attention {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 120, 255, 0.4);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(0, 120, 255, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(0, 120, 255, 0);
  }
}

/* 回到底部按钮动画 */
@keyframes bounce-arrow {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-3px);
  }

  60% {
    transform: translateY(-1px);
  }
}

/* 按钮显示/隐藏动画 */
.scroll-to-bottom-enter-active,
.scroll-to-bottom-leave-active {
  transition: all 0.3s ease;
}

.scroll-to-bottom-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

.scroll-to-bottom-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}
</style>
