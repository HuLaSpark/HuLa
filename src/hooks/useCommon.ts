import { LimitEnum, MsgEnum } from '@/enums'
import { Ref } from 'vue'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'
import { RegExp } from '@/utils/RegExp.ts'
import { setting } from '@/stores/setting.ts'

/** 常用工具类 */
export const useCommon = () => {
  const settingStore = setting()
  const { login } = storeToRefs(settingStore)
  /** 当前登录用户的uid */
  const userUid = computed(() => login.value.accountInfo.uid)
  /** 回复消息 */
  const reply = ref({
    accountName: '',
    content: '',
    key: 0,
    imgCount: 0
  })
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
      let content = dom.content
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
      let contentBox
      // 判断content内容是否是data:image/开头的数组
      if (Array.isArray(content)) {
        // 获取总共有多少张图片
        const imageCount = content.length
        // 获取第一个data:image/开头的图片
        content = content.find((item: string) => item.startsWith('data:image/'))
        reply.value.imgCount = imageCount
      }
      // 判断content内容开头是否是data:image/的是图片
      if (content.startsWith('data:image/')) {
        // 再创建一个img标签节点，并设置src属性为base64编码的图片
        contentBox = document.createElement('img')
        contentBox.src = content
        contentBox.style.cssText = `
          max-width: 55px;
          max-height: 55px;
          border-radius: 4px;
          cursor: default;
          user-select: none;
        `
        // 将img标签节点插入到div标签节点中
        divNode.appendChild(contentBox)
        // 把图片传入到reply的content属性中
        reply.value.content = content
      } else {
        // 判断是否有@标签
        if (content.includes('id="aitSpan"')) {
          // 去掉content中的标签
          content = removeTag(content)
        }
        const { hyperlinkRegex, foundHyperlinks } = RegExp.isHyperlink(content)
        // 判断是否包含超链接
        if (foundHyperlinks && foundHyperlinks.length > 0) {
          content.replace(hyperlinkRegex, (match: string) => {
            reply.value.content = match.startsWith('www.') ? 'https://' + match : match
          })
          // 去掉content中的标签
          content = removeTag(content)
        }
        // 把正文放到span标签中，并设置span标签的样式
        contentBox = document.createElement('span')
        contentBox.style.cssText = `
        font-size: 12px;
        color: #333;
        cursor: default;
        width: fit-content;
        max-width: 350px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
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
        reply.value = { imgCount: 0, accountName: '', content: '', key: 0 }
      })
      // 将头部和正文节点插入到div标签节点中
      divNode.appendChild(headerNode)
      divNode.appendChild(contentNode)
      contentNode.appendChild(contentBox)
      contentNode.appendChild(closeBtn)
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
      // 将空格节点插入到光标位置
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
      insertNode(MsgEnum.TEXT, plainText)
      triggerInputEvent(dom)
    }
  }

  /** 去除字符串中的元素标记 */
  const removeTag = (fragment: any) => new DOMParser().parseFromString(fragment, 'text/html').body.textContent || ''

  return {
    imgPaste,
    getEditorRange,
    getMessageContentType,
    insertNode,
    triggerInputEvent,
    handlePaste,
    removeTag,
    FileOrVideoPaste,
    reply,
    userUid
  }
}
