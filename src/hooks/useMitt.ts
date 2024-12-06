import mitt from 'mitt'
import type { Emitter, Handler } from 'mitt'
import { MittEnum } from '@/enums'

const mittInstance: Emitter<any> = mitt()

export const useMitt = {
  on: (event: MittEnum | string, handler: Handler<any>) => {
    mittInstance.on(event, handler)
    onUnmounted(() => {
      mittInstance.off(event, handler)
    })
  },
  emit: (event: MittEnum | string, data?: any) => {
    mittInstance.emit(event, data)
  },
  off: (event: MittEnum | string, handler: Handler<any>) => {
    mittInstance.off(event, handler)
  }
}
