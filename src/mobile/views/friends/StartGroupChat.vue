<template>
  <div class="flex w-full flex-col h-full">
    <HeaderBar
      :isOfficial="false"
      :hidden-right="true"
      :enable-default-background="false"
      :enable-shadow="false"
      room-name="发起群聊" />

    <!-- 顶部搜索框 -->
    <div class="px-16px mt-10px flex gap-3">
      <div class="flex-1 py-5px shrink-0">
        <n-input
          v-model:value="keyword"
          class="rounded-10px w-full bg-gray-100 relative text-14px"
          placeholder="搜索联系人~"
          clearable
          spellCheck="false"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off">
          <template #prefix>
            <svg class="w-12px h-12px"><use href="#search"></use></svg>
          </template>
        </n-input>
      </div>
      <div class="flex justify-end items-center">
        <n-button class="py-5px" @click="doSearch">搜索</n-button>
      </div>
    </div>

    <!-- 联系人列表 -->
    <!-- 联系人列表 -->
    <div ref="scrollArea" class="flex-1 overflow-y-auto px-16px mt-10px" :style="{ height: scrollHeight + 'px' }">
      <n-scrollbar style="max-height: calc(100vh - 150px)">
        <n-checkbox-group v-model:value="selectedList" class="flex flex-col gap-2">
          <div
            v-for="item in filteredContacts"
            :key="item.uid"
            class="rounded-10px border border-gray-200 overflow-hidden">
            <n-checkbox
              :value="item.uid"
              size="large"
              class="w-full flex items-center px-5px"
              :class="[
                'cursor-pointer select-none transition-colors duration-150',
                selectedList.includes(item.uid) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
              ]">
              <template #default>
                <!-- ✅ 强制一行展示 -->
                <div class="flex items-center gap-10px px-8px py-10px">
                  <!-- 头像 -->
                  <n-avatar
                    round
                    :size="44"
                    :src="AvatarUtils.getAvatarUrl(groupStore.getUserInfo(item.uid)!.avatar!)"
                    fallback-src="/logo.png"
                    style="border: 1px solid var(--avatar-border-color)" />
                  <!-- 文字信息 -->
                  <div class="flex flex-col leading-tight truncate">
                    <span class="text-14px font-medium truncate">
                      {{ groupStore.getUserInfo(item.uid)!.name }}
                    </span>
                    <div class="text-12px text-gray-500 flex items-center gap-4px truncate">
                      <template v-if="getUserState(item.uid)">
                        <img class="size-12px rounded-50%" :src="getUserState(item.uid)?.url" alt="" />
                        {{ getUserState(item.uid)?.title }}
                      </template>
                      <template v-else>
                        <n-badge :color="item.activeStatus === OnlineEnum.ONLINE ? '#1ab292' : '#909090'" dot />
                        {{ item.activeStatus === OnlineEnum.ONLINE ? '在线' : '离线' }}
                      </template>
                    </div>
                  </div>
                </div>
              </template>
            </n-checkbox>
          </div>
        </n-checkbox-group>
      </n-scrollbar>
    </div>

    <!-- 底部操作栏 -->
    <div class="px-16px py-10px bg-white border-t border-gray-200 flex justify-between items-center">
      <span class="text-14px">已选择 {{ selectedList.length }} 人</span>
      <n-button type="primary" :disabled="selectedList.length === 0" @click="createGroup">发起群聊</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { OnlineEnum } from '@/enums'
import { useContactStore } from '@/stores/contacts'
import { useGroupStore } from '@/stores/group'
import { useUserStatusStore } from '@/stores/userStatus'
import { AvatarUtils } from '@/utils/AvatarUtils'
import * as ImRequestUtils from '@/utils/ImRequestUtils'
import { useChatStore } from '@/stores/chat.ts'
import { useGlobalStore } from '@/stores/global.ts'

const userStatusStore = useUserStatusStore()
const { stateList } = storeToRefs(userStatusStore)
const groupStore = useGroupStore()
const chatStore = useChatStore()
const globalStore = useGlobalStore()

/** 获取用户状态 */
const getUserState = (uid: string) => {
  const userInfo = groupStore.getUserInfo(uid)!
  const userStateId = userInfo.userStateId

  if (userStateId && userStateId !== '1') {
    return stateList.value.find((state: { id: string }) => state.id === userStateId)
  }
  return null
}

// store
const contactStore = useContactStore()

// 搜索关键字
const keyword = ref('')

// 选中的联系人 uid 数组
const selectedList = ref<string[]>([])

// 滚动高度计算
const scrollHeight = ref(600)
onMounted(() => {
  scrollHeight.value = window.innerHeight - 180
})

// 搜索逻辑
const doSearch = () => {
  // 这里只是触发响应式，实际过滤逻辑写在 computed 里
}

const filteredContacts = computed(() => {
  if (!keyword.value) return contactStore.contactsList
  return contactStore.contactsList.filter((c) => {
    const name = groupStore.getUserInfo(c.uid)!.name
    if (name) {
      name.includes(keyword.value)
    } else {
      false
    }
  })
})

// 点击发起群聊
const createGroup = async () => {
  console.log('发起群聊，选择的用户：', selectedList.value)
  if (selectedList.value.length < 2) {
    window.$message.success('两个人无法建群哦')
    return
  }
  // TODO: 调用接口 / store 创建群聊
  try {
    const result: any = await ImRequestUtils.createGroup({ uidList: selectedList.value })

    await chatStore.getSessionList(true)

    const resultRoomId = result?.roomId != null ? String(result.roomId) : undefined
    const resultId = result?.id != null ? String(result.id) : undefined

    const matchedSession = chatStore.sessionList.find((session) => {
      const sessionRoomId = String(session.roomId)
      const sessionDetailId = session.detailId != null ? String(session.detailId) : undefined
      return (
        (resultRoomId !== undefined && sessionRoomId === resultRoomId) ||
        (resultId !== undefined && (sessionDetailId === resultId || sessionRoomId === resultId))
      )
    })

    if (matchedSession?.roomId) {
      globalStore.updateCurrentSessionRoomId(matchedSession.roomId)
    }

    resetCreateGroupState()
    window.$message.success('创建群聊成功')
  } catch (error) {
    window.$message.error('创建群聊失败')
  }
}

const resetCreateGroupState = () => {
  selectedList.value = []
  keyword.value = ''
}
</script>

<style lang="scss" scoped></style>
