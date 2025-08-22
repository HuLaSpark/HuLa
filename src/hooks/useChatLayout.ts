import { FOOTER_HEIGHT } from '@/common/constants'

/**
 * 聊天页面布局管理
 */
export const useChatLayout = () => {
  const footerHeight = ref(FOOTER_HEIGHT)

  const setFooterHeight = (height: number) => {
    footerHeight.value = height
  }

  return {
    footerHeight: readonly(footerHeight),
    setFooterHeight
  }
}

// 创建全局实例
const chatLayoutInstance = useChatLayout()

// 导出全局实例方法
export const useChatLayoutGlobal = () => chatLayoutInstance
