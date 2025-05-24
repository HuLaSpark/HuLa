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
      class="w-full p-[10px_16px_26px_16px] box-border"
      style="height: calc(100vh - 380px)">
      <Transition name="chat-init" appear mode="out-in" @after-leave="handleTransitionComplete">
        <div>
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
            :estimatedItemHeight="76"
            :buffer="5"
            :is-loading-more="isLoadingMore"
            @scroll="handleScroll"
            @scroll-direction-change="handleScrollDirectionChange"
            @load-more="handleLoadMore"
            class="scrollbar-container"
            :class="{ 'hide-scrollbar': !showScrollbar }"
            :style="{ height: `calc(100vh - 400px)` }"
            @mouseenter="showScrollbar = true"
            @mouseleave="showScrollbar = false">
            <template #default="{ item, index }">
              <div
                class="flex flex-col w-full"
                :key="index"
                :class="[{ 'items-end': item.role === 'user' }, 'gap-2px']">
                <div class="flex items-start" :class="item.role === 'user' ? 'flex-row-reverse' : ''">
                  <!-- 头像 -->
                  <n-avatar
                    :class="item.role === 'user' ? 'ml-8px' : 'mr-8px'"
                    bordered
                    round
                    :src="AvatarUtils.getAvatarUrl(userStore.userInfo.avatar!)"
                    :size="35" />

                  <n-flex
                    vertical
                    justify="center"
                    :size="6"
                    class="color-[--text-color] flex-1"
                    :class="item.role === 'user' ? 'items-end mr-10px' : ''">
                    <n-flex :size="6" align="center" :style="item.role === 'user' ? 'flex-direction: row-reverse' : ''">
                      <n-flex
                        :size="6"
                        class="select-none"
                        align="center"
                        :style="item.role === 'user' ? 'flex-direction: row-reverse' : ''">
                        <span class="text-12px select-none color-#909090 inline-block align-top">
                          {{ userStore.userInfo.name }}
                        </span>
                      </n-flex>
                    </n-flex>

                    <!--  气泡样式  -->
                    <ContextMenu
                      class="w-fit relative flex flex-col"
                      :class="item.role === 'user' ? 'items-end' : 'items-start'"
                      :style="{ '--bubble-max-width': '50vw' }">
                      <div
                        style="white-space: pre-wrap"
                        class="select-text mb-[10px]"
                        :class="item.role === 'user' ? 'bubble-oneself' : 'bubble'">
                        <span v-if="item.contentType === 'text'" v-html="item.content"></span>
                        <span v-if="item.contentType === 'think'">正在思考...</span>
                      </div>
                    </ContextMenu>
                  </n-flex>
                </div>
              </div>
            </template>
          </VirtualList>
        </div>
      </Transition>
    </div>

    <div class="h-1px bg-[--line-color]"></div>
    <!-- 下半部分输入框以及功能栏 -->
    <n-flex vertical :size="6" class="size-full p-[8px_22px] box-border">
      <n-flex align="center" :size="26" class="options">
        <n-dropdown
          :render-icon="handleRenderIcon"
          :on-select="handleSelModel"
          :options="modelsOptions"
          placement="bottom-start"
          trigger="click">
          <n-popover trigger="hover" :show-arrow="false" placement="top">
            <template #trigger>
              <div
                :class="[
                  'cursor-default size-[30px] flex-center rounded-5px',
                  currentModel.key ? 'text-(12px #707070) bg-[--chat-hover-color] rounded-5px' : ''
                ]">
                <svg>
                  <use :href="`#model`"></use>
                </svg>
              </div>
            </template>
            <p>模型</p>
          </n-popover>
        </n-dropdown>
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
        <n-button class="mt-[8px] cursor-default" type="primary" size="medium" @click="handleSubmit">发送</n-button>
      </div>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
// import MsgInput from '@/components/rightBox/MsgInput.vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { InputInst, NIcon } from 'naive-ui'
import { useSettingStore } from '@/stores/setting.ts'
// useAiChatStore
import { useChatMain } from '@/hooks/useChatMain.ts'
import { useAiChatStore } from '@/stores/aiChat.ts'
import { fetchChatAPI, fetchChatAPIProcess, fetchChatMessageAPI, listChatMessage } from '@/plugins/robot/api'
import VirtualList, { type VirtualListExpose } from '@/components/common/VirtualList.vue'
import { AvatarUtils } from '@/utils/AvatarUtils.ts'
import { useUserStore } from '@/stores/user.ts'
// import { useSSE } from '@/plugins/robot/hook/useSSE.ts'
import { ref, computed, onMounted, nextTick } from 'vue'
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
  id: 0,
  title: '',
  chatNumber: null
})
/** 输入框的值 */
const prompt = ref('')
/** message loading */
const messageLoading = ref(false)
const chatMessageList = ref<Array<any>>([])
/** 是否第一次发消息 */
const isFirstSend = ref(true)
/** 模型列表 */
const modelsOptions = computed(() => aiChatStore.aiModels)
/**  */
const currentModel = ref({
  createdTime: '',
  icon: '',
  id: '',
  knowledge: '',
  localModelType: 0,
  model: '',
  modelUrl: '',
  name: '',
  sort: 0,
  status: 1,
  version: '',
  label: '',
  key: ''
})

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

