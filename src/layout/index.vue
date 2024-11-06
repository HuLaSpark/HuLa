<template>
  <div id="layout" class="flex size-full min-w-310px">
    <Left />
    <Center />
    <Right v-if="!shrinkStatus" />
  </div>

  <AddFriendsModal />
</template>

<script setup lang="ts">
import Center from './center/index.vue'
import Left from './left/index.vue'
import Right from './right/index.vue'
import Mitt from '@/utils/Bus'
import { MittEnum } from '@/enums'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useGlobalStore } from '@/stores/global.ts'
import { useContactStore } from '@/stores/contacts.ts'

const globalStore = useGlobalStore()
const contactStore = useContactStore()
// 清空未读消息
globalStore.unReadMark.newMsgUnreadCount = 0
const shrinkStatus = ref(false)
/**
 * event默认如果没有传递值就为true，所以shrinkStatus的值为false就会发生值的变化
 * 因为shrinkStatus的值为false，所以v-if="!shrinkStatus" 否则right组件刚开始渲染的时候不会显示
 * */
Mitt.on(MittEnum.SHRINK_WINDOW, (event) => {
  shrinkStatus.value = event as boolean
})

onBeforeMount(() => {
  // 默认执行一次
  contactStore.getContactList(true)
  contactStore.getRequestFriendsList(true)
})

onMounted(async () => {
  await getCurrentWebviewWindow().show()
})
</script>
