<template>
  <!-- 消息列表 // TODO 使用虚拟列表组件就用不了动画和拖动了 (nyh -> 2024-03-28 06:01:00) -->
  <n-scrollbar ref="scrollbar" v-if="MockList.length > 0" style="max-height: calc(100vh - 70px)">
    <!-- 可拖拽排序组件  -->
    <VueDraggable target=".sort-target" :animation="150" v-model="MockList" class="p-[4px_10px_0px_8px]">
      <!--  右键菜单组件  -->
      <TransitionGroup type="transition" tag="div" name="fade" class="sort-target">
        <ContextMenu
          @select="$event.click(item)"
          @click="handleMsgClick(item)"
          @dblclick="handleMsgDblclick(item)"
          :data-key="item.key"
          :menu="menuList"
          :special-menu="specialMenuList"
          :class="{ active: activeIndex === item.key }"
          class="msg-box w-full h-75px mb-5px"
          v-for="item in MockList"
          :key="item.key">
          <!-- 消息框，使用v-slide自定义指令来自动抉择右键菜单位置 -->
          <n-flex v-slide align="center" :size="10" class="h-75px pl-6px pr-8px">
            <n-avatar round bordered :color="'#fff'" :size="44" :src="item.avatar" fallback-src="/logo.png" alt="" />

            <n-flex vertical justify="space-between" class="h-38px flex-1">
              <n-flex align="center" justify="space-between">
                <span class="text-14px">{{ item.accountName }}</span>
                <span class="text text-10px">昨天</span>
              </n-flex>

              <n-flex align="center" justify="space-between">
                <span
                  class="text w-135px text-12px"
                  style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                  说的很经典哈萨克的哈萨克看到贺卡上
                </span>

                <!-- 消息提示 -->
                <n-badge :value="msgTotal" :max="99" />
              </n-flex>
            </n-flex>
          </n-flex>
        </ContextMenu>
      </TransitionGroup>
    </VueDraggable>
  </n-scrollbar>

  <!-- 暂无消息 -->
  <n-flex id="image-no-data" v-else :size="20" align="center" vertical>
    <n-image
      width="120px"
      height="110px"
      src="src/assets/img/no_data.svg"
      lazy
      preview-disabled
      :intersection-observer-options="{
        root: '#image-no-data'
      }" />
    <span>暂无消息</span>
  </n-flex>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import { VueDraggable } from 'vue-draggable-plus'
import { MockList } from '@/mock'
import { useMessage } from '@/hooks/useMessage.ts'
import { MittEnum } from '@/enums'

const msgTotal = ref(0)
const scrollbar = ref()
const { activeIndex, handleMsgClick, menuList, specialMenuList, handleMsgDblclick } = useMessage()

watchEffect(() => {
  // TODO 如果当前信息栏中没有该信息就创建一条 (nyh -> 2024-03-22 01:05:22)
  Mitt.emit(MittEnum.UPDATE_MSG_TOTAL, msgTotal.value)
  if (MockList.value.length === 0) {
    Mitt.emit(MittEnum.NOT_MSG)
  }
})

onMounted(() => {
  // TODO 这里的key后面如果换成用户唯一标识的时候记得更换data-key的值 (nyh -> 2024-03-28 18:56:20)
  if (activeIndex.value !== -1) {
    nextTick(() => {
      const activeElement = document.querySelector(`.msg-box[data-key="${activeIndex.value}"]`) as HTMLElement
      const rect = activeElement.getBoundingClientRect()
      scrollbar.value.scrollTo({
        top: rect.top - 75,
        behavior: 'smooth'
      })
    })
  }
  // setInterval(() => {
  //   msgTotal.value++
  // }, 1000)
})
</script>

<style scoped lang="scss">
@import '@/styles/scss/message';
#image-no-data {
  @apply size-full mt-60px text-[--text-color] text-14px;
}
</style>
