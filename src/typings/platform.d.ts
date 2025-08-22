import type { OSType, PlatformType } from '@/utils/PlatformConstants'

declare module 'vue' {
  interface ComponentCustomProperties {
    $platform: {
      osType: OSType
      platformType: PlatformType
      isDesktop: () => boolean
      isMobile: () => boolean
      isWindows: () => boolean
      isMac: () => boolean
      isLinux: () => boolean
      isAndroid: () => boolean
      isIOS: () => boolean
      isCompatibility: () => boolean
    }
  }
}
