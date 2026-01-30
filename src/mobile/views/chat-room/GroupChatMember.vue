<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar :isOfficial="false" border :hidden-right="true" room-name="群成员" />
    </template>

    <template #container>
      <div class="flex flex-col overflow-auto h-full">
        <div class="flex flex-col flex-1 gap-15px py-15px px-20px">
          <!-- 搜索表单 -->
          <n-form @submit="handleSubmit" class="flex flex-wrap gap-10px">
            <div class="flex flex-1">
              <n-input
                v-model:value="formData.keyword"
                placeholder="搜索"
                size="medium"
                class="text-center border-none w-full rounded-10px" />
            </div>
          </n-form>

          <div class="relative flex flex-1">
            <div ref="measure" class="flex absolute w-full h-full top-0 left-0 z-1"></div>
            <div class="absolute z-10 w-full">
              <div v-if="filteredList.length === 0" class="flex w-full justify-center mt-20px">无数据</div>
              <n-virtual-list
                v-else
                :style="{ height: virtualScrollerHeight + 'px', width: '100%' }"
                :item-size="42"
                :items="filteredList">
                <template #default="{ item }">
                  <div @click="toFriendInfo(item.uid)" :key="item.uid" class="flex items-start" style="height: 52px">
                    <div class="flex items-center gap-10px">
                      <n-avatar
                        :size="42"
                        :src="AvatarUtils.getAvatarUrl(item.avatar)"
                        fallback-src="/logo.png"
                        round />
                      <n-text class="line-clamp-1">
                        {{ item.name }}
                      </n-text>
                    </div>
                  </div>
                </template>
              </n-virtual-list>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import type { UserItem } from '@/services/types'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { toFriendInfoPage } from '@/utils/RouterUtils'

const measure = ref(null)

const virtualScrollerHeight = ref(0)

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
  // TODO 增加observer来专门监听measure，然后改变virtualScrollerHeight

  if (measure.value) {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        virtualScrollerHeight.value = entry.contentRect.height
        console.log('高度：', virtualScrollerHeight.value)
      }
    })
    observer.observe(measure.value)

    // 组件卸载时记得断开
    onBeforeUnmount(() => {
      observer.disconnect()
    })
  }
})

const toFriendInfo = (uid: string) => toFriendInfoPage(uid)

const search = useDebounceFn(() => {
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
