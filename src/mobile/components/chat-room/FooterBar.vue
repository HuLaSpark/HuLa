<template>
  <div ref="root">
    <!-- 隐藏的 contenteditable，用于复用 useMsgInput 的发送逻辑 -->
    <div
      ref="messageInputDom"
      contenteditable="true"
      spellcheck="false"
      style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; white-space: pre-wrap"></div>

    <div class="w-full min-h-92px bg-#FAFAFA flex flex-col z-2 footer-bar-shadow">
      <div class="flex flex-1">
        <div class="pt-10px ms-25px max-h-40px w-full flex items-center">
          <n-input
            ref="footerBarInput"
            v-model:value="inputValue"
            @focus="handleFocus"
            @blur="handleBlur"
            placeholder="输入/唤醒AI助手" />

          <n-button @click="handleSend" color="#13987f" size="small" class="ms-10px me-25px flex items-center">
            发送
            <svg class="h-15px w-15px iconpark-icon color-#white"><use href="#send"></use></svg>
          </n-button>
        </div>
      </div>

      <div class="flex justify-between px-25px flex-1 items-center py-10px">
        <div v-for="item in options" :key="item.icon" class="flex flex-wrap items-center" @click="clickItem(item.icon)">
          <div v-if="item.label !== 'file' && item.label !== 'image'">
            <svg class="h-24px w-24px iconpark-icon"><use :href="`#${item.icon}`"></use></svg>
            <svg
              v-if="item.showArrow"
              :class="['h-15px w-15px iconpark-icon transition-transform duration-300', item.isRotate ? 'rotate' : '']">
              <use href="#down" />
            </svg>
          </div>
          <div v-else-if="item.label === 'file'">
            <van-uploader multiple :after-read="afterReadFile">
              <svg class="h-24px w-24px iconpark-icon"><use :href="`#${item.icon}`"></use></svg>
              <svg
                v-if="item.showArrow"
                :class="[
                  'h-15px w-15px iconpark-icon transition-transform duration-300',
                  item.isRotate ? 'rotate' : ''
                ]">
                <use href="#down" />
              </svg>
            </van-uploader>
          </div>
          <div v-else-if="item.label === 'image'">
            <van-uploader accept="image/*" multiple :after-read="afterReadImage">
              <svg class="h-24px w-24px iconpark-icon"><use :href="`#${item.icon}`"></use></svg>
              <svg
                v-if="item.showArrow"
                :class="[
                  'h-15px w-15px iconpark-icon transition-transform duration-300',
                  item.isRotate ? 'rotate' : ''
                ]">
                <use href="#down" />
              </svg>
            </van-uploader>
          </div>
        </div>
      </div>

      <!-- 展开面板 -->
      <Transition @before-enter="beforeEnter" @enter="enter" @leave="leave">
        <div v-show="isPanelVisible" class="w-full overflow-hidden bg-#13987f flex flex-col">
          <div style="height: 180px"></div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploaderFileListItem } from 'vant/es'
import { useMobileStore } from '@/stores/mobile'
import 'vant/es/dialog/style'

// ==== 输入框事件 ====
const mobileStore = useMobileStore()
const emit = defineEmits(['focus', 'blur', 'updateHeight'])

const uploadFileList = ref<
  {
    url: string
    status: 'uploading' | 'failed' | 'done'
    message: string
  }[]
>([])

const afterReadImage = (fileList: UploaderFileListItem | UploaderFileListItem[]) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif']
  const files = Array.isArray(fileList) ? fileList : [fileList]

  console.log('选择的文件：', files)

  for (const file of files) {
    const rawFile = file.file

    if (!rawFile) {
      console.log('文件不存在:', file)
      continue
    }

    if (!validTypes.includes(rawFile.type)) {
      console.log('已过滤非图片文件:', file)
      if (!Array.isArray(fileList)) {
        window.$message.warning('只能选择图片哦~')
      }
      continue
    }

    uploadFileList.value.push({
      url: file.url as string,
      status: 'done',
      message: '待上传'
    })

    console.log('已添加文件：', file)
  }
}

const afterReadFile = (fileList: UploaderFileListItem | UploaderFileListItem[]) => {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif']
  const files = Array.isArray(fileList) ? fileList : [fileList]

  console.log('选择的文件：', files)

  for (const file of files) {
    const rawFile = file.file

    if (!rawFile) {
      console.log('文件不存在:', file)
      continue
    }

    // ✅ 只保留非图片文件
    if (imageTypes.includes(rawFile.type)) {
      console.log('已过滤图片文件:', file)
      continue
    }

    uploadFileList.value.push({
      url: file.url as string,
      status: 'done',
      message: '待上传（非图片）'
    })

    console.log('已选择文件：', file)
  }
}

