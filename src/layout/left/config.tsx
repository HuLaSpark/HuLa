import { useWindow } from '@/hooks/useWindow.ts'
import { MittEnum, ModalEnum, PluginEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { useLogin } from '@/hooks/useLogin.ts'

const { createWebviewWindow } = useWindow()
const { logout } = useLogin()
/**
 * 这里的顶部的操作栏使用pinia写入了localstorage中
 */
/** 下半部分操作栏配置 */
const itemsBottom: OPT.L.Common[] = [
  {
    title: '邮件',
    url: 'mail',
    icon: 'mail',
    iconAction: 'mail-action',
    size: {
      width: 840,
      height: 600
    },
    window: {
      resizable: true
    }
  },
  {
    title: '文件管理器',
    url: 'mail',
    icon: 'file',
    iconAction: 'file-action',
    size: {
      width: 840,
      height: 600
    },
    window: {
      resizable: true
    }
  },
  {
    title: '收藏',
    url: 'mail',
    icon: 'collect',
    iconAction: 'collect-action',
    size: {
      width: 840,
      height: 600
    },
    window: {
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

/** 插件列表 */
const pluginsList = ref<STO.Plugins<PluginEnum>[]>([
  {
    url: 'dynamic',
    icon: 'fire',
    title: '动态',
    iconAction: 'fire-action',
    state: PluginEnum.BUILTIN,
    isAdd: true,
    dot: false,
    progress: 0,
    size: {
      width: 840,
      height: 800
    },
    window: {
      resizable: false
    }
  },
  {
    icon: 'robot',
    iconAction: 'GPT',
    url: 'robot',
    title: 'ChatBot',
    tip: 'ChatBot新应用上线',
    state: PluginEnum.NOT_INSTALLED,
    version: 'v2.0.0-Beta',
    isAdd: false,
    dot: true,
    progress: 0,
    size: {
      minWidth: 780,
      width: 980,
      height: 800
    },
    window: {
      resizable: true
    }
  },
  {
    icon: 'Music',
    url: 'music',
    title: 'HuLa云音乐',
    tip: 'HuLa云音乐开发中，敬请期待',
    state: PluginEnum.NOT_INSTALLED,
    version: 'v1.0.0-Alpha',
    isAdd: false,
    dot: true,
    progress: 0,
    size: {
      minWidth: 780,
      width: 980,
      height: 800
    },
    window: {
      resizable: true
    }
  },
  {
    icon: 'UimSlack',
    url: 'collaboration',
    title: 'HuLa协作',
    tip: 'HuLa协作开发中，敬请期待',
    state: PluginEnum.NOT_INSTALLED,
    version: 'v1.0.0-Alpha',
    isAdd: false,
    dot: true,
    progress: 0,
    size: {
      minWidth: 780,
      width: 980,
      height: 800
    },
    window: {
      resizable: true
    }
  },
  {
    icon: 'vigo',
    url: 'collaboration',
    title: 'HuLa短视频',
    tip: 'HuLa短视频开发中，敬请期待',
    state: PluginEnum.NOT_INSTALLED,
    version: 'v1.0.0-Alpha',
    isAdd: false,
    dot: true,
    progress: 0,
    size: {
      minWidth: 780,
      width: 980,
      height: 800
    },
    window: {
      resizable: true
    }
  }
])

export { itemsBottom, moreList, pluginsList }
