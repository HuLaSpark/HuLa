import { imRequest } from '@/utils/ImRequestUtils'
import { ImUrlEnum } from '@/enums'
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
// 使用后端代理，不再需要 JSONP

// 坐标系转换（WGS84 -> GCJ-02）
export const transformCoordinates = async (lat: number, lng: number): Promise<TransformedCoordinate> => {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('坐标范围无效')
  try {
    const data = await imRequest<{ lat: number; lng: number }>({
      url: ImUrlEnum.MAP_COORD_TRANSLATE,
      params: { lat, lng }
    })
    return { lat: data.lat, lng: data.lng }
  } catch (_error) {
    return wgs84ToGcj02(lat, lng)
  }
}

// 逆地理编码（获取地址信息）
export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResult | null> => {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new Error('坐标范围无效')
  try {
    const data = await imRequest<ReverseGeocodeResult>({
      url: ImUrlEnum.MAP_REVERSE_GEOCODE,
      params: { lat, lng }
    })
    return data
  } catch (_error) {
    return null
  }
}

export const getStaticMap = async (lat: number, lng: number, width = 600, height = 400, zoom = 18): Promise<string> => {
  const data = await imRequest<{ dataUrl: string }>({
    url: ImUrlEnum.MAP_STATIC,
    params: { lat, lng, width, height, zoom }
  })
  return data.dataUrl || ''
}
