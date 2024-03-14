/* 主页左侧选项 */
declare namespace LO {
  /* 顶部的选项 */
  type Top = {
    url: string
    icon: string
    iconAction?: string
    badge?: number
  }

  /* 底部的选项 */
  type Bottom = {
    title: string
    url: string
    label: string
    icon: string
    iconAction?: string
  }

  /* 更多的选项 */
  type MoreList = {
    label: string
    icon: string
    click: () => void
  }

  /* 设置页面的侧边栏选项 */
  type SettingSide = {
    url: string
    label: string
    icon: string
  }
}
