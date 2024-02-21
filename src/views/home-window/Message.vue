<template>
  <!-- 消息框 -->
  <!-- 可拖拽排序组件  -->
  <VueDraggable v-if="items.length > 0" ref="el" :animation="150" v-model="items">
    <!--  右键菜单组件  -->
    <ContextMenu
      @select="handleSelect($event.click(item.key))"
      @click="handleMsgClick(item.key)"
      :menu="menuList"
      :special-menu="specialMenuList"
      :class="{ active: activeItem === item.key }"
      class="msg-box w-full h-75px mb-5px"
      v-for="item in items"
      :key="item.key">
      <!-- 消息框，使用v-slide自定义指令来自动抉择右键菜单位置 -->
      <div v-slide class="flex items-center h-full pl-6px pr-8px gap-10px">
        <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" :src="item.avatar" alt="" />

        <div class="h-38px flex flex-1 flex-col justify-between">
          <div class="flex-between-center">
            <span class="font-size-14px">宝贝{{ item.value }}🍓</span>
            <span class="text font-size-10px">昨天</span>
          </div>

          <div class="flex-between-center">
            <p
              class="text w-135px font-size-12px"
              style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
              说的很经典哈萨克的哈萨克看到贺卡上
            </p>

            <!-- 消息提示 -->
            <n-badge :value="msgTotal" :max="99" />
          </div>
        </div>
      </div>
    </ContextMenu>
  </VueDraggable>

  <!-- 暂无消息 -->
  <div v-else class="wh-full flex-center mt-60px color-[--text-color]">暂无消息</div>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import { VueDraggable } from 'vue-draggable-plus'

// const avatars = [
//   'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg',
//   'https://avatars.githubusercontent.com/u/20943608?s=60&v=4',
//   'https://avatars.githubusercontent.com/u/46394163?s=60&v=4',
//   'https://avatars.githubusercontent.com/u/39197136?s=60&v=4',
//   'https://avatars.githubusercontent.com/u/19239641?s=60&v=4'
// ]

const avatars = 'https://picsum.photos/60'

// TODO 消息列表还是需要虚拟列表或者懒加载的 (nyh -> 2024-02-19 04:23:40)
const items = ref(
  Array.from({ length: 20 }, (_, i) => ({
    value: `${i}`,
    key: i,
    avatar: `${avatars}?${i}`
  }))
)

type Menu = {
  label: string
  icon: string
  top?: boolean
  click?: (...args: any[]) => void
}[]
const menuList = ref<Menu>([
  {
    label: '置顶',
    icon: 'topping',
    click: (key: number) => {
      let index = items.value.findIndex((item) => item.key === key)
      // 实现置顶功能
      if (index !== 0) {
        // 交换元素位置
        const temp = items.value[index]
        items.value[index] = items.value[0]
        items.value[0] = temp
        // 找到已经置顶的元素的下标把对应的menuList的top设置为true
        const topIndex = items.value.findIndex((item) => item.key === items.value[0].key)
        menuList.value[topIndex].top = true
        menuList.value[topIndex].label = '取消置顶'
        menuList.value[topIndex].icon = 'close'
      }
    }
  },
  {
    label: '复制账号',
    icon: 'copy',
    click: (index: number) => {
      window.$message.success(`复制成功${index}`)
    }
  },
  { label: '标记未读', icon: 'message-unread' },
  { label: '打开独立聊天窗口', icon: 'freezing-line-column' },
  { label: '设置免打扰', icon: 'close-remind' }
])
const specialMenuList = ref<Menu>([
  {
    label: '从消息列表中移除',
    icon: 'delete',
    click: (key: number) => {
      // 根据key找到items中对应的下标
      let index = items.value.findIndex((item) => item.key === key)
      // 如果找到了对应的元素，则移除
      if (index !== -1) {
        const removeItem = items.value.splice(index, 1)[0]
        if (activeItem.value === removeItem.key) {
          if (index < items.value.length) {
            // 需要使用新的索引位置找到key更新activeItem.value
            activeItem.value = items.value[index].key
          } else {
            // 如果我们删除的是最后一个元素，则需要选中前一个元素
            activeItem.value = items.value[items.value.length - 1].key
          }
        }
      }
    }
  },
  { label: '屏蔽此人消息', icon: 'forbid' }
])

const msgTotal = ref(0)
const msgBoxShow = ref(false)
/* 建议把此状态存入localStorage中 */
const activeItem = ref(-1)

watchEffect(() => {
  Mitt.emit('updateMsgTotal', msgTotal.value)
})

const handleSelect = (event: any) => {
  event?.click?.()
}

const handleMsgClick = (index: number) => {
  msgBoxShow.value = true
  activeItem.value = index
  const data = { msgBoxShow, activeItem }
  Mitt.emit('msgBoxShow', data)
}

onMounted(() => {
  // setInterval(() => {
  //   msgTotal.value++
  // }, 1000)
})
</script>

<style scoped lang="scss">
.msg-box {
  color: var(--text-color);
  .text {
    color: #808080;
  }
  &:not(.active):first-child {
    background: var(--bg-msg-first-child);
    border-radius: 6px;
  }
  &:not(.active):hover {
    background: var(--bg-msg-hover);
    border-radius: 6px;
    cursor: pointer;
  }
}

.active {
  background: var(--bg-active-msg);
  border-radius: 8px;
  color: #fff;
  .text {
    color: #fff;
  }
}

:deep(.n-badge .n-badge-sup) {
  font-weight: bold;
  font-size: 10px;
}
</style>