const { scrollTop } = useChatMain()

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
    scrollToBottom()
  })
}

const scrollToBottom = () => {
  if (!virtualListInst.value) return
  virtualListInst.value?.scrollTo({ position: 'bottom', behavior: 'instant' })
}

// const SCROLL_THRESHOLD = 200

// function throttle(fn: any, delay: number) {
//   let lastCall = 0
//   return (...args: any[]) => {
//     const now = Date.now()
//     if (now - lastCall >= delay) {
//       lastCall = now
//       return fn(...args)
//     }
//   }
// }

// 处理滚动事件(用于页脚显示功能)
const handleScroll = () => {
  if (isAutoScrolling.value) return // 如果是自动滚动，不处理
  const container = virtualListInst.value?.getContainer()
  if (!container) return

  // 获取已滚动的距离
  scrollTop.value = container.scrollTop

  // 存储 requestAnimationFrame 的返回值
  if (rafId.value) {
    cancelAnimationFrame(rafId.value)
  }

  rafId.value = requestAnimationFrame(async () => {
    // 处理触顶加载更多
    if (scrollTop.value < 26) {
      // 如果正在加载或已经触发了加载，则不重复触发
      if (isLoadingMore.value) return

      await handleLoadMore()
    }
  })
}

// 处理滚动方向变化
const handleScrollDirectionChange = (direction: 'up' | 'down') => {
  isScrollingUp.value = direction === 'up'
  isScrollingDown.value = direction === 'down'
}

// 处理加载更多
const handleLoadMore = async () => {
  // 如果正在加载或已经触发了加载，则不重复触发
  if (isLoadingMore.value) return
  // 记录当前的内容高度
  const container = virtualListInst.value?.getContainer()
  if (!container) return
  const oldScrollHeight = container.scrollHeight

  isLoadingMore.value = true

  // 使用CSS变量控制滚动行为，避免直接操作DOM样式
  container.classList.add('loading-history')

  try {
    // 加载历史消息
    pageNum.value++
    await handleGetMessageList()

    // 加载完成后，计算新增内容的高度差，并设置滚动位置
    await nextTick()
    const newScrollHeight = container.scrollHeight
    const heightDiff = newScrollHeight - oldScrollHeight
    if (heightDiff > 0) {
      container.scrollTop = heightDiff
    }

    // 更新消息索引映射
    // updateMessageIndexMap()
  } catch (error) {
    console.error('加载历史消息失败:', error)
  } finally {
    // 恢复滚动交互
    setTimeout(() => {
      container.classList.remove('loading-history')
      isLoadingMore.value = false
    }, 100)
  }
}

// 提交事件
const handleSubmit = () => {
  if (!currentModel.value.model) {
    window.$message.error('请选择模型')
    return
  }
  const chatNumber = currentChat.value.chatNumber
    ? currentChat.value.chatNumber
    : Math.random().toString(36).substring(2, 15)
  if (isFirstSend.value && !currentChat.value.chatNumber) handleFirstSendMsg()
  else handleSend(chatNumber)
}

/** 第一次发消息时是创建会话 */
const handleFirstSendMsg = () => {
  const chatNumber = currentChat.value.chatNumber
    ? currentChat.value.chatNumber
    : Math.random().toString(36).substring(2, 15)
  fetchChatAPI({
    chatNumber: chatNumber,
    prompt: prompt.value,
    model: currentModel.value.model,
    modelVersion: currentModel.value.version
  })
    .then((res) => {
      console.log(res)
      currentChat.value.chatNumber = res.chatNumber
      handleSend(res.chatNumber)
      isFirstSend.value = false
      useMitt.emit('get-chat-list')
    })
    .finally(() => {
      prompt.value = ''
    })
}

