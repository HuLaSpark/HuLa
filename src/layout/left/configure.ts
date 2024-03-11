import { useWindow } from '@/hooks/useWindow.ts'

type TopActive = {
  url: string
  icon: string
  iconAction?: string
  badge?: number
}[]

type BottomActive = {
  title: string
  url: string
  label: string
  icon: string
  iconAction?: string
}[]

type MenuList = {
  label: string
  icon: string
  click: () => void
}[]
const { createWebviewWindow } = useWindow()
const itemsTop = ref<TopActive>([
  {
    url: 'message',
    icon: 'message',
    iconAction: 'message-action'
  },
  {
    url: 'friendsList',
    icon: 'avatar',
    iconAction: 'avatar-action'
  },
  {
    url: 'dynamic',
    icon: 'fire',
    iconAction: 'fire-action'
  }
])
const itemsBottom: BottomActive = [
  {
    title: '邮件',
    url: '/mail',
    label: 'mail',
    icon: 'mail',
    iconAction: 'mail-action'
  },
  {
    title: '文件管理器',
    url: '/folder',
    label: 'mail',
    icon: 'file',
    iconAction: 'file-action'
  },
  {
    title: '收藏',
    url: '/collection',
    label: 'mail',
    icon: 'collect',
    iconAction: 'collect-action'
  }
]
/* 设置列表菜单项 */
const menuList = ref<MenuList>([
  {
    label: '检查更新',
    icon: 'arrow-circle-up',
    click: () => {
      // todo 检查更新
      console.log('检查更新')
    }
  },
  {
    label: '设置',
    icon: 'settings',
    click: async () => {
      // todo 设置
      await createWebviewWindow('设置', 'settings', 840, 840)
    }
  },
  {
    label: '关于',
    icon: 'info',
    click: async () => {
      // todo 关于
      await createWebviewWindow('关于', 'about', 360, 480)
    }
  },
  {
    label: '退出账号',
    icon: 'power',
    click: async () => {
      // todo 退出账号 需要关闭其他的全部窗口
      // 1.需要退出账号
      await createWebviewWindow('登录', 'login', 320, 448, 'home', true, false, 320, 448)
    }
  }
])

export { itemsTop, itemsBottom, menuList }
