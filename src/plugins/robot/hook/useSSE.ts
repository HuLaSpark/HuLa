import { ref, onUnmounted } from 'vue'
import { EventSourcePolyfill } from 'event-source-polyfill'
export function useSSE(url: string) {
  const message = ref<string | null>(null)
  const error = ref<Error | null>(null)
  const isConnected = ref<boolean>(false)
  let eventSource: EventSource | null = null

  const connect = () => {
    if (eventSource) {
      eventSource.close()
    }

    eventSource = new EventSourcePolyfill(url, {
      withCredentials: false,
      headers: {
        Authorization: `Bearer ${localStorage.getItem('TOKEN')}`
      }
    })

    eventSource.onopen = () => {
      isConnected.value = true
      console.log('SSE connected')
    }

    eventSource.onmessage = (event) => {
      message.value = event.data
      console.log('SSE message.value :', event.data)
      // 你可以在这里处理不同类型的消息
    }

    eventSource.onerror = (err) => {
      error.value = new Error('SSE connection error')
      console.error('SSE error:', err)
      eventSource?.close()
      isConnected.value = false
    }
  }

  const disconnect = () => {
    if (eventSource) {
      eventSource.close()
      eventSource = null
      isConnected.value = false
    }
  }

  // 在组件卸载时关闭 SSE
  onUnmounted(() => {
    disconnect()
  })

  return {
    message,
    error,
    isConnected,
    connect,
    disconnect
  }
}
