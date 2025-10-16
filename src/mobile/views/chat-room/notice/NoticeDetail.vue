<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="公告详情" />
    </template>

    <template>
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px">
          <div class="bg-white flex flex-col shadow p-10px gap-15px text-14px rounded-15px">
            <!-- 头像 -->
            <div
              style="border-bottom: 1px solid; border-color: #ebebeb"
              class="grid grid-cols-[2.2rem_1fr_4rem] items-start px-2 py-3 gap-1 active:bg-#DEEDE7 active:rounded-10px transition-colors cursor-pointer">
              <!-- 头像：单独居中 -->
              <div class="self-center h-38px">
                <n-badge>
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                </n-badge>
              </div>

              <!-- 中间：两行内容 -->
              <div class="truncate pl-4 flex gap-10px flex-col">
                <div class="text-14px leading-tight font-bold flex-1 truncate text-#333 truncate">卡仔</div>
                <div class="text-12px text-#333 truncate">2025年8月13日 18:58</div>
              </div>

              <!-- 时间：靠顶 -->
              <div class="justify-self-end self-center text-12px text-right flex gap-1 items-center justify-right">
                <span class="text-#13987F">3人已读</span>
              </div>
            </div>
            <div class="flex">
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。 静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。 静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
              举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白
              床前明月光，疑是地上霜。 举头望明月，低头思故乡。
            </div>
            <div class="flex justify-center mb-10px">
              <div
                @click="goToNoticeEdit"
                v-if="true"
                style="
                  background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
                  border-radius: 30px;
                  padding: 10px 30px;
                  color: white;
                  font-weight: 500;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                  text-align: center;
                  display: inline-block;
                ">
                编辑公告
              </div>
              <div
                v-if="false"
                style="
                  background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
                  border-radius: 30px;
                  padding: 10px 30px;
                  color: white;
                  font-weight: 500;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                  text-align: center;
                  display: inline-block;
                ">
                已确认
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import router from '@/router'

defineOptions({
  name: 'mobileChatNoticeDetail'
})

const goToNoticeEdit = () => {
  router.push(`/mobile/chatRoom/notice/edit/12312`)
}
</script>

<style scoped></style>
