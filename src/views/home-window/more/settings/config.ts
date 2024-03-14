/* 侧边栏选项 */
const sideOptions = ref<LO.SettingSide[]>([
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
    url: '/collection',
    label: '登录设置',
    icon: 'settings'
  }
])

export { sideOptions }
