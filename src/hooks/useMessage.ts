import { MittEnum, NotificationTypeEnum, RoomTypeEnum, SessionOperateEnum, UserType } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import type { SessionItem } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useGroupStore } from '@/stores/group'
import { useUserStore } from '@/stores/user'
import { exitGroup, notification, setSessionTop, shield, markMsgRead } from '@/utils/ImRequestUtils'
import { invokeWithErrorHandler } from '../utils/TauriInvokeHandler'
import { useI18n } from 'vue-i18n'

const msgBoxShow = ref(false)
const shrinkStatus = ref(false)

// 模块级别注册事件监听，避免 hook 被多次调用时重复注册
let isShrinkListenerRegistered = false
const registerShrinkListener = () => {
  if (isShrinkListenerRegistered) return
  isShrinkListenerRegistered = true
  useMitt.on(MittEnum.SHRINK_WINDOW, async (event: any) => {
    shrinkStatus.value = event as boolean
  })
}

export const useMessage = () => {
  const { t } = useI18n()
  const globalStore = useGlobalStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  const contactStore = useContactStore()
  const groupStore = useGroupStore()
  const userStore = useUserStore()
  const BOT_ALLOWED_MENU_INDEXES = new Set([0, 1, 2, 3])

  // 确保监听器只注册一次
  registerShrinkListener()

  /**
   * 处理点击选中消息
   * 如果本地缓存中找不到自己，说明尚未同步服务端数据，此时强制刷新群成员信息。
   */
  const ensureGroupMembersSynced = async (roomId: string, sessionType: RoomTypeEnum) => {
    if (sessionType !== RoomTypeEnum.GROUP) return

    const currentUid = userStore.userInfo?.uid
    if (!currentUid) return

    const memberList = groupStore.getUserListByRoomId(roomId)
    const alreadyHasCurrentUser = memberList.some((member) => member.uid === currentUid)

    if (!alreadyHasCurrentUser) {
      await groupStore.getGroupUserList(roomId, true)
    }
  }

  const handleMsgClick = async (item: SessionItem) => {
    msgBoxShow.value = true
    // 更新当前会话信息
    globalStore.updateCurrentSessionRoomId(item.roomId)
    // 先更新会话，再根据是否存在自身成员做一次兜底刷新，防止批量切换账号后看到旧数据
    await ensureGroupMembersSynced(item.roomId, item.type)
    if (item.unreadCount && item.unreadCount > 0) {
      // 先清空本地未读标记（立即更新UI），再异步上报已读（不阻塞）
      chatStore.markSessionRead(item.roomId)
      markMsgRead(item.roomId).catch((err) => console.error('[useMessage] 已读上报失败:', err))
    }
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
      await handleMsgClick(nextSession)
    }
  }

  /** 处理双击事件 */
  const handleMsgDblclick = (item: SessionItem) => {
    if (!chat.value.isDouble) return
    console.log(item)
  }

  const menuList = ref<OPT.RightMenu[]>([
    {
      label: (item: SessionItem) => (item.top ? t('menu.unpin') : t('menu.pin')),
      icon: (item: SessionItem) => (item.top ? 'to-bottom' : 'to-top'),
      click: (item: SessionItem) => {
        setSessionTop({ roomId: item.roomId, top: !item.top })
          .then(() => {
            // 更新本地会话状态
            chatStore.updateSession(item.roomId, { top: !item.top })
            window.$message.success(
              item.top ? t('message.message_menu.unpin_success') : t('message.message_menu.pin_success')
            )
          })
          .catch(() => {
            window.$message.error(item.top ? t('message.message_menu.unpin_fail') : t('message.message_menu.pin_fail'))
          })
      }
    },
    {
      label: () => t('menu.copy_account'),
      icon: 'copy',
      click: (item: any) => {
        navigator.clipboard.writeText(item.account)
        window.$message.success(t('message.message_menu.copy_success', { account: item.account }))
      }
    },
    {
      label: () => t('menu.mark_unread'),
      icon: 'message-unread'
    },
    {
      label: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.GROUP) {
          return t('menu.group_message_setting')
        }

        return item.muteNotification === NotificationTypeEnum.RECEPTION
          ? t('menu.set_do_not_disturb')
          : t('menu.unset_do_not_disturb')
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
            label: () => t('menu.allow_notifications'),
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
            label: () => t('menu.receive_silently'),
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
            label: () => t('menu.block_group_messages'),
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

              window.$message.success(
                item.shield ? t('message.message_menu.unshield_success') : t('message.message_menu.shield_success')
              )
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
      label: (item: SessionItem) => (item.shield ? t('menu.unblock_user_messages') : t('menu.block_user_messages')),
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

        window.$message.success(
          item.shield ? t('message.message_menu.unshield_success') : t('message.message_menu.shield_success')
        )
      },
      // 只在单聊时显示
      visible: (item: SessionItem) => item.type === RoomTypeEnum.SINGLE
    },
    {
      label: () => t('menu.remove_from_list'),
      icon: 'delete',
      click: async (item: SessionItem) => {
        await handleMsgDelete(item.roomId)
      }
    },
    {
      label: (item: SessionItem) => {
        if (item.type === RoomTypeEnum.SINGLE) return t('menu.delete_friend')
        if (item.operate === SessionOperateEnum.DISSOLUTION_GROUP) return t('menu.dissolve_group')
        return t('menu.leave_group')
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
          window.$message.success(t('message.message_menu.delete_friend_success'))
          return
        }

        // 群聊：检查是否是频道
        if (item.roomId === '1') {
          window.$message.warning(
            item.operate === SessionOperateEnum.DISSOLUTION_GROUP
              ? t('message.message_menu.cannot_dissolve_channel')
              : t('message.message_menu.cannot_quit_channel')
          )
          return
        }

        // 群聊：解散或退出
        await exitGroup({ roomId: item.roomId })
        await handleMsgDelete(item.roomId)
        window.$message.success(
          item.operate === SessionOperateEnum.DISSOLUTION_GROUP
            ? t('message.message_menu.dissolve_group_success')
            : t('message.message_menu.quit_group_success')
        )
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
        message = t('message.message_menu.notification_allowed')
        break
      case NotificationTypeEnum.NOT_DISTURB:
        message = t('message.message_menu.notification_silent')
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
