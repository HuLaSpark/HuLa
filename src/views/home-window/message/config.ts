import { MockList } from '@/mock'
import Mitt from '@/utils/Bus.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { MockItem } from '@/services/types.ts'
import { emit, listen } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import { WebviewWindow } from '@tauri-apps/api/window'
import { delay } from 'lodash-es'

const { createWebviewWindow, checkWinExist } = useWindow()
/* 建议把此状态存入localStorage中 */
const activeItem = ref(-1)
const msgBoxShow = ref(false)
/* 独立窗口的集合 */
const aloneWin = ref(new Set())
const shrinkStatus = ref(false)

/* 监听独立窗口关闭事件 */
watchEffect(async () => {
  await listen(EventEnum.WIN_CLOSE, (e) => {
    aloneWin.value.delete(e.payload)
  })
  Mitt.on('shrinkWindow', async (event) => {
    shrinkStatus.value = event as boolean
  })
})

/* 处理点击选中消息 */
const handleMsgClick = (item: MockItem) => {
  msgBoxShow.value = true
  activeItem.value = item.key
  const data = { msgBoxShow, item }
  Mitt.emit('msgBoxShow', data)
  // 判断是否打开了独立的窗口
  if (aloneWin.value.has(`alone${item.key}`)) {
    checkWinExist(`alone${item.key}`).then()
    activeItem.value = -1
    Mitt.emit('msgBoxShow', { item: -1 })
  }
  // 如果是收缩页面状态点击消息框就直接变成独立窗口
  if (shrinkStatus.value) {
    openAloneWin(item).then()
  }
}

/* 处理双击事件 */
const handleMsgDblclick = (item: MockItem) => {
  delay(async () => {
    await openAloneWin(item)
  }, 300)
}

/* 打开独立窗口 */
const openAloneWin = async (item: MockItem) => {
  if (activeItem.value === item.key) {
    activeItem.value = -1
    Mitt.emit('msgBoxShow', { item: -1 })
  }
  // TODO 传递用户信息(这里的label最好使用用户唯一的id来代替) (nyh -> 2024-03-18 12:18:10)
  await createWebviewWindow(item.accountName, `alone${item.key}`, 720, 800)
  await listen('window-ready', () => {
    emit(`alone${item.key}`, item)
    aloneWin.value.add(`alone${item.key}`)
  })
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
    click: async (item: MockItem) => {
      await openAloneWin(item)
    }
  },
  { label: '设置免打扰', icon: 'close-remind' }
])

const specialMenuList = ref<OPT.RightMenu[]>([
  {
    label: '从消息列表中移除',
    icon: 'delete',
    click: (item: MockItem) => {
      // 根据key找到items中对应的下标
      const index = MockList.value.findIndex((e) => e.key === item.key)
      // 删除消息的时候判断是否已经打开了独立窗口
      if (aloneWin.value.has(`alone${index}`)) {
        const win = WebviewWindow.getByLabel(`alone${index}`)
        win?.close()
      }
      // 如果找到了对应的元素，则移除
      if (index !== -1) {
        const removeItem = MockList.value.splice(index, 1)[0]
        if (activeItem.value === removeItem.key) {
          if (index < MockList.value.length) {
            // 需要使用新的索引位置找到key更新activeItem.value
            activeItem.value = MockList.value[index].key
            handleMsgClick(MockList.value[index])
          } else {
            // 如果我们删除的是最后一个元素，则需要选中前一个元素
            activeItem.value = MockList.value[MockList.value.length - 1].key
            handleMsgClick(MockList.value[MockList.value.length - 1])
          }
        }
      }
    }
  },
  { label: '屏蔽此人消息', icon: 'forbid' }
])

export { activeItem, msgBoxShow, handleMsgClick, handleMsgDblclick, menuList, specialMenuList }
