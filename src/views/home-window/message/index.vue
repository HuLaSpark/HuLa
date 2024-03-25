<template>
  <!-- 消息列表 -->
  <!-- 可拖拽排序组件  -->
  <VueDraggable v-if="MockList.length > 0" ref="el" target=".sort-target" :animation="150" v-model="MockList">
    <!--  右键菜单组件  -->
    <TransitionGroup type="transition" tag="div" name="fade" class="sort-target">
      <ContextMenu
        @select="$event.click(item)"
        @click="handleMsgClick(item)"
        @dblclick="handleMsgDblclick(item)"
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
import { MockList } from '@/mock'
import { useMessage } from '@/hooks/useMessage.ts'
import { MittEnum } from '@/enums'

const msgTotal = ref(0)
const { activeItem, handleMsgClick, menuList, specialMenuList, handleMsgDblclick } = useMessage()

watchEffect(() => {
  // TODO 如果当前信息栏中没有该信息就创建一条 (nyh -> 2024-03-22 01:05:22)
  Mitt.emit(MittEnum.UPDATE_MSG_TOTAL, msgTotal.value)
})

onMounted(() => {
  // setInterval(() => {
  //   msgTotal.value++
  // }, 1000)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/message';
</style>
