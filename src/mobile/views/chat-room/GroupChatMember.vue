<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-#FAFAFA"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="群成员" />
    </template>

    <template #container="{ changedHeight }">
      <div :style="{ height: changedHeight + 'px' }" class="z-2 absolute flex flex-col overflow-auto min-h-70vh w-full">
        <div class="flex flex-col gap-15px py-15px px-20px">
          <!-- 搜索表单 -->
          <n-form @submit="handleSubmit" class="flex flex-wrap gap-10px">
            <div class="flex flex-1">
              <input
                v-model="formData.keyword"
                placeholder="搜索"
                class="bg-gray-100 text-center border-none w-full rounded-10px h-30px" />
            </div>
          </n-form>

          <div v-if="filteredList.length === 0" class="flex w-full justify-center mt-20px">无数据</div>
          <!-- 群成员 -->
          <n-virtual-list
            v-else
            :style="{ maxHeight: changedHeight - 65 + 'px' }"
            :item-size="42"
            :items="filteredList">
            <template #default="{ item }">
              <div @click="toFriendInfo(item.uid)" :key="item.uid" class="flex items-start" style="height: 52px">
                <div class="flex items-center gap-10px">
                  <n-avatar :size="42" :src="AvatarUtils.getAvatarUrl(item.avatar)" fallback-src="/logo.png" round />
                  <div class="line-clamp-1">
                    {{ item.name }}
                  </div>
                </div>
              </div>
            </template>
          </n-virtual-list>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { debounce } from 'lodash-es'
import type { UserItem } from '@/services/types'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { toFriendInfoPage } from '@/utils/routerUtils'

defineOptions({
  name: 'mobileGroupChatMember'
})

const groupStore = useGroupStore()

const formData = ref({
  keyword: ''
})

const filteredList = ref<UserItem[]>([])

onMounted(() => {
  filteredList.value = groupStore.memberList
})

const toFriendInfo = (uid: string) => toFriendInfoPage(uid)

const search = debounce(() => {
  const kw = formData.value.keyword.trim().toLowerCase()

  if (!kw) {
    // 关键字为空时，直接恢复完整列表
    filteredList.value = groupStore.memberList
    return
  }

  filteredList.value = groupStore.memberList.filter((item) => {
    return (
      item.name?.toLowerCase().includes(kw) ||
      item.account?.toLowerCase().includes(kw) ||
      item.myName?.toLowerCase().includes(kw)
    )
  })
}, 300)

// 利用表单submit识别enter键触发
const handleSubmit = (e: Event) => {
  e.preventDefault()
  search()
}

watch(() => formData.value.keyword, search)
</script>

<style scoped></style>
