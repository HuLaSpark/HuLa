/**
 * 坐标转换工具类
 * 用于在不同坐标系之间进行转换
 */

// 坐标转换常量
const PI = Math.PI
const A = 6378245.0 // 长半轴
const EE = 0.006693421622965943 // 偏心率平方（保持JavaScript安全精度）

type Coordinate = {
  lat: number
  lng: number
}

/**
 * 判断坐标是否在中国境内
 * @param lat 纬度
 * @param lng 经度
 * @returns 是否在中国境内
 */
const isInChina = (lat: number, lng: number): boolean => {
  return lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55
}

/**
 * 计算偏移量
 * @param lat 纬度
 * @param lng 经度
 * @returns 偏移坐标
 */
const transformLat = (lat: number, lng: number): number => {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((lat / 12.0) * PI) + 320 * Math.sin((lat * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

const transformLng = (lat: number, lng: number): number => {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((lng / 12.0) * PI) + 300.0 * Math.sin((lng / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/**
 * WGS84转换为GCJ02(火星坐标系)
 * @param wgsLat WGS84纬度
 * @param wgsLng WGS84经度
 * @returns GCJ02坐标
 */
export const wgs84ToGcj02 = (wgsLat: number, wgsLng: number): Coordinate => {
  // 如果不在中国境内，直接返回原坐标
  if (!isInChina(wgsLat, wgsLng)) {
    return { lat: wgsLat, lng: wgsLng }
  }

  let dLat = transformLat(wgsLat - 35.0, wgsLng - 105.0)
  let dLng = transformLng(wgsLat - 35.0, wgsLng - 105.0)

  const radLat = (wgsLat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)

  return {
    lat: wgsLat + dLat,
    lng: wgsLng + dLng
  }
}

/**
 * GCJ02转换为BD09(百度坐标系)
 * @param gcjLat GCJ02纬度
 * @param gcjLng GCJ02经度
 * @returns BD09坐标
 */
export const gcj02ToBd09 = (gcjLat: number, gcjLng: number): Coordinate => {
  const z = Math.sqrt(gcjLng * gcjLng + gcjLat * gcjLat) + 0.00002 * Math.sin((gcjLat * PI * 3000.0) / 180.0)
  const theta = Math.atan2(gcjLat, gcjLng) + 0.000003 * Math.cos((gcjLng * PI * 3000.0) / 180.0)

  return {
    lat: z * Math.sin(theta) + 0.006,
    lng: z * Math.cos(theta) + 0.0065
  }
}

/**
 * BD09转换为GCJ02
 * @param bdLat BD09纬度
 * @param bdLng BD09经度
 * @returns GCJ02坐标
 */
export const bd09ToGcj02 = (bdLat: number, bdLng: number): Coordinate => {
  const x = bdLng - 0.0065
  const y = bdLat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * PI * 3000.0) / 180.0)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos((x * PI * 3000.0) / 180.0)

  return {
    lat: z * Math.sin(theta),
    lng: z * Math.cos(theta)
  }
}

/**
 * GCJ02转换为WGS84
 * @param gcjLat GCJ02纬度
 * @param gcjLng GCJ02经度
 * @returns WGS84坐标
 */
export const gcj02ToWgs84 = (gcjLat: number, gcjLng: number): Coordinate => {
  // 如果不在中国境内，直接返回原坐标
  if (!isInChina(gcjLat, gcjLng)) {
    return { lat: gcjLat, lng: gcjLng }
  }

  let dLat = transformLat(gcjLat - 35.0, gcjLng - 105.0)
  let dLng = transformLng(gcjLat - 35.0, gcjLng - 105.0)

  const radLat = (gcjLat / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)

  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)

  return {
    lat: gcjLat - dLat,
    lng: gcjLng - dLng
  }
}

/**
 * WGS84直接转换为BD09
 * @param wgsLat WGS84纬度
 * @param wgsLng WGS84经度
 * @returns BD09坐标
 */
export const wgs84ToBd09 = (wgsLat: number, wgsLng: number): Coordinate => {
  const gcj02 = wgs84ToGcj02(wgsLat, wgsLng)
  return gcj02ToBd09(gcj02.lat, gcj02.lng)
}

/**
 * BD09直接转换为WGS84
 * @param bdLat BD09纬度
 * @param bdLng BD09经度
 * @returns WGS84坐标
 */
export const bd09ToWgs84 = (bdLat: number, bdLng: number): Coordinate => {
  const gcj02 = bd09ToGcj02(bdLat, bdLng)
  return gcj02ToWgs84(gcj02.lat, gcj02.lng)
}

/**
 * 计算两个坐标点之间的距离（单位：米）
 * 使用Haversine公式
 * @param lat1 起点纬度
 * @param lng1 起点经度
 * @param lat2 终点纬度
 * @param lng2 终点经度
 * @returns 距离（米）
 */
export const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000 // 地球半径（米）
  const dLat = ((lat2 - lat1) * PI) / 180
  const dLng = ((lng2 - lng1) * PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * PI) / 180) * Math.cos((lat2 * PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 坐标转换入口函数
 * 自动选择最佳转换方案
 * @param lat 原始纬度
 * @param lng 原始经度
 * @param fromType 原始坐标系类型
 * @param toType 目标坐标系类型
 * @returns 转换后的坐标
 */
export const transformCoordinate = (
  lat: number,
  lng: number,
  fromType: 'WGS84' | 'GCJ02' | 'BD09' = 'WGS84',
  toType: 'WGS84' | 'GCJ02' | 'BD09' = 'GCJ02'
): Coordinate => {
  if (fromType === toType) {
    return { lat, lng }
  }

  switch (`${fromType}_TO_${toType}`) {
    case 'WGS84_TO_GCJ02':
      return wgs84ToGcj02(lat, lng)
    case 'WGS84_TO_BD09':
      return wgs84ToBd09(lat, lng)
    case 'GCJ02_TO_WGS84':
      return gcj02ToWgs84(lat, lng)
    case 'GCJ02_TO_BD09':
      return gcj02ToBd09(lat, lng)
    case 'BD09_TO_WGS84':
      return bd09ToWgs84(lat, lng)
    case 'BD09_TO_GCJ02':
      return bd09ToGcj02(lat, lng)
    default:
      console.warn(`不支持的坐标转换: ${fromType} -> ${toType}`)
      return { lat, lng }
  }
}
