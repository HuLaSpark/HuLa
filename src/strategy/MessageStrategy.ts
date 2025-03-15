import { MessageStatusEnum, MsgEnum, UploadSceneEnum } from '@/enums'
import { MessageType } from '@/services/types.ts'
import { AppException } from '@/common/exception.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { Ref } from 'vue'
import { parseInnerText } from '@/hooks/useCommon.ts'
import apis from '@/services/apis.ts'
import { BaseDirectory, readFile } from '@tauri-apps/plugin-fs'
import DOMPurify from 'dompurify'

interface MessageStrategy {
  getMsg: (msgInputValue: string, replyValue: any, fileList?: File[]) => any
  buildMessageBody: (msg: any, reply: any) => any
  buildMessageType: (messageId: string, messageBody: any, globalStore: any, userUid: Ref<any>) => MessageType
  uploadFile: (path: string) => Promise<{ uploadUrl: string; downloadUrl: string }>
  doUpload: (path: string, uploadUrl: string) => Promise<void>
}

abstract class AbstractMessageStrategy implements MessageStrategy {
  public readonly msgType: MsgEnum

  constructor(msgType: MsgEnum) {
    this.msgType = msgType
  }

  buildMessageType(messageId: string, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
    const currentTime = new Date().getTime()
    return {
      fromUser: {
        uid: userUid.value || 0,
        username: useUserInfo(userUid.value)?.value?.name || '',
        avatar: useUserInfo(userUid.value)?.value?.avatar || '',
        locPlace: useUserInfo(userUid.value)?.value?.locPlace || ''
      },
      message: {
        id: messageId,
        roomId: globalStore.currentSession.roomId,
        sendTime: currentTime,
        status: MessageStatusEnum.PENDING,
        type: this.msgType,
        body: messageBody,
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
  }

  abstract buildMessageBody(msg: any, reply: any): any

  abstract getMsg(msgInputValue: string, replyValue: any, fileList?: File[]): any

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  uploadFile(_path: string): Promise<{ uploadUrl: string; downloadUrl: string }> {
    throw new AppException('该消息类型不支持文件上传')
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  doUpload(_path: string, _uploadUrl: string): Promise<void> {
    throw new AppException('该消息类型不支持文件上传')
  }

  getUpLoadUrl(file: File): any {
    file?.name
    //todo 实现文件上传
  }
}

/**
 * 处理文本消息
 */
class TextMessageStrategyImpl extends AbstractMessageStrategy {
  private domParser: DOMParser

  constructor() {
    super(MsgEnum.TEXT)
    this.domParser = new DOMParser()
  }

  getMsg(msgInputValue: string, replyValue: any, fileList?: File[]): any {
    fileList
    const msg = {
      type: this.msgType,
      content: this.removeTag(msgInputValue),
      reply: replyValue.content
        ? {
            content: replyValue.content,
            key: replyValue.key
          }
        : undefined
    }
    // 处理回复内容
    if (replyValue.content) {
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = DOMPurify.sanitize(msg.content)
      const replyDiv = tempDiv.querySelector('#replyDiv')
      if (replyDiv) {
        replyDiv.parentNode?.removeChild(replyDiv)
      }
      tempDiv.innerHTML = DOMPurify.sanitize(this.removeTag(tempDiv.innerHTML))
      tempDiv.innerHTML = tempDiv.innerHTML.replace(/^\s*&nbsp;/, '')
      msg.content = tempDiv.innerHTML
    }
    // 验证消息长度
    if (msg.content.length > 500) {
      throw new AppException('消息内容超过限制500，请分段发送')
    }
    return msg
  }

  buildMessageBody(msg: any, reply: any): any {
    return {
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
  }

  /** 去除字符串中的元素标记
   *  不是html元素节点返回原字符串
   * */
  private removeTag(message: string): string {
    return this.domParser.parseFromString(message, 'text/html').body.textContent || message
  }
}

/** 处理图片消息 */
class ImageMessageStrategyImpl extends AbstractMessageStrategy {
  private readonly MAX_UPLOAD_SIZE = 2 * 1024 * 1024 // 2MB in bytes
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

  constructor() {
    super(MsgEnum.IMAGE)
  }

  private async validateImage(file: File): Promise<File> {
    // 检查文件类型
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new AppException('仅支持 JPEG、PNG、WebP 格式的图片')
    }

    // 检查文件大小
    if (file.size > this.MAX_UPLOAD_SIZE) {
      throw new AppException('图片大小不能超过2MB')
    }

    return file
  }

  // 获取图片信息
  private getImageInfo(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const previewUrl = URL.createObjectURL(file)

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          previewUrl
        })
      }

      img.onerror = () => {
        URL.revokeObjectURL(previewUrl)
        reject(new AppException('图片加载失败'))
      }

      img.src = previewUrl
    })
  }

  private isImageUrl(url: string): boolean {
    // 检查是否是有效的URL
    try {
      new URL(url)
      // 检查是否以常见图片扩展名结尾
      return /\.(jpg|jpeg|png|webp|gif)$/i.test(url)
    } catch {
      return false
    }
  }

  // 获取表情图片信息
  private getRemoteImageInfo(url: string): Promise<{ width: number; height: number; size: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous' // 处理跨域问题

      img.onload = async () => {
        try {
          // 获取图片大小
          const response = await fetch(url, { method: 'HEAD' })
          const size = parseInt(response.headers.get('content-length') || '0')

          resolve({
            width: img.width,
            height: img.height,
            size: size
          })
        } catch (error) {
          // 如果无法获取大小，使用默认值
          resolve({
            width: img.width,
            height: img.height,
            size: 0
          })
        }
      }

      img.onerror = () => {
        reject(new AppException('图片加载失败'))
      }

      img.src = url
    })
  }

  async getMsg(msgInputValue: string, replyValue: any): Promise<any> {
    console.log('开始处理图片消息:', msgInputValue, replyValue)

    // 检查是否是图片URL
    if (this.isImageUrl(msgInputValue)) {
      try {
        // 获取远程图片信息
        const { width, height, size } = await this.getRemoteImageInfo(msgInputValue)

        return {
          type: this.msgType,
          url: msgInputValue, // 直接使用原始URL
          path: msgInputValue, // 为了保持一致性，也设置path
          imageInfo: {
            width,
            height,
            size
          },
          reply: replyValue.content
            ? {
                content: replyValue.content,
                key: replyValue.key
              }
            : undefined
        }
      } catch (error) {
        console.error('处理图片URL失败:', error)
        if (error instanceof AppException) {
          throw error
        }
        throw new AppException('图片预览失败')
      }
    }

    // 原有的本地图片处理逻辑
    const path = parseInnerText(msgInputValue, 'temp-image')
    if (!path) {
      throw new AppException('文件不存在')
    }

    // 标准化路径
    const normalizedPath = path.replace(/\\/g, '/')
    console.log('标准化路径:', normalizedPath)

    try {
      const fileData = await readFile(normalizedPath, { baseDir: BaseDirectory.AppCache })

      const fileName = path.split('/').pop() || 'image.png'
      const fileType = this.getFileType(fileName)

      // 创建文件对象
      const originalFile = new File([fileData], fileName, {
        type: fileType
      })

      // 验证图片
      await this.validateImage(originalFile)

      // 获取图片信息（宽度、高度）和预览URL
      const { width, height, previewUrl } = await this.getImageInfo(originalFile)

      return {
        type: this.msgType,
        path: normalizedPath, // 用于上传
        url: previewUrl, // 用于预览显示
        imageInfo: {
          width, // 原始图片宽度
          height, // 原始图片高度
          size: originalFile.size // 原始文件大小
        },
        reply: replyValue.content
          ? {
              content: replyValue.content,
              key: replyValue.key
            }
          : undefined
      }
    } catch (error) {
      console.error('处理图片失败:', error)
      if (error instanceof AppException) {
        throw error
      }
      throw new AppException('图片预览失败')
    }
  }

  // 根据文件名获取文件类型
  private getFileType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      default:
        return 'image/png' // 默认类型
    }
  }

  async uploadFile(path: string): Promise<{ uploadUrl: string; downloadUrl: string }> {
    // 如果是URL，直接返回相同的URL作为下载链接
    if (this.isImageUrl(path)) {
      return {
        uploadUrl: '', // 不需要上传URL
        downloadUrl: path // 直接使用原始URL
      }
    }

    // 原有的本地文件上传逻辑
    console.log('开始上传图片:', path)
    const fileName = path.split('/').pop()
    if (!fileName) {
      throw new AppException('文件解析出错')
    }

    try {
      const res = await apis.getUploadUrl({
        fileName: fileName,
        scene: UploadSceneEnum.CHAT
      })

      console.log('获取上传链接成功:', res)
      return res
    } catch (error) {
      console.error('获取上传链接失败:', error)
      throw new AppException('获取上传链接失败，请重试')
    }
  }

  // 执行实际的文件上传
  async doUpload(path: string, uploadUrl: string): Promise<void> {
    // 如果是URL，跳过上传
    if (this.isImageUrl(path)) {
      return
    }

    // 原有的上传逻辑
    console.log('执行文件上传:', path)
    try {
      const file = await readFile(path, { baseDir: BaseDirectory.AppCache })

      // 添加文件大小检查
      if (file.length > this.MAX_UPLOAD_SIZE) {
        throw new AppException('图片大小不能超过2MB')
      }

      const response = await fetch(uploadUrl, {
        headers: { 'Content-Type': 'application/octet-stream' },
        method: 'PUT',
        body: file,
        duplex: 'half'
      } as RequestInit)

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`)
      }
      console.log('文件上传成功')
    } catch (error) {
      console.error('文件上传失败:', error)
      if (error instanceof AppException) {
        throw error
      }
      throw new AppException('文件上传失败，请重试')
    }
  }

  buildMessageBody(msg: any, reply: any): any {
    return {
      url: msg.url,
      path: msg.path,
      width: msg.imageInfo.width,
      height: msg.imageInfo.height,
      size: msg.imageInfo.size,
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
  }
}

/**
 * 处理文件消息
 */
class FileMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.FILE)
  }

  getMsg(msgInputValue: string, replyValue: any, fileList?: File[]): any {
    fileList
    return {
      type: this.msgType,
      content: msgInputValue,
      reply: replyValue.content
        ? {
            content: replyValue.content,
            key: replyValue.key
          }
        : undefined
    }
  }

  buildMessageBody(msg: any, reply: any): any {
    msg
    reply
    throw new AppException('方法暂未实现')
  }

  buildMessageType(messageId: string, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
    console.log(messageId, messageBody, globalStore, userUid)
    throw new AppException('暂未实现该类型')
  }
}

/**
 * 处理表情包消息
 */
class EmojiMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.EMOJI)
  }

  getMsg(msgInputValue: string, replyValue: any): any {
    // 检查是否是URL
    if (!this.isValidEmojiUrl(msgInputValue)) {
      throw new AppException('无效的表情包URL')
    }

    return {
      type: this.msgType,
      url: msgInputValue,
      path: msgInputValue,
      reply: replyValue.content
        ? {
            content: replyValue.content,
            key: replyValue.key
          }
        : undefined
    }
  }

  buildMessageBody(msg: any, reply: any): any {
    return {
      url: msg.url,
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
  }

  // 验证是否是有效的表情包URL
  private isValidEmojiUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  // 表情包不需要实际上传，直接返回原始URL
  async uploadFile(path: string): Promise<{ uploadUrl: string; downloadUrl: string }> {
    console.log('表情包使用原始URL:', path)
    return {
      uploadUrl: '', // 不需要上传URL
      downloadUrl: path // 直接使用原始URL
    }
  }

  // 表情包不需要实际上传，此方法为空实现
  async doUpload(): Promise<void> {
    console.log('表情包无需上传，跳过上传步骤')
    return Promise.resolve()
  }
}

class UnsupportedMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.UNKNOWN)
  }

  getMsg(msgInputValue: string, replyValue: any, fileList?: File[]): any {
    replyValue
    msgInputValue
    fileList
    throw new AppException('暂不支持该类型消息')
  }

  buildMessageBody(msg: any, reply: any): any {
    msg
    reply
    throw new AppException('方法暂未实现')
  }

  buildMessageType(messageId: string, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
    messageId
    messageBody
    globalStore
    userUid
    throw new AppException('方法暂未实现')
  }
}

const textMessageStrategy = new TextMessageStrategyImpl()
const fileMessageStrategy = new FileMessageStrategyImpl()
const imageMessageStrategy = new ImageMessageStrategyImpl()
const emojiMessageStrategy = new EmojiMessageStrategyImpl()
const unsupportedMessageStrategy = new UnsupportedMessageStrategyImpl()

export const messageStrategyMap: Record<MsgEnum, MessageStrategy> = {
  [MsgEnum.FILE]: fileMessageStrategy,
  [MsgEnum.IMAGE]: imageMessageStrategy,
  [MsgEnum.TEXT]: textMessageStrategy,
  [MsgEnum.EMOJI]: emojiMessageStrategy,
  [MsgEnum.UNKNOWN]: unsupportedMessageStrategy,
  [MsgEnum.RECALL]: unsupportedMessageStrategy,
  [MsgEnum.VOICE]: unsupportedMessageStrategy,
  [MsgEnum.VIDEO]: unsupportedMessageStrategy,
  [MsgEnum.SYSTEM]: unsupportedMessageStrategy,
  [MsgEnum.MIXED]: unsupportedMessageStrategy,
  [MsgEnum.AIT]: unsupportedMessageStrategy,
  [MsgEnum.REPLY]: unsupportedMessageStrategy,
  [MsgEnum.AI]: unsupportedMessageStrategy
}
