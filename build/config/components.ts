const MOBILE_PLATFORMS = new Set(['android', 'ios'])

/** 标准化平台标识，确保比较逻辑一致 */
const normalizePlatform = (platform?: string) => {
  return platform?.trim().toLowerCase()
}

/** 判断是否为需要加载移动端组件的平台 */
export const isMobilePlatform = (platform?: string) => {
  return MOBILE_PLATFORMS.has(normalizePlatform(platform) ?? '')
}

/** 根据平台返回自动导入插件需要扫描的组件目录 */
export const getComponentsDirs = (platform?: string) => {
  if (isMobilePlatform(platform)) {
    return ['src/components/**', 'src/mobile/components/**']
  }
  return ['src/components/**']
}

/** 按平台选择对应的组件类型声明文件路径 */
export const getComponentsDtsPath = (platform?: string) => {
  return isMobilePlatform(platform) ? 'src/typings/components.mobile.d.ts' : 'src/typings/components.pc.d.ts'
}
