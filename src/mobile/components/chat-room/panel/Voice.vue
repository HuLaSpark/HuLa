<template>
  <div class="h-40 w-full flex flex-col">
    <VoiceRecorder v-show="isVoiceMode" @cancel="handleVoiceCancel" @send="handleVoiceSend" />
  </div>
</template>

<script setup lang="ts">
const isVoiceMode = ref(true)

const handleVoiceCancel = () => {
  isVoiceMode.value = false
}

const handleVoiceSend = async (voiceData: any) => {
  voiceData
  isVoiceMode.value = false
}
</script>

<style lang="scss" scoped></style>
