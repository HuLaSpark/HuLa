import { useWindow } from '@/hooks/useWindow.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import { useCachedStore } from '@/stores/cached.ts'
import { onlineStatus } from '@/stores/onlineStatus.ts'
import { EventEnum, IsYesEnum, MittEnum, MsgEnum, PluginEnum, ThemeEnum } from '@/enums'
import { BadgeType, UserInfoType } from '@/services/types.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import apis from '@/services/apis.ts'
import { delay } from 'lodash-es'
import router from '@/router'
import { listen } from '@tauri-apps/api/event'
import { useMenuTopStore } from '@/stores/menuTop.ts'
import { useLoginHistoriesStore } from '@/stores/loginHistory.ts'

export const leftHook = () => {
  const prefers = matchMedia('(prefers-color-scheme: dark)')
  const { createWebviewWindow } = useWindow()
  const settingStore = useSettingStore()
  const { menuTop } = useMenuTopStore()
  const loginHistoriesStore = useLoginHistoriesStore()
  const userStore = useUserStore()
  const cachedStore = useCachedStore()
  const { themes } = settingStore
  const OLStatusStore = onlineStatus()
  const { url, title, bgColor } = storeToRefs(OLStatusStore)
  const activeUrl = ref<string>(menuTop[0].url)
  const settingShow = ref(false)
  const shrinkStatus = ref(false)
  /** 是否展示个人信息浮窗 */
  const infoShow = ref(false)
  /** 是否显示上半部分操作栏中的提示 */
  const tipShow = ref(true)
  const themeColor = ref(themes.content === ThemeEnum.DARK ? 'rgba(63,63,63, 0.2)' : 'rgba(241,241,241, 0.2)')
  /** 已打开窗口的列表 */
  const openWindowsList = ref(new Set())
  /** 编辑资料弹窗 */
  const editInfo = ref<{
    show: boolean
    content: Partial<UserInfoType>
    badgeList: BadgeType[]
  }>({
    show: false,
    content: {},
    badgeList: []
  })
  /** 当前用户佩戴的徽章  */
  const currentBadge = computed(() =>
    editInfo.value.badgeList.find((item) => item.obtain === IsYesEnum.YES && item.wearing === IsYesEnum.YES)
  )
  const chatStore = useChatStore()
  const sessionList = computed(() =>
    chatStore.sessionList.map((item) => {
      // 最后一条消息内容
      const lastMsg = Array.from(chatStore.messageMap.get(item.roomId)?.values() || [])?.slice(-1)?.[0]
      let LastUserMsg = ''
      if (lastMsg) {
        const lastMsgUserName = useUserInfo(lastMsg.fromUser.uid)
        LastUserMsg =
          lastMsg.message?.type === MsgEnum.RECALL
            ? `${lastMsgUserName.value.name}:'撤回了一条消息'`
            : (renderReplyContent(
                lastMsgUserName.value.name,
                lastMsg.message?.type,
                lastMsg.message?.body?.content || lastMsg.message?.body
              ) as string)
      }
      return {
        ...item,
        lastMsg: LastUserMsg || item.text || '欢迎使用HuLa',
        lastMsgTime: formatTimestamp(item?.activeTime)
      }
    })
  )
  const msgTotal = computed(() => {
    return sessionList.value.reduce((total, item) => total + item.unreadCount, 0)
  })

  /* =================================== 方法 =============================================== */

  /** 跟随系统主题模式切换主题 */
  const followOS = () => {
    themeColor.value = prefers.matches ? 'rgba(63,63,63, 0.2)' : 'rgba(241,241,241, 0.2)'
  }

  watchEffect(() => {
    // menuTop.find((item: STO.Plugins<PluginEnum>) => {
    //   if (item.url === 'message') {
    //     item.badge = msgTotal.value
    //   }
    // })
    /** 判断是否是跟随系统主题 */
    if (themes.pattern === ThemeEnum.OS) {
      followOS()
      prefers.addEventListener('change', followOS)
    } else {
      prefers.removeEventListener('change', followOS)
    }
  })

  /** 更新缓存里面的用户信息 */
  const updateCurrentUserCache = (key: 'name' | 'wearingItemId', value: any) => {
    const currentUser = userStore.userInfo.uid && cachedStore.userCachedList[userStore.userInfo.uid]
    if (currentUser) {
      currentUser[key] = value // 更新缓存里面的用户信息
    }
  }

  /** 保存用户信息 */
  const saveEditInfo = (localUserInfo: any) => {
    if (!localUserInfo.name || localUserInfo.name.trim() === '') {
      window.$message.error('昵称不能为空')
      return
    }
    if (localUserInfo.modifyNameChance === 0) {
      window.$message.error('改名次数不足')
      return
    }
    apis.modifyUserName(localUserInfo.name).then(() => {
      // 更新本地缓存的用户信息
      userStore.userInfo.name = localUserInfo.name!
      loginHistoriesStore.updateLoginHistory(<UserInfoType>userStore.userInfo) // 更新登录历史记录
      updateCurrentUserCache('name', localUserInfo.name) // 更新缓存里面的用户信息
      if (!editInfo.value.content.modifyNameChance) return
      editInfo.value.content.modifyNameChance -= 1
      window.$message.success('保存成功')
    })
  }

  /** 佩戴徽章 */
  const toggleWarningBadge = async (badge: BadgeType) => {
    if (!badge?.id) return
    await apis.setUserBadge(badge.id)
    window.$message.success('佩戴成功')
  }

  /* 打开并且创建modal */
  const handleEditing = () => {
    // TODO 暂时使用mitt传递参数，不然会导致子组件的响应式丢失 (nyh -> 2024-06-25 09:53:43)
    useMitt.emit(MittEnum.OPEN_EDIT_INFO)
  }

  /**
   * 侧边栏部分跳转窗口路由事件
   * @param url 跳转的路由
   * @param title 创建窗口时的标题
   * @param size 窗口的大小
   * @param window 窗口参数
   * */
  const pageJumps = (
    url: string,
    title?: string,
    size?: { width: number; height: number; minWidth?: number },
    window?: { resizable: boolean }
  ) => {
    if (window) {
      delay(async () => {
        await createWebviewWindow(
          title!,
          url,
          <number>size?.width,
          <number>size?.height,
          '',
          window?.resizable,
          <number>size?.minWidth
        )
      }, 300)
    } else {
      activeUrl.value = url
      router.push(`/${url}`)
    }
  }

  /**
   * 打开内容对应窗口
   * @param title 窗口的标题
   * @param label 窗口的标识
   * @param w 窗口的宽度
   * @param h 窗口的高度
   * */
  const openContent = (title: string, label: string, w = 840, h = 600) => {
    delay(async () => {
      await createWebviewWindow(title, label, w, h)
    }, 300)
    infoShow.value = false
  }

  const closeMenu = (event: any) => {
    if (!event.target.matches('.setting-item, .more, .more *')) {
      settingShow.value = false
    }
  }

  onMounted(async () => {
    /** 页面加载的时候默认显示消息列表 */
    pageJumps(activeUrl.value)
    window.addEventListener('click', closeMenu, true)

    useMitt.on(MittEnum.SHRINK_WINDOW, (event: any) => {
      shrinkStatus.value = event as boolean
    })
    useMitt.on(MittEnum.CLOSE_INFO_SHOW, () => {
      infoShow.value = false
    })
    useMitt.on(MittEnum.UPDATE_MSG_TOTAL, (event: any) => {
      menuTop.find((item: STO.Plugins<PluginEnum>) => {
        if (item.url === 'message') {
          item.badge = event as number
        }
      })
    })
    useMitt.on(MittEnum.TO_SEND_MSG, (event: any) => {
      activeUrl.value = event.url
    })
    await listen(EventEnum.WIN_SHOW, (e) => {
      // 如果已经存在就不添加
      if (openWindowsList.value.has(e.payload)) return
      openWindowsList.value.add(e.payload)
    })
    await listen(EventEnum.WIN_CLOSE, (e) => {
      openWindowsList.value.delete(e.payload)
    })
  })

  onUnmounted(() => {
    window.removeEventListener('click', closeMenu, true)
  })

  return {
    url,
    title,
    bgColor,
    activeUrl,
    settingShow,
    shrinkStatus,
    infoShow,
    tipShow,
    themeColor,
    openWindowsList,
    editInfo,
    currentBadge,
    sessionList,
    msgTotal,
    handleEditing,
    pageJumps,
    openContent,
    saveEditInfo,
    toggleWarningBadge,
    updateCurrentUserCache,
    followOS
  }
}
