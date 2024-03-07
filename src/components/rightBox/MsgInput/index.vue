<template>
  <ContextMenu class="relative w-full h-100px" @select="$event.click()" :menu="menuList">
    <n-scrollbar style="max-height: 100px">
      <!-- 输入框 -->
      <div
        class="message-input"
        ref="messageInputDom"
        contenteditable
        spellcheck="false"
        autofocus
        @paste="handlePaste"
        @input="handleInput"
        @keydown.enter="inputKeyDown"></div>
    </n-scrollbar>
  </ContextMenu>

  <n-config-provider :theme="lightTheme">
    <n-button-group size="small" class="pr-20px">
      <n-button
        color="#059669"
        :disabled="msgInput.length === 0 || msgInput.trim() === ''"
        class="w-65px"
        @click="send">
        发送
      </n-button>
      <n-button color="#059669" class="p-[0_6px]">
        <template #icon>
          <svg class="w-22px h-22px"><use href="#down"></use></svg>
        </template>
      </n-button>
    </n-button-group>
  </n-config-provider>
</template>
<script setup lang="ts">
import { lightTheme } from 'naive-ui'
import { MsgEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'

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
// 自定义输入框子节点元素列表
const childNodes = ref<any>([])

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
  if (type === MsgEnum.TEXT) {
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
    const file = e.clipboardData.files[0]
    const fileType = file.type as string
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

  const elements = messageInputDom.value.childNodes
  for (let element of elements) {
    if (element.nodeType === Node.TEXT_NODE && element.nodeValue.trim() !== '') {
      hasText = true
    } else if (element.tagName === 'IMG') {
      hasImage = true
    } else if (element.tagName === 'VI  DEO' || (element.tagName === 'A' && element.href.match(/\.(mp4|webm)$/i))) {
      hasVideo = true
    }
  }

  if (hasVideo) {
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
  const contentType = getMessageContentType()
  const msg = {
    type: contentType,
    content: msgInput.value
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
  Mitt.emit('handleSendMessage', msg)
  msgInput.value = ''
  messageInputDom.value.innerHTML = ''
}

/* 当输入框手动输入值的时候触发input事件 */
const handleInput = (e: Event) => {
  childNodes.value = (e.target as HTMLInputElement).childNodes
  msgInput.value = (e.target as HTMLInputElement).innerHTML
}

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
</script>

<style scoped lang="scss">
.message-input {
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
  caret-color: #059669; /* 光标颜色，可根据需求调整 */
  white-space: pre-wrap; /* 保留空白符号并正常换行 */
  word-break: break-word; /* 在长单词或URL地址内部进行换行 */
}
</style>
