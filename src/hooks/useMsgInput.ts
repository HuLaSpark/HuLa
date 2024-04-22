import { LimitEnum, MittEnum, MsgEnum } from '@/enums'
import { Ref } from 'vue'
import { MockItem } from '@/services/types.ts'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { useDebounceFn } from '@vueuse/core'
import Mitt from '@/utils/Bus.ts'
import { MockList } from '@/mock'
import { useCommon } from './useCommon.ts'
import { RegExp } from '@/utils/RegExp.ts'

export const useMsgInput = (messageInputDom: Ref) => {
  const { triggerInputEvent, insertNode, getMessageContentType, getEditorRange, imgPaste, removeTag, reply } =
    useCommon()
  const settingStore = setting()
  const { chat } = storeToRefs(settingStore)
  const chatKey = ref(chat.value.sendKey)
  const msgInput = ref('')
  const ait = ref(false)
  /** 艾特后的关键字的key */
  const aitKey = ref('')
  /** 是否正在输入拼音 */
  const isChinese = ref(false)
  // 记录编辑器光标的位置
  const editorRange = ref<{ range: Range; selection: Selection } | null>(null)
  // 过滤MockList
  const filteredList = computed(() => {
    if (aitKey.value && !isChinese.value) {
      return MockList.value.filter((item) => item.accountName.includes(aitKey.value))
    } else {
      return MockList.value
    }
  })
  /** 记录当前选中的提及项 key */
  const selectedAitKey = ref(filteredList.value[0]?.key ?? null)
  /** 右键菜单列表 */
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
              imgPaste(blob, messageInputDom.value)
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
    // 如果输入框没有值就把回复内容清空
    if (msgInput.value === '') {
      reply.value = { imgCount: 0, accountName: '', content: '', key: '' }
    }
  })

  watch(chatKey, (v) => {
    chat.value.sendKey = v
  })

  onMounted(() => {
    /** 正在输入拼音时触发 */
    messageInputDom.value.addEventListener('compositionstart', () => {
      isChinese.value = true
    })
    /** 结束输入拼音时触发 */
    messageInputDom.value.addEventListener('compositionend', (e: CompositionEvent) => {
      isChinese.value = false
      aitKey.value = e.data
    })
    /** 监听回复信息的传递 */
    Mitt.on(MittEnum.REPLY_MEG, (event: any) => {
      if (reply.value.content) {
        // TODO 如果已经有就替换原来的内容 (nyh -> 2024-04-18 23:10:56)
        return
      }
      reply.value = { imgCount: 0, accountName: event.value, content: event.content, key: event.key }
      if (messageInputDom.value) {
        nextTick().then(() => {
          messageInputDom.value.focus()
          insertNode(MsgEnum.REPLY, { accountName: event.value, content: event.content })
          triggerInputEvent(messageInputDom.value)
        })
      }
    })
  })

  /** 处理发送信息事件 */
  // TODO 输入框中的内容当我切换消息的时候需要记录之前输入框的内容 (nyh -> 2024-03-01 07:03:43)
  const send = () => {
    // 判断输入框中的图片或者文件数量是否超过限制
    if (messageInputDom.value.querySelectorAll('img').length > LimitEnum.COM_COUNT) {
      window.$message.warning(`一次性只能上传${LimitEnum.COM_COUNT}个文件或图片`)
      return
    }
    ait.value = false
    const contentType = getMessageContentType(messageInputDom)
    const msg = {
      type: contentType,
      content: msgInput.value,
      reply: contentType === MsgEnum.REPLY ? reply.value : null
    }
    /** 如果是Reply消息，需要将消息的样式修改 */
    if (msg.type === MsgEnum.REPLY) {
      // 先去掉原来的标签
      msg.content = removeTag(msg.content)
      // 截取空格后的内容
      // TODO 不允许用户删除回复消息中最前面的空格或者标志符号 (nyh -> 2024-04-17 06:39:22)
      msg.content = msg.content.replace(/^[\S\s]*\u00A0/, '')
    }
    const { hyperlinkRegex, foundHyperlinks } = RegExp.isHyperlink(msg.content)
    /** 判断是否有超链接 */
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
    reply.value = { imgCount: 0, accountName: '', content: '', key: '' }
  }

  /** 当输入框手动输入值的时候触发input事件(使用vueUse的防抖) */
  const handleInput = useDebounceFn(async (e: Event) => {
    const inputElement = e.target as HTMLInputElement
    msgInput.value = inputElement.innerHTML
    const { range, selection } = getEditorRange()!
    /** 获取当前光标所在的节点和文本内容 */
    if (!range || !selection) {
      ait.value = false
      return
    }
    /** 获取当前光标所在的节点 */
    const curNode = range.endContainer
    /** 判断当前节点是否是文本节点 */
    if (!curNode || !curNode.textContent || curNode.nodeName !== '#text') {
      ait.value = false
      return
    }
    const searchStr = curNode.textContent?.slice(0, selection.focusOffset)
    /** 使用正则表达式匹配@符号之后的关键词 */
    const keywords = /@([^@]*)$/.exec(searchStr!)
    if (!keywords || keywords.length < 2) {
      ait.value = false
      aitKey.value = ''
      return
    }
    /** 解构关键词并更新ait和aitKey的值，同时将编辑器的范围和选择保存在editorRange中 */
    const [, keyWord] = keywords
    ait.value = true
    aitKey.value = keyWord
    editorRange.value = { range, selection }

    if (ait.value && filteredList.value.length > 0) {
      const res = range.getBoundingClientRect()
      await nextTick(() => {
        const dom = document.querySelector('.ait') as HTMLElement
        dom.style.position = 'fixed'
        dom.style.left = `${res.x - 20}px`
        dom.style.top = `${res.y - (dom.offsetHeight + 5)}px`
      })
    } else {
      ait.value = false
    }
  }, 100)

  /** input的keydown事件 */
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

  /** 处理点击@提及框事件 */
  const handleAit = (item: MockItem) => {
    const myEditorRange = editorRange?.value?.range
    /** 获取光标所在位置的文本节点 */
    const textNode = myEditorRange?.endContainer
    if (!textNode) return
    /** 获取光标在所在文本节点中的偏移位置 */
    const endOffset = myEditorRange?.endOffset
    /** 获取文本节点的值，并将其转换为字符串类型 */
    const textNodeValue = textNode?.nodeValue as string
    /** 使用正则表达式匹配@符号之后获取到的文本节点的值 */
    const expRes = /@([^@]*)$/.exec(textNodeValue)
    // 重新聚焦输入框(聚焦到输入框开头)
    messageInputDom.value.focus()
    const { range } = getEditorRange()!
    /** 设置范围的起始位置为文本节点中@符号的位置 */
    range?.setStart(textNode, <number>expRes?.index)
    /** 设置范围的结束位置为光标的位置 */
    range?.setEnd(textNode, endOffset!)
    insertNode(MsgEnum.AIT, item.accountName)
    triggerInputEvent(messageInputDom.value)
    ait.value = false
  }

  return {
    imgPaste,
    inputKeyDown,
    handleAit,
    handleInput,
    send,
    filteredList,
    ait,
    msgInput,
    chatKey,
    menuList,
    selectedAitKey,
    reply
  }
}
