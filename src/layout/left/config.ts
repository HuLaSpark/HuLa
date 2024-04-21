import { useWindow } from '@/hooks/useWindow.ts'
import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import { delay } from 'lodash-es'
import { invoke } from '@tauri-apps/api/tauri'

const { createWebviewWindow } = useWindow()
const itemsTop = ref<OPT.L.Top[]>([
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
const itemsBottom: OPT.L.Bottom[] = [
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
/** 设置列表菜单项 */
const moreList = ref<OPT.L.MoreList[]>([
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
      await createWebviewWindow('登录', 'login', 320, 448, 'home', true, false, 320, 448).then(() => {
        /** 给一点延迟，不然创建登录窗口后还没有来得及设置阴影和圆角效果 */
        delay(async () => {
          /** 如果图标在闪烁则先暂停闪烁 */
          await invoke('tray_blink', { isRun: false }).catch((error) => {
            console.error('暂停闪烁失败:', error)
          })
          /** 通知全部打开的窗口然后关闭 */
          await emit(EventEnum.LOGOUT)
          await emit('logout_success')
        }, 300)
      })
    }
  }
])

export { itemsTop, itemsBottom, moreList }
