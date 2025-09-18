<template>
  <div>
    <ActionBar :shrink="false" :max-w="false" />
    <div v-for="msg in msgs" :key="msg.message.id" class="flex ml-8 py-2">
      <n-avatar
        class="rounded-8px flex-shrink-0 mr-2"
        :size="30"
        :src="AvatarUtils.getAvatarUrl(computedUser(msg.fromUser.uid)!.avatar)" />
      <div class="flex-1">
        <div>{{ computedUser(msg.fromUser.uid)?.name }}</div>
        <p class="w-100% whitespace-pre-wrap break-words">{{ msg.message.body.content }}</p>
        <n-divider class="!my-2" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWindow } from '@/hooks/useWindow'
import type { MessageType, UserItem } from '@/services/types'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { getMsgList, getUserByIds } from '@/utils/ImRequestUtils'

type Msg = {
  msgId: string
  fromUid: string
}

const { getWindowPayload } = useWindow()
const choosedMsgs = ref<Msg[]>([])
const msgs = ref<MessageType[]>()
const users = ref<UserItem[]>()
const route = useRoute()

const computedUser = computed(() => (uid: string) => {
  return users.value?.find((user) => user.uid === uid)
})

const getAllMsg = async () => {
  const msgIds = choosedMsgs.value.map((msg) => msg.msgId)
  await getMsgList({ msgIds }).then((data) => {
    msgs.value = data
  })
}

const getAllUserInfo = async () => {
  const uids = choosedMsgs.value.map((msg) => msg.fromUid)
  await getUserByIds({ uidList: uids }).then((data) => {
    users.value = data
  })
}

onMounted(() => {
  getWindowPayload<Msg[]>(route.query.key as string)
    .then(async (data) => {
      choosedMsgs.value = data
      await getAllMsg()
      await getAllUserInfo()
    })
    .catch((e) => {
      console.error(e)
    })
})
</script>

<style scoped lang="scss"></style>