// ==== 类型声明（让 send 有类型提示）====
interface MsgInputReturn {
  send: () => Promise<void>
  // 这里可以加 useMsgInput 返回的其他方法
}

// ==== DOM 和状态 ====
const footerBarInput = ref()
const inputValue = ref('')
const messageInputDom = ref<HTMLElement | null>(null)
const root = ref()

// send 不需要响应式，用普通变量即可
let msgInput: MsgInputReturn | null = null

onMounted(() => {
  if (root.value) {
    const resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height
      emit('updateHeight', height)
    })
    resizeObserver.observe(root.value)

    onUnmounted(() => {
      resizeObserver.disconnect()
    })
  }

  nextTick(() => {
    import('@/hooks/useMsgInput').then((module) => {
      // 这里确保 messageInputDom 已挂载且为 HTMLElement
      if (messageInputDom.value) {
        msgInput = module.useMsgInput(messageInputDom as Ref<HTMLElement>)
      }
    })
  })
})

// ==== 发送逻辑 ====
const handleSend = async () => {
  if (!inputValue.value.trim()) return
  if (!messageInputDom.value) {
    console.error('messageInputDom 未就绪')
    return
  }
  if (!msgInput || typeof msgInput.send !== 'function') {
    console.error('msgInput 未初始化或 send 方法不存在')
    return
  }

  // 转义换行和特殊字符
  messageInputDom.value.innerHTML = inputValue.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  // 关键：同步 useMsgInput 的 msgInput.value
  if ('msgInput' in msgInput) {
    // @ts-expect-error
    msgInput.msgInput.value = messageInputDom.value.innerHTML
  }

  await nextTick()
  await msgInput.send()

  // 清空
  inputValue.value = ''
  messageInputDom.value.innerHTML = ''
}

const getDefaultIcons = () => {
  return [
    { label: 'emoji', icon: 'smiling-face', showArrow: true, isRotate: false },
    { label: 'file', icon: 'file', showArrow: false, isRotate: true },
    { label: 'image', icon: 'photo', showArrow: false, isRotate: true },
    { label: 'video', icon: 'voice', showArrow: true, isRotate: false },
    { label: 'history', icon: 'history', showArrow: true, isRotate: false }
  ]
}

// ==== 展开面板 ====
const options = ref(getDefaultIcons())

const isPanelVisible = ref(false)
const isInputFocused = ref(false)

const clickItem = async (icon: string) => {
  const clickedItem = options.value.find((item) => item.icon === icon)
  if (!clickedItem || !clickedItem.showArrow) return

  if (isInputFocused.value) {
    footerBarInput.value?.blur()
    await nextTick()
    isPanelVisible.value = true
    clickedItem.isRotate = true
  } else {
    options.value.forEach((item) => {
      if (item.icon === icon) {
        item.isRotate = !item.isRotate
        isPanelVisible.value = item.isRotate
      } else {
        item.isRotate = false
      }
    })
  }
}

// ==== 动画 ====
const beforeEnter = (el: Element) => {
  const dom = el as HTMLElement
  dom.style.height = '0px'
  dom.style.opacity = '0'
}
const duration = 0.15
const enter = (el: Element, done: () => void) => {
  const dom = el as HTMLElement
  requestAnimationFrame(() => {
    dom.style.transition = `height ${duration}s ease, opacity ${duration}s ease`
    dom.style.height = '180px'
    dom.style.opacity = '1'
    dom.addEventListener('transitionend', done, { once: true })
  })
}
const leave = (el: Element, done: () => void) => {
  const dom = el as HTMLElement
  dom.style.transition = `height ${duration}s ease, opacity ${duration}s ease`
  dom.style.height = '0px'
  dom.style.opacity = '0'
  dom.addEventListener('transitionend', done, { once: true })
}

const handleFocus = async () => {
  isInputFocused.value = true
  await nextTick()
  requestAnimationFrame(() => {
    emit('focus', { keyboard: mobileStore.keyboardDetail })
  })

  if (isPanelVisible.value) {
    isPanelVisible.value = false
    options.value.forEach((item) => (item.isRotate = false))
  }
}

const handleBlur = async () => {
  isInputFocused.value = false
  await nextTick()
  requestAnimationFrame(() => {
    emit('blur', { keyboard: mobileStore.keyboardDetail })
  })
}

const closePanel = () => {
  isPanelVisible.value = false
  options.value = getDefaultIcons()
}

// ==== 对外暴露 ====
defineExpose({ root, footerBarInput, closePanel })
</script>

<style lang="scss" scoped>
.footer-bar-shadow {
  box-shadow: 0 -3px 6px -4px rgba(0, 0, 0, 0.1);
}
.rotate {
  transform: rotate(180deg);
}
.transition-transform {
  transition: transform 0.15s ease;
}
</style>
