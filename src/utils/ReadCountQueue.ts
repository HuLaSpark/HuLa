import { useMitt } from '@/hooks/useMitt.ts'
import apis from '@/services/apis'
import type { MsgReadUnReadCountType } from '@/services/types'

const queue = new Set<number>()
let timer: number | null = null
let request: any = null

const onAddReadCountTask = ({ msgId }: { msgId: number }) => {
  queue.add(msgId)
}
const onRemoveReadCountTask = ({ msgId }: { msgId: number }) => {
  queue.delete(msgId)
}
const task = () => {
  // 10s 了上个请求还未完成就中断掉
  request?.abort()
  if (queue.size > 0) {
    // 开始新请求
    request = apis.getMsgReadCount({ msgIds: [...queue] })
    request.then((res: MsgReadUnReadCountType[]) => {
      const result = new Map<number, MsgReadUnReadCountType>()
      res.forEach((item) => result.set(item.msgId, item))
      useMitt.emit('onGetReadCount', result)
      request = null
    })
  }
}

export const initListener = () => {
  useMitt.on('onAddReadCountTask', onAddReadCountTask)
  useMitt.on('onRemoveReadCountTask', onRemoveReadCountTask)
  clearQueue()
}

export const clearListener = () => {
  useMitt.off('onAddReadCountTask', onAddReadCountTask)
  useMitt.off('onRemoveReadCountTask', onRemoveReadCountTask)
  timer && clearInterval(timer)
}

export const clearQueue = () => {
  queue.clear()
  timer && clearInterval(timer)
}

export const readCountQueue = () => {
  task()
  timer = setInterval(task, 10000) as any
}
