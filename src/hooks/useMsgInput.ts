import { LimitEnum, MittEnum, MsgEnum, MessageStatusEnum, RoomTypeEnum } from '@/enums'
import { useUserInfo } from '@/hooks/useCached.ts'
import apis from '@/services/apis.ts'
import { useCachedStore, type BaseUserItem } from '@/stores/cached.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { type } from '@tauri-apps/plugin-os'
import { useDebounceFn } from '@vueuse/core'
import { Ref } from 'vue'
import { SelectionRange, useCommon } from './useCommon.ts'
import { readText, readImage } from '@tauri-apps/plugin-clipboard-manager'
import { messageStrategyMap } from '@/strategy/MessageStrategy.ts'
import { useTrigger } from './useTrigger'
import type { AIModel } from '@/services/types.ts'
import { UploadProviderEnum } from './useUpload.ts'

/**
 * 光标管理器
 */
export function useCursorManager() {
  /**
   * 记录当前光标范围
   */
  let cursorSelectionRange: SelectionRange | null = null
  /**
   * 记录当前编辑器的选取范围
   * ps: 任何修改了原因导致焦点移动，都应该更新，无论如何
   */
  function updateSelectionRange(sr: SelectionRange | null) {
    cursorSelectionRange = sr
  }

  function getCursorSelectionRange() {
    return cursorSelectionRange
  }

  /**
   * 聚焦指定的编辑器元素
   * @param editor 可聚焦的编辑器元素
   */
  function focusOn(editor: HTMLElement) {
    editor.focus()

    const selection = window.getSelection()
    if (!selection) return
    const selectionRange = getCursorSelectionRange()
    if (!selectionRange) return

    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    selection?.removeAllRanges()
    selection?.addRange(selectionRange.range)
  }

  return { getCursorSelectionRange, updateSelectionRange, focusOn }
}

