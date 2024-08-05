import { useWindow } from '@/hooks/useWindow.ts'
import { MittEnum, ModalEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { useLogin } from '@/hooks/useLogin.ts'

const { createWebviewWindow } = useWindow()
const { logout } = useLogin()
/**
 * 上半部分操作栏配置
 * @param url 路由地址
 * @param icon 图标
 * @param title 创建新窗口时的标题
 * @param iconAction 选择后的图标
 * @param badge 角标
 * @param tip 提示信息
 * @param size 窗口大小
 * @param window 窗口参数
 */
const itemsTop = ref<OPT.L.Common[]>([
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
    title: '动态',
    iconAction: 'fire-action2',
    size: {
      width: 840,
      height: 800
    },
    window: {
      isDrag: true,
      resizable: false
    }
  },
  {
    url: 'robot',
    icon: 'robot',
    title: 'GPT',
    iconAction: 'robot-action',
    tip: '机器人新功能在开发中',
    size: {
      width: 980,
      height: 800
    },
    window: {
      isDrag: false,
      resizable: true
    }
  }
])
/** 下半部分操作栏配置 */
const itemsBottom: OPT.L.Common[] = [
  {
    title: '邮件',
    url: 'mail',
    icon: 'mail',
    iconAction: 'mail-action2',
    size: {
      width: 840,
      height: 600
    },
    window: {
      isDrag: false,
      resizable: true
    }
  },
  {
    title: '文件管理器',
    url: 'mail',
    icon: 'file',
    iconAction: 'file-action2',
    size: {
      width: 840,
      height: 600
    },
    window: {
      isDrag: false,
      resizable: true
    }
  },
  {
    title: '收藏',
    url: 'mail',
    icon: 'collect',
    iconAction: 'heart',
    size: {
      width: 840,
      height: 600
    },
    window: {
      isDrag: false,
      resizable: true
    }
  }
]
/** 设置列表菜单项 */
const moreList = ref<OPT.L.MoreList[]>([
  {
    label: '检查更新',
    icon: 'arrow-circle-up',
    click: () => {
      Mitt.emit(MittEnum.LEFT_MODAL_SHOW, ModalEnum.CHECK_UPDATE)
    }
  },
  {
    label: '锁定屏幕',
    icon: 'lock',
    click: () => {
      Mitt.emit(MittEnum.LEFT_MODAL_SHOW, ModalEnum.LOCK_SCREEN)
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
      await logout()
    }
  }
])

export { itemsTop, itemsBottom, moreList }
