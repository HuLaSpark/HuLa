import { LimitEnum, MittEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { Ref } from 'vue'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'
import GraphemeSplitter from 'grapheme-splitter'
import router from '@/router'
import apis from '@/services/apis.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useMessage } from '@/hooks/useMessage.ts'
import { useUserStore } from '@/stores/user.ts'
import { BaseDirectory, create, exists, mkdir } from '@tauri-apps/plugin-fs'
import { getImageCache } from '@/utils/PathUtil.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import DOMPurify from 'dompurify'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

export interface SelectionRange {
  range: Range
  selection: Selection
}
const domParser = new DOMParser()

const REPLY_NODE_ID = 'replyDiv'

const saveCacheFile = async (file: any, subFolder: string, dom: HTMLElement) => {
  const fileName = file.name === null ? 'test.png' : file.name
  const tempPath = getImageCache(subFolder)
  const fullPath = tempPath + fileName
  const cacheReader = new FileReader()
  cacheReader.onload = async (e: any) => {
    const isExists = await exists(tempPath, { baseDir: BaseDirectory.AppCache })
    if (!isExists) {
      await mkdir(tempPath, { baseDir: BaseDirectory.AppCache, recursive: true })
    }
    const tempFile = await create(fullPath, { baseDir: BaseDirectory.AppCache })
    await tempFile.write(e.target.result)
    tempFile.close()
  }
  cacheReader.readAsArrayBuffer(file)
  const p = document.createElement('p')
  p.setAttribute('id', 'temp-image')
  p.style.setProperty('display', 'none')
  p.textContent = fullPath
  // 获取MsgInput组件暴露的lastEditRange
  const lastEditRange = (dom as any).getLastEditRange?.()

  // 确保dom获得焦点
  dom.focus()

  let range: Range
  if (!lastEditRange) {
    // 如果没有lastEditRange，创建一个新的范围到最后
    range = document.createRange()
    range.selectNodeContents(dom)
    range.collapse(false) // 折叠到末尾
  } else {
    range = lastEditRange
  }

  // 确保我们有有效的range
  const selection = window.getSelection()
  if (selection) {
    // 插入图片
    range.deleteContents()
    range.insertNode(p)
  }
  return fullPath
}

/**
 * 返回dom指定id的文本
 * @param dom 指定dom
 * @param id 元素id
 */
export const parseInnerText = (dom: string, id: string): string | undefined => {
  const doc = domParser.parseFromString(dom, 'text/html')
  return doc.getElementById(id)?.innerText
}

/** 常用工具类 */
export const useCommon = () => {
  const route = useRoute()
  const globalStore = useGlobalStore()
  const chatStore = useChatStore()
  const userStore = useUserStore()
  const { handleMsgClick } = useMessage()
  /** 当前登录用户的uid */
  const userUid = computed(() => userStore.userInfo.uid)
  /** 回复消息 */
  const reply = ref({
    avatar: '',
    accountName: '',
    content: '',
    key: 0,
    imgCount: 0
  })

  /**
   * 获取当前光标选取的信息(需要判断是否为空)
   */
  const getEditorRange = () => {
    if (window.getSelection) {
      const selection = window.getSelection()
      // 如果没有 rangeCount，尝试获取输入框的最后一个子节点
      if (!selection || selection.rangeCount === 0) {
        const inputElement = document.getElementById('message-input')
        if (inputElement) {
          inputElement.focus()
          const range = document.createRange()
          // 将光标移动到输入框的最后
          range.selectNodeContents(inputElement)
          range.collapse(false) // 折叠到末尾
          selection?.removeAllRanges()
          selection?.addRange(range)
        }
      }

      // 重新检查
      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0)
        return { range, selection }
      }
    }
    return null
  }

  /**
   * 获取messageInputDom输入框中的内容类型
   * @param messageInputDom 输入框dom
   */
  const getMessageContentType = (messageInputDom: Ref): MsgEnum => {
    let hasText = false
    let hasImage = false
    let hasVideo = false
    let hasFile = false
    let hasEmoji = false

    const elements = messageInputDom.value.childNodes
    for (const element of elements) {
      if (element.nodeType === Node.TEXT_NODE && element.nodeValue.trim() !== '') {
        hasText = true
      } else if (element.tagName === 'IMG') {
        if (element.dataset.type === 'file-canvas') {
          hasFile = true
        } else if (element.dataset.type === 'emoji') {
          // 检查是否是表情包图片
          hasEmoji = true
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
    } else if (hasEmoji && !hasText && !hasImage) {
      // 如果只有表情包，没有其他文本或图片，则返回EMOJI类型
      return MsgEnum.EMOJI
    } else if (hasText && hasImage) {
      return MsgEnum.MIXED
    } else if (hasImage) {
      return MsgEnum.IMAGE
    } else {
      return MsgEnum.TEXT
    }
  }

  /**
   * 触发输入框事件(粘贴的时候需要重新触发这个方法)
   * @param element 输入框dom
   */
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
   * @param target 目标节点
   */
  const insertNode = (type: MsgEnum, dom: any, target: HTMLElement) => {
    const sr = getEditorRange()!
    if (!sr) return

    insertNodeAtRange(type, dom, target, sr)
  }

  /**
   *  将指定节点插入到光标位置
   * @param { MsgEnum } type 插入的类型
   * @param dom dom节点
   * @param target 目标节点
   * @param sr 选区
   */
  const insertNodeAtRange = (type: MsgEnum, dom: any, target: HTMLElement, sr: SelectionRange) => {
    const { range, selection } = sr

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
      spanNode.style.userSelect = 'text' // 允许全选选中
      spanNode.appendChild(document.createTextNode(`@${dom}`))
      // 将span标签插入到光标位置
      range?.insertNode(spanNode)
      // 将光标折叠到Range的末尾(true表示折叠到Range的开始位置,false表示折叠到Range的末尾)
      range?.collapse(false)
      // 创建一个空格文本节点
      const spaceNode = document.createTextNode('\u00A0')
      // 将空格文本节点插入到光标位置
      range?.insertNode(spaceNode)
    } else if (type === MsgEnum.TEXT) {
      range?.insertNode(document.createTextNode(dom))
    } else if (type === MsgEnum.REPLY) {
      // TODO This might not be approperiate here. we should retrieve the focus element, But I'm not sure how to proceed at the moment.
      const inputElement = document.getElementById('message-input')
      // 记录聚焦元素是否存在子节点
      const hasChildNodes = inputElement?.hasChildNodes()

      const replyNode = createReplyDom(dom)
      const preReplyNode = document.getElementById('replyDiv')
      if (preReplyNode) {
        preReplyNode.replaceWith(replyNode)
      } else {
        // 被聚焦的元素在此之前如果存在子节点，那么需要将光标移动到行首
        if (hasChildNodes) {
          // 将光标移动到行首后将 reply-box 插入到光标位置
          selection.setPosition(selection.anchorNode, 0)
        }
        selection.getRangeAt(0).insertNode(replyNode)
        selection.getRangeAt(0).collapse(false)
        // 在此之前如果存在子节点，那么恢复光标，否则将光标移动到行首
        if (hasChildNodes) {
          // 恢复光标
          selection.removeAllRanges()
          selection.addRange(range)
        }
      }

      // 如果已经有内容了，那么不需要添加 其它元素
      if (hasChildNodes) return

      // 将光标折叠到Range的末尾(true表示折叠到Range的开始位置,false表示折叠到Range的末尾)
      range?.collapse(false)
      // 创建一个span节点作为空格
      const spaceNode = document.createElement('span')
      spaceNode.textContent = '\u00A0'
      // 设置不可编辑
      spaceNode.contentEditable = 'false'
      // 不可以选中
      spaceNode.style.userSelect = 'none'
      // 插入一个可编辑的文本节点，否则编辑器可能无法聚焦
      const blankNode = document.createTextNode('')
      range?.insertNode(blankNode)
      // 将空格节点插入到光标位置
      range?.insertNode(spaceNode)
      range?.collapse(false)
    } else if (type === MsgEnum.AI) {
      // 删除触发字符 "/"
      const startContainer = range.startContainer
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const text = startContainer.textContent || ''
        const lastIndex = text.lastIndexOf('/')
        if (lastIndex !== -1) {
          startContainer.textContent = text.substring(0, lastIndex)
        }
      }

      // 创建一个div标签节点
      const divNode = document.createElement('div')
      divNode.id = 'AIDiv' // 设置id为replyDiv
      divNode.contentEditable = 'false' // 设置为不可编辑
      divNode.tabIndex = -1 // 防止被focus
      divNode.style.cssText = `
      background-color: var(--reply-bg);
      font-size: 12px;
      padding: 4px 6px;
      width: fit-content;
      max-height: 86px;
      border-radius: 8px;
      margin-bottom: 2px;
      user-select: none;
      pointer-events: none; /* 防止鼠标事件 */
      cursor: default;
      outline: none; /* 移除focus时的轮廓 */
    `
      // 把dom中的value值作为回复信息的作者，dom中的content作为回复信息的内容
      const author = dom.name
      // 创建一个img标签节点作为头像
      const imgNode = document.createElement('img')
      imgNode.src = dom.avatar
      imgNode.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      object-fit: contain;
      `
      // 创建一个div标签节点作为回复信息的头部
      const headerNode = document.createElement('div')
      headerNode.style.cssText = `
      line-height: 1.5;
      font-size: 12px;
      padding: 0 4px;
      color: rgba(19, 152, 127);
      cursor: default;
      user-select: none;
      pointer-events: none;
    `
      headerNode.appendChild(document.createTextNode(author))
      // 在回复信息的右边添加一个关闭信息的按钮
      const closeBtn = document.createElement('span')
      closeBtn.id = 'closeBtn'
      closeBtn.style.cssText = `
      display: flex;
      align-items: center;
      font-size: 12px;
      color: #999;
      cursor: pointer;
      margin-left: 10px;
      flex-shrink: 0;
      user-select: none;
      pointer-events: auto; /* 确保关闭按钮可以点击 */
    `
      closeBtn.textContent = '关闭'
      closeBtn.addEventListener('click', () => {
        divNode.remove()
        const messageInput = document.getElementById('message-input') as HTMLElement
        // 移除messageInput的最前面的空格节点，获取空格后面的内容
        messageInput.textContent = messageInput.textContent!.trim()
        // 创建并初始化 range 对象
        const range = document.createRange()
        range.selectNodeContents(messageInput)
        range.collapse(false) // 将光标移动到末尾
        // 将光标设置到 messageInput 的末尾
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        triggerInputEvent(messageInput)
        reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }
      })
      // 为头像和标题创建容器
      const headerContainer = document.createElement('div')
      headerContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 2px;
      `
      // 在容器中添加头像和标题
      headerContainer.appendChild(imgNode)
      headerContainer.appendChild(headerNode)
      headerContainer.appendChild(closeBtn)

      // 将容器添加到主div中
      divNode.appendChild(headerContainer)
      // 将div标签节点插入到光标位置
      range?.insertNode(divNode)
      // 将光标折叠到Range的末尾(true表示折叠到Range的开始位置,false表示折叠到Range的末尾)
      range?.collapse(false)
      // 创建一个span节点作为空格
      const spaceNode = document.createElement('span')
      spaceNode.textContent = '\u00A0'
      // 设置不可编辑
      spaceNode.contentEditable = 'false'
      // 不可以选中
      spaceNode.style.userSelect = 'none'
      // 插入一个br标签节点作为换行
      const brNode = document.createElement('br')
      // 将br标签节点插入到光标位置
      range?.insertNode(brNode)
      // 将空格节点插入到光标位置
      range?.insertNode(spaceNode)
      range?.collapse(false)
    } else {
      target.appendChild(dom)
    }
    // 将光标移到选中范围的最后面
    selection?.collapseToEnd()
  }

  /**
   * create a reply element
   */
  function createReplyDom(dom: { accountName: string; content: string; avatar: string }) {
    // 创建一个div标签节点
    const replyNode = document.createElement('div')
    replyNode.id = REPLY_NODE_ID // 设置id为replyDiv
    replyNode.contentEditable = 'false' // 设置为不可编辑
    replyNode.tabIndex = -1 // 防止被focus
    replyNode.style.cssText = `
      background-color: var(--reply-bg);
      font-size: 12px;
      padding: 4px 6px;
      width: fit-content;
      max-height: 86px;
      border-radius: 8px;
      margin-bottom: 2px;
      user-select: none;
      pointer-events: none; /* 防止鼠标事件 */
      cursor: default;
      outline: none; /* 移除focus时的轮廓 */
      `
    // 把dom中的value值作为回复信息的作者，dom中的content作为回复信息的内容
    const author = dom.accountName + '：'
    let content = dom.content
    // 创建一个img标签节点作为头像
    const imgNode = document.createElement('img')
    imgNode.src = AvatarUtils.getAvatarUrl(dom.avatar)
    imgNode.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      `
    // 创建一个div标签节点作为回复信息的头部
    const headerNode = document.createElement('div')
    headerNode.style.cssText = `
      line-height: 1.5;
      font-size: 12px;
      padding: 0 4px;
      color: rgba(19, 152, 127);
      cursor: default;
      user-select: none;
      pointer-events: none;
    `
    headerNode.appendChild(document.createTextNode(author))
    // 创建一个div标签节点包裹正文内容
    const contentNode = document.createElement('div')
    contentNode.style.cssText = `
      display: flex;
      justify-content: space-between;
      border-radius: 8px;
      padding: 2px;
      margin-top: 4px;
      min-width: 0;
    `
    let contentBox
    // 判断content内容是否是data:image/开头的数组
    if (Array.isArray(content)) {
      // 获取总共有多少张图片
      const imageCount = content.length
      // 获取第一个data:image/开头的图片
      content = content.find((item: string) => item.startsWith('data:image/'))
      reply.value.imgCount = imageCount
    }
    console.log(content)

    // todo: 暂时用http开头的图片判断，后续需要优化
    if (content.startsWith('http')) {
      // 再创建一个img标签节点，并设置src属性为base64编码的图片
      contentBox = document.createElement('img')
      contentBox.src = content
      contentBox.style.cssText = `
        max-width: 55px;
        max-height: 55px;
        border-radius: 4px;
        cursor: default;
        user-select: none;
        pointer-events: none;
      `
      // 将img标签节点插入到div标签节点中
      replyNode.appendChild(contentBox)
      // 把图片传入到reply的content属性中
      reply.value.content = content
    } else {
      // 判断是否有@标签
      if (content.includes('id="aitSpan"')) {
        // 去掉content中的标签
        content = removeTag(content)
      }
      // 把正文放到span标签中，并设置span标签的样式
      contentBox = document.createElement('span')
      contentBox.style.cssText = `
      font-size: 12px;
      color: var(--text-color);
      cursor: default;
      width: fit-content;
      max-width: 350px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      user-select: none;
      pointer-events: none;
    `
      contentBox.appendChild(document.createTextNode(content))
    }
    // 在回复信息的右边添加一个关闭信息的按钮
    const closeBtn = document.createElement('span')
    closeBtn.id = 'closeBtn'
    closeBtn.style.cssText = `
      display: flex;
      align-items: center;
      font-size: 12px;
      color: #999;
      cursor: pointer;
      margin-left: 10px;
      flex-shrink: 0;
      user-select: none;
      pointer-events: auto; /* 确保关闭按钮可以点击 */
    `
    closeBtn.textContent = '关闭'
    closeBtn.addEventListener('click', () => {
      replyNode.remove()
      const messageInput = document.getElementById('message-input') as HTMLElement
      // 移除messageInput的最前面的空格节点，获取空格后面的内容
      messageInput.textContent = messageInput.textContent!.trim()
      // 创建并初始化 range 对象
      const range = document.createRange()
      range.selectNodeContents(messageInput)
      range.collapse(false) // 将光标移动到末尾
      // 将光标设置到 messageInput 的末尾
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
      triggerInputEvent(messageInput)
      reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }
    })
    // 为头像和标题创建容器
    const headerContainer = document.createElement('div')
    headerContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 2px;
      `
    // 在容器中添加头像和标题
    headerContainer.appendChild(imgNode)
    headerContainer.appendChild(headerNode)

    // 将容器添加到主div中
    replyNode.appendChild(headerContainer)
    replyNode.appendChild(contentNode)
    contentNode.appendChild(contentBox)
    contentNode.appendChild(closeBtn)
    return replyNode
  }

  /**
   * 处理图片粘贴事件
   * @param file 图片文件
   * @param dom 输入框dom
   */
  const imgPaste = (file: any, dom: HTMLElement) => {
    // 如果file是blob URL格式
    if (typeof file === 'string' && file.startsWith('blob:')) {
      const url = file.replace('blob:', '') // 移除blob:前缀
      console.log(url)

      const img = document.createElement('img')
      img.src = url
      img.style.maxHeight = '88px'
      img.style.maxWidth = '140px'
      img.style.marginRight = '6px'

      // 获取MsgInput组件暴露的lastEditRange
      const lastEditRange = (dom as any).getLastEditRange?.()

      // 确保dom获得焦点
      dom.focus()

      let range: Range
      if (!lastEditRange) {
        range = document.createRange()
        range.selectNodeContents(dom)
        range.collapse(false)
      } else {
        range = lastEditRange
      }

      const selection = window.getSelection()
      if (selection) {
        range.deleteContents()
        range.insertNode(img)
        range.setStartAfter(img)
        range.setEndAfter(img)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      triggerInputEvent(dom)
      return
    }

    // 原有的File对象处理逻辑
    const reader = new FileReader()
    reader.onload = (e: any) => {
      const img = document.createElement('img')
      img.src = e.target.result
      img.style.maxHeight = '88px'
      img.style.maxWidth = '140px'
      img.style.marginRight = '6px'

      // 获取MsgInput组件暴露的lastEditRange
      const lastEditRange = (dom as any).getLastEditRange?.()

      // 确保dom获得焦点
      dom.focus()

      let range: Range
      if (!lastEditRange) {
        range = document.createRange()
        range.selectNodeContents(dom)
        range.collapse(false)
      } else {
        range = lastEditRange
      }

      const selection = window.getSelection()
      if (selection) {
        range.deleteContents()
        range.insertNode(img)
        range.setStartAfter(img)
        range.setEndAfter(img)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      triggerInputEvent(dom)
    }
    //缓存文件
    saveCacheFile(file, 'img', dom)
    // 读取文件
    reader.readAsDataURL(file)
  }

  /**
   * 处理视频或者文件粘贴事件
   * @param file 文件
   * @param type 类型
   * @param dom 输入框dom
   */
  const FileOrVideoPaste = (file: File, type: MsgEnum, dom: HTMLElement) => {
    const reader = new FileReader()
    // 使用函数
    createFileOrVideoDom(file).then((imgTag) => {
      // 将生成的img标签插入到页面中
      insertNode(type, imgTag, dom)

      // 确保光标位置在插入的元素后面
      const selection = window.getSelection()
      const range = document.createRange()
      range.setStartAfter(imgTag as HTMLElement)
      range.setEndAfter(imgTag as HTMLElement)

      // 更新选区
      selection?.removeAllRanges()
      selection?.addRange(range)

      triggerInputEvent(dom)
    })
    nextTick(() => {}).then(() => {
      reader.readAsDataURL(file)
    })
  }

  /**
   * 处理粘贴事件
   * @param e 事件对象
   * @param dom 输入框dom
   */
  const handlePaste = (e: any, dom: HTMLElement) => {
    e.preventDefault()
    if (e.clipboardData.files.length > 0) {
      if (e.clipboardData.files.length > LimitEnum.COM_COUNT) {
        window.$message.warning(`一次性只能上传${LimitEnum.COM_COUNT}个文件或图片`)
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
          imgPaste(file, dom)
        } else if (fileType.startsWith('video/')) {
          // 处理视频粘贴
          FileOrVideoPaste(file, MsgEnum.VIDEO, dom)
        } else {
          // 处理文件粘贴
          FileOrVideoPaste(file, MsgEnum.FILE, dom)
        }
      }
    } else {
      // 如果没有文件，而是文本，处理纯文本粘贴
      const plainText = e.clipboardData.getData('text/plain')
      insertNode(MsgEnum.TEXT, plainText, dom)
      triggerInputEvent(dom)
    }
  }

  /** 计算字符长度 */
  const countGraphemes = (value: string) => {
    const splitter = new GraphemeSplitter()
    return splitter.countGraphemes(value)
  }

  /** 去除字符串中的元素标记
   *  不是html元素节点返回原字符串
   * */
  const removeTag = (fragment: string) => {
    const sanitizedFragment = DOMPurify.sanitize(fragment)
    return new DOMParser().parseFromString(sanitizedFragment, 'text/html').body.textContent || fragment
  }

  /**
   * 打开消息会话(右键发送消息功能)
   * @param uid 用户id
   * @param type
   */
  const openMsgSession = async (uid: string, type: number = 2) => {
    // 获取home窗口实例
    const label = await WebviewWindow.getCurrent().label
    if (route.name !== '/message' && label === 'home') {
      router.push('/message')
    }

    const res = await apis.sessionDetailWithFriends({ id: uid, roomType: type })
    // 把隐藏的会话先显示
    try {
      await apis.hideSession({ roomId: res.roomId, hide: false })
    } catch (error) {
      window.$message.error('显示会话失败')
    }
    globalStore.currentSession.roomId = res.roomId
    globalStore.currentSession.type = RoomTypeEnum.SINGLE

    // 先检查会话是否已存在
    const existingSession = chatStore.getSession(res.roomId)
    if (!existingSession) {
      // 只有当会话不存在时才更新会话列表顺序
      chatStore.updateSessionLastActiveTime(res.roomId, res)
      // 如果会话不存在，需要重新获取会话列表，但保持当前选中的会话
      await chatStore.getSessionList(true)
    }

    // 发送消息定位
    useMitt.emit(MittEnum.LOCATE_SESSION, { roomId: res.roomId })
    handleMsgClick(res as any)
    useMitt.emit(MittEnum.TO_SEND_MSG, { url: 'message' })
  }

  return {
    imgPaste,
    getEditorRange,
    getMessageContentType,
    insertNode,
    triggerInputEvent,
    handlePaste,
    removeTag,
    FileOrVideoPaste,
    countGraphemes,
    openMsgSession,
    insertNodeAtRange,
    reply,
    userUid
  }
}
