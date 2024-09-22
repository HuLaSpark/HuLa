import { useWindow } from '@/hooks/useWindow.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { EventEnum, MittEnum } from '@/enums'
import Mitt from '@/utils/Bus.ts'
import { MockItem, SessionItem } from '@/services/types.ts'
import { delay } from 'lodash-es'
import { MockList } from '@/mock'
import { setting } from '@/stores/setting.ts'

const { createWebviewWindow, checkWinExist } = useWindow()
/** 建议把此状态存入localStorage中 */
const activeIndex = ref(-1)
const msgBoxShow = ref(false)
/** 独立窗口的集合 */
const aloneWin = ref(new Set())
const shrinkStatus = ref(false)
const itemRef = ref<SessionItem>()
export const useMessage = () => {
  const settingStore = setting()
  const { chat } = storeToRefs(settingStore)
  /** 监听独立窗口关闭事件 */
  watchEffect(() => {
    Mitt.on(MittEnum.SHRINK_WINDOW, async (event) => {
      shrinkStatus.value = event as boolean
    })
  })

  /** 处理点击选中消息 */
  const handleMsgClick = (item: SessionItem) => {
    msgBoxShow.value = true
    activeIndex.value = item.roomId
    const data = { msgBoxShow, item }
    Mitt.emit(MittEnum.MSG_BOX_SHOW, data)
    // 判断是否打开了独立的窗口
    if (aloneWin.value.has(EventEnum.ALONE + item.roomId)) {
      checkWinExist(EventEnum.ALONE + item.roomId).then()
      activeIndex.value = -1
      Mitt.emit(MittEnum.MSG_BOX_SHOW, { item: -1 })
    }
    // 如果是收缩页面状态点击消息框就直接变成独立窗口
    if (shrinkStatus.value) {
      openAloneWin(item).then()
    }
  }

  /** 处理双击事件 */
  const handleMsgDblclick = (item: SessionItem) => {
    if (!chat.value.isDouble) return
    delay(async () => {
      await openAloneWin(item)
    }, 300)
  }

  /** 打开独立窗口 */
  const openAloneWin = async (item: SessionItem) => {
    itemRef.value = { ...item }
    if (activeIndex.value === item.roomId) {
      activeIndex.value = -1
      Mitt.emit(MittEnum.MSG_BOX_SHOW, { item: -1 })
      await listen('aloneWin', () => {
        emit('aloneData', { item: { ...item } })
      })
    }
    await createWebviewWindow(item.name, EventEnum.ALONE + item.roomId, 720, 800, '', true, 580)
  }

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
        await openAloneWin(item)
      }
    },
    { label: '设置免打扰', icon: 'close-remind' }
  ])

  const specialMenuList = ref<OPT.RightMenu[]>([
    {
      label: '从消息列表中移除',
      icon: 'delete',
      click: (item: SessionItem) => {
        console.log(item)
        // // 根据key找到items中对应的下标
        // const index = MockList.value.findIndex((e) => e.key === item.key)
        // // 删除消息的时候判断是否已经打开了独立窗口
        // if (aloneWin.value.has(`alone${index}`)) {
        //   const win = WebviewWindow.getByLabel(`alone${index}`)
        //   win?.close()
        // }
        // // 如果找到了对应的元素，则移除
        // if (index !== -1) {
        //   const removeItem = MockList.value.splice(index, 1)[0]
        //   if (activeIndex.value === removeItem.key) {
        //     if (index < MockList.value.length) {
        //       // 需要使用新的索引位置找到key更新activeItem.value
        //       activeIndex.value = MockList.value[index].key
        //       handleMsgClick(MockList.value[index])
        //     } else {
        //       if (MockList.value.length === 0) return
        //       // 如果我们删除的是最后一个元素，则需要选中前一个元素
        //       activeIndex.value = MockList.value[MockList.value.length - 1].key
        //       handleMsgClick(MockList.value[MockList.value.length - 1])
        //     }
        //   }
        // }
      }
    },
    { label: '屏蔽此人消息', icon: 'forbid' }
  ])

  onMounted(async () => {
    await listen(EventEnum.ALONE, () => {
      emit(EventEnum.ALONE + itemRef.value?.roomId, itemRef.value)
      if (aloneWin.value.has(EventEnum.ALONE + itemRef.value?.roomId)) return
      aloneWin.value.add(EventEnum.ALONE + itemRef.value?.roomId)
    })
    await listen(EventEnum.WIN_CLOSE, (e) => {
      aloneWin.value.delete(e.payload)
    })
  })

  return { activeIndex, msgBoxShow, handleMsgClick, handleMsgDblclick, menuList, specialMenuList }
}
