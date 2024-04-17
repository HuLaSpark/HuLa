import { MsgEnum } from '@/enums'
import { Ref } from 'vue'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'

/** 常用工具类 */
export const useCommon = () => {
  /** 获取当前光标选取的信息(需要判断是否为空) */

  const getEditorRange = () => {
    if (window.getSelection) {
      const selection = window.getSelection()
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
  const getMessageContentType = (messageInputDom: Ref) => {
    let hasText = false
    let hasImage = false
    let hasVideo = false
    let hasFile = false
    let hasReply = false

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
      } else if (element.id === 'replyDiv') {
        hasReply = true
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
    } else if (hasReply) {
      return MsgEnum.REPLY
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
   */
  const insertNode = (type: MsgEnum, dom: any) => {
    const { selection, range } = getEditorRange()!
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
      // 创建一个div标签节点
      const divNode = document.createElement('div')
      divNode.id = 'replyDiv' // 设置id为replyDiv
      divNode.contentEditable = 'false' // 设置为不可编辑
      // 设置div标签的样式，设置文本的长度为当前的最大宽度，超过后省略号显示
      divNode.style.cssText = `
        background-color: rgba(204, 204, 204, 0.4);
        font-size: 12px;
        padding: 4px 6px;
        width: fit-content;
        max-height: 86px;
        border-radius: 8px;
        margin-bottom: 2px;
        user-select: none;
        cursor: default;
      `
      // 把dom中的value值作为回复信息的作者，dom中的content作为回复信息的内容
      const author = dom.accountName + '：'
      const content = dom.content
      // 创建一个div标签节点作为回复信息的头部
      const headerNode = document.createElement('div')
      headerNode.style.cssText = `
        line-height: 1.5;
        font-size: 12px;
        margin-bottom: 2px;
        padding: 0 8px;
        color: rgba(19, 152, 127);
        border-left: 3px solid #ccc;
        cursor: default;
      `
      headerNode.appendChild(document.createTextNode(author))
      // 创建一个div标签节点包裹正文内容
      const contentNode = document.createElement('div')
      contentNode.style.cssText = `
        display: flex;
        justify-content: space-between;
        border-radius: 8px;
        padding: 2px;
        min-width: 0;
      `
      // 把正文放到span标签中，并设置span标签的样式
      const contentSpan = document.createElement('span')
      contentSpan.style.cssText = `
        font-size: 12px;
        color: #333;
        cursor: default;
        width: fit-content;
        max-width: 350px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `
      contentSpan.appendChild(document.createTextNode(content))
      // 在回复信息的右边添加一个关闭信息的按钮
      const closeBtn = document.createElement('span')
      closeBtn.style.cssText = `
        font-size: 12px;
        color: #999;
        cursor: pointer;
        margin-left: 10px;
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
      })
      // 将头部和正文节点插入到div标签节点中
      divNode.appendChild(headerNode)
      divNode.appendChild(contentNode)
      contentNode.appendChild(contentSpan)
      contentNode.appendChild(closeBtn)
      // 将div标签节点插入到光标位置
      range?.insertNode(divNode)
      // 将光标折叠到Range的末尾(true表示折叠到Range的开始位置,false表示折叠到Range的末尾)
      range?.collapse(false)
      const spaceNode = document.createTextNode('\u00A0')
      range?.insertNode(spaceNode)
      range?.collapse(false)
    } else {
      range?.insertNode(dom)
    }
    // 将光标移到选中范围的最后面
    selection?.collapseToEnd()
  }

  /**
   * 处理图片粘贴事件
   * @param file 图片文件
   * @param dom 输入框dom
   */
  const imgPaste = (file: any, dom: HTMLElement) => {
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
      triggerInputEvent(dom)
    }
    nextTick(() => {}).then(() => {
      reader.readAsDataURL(file)
    })
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
      insertNode(type, imgTag)
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
      insertNode(MsgEnum.TEXT, plainText)
      triggerInputEvent(dom)
    }
  }

  /* 去除字符串中的元素标记 */
  const removeTag = (fragment: any) => new DOMParser().parseFromString(fragment, 'text/html').body.textContent || ''

  return {
    imgPaste,
    getEditorRange,
    getMessageContentType,
    insertNode,
    triggerInputEvent,
    handlePaste,
    removeTag,
    FileOrVideoPaste
  }
}
