import { useCommon } from '@/hooks/useCommon.ts'
import { MittEnum, MsgEnum, PowerEnum } from '@/enums'
import { MessageType, SessionItem } from '@/services/types.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useChatStore } from '@/stores/chat.ts'
import apis from '@/services/apis.ts'
import { useContactStore } from '@/stores/contacts'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global.ts'
import { isDiffNow } from '@/utils/ComputedTime.ts'
import { writeText } from '@tauri-apps/plugin-clipboard-manager'
import { translateText } from '@/services/translate'

export const useChatMain = (activeItem?: SessionItem) => {
  const { removeTag, openMsgSession, userUid } = useCommon()
  const globalStore = useGlobalStore()
  const chatStore = useChatStore()
  const userStore = useUserStore()?.userInfo
  // const userInfo = useUserStore()?.userInfo
  // const chatMessageList = computed(() => chatStore.chatMessageList)
  // const messageOptions = computed(() => chatStore.currentMessageOptions)
  /** 滚动条位置 */
  const scrollTop = ref(-1)
  /** 是否是超级管理员 */
  // const isAdmin = computed(() => userInfo?.power === PowerEnum.ADMIN)
  /** 选中的气泡消息 */
  const activeBubble = ref(-1)
  /** 提醒框标题 */
  const tips = ref()
  /** 是否显示删除信息的弹窗 */
  const modalShow = ref(false)
  /** 需要删除信息的下标 */
  const delIndex = ref(0)
  /** 悬浮的页脚 */
  const floatFooter = ref(false)
  /** 记录历史消息下标 */
  const historyIndex = ref(0)
  /** 当前点击的用户的key */
  const selectKey = ref()
  /** 计算出触发页脚后的历史消息下标 */
  const itemComputed = computed(() => {
    return items.value.filter((item) => item.accountId !== userUid.value).length
  })

  /**! 模拟信息列表 */
  const items = ref(
    Array.from({ length: 5 }, (_, i) => ({
      value: `${i}安老师`,
      key: i,
      accountId: activeItem?.roomId,
      avatar: activeItem?.avatar,
      content: '123',
      type: MsgEnum.TEXT,
      reply: MsgEnum.RECALL
        ? {
            accountName: '',
            content: '',
            key: ''
          }
        : null
    }))
  )

  /** 通用右键菜单 */
  const commonMenuList = ref<OPT.RightMenu[]>([
    {
      label: '转发',
      icon: 'share',
      click: () => {}
    },
    {
      label: '翻译',
      icon: 'translate',
      click: async (item: MessageType) => {
        const content = item.message.body.content
        const translatedText = await translateText(content, 'tencent')
        console.log('原文:', content)
        console.log('译文:', translatedText)
      }
    },
    { label: '收藏', icon: 'collection-files' },
    {
      label: '回复',
      icon: 'reply',
      click: (item: any) => {
        useMitt.emit(MittEnum.REPLY_MEG, item)
      }
    },
    {
      label: '撤回',
      icon: 'corner-down-left',
      click: async (item: MessageType) => {
        const res = (await apis.recallMsg({ roomId: 1, msgId: item.message.id })) as any
        if (res) {
          window.$message.error(res)
          return
        }
        chatStore.updateRecallStatus({
          recallUid: item.fromUser.uid,
          msgId: item.message.id,
          roomId: item.message.roomId
        })
      },
      visible: (item: MessageType) => {
        // 判断当前选择的信息的发送时间是否超过2分钟
        if (isDiffNow({ time: item.message.sendTime, unit: 'minute', diff: 2 })) return
        // 判断自己是否是发送者或者是否是管理员
        const isCurrentUser = item.fromUser.uid === userUid.value
        const isAdmin = userStore?.power === PowerEnum.ADMIN
        return isCurrentUser || isAdmin
      }
    }
  ])
  /** 右键消息菜单列表 */
  const menuList = ref<OPT.RightMenu[]>([
    {
      label: '复制',
      icon: 'copy',
      click: (item: MessageType) => {
        handleCopy(item.message.body.content)
      }
    },
    ...commonMenuList.value
  ])
  /** 右键菜单下划线后的列表 */
  const specialMenuList = ref<OPT.RightMenu[]>([
    {
      label: '删除',
      icon: 'delete',
      click: (item: any) => {
        tips.value = '删除后将不会出现在你的消息记录中，确定删除吗?'
        modalShow.value = true
        delIndex.value = item.message.id
      }
    }
  ])
  /** 文件类型右键菜单 */
  const fileMenuList = ref<OPT.RightMenu[]>([
    {
      label: '预览',
      icon: 'preview-open',
      click: (item: any) => {
        console.log(item)
      }
    },
    ...commonMenuList.value,
    {
      label: '另存为',
      icon: 'Importing',
      click: (item: any) => {
        console.log(item)
      }
    }
  ])
  /** 图片类型右键菜单 */
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
      click: async (item: any) => {
        const content = items.value[item.key].content
        await handleCopy(content)
      }
    },
    ...commonMenuList.value,
    {
      label: '另存为',
      icon: 'Importing',
      click: (item: any) => {
        console.log(item)
      }
    }
  ])
  /** 右键用户信息菜单(群聊的时候显示) */
  const optionsList = ref<OPT.RightMenu[]>([
    {
      label: '发送信息',
      icon: 'message-action',
      click: (item: any) => {
        openMsgSession(item.uid || item.fromUser.uid)
      },
      visible: (item: any) => checkFriendRelation(item.uid || item.fromUser.uid, 'friend')
    },
    {
      label: 'TA',
      icon: 'aite',
      click: (item: any) => {
        useMitt.emit(MittEnum.AT, item.uid || item.fromUser.uid)
      },
      visible: (item: any) => (item.uid ? item.uid !== userUid.value : item.fromUser.uid !== userUid.value)
    },
    {
      label: '查看资料',
      icon: 'notes',
      click: (item: any, type: string) => {
        // 如果是聊天框内的资料就使用的是消息的key，如果是群聊成员的资料就使用的是uid
        const uid = item.uid || item.message.id
        useMitt.emit(`${MittEnum.INFO_POPOVER}-${type}`, { uid: uid, type: type })
      }
    },
    {
      label: '修改群昵称',
      icon: 'edit',
      click: () => {},
      visible: (item: any) => (item.uid ? item.uid === userUid.value : item.fromUser.uid === userUid.value)
    },
    {
      label: '添加好友',
      icon: 'people-plus',
      click: (item: any) => {
        globalStore.addFriendModalInfo.show = true
        globalStore.addFriendModalInfo.uid = item.uid || item.fromUser.uid
      },
      visible: (item: any) => !checkFriendRelation(item.uid || item.fromUser.uid, 'all')
    }
  ])
  /** 举报选项 */
  const report = ref([
    {
      label: '举报',
      icon: 'caution',
      click: () => {}
    }
  ])
  /** emoji表情菜单 */
  const emojiList = ref([
    {
      label: '👍',
      title: '好赞'
    },
    {
      label: '😆',
      title: '开心'
    },
    {
      label: '🥳',
      title: '恭喜'
    },
    {
      label: '🤯',
      title: '惊呆了'
    }
  ])

  /**
   * 检查用户关系
   * @param uid 用户ID
   * @param type 检查类型: 'friend' - 仅好友, 'all' - 好友或自己
   */
  const checkFriendRelation = (uid: number, type: 'friend' | 'all' = 'all') => {
    const contactStore = useContactStore()
    const userStore = useUserStore()
    const myUid = userStore.userInfo.uid
    const isFriend = contactStore.contactsList.some((item) => item.uid === uid)
    return type === 'friend' ? isFriend && uid !== myUid : isFriend || uid === myUid
  }

  /**
   * 处理复制事件
   * @param content 复制的内容
   */
  const handleCopy = async (content: string) => {
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
      await writeText(removeTag(content))
    }
  }

  /**
   * 根据消息类型获取右键菜单列表
   * @param type 消息类型
   */
  const handleItemType = (type: MsgEnum) => {
    return type === MsgEnum.IMAGE ? imageMenuList.value : type === MsgEnum.FILE ? fileMenuList.value : menuList.value
  }

  /** 删除信息事件 */
  const handleConfirm = () => {
    chatStore.deleteMsg(delIndex.value)
    modalShow.value = false
  }

  /** 点击气泡消息时候监听用户是否按下ctrl+c来复制内容 */
  const handleMsgClick = (item: MessageType) => {
    activeBubble.value = item.message.id
    // 启用键盘监听
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        const content = items.value[item.message.id].content
        handleCopy(content)
        // 取消监听键盘事件，以免多次绑定
        document.removeEventListener('keydown', handleKeyPress)
      }
    }
    // 绑定键盘事件到 document
    document.addEventListener('keydown', handleKeyPress)
  }

  return {
    handleMsgClick,
    handleConfirm,
    handleItemType,
    items,
    activeBubble,
    floatFooter,
    historyIndex,
    tips,
    modalShow,
    specialMenuList,
    itemComputed,
    optionsList,
    report,
    selectKey,
    emojiList,
    commonMenuList,
    scrollTop
  }
}
