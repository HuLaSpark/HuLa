import { ref, onMounted, onUnmounted } from 'vue'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'

// 网络状态类型
export enum NetworkStrength {
  Strong = 'Strong',
  Weak = 'Weak',
  Offline = 'Offline'
}

// 网络状态接口
export interface NetworkStatus {
  is_online: boolean
  strength: NetworkStrength
  latency_ms: number
  last_check: number
}

/**
 * 网络状态监测钩子
 * 提供网络是否在线、网络强度、延迟等信息
 */
export function useNetworkStatus() {
  // 网络状态
  const isOnline = ref(true)
  // 网络强度
  const networkStrength = ref<NetworkStrength>(NetworkStrength.Strong)
  // 网络延迟（毫秒）
  const latencyMs = ref(0)
  // 上次检查时间
  const lastCheck = ref(0)
  // 网络是否为弱网
  const isWeakNetwork = ref(false)

  // 存储监听器清理函数
  let unlisten: (() => void) | null = null

  // 初始化网络状态
  const initNetworkStatus = async () => {
    try {
      const status = await invoke<NetworkStatus>('get_network_status')
      updateNetworkStatus(status)
    } catch (error) {
      console.error('获取网络状态失败:', error)
    }
  }

  // 手动检查网络状态
  const checkNetwork = async () => {
    try {
      const status = await invoke<NetworkStatus>('check_network')
      updateNetworkStatus(status)
      return status
    } catch (error) {
      console.error('检查网络状态失败:', error)
      return null
    }
  }

  // 更新网络状态
  const updateNetworkStatus = (status: NetworkStatus) => {
    isOnline.value = status.is_online
    networkStrength.value = status.strength
    latencyMs.value = status.latency_ms
    lastCheck.value = status.last_check
    isWeakNetwork.value = status.strength === NetworkStrength.Weak
  }

  onMounted(async () => {
    // 初始化网络状态
    await initNetworkStatus()

    // 监听网络状态变化事件
    unlisten = await listen<NetworkStatus>('network-status-changed', (event) => {
      updateNetworkStatus(event.payload)
    })
  })

  onUnmounted(() => {
    // 清理监听器
    if (unlisten) {
      unlisten()
    }
  })

  return {
    isOnline,
    networkStrength,
    latencyMs,
    lastCheck,
    isWeakNetwork,
    checkNetwork
  }
}
