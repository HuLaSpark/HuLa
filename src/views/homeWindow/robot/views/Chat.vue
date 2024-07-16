<template>
  <!-- 主体内容 -->
  <!--  // TODO 考虑是否需要添加一个欢迎页面，而不是直接使用聊天窗口 (nyh -> 2024-07-01 10:44:14)-->
  <main>
    <div
      style="box-shadow: var(--shadow-enabled) 4px 4px var(--box-shadow-color)"
      class="flex truncate p-[14px_20px] justify-between items-center gap-50px">
      <n-flex :size="10" vertical class="truncate">
        <p
          v-if="!isEdit"
          @click="handleEdit"
          class="text-(22px [--chat-text-color]) truncate font-bold hover:underline cursor-pointer">
          {{ currentChat.title }}
        </p>
        <n-input
          v-else
          @blur="handleBlur"
          ref="inputInstRef"
          v-model:value="currentChat.title"
          clearable
          placeholder="输入标题"
          type="text"
          size="tiny"
          style="width: 200px"
          class="h-22px lh-22px rounded-6px">
        </n-input>
        <p class="text-(14px #707070)">共0条对话</p>
      </n-flex>

      <n-flex class="min-w-fit">
        <div class="right-btn" @click="handleEdit">
          <svg><use href="#edit"></use></svg>
        </div>

        <div class="right-btn">
          <svg><use href="#Sharing"></use></svg>
        </div>
      </n-flex>
    </div>
    <div class="h-1px bg-[--line-color]"></div>

    <!-- 聊天信息框 -->
    <div class="w-full p-[28px_16px] box-border" style="height: calc(100vh - 300px)">
      <n-flex :size="6">
        <n-avatar
          class="rounded-8px"
          src="https://img1.baidu.com/it/u=3613958228,3522035000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500" />
        <n-flex vertical justify="space-between">
          <p class="text-(12px [--chat-text-color])">GPT-4</p>

          <!--  气泡样式  -->
          <ContextMenu>
            <div style="white-space: pre-wrap" class="bubble select-text">
              <span v-html="'你好，我是GPT4机器人，很高兴为您服务。'"></span>
            </div>
          </ContextMenu>
        </n-flex>
      </n-flex>
    </div>

    <div class="h-1px bg-[--line-color]"></div>
    <!-- 下半部分输入框以及功能栏 -->
    <n-flex
      vertical
      :size="6"
      style="box-shadow: var(--shadow-enabled) -4px 4px 0 rgba(0, 0, 0, 0.05)"
      class="size-full p-[14px_22px] box-border">
      <n-flex :size="26" class="options">
        <n-popover v-for="(item, index) in features" :key="index" trigger="hover" :show-arrow="false" placement="top">
          <template #trigger>
            <svg><use :href="`#${item.icon}`"></use></svg>
          </template>
          <p>{{ item.label }}</p>
        </n-popover>
      </n-flex>

      <div class="flex flex-col items-end gap-6px">
        <MsgInput />
      </div>
    </n-flex>
  </main>
</template>
<script setup lang="ts">
import MsgInput from '@/components/rightBox/MsgInput.vue'
import Mitt from '@/utils/Bus.ts'
import { InputInst } from 'naive-ui'

/** 是否是编辑模式 */
const isEdit = ref(false)
const inputInstRef = ref<InputInst | null>(null)
/** 当前聊天的标题和id */
const currentChat = ref({
  id: 0,
  title: ''
})
const features = ref([
  {
    icon: 'SmilingFace',
    label: '所有人物'
  },
  {
    icon: 'MagicWand',
    label: '快捷指令'
  },
  {
    icon: 'explosion',
    label: '增强插件'
  },
  {
    icon: 'robot-action',
    label: 'GPT4'
  }
])

const handleBlur = () => {
  isEdit.value = false
  if (currentChat.value.title === '') {
    currentChat.value.title = '新的聊天'
  }
  Mitt.emit('update-chat-title', { title: currentChat.value.title, id: currentChat.value.id })
}

const handleEdit = () => {
  isEdit.value = true
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

onMounted(() => {
  Mitt.on('chat-active', (e) => {
    const { title, id } = e
    currentChat.value.title = title
    currentChat.value.id = id
  })
})
</script>
<style scoped lang="scss">
@import '@/styles/scss/chat-main';
.right-btn {
  @apply size-fit border-(1px solid [--line-color]) cursor-pointer bg-[--chat-bt-color] color-[--chat-text-color] rounded-8px custom-shadow p-[10px_11px];
  svg {
    @apply size-18px;
  }
}
.options {
  svg {
    @apply size-24px cursor-pointer outline-none;
  }
}
</style>
