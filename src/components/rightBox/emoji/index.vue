<template>
  <n-scrollbar style="max-height: 335px" class="rounded-8px p-14px box-border w-450px h-340px">
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
  </n-scrollbar>
</template>
<script setup lang="ts">
import { getAllTypeEmojis } from '@/utils/Emoji.ts'
import { history } from '@/stores/history.ts'
import { storeToRefs } from 'pinia'

type EmojiType = {
  expressionEmojis: EmojiItem
  animalEmojis: EmojiItem
  gestureEmojis: EmojiItem
}
interface EmojiItem {
  name: string
  value: any[]
}

const historyStore = history()
const { emoji } = storeToRefs(historyStore)

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
  historyList: emoji.value,
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
  historyStore.setEmoji([...emojiRef.historyList]) // 不再使用 Set 去重
  emit('emojiHandle', item)
  return item
}
</script>

<style lang="scss">
/*! 修改naive-ui滚动条的间距 */
.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical {
  right: 0;
}
.emoji-item {
  @apply size-36px cursor-pointer text-26px hover:bg-[--emoji-hover] rounded-8px;
}
</style>
