import { useCommon } from '@/hooks/useCommon.ts'
import { MittEnum, MsgEnum } from '@/enums'
import { MockItem } from '@/services/types.ts'
import Mitt from '@/utils/Bus.ts'

export const useChatMain = (activeItem: MockItem) => {
  const { removeTag } = useCommon()
  /* 选中的气泡消息 */
  const activeBubble = ref(-1)
  /*  当前登录的用户id */
  const userId = ref(10086)
  /* 提醒框标题 */
  const tips = ref()
  /* 是否显示删除信息的弹窗 */
  const modalShow = ref(false)
  /* 需要删除信息的下标 */
  const delIndex = ref(0)
  /* 悬浮的页脚 */
  const floatFooter = ref(false)
  /* 记录历史消息下标 */
  const historyIndex = ref(0)
  /* 新消息数 */
  const newMsgNum = ref(0)
  /* 计算出触发页脚后的历史消息下标 */
  const itemComputed = computed(() => {
    return items.value.filter((item) => item.accountId !== userId.value).length
  })

  /*! 模拟信息列表 */
  const items = ref(
    Array.from({ length: 5 }, (_, i) => ({
      value: `${i}安老师`,
      key: i,
      accountId: activeItem.accountId,
      avatar: activeItem.avatar,
      content: '123',
      type: MsgEnum.TEXT,
      reply: MsgEnum.REPLY
        ? {
            accountName: '',
            content: '',
            key: ''
          }
        : null
    }))
  )

  /* 通用右键菜单 */
  const commonMenuList = ref<OPT.RightMenu[]>([
    {
      label: '转发',
      icon: 'share',
      click: () => {}
    },
    { label: '收藏', icon: 'collection-files' },
    {
      label: '回复',
      icon: 'reply',
      click: (item: any) => {
        Mitt.emit(MittEnum.REPLY_MEG, item)
      }
    }
  ])
  /* 右键消息菜单列表 */
  const menuList = ref<OPT.RightMenu[]>([
    {
      label: '复制',
      icon: 'copy',
      click: (item: any) => {
        const content = items.value[item.key].content
        handleCopy(content)
      }
    },
    ...commonMenuList.value
  ])
  /* 右键菜单下划线后的列表 */
  const specialMenuList = ref<OPT.RightMenu[]>([
    {
      label: '删除',
      icon: 'delete',
      click: (item: any) => {
        tips.value = '删除后将不会出现在你的消息记录中，确定删除吗?'
        modalShow.value = true
        delIndex.value = item.key
      }
    }
  ])
  /* 文件类型右键菜单 */
  const fileMenuList = ref<OPT.RightMenu[]>([
    {
      label: '预览',
      icon: 'preview-open',
      click: (item: any) => {
        const content = items.value[item.key].content
        handleCopy(content)
      }
    },
    ...commonMenuList.value,
    {
      label: '另存为',
      icon: 'download',
      click: (item: any) => {
        console.log(item)
      }
    }
  ])
  /* 图片类型右键菜单 */
  const imageMenuList = ref<OPT.RightMenu[]>([
    {
      label: '添加到表情',
      icon: 'add-expression',
      click: (item: any) => {
        console.log(item)
      }
    },
    {
      label: '复制',
      icon: 'copy',
      click: (item: any) => {
        console.log(items.value[item.key].content)
        const content = items.value[item.key].content
        handleCopy(content)
      }
    },
    ...commonMenuList.value,
    {
      label: '另存为',
      icon: 'download',
      click: (item: any) => {
        console.log(item)
      }
    }
  ])

  /**
   * 处理复制事件
   * @param content 复制的内容
   */
  const handleCopy = (content: string) => {
    // 如果是图片
    // TODO 文件类型的在右键菜单中不设置复制 (nyh -> 2024-04-14 01:14:56)
    if (content.includes('data:image')) {
      // 创建一个新的图片标签
      const img = new Image()
      img.src = content
      // 监听图片加载完成事件
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, img.width, img.height)
        // 将 base64 图片数据复制到剪贴板
        canvas.toBlob((blob) => {
          const item = new ClipboardItem({ 'image/png': blob! })
          navigator.clipboard.write([item])
        })
      }
    } else {
      // 如果是纯文本
      navigator.clipboard.writeText(removeTag(content))
    }
  }

  /* 处理滚动事件(用于页脚显示功能) */
  const handleScroll = (e: Event) => {
    const target = e.target as HTMLElement
    // 获取已滚动的距离，即从顶部到当前滚动位置的距离
    const scrollTop = target.scrollTop
    // 获取整个滚动容器的高度
    const scrollHeight = target.scrollHeight
    // 获取容器的可视区域高度
    const clientHeight = target.clientHeight
    // 计算距离底部的距离
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    // 判断是否大于100
    if (distanceFromBottom > 100) {
      floatFooter.value = true
      // 更新历史消息下标
      historyIndex.value = itemComputed.value
    } else {
      floatFooter.value = false
      historyIndex.value = 0
      newMsgNum.value = 0
    }
  }

  /**
   * 根据消息类型获取右键菜单列表
   * @param type 消息类型
   */
  const handleItemType = (type: MsgEnum) => {
    return type === MsgEnum.IMAGE ? imageMenuList.value : type === MsgEnum.FILE ? fileMenuList.value : menuList.value
  }

  /* 删除信息事件 */
  const handleConfirm = () => {
    // 根据key找到items中对应的下标
    const index = items.value.findIndex((item) => item.key === delIndex.value)
    items.value.splice(index, 1)
    modalShow.value = false
  }

  /* 点击气泡消息时候监听用户是否按下ctrl+c来复制内容 */
  const handleMsgClick = (item: any) => {
    activeBubble.value = item.key
    // 启用键盘监听
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        const content = items.value[item.key].content
        handleCopy(content)
        // 取消监听键盘事件，以免多次绑定
        document.removeEventListener('keydown', handleKeyPress)
      }
    }
    // 绑定键盘事件到 document
    document.addEventListener('keydown', handleKeyPress)
  }

  return {
    handleScroll,
    handleMsgClick,
    handleConfirm,
    handleItemType,
    items,
    activeBubble,
    newMsgNum,
    floatFooter,
    historyIndex,
    tips,
    modalShow,
    userId,
    specialMenuList,
    itemComputed
  }
}
