import { LimitEnum, MittEnum, MsgEnum, MessageStatusEnum } from '@/enums'
import { useUserInfo } from '@/hooks/useCached.ts'
import apis from '@/services/apis.ts'
import { CacheUserItem, MessageType } from '@/services/types.ts'
import { useCachedStore } from '@/stores/cached.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useSettingStore } from '@/stores/setting.ts'
import Mitt from '@/utils/Bus.ts'
import { type } from '@tauri-apps/plugin-os'
import { useDebounceFn } from '@vueuse/core'
import { Ref } from 'vue'
import { useCommon } from './useCommon.ts'

export const useMsgInput = (messageInputDom: Ref) => {
  const chatStore = useChatStore()
  const globalStore = useGlobalStore()
  const cachedStore = useCachedStore()
  const { triggerInputEvent, insertNode, getMessageContentType, getEditorRange, imgPaste, removeTag, reply, userUid } =
    useCommon()
  const settingStore = useSettingStore()
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
              insertNode(MsgEnum.TEXT, text, {} as HTMLElement)
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
          insertNode(
            MsgEnum.REPLY,
            { accountName: accountName, content: event.message.body.content },
            {} as HTMLElement
          )
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
      reply: reply.value.content
        ? {
            content: reply.value.content,
            key: reply.value.key
          }
        : undefined
    }

    // 处理回复内容
    if (reply.value.content) {
      if (msg.type === MsgEnum.TEXT) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = msg.content
        const replyDiv = tempDiv.querySelector('#replyDiv')
        if (replyDiv) {
          replyDiv.parentNode?.removeChild(replyDiv)
        }
        tempDiv.innerHTML = removeTag(tempDiv.innerHTML)
        tempDiv.innerHTML = tempDiv.innerHTML.replace(/^\s*&nbsp;/, '')
        msg.content = tempDiv.innerHTML
      }
    }

    // // 处理超链接
    // const { hyperlinkRegex, foundHyperlinks } = RegExp.isHyperlink(msg.content)
    // if (foundHyperlinks && foundHyperlinks.length > 0) {
    //   msg.content = msg.content.replace(hyperlinkRegex, (match) => {
    //     const href = match.startsWith('www.') ? 'https://' + match : match
    //     return `<a style="color: inherit;text-underline-offset: 4px" href="${href}" target="_blank" rel="noopener noreferrer">${match}</a>`
    //   })
    // }

    // 验证消息长度
    if (msg.type === MsgEnum.TEXT && msg.content.length > 500) {
      window.$message.info('消息内容超过限制500，请分段发送')
      return
    }

    if (msg.type === MsgEnum.MIXED) {
      window.$message.error('暂不支持混合类型消息发送')
      return
    }

    // 创建临时消息ID
    const tempMsgId = Date.now()
    const currentTime = new Date().getTime()

    // 根据消息类型创建消息体
    let messageBody: any
    switch (msg.type) {
      case MsgEnum.TEXT:
        messageBody = {
          content: msg.content,
          replyMsgId: msg.reply?.key || void 0,
          reply: reply.value.content
            ? {
                body: reply.value.content,
                id: reply.value.key,
                username: reply.value.accountName,
                type: msg.type
              }
            : void 0
        }
        break
      case MsgEnum.IMAGE:
        messageBody = { url: msg.content }
        break
      case MsgEnum.FILE:
        messageBody = { url: msg.content }
        break
      case MsgEnum.VOICE:
        messageBody = { url: msg.content }
        break
      case MsgEnum.VIDEO:
        messageBody = { url: msg.content }
        break
      default:
        messageBody = { content: msg.content }
    }

    // 创建消息对象
    const tempMsg: MessageType = {
      fromUser: {
        uid: userUid.value,
        username: useUserInfo(userUid.value)?.value?.name || '',
        avatar: useUserInfo(userUid.value)?.value?.avatar || '',
        locPlace: useUserInfo(userUid.value)?.value?.locPlace || ''
      },
      message: {
        id: tempMsgId,
        roomId: globalStore.currentSession.roomId,
        type: msg.type,
        body: messageBody,
        sendTime: currentTime,
        status: MessageStatusEnum.PENDING,
        messageMark: {
          userLike: 0,
          userDislike: 0,
          likeCount: 0,
          dislikeCount: 0
        }
      },
      sendTime: new Date(currentTime).toISOString(),
      loading: false
    }

    // 先添加到消息列表
    chatStore.pushMsg(tempMsg)
    // 触发滚动到底部
    Mitt.emit(MittEnum.SCROLL_TO_BOTTOM)

    // 设置800ms后显示发送状态的定时器
    const statusTimer = setTimeout(() => {
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SENDING
      })
    }, 800)

    console.log('发送消息', messageBody, msg.type)
    apis
      .sendMsg({
        roomId: globalStore.currentSession.roomId,
        msgType: msg.type,
        body: messageBody
      })
      .then((res) => {
        clearTimeout(statusTimer)
        // 更新消息状态为成功，同时更新消息ID和回复内容
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: res.message.id,
          body: res.message.body // 更新消息体，包含服务器返回的回复内容
        })
        chatStore.updateSessionLastActiveTime(globalStore.currentSession.roomId)
      })
      .catch(() => {
        clearTimeout(statusTimer)
        // 更新消息状态为失败
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.FAILED
        })
      })

    // 清空输入框和回复信息
    msgInput.value = ''
    messageInputDom.value.innerHTML = ''
    reply.value = { imgCount: 0, accountName: '', content: '', key: 0 }
  }

  /** 当输入框手动输入值的时候触发input事件(使用vueUse的防抖) */
  const handleInput = useDebounceFn(async (e: Event) => {
    const inputElement = e.target as HTMLInputElement
    // 如果输入框中只有<br />标签，则清空输入框内容
    // TODO: 为什么这里输入后会有一个br标签?
    if (inputElement.innerHTML === '<br>') {
      inputElement.innerHTML = ''
      msgInput.value = inputElement.innerHTML
    }
    msgInput.value = inputElement.innerHTML || ''
    const { range, selection } = getEditorRange()!
    /** 获取当前光标所在的节点和文本内容 */
    if (!range || !selection) {
      ait.value = false
      return
    }
    /** 获取当前节点 */
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
        dom.style.height = 'auto'
        dom.style.maxHeight = '190px'
        dom.style.left = `${res.x - 20}px`
        dom.style.top = `${res.y - (dom.offsetHeight + 5)}px`
      })
    } else {
      ait.value = false
    }
  }, 10) // 防抖时间过长会导致输入内容已经显示但是实际还没有进入到这里进行处理

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
      insertNode(MsgEnum.TEXT, '\n', {} as HTMLElement)
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
    insertNode(MsgEnum.AIT, item.name, {} as HTMLElement)
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
