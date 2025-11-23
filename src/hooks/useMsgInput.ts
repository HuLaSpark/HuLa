import { Channel, invoke } from '@tauri-apps/api/core'
import { readImage, readText } from '@tauri-apps/plugin-clipboard-manager'
import { useDebounceFn } from '@vueuse/core'
import pLimit from 'p-limit'
import { storeToRefs } from 'pinia'
import type { Ref } from 'vue'
import { nextTick } from 'vue'
import { LimitEnum, MessageStatusEnum, MittEnum, MsgEnum, TauriCommand, UploadSceneEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import type { AIModel } from '@/services/types.ts'
import type { BaseUserItem } from '@/stores/cached.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { messageStrategyMap } from '@/strategy/MessageStrategy.ts'
import { fixFileMimeType, getMessageTypeByFile } from '@/utils/FileType.ts'
import { processClipboardImage } from '@/utils/ImageUtils.ts'
import { getReplyContent } from '@/utils/MessageReply.ts'
import { isMac, isMobile, isWindows } from '@/utils/PlatformConstants'
import { type SelectionRange, useCommon } from './useCommon.ts'
import { globalFileUploadQueue } from './useFileUploadQueue.ts'
import { useTrigger } from './useTrigger'
import { UploadProviderEnum, useUpload } from './useUpload.ts'
import { useI18n } from 'vue-i18n'

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
   */
  const updateSelectionRange = (sr: SelectionRange | null) => {
    cursorSelectionRange = sr
  }

  const getCursorSelectionRange = () => {
    return cursorSelectionRange
  }

  /**
   * 聚焦指定的编辑器元素
   * @param editor 可聚焦的编辑器元素
   */
  const focusOn = (editor: HTMLElement) => {
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
  const { t } = useI18n()
  const groupStore = useGroupStore()
  const chatStore = useChatStore()
  const globalStore = useGlobalStore()
  const { uploadToQiniu } = useUpload()
  const { getCursorSelectionRange, updateSelectionRange, focusOn } = useCursorManager()
  const {
    triggerInputEvent,
    insertNode,
    getMessageContentType,
    getEditorRange,
    imgPaste,
    saveCacheFile,
    reply,
    userUid
  } = useCommon()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  /** 艾特选项的key  */
  const chatKey = ref(chat.value.sendKey)
  /** 输入框内容  */
  const msgInput = ref('')
  /** 发送按钮是否禁用 */
  const disabledSend = computed(() => {
    const plainText = stripHtml(msgInput.value)
    return (
      plainText.length === 0 ||
      plainText
        .replace(/&nbsp;/g, ' ')
        .replace(/\u00A0/g, ' ')
        .trim().length === 0
    )
  })
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
  // 允许为空是因为 / 触发面板关闭时需要清空当前选中项
  const selectedAIKey = ref<string | null>(groupedAIModels.value[0]?.uid ?? null)

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
      return groupStore.userList.filter((user) => {
        // 同时匹配群昵称（myName）和原名称（name）
        const displayName = user.myName || user.name
        return displayName?.startsWith(aitKey.value) && user.uid !== userUid.value
      })
    } else {
      // 过滤当前登录的用户
      return groupStore.userList.filter((user) => user.uid !== userUid.value)
    }
  })
  /** 记录当前选中的提及项 key */
  const selectedAitKey = ref(personList.value[0]?.uid ?? null)
  /** 右键菜单列表 */
  const menuList = ref([
    { label: t('editor.menu.cut'), icon: 'screenshot', disabled: true },
    { label: t('editor.menu.copy'), icon: 'copy', disabled: true },
    {
      label: t('editor.menu.paste'),
      icon: 'intersection',
      click: async () => {
        try {
          let imageProcessed = false

          // 使用Tauri的readImage API获取剪贴板图片
          const clipboardImage = await readImage().catch(() => null)
          if (clipboardImage) {
            try {
              // 使用工具函数处理剪贴板图片数据
              const file = await processClipboardImage(clipboardImage)

              messageInputDom.value.focus()
              nextTick(() => {
                // 使用File对象触发缓存机制
                imgPaste(file, messageInputDom.value)
              })

              imageProcessed = true
            } catch (error) {
              console.error('Tauri处理图片数据失败:', error)
            }
          }

          // 如果没有图片，尝试读取文本
          if (!imageProcessed) {
            const content = await readText().catch(() => null)
            if (content) {
              messageInputDom.value.focus()
              nextTick(() => {
                insertNode(MsgEnum.TEXT, content, {} as HTMLElement)
                triggerInputEvent(messageInputDom.value)
              })
              return
            } else {
              // 当既没有图片也没有文本时，显示提示信息
              alert('无法获取当前剪贴板中对于的类型的内容，请使用 ctrl/command + v')
            }
          }
        } catch (error) {
          console.error('粘贴失败:', error)
        }
      }
    },
    { label: t('editor.menu.save_as'), icon: 'Importing', disabled: true },
    { label: t('editor.menu.select_all'), icon: 'check-one' }
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
    if (groupedAIModels.value.length === 0) {
      // 没有可选模型时关闭弹层并清空游标，避免 Enter 键误触发
      selectedAIKey.value = null
      aiDialogVisible.value = false
    } else if (!aiDialogVisible.value) {
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

    // 优先通过@标签节点提取
    // 优先读取带有uid的@节点，确保只统计真正选择过的成员
    const mentionNodes = tempDiv.querySelectorAll<HTMLElement>('#aitSpan, [data-ait-uid]')
    mentionNodes.forEach((node) => {
      const uid = node.dataset.aitUid
      if (uid) {
        atUserIds.push(uid)
        return
      }
      const name = node.textContent?.replace(/^@/, '')?.trim()
      if (!name) return
      const user = userList.find((u) => u.name === name)
      if (user) {
        atUserIds.push(user.uid)
      }
    })

    if (atUserIds.length > 0) {
      return [...new Set(atUserIds)]
    }

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

  // 在 HTML 字符串中安全解析为 Document 对象
  const parseHtmlSafely = (html: string) => {
    if (!html) return null

    if (typeof DOMParser !== 'undefined') {
      return new DOMParser().parseFromString(html, 'text/html')
    }

    return null
  }

  /** 去除html标签(用于鉴别回复时是否有输入内容) */
  const stripHtml = (html: string) => {
    try {
      // 检查是否是表情包
      if (html.includes('data-type="emoji"')) {
        const doc = parseHtmlSafely(html)
        const imgElement = doc?.querySelector<HTMLImageElement>('img[data-type]')
        if (imgElement?.src) {
          return (msgInput.value = imgElement.src)
        }
      }
      // 检查是否是视频
      if (html.includes('data-type="video"')) {
        return html
      }

      const doc = parseHtmlSafely(html)
      if (!doc || !doc.body) {
        let sanitized = html
        let previous
        do {
          previous = sanitized
          sanitized = sanitized.replace(/<[^>]*>/g, '')
        } while (sanitized !== previous)
        return sanitized.trim()
      }

      const replyDiv = doc.querySelector('#replyDiv')
      replyDiv?.remove()

      // 检查是否包含粘贴的图片（有temp-image id的图片元素）
      const pastedImage = doc.querySelector('#temp-image')
      if (pastedImage) {
        return 'image' // 返回非空字符串，表示有内容
      }

      const textContent = doc.body.textContent?.trim()
      if (textContent) return textContent

      const innerText = (doc.body as HTMLElement).innerText?.trim?.()
      if (innerText) return innerText

      return ''
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
      // 确保完全清除所有空白字符
      messageInputDom.value.textContent = ''
      reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }
    } catch (error) {
      console.error('Error in resetInput:', error)
    }
  }

  const retainRawContent = (type: MsgEnum) => [MsgEnum.EMOJI, MsgEnum.IMAGE].includes(type)

  /** 处理发送信息事件 */
  // TODO 输入框中的内容当我切换消息的时候需要记录之前输入框的内容 (nyh -> 2024-03-01 07:03:43)
  const send = async () => {
    const targetRoomId = globalStore.currentSessionRoomId
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
    const atUidList = extractAtUserIds(msgInput.value, groupStore.userList)
    const tempMsgId = 'T' + Date.now().toString()

    // 根据消息类型创建消息体
    const messageBody = {
      ...messageStrategy.buildMessageBody(msg, reply),
      atUidList
    }

    // 创建临时消息对象
    const tempMsg = await messageStrategy.buildMessageType(tempMsgId, messageBody, globalStore, userUid)
    resetInput()

    tempMsg.message.status = MessageStatusEnum.SENDING
    // 先添加到消息列表
    chatStore.pushMsg(tempMsg)

    // 设置发送状态的定时器
    chatStore.updateMsg({
      msgId: tempMsgId,
      status: MessageStatusEnum.SENDING
    })

    // 移动端发送消息后重新聚焦输入框
    if (isMobile()) {
      nextTick(() => {
        focusOn(messageInputDom.value)
      })
    }

    try {
      // 如果是图片或表情消息,需要先上传文件
      if (msg.type === MsgEnum.IMAGE || msg.type === MsgEnum.EMOJI) {
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
      } else if (msg.type === MsgEnum.VIDEO) {
        // 先上传缩略图（使用去重功能）
        let uploadResult: string
        if (messageStrategy.uploadThumbnail && messageStrategy.doUploadThumbnail) {
          const thumbnailUploadInfo = await messageStrategy.uploadThumbnail(msg.thumbnail, {
            provider: UploadProviderEnum.QINIU
          })
          const thumbnailUploadResult = await messageStrategy.doUploadThumbnail(
            msg.thumbnail,
            thumbnailUploadInfo.uploadUrl,
            thumbnailUploadInfo.config
          )
          uploadResult =
            thumbnailUploadInfo.config?.provider === UploadProviderEnum.QINIU
              ? thumbnailUploadResult?.qiniuUrl || thumbnailUploadInfo.downloadUrl
              : thumbnailUploadInfo.downloadUrl
        } else {
          uploadResult = await useUpload()
            .uploadFile(msg.thumbnail, {
              provider: UploadProviderEnum.QINIU,
              scene: UploadSceneEnum.CHAT
            })
            .then((UploadResult) => {
              return UploadResult.downloadUrl
            })
        }

        // 再上传视频文件
        const { uploadUrl, downloadUrl, config } = await messageStrategy.uploadFile(msg.path, {
          provider: UploadProviderEnum.QINIU
        })
        const doUploadResult = await messageStrategy.doUpload(msg.path, uploadUrl, config)
        messageBody.url =
          config?.provider && config?.provider === UploadProviderEnum.QINIU ? doUploadResult?.qiniuUrl : downloadUrl
        delete messageBody.path // 删除临时路径
        messageBody.thumbUrl = uploadResult
        messageBody.thumbSize = msg.thumbnail.size
        messageBody.thumbWidth = 300
        messageBody.thumbHeight = 150

        // 更新临时消息的URL
        chatStore.updateMsg({
          msgId: tempMsgId,
          body: {
            ...messageBody
          },
          status: MessageStatusEnum.SENDING
        })
      }
      // 发送消息到服务器 - 使用 channel 方式
      const successChannel = new Channel<any>()
      const errorChannel = new Channel<string>()

      // 监听成功响应
      successChannel.onmessage = (message) => {
        chatStore.updateMsg({
          msgId: message.oldMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: message.message.id,
          body: message.message.body,
          timeBlock: message.timeBlock
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      // 监听错误响应
      errorChannel.onmessage = (msgId) => {
        chatStore.updateMsg({
          msgId: msgId,
          status: MessageStatusEnum.FAILED
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      await invoke(TauriCommand.SEND_MSG, {
        data: {
          id: tempMsgId,
          roomId: targetRoomId,
          msgType: msg.type,
          body: messageBody
        },
        successChannel,
        errorChannel
      })

      // 更新会话最后活动时间
      chatStore.updateSessionLastActiveTime(targetRoomId)

      // 消息发送成功后释放预览URL
      if ((msg.type === MsgEnum.IMAGE || msg.type === MsgEnum.EMOJI) && msg.url.startsWith('blob:')) {
        URL.revokeObjectURL(msg.url)
      }

      // 释放视频缩略图的本地预览URL
      if (msg.type === MsgEnum.VIDEO && messageBody.thumbUrl && messageBody.thumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(messageBody.thumbUrl)
      }
    } catch (error) {
      console.error('消息发送失败:', error)
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.FAILED
      })

      // 释放预览URL
      if ((msg.type === MsgEnum.IMAGE || msg.type === MsgEnum.EMOJI) && msg.url.startsWith('blob:')) {
        URL.revokeObjectURL(msg.url)
      }

      // 释放视频缩略图的本地预览URL
      if (msg.type === MsgEnum.VIDEO && messageBody.thumbUrl && messageBody.thumbUrl.startsWith('blob:')) {
        URL.revokeObjectURL(messageBody.thumbUrl)
      }
    }
  }

  /** 当输入框手动输入值的时候触发input事件(使用vueUse的防抖) */
  const handleInput = useDebounceFn(async (e: Event) => {
    const inputElement = e.target as HTMLInputElement

    // 检查输入框内容，如果只有空白字符、br标签或空元素则清空
    const textContent = inputElement.textContent || ''
    const innerHTML = inputElement.innerHTML || ''

    // 检查是否有实际内容（图片、视频、表情等）
    const hasMediaContent =
      innerHTML.includes('<img') || innerHTML.includes('<video') || innerHTML.includes('data-type=')

    // 清理各种空白字符和空标签
    const cleanText = textContent.replace(/[\u00A0\u0020\u2000-\u200B\u2028\u2029]/g, '').trim()
    const hasOnlyEmptyElements =
      innerHTML === '<br>' ||
      innerHTML === '<div><br></div>' ||
      innerHTML.match(/^(<br>|<div><br><\/div>|<p><br><\/p>|\s)*$/)

    // 只有在没有媒体内容且没有有效文本时才清空
    if (!hasMediaContent && (cleanText === '' || hasOnlyEmptyElements)) {
      inputElement.innerHTML = ''
      inputElement.textContent = ''
      msgInput.value = ''
      // 输入框为空时重置所有状态
      resetAllStates()
      return
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
    if (isChinese.value && isMac()) {
      return
    }
    const isWindowsPlatform = isWindows()
    const isEnterKey = e.key === 'Enter'
    const isCtrlOrMetaKey = isWindowsPlatform ? e.ctrlKey : e.metaKey

    const sendKeyIsEnter = chat.value.sendKey === 'Enter'
    const sendKeyIsCtrlEnter = chat.value.sendKey === `${isWindowsPlatform ? 'Ctrl' : '⌘'}+Enter`

    // 如果当前的系统是mac，我需要判断当前的chat.value.sendKey是否是Enter，再判断当前是否是按下⌘+Enter
    if (!isWindowsPlatform && chat.value.sendKey === 'Enter' && e.metaKey && e.key === 'Enter') {
      // 就进行换行操作
      e.preventDefault()
      insertNode(MsgEnum.TEXT, '\n', {} as HTMLElement)
      triggerInputEvent(messageInputDom.value)
    }
    if (msgInput.value === '' || msgInput.value.trim() === '' || ait.value) {
      e?.preventDefault()
      return
    }
    if (!isWindowsPlatform && e.ctrlKey && isEnterKey && sendKeyIsEnter) {
      e?.preventDefault()
      return
    }
    if ((sendKeyIsEnter && isEnterKey && !isCtrlOrMetaKey) || (sendKeyIsCtrlEnter && isCtrlOrMetaKey && isEnterKey)) {
      e?.preventDefault()
      // 触发form提交而不是直接调用send
      const form = document.getElementById('message-form') as HTMLFormElement
      if (form) {
        form.requestSubmit()
      }
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

    // 获取用户的完整信息，优先使用群昵称（myName），与渲染逻辑保持一致
    const userInfo = groupStore.getUserInfo(item.uid)
    const displayName = userInfo?.myName || item.name

    // 无论是哪种情况，都在当前光标位置插入@提及
    insertNode(
      MsgEnum.AIT,
      {
        name: displayName,
        uid: item.uid
      },
      {} as HTMLElement
    )
    triggerInputEvent(messageInputDom.value)
    ait.value = false
  }

  /** 处理点击 / 提及框事件 */
  const handleAI = (_item: any) => {
    // 如果正在输入拼音，不发送消息
    if (isChinese.value) {
      return
    }

    // TODO: (临时展示) 显示AI对接中的提示
    window.$message.info('当前ai正在对接，敬请期待')
    // 关闭AI选择弹窗
    aiDialogVisible.value = false

    // 清理输入框中的/触发词
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
        //TODO: (临时删除)  删除/触发词
        currentRange.deleteContents()
        triggerInputEvent(messageInputDom.value)
      }
    }
  }

  // ==================== 视频文件处理函数 ====================
  const processVideoFile = async (
    file: File,
    tempMsgId: string,
    messageStrategy: any,
    targetRoomId: string
  ): Promise<void> => {
    const tempMsg = messageStrategy.buildMessageType(
      tempMsgId,
      {
        url: URL.createObjectURL(file),
        size: file.size,
        fileName: file.name,
        thumbUrl: '',
        thumbWidth: 300,
        thumbHeight: 150,
        thumbSize: 0
      },
      globalStore,
      userUid
    )
    tempMsg.message.roomId = targetRoomId
    tempMsg.message.status = MessageStatusEnum.SENDING
    chatStore.pushMsg(tempMsg)

    let isProgressActive = true
    const cleanup = () => {
      isProgressActive = false
    }

    try {
      const [videoPath, thumbnailFile] = await Promise.all([
        saveCacheFile(file, 'video/'),
        messageStrategy.getVideoThumbnail(file)
      ])

      const localThumbUrl = URL.createObjectURL(thumbnailFile)
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SENDING,
        body: { ...tempMsg.message.body, thumbUrl: localThumbUrl, thumbSize: thumbnailFile.size }
      })

      const videoUploadResult = await messageStrategy.uploadFile(videoPath, { provider: UploadProviderEnum.QINIU })
      const qiniuConfig = videoUploadResult.config

      const { progress, onChange } = messageStrategy.getUploadProgress()
      onChange((event: string) => {
        if (!isProgressActive || event !== 'progress') return
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.SENDING,
          uploadProgress: progress.value
        })
      })

      const [videoUploadResponse, thumbnailUploadResponse] = await Promise.all([
        messageStrategy.doUpload(videoPath, videoUploadResult.uploadUrl, {
          provider: UploadProviderEnum.QINIU,
          ...qiniuConfig
        }),
        uploadToQiniu(thumbnailFile, qiniuConfig.scene || 'CHAT', qiniuConfig, true)
      ])

      cleanup()

      const finalVideoUrl = videoUploadResponse?.qiniuUrl || videoUploadResult.downloadUrl
      const finalThumbnailUrl =
        thumbnailUploadResponse?.downloadUrl || `${qiniuConfig.domain}/${thumbnailUploadResponse?.key}`

      const successChannel = new Channel<any>()
      const errorChannel = new Channel<string>()

      successChannel.onmessage = (message) => {
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: message.message.id,
          body: message.message.body,
          timeBlock: message.timeBlock
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      errorChannel.onmessage = () => {
        chatStore.updateMsg({ msgId: tempMsgId, status: MessageStatusEnum.FAILED })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      await invoke(TauriCommand.SEND_MSG, {
        data: {
          id: tempMsgId,
          roomId: targetRoomId,
          msgType: MsgEnum.VIDEO,
          body: {
            url: finalVideoUrl,
            size: file.size,
            fileName: file.name,
            thumbUrl: finalThumbnailUrl,
            thumbWidth: 300,
            thumbHeight: 150,
            thumbSize: thumbnailFile.size,
            localPath: videoPath,
            senderUid: userUid.value
          }
        },
        successChannel,
        errorChannel
      })

      URL.revokeObjectURL(tempMsg.message.body.url)
      URL.revokeObjectURL(localThumbUrl)
    } catch (error) {
      cleanup()
      throw error
    }
  }

  // ==================== 图片文件处理函数 ====================
  const processImageFile = async (
    file: File,
    tempMsgId: string,
    messageStrategy: any,
    targetRoomId: string
  ): Promise<void> => {
    const msg = await messageStrategy.getMsg('', reply, [file])
    const messageBody = messageStrategy.buildMessageBody(msg, reply)

    const tempMsg = messageStrategy.buildMessageType(tempMsgId, messageBody, globalStore, userUid)
    tempMsg.message.roomId = targetRoomId
    tempMsg.message.status = MessageStatusEnum.SENDING
    chatStore.pushMsg(tempMsg)
    const { uploadUrl, downloadUrl, config } = await messageStrategy.uploadFile(msg.path, {
      provider: UploadProviderEnum.QINIU
    })
    const doUploadResult = await messageStrategy.doUpload(msg.path, uploadUrl, config)

    messageBody.url = config?.provider === UploadProviderEnum.QINIU ? doUploadResult?.qiniuUrl : downloadUrl
    delete messageBody.path

    chatStore.updateMsg({
      msgId: tempMsgId,
      body: messageBody,
      status: MessageStatusEnum.SENDING
    })

    const successChannel = new Channel<any>()
    const errorChannel = new Channel<string>()

    successChannel.onmessage = (message) => {
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SUCCESS,
        newMsgId: message.message.id,
        body: message.message.body,
        timeBlock: message.timeBlock
      })
      useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
    }

    errorChannel.onmessage = () => {
      chatStore.updateMsg({ msgId: tempMsgId, status: MessageStatusEnum.FAILED })
      useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
    }

    await invoke(TauriCommand.SEND_MSG, {
      data: {
        id: tempMsgId,
        roomId: targetRoomId,
        msgType: MsgEnum.IMAGE,
        body: messageBody
      },
      successChannel,
      errorChannel
    })

    URL.revokeObjectURL(msg.url)
    chatStore.updateSessionLastActiveTime(targetRoomId)
  }

  // ==================== 通用文件处理函数 ====================
  const processGenericFile = async (
    file: File,
    tempMsgId: string,
    messageStrategy: any,
    targetRoomId: string
  ): Promise<void> => {
    const msg = await messageStrategy.getMsg('', reply, [file])
    const messageBody = messageStrategy.buildMessageBody(msg, reply)

    const tempMsg = messageStrategy.buildMessageType(tempMsgId, { ...messageBody, url: '' }, globalStore, userUid)
    tempMsg.message.roomId = targetRoomId
    tempMsg.message.status = MessageStatusEnum.SENDING
    chatStore.pushMsg(tempMsg)

    let isProgressActive = true
    const cleanup = () => {
      isProgressActive = false
    }

    try {
      const { progress, onChange } = messageStrategy.getUploadProgress()
      onChange((event: string) => {
        if (!isProgressActive || event !== 'progress') return
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.SENDING,
          uploadProgress: progress.value
        })
      })

      const { uploadUrl, downloadUrl, config } = await messageStrategy.uploadFile(msg.path, {
        provider: UploadProviderEnum.QINIU
      })
      const doUploadResult = await messageStrategy.doUpload(msg.path, uploadUrl, config)

      cleanup()

      messageBody.url = config?.provider === UploadProviderEnum.QINIU ? doUploadResult?.qiniuUrl : downloadUrl
      delete messageBody.path

      chatStore.updateMsg({
        msgId: tempMsgId,
        body: messageBody,
        status: MessageStatusEnum.SENDING
      })

      const successChannel = new Channel<any>()
      const errorChannel = new Channel<string>()

      successChannel.onmessage = (message) => {
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: message.message.id,
          body: message.message.body,
          timeBlock: message.timeBlock
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      errorChannel.onmessage = () => {
        chatStore.updateMsg({ msgId: tempMsgId, status: MessageStatusEnum.FAILED })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      await invoke(TauriCommand.SEND_MSG, {
        data: {
          id: tempMsgId,
          roomId: targetRoomId,
          msgType: MsgEnum.FILE,
          body: messageBody
        },
        successChannel,
        errorChannel
      })

      chatStore.updateSessionLastActiveTime(targetRoomId)
    } catch (error) {
      cleanup()
      throw error
    }
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
      // 如果输入框不存在，直接返回
      if (!messageInputDom.value) return

      try {
        const userInfo = groupStore.getUserInfo(event.fromUser.uid)!
        const accountName = userInfo.name
        const avatar = userInfo.avatar

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
        const content = getReplyContent(event.message)

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
            focusOn(messageInputDom.value)

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

  /**
   * 发送文件的函数（优化版 - 并发处理，逐个显示）
   * @param files 要发送的文件数组
   */
  const sendFilesDirect = async (files: File[]) => {
    const targetRoomId = globalStore.currentSessionRoomId

    // 初始化文件上传队列
    globalFileUploadQueue.initQueue(files)

    // 创建并发限制器（同时处理3个文件）
    const limit = pLimit(3)

    // 并发处理所有文件
    const tasks = files.map((file, index) => {
      const fileId = globalFileUploadQueue.queue.items[index]?.id

      return limit(async () => {
        let msgType: MsgEnum = MsgEnum.TEXT
        let tempMsgId = ''

        try {
          // 更新队列状态
          if (fileId) {
            globalFileUploadQueue.updateFileStatus(fileId, 'uploading', 0)
          }

          // 文件类型处理
          const processedFile = fixFileMimeType(file)
          msgType = getMessageTypeByFile(processedFile)
          if (msgType === MsgEnum.VOICE) msgType = MsgEnum.FILE

          // 生成唯一消息ID
          tempMsgId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
          const messageStrategy = messageStrategyMap[msgType]

          // 根据类型调用对应处理函数，传递固定的 roomId
          if (msgType === MsgEnum.VIDEO) {
            await processVideoFile(processedFile, tempMsgId, messageStrategy, targetRoomId)
          } else if (msgType === MsgEnum.IMAGE) {
            await processImageFile(processedFile, tempMsgId, messageStrategy, targetRoomId)
          } else if (msgType === MsgEnum.FILE) {
            await processGenericFile(processedFile, tempMsgId, messageStrategy, targetRoomId)
          }

          // 成功 - 更新队列状态
          if (fileId) {
            globalFileUploadQueue.updateFileStatus(fileId, 'completed', 100)
          }
        } catch (error) {
          console.error(`${file.name} 发送失败:`, error)

          // 失败 - 更新队列和消息状态
          if (fileId) {
            globalFileUploadQueue.updateFileStatus(fileId, 'failed', 0)
          }

          if (tempMsgId) {
            chatStore.updateMsg({
              msgId: tempMsgId,
              status: MessageStatusEnum.FAILED
            })
          }

          window.$message.error(`${file.name} 发送失败`)
        }
      })
    })

    // 等待所有文件完成（不阻塞UI，文件会逐个显示成功）
    await Promise.allSettled(tasks)

    // 检查输入框中是否有图片需要自动发送
    try {
      await nextTick()
      if (
        messageInputDom.value?.querySelectorAll('img').length > 0 &&
        globalStore.currentSessionRoomId === targetRoomId
      ) {
        const contentType = getMessageContentType(messageInputDom)
        if (contentType === MsgEnum.IMAGE || contentType === MsgEnum.EMOJI) {
          await send()
        }
      }
    } catch (error) {
      console.error('自动发送输入框图片失败:', error)
    }
  }

  const sendVoiceDirect = async (voiceData: any) => {
    const targetRoomId = globalStore.currentSessionRoomId
    try {
      // 创建语音消息数据
      const msg = {
        type: MsgEnum.VOICE,
        path: voiceData.localPath, // 本地路径用于上传
        url: `asset://${voiceData.localPath}`, // 本地预览URL
        size: voiceData.size,
        duration: voiceData.duration,
        filename: voiceData.filename
      }
      const tempMsgId = 'T' + Date.now().toString()

      // 创建消息体（初始使用本地路径）
      const messageBody = {
        url: msg.url,
        path: msg.path,
        size: msg.size,
        second: Math.round(msg.duration)
      }

      // 创建临时消息对象
      const userInfo = groupStore.getUserInfo(userUid.value)
      const tempMsg = {
        fromUser: {
          uid: String(userUid.value || 0),
          username: userInfo?.name || '',
          avatar: userInfo?.avatar || '',
          locPlace: userInfo?.locPlace || ''
        },
        message: {
          id: tempMsgId,
          roomId: targetRoomId,
          sendTime: Date.now(),
          status: MessageStatusEnum.PENDING,
          type: MsgEnum.VOICE,
          body: messageBody,
          messageMarks: {}
        },
        sendTime: Date.now(),
        loading: false
      }

      // 添加到消息列表（显示本地预览）
      chatStore.pushMsg(tempMsg)

      // 设置发送状态的定时器
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SENDING
      })

      try {
        // 获取语音消息策略
        const messageStrategy = messageStrategyMap[MsgEnum.VOICE]
        // 上传语音文件到七牛云
        const { uploadUrl, downloadUrl, config } = await messageStrategy.uploadFile(msg.path, {
          provider: UploadProviderEnum.QINIU
        })
        const doUploadResult = await messageStrategy.doUpload(msg.path, uploadUrl, config)

        // 更新消息体中的URL为服务器URL
        const finalUrl =
          config?.provider && config?.provider === UploadProviderEnum.QINIU ? doUploadResult?.qiniuUrl : downloadUrl
        messageBody.url = finalUrl || ''
        delete messageBody.path // 删除临时路径

        // 更新临时消息的URL
        chatStore.updateMsg({
          msgId: tempMsgId,
          body: {
            ...messageBody
          },
          status: MessageStatusEnum.SENDING
        })

        const sendData = {
          id: tempMsgId,
          roomId: targetRoomId,
          msgType: MsgEnum.VOICE,
          body: messageBody
        }

        try {
          // 发送消息到服务器 - 使用 channel 方式
          const voiceSuccessChannel = new Channel<any>()
          const voiceErrorChannel = new Channel<string>()

          // 监听成功响应
          voiceSuccessChannel.onmessage = (message) => {
            chatStore.updateMsg({
              msgId: message.oldMsgId,
              status: MessageStatusEnum.SUCCESS,
              newMsgId: message.message.id,
              body: message.message.body,
              timeBlock: message.timeBlock
            })
            useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
          }

          // 监听错误响应
          voiceErrorChannel.onmessage = (msgId) => {
            chatStore.updateMsg({
              msgId: msgId,
              status: MessageStatusEnum.FAILED
            })
            useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
          }

          await invoke(TauriCommand.SEND_MSG, {
            data: sendData,
            successChannel: voiceSuccessChannel,
            errorChannel: voiceErrorChannel
          })

          // 更新会话最后活动时间
          chatStore.updateSessionLastActiveTime(targetRoomId)

          // 释放本地预览URL
          if (msg.url.startsWith('asset://')) {
            // asset:// 协议不需要手动释放
          }
        } catch (apiError: any) {
          chatStore.updateMsg({
            msgId: tempMsgId,
            status: MessageStatusEnum.FAILED
          })
          throw new Error(`发送消息失败: ${apiError.message || apiError}`)
        }
      } catch (uploadError) {
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.FAILED
        })
        throw uploadError
      }
    } catch (error) {
      console.error('🎤 语音消息发送失败:', error)
    }
  }

  /**
   * 发送地图的函数
   * @param locationData 地图数据
   */
  const sendLocationDirect = async (locationData: any) => {
    const targetRoomId = globalStore.currentSessionRoomId
    try {
      const tempMsgId = 'T' + Date.now().toString()
      const messageStrategy = messageStrategyMap[MsgEnum.LOCATION]

      // 将位置数据转换为JSON字符串作为消息内容
      const content = JSON.stringify(locationData)

      // 构建位置消息
      const msg = messageStrategy.getMsg(content, reply.value)
      const messageBody = messageStrategy.buildMessageBody(msg, reply)

      // 创建临时消息对象
      const tempMsg = messageStrategy.buildMessageType(tempMsgId, messageBody, globalStore, userUid)
      tempMsg.message.status = MessageStatusEnum.SENDING

      // 添加到消息列表
      chatStore.pushMsg(tempMsg)

      // 设置发送状态
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SENDING
      })

      // 发送消息到服务器 - 使用 channel 方式
      const successChannel = new Channel<any>()
      const errorChannel = new Channel<string>()

      // 监听成功响应
      successChannel.onmessage = (message) => {
        chatStore.updateMsg({
          msgId: message.oldMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: message.message.id,
          body: message.message.body,
          timeBlock: message.timeBlock
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      // 监听错误响应
      errorChannel.onmessage = (msgId) => {
        chatStore.updateMsg({
          msgId: msgId,
          status: MessageStatusEnum.FAILED
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      await invoke(TauriCommand.SEND_MSG, {
        data: {
          id: tempMsgId,
          roomId: targetRoomId,
          msgType: MsgEnum.LOCATION,
          body: messageBody
        },
        successChannel,
        errorChannel
      })

      // 更新会话最后活动时间
      chatStore.updateSessionLastActiveTime(targetRoomId)
    } catch (error) {
      console.error('位置消息发送失败:', error)
    }
  }

  /**
   * 直接发送表情包的函数（移动端专用）
   * @param emojiUrl 表情包URL
   */
  const sendEmojiDirect = async (emojiUrl: string) => {
    const targetRoomId = globalStore.currentSessionRoomId

    try {
      const tempMsgId = 'T' + Date.now().toString()

      const messageStrategy = messageStrategyMap[MsgEnum.EMOJI]

      // 构建表情包消息
      const msg = messageStrategy.getMsg(emojiUrl, reply.value)
      const messageBody = messageStrategy.buildMessageBody(msg, reply)

      // 创建临时消息对象
      const tempMsg = messageStrategy.buildMessageType(tempMsgId, messageBody, globalStore, userUid)
      tempMsg.message.status = MessageStatusEnum.SENDING

      // 添加到消息列表
      chatStore.pushMsg(tempMsg)

      // 设置发送状态
      chatStore.updateMsg({
        msgId: tempMsgId,
        status: MessageStatusEnum.SENDING
      })

      // 发送消息到服务器 - 使用 channel 方式
      const successChannel = new Channel<any>()
      const errorChannel = new Channel<string>()

      // 监听成功响应
      successChannel.onmessage = (message) => {
        chatStore.updateMsg({
          msgId: message.oldMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: message.message.id,
          body: message.message.body,
          timeBlock: message.timeBlock
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      // 监听错误响应
      errorChannel.onmessage = (msgId) => {
        chatStore.updateMsg({
          msgId: msgId,
          status: MessageStatusEnum.FAILED
        })
        useMitt.emit(MittEnum.CHAT_SCROLL_BOTTOM)
      }

      await invoke(TauriCommand.SEND_MSG, {
        data: {
          id: tempMsgId,
          roomId: targetRoomId,
          msgType: MsgEnum.EMOJI,
          body: messageBody
        },
        successChannel,
        errorChannel
      })

      // 更新会话最后活动时间
      chatStore.updateSessionLastActiveTime(targetRoomId)
    } catch (error) {
      console.error('[useMsgInput] 表情包消息发送失败:', error)
      throw error
    }
  }

  return {
    imgPaste,
    inputKeyDown,
    handleAit,
    handleAI,
    handleInput,
    send,
    stripHtml,
    sendLocationDirect,
    sendFilesDirect,
    sendVoiceDirect,
    sendEmojiDirect,
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
