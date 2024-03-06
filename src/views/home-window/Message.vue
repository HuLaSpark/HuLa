<template>
  <!-- 消息列表 -->
  <!-- 可拖拽排序组件  -->
  <VueDraggable v-if="MockList.length > 0" ref="el" target=".sort-target" :animation="150" v-model="MockList">
    <!--  右键菜单组件  -->
    <TransitionGroup type="transition" tag="div" name="fade" class="sort-target">
      <ContextMenu
        @select="handleSelect($event.click(item.key))"
        @click="handleMsgClick(item)"
        :menu="menuList"
        :special-menu="specialMenuList"
        :class="{ active: activeItem === item.key }"
        class="msg-box w-full h-75px mb-5px"
        v-for="item in MockList"
        :key="item.key">
        <!-- 消息框，使用v-slide自定义指令来自动抉择右键菜单位置 -->
        <div v-slide class="flex items-center h-full pl-6px pr-8px gap-10px">
          <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" :src="item.avatar" alt="" />

          <div class="h-38px flex flex-1 flex-col justify-between">
            <div class="flex-between-center">
              <span class="text-14px">{{ item.accountName }}</span>
              <span class="text text-10px">昨天</span>
            </div>

            <div class="flex-between-center">
              <p class="text w-135px text-12px" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                说的很经典哈萨克的哈萨克看到贺卡上
              </p>

              <!-- 消息提示 -->
              <n-badge :value="msgTotal" :max="99" />
            </div>
          </div>
        </div>
      </ContextMenu>
    </TransitionGroup>
  </VueDraggable>

  <!-- 暂无消息 -->
  <div v-else class="wh-full flex-center mt-60px color-[--text-color]">暂无消息</div>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import { VueDraggable } from 'vue-draggable-plus'
import { Menu } from '@/services/types.ts'
import { MockList } from '@/mock/index.ts'

const menuList = ref<Menu>([
  {
    label: '置顶',
    icon: 'topping',
    click: (key: number) => {
      let index = MockList.value.findIndex((item) => item.key === key)
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
      let index = MockList.value.findIndex((item) => item.key === key)
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

const handleMsgClick = (item: any) => {
  msgBoxShow.value = true
  activeItem.value = item.key
  const data = { msgBoxShow, item }
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
  transition:
    background-color 0.3s ease,
    border-radius 0.3s ease;
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

/*! TransitionGroup过渡样式 */
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01) translate(30px, 0);
}

.fade-leave-active {
  position: absolute;
}
/*! end */

:deep(.n-badge .n-badge-sup) {
  font-weight: bold;
  font-size: 10px;
}
</style>
