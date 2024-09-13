<template>
  <n-scrollbar style="max-height: 290px" class="p-[14px_14px_0_14px] box-border w-450px h-290px select-none">
    <transition name="fade" mode="out-in" appear>
      <!-- 默认表情页面 -->
      <div v-if="activeIndex === 0">
        <!-- 最近使用 -->
        <div v-if="emojiRef.historyList?.length > 0">
          <span class="text-12px text-[--text-color]">最近使用</span>
          <n-flex align="center" class="mt-12px mb-12px">
            <n-flex
              align="center"
              justify="center"
              class="emoji-item"
              v-for="(item, index) in [...new Set(emojiRef.historyList)]"
              :key="index"
              @click.stop="chooseEmoji(item)">
              {{ item }}
            </n-flex>
          </n-flex>
        </div>

        <!-- 表情 -->
        <div v-for="items in emojiObj" :key="items?.name">
          <template v-if="items?.name && items.value?.length">
            <span class="text-12px text-[--text-color]">{{ items.name }}</span>
            <n-flex align="center" class="mt-12px mb-12px">
              <n-flex
                align="center"
                justify="center"
                class="emoji-item"
                v-for="(item, index) in items.value"
                :key="index"
                @click.stop="chooseEmoji(item)">
                {{ item }}
              </n-flex>
            </n-flex>
          </template>
        </div>
      </div>
    </transition>

    <transition name="fade" mode="out-in">
      <!-- 我的喜欢页面 -->
      <div v-if="activeIndex === 1">
        <span>暂无实现</span>
      </div>
    </transition>
  </n-scrollbar>

  <!-- 底部选项 -->
  <n-flex align="center" class="expression-item">
    <svg :class="{ active: activeIndex === 0 }" @click="activeIndex = 0">
      <use href="#face"></use>
    </svg>
    <svg :class="{ active: activeIndex === 1 }" @click="activeIndex = 1"><use href="#heart"></use></svg>
  </n-flex>
</template>
<script setup lang="ts">
import { getAllTypeEmojis } from '@/utils/Emoji.ts'
import { useHistoryStore } from '@/stores/history.ts'

type EmojiType = {
  expressionEmojis: EmojiItem
  animalEmojis: EmojiItem
  gestureEmojis: EmojiItem
}
interface EmojiItem {
  name: string
  value: any[]
}

const { emoji, setEmoji } = useHistoryStore()
const activeIndex = ref(0)

const emit = defineEmits(['emojiHandle'])
const props = defineProps<{
  all: boolean
}>()

const res = getAllTypeEmojis()

const emojiObj = ref<EmojiType>({
  expressionEmojis: res.expressionEmojis,
  animalEmojis: res.animalEmojis,
  gestureEmojis: res.gestureEmojis
} as EmojiType)

if (props.all) {
  emojiObj.value = res
} else {
  emojiObj.value = {
    expressionEmojis: res.expressionEmojis,
    animalEmojis: res.animalEmojis,
    gestureEmojis: res.gestureEmojis
  } as EmojiType
}
const emojiRef = reactive<{
  chooseItem: string
  historyList: string[]
  allEmoji: EmojiType
}>({
  chooseItem: '',
  historyList: emoji,
  allEmoji: emojiObj.value
})

/**
 * 选择表情
 * @param item
 */
const chooseEmoji = (item: string) => {
  emojiRef.chooseItem = item
  // 如果已经存在于历史记录中，则先移除
  const index = emojiRef.historyList.indexOf(item)
  if (index !== -1) {
    emojiRef.historyList.splice(index, 1)
  }
  emojiRef.historyList.unshift(item)
  if (emojiRef.historyList.length > 18) {
    emojiRef.historyList.splice(18) // 保留前18个元素
  }
  setEmoji([...emojiRef.historyList])
  emit('emojiHandle', item)
  return item
}
</script>

<style lang="scss">
/**! 修改naive-ui滚动条的间距 */
.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical {
  right: 0;
}
.emoji-item {
  @apply size-36px cursor-pointer text-26px hover:bg-[--emoji-hover] rounded-8px;
}
.expression-item {
  @apply h-50px w-full p-[0_14px];
  border-top: 1px solid var(--line-color);
  svg {
    @apply size-26px p-8px rounded-8px;
    &:not(.active):hover {
      background-color: var(--emoji-hover);
      cursor: pointer;
    }
  }
}
.active {
  background-color: #13987f;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
