/** 侧边栏选项 */
const sideOptions = ref<OPT.L.SettingSide[]>([
  {
    url: '/general',
    label: '通用',
    icon: 'setting-config'
  },
  {
    url: '/remind',
    label: '消息通知',
    icon: 'remind'
  },
  {
    url: '/collection',
    label: '存储管理',
    icon: 'mini-sd-card'
  },
  {
    url: '/loginSetting',
    label: '登录设置',
    icon: 'settings'
  }
])

/** 发送按钮快捷键的选项 */
const sendOptions = [
  {
    label: '按 Enter 键发送消息',
    value: 'Enter'
  },
  {
    label: '按 Ctrl + Enter 键发送消息',
    value: 'Ctrl+Enter'
  }
]

export { sideOptions, sendOptions }
