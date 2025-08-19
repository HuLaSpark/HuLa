<template>
  <div class="flex flex-col">
    <div
      :class="props.message.type === 'reply' || props.message.type === 'comment' ? [''] : ['custom-border-b-1']"
      class="w-full py-5px grid grid-cols-[40px_1fr_40px] gap-10px items-center">
      <div><n-avatar :size="40" src="#" fallback-src="/logo.png" round /></div>
      <div class="flex flex-col gap-10px">
        <div class="text-14px text-#333 font-bold">苏小研</div>
        <div class="text-12px text-#999">消息内容：{{ props.message.content }}</div>
      </div>
      <div class="relative w-full aspect-square rounded-10px mask-rounded">
        <img
          src="https://img-baofun.zhhainiao.com/pcwallpaper_ugc/static/705b5a8db5ffef241846340e11f1c9fd.jpg?x-oss-process=image%2fresize%2cm_lfit%2cw_3840%2ch_2160"
          class="absolute inset-0 w-full h-full object-cover rounded-10px" />
      </div>
    </div>
    <div
      class="mt-5px flex justify-end pb-10px"
      :class="props.message.type === 'reply' || props.message.type === 'comment' ? ['custom-border-b-1'] : ['']"
      v-if="props.message.type === 'reply' || props.message.type === 'comment'">
      <div class="bg-#EFF5F4 text-14px rounded-25px w-82px line-height-32px text-center">回复</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  message: {
    type: Object as PropType<{
      id: number
      content: string
      type: 'follow' | 'like' | 'reply' | 'comment' | 'thumbs' | 'system'
    }>,
    required: true
  }
})
</script>

<style lang="scss" scoped>
.custom-border-b-1 {
  border-bottom: 1px solid;
  border-color: #d9d9d9;
}
</style>
