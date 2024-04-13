import { MittEnum, MsgEnum } from '@/enums'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'
import { Ref } from 'vue'
import { MockItem } from '@/services/types.ts'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'
import Mitt from '@/utils/Bus.ts'
import { MockList } from '@/mock'

export const useMsgInput = (messageInputDom: Ref) => {
  const settingStore = setting()
  const { chat } = storeToRefs(settingStore)
  const chatKey = ref(chat.value.sendKey)
  const msgInput = ref('')
  const ait = ref(false)
  /* 艾特后的关键字的key */
  const aitKey = ref('')
  /* 是否正在输入拼音 */
  const isChinese = ref(false)
  // 过滤MockList
  const filteredList = computed(() => {
    if (aitKey.value && !isChinese.value) {
      return MockList.value.filter((item) => item.accountName.includes(aitKey.value))
    } else {
      return MockList.value
    }
  })
  // 记录当前选中的提及项 key
  const selectedAitKey = ref(filteredList.value[0]?.key ?? null)
  /* 右键菜单列表 */
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
            const imageType = clipboardItem.types.find((type) => type.startsWith('image/'))
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

  watchEffect(() => {
    chatKey.value = chat.value.sendKey
    if (!ait.value && filteredList.value.length > 0) {
      selectedAitKey.value = 0
    }
  })

  watch(chatKey, (v) => {
    chat.value.sendKey = v
  })

  onMounted(() => {
    /* 正在输入拼音时触发 */
    messageInputDom.value.addEventListener('compositionstart', () => {
      isChinese.value = true
    })
    /* 结束输入拼音时触发 */
    messageInputDom.value.addEventListener('compositionend', (e: CompositionEvent) => {
      isChinese.value = false
      aitKey.value = e.data
    })
  })

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

  /* 处理粘贴事件 */
  const handlePaste = (e: any) => {
    e.preventDefault()
    if (e.clipboardData.files.length > 0) {
      if (e.clipboardData.files.length > 5) {
        window.$message.warning('一次性只能上传5个文件')
        return
      }
      for (const file of e.clipboardData.files) {
        // 检查文件大小
        const fileSizeInMB = file.size / 1024 / 1024 // 将文件大小转换为兆字节(MB)
        if (fileSizeInMB > 300) {
          window.$message.warning(`文件 ${file.name} 超过300MB`)
          continue // 如果文件大小超过300MB，就跳过这个文件，处理下一个文件
        }
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
      }
    } else {
      // 如果没有文件，而是文本，处理纯文本粘贴
      const plainText = e.clipboardData.getData('text/plain')
      insertNode(MsgEnum.TEXT, plainText)
      triggerInputEvent(messageInputDom.value)
    }
  }

  /* 获取messageInputDom输入框中的内容类型 */
  const getMessageContentType = () => {
    let hasText = false
    let hasImage = false
    let hasVideo = false
    let hasFile = false

    const elements = messageInputDom.value.childNodes
    for (const element of elements) {
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
      content: msgInput.value
    }
    const hyperlinkRegex = /(\b(?:https?:\/\/|www)[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi
    const foundHyperlinks = msg.content.match(hyperlinkRegex)

    if (foundHyperlinks && foundHyperlinks.length > 0) {
      msg.content = msg.content.replace(hyperlinkRegex, (match) => {
        const href = match.startsWith('www.') ? 'https://' + match : match
        return `<a style="color: inherit" href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`
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

  /* 当输入框手动输入值的时候触发input事件(使用vueUse的防抖) */
  const handleInput = useDebounceFn(async (e: Event) => {
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
        await nextTick(() => {
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
    if (msgInput.value === '' || msgInput.value.trim() === '' || ait.value) {
      e?.preventDefault()
      return
    }
    if (
      (chat.value.sendKey === 'Enter' && e.key === 'Enter' && !e.ctrlKey) ||
      (chat.value.sendKey === 'Ctrl+Enter' && e.ctrlKey && e.key === 'Enter')
    ) {
      e?.preventDefault()
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
    // 重新聚焦输入框(聚焦到输入框开头)
    messageInputDom.value.focus()
    const sel = window.getSelection()
    const res = sel?.getRangeAt(0)
    res?.setStart(messageInputDom.value, messageInputDom.value.childNodes.length)
    insertNode(MsgEnum.AIT, item.accountName)
    triggerInputEvent(messageInputDom.value)
    ait.value = false
  }

  return {
    handlePaste,
    insertNode,
    triggerInputEvent,
    imgPaste,
    FileOrVideoPaste,
    inputKeyDown,
    handleAit,
    handleInput,
    send,
    filteredList,
    ait,
    msgInput,
    chatKey,
    menuList,
    selectedAitKey
  }
}
