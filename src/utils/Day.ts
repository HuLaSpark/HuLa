import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekday from 'dayjs/plugin/weekday'
import 'dayjs/locale/zh-cn' // 导入中文语言包

// 将相对时间插件使用到 dayjs 中
dayjs.extend(relativeTime)
// 全局使用语言包
dayjs.locale('zh-cn')
// 设置一周起始位周一
dayjs.extend(weekday)
/** 相对时间(前) */
export const handRelativeTime = (time: string) => {
  return dayjs(time).fromNow()
}