export const useMsgInput = (messageInputDom: Ref) => {
  const chatStore = useChatStore()
  const globalStore = useGlobalStore()
  const cachedStore = useCachedStore()
  const { getCursorSelectionRange, updateSelectionRange, focusOn } = useCursorManager()
  const { triggerInputEvent, insertNode, getMessageContentType, getEditorRange, imgPaste, reply, userUid } = useCommon()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  /** 艾特选项的key  */
  const chatKey = ref(chat.value.sendKey)
  /** 输入框内容  */
  const msgInput = ref('')
  /** 发送按钮是否禁用 */
  const disabledSend = computed(() => {
    const plainText = stripHtml(msgInput.value)
    return plainText.length === 0 || plainText.replace(/&nbsp;/g, ' ').trim().length === 0
  })
  // /** 临时消息id */
  // const tempMessageId = ref(0)
  // @艾特弹出框
  const ait = ref(false)
  const aitKey = ref('')
  // AI弹出框
  const aiDialogVisible = ref(false)
  const aiKeyword = ref('')
  const aiModelList = ref<AIModel[]>([
    {
      uid: '1',
      type: 'Ollama',
      name: 'DeepSeek-V3',
      value: 'deepseek-chat',
      avatar: '/AI/deepseek.png'
    },
    {
      uid: '2',
      type: 'Ollama',
      name: '通义千问-Plus',
      value: 'qwen-plus',
      avatar: '/AI/QW.png'
    },
    {
      uid: '3',
      type: 'OpenAI',
      name: 'ChatGPT-4',
      value: 'ChatGPT-4',
      avatar: '/AI/openai.svg'
    }
  ])
  // 使用计算属性获取分组后的数据
  const groupedAIModels = computed(() => {
    if (aiKeyword.value && !isChinese.value) {
      return aiModelList.value.filter((i) => i.name?.startsWith(aiKeyword.value))
    } else {
      return aiModelList.value
    }
  })
  /** 记录当前选中的AI选项 key */
  const selectedAIKey = ref(groupedAIModels.value[0]?.uid ?? null)

  // #话题弹出框
  const topicDialogVisible = ref(false)
  const topicKeyword = ref('')
  const topicList = ref([
    {
      uid: '1',
      label: '话题1',
      value: '话题1'
    },
    {
      uid: '2',
      label: '话题2',
      value: '话题2'
    }
  ])

  /** 是否正在输入拼音 */
  const isChinese = ref(false)
  // 记录编辑器光标的位置
  const editorRange = ref<{ range: Range; selection: Selection } | null>(null)
  /** @ 候选人列表 */
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
      click: async () => {
        try {
          // 先尝试读取图片
          const clipboardImage = await readImage().catch(() => null)
          if (clipboardImage) {
            try {
              // 获取图片的 RGBA 数据
              const imageData = await clipboardImage.rgba()
              const blob = new Blob([imageData], { type: 'image/png' })
              const url = URL.createObjectURL(blob)
              console.log(url)

              messageInputDom.value.focus()
              nextTick(() => {
                imgPaste(blob, messageInputDom.value)
              })
              return
            } catch (error) {
              console.error('处理图片数据失败:', error)
            }
          }

          // 如果没有图片，尝试读取文本
          const content = await readText().catch(() => null)
          if (content) {
            messageInputDom.value.focus()
            nextTick(() => {
              insertNode(MsgEnum.TEXT, content, {} as HTMLElement)
              triggerInputEvent(messageInputDom.value)
            })
            return
          }
        } catch (error) {
          console.error('粘贴失败:', error)
        }
      }
    },
    { label: '另存为', icon: 'Importing', disabled: true },
    { label: '全部选择', icon: 'check-one' }
  ])

  // 将 useTrigger 的初始化移到这里
  const { handleTrigger, resetAllStates } = useTrigger(
    personList,
    groupedAIModels,
    topicList,
    ait,
    aitKey,
    aiDialogVisible,
    aiKeyword,
    topicDialogVisible,
    topicKeyword
  )

  watchEffect(() => {
    chatKey.value = chat.value.sendKey
    if (!ait.value && personList.value.length > 0) {
      selectedAitKey.value = personList.value[0]?.uid
    }
    if (!aiDialogVisible.value && groupedAIModels.value.length > 0) {
      selectedAIKey.value = groupedAIModels.value[0]?.uid
    }
    // 如果输入框没有值就把回复内容清空
    if (msgInput.value === '') {
      reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }
    }
  })

  watch(chatKey, (v) => {
    chat.value.sendKey = v
  })

  /**
   * 从HTML内容中提取 @ 用户的uid
   * @param content HTML格式的消息内容
   * @param userList 用户列表
   * @returns 被 @ 用户的uid数组
   */
  const extractAtUserIds = (content: string, userList: BaseUserItem[]): string[] => {
    const atUserIds: string[] = []

    // 创建临时DOM元素来解析HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = content

    // 获取纯文本内容
    const textContent = tempDiv.textContent || ''

    // 使用更精确的正则表达式匹配@用户
    // 匹配@后面的非空白字符，直到遇到空白字符或字符串结束
    const regex = /@([^\s]+)/g
    const matches = textContent.match(regex)

    if (matches) {
      matches.forEach((match) => {
        const username = match.slice(1) // 移除@符号
        const user = userList.find((u) => u.name === username)
        if (user) {
          atUserIds.push(user.uid)
        }
      })
    }

    // 去重并返回
    return [...new Set(atUserIds)]
  }

  /** 去除html标签(用于鉴别回复时是否有输入内容) */
  const stripHtml = (html: string) => {
    try {
      // 检查是否是表情包
      if (html.includes('data-type="emoji"')) {
        const tmp = document.createElement('div')
        tmp.innerHTML = html
        const imgElement = tmp.querySelector<HTMLImageElement>('img[data-type]')
        if (imgElement && imgElement.src) {
          return (msgInput.value = imgElement.src)
        }
      }

      const tmp = document.createElement('div')
      tmp.innerHTML = html
      const replyDiv = tmp.querySelector('#replyDiv')
      if (replyDiv) {
        replyDiv.remove()
      }
      return tmp.textContent?.trim() || tmp.innerText?.trim() || ''
    } catch (error) {
      console.error('Error in stripHtml:', error)
      return ''
    }
  }

  /** 重置输入框内容 */
  const resetInput = () => {
    try {
      msgInput.value = ''
      messageInputDom.value.innerHTML = ''
      reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }
    } catch (error) {
      console.error('Error in resetInput:', error)
    }
  }

  const retainRawContent = (type: MsgEnum) => [MsgEnum.EMOJI, MsgEnum.IMAGE].includes(type)

  /** 处理发送信息事件 */
  // TODO 输入框中的内容当我切换消息的时候需要记录之前输入框的内容 (nyh -> 2024-03-01 07:03:43)
  const send = async () => {
    // 判断输入框中的图片或者文件数量是否超过限制
    if (messageInputDom.value.querySelectorAll('img').length > LimitEnum.COM_COUNT) {
      window.$message.warning(`一次性只能上传${LimitEnum.COM_COUNT}个文件或图片`)
      return
    }
    const contentType = getMessageContentType(messageInputDom)
    //根据消息类型获取消息处理策略
    const messageStrategy = messageStrategyMap[contentType]
    if (!messageStrategy) {
      window.$message.warning('暂不支持发送类型消息')
      return
    }
    // 排除id="replyDiv"的元素的内容
    const replyDiv = messageInputDom.value.querySelector('#replyDiv')
    if (replyDiv) {
      replyDiv?.remove()
      // 如果回复的内容是一个链接，那么需要保留链接数据
      if (!retainRawContent(contentType))
        msgInput.value = messageInputDom.value.innerHTML.replace(replyDiv.outerHTML, '')
    }
    const msg = await messageStrategy.getMsg(msgInput.value, reply.value)
    const atUidList = extractAtUserIds(msgInput.value, cachedStore.currentAtUsersList)
    const tempMsgId = Date.now().toString()

    // 根据消息类型创建消息体
    const messageBody = {
      ...messageStrategy.buildMessageBody(msg, reply),
      atUidList
    }

    // 创建临时消息对象 - 此时已经包含本地预览链接
    const tempMsg = await messageStrategy.buildMessageType(tempMsgId, messageBody, globalStore, userUid)

    // 清空输入框和回复信息
    resetInput()

    // 先添加到消息列表 - 此时会显示本地预览
    chatStore.pushMsg(tempMsg)
    useMitt.emit(MittEnum.MESSAGE_ANIMATION, tempMsg)
    console.log('👾临时消息:', tempMsg)

    // 设置发送状态的定时器
    const statusTimer = setTimeout(() => {
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SENDING
      })
    }, 800)

    try {
      // 如果是图片或表情消息,需要先上传文件
      if (msg.type === MsgEnum.IMAGE || msg.type === MsgEnum.EMOJI) {
        console.log(`开始处理${msg.type === MsgEnum.EMOJI ? '表情包' : '图片'}消息上传`)
        // TODO: 如果使用的是默认上传方式,则uploadFile方法就会返回上传和下载链接了，但是使用七牛云上传方式则需要调用doUpload方法后才会返回对应的下载链接
        const { uploadUrl, downloadUrl, config } = await messageStrategy.uploadFile(msg.path, {
          provider: UploadProviderEnum.QINIU
        })
        const doUploadResult = await messageStrategy.doUpload(msg.path, uploadUrl, config)

        // 更新消息体中的URL为服务器URL(判断使用的是七牛云还是默认上传方式),如果没有provider就默认赋值downloadUrl
        messageBody.url =
          config?.provider && config?.provider === UploadProviderEnum.QINIU ? doUploadResult?.qiniuUrl : downloadUrl
        delete messageBody.path // 删除临时路径

        // 更新临时消息的URL
        chatStore.updateMsg({
          msgId: tempMsgId,
          body: {
            ...messageBody
          },
          status: MessageStatusEnum.SENDING
        })
        console.log(`${msg.type === MsgEnum.EMOJI ? '表情包' : '图片'}上传完成,更新为服务器URL:`, messageBody.url)
      }

      console.log('发送消息到服务器 ===>>> ', {
        roomId: globalStore.currentSession.roomId,
        msgType: msg.type,
        body: messageBody
      })

      // 发送消息到服务器
      const res = await apis.sendMsg({
        roomId: globalStore.currentSession.roomId,
        msgType: msg.type,
        body: messageBody
      })

      console.log('服务器返回的消息 ===> ', res)

      // 停止发送状态的定时器
      clearTimeout(statusTimer)

      // 更新消息状态为成功,并使用服务器返回的消息体
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SUCCESS,
        newMsgId: res.message.id,
        body: res.message.body
      })

      // 更新会话最后活动时间
      chatStore.updateSessionLastActiveTime(globalStore.currentSession.roomId)

      // 消息发送成功后释放预览URL
      if ((msg.type === MsgEnum.IMAGE || msg.type === MsgEnum.EMOJI) && msg.url.startsWith('blob:')) {
        URL.revokeObjectURL(msg.url)
      }
    } catch (error) {
      console.error('消息发送失败:', error)
      clearTimeout(statusTimer)
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.FAILED
      })
    }
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

    /** 获取当前光标所在的节点和文本内容 */
    const { range, selection } = getEditorRange()!
    if (!range || !selection) {
      resetAllStates()
      return
    }

    /** 获取当前节点 */
    const curNode = range.endContainer
    /** 判断当前节点是否是文本节点 */
    if (!curNode || !curNode.textContent || curNode.nodeName !== '#text') {
      resetAllStates()
      return
    }

    /** 获取当前光标位置和文本内容 */
    const cursorPosition = selection.focusOffset
    const text = curNode.textContent

    // 判断是群聊并且有用户列表时才触发@提及
    if (
      globalStore.currentSession.type === RoomTypeEnum.GROUP &&
      cachedStore.currentAtUsersList.length === 0 &&
      text.includes('@')
    ) {
      // 如果当前群聊没有加载用户列表，尝试加载
      await cachedStore.getGroupAtUserBaseInfo()
    }

    await handleTrigger(text, cursorPosition, { range, selection, keyword: '' })
  }, 0)

  /** input的keydown事件 */
  const inputKeyDown = async (e: KeyboardEvent) => {
    if (disabledSend.value) {
      e.preventDefault()
      e.stopPropagation()
      resetInput()
      return
    }

    // 当 ait 或 aiDialogVisible 为 true 时，阻止默认行为
    if (ait.value || aiDialogVisible.value) {
      e?.preventDefault()
      return
    }

    // 正在输入拼音，并且是macos系统
    if (isChinese.value && type() === 'macos') {
      return
    }
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
      await send()
      resetAllStates()
    }
  }

  /** 处理点击 @ 提及框事件 */
  const handleAit = (item: BaseUserItem) => {
    // 如果正在输入拼音，不发送消息
    if (isChinese.value) {
      return
    }
    // 先确保输入框获得焦点
    focusOn(messageInputDom.value)
    // 先获取并保存当前的编辑器范围
    const { range: currentRange, selection: currentSelection } = getEditorRange()!
    editorRange.value = { range: currentRange, selection: currentSelection }

    const myEditorRange = editorRange?.value?.range
    /** 获取光标所在位置的文本节点 */
    const textNode = myEditorRange?.endContainer

    // 如果有文本节点，说明是通过输入框@触发的
    if (textNode) {
      /** 获取光标在所在文本节点中的偏移位置 */
      const endOffset = myEditorRange?.endOffset
      /** 获取文本节点的值，并将其转换为字符串类型 */
      const textNodeValue = textNode?.nodeValue as string
      /** 使用正则表达式匹配@符号之后获取到的文本节点的值 */
      const expRes = /@([^@]*)$/.exec(textNodeValue)
      if (expRes) {
        /** 设置范围的起始位置为文本节点中@符号的位置 */
        currentRange.setStart(textNode, expRes.index)
        /** 设置范围的结束位置为光标的位置 */
        currentRange.setEnd(textNode, endOffset!)
      }
    }

    // 无论是哪种情况，都在当前光标位置插入@提及
    insertNode(MsgEnum.AIT, item.name, {} as HTMLElement)
    triggerInputEvent(messageInputDom.value)
    ait.value = false
  }

  /** 处理点击 / 提及框事件 */
  const handleAI = (item: any) => {
    // 如果正在输入拼音，不发送消息
    if (isChinese.value) {
      return
    }
    // 先确保输入框获得焦点
    focusOn(messageInputDom.value)
    // 先获取并保存当前的编辑器范围
    const { range: currentRange, selection: currentSelection } = getEditorRange()!
    editorRange.value = { range: currentRange, selection: currentSelection }

    const myEditorRange = editorRange?.value?.range
    /** 获取光标所在位置的文本节点 */
    const textNode = myEditorRange?.endContainer

    // 如果有文本节点，说明是通过输入框 / 触发的
    if (textNode) {
      /** 获取光标在所在文本节点中的偏移位置 */
      const endOffset = myEditorRange?.endOffset
      /** 获取文本节点的值，并将其转换为字符串类型 */
      const textNodeValue = textNode?.nodeValue as string
      /** 使用正则表达式匹配 / 符号之后获取到的文本节点的值 */
      const expRes = /([^/]*)$/.exec(textNodeValue)
      if (expRes) {
        /** 设置范围的起始位置为文本节点中 / 符号的位置 */
        currentRange.setStart(textNode, expRes.index)
        /** 设置范围的结束位置为光标的位置 */
        currentRange.setEnd(textNode, endOffset!)
      }
    }

    // 无论是哪种情况，都在当前光标位置插入@提及
    insertNode(MsgEnum.AI, item, {} as HTMLElement)
    triggerInputEvent(messageInputDom.value)
    aiDialogVisible.value = false
  }

  onMounted(async () => {
    useMitt.on(MittEnum.RE_EDIT, async (event: string) => {
      messageInputDom.value.focus()
      await nextTick(() => {
        messageInputDom.value.innerHTML = event
        msgInput.value = event
        // 将光标设置到内容末尾
        const selection = window.getSelection()
        const range = document.createRange()
        range.selectNodeContents(messageInputDom.value)
        range.collapse(false)
        selection?.removeAllRanges()
        selection?.addRange(range)
      })
    })

    if (messageInputDom.value) {
      /** 正在输入拼音时触发 */
      messageInputDom.value.addEventListener('compositionstart', () => {
        isChinese.value = true
      })
      /** 结束输入拼音时触发 */
      messageInputDom.value.addEventListener('compositionend', (e: CompositionEvent) => {
        setTimeout(() => {
          isChinese.value = false
          aitKey.value = e.data
          aiKeyword.value = e.data
        }, 10)
      })
    }
    /** 监听回复信息的传递 */
    useMitt.on(MittEnum.REPLY_MEG, (event: any) => {
      console.log('🐝正在回复消息:', event)
      // 如果输入框不存在，直接返回
      if (!messageInputDom.value) return

      try {
        const accountName = useUserInfo(event.fromUser.uid).value.name!
        const avatar = useUserInfo(event.fromUser.uid).value.avatar!

        // 步骤1: 确保输入框先获得焦点
        focusOn(messageInputDom.value)

        // 步骤2: 完全清理现有的回复状态
        // 如果已经有回复消息，需要先移除现有的回复框
        const existingReplyDiv = document.getElementById('replyDiv')
        if (existingReplyDiv) {
          existingReplyDiv.remove()
        }

        // 始终重置reply状态，确保完全清除之前的回复状态
        reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }

        // 步骤3: 处理回复内容
        // 回复前把包含&nbsp;的字符替换成空格
        let content = event.message.body.content || event.message.body.url
        if (content && typeof content === 'string') {
          content = content.replace(/&nbsp;/g, ' ')
        } else if (Array.isArray(content)) {
          content = content.map((item: string) => {
            return typeof item === 'string' ? item.replace(/&nbsp;/g, ' ') : item
          })
        }

        // 步骤4: 设置新的回复内容
        reply.value = {
          imgCount: 0,
          avatar: avatar,
          accountName: accountName,
          content: content,
          key: event.message.id
        }

        // 步骤5: 在DOM更新后插入回复框
        nextTick().then(() => {
          try {
            // 再次确保输入框获得焦点
            // messageInputDom.value.focus()
            focusOn(messageInputDom.value)

            // // 创建一个合适的选区，确保回复框被插入到正确的位置
            // const selection = window.getSelection()

            // if (!selection) return

            // // 移除所有现有的选区
            // selection.removeAllRanges()

            // // 创建新选区
            // const range = document.createRange()
            // range.selectNodeContents(messageInputDom.value)
            // range.collapse(true) // 将范围折叠到开始位置

            // // 应用选区
            // selection.addRange(range)

            // 保存选区以便后续使用
            // updateSelectionRange({ range, selection })

            // 插入回复框
            insertNode(
              MsgEnum.REPLY,
              { avatar: avatar, accountName: accountName, content: reply.value.content },
              {} as HTMLElement
            )

            // 确保光标位置在正确的位置
            updateSelectionRange(getEditorRange())
            focusOn(messageInputDom.value)

            // 触发input事件以更新UI
            triggerInputEvent(messageInputDom.value)
          } catch (err) {
            console.error('插入回复框时错误:', err)
          }
        })
      } catch (err) {
        console.error('回复_meg处理程序错误:', err)
      }
    })
  })

  return {
    imgPaste,
    inputKeyDown,
    handleAit,
    handleAI,
    handleInput,
    send,
    stripHtml,
    personList,
    ait,
    aitKey,
    msgInput,
    chatKey,
    menuList,
    selectedAitKey,
    reply,
    disabledSend,
    aiDialogVisible,
    aiKeyword,
    aiModelList,
    selectedAIKey,
    topicDialogVisible,
    topicKeyword,
    topicList,
    groupedAIModels,
    getCursorSelectionRange,
    updateSelectionRange: () => updateSelectionRange(getEditorRange()),
    focusOn
  }
}
