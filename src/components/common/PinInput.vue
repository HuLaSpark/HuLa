<template>
  <div class="flex justify-center">
    <div class="flex space-x-2">
      <input
        v-for="(_, index) in digits"
        :key="index"
        type="text"
        maxlength="1"
        autocomplete="off"
        disableautocomplete="off"
        :class="[
          'text-center rounded-8px',
          'size-32px',
          'border-(2px solid transparent)',
          'focus:border-(2px solid #13987f)',
          'focus:outline-none',
          inputClass
        ]"
        v-model="digits[index]"
        @input="handleInput(index)"
        @keydown="handleKeydown($event, index)"
        @paste="handlePaste($event, index)"
        ref="pinInputs" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

const props = defineProps({
  /** PIN码长度 */
  length: {
    type: Number,
    default: 6
  },
  /** 自定义输入框样式 */
  inputClass: {
    type: String,
    default: ''
  },
  /** 初始值 */
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'complete'])

// PIN输入数组
const digits = ref<string[]>(Array(props.length).fill(''))
// 输入框引用
const pinInputs = ref<HTMLInputElement[]>([])

// 计算是否所有输入框都已填写
const isComplete = computed(() => digits.value.every((digit) => digit !== ''))

// 将数组转换为字符串
const pinValue = computed(() => digits.value.join(''))

// 监听输入变化，更新modelValue
watch(pinValue, (newValue) => {
  emit('update:modelValue', newValue)
  if (isComplete.value) {
    emit('complete', newValue)
  }
})

// 监听modelValue变化，更新digits
watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue) {
      const chars = newValue.split('')
      digits.value = Array(props.length)
        .fill('')
        .map((_, i) => chars[i] || '')
    } else {
      digits.value = Array(props.length).fill('')
    }
  },
  { immediate: true }
)

/** 处理PIN输入 */
const handleInput = (index: number) => {
  // 确保只输入一个字符
  if (digits.value[index].length > 1) {
    digits.value[index] = digits.value[index].slice(0, 1)
  }

  // 自动跳转到下一个输入框
  if (digits.value[index] && index < props.length - 1) {
    nextTick(() => {
      pinInputs.value[index + 1].focus()
    })
  }
}

/** 处理PIN键盘事件 */
const handleKeydown = (event: KeyboardEvent, index: number) => {
  // 处理退格键
  if (event.key === 'Backspace') {
    if (!digits.value[index] && index > 0) {
      digits.value[index - 1] = ''
      pinInputs.value[index - 1].focus()
    }
  }
}

/** 处理粘贴事件 */
const handlePaste = (event: ClipboardEvent, index: number) => {
  // 阻止默认粘贴行为
  event.preventDefault()

  // 获取粘贴的文本
  const pastedText = event.clipboardData?.getData('text') || ''

  // 提取数字和字母（验证码通常只包含这些字符）
  const validChars = pastedText.replace(/[^0-9a-zA-Z]/g, '')

  // 从当前索引开始填充
  for (let i = 0; i < validChars.length && i + index < props.length; i++) {
    digits.value[i + index] = validChars[i]
  }

  // 如果填充完毕且还有输入框，聚焦到下一个空输入框
  const nextEmptyIndex = digits.value.findIndex((digit, idx) => digit === '' && idx >= index)
  if (nextEmptyIndex !== -1) {
    nextTick(() => {
      pinInputs.value[nextEmptyIndex].focus()
    })
  }
}

// 提供清空方法
const clear = () => {
  digits.value = Array(props.length).fill('')
  pinInputs.value[0]?.focus()
}

// 提供聚焦方法
const focus = () => {
  pinInputs.value[0]?.focus()
}

// 暴露方法给父组件
defineExpose({
  clear,
  focus
})
</script>