/** 发送消息 */
const handleSend = (chatNumber: string) => {
  // const { connect } = useSSE('api/chat/sse/create')
  // connect()
  chatMessageList.value.push({
    content: prompt.value,
    contentType: 'text',
    parentMessageId: '',
    role: 'user'
  })
  scrollToBottom()

  let answer: any = {
    content: '',
    contentType: 'think',
    parentMessageId: '',
    role: 'assistant'
  }
  chatMessageList.value.push(answer)
  scrollToBottom()

  const len = chatMessageList.value.length
  const targetIndex = len - 1
  fetchChatMessageAPI({
    chatNumber: chatNumber,
    prompt: prompt.value,
    model: currentModel.value.model,
    modelVersion: currentModel.value.version
  })
    .then((res: string) => {
      console.log(res)
      if (res) {
        chatMessageList.value.forEach((item) => {
          if (item.parentMessageId) item.parentMessageId = res
        })
        fetchChatAPIProcess({ conversationId: res, fileIds: [] })
          .then((response) => response.text())
          .then((result) => {
            // 假设 result 是一个包含多行文本的字符串
            console.log('result:', result)
            const str = result.split('\n')
            const validLines = str.filter(Boolean) // 过滤掉空行

            if (validLines.length > 0) {
              answer = JSON.parse(validLines[validLines.length - 1])
            }
            console.log('answer:')
            console.log(answer)
            const bak = JSON.parse(JSON.stringify(answer))

            // 确保不会越界
            if (bak.content && targetIndex >= 0 && chatMessageList.value[targetIndex]) {
              chatMessageList.value[targetIndex].content = ''
              chatMessageList.value[targetIndex].contentType = 'text'

              console.log('answer:')
              console.log(bak)
              // 打字动画函数
              console.log('bak.content:', bak.content)
              const chank = bak.content.split('')
              let index = 0
              const typingSpeed = 50
              const timer = setInterval(() => {
                if (index < chank.length) {
                  chatMessageList.value[targetIndex].content += chank[index]
                  index++
                } else {
                  clearInterval(timer)
                  scrollToBottom()
                }
              }, typingSpeed)

              // 如果需要支持取消动画，可将 timer 存入组件状态中
            } else {
              chatMessageList.value[targetIndex].content = ''
              chatMessageList.value[targetIndex].contentType = 'error'
              chatMessageList.value[targetIndex].content = bak.msg
              scrollToBottom()
            }
          })
          .catch((error) => {
            console.error('Error:', error)
            // 处理错误
            chatMessageList.value[targetIndex].content = ''
            chatMessageList.value[targetIndex].contentType = 'error'
            chatMessageList.value[targetIndex].content = error
            scrollToBottom()
          })
      }
    })
    .catch((error) => {
      console.error('Error:', error)
      // 处理错误
      chatMessageList.value[targetIndex].content = ''
      chatMessageList.value[targetIndex].contentType = 'error'
      chatMessageList.value[targetIndex].content = error
      scrollToBottom()
    })
    .finally(() => {
      prompt.value = ''
    })
}

// 修改为返回 Promise，方便在 handleScroll 中处理
const handleGetMessageList = (isToBottom: boolean = true): Promise<void> => {
  isLoadingMore.value = true
  return new Promise((resolve, reject) => {
    listChatMessage({
      current: pageNum.value,
      size: size.value,
      chatNumber: currentChat.value.chatNumber
    })
      .then((res: any) => {
        console.log(res)
        // 添加到chatMessageList最前
        if (pageNum.value === 1) {
          chatMessageList.value = res
        } else {
          if (res.length === 0) {
            setTimeout(() => {
              isTop.value = true
            }, 300)
          } else {
            isTop.value = false
            chatMessageList.value = [...res, ...chatMessageList.value]
          }
        }
        // chatMessageList.value.reverse()
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

const handleRenderIcon = (option: any) => {
  const icon = option.model // 假设每个 option 中有 model 字段表示图标名
  return h(NIcon, null, { default: () => h('svg', null, [h('use', { href: `#${icon}` })]) })
}

const handleSelModel = (key: string) => {
  console.log('version:', key)
  currentModel.value = aiChatStore.aiModels.find((item: any) => item.key === key)
  console.log('currentModel.value:', currentModel.value)
}

onMounted(() => {
  useMitt.on('left-chat-title', (e) => {
    const { title, id } = e
    if (id === currentChat.value.id) {
      currentChat.value.title = title
    }
  })
  useMitt.on('chat-active', (e) => {
    const { title, id, chatNumber } = e
    console.log('e:', e)
    currentChat.value.title = title || `新的聊天${currentChat.value.id}`
    currentChat.value.id = id
    currentChat.value.chatNumber = chatNumber
    console.log('currentChat.value:', currentChat.value)
    // 初始化消息列表
    pageNum.value = 1
    messageLoading.value = true
    handleGetMessageList()
  })
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
</style>
