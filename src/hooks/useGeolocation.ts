import { transformCoordinates } from '@/services/mapApi'

type GeolocationState = {
  loading: boolean
  error: string | null
  position: GeolocationPosition | null
  permission: PermissionState | null
  precision: 'high' | 'low'
}

type GeolocationOptions = {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export const useGeolocation = () => {
  const state = ref<GeolocationState>({
    loading: false,
    error: null,
    position: null,
    permission: null,
    precision: 'high'
  })

  const isSupported = computed(() => 'geolocation' in navigator)
  const hasPermission = computed(() => state.value.permission === 'granted')
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)
  const currentPosition = computed(() => state.value.position)

  // 检查权限状态
  const checkPermission = async (): Promise<PermissionState> => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        state.value.permission = permission.state
        return permission.state
      } catch (error) {
        console.warn('检查地理位置权限失败:', error)
      }
    }
    return 'prompt'
  }

  // 获取当前位置
  const getCurrentPosition = async (options?: GeolocationOptions): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('浏览器不支持地理位置功能'))
        return
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: state.value.precision === 'high',
        timeout: 10000,
        maximumAge: 300000, // 5分钟缓存
        ...options
      }

      state.value.loading = true
      state.value.error = null

      navigator.geolocation.getCurrentPosition(
        (position) => {
          state.value.loading = false
          state.value.position = position
          resolve(position)
        },
        (error) => {
          state.value.loading = false
          let errorMessage = '获取位置失败'

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '位置权限被拒绝'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = '位置信息不可用'
              break
            case error.TIMEOUT:
              errorMessage = '获取位置超时'
              break
          }

          state.value.error = errorMessage
          reject(new Error(errorMessage))
        },
        defaultOptions
      )
    })
  }

  // 获取位置并转换坐标
  const getLocationWithTransform = async (options?: GeolocationOptions) => {
    const position = await getCurrentPosition(options)
    const { latitude, longitude } = position.coords

    // 转换坐标
    const transformed = await transformCoordinates(latitude, longitude)

    return {
      original: { lat: latitude, lng: longitude },
      transformed,
      position,
      address: '', // 后续可以通过逆地理编码获取
      precision: state.value.precision,
      timestamp: Date.now()
    }
  }

  // 清除错误状态
  const clearError = () => {
    state.value.error = null
  }

  return {
    // 状态
    state: state.value,
    isSupported,
    hasPermission,
    isLoading,
    error,
    currentPosition,

    // 方法
    checkPermission,
    getCurrentPosition,
    getLocationWithTransform,
    clearError
  }
}
