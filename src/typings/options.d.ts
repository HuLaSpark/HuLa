/** 选项命名空间 */
declare namespace OPT {
  /** 主页左侧选项 */
  namespace L {
    /** 顶部的选项 */
    type Common = {
      url: string
      icon: string
      title?: string
      iconAction?: string
      badge?: number
      tip?: string
      size?: {
        width: number
        height: number
      }
      window?: {
        resizable: boolean
      }
    }

    /** 更多的选项 */
    type MoreList = {
      label: string
      icon: string
      click: () => void
    }

    /** 设置页面的侧边栏选项 */
    type SettingSide = {
      url: string
      label: string
      icon: string
    }
  }

  /** 右键菜单选项 */
  type RightMenu = {
    label: string
    icon: string
    click?: (...args: any[]) => void
  } | null

  /** 详情页选项 */
  type Details = {
    url: string
    title: string
    click: (...args: any[]) => void
  }

  /** 在线状态 */
  type Online = {
    url: string
    title: string
    bgColor?: string
  }
}
