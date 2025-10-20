<template>
  <div class="h-40 w-full flex flex-col">
    <VoiceRecorder v-show="isVoiceMode" @cancel="handleVoiceCancel" @send="handleVoiceSend" />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['cancel', 'send'])

const isVoiceMode = ref(true)

const handleVoiceCancel = () => {
  emit('cancel')
}

const handleVoiceSend = async (voiceData: any) => {
  emit('send', voiceData)
}
</script>

<style lang="scss" scoped></style>
