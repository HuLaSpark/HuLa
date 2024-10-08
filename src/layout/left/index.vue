<template>
  <div style="background: rgba(30, 30, 30, 0.8)">
    <main
      class="left min-w-64px h-full p-[30px_6px_15px] box-border flex-col-center select-none"
      data-tauri-drag-region>
      <p class="text-(16px [--left-text-color]) cursor-default select-none m-[4px_0_16px_0]">HuLa</p>
      <!-- 头像模块 -->
      <LeftAvatar />
      <!-- 导航选项按钮模块 -->
      <ActionList />
      <!-- 编辑资料弹窗 -->
      <InfoPopover />

      <!-- 弹出框 -->
      <component :is="componentMap" />
    </main>
  </div>
</template>
<script lang="tsx" setup>
import LeftAvatar from './components/LeftAvatar.vue'
import ActionList from './components/ActionList.vue'
import InfoPopover from './components/InfoPopover.vue'
import Mitt from '@/utils/Bus.ts'
import { lock, LockScreen, CheckUpdate } from './model.tsx'
import { DefineComponent, DefineSetupFnComponent } from 'vue'
import { MittEnum, ModalEnum } from '@/enums'

const componentMap = shallowRef<DefineComponent>()
/** 弹窗组件内容映射 */
const componentMapping: Record<number, DefineSetupFnComponent<DefineComponent>> = {
  [ModalEnum.LOCK_SCREEN]: LockScreen,
  [ModalEnum.CHECK_UPDATE]: CheckUpdate
}

onMounted(() => {
  Mitt.on(MittEnum.LEFT_MODAL_SHOW, (event) => {
    componentMap.value = componentMapping[event as ModalEnum] as DefineComponent
    nextTick(() => {
      lock.value.modalShow = true
    })
  })
})
</script>

<style lang="scss" scoped>
@import 'style';
</style>
