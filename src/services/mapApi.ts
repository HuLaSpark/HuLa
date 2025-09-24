import { wgs84ToGcj02 } from '@/utils/CoordinateTransform'

type TransformedCoordinate = {
  lat: number
  lng: number
}

type AddressComponent = {
  province: string
  city: string
  district: string
  street: string
  street_number: string
}

type ReverseGeocodeResult = {
  address: string
  formatted_addresses: {
    recommend: string
    rough: string
  }
  address_component: AddressComponent
  ad_info: {
    nation_code: string
    adcode: string
    city_code: string
  }
}

// JSONP回调函数存储
const jsonpCallbacks: { [key: string]: (data: any) => void } = {}

// 创建JSONP请求
const createJsonpRequest = (url: string, callbackName: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 创建script标签
    const script = document.createElement('script')
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('请求超时'))
    }, 10000)

    const cleanup = () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
      delete (window as any)[callbackName]
      delete jsonpCallbacks[callbackName]
      clearTimeout(timeoutId)
    }

    // 设置全局回调函数
    jsonpCallbacks[callbackName] = (data: any) => {
      cleanup()
      resolve(data)
    }
    ;(window as any)[callbackName] = jsonpCallbacks[callbackName]

    script.onerror = () => {
      cleanup()
      reject(new Error('脚本加载失败'))
    }

    script.src = `${url}&callback=${callbackName}`
    document.head.appendChild(script)
  })
}

// 坐标系转换（WGS84 -> GCJ-02）
export const transformCoordinates = async (lat: number, lng: number): Promise<TransformedCoordinate> => {
  // 验证坐标范围
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('坐标范围无效')
  }

  const callbackName = `coordTransform_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  const params = {
    locations: `${lat},${lng}`,
    type: '1', // GPS坐标(WGS84)
    key: import.meta.env.VITE_TENCENT_MAP_KEY || '',
    output: 'jsonp',
    from: '1', // 明确指定源坐标系为GPS
    to: '5' // 明确指定目标坐标系为GCJ02
  }

  try {
    const queryString = new URLSearchParams(params).toString()
    const url = `https://apis.map.qq.com/ws/coord/v1/translate?${queryString}`

    console.log('腾讯地图坐标转换API请求:', { url, params, callbackName })

    // 验证API密钥
    if (!params.key) {
      throw new Error('腾讯地图API密钥未配置')
    }

    const data = await createJsonpRequest(url, callbackName)

    console.log('腾讯地图API响应:', data)

    if (data.status !== 0) {
      const errorMsg = data.message || `状态码: ${data.status}`
      throw new Error(`API错误: ${data.status} - ${errorMsg}`)
    }

    const location = data.locations?.[0]
    if (!location) {
      throw new Error('转换结果为空')
    }

    // 验证返回的坐标
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      throw new Error('API返回的坐标格式无效')
    }

    const transformed = {
      lat: location.lat,
      lng: location.lng
    }

    console.debug('坐标转换成功:', { original: { lat, lng }, transformed })

    return transformed
  } catch (error) {
    console.warn('腾讯地图API坐标转换失败，使用本地算法转换:', error)

    // 降级方案：使用本地坐标转换算法
    const localTransformed = wgs84ToGcj02(lat, lng)
    return localTransformed
  }
}

// 逆地理编码（获取地址信息）
export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
  // 验证坐标范围
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('坐标范围无效')
  }

  const callbackName = `geocode_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  const params = {
    location: `${lat},${lng}`,
    key: import.meta.env.VITE_TENCENT_MAP_KEY || '',
    get_poi: '1',
    output: 'jsonp'
  }

  try {
    const queryString = new URLSearchParams(params as any).toString()
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?${queryString}`

    const data = await createJsonpRequest(url, callbackName)

    if (data.status !== 0) {
      throw new Error(`API错误: ${data.status} - ${data.message || '未知错误'}`)
    }

    return data.result
  } catch (error) {
    console.warn('腾讯地图API逆地理编码失败:', error)
    return null
  }
}
