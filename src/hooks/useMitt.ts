import { onUnmounted } from 'vue'
import Mitt from '@/utils/Bus.ts'

export function useMitter(event: any, handler: any) {
  Mitt.on(event, handler)
  onUnmounted(() => {
    Mitt.off(event, handler)
  })
}

export { Mitt }
