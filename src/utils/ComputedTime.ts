import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekday from 'dayjs/plugin/weekday'
import type { ConfigType, Dayjs, OpUnitType } from 'dayjs'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/en'
import { useI18nGlobal } from '@/services/i18n'

export const setDayjsLocale = (lang: string) => {
  const mapped = lang.toLowerCase().includes('zh') ? 'zh-cn' : 'en'
  dayjs.locale(mapped)
}

dayjs.extend(relativeTime)
dayjs.extend(weekday)
setDayjsLocale('zh-CN')

// 时间格式化为相对文本，仿微信风格
export const timeToStr = (time: number) => {
  const sendTime = dayjs(time)
  // 计算今天和消息的发送时间间隔多少天
  const gapDay = dayjs().endOf('day').diff(sendTime, 'day')
  // 消息与今天是否 7 天及以上了
  const isLastWeek = gapDay >= 7
  // 今天显示时分, 昨天的显示 `昨天 时分`, 今天往前一周内，显示`周几 时分`， 再前面显示日期 `年月日 时分`
  return gapDay < 2
    ? `${gapDay === 1 ? `${useI18nGlobal().t('menu.yesterday')} ` : ''}${sendTime.format('HH:mm')}`
    : isLastWeek
      ? sendTime.format('YYYY-MM-DD HH:mm')
      : dayjs(sendTime).format('dddd HH:mm')
}

/**
 * 消息时间戳格式化
 * @param timestamp 时间戳
 * @param isDetail 是否显示详细时间
 * @returns 格式化后的时间字符串
 */
export const formatTimestamp = (timestamp: number, isDetail = false): string => {
  timestamp = Number(timestamp)
  const now: Dayjs = dayjs()
  const date: Dayjs = dayjs(timestamp)
  // 计算今天和消息的发送时间间隔多少天
  const gapDay = dayjs().endOf('day').diff(date, 'day')
  // 消息与今天是否 7 天及以上了
  const isLastWeek = gapDay >= 7

  // 首先检查是否跨年
  if (now.year() !== date.year()) {
    return date.format(`${isDetail ? 'YYYY-MM-DD HH:mm:ss' : 'YYYY-MM-DD'}`)
  }

  // 其他情况保持不变
  if (now.isSame(date, 'day')) {
    return date.format(`${isDetail ? 'HH:mm:ss' : 'HH:mm'}`)
  } else {
    if (isDetail) return date.format('MM-DD HH:mm:ss')
    return gapDay === 1
      ? useI18nGlobal().t('menu.yesterday')
      : isLastWeek
        ? date.format('MM-DD')
        : dayjs(date).format('dddd')
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

/**
 * 格式化日期分组标签（用于聊天历史等场景）
 * @param timestamp 时间戳
 * @returns 格式化后的日期字符串（今天/昨天/MM-DD）
 */
export const formatDateGroupLabel = (timestamp: number): string => {
  const date = dayjs(timestamp)
  const now = dayjs()
  const i18n = useI18nGlobal()

  if (now.isSame(date, 'day')) {
    return i18n.t('menu.today')
  } else if (now.subtract(1, 'day').isSame(date, 'day')) {
    return i18n.t('menu.yesterday')
  } else {
    return date.format('MM-DD')
  }
}

/** 相对时间(前) */
export const handRelativeTime = (time: string) => {
  return dayjs(time).fromNow()
}

/** 获取指定日期的星期 */
export const getWeekday = (time: string) => {
  return dayjs(time).format('ddd')
}
