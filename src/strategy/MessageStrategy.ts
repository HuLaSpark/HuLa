import { MessageStatusEnum, MsgEnum } from '@/enums'
import { MessageType } from '@/services/types.ts'
import { AppException } from '@/common/exception.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { Ref } from 'vue'
import { parseInnerText, useCommon } from '@/hooks/useCommon.ts'
import apis from '@/services/apis.ts'
import { BaseDirectory, readFile } from '@tauri-apps/plugin-fs'
import DOMPurify from 'dompurify'
import { BaseUserItem, useCachedStore } from '@/stores/cached.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'
import Database from '@tauri-apps/plugin-sql'
import { fetch } from '@tauri-apps/plugin-http'
import { File } from 'happy-dom'

const { reply, userUid } = useCommon()
const chatStore = useChatStore()
const cachedStore = useCachedStore()
const globalStore = useGlobalStore()
const db = ref<Database>()

interface MessageStrategy {
  send: (msgInput: Ref, messageInputDom: Ref) => any
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

  buildMessageBody(msg: any, reply: any): any {
    return {
      content: msg.content,
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

  abstract send(msgInput: Ref, messageInputDom: Ref): any

  getUpLoadUrl(file: File): any {
    file?.name
    //todo 实现文件上传
  }

  sendMsg(msgInput: Ref, messageInputDom: Ref, msg: any) {
    // 从消息内容中提取@用户的uid
    const atUidList = extractAtUserIds(msgInput.value, cachedStore.currentAtUsersList)

    // 创建临时消息ID
    const tempMsgId = Date.now()
    // 根据消息类型创建消息体
    const messageBody = {
      ...this.buildMessageBody(msg, reply),
      atUidList // 添加@用户列表
    }

    // 创建消息对象;
    const tempMsg = this.buildMessageType(tempMsgId, messageBody, globalStore, userUid)
    // 先添加到消息列表
    chatStore.pushMsg(tempMsg)

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
      .then(async (res) => {
        clearTimeout(statusTimer)
        // 更新消息状态为成功，同时更新消息ID和回复内容
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.SUCCESS,
          newMsgId: res.message.id,
          body: res.message.body // 更新消息体，包含服务器返回的回复内容
        })
        if (res.message.type === MsgEnum.TEXT) {
          await chatStore.pushMsg(res)
          // 保存到数据库
          await db.value?.execute(
            'INSERT INTO message (room_id, from_uid, content, reply_msg_id, status, gap_count, type, create_time, update_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [
              globalStore.currentSession.roomId,
              userUid.value,
              msg.content,
              msg.reply,
              0,
              0,
              msg.type,
              new Date().getTime(),
              new Date().getTime()
            ]
          )
        }
        // 发完消息就要刷新会话列表，
        //  FIXME 如果当前会话已经置顶了，可以不用刷新
        chatStore.updateSessionLastActiveTime(globalStore.currentSession.roomId)
      })
      .catch((e) => {
        clearTimeout(statusTimer)
        // 更新消息状态为失败
        chatStore.updateMsg({
          msgId: tempMsgId,
          status: MessageStatusEnum.FAILED
        })
        console.log(e)
        throw new AppException('消息发送失败')
      })

    // 清空输入框和回复信息
    resetInput(msgInput, messageInputDom)
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

  send(msgInput: Ref, messageInputDom: Ref): any {
    const replyValue = reply.value
    const msg = {
      type: this.msgType,
      content: this.removeTag(msgInput.value),
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
    this.sendMsg(msgInput, messageInputDom, msg)
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

  send(msgInput: Ref, messageInputDom: Ref): any {
    const replyValue = reply.value
    const path = parseInnerText(msgInput.value, 'temp-image')
    if (!path) {
      throw new AppException('文件不存在')
    }
    this.uploadFile(path)
      .then((data) => {
        console.log('data', data)
        const msg = {
          type: this.msgType,
          content: data,
          url: data,
          reply: replyValue.content
            ? {
                content: replyValue.content,
                key: replyValue.key
              }
            : undefined
        }
        console.log(msg)
        this.sendMsg(msgInput, messageInputDom, msg)
      })
      .catch((err) => {
        throw new AppException(err)
      })
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
    const uploadUrl = res.uploadUrl
    const downloadUrl = res.downloadUrl
    const file = await readFile(path, { baseDir: BaseDirectory.AppCache })
    console.log(file)
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(file)
        controller.close()
      }
    })
    await fetch(uploadUrl, {
      headers: { 'Content-Type': 'application/octet-stream' },
      method: 'PUT',
      body: stream,
      duplex: 'half'
    } as RequestInit)
    console.log('文件上传完成')
    return new Promise((resolve) => {
      resolve(downloadUrl)
    })
  }
}

/**
 * 处理文件消息
 */
class FileMessageStrategyImpl extends AbstractMessageStrategy {
  constructor() {
    super(MsgEnum.FILE)
  }

  send(msgInput: Ref, messageInputDom: Ref): any {
    const replyValue = reply.value
    const msg = {
      type: this.msgType,
      content: null,
      reply: replyValue.content
        ? {
            content: replyValue.content,
            key: replyValue.key
          }
        : undefined
    }
    this.sendMsg(msgInput, messageInputDom, msg)
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

  send(msgInput: Ref, messageInputDom: Ref): any {
    messageInputDom
    msgInput
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

/**
 * 从HTML内容中提取 @ 用户的uid
 * @param content HTML格式的消息内容
 * @param userList 用户列表
 * @returns 被 @ 用户的uid数组
 */
const extractAtUserIds = (content: string, userList: BaseUserItem[]): number[] => {
  const atUserIds: number[] = []

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

/** 重置输入框内容 */
export const resetInput = (msgInput: Ref, messageInputDom: Ref) => {
  try {
    msgInput.value = ''
    messageInputDom.value.innerHTML = ''
    reply.value = { avatar: '', imgCount: 0, accountName: '', content: '', key: 0 }
  } catch (error) {
    console.error('Error in resetInput:', error)
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
  [MsgEnum.REPLY]: unsupportedMessageStrategy,
  [MsgEnum.AI]: unsupportedMessageStrategy
}
