import { MessageStatusEnum, MsgEnum } from '@/enums'
import { MessageType } from '@/services/types.ts'
import { AppException } from '@/common/exception.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { Ref } from 'vue'
import { parseInnerText } from '@/hooks/useCommon.ts'
import apis from '@/services/apis.ts'
import { BaseDirectory, open } from '@tauri-apps/plugin-fs'
import DOMPurify from 'dompurify'

interface MessageStrategy {
  getMsg: (msgInputValue: string, replyValue: any, fileList?: File[]) => any
  buildMessageBody: (msg: any, reply: any) => any
  buildMessageType: (messageId: number, messageBody: any, globalStore: any, userUid: Ref<any>) => MessageType
}

abstract class AbstractMessageStrategy implements MessageStrategy {
  public readonly msgType: MsgEnum

  constructor(msgType: MsgEnum) {
    this.msgType = msgType
  }

  buildMessageType(messageId: number, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
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

class ImageMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.IMAGE)
  }

  getMsg(msgInputValue: string, replyValue: any): any {
    const path = parseInnerText(msgInputValue, 'temp-image')
    if (!path) {
      throw new AppException('文件不存在')
    }
    console.log(path)
    let downloadUrl = ''
    this.uploadFile(path)
      .then((data) => {
        console.log('data', data)
        downloadUrl = data
      })
      .catch((err) => {
        throw new AppException(err)
      })

    return {
      type: this.msgType,
      content: downloadUrl,
      reply: replyValue.content
        ? {
            content: replyValue.content,
            key: replyValue.key
          }
        : undefined
    }
  }

  async uploadFile(path: string): Promise<any> {
    const fileName = path.split('/').pop()
    if (!fileName) {
      throw new AppException('文件解析出错')
    }
    const res = await apis.getUploadUrl({
      fileName: fileName,
      scene: 1
    })
    console.log(res)
    const uploadUrl = res.uploadUrl
    const downloadUrl = res.downloadUrl
    const file = await open(path, { read: true, write: false, baseDir: BaseDirectory.AppCache })
    const buf = new Uint8Array()
    await file.read(buf)
    await fetch(uploadUrl, {
      headers: { 'Content-Type': 'multipart/form-data' },
      method: 'PUT',
      body: new File([buf], fileName)
    })
    file.close()
    return new Promise((resolve) => {
      resolve(downloadUrl)
    })
  }
  buildMessageBody(msg: any, reply: any): any {
    msg
    reply
    throw new AppException('方法暂未实现')
  }

  buildMessageType(messageId: number, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
    return super.buildMessageType(messageId, messageBody, globalStore, userUid)
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

  buildMessageType(messageId: number, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
    console.log(messageId, messageBody, globalStore, userUid)
    throw new AppException('暂未实现该类型')
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

  buildMessageType(messageId: number, messageBody: any, globalStore: any, userUid: Ref<any>): MessageType {
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
const unsupportedMessageStrategy = new UnsupportedMessageStrategyImpl()
export const messageStrategyMap: Record<MsgEnum, MessageStrategy> = {
  [MsgEnum.FILE]: fileMessageStrategy,
  [MsgEnum.IMAGE]: imageMessageStrategy,
  [MsgEnum.TEXT]: textMessageStrategy,
  [MsgEnum.UNKNOWN]: unsupportedMessageStrategy,
  [MsgEnum.RECALL]: unsupportedMessageStrategy,
  [MsgEnum.VOICE]: unsupportedMessageStrategy,
  [MsgEnum.VIDEO]: unsupportedMessageStrategy,
  [MsgEnum.EMOJI]: unsupportedMessageStrategy,
  [MsgEnum.SYSTEM]: unsupportedMessageStrategy,
  [MsgEnum.MIXED]: unsupportedMessageStrategy,
  [MsgEnum.AIT]: unsupportedMessageStrategy,
  [MsgEnum.REPLY]: unsupportedMessageStrategy
}
