<template>
  <div>
    <div class="flex gap-2 mx-2">
      <n-input type="text" placeholder="请输入聊天内容" />
      <n-button strong secondary type="primary" @click="() => router.back()">取消</n-button>
    </div>

    <div class="flex flex-col items-center mt-10">
      <div class="mb-8 text-gray">快速搜索聊天内容</div>
      <div class="grid grid-cols-3 gap-4 max-w-xs">
        <n-button text class="text-size-lg text-center" type="primary">群成员</n-button>
        <n-button text class="text-size-lg text-center" type="primary">日期</n-button>
        <n-button
          text
          class="text-size-lg text-center"
          type="primary"
          @click="
            () =>
              router.push({
                name: 'mobileMediaViewer'
              })
          ">
          图片与视频
        </n-button>
        <n-button text class="text-size-lg text-center" type="primary">文件</n-button>
        <n-button text class="text-size-lg text-center" type="primary">链接</n-button>
        <n-button text class="text-size-lg text-center" type="primary">音乐与音频</n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
</script>

<style scoped></style>
