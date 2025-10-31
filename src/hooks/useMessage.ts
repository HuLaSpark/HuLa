import { MittEnum, NotificationTypeEnum, RoomTypeEnum, SessionOperateEnum, UserType } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import type { SessionItem } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { exitGroup, notification, setSessionTop, shield } from '@/utils/ImRequestUtils'
import { invokeWithErrorHandler } from '../utils/TauriInvokeHandler'

const msgBoxShow = ref(false)
const shrinkStatus = ref(false)
export const useMessage = () => {
  const globalStore = useGlobalStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  const contactStore = useContactStore()
  const BOT_ALLOWED_MENU_INDEXES = new Set([0, 1, 2, 3])
  /** 监听独立窗口关闭事件 */
  watchEffect(() => {
    useMitt.on(MittEnum.SHRINK_WINDOW, async (event: any) => {
      shrinkStatus.value = event as boolean
    })
  })

  /** 处理点击选中消息 */
  const handleMsgClick = (item: SessionItem) => {
    msgBoxShow.value = true
    // 更新当前会话信息
    globalStore.updateCurrentSessionRoomId(item.roomId)
  }

  /**
   * 预加载聊天室
   * @param roomId
   */
  const preloadChatRoom = (roomId: string = '1') => {
    globalStore.updateCurrentSessionRoomId(roomId)
  }

  /**
   * 删除会话
   * @param roomId 会话信息
   */
  const handleMsgDelete = async (roomId: string) => {
    const currentSessions = chatStore.sessionList
    const currentIndex = currentSessions.findIndex((session) => session.roomId === roomId)

    // 检查是否是当前选中的会话
    const isCurrentSession = roomId === globalStore.currentSessionRoomId

    chatStore.removeSession(roomId)
    // TODO: 使用隐藏会话接口
    // const res = await apis.hideSession({ roomId, hide: true })
    await invokeWithErrorHandler('hide_contact_command', { data: { roomId, hide: true } })
    // console.log(res, roomId)

    // 如果不是当前选中的会话，直接返回
    if (!isCurrentSession) {
      return
    }

    const updatedSessions = chatStore.sessionList

    // 选择下一个或上一个会话
    const nextIndex = Math.min(currentIndex, updatedSessions.length - 1)
    const nextSession = updatedSessions[nextIndex]
    if (nextSession) {
      handleMsgClick(nextSession)
    }
  }

  /** 处理双击事件 */
  const handleMsgDblclick = (item: SessionItem) => {
    if (!chat.value.isDouble) return
    console.log(item)
  }

  const menuList = ref<OPT.RightMenu[]>([
    {
      label: (item: SessionItem) => (item.top ? '取消置顶' : '置顶'),
      icon: (item: SessionItem) => (item.top ? 'to-bottom' : 'to-top'),
      click: (item: SessionItem) => {
        setSessionTop({ roomId: item.roomId, top: !item.top })
          .then(() => {
            // 更新本地会话状态
            chatStore.updateSession(item.roomId, { top: !item.top })
            window.$message.success(item.top ? '已取消置顶' : '已置顶')
          })
          .catch(() => {
            window.$message.error(item.top ? '取消置顶失败' : '置顶失败')
          })
      }
    },
    {
      label: '复制账号',
      icon: 'copy',
      click: (item: any) => {
        navigator.clipboard.writeText(item.account)
        window.$message.success(`复制成功 ${item.account}`)
      }
    },
    {
      label: '标记未读',
      icon: 'message-unread'
    },
    {
      label: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.GROUP) {
          return '群消息设置'
        }

        return item.muteNotification === NotificationTypeEnum.RECEPTION ? '设置免打扰' : '取消免打扰'
      },
      icon: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.GROUP) {
          return 'peoples-two'
        }
        return item.muteNotification === NotificationTypeEnum.RECEPTION ? 'close-remind' : 'remind'
      },
      children: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.SINGLE) return null

        return [
          {
            label: '允许消息提醒',
            icon: !item.shield && item.muteNotification === NotificationTypeEnum.RECEPTION ? 'check-small' : '',
            click: async () => {
              // 如果当前是屏蔽状态，需要先取消屏蔽
              if (item.shield) {
                await shield({
                  roomId: item.roomId,
                  state: false
                })
                chatStore.updateSession(item.roomId, { shield: false })
              }
              await handleNotificationChange(item, NotificationTypeEnum.RECEPTION)
            }
          },
          {
            label: '接收消息但不提醒',
            icon: !item.shield && item.muteNotification === NotificationTypeEnum.NOT_DISTURB ? 'check-small' : '',
            click: async () => {
              // 如果当前是屏蔽状态，需要先取消屏蔽
              if (item.shield) {
                await shield({
                  roomId: item.roomId,
                  state: false
                })
                chatStore.updateSession(item.roomId, { shield: false })
              }
              await handleNotificationChange(item, NotificationTypeEnum.NOT_DISTURB)
            }
          },
          {
            label: '屏蔽群消息',
            icon: item.shield ? 'check-small' : '',
            click: async () => {
              await shield({
                roomId: item.roomId,
                state: !item.shield
              })

              // 更新本地会话状态
              chatStore.updateSession(item.roomId, {
                shield: !item.shield
              })

              window.$message.success(item.shield ? '已取消屏蔽' : '已屏蔽消息')
            }
          }
        ]
      },
      click: async (item: SessionItem) => {
        if (item.type === RoomTypeEnum.GROUP) return // 群聊不执行点击事件

        const newType =
          item.muteNotification === NotificationTypeEnum.RECEPTION
            ? NotificationTypeEnum.NOT_DISTURB
            : NotificationTypeEnum.RECEPTION

        await handleNotificationChange(item, newType)
      }
    }
  ])

  const specialMenuList = ref<OPT.RightMenu[]>([
    {
      label: (item: SessionItem) => (item.shield ? '取消屏蔽消息' : '屏蔽此人消息'),
      icon: (item: SessionItem) => (item.shield ? 'message-success' : 'people-unknown'),
      click: async (item: SessionItem) => {
        await shield({
          roomId: item.roomId,
          state: !item.shield
        })

        // 更新本地会话状态
        chatStore.updateSession(item.roomId, {
          shield: !item.shield
        })

        window.$message.success(item.shield ? '已取消屏蔽' : '已屏蔽消息')
      },
      // 只在单聊时显示
      visible: (item: SessionItem) => item.type === RoomTypeEnum.SINGLE
    },
    {
      label: '从消息列表中移除',
      icon: 'delete',
      click: async (item: SessionItem) => {
        await handleMsgDelete(item.roomId)
      }
    },
    {
      label: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.SINGLE) return '删除好友'
        if (item.operate === SessionOperateEnum.DISSOLUTION_GROUP) return '解散群聊'
        return '退出群聊'
      },
      icon: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.SINGLE) return 'forbid'
        if (item.operate === SessionOperateEnum.DISSOLUTION_GROUP) return 'logout'
        return 'logout'
      },
      click: async (item: SessionItem) => {
        console.log('删除好友或退出群聊执行')
        // 单聊：删除好友
        if (item.type === RoomTypeEnum.SINGLE) {
          await contactStore.onDeleteFriend(item.detailId)
          await handleMsgDelete(item.roomId)
          window.$message.success('已删除好友')
          return
        }

        // 群聊：检查是否是频道
        if (item.roomId === '1') {
          window.$message.warning(
            item.operate === SessionOperateEnum.DISSOLUTION_GROUP ? '无法解散频道' : '无法退出频道'
          )
          return
        }

        // 群聊：解散或退出
        await exitGroup({ roomId: item.roomId })
        await handleMsgDelete(item.roomId)
        window.$message.success(item.operate === SessionOperateEnum.DISSOLUTION_GROUP ? '已解散群聊' : '已退出群聊')
      },
      visible: (item: SessionItem) => {
        // 单聊：只在operate为DELETE_FRIEND时显示
        if (item.type === RoomTypeEnum.SINGLE) {
          return item.operate === SessionOperateEnum.DELETE_FRIEND
        }

        // 群聊：不显示频道选项
        if (item.roomId === '1') return false

        // 群聊：始终显示退出选项，如果是群主则显示解散选项
        return true
      }
    }
  ])

  // 添加通知设置变更处理函数
  const handleNotificationChange = async (item: SessionItem, newType: NotificationTypeEnum) => {
    await notification({
      roomId: item.roomId,
      type: newType
    })

    // 更新本地会话状态
    chatStore.updateSession(item.roomId, {
      muteNotification: newType
    })

    // 如果从免打扰切换到允许提醒，需要重新计算全局未读数
    if (item.muteNotification === NotificationTypeEnum.NOT_DISTURB && newType === NotificationTypeEnum.RECEPTION) {
      chatStore.updateTotalUnreadCount()
    }

    // 显示操作成功提示
    let message = ''
    switch (newType) {
      case NotificationTypeEnum.RECEPTION:
        message = '已允许消息提醒'
        break
      case NotificationTypeEnum.NOT_DISTURB:
        message = '已设置接收消息但不提醒'
        // 设置免打扰时也需要更新全局未读数，因为该会话的未读数将不再计入
        chatStore.updateTotalUnreadCount()
        break
    }
    window.$message.success(message)
  }

  const visibleMenu = (item: SessionItem) => {
    if (item.account === UserType.BOT) {
      return menuList.value.filter((_, index) => BOT_ALLOWED_MENU_INDEXES.has(index))
    }
    return menuList.value
  }

  const visibleSpecialMenu = (item: SessionItem) => {
    if (item.account === UserType.BOT) {
      return []
    }
    return specialMenuList.value
  }

  return {
    msgBoxShow,
    handleMsgClick,
    handleMsgDelete,
    handleMsgDblclick,
    menuList,
    specialMenuList,
    visibleMenu,
    visibleSpecialMenu,
    preloadChatRoom
  }
}
