import { MsgEnum } from '@/enums'

/**
 * 指示应从多选流中排除哪些消息类型
 */
export const MULTI_SELECT_BLOCKED_TYPES = new Set<MsgEnum>([MsgEnum.NOTICE, MsgEnum.BOT, MsgEnum.RECALL])

export const isMessageMultiSelectEnabled = (type: MsgEnum | number): boolean => {
  return !MULTI_SELECT_BLOCKED_TYPES.has(type as MsgEnum)
}
