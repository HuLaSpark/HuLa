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
      :class="{ 'shadow-inner': page.shadow }"
      class="w-full p-[28px_16px] box-border"
      style="height: calc(100vh - 400px)">
      <!--      <n-flex :size="6">-->
      <!--        <n-avatar-->
      <!--          class="rounded-8px"-->
      <!--          src="https://img1.baidu.com/it/u=3613958228,3522035000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500" />-->
      <!--        <n-flex vertical justify="space-between">-->
      <!--          <p class="text-(12px [&#45;&#45;chat-text-color])">GPT-4</p>-->

      <!--          &lt;!&ndash;  气泡样式  &ndash;&gt;-->
      <!--          <ContextMenu>-->
      <!--            <div style="white-space: pre-wrap" class="bubble select-text">-->
      <!--              <span v-html="'你好，我是GPT4机器人，很高兴为您服务。'"></span>-->
      <!--            </div>-->
      <!--          </ContextMenu>-->
      <!--        </n-flex>-->
      <!--      </n-flex>-->

      <Transition name="chat-init" appear mode="out-in" @after-leave="handleTransitionComplete">
        <div>
          <!-- 初次加载的骨架屏 -->
          <n-flex
            v-if="messageLoading"
            vertical
            :size="18"
            :style="{ 'max-height': `calc(100vh - 350px)` }"
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
          <n-scrollbar v-else ref="virtualListInst" :style="{ 'max-height': `calc(100vh - 440px)` }">
            <n-flex v-if="chatMessageList.length === 0" justify="center" :size="18">
              <p class="text-[#707070]">暂无数据</p>
            </n-flex>
            <template v-for="(item, index) in chatMessageList">
              <n-flex :size="6" v-if="item.role === 'assistant'" :key="index">
                <n-avatar
                  class="rounded-8px"
                  src="https://img1.baidu.com/it/u=3613958228,3522035000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500" />
                <n-flex vertical justify="space-between">
                  <p class="text-(12px [--chat-text-color])">GPT-4</p>

                  <!--  气泡样式  -->
                  <ContextMenu>
                    <div style="white-space: pre-wrap" class="bubble select-text mb-[10px]">
                      <span v-if="item.contentType === 'text'" v-html="item.content"></span>
                      <div v-if="item.contentType === 'think'" class="flex-start-center">
                        <span>正在思考</span>
                        <img class="size-14px ml-2" src="@/assets/img/loading.svg" alt="" />
                      </div>
                    </div>
                  </ContextMenu>
                </n-flex>
              </n-flex>

              <n-flex :size="6" v-if="item.role === 'user'" justify="end" :key="index">
                <n-flex vertical justify="space-between">
                  <!--  气泡样式  -->
                  <ContextMenu>
                    <div style="white-space: pre-wrap" class="bubble-oneself select-text mb-[10px]">
                      <span v-html="item.content"></span>
                    </div>
                  </ContextMenu>
                </n-flex>
                <n-avatar bordered round :src="AvatarUtils.getAvatarUrl(userStore.userInfo.avatar!)" :size="35" />
              </n-flex>
            </template>
          </n-scrollbar>
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
          trigger="click"
          key-field="version"
          label-field="name">
          <n-popover trigger="hover" :show-arrow="false" placement="top">
            <template #trigger>
              <svg><use :href="`#model`"></use></svg>
            </template>
            <p>模型</p>
          </n-popover>
        </n-dropdown>
        <n-popover trigger="hover" :show-arrow="false" placement="top">
          <template #trigger>
            <svg><use :href="`#voice`"></use></svg>
          </template>
          <p>语音输入</p>
        </n-popover>
        <n-popover trigger="hover" :show-arrow="false" placement="top">
          <template #trigger>
            <svg><use :href="`#plugins2`"></use></svg>
          </template>
          <p>插件</p>
        </n-popover>

        <div class="flex items-center gap-6px bg-[--chat-hover-color] rounded-50px w-fit h-fit p-[4px_6px]">
          <svg style="width: 22px; height: 22px; outline: none; cursor: pointer"><use href="#explosion"></use></svg>
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
        <n-button class="mt-[8px]" type="primary" size="medium">发送</n-button>
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
import { useAiChatStore } from '@/stores/aiChat.ts'
import { fetchChatAPI, fetchChatAPIProcess, fetchChatMessageAPI, listChatMessage } from '@/plugins/robot/api'
import { AvatarUtils } from '@/utils/AvatarUtils.ts'
import { useUserStore } from '@/stores/user.ts'
// import { useSSE } from '@/plugins/robot/hook/useSSE.ts'

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
/** 虚拟列表 */
const virtualListInst = useTemplateRef<any>('virtualListInst')
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
  version: ''
})

// const features = ref([
//   {
//     icon: 'model',
//     label: '模型'
//   },
//   {
//     icon: 'voice',
//     label: '语音输入'
//   },
//   {
//     icon: 'plugins2',
//     label: '插件'
//   }
// ])

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
  virtualListInst.value?.scrollTo({ position: 'bottom', behavior: 'auto' })
}

// 提交事件
const handleSubmit = () => {
  if (!currentModel.value.model) {
    window.$message.error('请选择模型')
    return
  }
  if (isFirstSend.value && !currentChat.value.chatNumber) handleFirstSendMsg()
  else handleSend()
}

/** 第一次发消息时是创建会话 */
const handleFirstSendMsg = () => {
  fetchChatAPI({
    chatNumber: currentChat.value.chatNumber,
    prompt: prompt.value,
    model: currentModel.value,
    modelVersion: currentModel.value.version
  })
    .then((res) => {
      console.log(res)
      handleSend()
      isFirstSend.value = false
    })
    .finally(() => {
      prompt.value = ''
    })
}

/** 发送消息 */
const handleSend = () => {
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

  fetchChatMessageAPI({
    chatNumber: currentChat.value.chatNumber,
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
            const len = chatMessageList.value.length
            const targetIndex = len - 1

            // 确保不会越界
            if (targetIndex >= 0 && chatMessageList.value[targetIndex]) {
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
            }
          })
          .catch((error) => console.log('error', error))
      }
    })
    .finally(() => {
      prompt.value = ''
    })
}

const handleInitMessageList = () => {
  messageLoading.value = true
  listChatMessage({
    current: 1,
    size: 10,
    chatNumber: currentChat.value.chatNumber
  })
    .then((res: any) => {
      console.log(res)
      chatMessageList.value = res
      setTimeout(() => {
        scrollToBottom()
      }, 200)
    })
    .finally(() => {
      messageLoading.value = false
      scrollToBottom()
    })
}

const handleRenderIcon = (option: any) => {
  const icon = option.model // 假设每个 option 中有 model 字段表示图标名
  return h(NIcon, null, { default: () => h('svg', null, [h('use', { href: `#${icon}` })]) })
}

const handleSelModel = (version: string) => {
  console.log('version:', version)
  currentModel.value = aiChatStore.aiModels.find((item: any) => item.version === version)
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
    handleInitMessageList()
  })
  if (isFirstSend.value) {
    // 初始化消息列表
    handleInitMessageList()
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
</style>
