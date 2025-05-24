import { MessageStatusEnum, MsgEnum, UploadSceneEnum } from '@/enums'
import { MessageType } from '@/services/types.ts'
import { AppException } from '@/common/exception.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { Ref } from 'vue'
import { parseInnerText, useCommon } from '@/hooks/useCommon.ts'
import { BaseDirectory, readFile } from '@tauri-apps/plugin-fs'
import DOMPurify from 'dompurify'
import { useUpload, UploadProviderEnum, UploadOptions } from '@/hooks/useUpload'
import { getImageDimensions } from '@/utils/imageUtils'

interface MessageStrategy {
  getMsg: (msgInputValue: string, replyValue: any, fileList?: File[]) => any
  buildMessageBody: (msg: any, reply: any) => any
  buildMessageType: (messageId: string, messageBody: any, globalStore: any, userUid: Ref<any>) => MessageType
  uploadFile: (
    path: string,
    options?: { provider?: UploadProviderEnum }
  ) => Promise<{ uploadUrl: string; downloadUrl: string; config?: any }>
  doUpload: (path: string, uploadUrl: string, options?: any) => Promise<{ qiniuUrl?: string } | void>
}

/**
 * 消息策略抽象类，所有消息策略都必须实现这个接口
 */
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
        messageMarks: {}
      },
      sendTime: new Date(currentTime).toISOString(),
      loading: false
    }
  }

  abstract buildMessageBody(msg: any, reply: any): any

  abstract getMsg(msgInputValue: string, replyValue: any, fileList?: File[]): any

  uploadFile(
    path: string,
    options?: { provider?: UploadProviderEnum }
  ): Promise<{ uploadUrl: string; downloadUrl: string }> {
    console.log('Base uploadFile method called with:', path, options)
    throw new AppException('该消息类型不支持文件上传')
  }

  doUpload(path: string, uploadUrl: string, options?: any): Promise<{ qiniuUrl?: string } | void> {
    console.log('Base doUpload method called with:', path, uploadUrl, options)
    throw new AppException('该消息类型不支持文件上传')
  }
}

/**
 * 处理文本消息
 */
class TextMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.TEXT)
  }

  getMsg(msgInputValue: string, replyValue: any): any {
    const { removeTag } = useCommon()

    // 处理&nbsp;为空格
    let content = removeTag(msgInputValue)
    if (content && typeof content === 'string') {
      content = content.replace(/&nbsp;/g, ' ')
    }

    const msg = {
      type: this.msgType,
      content: content,
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
      tempDiv.innerHTML = DOMPurify.sanitize(removeTag(tempDiv.innerHTML))

      // 确保所有的&nbsp;都被替换为空格
      msg.content = tempDiv.innerHTML.replace(/&nbsp;/g, ' ')
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
}

/** 处理图片消息 */
class ImageMessageStrategyImpl extends AbstractMessageStrategy {
  // 最大上传文件大小 2MB
  private readonly MAX_UPLOAD_SIZE = 2 * 1024 * 1024
  // 支持的图片类型
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  private uploadHook = useUpload()

  constructor() {
    super(MsgEnum.IMAGE)
  }

  /**
   * 验证图片文件是否符合上传条件要求
   * @param file 图片文件
   * @returns 验证后的图片文件
   */
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

  /**
   * 获取图片信息(宽度、高度、预览地址)
   * @param file 图片文件
   * @returns 图片信息
   */
  private async getImageInfo(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
    try {
      const result = await getImageDimensions(file, { includePreviewUrl: true })
      return {
        width: result.width,
        height: result.height,
        previewUrl: result.previewUrl!
      }
    } catch (error) {
      throw new AppException('图片加载失败')
    }
  }

  /**
   * 检查是否是有效的图片URL
   * @param url 图片地址
   * @returns 是否是有效的图片URL
   */
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

  /**
   * 获取表情图片信息(宽度、高度、大小)
   * @param url 图片地址
   * @returns 图片信息
   */
  private async getRemoteImageInfo(url: string): Promise<{ width: number; height: number; size: number }> {
    try {
      const result = await getImageDimensions(url, { includeSize: true })
      return {
        width: result.width,
        height: result.height,
        size: result.size || 0
      }
    } catch (error) {
      throw new AppException('图片加载失败')
    }
  }

  /**
   * 处理图片消息
   * @param msgInputValue 图片消息内容
   * @param replyValue 回复消息
   * @param fileList 附件文件列表
   * @returns 处理后的消息
   */
  async getMsg(msgInputValue: string, replyValue: any, fileList?: File[]): Promise<any> {
    console.log('开始处理图片消息:', msgInputValue, replyValue, fileList?.length ? '有附件文件' : '无附件文件')

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
      const originalFile = new File([new Uint8Array(fileData)], fileName, {
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

  /**
   * 根据文件名获取文件类型
   * @param fileName 文件名
   * @returns 文件类型
   */
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

  /**
   * 上传文件
   * @param path 文件路径
   * @param options 上传选项
   * @returns 上传结果
   */
  async uploadFile(
    path: string,
    options?: { provider?: UploadProviderEnum }
  ): Promise<{ uploadUrl: string; downloadUrl: string; config?: any }> {
    // 如果是URL，直接返回相同的URL作为下载链接
    if (this.isImageUrl(path)) {
      return {
        uploadUrl: '', // 不需要上传URL
        downloadUrl: path // 直接使用原始URL
      }
    }

    // 使用useUpload hook获取上传和下载URL
    console.log('开始上传图片:', path)
    try {
      const uploadOptions: UploadOptions = {
        provider: options?.provider || UploadProviderEnum.QINIU,
        scene: UploadSceneEnum.CHAT
      }

      const result = await this.uploadHook.getUploadAndDownloadUrl(path, uploadOptions)
      return result
    } catch (error) {
      console.error('获取上传链接失败:', error)
      throw new AppException('获取上传链接失败，请重试')
    }
  }

  /**
   * 执行实际的文件上传
   * @param path 文件路径
   * @param uploadUrl 上传URL
   * @param options 上传选项
   * @returns 上传结果
   */
  async doUpload(path: string, uploadUrl: string, options?: any): Promise<{ qiniuUrl?: string } | void> {
    // 如果是URL，跳过上传
    if (this.isImageUrl(path)) {
      return
    }

    // 使用useUpload hook执行上传
    console.log('执行文件上传:', path)
    try {
      // enableDeduplication启用文件去重
      const result = await this.uploadHook.doUpload(path, uploadUrl, { ...options, enableDeduplication: true })
      // 如果是七牛云上传，返回qiniuUrl
      if (options?.provider === UploadProviderEnum.QINIU) {
        return { qiniuUrl: result as string }
      }
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
    messageId
    messageBody
    globalStore
    userUid
    throw new AppException('方法暂未实现')
  }
}

/**
 * 处理表情包消息
 */
class EmojiMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.EMOJI)
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

  // 表情包不需要实际上传，直接返回原始URL
  async uploadFile(
    path: string,
    options?: { provider?: UploadProviderEnum }
  ): Promise<{ uploadUrl: string; downloadUrl: string }> {
    console.log('表情包使用原始URL:', path, options)
    return {
      uploadUrl: '', // 不需要上传URL
      downloadUrl: path // 直接使用原始URL
    }
  }

  // 表情包不需要实际上传，此方法为空实现
  async doUpload(path?: string, uploadUrl?: string, options?: any): Promise<void> {
    console.log('表情包无需上传，跳过上传步骤', path, uploadUrl, options)
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
  [MsgEnum.NOTICE]: unsupportedMessageStrategy,
  [MsgEnum.MERGE]: unsupportedMessageStrategy,
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
