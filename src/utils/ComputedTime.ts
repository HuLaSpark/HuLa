import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import 'dayjs/locale/zh-cn' // 导入中文语言包
import type { Dayjs, OpUnitType, ConfigType } from 'dayjs'
import type { MessageType } from '@/services/types'

// 全局使用语言包
dayjs.locale('zh-cn')
// 设置一周起始位周一
dayjs.extend(weekday)
// 5 分钟 5 * 60 * 1000;
const intervalTime = 300000
// 计数上限 20 条，到达 20 重置
const computedCountMax = 20
// 计数
let computedCount = 0

// 时间格式化为相对文本，仿微信风格
const timeToStr = (time: number) => {
  const sendTime = dayjs(time)
  // 计算今天和消息的发送时间间隔多少天
  const gapDay = dayjs().endOf('day').diff(sendTime, 'day')
  // 消息与今天是否 7 天及以上了
  const isLastWeek = gapDay >= 7
  // 今天显示时分, 昨天的显示 `昨天 时分`, 今天往前一周内，显示`周几 时分`， 再前面显示日期 `年月日 时分`
  return gapDay < 2
    ? `${gapDay === 1 ? '昨天 ' : ''}${sendTime.format('HH:mm')}`
    : isLastWeek
      ? sendTime.format('YYYY-MM-DD HH:mm')
      : dayjs(sendTime).format('dddd HH:mm')
}

// 超过5分钟，或者超过20条消息，就添加展示时间
const checkTimeInterval = (cur: MessageType, pre: MessageType) => {
  // 如果有一个超过 5 分钟了或者计数达到 20 条了
  if ((pre && cur.message.sendTime - pre.message.sendTime > intervalTime) || computedCount >= computedCountMax) {
    // 重置计数
    computedCount = 0
    // 返回时间标记
    return { ...cur, timeBlock: timeToStr(cur.message.sendTime) }
  } else {
    // 时间间隔很短的就累计计数
    computedCount += 1
    return cur
  }
}

export const computedTimeBlock = (list: MessageType[], needFirst = true) => {
  if (!list || list.length === 0) return []
  // 是否需要保留 传入 list 第一个，如果是接口拉回来的消息列表就要保留，如果接收到新消息，需要拿当前消息列表最后一个拿来做时间间隔计算的话，就不需要保留第一个
  const temp = needFirst ? [list[0]] : []
  // 跳过第一个
  for (let index = 1, len = list.length; index < len; index++) {
    const item = list[index]
    // 上个聊天记录
    const preItem = list[index - 1]
    // 超过20分钟，或者超过50条评论，展示时间
    temp.push(checkTimeInterval(item, preItem))
  }
  return temp
}

/**
 * 消息时间戳格式化
 * @param timestamp 时间戳
 * @param isDetail 是否显示详细时间
 * @returns 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp: number, isDetail = false): string => {
  const now: Dayjs = dayjs()
  const date: Dayjs = dayjs(timestamp)
  // 计算今天和消息的发送时间间隔多少天
  const gapDay = dayjs().endOf('day').diff(date, 'day')
  // 消息与今天是否 7 天及以上了
  const isLastWeek = gapDay >= 7
  if (now.isSame(date, 'day')) {
    return date.format(`${isDetail ? 'HH:mm:ss' : 'HH:mm'}`)
  } else if (now.diff(date, 'year') >= 1) {
    return date.format(`${isDetail ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'}`)
  } else {
    if (isDetail) return date.format('MM-DD HH:mm:ss')
    return gapDay === 1 ? '昨天' : isLastWeek ? date.format('MM-DD') : dayjs(date).format('dddd')
  }
}

/**
 * 消息间隔判断
 * @param {ConfigType} time 输入时间
 * @param {OpUnitType} unit 间隔单位
 * @param {number} diff 间隔值
 * @returns boolean 输入时间是否间隔 now 间隔值以上。
 */
export const isDiffNow = ({ time, unit, diff }: { unit: OpUnitType; time: ConfigType; diff: number }): boolean => {
  return dayjs().diff(dayjs(time), unit) > diff
}

/**
 * 距离现在 10 分钟了
 * @param {ConfigType} time 输入时间
 * @returns boolean 输入时间是否间隔 now 间隔值以上。
 */
export const isDiffNow10Min = (time: ConfigType): boolean => {
  return isDiffNow({ time, unit: 'minute', diff: 10 })
}
