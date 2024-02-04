<template>
  <!-- 消息框 -->
  <ContextMenu
    @contextmenu="showMenu(n)"
    @select="handleSelect($event.label)"
    @click="handleMsgClick(n)"
    :menu="menuList"
    :special-menu="specialMenuList"
    :class="{ active: activeItem === n }"
    class="msg-box w-full h-75px mb-5px"
    v-for="n in 20"
    :key="n">
    <div v-slide class="flex items-center h-full pl-6px pr-8px gap-10px">
      <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" src="/logo.png" alt="" />

      <div class="w-full h-38px flex flex-col justify-between">
        <div class="flex-between-center">
          <span class="font-size-14px">宝贝{{ n }}🍓</span>
          <span class="text font-size-10px">昨天</span>
        </div>

        <div class="flex-between-center">
          <p class="text w-135px font-size-12px" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
            说的很经典哈萨克的哈萨克看到贺卡上
          </p>

          <n-badge :value="msgTotal" :max="99" />
        </div>
      </div>
    </div>
  </ContextMenu>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'

const menuList = ref([
  { label: '置顶', icon: 'topping' },
  { label: '复制账号', icon: 'copy' },
  { label: '标记未读', icon: 'message-unread' },
  { label: '打开独立聊天窗口', icon: 'freezing-line-column' },
  { label: '设置免打扰', icon: 'close-remind' }
])
const specialMenuList = ref([
  { label: '从消息列表中移除', icon: 'delete' },
  { label: '屏蔽此人消息', icon: 'forbid' }
])
const msgTotal = ref(0)
const msgBoxShow = ref(false)
/* 建议把此状态存入localStorage中 */
const activeItem = ref(0)

watchEffect(() => {
  Mitt.emit('updateMsgTotal', msgTotal.value)
})

const showMenu = (index: number) => {
  console.log(index)
}

const handleSelect = (event: MouseEvent) => {
  console.log(event)
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
  .text {
    color: #808080;
  }
  &:not(.active):first-child {
    background: #eeeeee;
    border-radius: 6px;
  }
  &:not(.active):hover {
    background: #f3f3f3;
    border-radius: 6px;
    cursor: pointer;
  }
}

.active {
  background: rgba(5, 150, 105, 0.8);
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
