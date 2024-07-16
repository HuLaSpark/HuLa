/** 侧边栏选项 */
const sideOptions = ref<OPT.L.SettingSide[]>([
  {
    url: '/general',
    label: '通用',
    icon: 'setting-config'
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
