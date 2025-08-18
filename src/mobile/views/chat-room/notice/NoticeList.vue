<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="群公告" />
    </template>

    <template #container="{ height }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: height + 'px' }" class="z-2 absolute flex flex-col overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px">
          <RecycleScroller :items="testData" :item-size="15" key-field="id" class="flex flex-col gap-15px">
            <template #default="{ item }">
              <!-- 公告内容块 -->
              <div @click="goToNoticeDetail(item.id)" class="shadow flex p-15px bg-white rounded-10px">
                <div class="flex flex-col w-full gap-10px">
                  <!-- 时间/阅读人数 -->
                  <div class="flex items-center justify-between text-14px">
                    <span class="flex gap-5px">
                      <span class="text-#717171">发布人:</span>
                      <span class="text-black">卡仔</span>
                    </span>
                    <span
                      v-if="item.isTop"
                      class="text-#13987F rounded-15px px-7px py-5px text-12px"
                      style="border: 1px solid; border-color: #13987f">
                      置顶
                    </span>
                  </div>
                  <!-- 公告内容 -->
                  <div class="text-14px line-clamp-3 line-height-20px text-#717171 max-h-60px">
                    静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。 静夜思·李白 床前明月光，疑是地上霜。
                    举头望明月，低头思故乡。 静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。 静夜思·李白
                    床前明月光，疑是地上霜。 举头望明月，低头思故乡。
                  </div>

                  <div class="flex items-center justify-between text-12px">
                    <span class="flex gap-5px text-#717171">2025年8月13日 17:25</span>
                    <span class="text-#13987F">3人已读</span>
                  </div>
                </div>
              </div>
            </template>
          </RecycleScroller>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { RecycleScroller } from 'vue-virtual-scroller'
import router from '@/router'

const testData = computed(() => {
  const tempList = []
  for (let i = 0; i < 200; i++) {
    tempList.push({
      id: i,
      msg: i,
      isTop: i % 15 === 0
    })
  }
  const topList = tempList.filter((item) => item.isTop)
  const notTopList = tempList.filter((item) => !item.isTop)

  const sortedList = topList.concat(notTopList)
  return sortedList
})

const goToNoticeDetail = (id: string) => {
  // 跳转到公告编辑页面
  console.log(`跳转到公告编辑页面，公告ID: ${id}`)
  router.push(`/mobile/chatRoom/notice/detail/${id}`)
}
</script>

<style scoped></style>
