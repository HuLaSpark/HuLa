// TODO config文件做简单的操作配置，如果需求复杂就封装成hooks (nyh -> 2024-03-23 03:35:05)
/* 右键用户信息菜单(单聊的时候显示) */
const optionsList = ref([
  {
    label: '发送信息',
    icon: 'message-action',
    click: (item: any) => {
      console.log(item)
    }
  },
  {
    label: 'TA',
    icon: 'aite',
    click: () => {}
  },
  {
    label: '查看资料',
    icon: 'notes',
    click: () => {}
  },
  {
    label: '添加好友',
    icon: 'people-plus',
    click: () => {}
  }
])
/* 举报选项 */
const report = ref([
  {
    label: '举报',
    icon: 'caution',
    click: () => {}
  }
])

export { optionsList, report }
