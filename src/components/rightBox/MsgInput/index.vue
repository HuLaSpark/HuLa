<template>
  <!-- 输入框 -->
  <ContextMenu class="w-full h-110px" @select="$event.click()" :menu="menuList">
    <n-scrollbar style="max-height: 110px">
      <div
        id="message-input"
        ref="messageInputDom"
        contenteditable
        spellcheck="false"
        @paste="handlePaste"
        @input="handleInput"
        @keydown.enter="inputKeyDown"></div>
    </n-scrollbar>
  </ContextMenu>

  <!-- @提及框  -->
  <div v-if="ait && activeItem.type === RoomTypeEnum.GROUP && filteredList.length > 0" class="ait">
    <n-virtual-list id="image-chat-msgInput" style="max-height: 180px" :item-size="36" :items="filteredList">
      <template #default="{ item }">
        <n-flex @click="handleAit(item)" :key="item.key" align="center" class="ait-item">
          <n-avatar
            lazy
            round
            :color="'#fff'"
            :size="22"
            :src="item.avatar"
            fallback-src="/logo.png"
            :render-placeholder="() => null"
            :intersection-observer-options="{
              root: '#image-chat-msgInput'
            }" />
          <span> {{ item.accountName }}</span>
        </n-flex>
      </template>
    </n-virtual-list>
  </div>

  <!-- 发送按钮 -->
  <n-config-provider :theme="lightTheme">
    <n-button-group size="small" class="pr-20px">
      <n-button
        color="#13987f"
        :disabled="msgInput.length === 0 || msgInput.trim() === ''"
        class="w-65px"
        @click="send">
        发送
      </n-button>
      <n-button color="#13987f" class="p-[0_6px]">
        <template #icon>
          <svg class="w-22px h-22px"><use href="#down"></use></svg>
        </template>
      </n-button>
    </n-button-group>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import { MittEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'
import { MockList } from '@/mock'
import { MockItem } from '@/services/types.ts'
import { useDebounceFn } from '@vueuse/core'
import { emit, listen } from '@tauri-apps/api/event'

const ait = ref(false)
const menuList = ref([
  { label: '剪切', icon: 'screenshot', disabled: true },
  { label: '复制', icon: 'copy', disabled: true },
  {
    label: '粘贴',
    icon: 'intersection',
    click: () => {
      navigator.clipboard.read().then((items) => {
        const clipboardItem = items[0] // 获取剪贴板的第一项
        if (clipboardItem.types.includes('text/plain')) {
          // 如果是文本，使用 readText() 读取文本内容
          navigator.clipboard.readText().then((text) => {
            insertNode(MsgEnum.TEXT, text)
            triggerInputEvent(messageInputDom.value)
          })
        } else if (clipboardItem.types.find((type) => type.startsWith('image/'))) {
          // 检查第一项是否是图像
          // TODO 右键粘贴动图的时候无法动起来右键粘贴没有获取到类型是gif而是html加上png的格式 (nyh -> 2024-02-27 03:27:10)
          let imageType = clipboardItem.types.find((type) => type.startsWith('image/'))
          clipboardItem.getType(imageType as any).then((blob) => {
            imgPaste(blob)
          })
        }
      })
    }
  },
  { label: '另存为', icon: 'download', disabled: true },
  { label: '全部选择', icon: 'check-one' }
])
const msgInput = ref('')
// 输入框dom元素
const messageInputDom = ref()
const activeItem = ref(inject('activeItem') as MockItem)
/* 艾特后的关键字的key */
const aitKey = ref('')
// 过滤MockList
const filteredList = computed(() => {
  if (aitKey.value) {
    return MockList.value.filter((item) => item.accountName.includes(aitKey.value))
  } else {
    return MockList.value
  }
})

/* 当切换聊天对象时，重新获取焦点 */
watch(activeItem, () => {
  nextTick(() => {
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
})

/**
 *  将指定节点插入到光标位置
 * @param { MsgEnum } type 插入的类型
 * @param dom dom节点
 */
const insertNode = (type: MsgEnum, dom: any) => {
  // 获取光标
  const selection = window.getSelection()
  // 获取选中的内容
  const range = selection?.getRangeAt(0)
  // 删除选中的内容
  range?.deleteContents()
  // 将节点插入范围最前面添加节点
  if (type === MsgEnum.AIT) {
    // 创建一个span标签节点
    const spanNode = document.createElement('span')
    spanNode.id = 'aitSpan' // 设置id为aitSpan
    spanNode.contentEditable = 'false' // 设置为不可编辑
    spanNode.classList.add('text-#13987f')
    spanNode.classList.add('select-none')
    spanNode.classList.add('cursor-default')
    // 在span标签后面添加一个空格
    spanNode.appendChild(document.createTextNode(`@${dom}`))
    // 将span标签插入到光标位置
    range?.insertNode(spanNode)
    range?.setStart(messageInputDom.value, messageInputDom.value.childNodes.length)
    // 创建一个空格文本节点
    const spaceNode = document.createTextNode('\u00A0')
    // 将空格文本节点插入到光标位置
    range?.insertNode(spaceNode)
  } else if (type === MsgEnum.TEXT) {
    range?.insertNode(document.createTextNode(dom))
  } else {
    range?.insertNode(dom)
  }
  // 将光标移到选中范围的最后面
  selection?.collapseToEnd()
}

/* 处理粘贴事件 */
const handlePaste = (e: any) => {
  e.preventDefault()
  if (e.clipboardData.files.length > 0) {
    if (e.clipboardData.files.length > 5) {
      window.$message.warning('一次性只能上传5个文件')
      return
    }
    for (let file of e.clipboardData.files) {
      // 检查文件大小
      let fileSizeInMB = file.size / 1024 / 1024 // 将文件大小转换为兆字节(MB)
      if (fileSizeInMB > 300) {
        window.$message.warning(`文件 ${file.name} 超过300MB`)
        continue // 如果文件大小超过300MB，就跳过这个文件，处理下一个文件
      }
      let fileType = file.type as string
      if (fileType.startsWith('image/')) {
        // 处理图片粘贴
        imgPaste(file)
      } else if (fileType.startsWith('video/')) {
        // 处理视频粘贴
        FileOrVideoPaste(file, MsgEnum.VIDEO)
      } else {
        // 处理文件粘贴
        FileOrVideoPaste(file, MsgEnum.FILE)
      }
    }
  } else {
    // 如果没有文件，而是文本，处理纯文本粘贴
    const plainText = e.clipboardData.getData('text/plain')
    insertNode(MsgEnum.TEXT, plainText)
    triggerInputEvent(messageInputDom.value)
  }
}

/* 处理图片粘贴事件 */
const imgPaste = (file: any) => {
  const reader = new FileReader()
  reader.onload = (e: any) => {
    const img = document.createElement('img')
    img.src = e.target.result
    // 设置图片的最大高度和最大宽度
    img.style.maxHeight = '88px'
    img.style.maxWidth = '140px'
    img.style.marginRight = '6px'
    // 插入图片
    insertNode(MsgEnum.IMAGE, img)
    triggerInputEvent(messageInputDom.value)
  }
  reader.readAsDataURL(file)
}

/**
 * 处理视频或者文件粘贴事件
 * @param file 文件
 * @param type 类型
 */
const FileOrVideoPaste = (file: File, type: MsgEnum) => {
  const reader = new FileReader()
  // 使用函数
  createFileOrVideoDom(file).then((imgTag) => {
    // 将生成的img标签插入到页面中
    insertNode(type, imgTag)
    triggerInputEvent(messageInputDom.value)
  })
  reader.readAsDataURL(file)
}

/* 触发输入框事件(粘贴的时候需要重新触发这个方法) */
const triggerInputEvent = (element: HTMLElement) => {
  if (element) {
    const event = new Event('input', {
      bubbles: true,
      cancelable: true
    })
    element.dispatchEvent(event)
  }
}

/* 获取messageInputDom输入框中的内容类型 */
const getMessageContentType = () => {
  let hasText = false
  let hasImage = false
  let hasVideo = false
  let hasFile = false

  const elements = messageInputDom.value.childNodes
  for (let element of elements) {
    if (element.nodeType === Node.TEXT_NODE && element.nodeValue.trim() !== '') {
      hasText = true
    } else if (element.tagName === 'IMG') {
      if (element.dataset.type === 'file-canvas') {
        hasFile = true
      } else {
        hasImage = true
      }
    } else if (element.tagName === 'VIDEO' || (element.tagName === 'A' && element.href.match(/\.(mp4|webm)$/i))) {
      hasVideo = true
    }
  }

  if (hasFile) {
    return MsgEnum.FILE
  } else if (hasVideo) {
    return MsgEnum.VIDEO
  } else if (hasText && hasImage) {
    return MsgEnum.MIXED
  } else if (hasImage) {
    return MsgEnum.IMAGE
  } else {
    return MsgEnum.TEXT
  }
}

/* 处理发送信息事件 */
// TODO 输入框中的内容当我切换消息的时候需要记录之前输入框的内容 (nyh -> 2024-03-01 07:03:43)
const send = () => {
  ait.value = false
  const contentType = getMessageContentType()
  const msg = {
    type: contentType,
    content: msgInput.value,
    hyperlinks: [] as any
  }
  const hyperlinkRegex = /(\bhttps?:\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi
  const foundHyperlinks = msg.content.match(hyperlinkRegex)

  // TODO 这里复制网址会把标签也复制了 (nyh -> 2024-03-28 19:41:06)
  if (foundHyperlinks && foundHyperlinks.length > 0) {
    msg.hyperlinks = foundHyperlinks
    msg.content = msg.content.replace(hyperlinkRegex, (match) => {
      return `<a class="color-inherit" href="${match}" target="_blank" rel="noopener noreferrer">${match}</a>`
    })
  }
  // 判断文本信息是否超过限制
  if (msg.type === MsgEnum.TEXT && msg.content.length > 2000) {
    window.$message.info('消息内容超过限制2000，请删减内容')
    return
  }
  // TODO 当输入的类型是混合类型如输入文本加上图片的类型需要处理 (nyh -> 2024-02-28 06:32:13)
  if (msg.type === MsgEnum.MIXED) {
    window.$message.error('暂不支持混合类型消息发送')
    return
  }
  Mitt.emit(MittEnum.SEND_MESSAGE, msg)
  msgInput.value = ''
  messageInputDom.value.innerHTML = ''
}

/* 获取@字符后面输入的内容 */

/* 当输入框手动输入值的时候触发input事件(使用vueUse的防抖) */
const handleInput = useDebounceFn((e: Event) => {
  msgInput.value = (e.target as HTMLInputElement).innerHTML
  ait.value = msgInput.value.includes('@')
  /* 处理输入@时候弹出框 */
  if (ait.value) {
    const atIndex = msgInput.value.lastIndexOf('@')
    aitKey.value = msgInput.value.slice(atIndex + 1)
    if (filteredList.value.length > 0) {
      // 获取光标
      const selection = window.getSelection()
      // 获取选中的内容
      const range = selection?.getRangeAt(0)
      const res = range?.getBoundingClientRect() as any
      nextTick(() => {
        const dom = document.querySelector('.ait') as HTMLElement
        dom.style.position = 'fixed'
        dom.style.left = `${res?.x - 20}px`
        dom.style.top = `${res?.y - (dom.offsetHeight + 5)}px`
      })
    } else {
      ait.value = false
    }
  }
}, 100)

/* input的keydown事件 */
const inputKeyDown = (e: KeyboardEvent) => {
  const Enter = 'Enter'
  if (
    (e.ctrlKey && e.key === 'Enter') ||
    (e.shiftKey && e.key === 'Enter') ||
    (e.metaKey && e.key === 'Enter') ||
    msgInput.value === '' ||
    msgInput.value.trim() === ''
  ) {
    e.preventDefault()
    return
  } else if (e.key === Enter) {
    e.preventDefault()
    send()
  }
}

/* 处理点击@提及框事件 */
const handleAit = (item: MockItem) => {
  // 查找最后一个@字符的位置
  const atIndex = msgInput.value.lastIndexOf('@')
  // 截取@字符以及其后面的内容
  msgInput.value = msgInput.value.substring(0, atIndex)
  messageInputDom.value.innerHTML = msgInput.value
  // 重新聚焦输入框(聚焦到输入框开头)，所以需要在失焦的时候保存光标的位置
  messageInputDom.value.focus()
  const sel = window.getSelection()
  const res = sel?.getRangeAt(0)
  res?.setStart(messageInputDom.value, messageInputDom.value.childNodes.length)
  insertNode(MsgEnum.AIT, item.accountName)
  triggerInputEvent(messageInputDom.value)
  ait.value = false
}

const closeMenu = (event: any) => {
  /* 需要判断点击如果不是.context-menu类的元素的时候，menu才会关闭 */
  if (!event.target.matches('#message-input, #message-input *')) {
    ait.value = false
  }
}

onMounted(() => {
  emit('aloneWin')
  nextTick(() => {
    const inputDiv = document.getElementById('message-input')
    inputDiv?.focus()
  })
  listen('aloneData', (event: any) => {
    activeItem.value = { ...event.payload.item }
  })
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})

/* 导出组件方法和属性 */
defineExpose({ messageInputDom, triggerInputEvent, insertNode })
</script>

<style scoped lang="scss">
#message-input {
  padding: 4px 24px 4px 4px; /* 输入框内填充 */
  font-size: 14px; /* 字体大小 */
  color: inherit; /* 继承颜色 */
  cursor: text; /* 文本输入光标 */
  resize: none; /* 不允许调整尺寸 */
  background: none; /* 无背景 */
  border: none; /* 边框样式，可根据需求修改 */
  border-radius: 0; /* 边框圆角 */
  outline: none; /* 点击时无轮廓 */
  min-height: 90px; /* 最小高度 */
  line-height: 20px; /* 行高 */
  overflow: auto; /* 内容过多时允许滚动 */
  flex: 1; /* 弹性盒自适应填充可用空间 */
  caret-color: #13987f; /* 光标颜色，可根据需求调整 */
  white-space: pre-wrap; /* 保留空白符号并正常换行 */
  word-break: break-word; /* 在长单词或URL地址内部进行换行 */
}
.ait {
  @apply w-200px h-fit max-h-190px bg-[--center-bg-color] rounded-8px p-[5px_0_5px_5px];
  box-shadow: 2px 2px 12px 2px var(--box-shadow-color);
  border: 1px solid var(--box-shadow-color);
  .ait-item {
    @apply h-26px text-[--text-color] text-14px p-[5px_0_5px_10px] mr-5px rounded-6px hover:bg-[--bg-group-hover] cursor-pointer;
  }
}
</style>
