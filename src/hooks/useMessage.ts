import { emit } from '@tauri-apps/api/event'
import { EventEnum, MittEnum, RoomTypeEnum, SessionOperateEnum, NotificationTypeEnum } from '@/enums'
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
    // 更新当前会话信息
    globalStore.currentSession.roomId = item.roomId
    globalStore.currentSession.type = item.type
    const data = { msgBoxShow, item }
    console.log('handleMsgClick:', item)
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
    // TODO: 使用隐藏会话接口
    const res = await apis.hideSession({ roomId, hide: true })
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
      label: (item: SessionItem) => (item.top ? '取消置顶' : '置顶'),
      icon: (item: SessionItem) => (item.top ? 'to-bottom' : 'to-top'),
      click: (item: SessionItem) => {
        apis
          .setSessionTop({ roomId: item.roomId, top: !item.top })
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
                await apis.shield({
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
                await apis.shield({
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
              // 如果当前是免打扰状态，需要先恢复为允许提醒
              if (item.muteNotification === NotificationTypeEnum.NOT_DISTURB) {
                await handleNotificationChange(item, NotificationTypeEnum.RECEPTION)
              }

              await apis.shield({
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
        if (item.operate === SessionOperateEnum.DISSOLUTION_GROUP) return 'delete'
        return 'logout'
      },
      click: async (item: SessionItem) => {
        // 单聊：删除好友
        if (item.type === RoomTypeEnum.SINGLE) {
          await contactStore.onDeleteContact(item.id)
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
        await apis.exitGroup({ roomId: item.roomId })
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
    },
    {
      label: (item: SessionItem) => (item.shield ? '取消屏蔽消息' : '屏蔽此人消息'),
      icon: (item: SessionItem) => (item.shield ? 'message-success' : 'people-unknown'),
      click: async (item: SessionItem) => {
        await apis.shield({
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
    }
  ])

  // 添加通知设置变更处理函数
  const handleNotificationChange = async (item: SessionItem, newType: NotificationTypeEnum) => {
    await apis.notification({
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

  onBeforeUnmount(() => {
    // 取消监听, 避免内存中还存在监听，导致请求次数过多
    useMitt.off(MittEnum.MSG_BOX_SHOW, () => {})
    useMitt.off(MittEnum.SHRINK_WINDOW, () => {})
  })

  return { msgBoxShow, handleMsgClick, handleMsgDelete, handleMsgDblclick, menuList, specialMenuList }
}
