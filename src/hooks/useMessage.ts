import { emit } from '@tauri-apps/api/event'
import { EventEnum, MittEnum } from '@/enums'
import { useMitt } from '@/hooks/useMitt.ts'
import { MockItem, SessionItem } from '@/services/types.ts'
import { MockList } from '@/mock'
import { useSettingStore } from '@/stores/setting.ts'
import { useGlobalStore } from '@/stores/global.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useTauriListener } from './useTauriListener'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

const msgBoxShow = ref(false)
/** 独立窗口的集合 */
const aloneWin = ref(new Set())
const shrinkStatus = ref(false)
const itemRef = ref<SessionItem>()
export const useMessage = () => {
  const { pushListeners } = useTauriListener()
  const globalStore = useGlobalStore()
  const chatStore = useChatStore()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
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
    // 判断是否打开了独立的窗口 TODO: 暂时下架独立窗口功能,但是功能代码还保留后用
    // if (aloneWin.value.has(EventEnum.ALONE + item.roomId)) {
    //   checkWinExist(EventEnum.ALONE + item.roomId)
    //   useMitt.emit(MittEnum.MSG_BOX_SHOW, { item: -1 })
    // }
    // 如果是收缩页面状态点击消息框就直接变成独立窗口
    // if (shrinkStatus.value) {
    //   openAloneWin(item)
    // }
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
      icon: 'topping',
      click: (item: MockItem) => {
        const index = MockList.value.findIndex((e) => e.key === item.key)
        // 实现置顶功能
        if (index !== 0) {
          // 交换元素位置
          const temp = MockList.value[index]
          MockList.value[index] = MockList.value[0]
          MockList.value[0] = temp
        }
      }
    },
    {
      label: '复制账号',
      icon: 'copy',
      click: (item: MockItem) => {
        window.$message.success(`复制成功${item.key}`)
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
      click: (item: SessionItem) => {
        // TODO: 实现从消息列表中移除功能
        chatStore.removeContact(item.roomId)
      }
    },
    { label: '屏蔽此人消息', icon: 'forbid' }
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

  return { msgBoxShow, handleMsgClick, handleMsgDblclick, menuList, specialMenuList }
}
