import { emit } from '@tauri-apps/api/event'
import { EventEnum, MittEnum, RoomTypeEnum, SessionOperateEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { SessionItem } from '@/services/types.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useTauriListener } from './useTauriListener'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import apis from '@/services/apis'
import { useContactStore } from '@/stores/contacts.ts'

const msgBoxShow = ref(false)
/** 独立窗口的集合 */
const aloneWin = ref(new Set())
const shrinkStatus = ref(false)
const itemRef = ref<SessionItem>()
export const useMessage = () => {
  const route = useRoute()
  const { pushListeners } = useTauriListener()
  const globalStore = useGlobalStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  const contactStore = useContactStore()
  /** 监听独立窗口关闭事件 */
  watchEffect(() => {
    useMitt.on(MittEnum.SHRINK_WINDOW, async (event: any) => {
      shrinkStatus.value = event as boolean
    })
  })

  /** 处理点击选中消息 */
  const handleMsgClick = (item: SessionItem) => {
    msgBoxShow.value = true
    globalStore.currentSession.roomId = item.roomId
    globalStore.currentSession.type = item.type
    const data = { msgBoxShow, item }
    useMitt.emit(MittEnum.MSG_BOX_SHOW, data)

    // 只有在消息页面且有未读消息时，才标记为已读
    if (route.path === '/message' && item.unreadCount > 0) {
      apis.markMsgRead({ roomId: item.roomId || '1' }).then(() => {
        chatStore.markSessionRead(item.roomId || '1')
        // 更新全局未读计数
        globalStore.updateGlobalUnreadCount()
      })
    }
  }

  /**
   * 删除会话
   * @param roomId 会话信息
   */
  const handleMsgDelete = async (roomId: string) => {
    const currentSessions = chatStore.sessionList
    const currentIndex = currentSessions.findIndex((session) => session.roomId === roomId)

    // 检查是否是当前选中的会话
    const isCurrentSession = roomId === globalStore.currentSession.roomId

    chatStore.removeContact(roomId)
    const res = await apis.deleteSession({ roomId })
    console.log(res, roomId)

    // 如果不是当前选中的会话，直接返回
    if (!isCurrentSession) {
      return
    }

    const updatedSessions = chatStore.sessionList

    // 如果没有会话就把右侧消息框关闭
    if (updatedSessions.length === 0) {
      useMitt.emit(MittEnum.MSG_BOX_SHOW, { item: -1 })
      return
    }

    // 选择下一个或上一个会话
    const nextIndex = Math.min(currentIndex, updatedSessions.length - 1)
    handleMsgClick(updatedSessions[nextIndex])
  }

  /** 处理双击事件 */
  const handleMsgDblclick = (item: SessionItem) => {
    if (!chat.value.isDouble) return
    console.log(item)

    // delay(async () => {
    //   await openAloneWin(item)
    // }, 300)
  }

  /** 打开独立窗口 */
  // const openAloneWin = async (item: SessionItem) => {
  //   itemRef.value = { ...item }
  //   if (globalStore.currentSession.roomId === item.roomId) {
  //     useMitt.emit(MittEnum.MSG_BOX_SHOW, { item: -1 })
  //     await listen('aloneWin', () => {
  //       emit('aloneData', { item: { ...item } })
  //     })
  //   }
  //   await createWebviewWindow(item.name, EventEnum.ALONE + item.roomId, 720, 800, '', true, 580)
  // }

  const menuList = ref<OPT.RightMenu[]>([
    {
      label: '置顶',
      icon: 'to-top',
      click: (item: SessionItem) => {
        apis
          .setSessionTop({ roomId: item.roomId, top: true })
          .then(() => {
            // 更新本地会话状态
            chatStore.updateSession(item.roomId, { top: true })
            window.$message.success('已置顶')
          })
          .catch(() => {
            window.$message.error('置顶失败')
          })
      },
      visible: (item: SessionItem) => !item.top
    },
    {
      label: '取消置顶',
      icon: 'to-bottom',
      click: (item: SessionItem) => {
        apis
          .setSessionTop({ roomId: item.roomId, top: false })
          .then(() => {
            // 更新本地会话状态
            chatStore.updateSession(item.roomId, { top: false })
            window.$message.success('已取消置顶')
          })
          .catch(() => {
            window.$message.error('取消置顶失败')
          })
      },
      visible: (item: SessionItem) => item.top
    },
    {
      label: '复制账号',
      icon: 'copy',
      click: (item: any) => {
        navigator.clipboard.writeText(item.id)
        window.$message.success(`复制成功${item.id}`)
      }
    },
    { label: '标记未读', icon: 'message-unread' },
    {
      label: '打开独立聊天窗口',
      icon: 'freezing-line-column',
      click: async (item: SessionItem) => {
        // TODO: 暂时下架独立窗口功能,但是功能代码还保留后用
        // await openAloneWin(item)
        console.log(item)
      }
    },
    { label: '设置免打扰', icon: 'close-remind' }
  ])

  const specialMenuList = ref<OPT.RightMenu[]>([
    {
      label: '从消息列表中移除',
      icon: 'delete',
      click: async (item: SessionItem) => {
        await handleMsgDelete(item.roomId)
      }
    },
    {
      label: '删除好友',
      icon: 'forbid',
      click: async (item: SessionItem) => {
        // 调用删除好友接口
        try {
          await contactStore.onDeleteContact(item.id)
          // 删除会话
          await handleMsgDelete(item.roomId)
          window.$message.success('已删除好友')
        } catch (error) {
          window.$message.error('删除好友失败')
        }
      },
      visible: (item: SessionItem) => {
        // 只在单聊且operate为DELETE_FRIEND时显示
        return item.type === RoomTypeEnum.SINGLE && item.operate === SessionOperateEnum.DELETE_FRIEND
      }
    },
    {
      label: '解散群聊',
      icon: 'delete',
      click: async (item: SessionItem) => {
        // 不允许解散频道(roomId === 1)
        if (item.roomId === '1') {
          window.$message.warning('无法解散频道')
          return
        }

        try {
          // 调用解散群聊的API
          // await apis.dismissGroup({ roomId: item.roomId })
          window.$message.success('已解散群聊')
          await handleMsgDelete(item.roomId)
        } catch (error) {
          window.$message.error('解散群聊失败')
        }
      },
      visible: (item: SessionItem) => {
        // 如果不是群聊，不显示
        if (item.type !== RoomTypeEnum.GROUP) return false
        // 如果是频道，不显示
        if (item.roomId === '1') return false
        // 只有群主才能看到解散群聊选项
        return item.operate === SessionOperateEnum.DISSOLUTION_GROUP
      }
    },
    {
      label: '退出群聊',
      icon: 'logout',
      click: async (item: SessionItem) => {
        // 不允许退出频道(roomId === 1)
        if (item.roomId === '1') {
          window.$message.warning('无法退出频道')
          return
        }

        try {
          await apis.exitGroup({ roomId: item.roomId })
          window.$message.success('已退出群聊')
          await handleMsgDelete(item.roomId)
        } catch (error) {
          window.$message.error('退出群聊失败')
        }
      },
      visible: (item: SessionItem) => {
        // 如果不是群聊，不显示
        if (item.type !== RoomTypeEnum.GROUP) return false
        // 如果是频道，不显示
        if (item.roomId === '1') return false
        // 如果是群主，不显示退出选项（群主应该看到解散群聊选项）
        return item.operate === SessionOperateEnum.EXIT_GROUP
      }
    }
  ])

  onMounted(async () => {
    const appWindow = WebviewWindow.getCurrent()
    await pushListeners([
      appWindow.listen(EventEnum.ALONE, () => {
        emit(EventEnum.ALONE + itemRef.value?.roomId, itemRef.value)
        if (aloneWin.value.has(EventEnum.ALONE + itemRef.value?.roomId)) return
        aloneWin.value.add(EventEnum.ALONE + itemRef.value?.roomId)
      }),
      appWindow.listen(EventEnum.WIN_CLOSE, (e) => {
        aloneWin.value.delete(e.payload)
      })
    ])
  })

  return { msgBoxShow, handleMsgClick, handleMsgDelete, handleMsgDblclick, menuList, specialMenuList }
}
