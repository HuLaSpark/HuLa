import { LimitEnum, MittEnum, MsgEnum } from '@/enums'
import { Ref } from 'vue'
import { CacheUserItem } from '@/services/types.ts'
import { setting } from '@/stores/setting.ts'
import { useDebounceFn } from '@vueuse/core'
import Mitt from '@/utils/Bus.ts'
import { useCommon } from './useCommon.ts'
import { RegExp } from '@/utils/RegExp.ts'
import apis from '@/services/apis.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { useCachedStore } from '@/stores/cached.ts'
import { type } from '@tauri-apps/plugin-os'

export const useMsgInput = (messageInputDom: Ref) => {
  const chatStore = useChatStore()
  const globalStore = useGlobalStore()
  const cachedStore = useCachedStore()
  const { triggerInputEvent, insertNode, getMessageContentType, getEditorRange, imgPaste, removeTag, reply, userUid } =
    useCommon()
  const settingStore = setting()
  const { chat } = storeToRefs(settingStore)
  const chatKey = ref(chat.value.sendKey)
  const msgInput = ref('')
  const ait = ref(false)
  // /** 临时消息id */
  // const tempMessageId = ref(0)
  /** 艾特后的关键字的key */
  const aitKey = ref('')
  /** 是否正在输入拼音 */
  const isChinese = ref(false)
  // 记录编辑器光标的位置
  const editorRange = ref<{ range: Range; selection: Selection } | null>(null)
  /** @候选人列表 */
  const personList = computed(() => {
    if (aitKey.value && !isChinese.value) {
      return cachedStore.currentAtUsersList.filter(
        (user) => user.name?.startsWith(aitKey.value) && user.uid !== userUid.value
      )
    } else {
      // 过滤当前登录的用户
      return cachedStore.currentAtUsersList.filter((user) => user.uid !== userUid.value)
    }
  })
  /** 记录当前选中的提及项 key */
  const selectedAitKey = ref(personList.value[0]?.uid ?? null)
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
    { label: '另存为', icon: 'Importing', disabled: true },
    { label: '全部选择', icon: 'check-one' }
  ])

  watchEffect(() => {
    chatKey.value = chat.value.sendKey
    if (!ait.value && personList.value.length > 0) {
      selectedAitKey.value = personList.value[0]?.uid
    }
    // 如果输入框没有值就把回复内容清空
    if (msgInput.value === '') {
      reply.value = { imgCount: 0, accountName: '', content: '', key: 0 }
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
      const accountName = useUserInfo(event.fromUser.uid).value.name!
      // 如果已经有回复消息，则替换掉原来的回复消息
      if (reply.value.content) {
        // 触发id为closeBtn的按钮点击事件，从而关闭第一个回复框，实现回复消息的替换
        document.getElementById('closeBtn')?.dispatchEvent(new Event('click'))
      }
      if (!Array.isArray(event.message.body.content)) {
        // 回复前把包含&nbsp;的字符替换成空格
        event.message.body.content = event.message.body.content.replace(/&nbsp;/g, ' ')
      }
      reply.value = {
        imgCount: 0,
        accountName: accountName,
        content: event.message.body.content,
        key: event.message.id
      }
      if (messageInputDom.value) {
        nextTick().then(() => {
          messageInputDom.value.focus()
          insertNode(MsgEnum.REPLY, { accountName: accountName, content: event.message.body.content })
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
    // 排除id="replyDiv"的元素的内容
    const replyDiv = messageInputDom.value.querySelector('#replyDiv')
    if (replyDiv) {
      replyDiv.parentNode?.removeChild(replyDiv)
      // 然后重新赋值给msgInput
      msgInput.value = messageInputDom.value.innerHTML.replace(replyDiv.outerHTML, '')
    }
    ait.value = false
    const contentType = getMessageContentType(messageInputDom)
    const msg = {
      type: contentType,
      content: removeTag(msgInput.value),
      reply: reply.value.key
    }
    // TODO 当输入的类型是艾特类型的时候需要处理 (nyh -> 2024-05-30 19:52:20)
    // TODO 当输入的内容换行后会有div包裹，这样会有xxr攻击风险 (nyh -> 2024-05-30 20:19:27)
    // TODO 当输入网址的时候会传递样式进去，会造成xxr攻击 (nyh -> 2024-07-03 17:30:57)
    /** 如果reply.value.content中有内容，需要将消息的样式修改 */
    if (reply.value.content) {
      if (msg.type === MsgEnum.TEXT) {
        // 创建一个虚拟div元素以便对HTML进行操作
        const tempDiv = document.createElement('div')
        // 将msg.content赋值给虚拟div的innerHTML
        tempDiv.innerHTML = msg.content
        // 查找id为"replyDiv"的元素
        const replyDiv = tempDiv.querySelector('#replyDiv')
        // 如果找到了元素，则删除它
        if (replyDiv) {
          replyDiv.parentNode?.removeChild(replyDiv)
        }
        // 先去掉原来的标签
        tempDiv.innerHTML = removeTag(tempDiv.innerHTML)
        // 只截取tempDiv.innerHTML开头中的&nbsp;
        tempDiv.innerHTML = tempDiv.innerHTML.replace(/^\s*&nbsp;/, '')
        // 处理后的内容可以传给实际发送消息的方法
        msg.content = tempDiv.innerHTML
      }
    }
    const { hyperlinkRegex, foundHyperlinks } = RegExp.isHyperlink(msg.content)
    /** 判断是否有超链接 */
    if (foundHyperlinks && foundHyperlinks.length > 0) {
      msg.content = msg.content.replace(hyperlinkRegex, (match) => {
        const href = match.startsWith('www.') ? 'https://' + match : match
        return `<a style="color: inherit;text-underline-offset: 4px" href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`
      })
    }
    // 判断文本信息是否超过限制
    if (msg.type === MsgEnum.TEXT && msg.content.length > 500) {
      window.$message.info('消息内容超过限制500，请分段发送')
      return
    }
    // TODO 当输入的类型是混合类型如输入文本加上图片的类型需要处理 (nyh -> 2024-02-28 06:32:13)
    if (msg.type === MsgEnum.MIXED) {
      window.$message.error('暂不支持混合类型消息发送')
      return
    }
    apis
      .sendMsg({
        roomId: globalStore.currentSession.roomId,
        msgType: msg.type,
        body: { content: msg.content, replyMsgId: msg.reply !== 0 ? msg.reply : undefined }
      })
      .then(async (res) => {
        if (res.data.message.type === MsgEnum.TEXT) {
          await chatStore.pushMsg(res.data)
        }
        // 发完消息就要刷新会话列表，
        //  FIXME 如果当前会话已经置顶了，可以不用刷新
        chatStore.updateSessionLastActiveTime(globalStore.currentSession.roomId)
      })
    msgInput.value = ''
    messageInputDom.value.innerHTML = ''
    reply.value = { imgCount: 0, accountName: '', content: '', key: 0 }
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

    if (ait.value && personList.value.length > 0) {
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
    const isWindows = type() === 'windows'
    const isEnterKey = e.key === 'Enter'
    const isCtrlOrMetaKey = isWindows ? e.ctrlKey : e.metaKey

    const sendKeyIsEnter = chat.value.sendKey === 'Enter'
    const sendKeyIsCtrlEnter = chat.value.sendKey === `${isWindows ? 'Ctrl' : '⌘'}+Enter`

    // 如果当前的系统是mac，我需要判断当前的chat.value.sendKey是否是Enter，再判断当前是否是按下⌘+Enter
    if (!isWindows && chat.value.sendKey === 'Enter' && e.metaKey && e.key === 'Enter') {
      // 就进行换行操作
      e.preventDefault()
      insertNode(MsgEnum.TEXT, '\n')
      triggerInputEvent(messageInputDom.value)
    }
    if (msgInput.value === '' || msgInput.value.trim() === '' || ait.value) {
      e?.preventDefault()
      return
    }
    if (!isWindows && e.ctrlKey && isEnterKey && sendKeyIsEnter) {
      e?.preventDefault()
      return
    }
    if ((sendKeyIsEnter && isEnterKey && !isCtrlOrMetaKey) || (sendKeyIsCtrlEnter && isCtrlOrMetaKey && isEnterKey)) {
      e?.preventDefault()
      send()
    }
  }

  /** 处理点击@提及框事件 */
  const handleAit = (item: CacheUserItem) => {
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
    insertNode(MsgEnum.AIT, item.name)
    triggerInputEvent(messageInputDom.value)
    ait.value = false
  }

  return {
    imgPaste,
    inputKeyDown,
    handleAit,
    handleInput,
    send,
    personList,
    ait,
    msgInput,
    chatKey,
    menuList,
    selectedAitKey,
    reply
  }
}
