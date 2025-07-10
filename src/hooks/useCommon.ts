import { LimitEnum, MittEnum, MsgEnum, RoomTypeEnum } from '@/enums'
import { Ref } from 'vue'
import GraphemeSplitter from 'grapheme-splitter'
import router from '@/router'
import apis from '@/services/apis.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useMessage } from '@/hooks/useMessage.ts'
import { useUserStore } from '@/stores/user.ts'
import { getImageCache } from '@/utils/PathUtil.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { BaseDirectory, create, exists, mkdir } from '@tauri-apps/plugin-fs'
import { removeTag } from '@/utils/Formatting'

export interface SelectionRange {
  range: Range
  selection: Selection
}
const domParser = new DOMParser()

const REPLY_NODE_ID = 'replyDiv'

const saveCacheFile = async (file: any, subFolder: string): Promise<string> => {
  const { userUid } = useCommon()
  // TODO: 这里需要获取到需要发送的图片、文件的本地地址，如果不是本地地址，就需要先下载到本地cache文件夹里面
  const fileName = file.name === null ? 'test.png' : file.name
  const tempPath = getImageCache(subFolder, userUid.value!)
  const fullPath = tempPath + fileName

  console.log(`💾 开始保存缓存文件: ${fullPath}, 原始大小: ${file.size} bytes`)

  return new Promise((resolve, reject) => {
    const cacheReader = new FileReader()
    cacheReader.onload = async (e: any) => {
      try {
        const isExists = await exists(tempPath, { baseDir: BaseDirectory.AppCache })
        if (!isExists) {
          await mkdir(tempPath, { baseDir: BaseDirectory.AppCache, recursive: true })
        }
        const tempFile = await create(fullPath, { baseDir: BaseDirectory.AppCache })
        await tempFile.write(e.target.result)
        await tempFile.close()

        console.log(`✅ 缓存文件保存成功: ${fullPath}, 写入大小: ${e.target.result.byteLength} bytes`)
        resolve(fullPath)
      } catch (error) {
        reject(error)
      }
    }

    cacheReader.onerror = (error) => {
      reject(error)
    }

    cacheReader.readAsArrayBuffer(file)
  })
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
   * 判断 URL 是否安全
   * @param url URL 字符串
   * @returns 是否安全
   */
  const isSafeUrl = (url: string) => {
    // 只允许 http/https 协议，且不能包含 javascript: 或 data:
    return /^(https?:\/\/|\/)/.test(url) && !/^javascript:/i.test(url) && !/^data:/i.test(url)
  }

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
    let hasVoice = false

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
      } else if (element.tagName === 'DIV' && element.className === 'voice-message-placeholder') {
        hasVoice = true
      }
    }

    if (hasVoice) {
      return MsgEnum.VOICE
    } else if (hasFile) {
      return MsgEnum.FILE
    } else if (hasVideo) {
      return MsgEnum.VIDEO
    } else if (hasEmoji && !hasText && !hasImage) {
      // 如果只有表情包，没有其他文本或图片，则返回EMOJI类型
      return MsgEnum.EMOJI
    } else if ((hasText && hasImage) || (hasText && hasEmoji)) {
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
  const insertNodeAtRange = (type: MsgEnum, dom: any, _target: HTMLElement, sr: SelectionRange) => {
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
      // 获取消息输入框元素
      const inputElement = document.getElementById('message-input')
      if (!inputElement) return

      // 确保输入框获得焦点
      inputElement.focus()

      // 创建回复节点
      const replyNode = createReplyDom(dom)

      // 如果已经存在回复框，则替换它
      const preReplyNode = document.getElementById('replyDiv')
      if (preReplyNode) {
        preReplyNode.replaceWith(replyNode)
      } else {
        // 检查输入框是否有内容
        const hasChildNodes =
          inputElement.childNodes.length > 0 &&
          !(
            inputElement.childNodes.length === 1 &&
            inputElement.childNodes[0].nodeType === Node.TEXT_NODE &&
            !inputElement.childNodes[0].textContent?.trim()
          )
        // 插入回复节点
        inputElement.insertBefore(replyNode, inputElement.firstChild)

        // 如果输入框已有内容，需要确保光标位置正确
        if (hasChildNodes) {
          // 获取回复框后的第一个文本节点
          let nextNode = replyNode.nextSibling
          let position = 0

          // 将选择范围设置在回复框之后
          if (nextNode) {
            if (nextNode.nodeType === Node.TEXT_NODE) {
              position = 0 // 文本节点的开始位置
            } else {
              // 如果不是文本节点，找到下一个文本节点
              while (nextNode && nextNode.nodeType !== Node.TEXT_NODE) {
                nextNode = nextNode.nextSibling
              }
              if (!nextNode) {
                // 如果没有找到文本节点，创建一个
                nextNode = document.createTextNode(' ')
                inputElement.appendChild(nextNode)
              }
              position = 0
            }

            // 设置选区在回复框之后
            selection.removeAllRanges()
            const rangeAfter = document.createRange()
            rangeAfter.setStart(nextNode, position)
            rangeAfter.setEnd(nextNode, position)
            selection.addRange(rangeAfter)
          } else {
            // 没有后续节点，创建一个
            nextNode = document.createTextNode(' ')
            inputElement.appendChild(nextNode)

            // 设置选区在新创建的节点
            selection.removeAllRanges()
            const rangeAfter = document.createRange()
            rangeAfter.setStart(nextNode, 0)
            rangeAfter.setEnd(nextNode, 0)
            selection.addRange(rangeAfter)
          }
        } else {
          // 如果输入框没有内容，添加一个空格节点以便于后续编辑
          const spaceNode = document.createElement('span')
          spaceNode.textContent = '\u00A0'
          spaceNode.contentEditable = 'false'
          spaceNode.style.userSelect = 'none'

          // 在回复框后插入空格节点
          const afterRange = document.createRange()
          afterRange.selectNode(replyNode)
          afterRange.collapse(false) // 折叠到结束位置
          afterRange.insertNode(spaceNode)

          // 在空格节点后插入一个空的文本节点，便于光标定位
          const textNode = document.createTextNode('')
          afterRange.selectNode(spaceNode)
          afterRange.collapse(false)
          afterRange.insertNode(textNode)

          // 设置光标位置在文本节点处
          selection.removeAllRanges()
          const newRangeAfter = document.createRange()
          newRangeAfter.setStart(textNode, 0)
          newRangeAfter.setEnd(textNode, 0)
          selection.addRange(newRangeAfter)
        }
      }

      // 触发输入事件，确保UI更新
      triggerInputEvent(inputElement)
      return
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
      if (isSafeUrl(dom.avatar)) {
        imgNode.src = dom.avatar
      } else {
        // 设置为默认头像或空
        imgNode.src = 'avatar/001.png'
      }
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
        // 首先移除回复节点
        divNode.remove()

        // 获取消息输入框
        const messageInput = document.getElementById('message-input') as HTMLElement
        if (!messageInput) return

        // 确保输入框获得焦点
        messageInput.focus()

        // 完全清空reply状态
        reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }

        // 优化光标处理
        const selection = window.getSelection()
        if (selection) {
          const range = document.createRange()

          // 处理输入框内容，如果只有空格，则清空它
          if (messageInput.textContent && messageInput.textContent.trim() === '') {
            messageInput.textContent = ''
          }

          // 将光标移动到输入框的末尾
          range.selectNodeContents(messageInput)
          range.collapse(false) // 折叠到末尾

          selection.removeAllRanges()
          selection.addRange(range)

          // 触发输入事件以更新UI状态
          triggerInputEvent(messageInput)
        }
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
      range?.insertNode(dom)
      range?.collapse(false)
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
    const avatarUrl = AvatarUtils.getAvatarUrl(dom.avatar)
    if (isSafeUrl(avatarUrl)) {
      imgNode.src = avatarUrl
    } else {
      // 设置为默认头像或空
      imgNode.src = 'avatar/001.png'
    }
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
      // 首先移除回复节点
      replyNode.remove()

      // 获取消息输入框
      const messageInput = document.getElementById('message-input') as HTMLElement
      if (!messageInput) return

      // 确保输入框获得焦点
      messageInput.focus()

      // 完全清空reply状态
      reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }

      // 优化光标处理
      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()

        // 处理输入框内容，如果只有空格，则清空它
        if (messageInput.textContent && messageInput.textContent.trim() === '') {
          messageInput.textContent = ''
        }

        // 将光标移动到输入框的末尾
        range.selectNodeContents(messageInput)
        range.collapse(false) // 折叠到末尾

        selection.removeAllRanges()
        selection.addRange(range)

        // 触发输入事件以更新UI状态
        triggerInputEvent(messageInput)
      }
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
  const imgPaste = async (file: any, dom: HTMLElement) => {
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

    //缓存文件
    const cachePath = await saveCacheFile(file, 'img')

    // 原有的File对象处理逻辑
    const reader = new FileReader()
    reader.onload = (e: any) => {
      const img = document.createElement('img')
      img.src = e.target.result
      img.style.maxHeight = '88px'
      img.style.maxWidth = '140px'
      img.style.marginRight = '6px'
      // 设置ID，使用缓存路径作为ID，这样parseInnerText可以找到它
      img.id = 'temp-image'
      img.setAttribute('data-path', cachePath)

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
    // 读取文件
    reader.readAsDataURL(file)
  }

  /**
   * 处理视频或者文件粘贴事件
   * @param file 文件
   * @param type 类型
   * @param dom 输入框dom
   */
  const FileOrVideoPaste = async (file: File) => {
    const reader = new FileReader()
    if (file.size > 1024 * 1024 * 50) {
      window.$message.warning('文件大小不能超过50M，请重新选择')
      return
    }
    await saveCacheFile(file, 'video')
    reader.readAsDataURL(file)
  }

  /**
   * 处理确认的文件列表（来自弹窗）
   * @param files 文件列表
   * @param dom 输入框dom
   */
  const handleConfirmFiles = async (files: File[]) => {
    for (const file of files) {
      await FileOrVideoPaste(file)
    }
  }

  /**
   * 处理粘贴事件
   * @param e 事件对象
   * @param dom 输入框dom
   * @param showFileModal 显示文件弹窗的回调函数
   */
  const handlePaste = async (e: any, dom: HTMLElement, showFileModal?: (files: File[]) => void) => {
    e.preventDefault()
    if (e.clipboardData.files.length > 0) {
      // 使用通用文件处理函数
      await processFiles(Array.from(e.clipboardData.files), dom, showFileModal)
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

  /**
   * 通用文件处理函数
   * @param files 文件列表
   * @param dom 输入框DOM元素
   * @param showFileModal 显示文件弹窗的回调函数
   * @param resetCallback 重置回调函数（可选）
   */
  const processFiles = async (
    files: File[],
    dom: HTMLElement,
    showFileModal?: (files: File[]) => void,
    resetCallback?: () => void
  ) => {
    if (!files) return

    // 检查文件数量
    if (files.length > LimitEnum.COM_COUNT) {
      window.$message.warning(`一次性只能上传${LimitEnum.COM_COUNT}个文件或图片`)
      return
    }

    // 分类文件：图片 or 其他文件
    const imageFiles: File[] = []
    const otherFiles: File[] = []

    for (const file of files) {
      // 检查文件大小
      const fileSizeInMB = file.size / 1024 / 1024
      if (fileSizeInMB > 100) {
        window.$message.warning(`文件 ${file.name} 超过100MB`)
        continue
      }

      const fileType = file.type

      // 加上includes用于保底判断文件类型不是mime时的处理逻辑
      if (fileType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(fileType)) {
        imageFiles.push(file)
      } else {
        // 视频和其他文件通过弹窗处理
        otherFiles.push(file)
      }
    }

    // 处理图片文件（直接插入输入框）
    for (const file of imageFiles) {
      await imgPaste(file, dom)
    }

    // 处理其他文件（显示弹窗）
    if (otherFiles.length > 0 && showFileModal) {
      showFileModal(otherFiles)
    }

    // 执行重置回调
    resetCallback?.()
  }

  return {
    imgPaste,
    getEditorRange,
    getMessageContentType,
    insertNode,
    triggerInputEvent,
    handlePaste,
    FileOrVideoPaste,
    handleConfirmFiles,
    countGraphemes,
    openMsgSession,
    insertNodeAtRange,
    reply,
    userUid,
    processFiles,
    saveCacheFile
  }
}
