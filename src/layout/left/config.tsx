import { MittEnum, ModalEnum, PluginEnum } from '@/enums'
import { useLogin } from '@/hooks/useLogin.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { useSettingStore } from '@/stores/setting'
import * as ImRequestUtils from '@/utils/ImRequestUtils'

const { createWebviewWindow } = useWindow()
const settingStore = useSettingStore()
const { login } = storeToRefs(settingStore)
const { logout, resetLoginState } = useLogin()
/**
 * 这里的顶部的操作栏使用pinia写入了localstorage中
 */
/** 下半部分操作栏配置 */
const itemsBottom: OPT.L.Common[] = [
  {
    title: '邮件列表',
    shortTitle: '邮件',
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
    shortTitle: '文件',
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
    title: '收藏列表',
    shortTitle: '收藏',
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
      useMitt.emit(MittEnum.LEFT_MODAL_SHOW, {
        type: ModalEnum.CHECK_UPDATE
      })
    }
  },
  {
    label: '锁定屏幕',
    icon: 'lock',
    click: () => {
      useMitt.emit(MittEnum.LEFT_MODAL_SHOW, {
        type: ModalEnum.LOCK_SCREEN
      })
    }
  },
  {
    label: '设置',
    icon: 'settings',
    click: async () => {
      await createWebviewWindow('设置', 'settings', 840, 840)
    }
  },
  {
    label: '关于',
    icon: 'info',
    click: async () => {
      await createWebviewWindow('关于', 'about', 360, 480)
    }
  },
  {
    label: '退出账号',
    icon: 'power',
    click: async () => {
      try {
        // 1. 先调用后端退出接口
        await ImRequestUtils.logout({ autoLogin: login.value.autoLogin })
        // 2. 重置登录状态
        await resetLoginState()
        // 3. 最后调用登出方法(这会创建登录窗口)
        await logout()
      } catch (error) {
        console.error('退出登录失败:', error)
        window.$message.error('退出登录失败，请重试')
      }
    }
  }
])

/** 插件列表 */
const pluginsList = ref<STO.Plugins<PluginEnum>[]>([
  {
    url: 'dynamic',
    icon: 'fire',
    title: '动态列表',
    shortTitle: '动态',
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
    },
    miniShow: false
  },
  {
    icon: 'robot',
    iconAction: 'GPT',
    url: 'robot',
    title: 'ChatBot',
    shortTitle: 'ChatBot',
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
    },
    miniShow: false
  },
  {
    icon: 'Music',
    url: 'music',
    title: 'HuLa云音乐',
    shortTitle: '云音乐',
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
    },
    miniShow: false
  },
  {
    icon: 'UimSlack',
    url: 'collaboration',
    title: 'HuLa协作',
    shortTitle: '协作',
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
    },
    miniShow: false
  },
  {
    icon: 'vigo',
    url: 'collaboration',
    title: 'HuLa短视频',
    shortTitle: '短视频',
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
    },
    miniShow: false
  }
])

export { itemsBottom, moreList, pluginsList }
