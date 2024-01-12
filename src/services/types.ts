/**
 * 类型定义文件
 * 注意：请使用TSDoc规范进行注释，以便在使用时能够获得良好提示。
 * @see TSDoc规范https://tsdoc.org/
 **/
import { GlobalStatusEnum, RCodeEnum } from '@/enums'

/*响应请求体*/
export type Response = {
  code: RCodeEnum
  msg: string
  data: {
    records: any
    total: number
  }
  fail: boolean
  success: boolean
  version: string
}
/*分页搜索*/
export type parameter = {
  pageNum: number
  pageSize: number
  name: string
}
/*登录类型*/
export type login = {
  username: string
  password: string
}
/*记住我*/
export type Renew = {
  userName: string
  password: string
}
/*文章类型*/
export type article = {
  agree: number
  content: string
  coverUrl: string
  describes: string
  id: number
  name: string
  pbId: number
  score: number
  time: string
  user: string
  userIp: string
  userUrl: string
}
/*全局设置类型*/
export type globalSetting = {
  theme: {
    [key: string]: {
      status: boolean
    }
  }
  tags: {
    [key: string]: {
      item: string[]
      double: boolean
    }
  }
}
/*全局按钮类型*/
export type ButtonType = keyof typeof GlobalStatusEnum
