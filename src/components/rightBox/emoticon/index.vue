<template>
  <n-scrollbar
    style="max-height: 290px"
    class="p-[14px_14px_0_14px] box-border w-460px h-290px select-none"
    @scroll="activeMenuId = ''">
    <transition name="fade" mode="out-in">
      <div :key="activeIndex" class="emoji-content">
        <!-- 最近使用 -->
        <div v-if="activeIndex === 0">
          <div v-if="emojiRef.historyList?.length > 0">
            <span v-if="!checkIsUrl(emojiRef.historyList[0])" class="text-12px text-[--text-color]">最近使用</span>
            <n-flex align="center" class="mt-12px mb-12px">
              <n-flex
                align="center"
                justify="center"
                class="emoji-item"
                v-for="(item, index) in [...new Set(emojiRef.historyList)].filter((emoji) => !checkIsUrl(emoji))"
                :key="index"
                @click.stop="chooseEmoji(item)">
                {{ item }}
              </n-flex>
            </n-flex>
          </div>

          <!-- emoji表情 -->
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

        <!-- 表情包系列 -->
        <div v-else-if="currentSeries">
          <span class="text-12px text-[--text-color]">{{ currentSeries.name }}</span>
          <n-flex align="center" class="mx-6px my-12px">
            <n-flex
              align="center"
              justify="center"
              class="emoji-item"
              v-for="(item, index) in currentSeries.emojis"
              :key="index"
              @click.stop="chooseEmoji(item.url, 'url')">
              <n-image
                :title="item.name"
                preview-disabled
                :src="item.url"
                class="size-full object-contain rounded-8px transition duration-300 ease-in-out transform-gpu" />
            </n-flex>
          </n-flex>
        </div>

        <!-- 我的喜欢页面 -->
        <div v-else>
          <div v-if="emojiStore.emojiList?.length > 0">
            <span class="text-12px text-[--text-color]">我的表情包</span>
            <n-flex align="center" class="mx-6px my-12px">
              <n-flex
                align="center"
                justify="center"
                class="emoji-item py-4px"
                v-for="(item, index) in emojiStore.emojiList"
                :key="index"
                @click.stop="chooseEmoji(item.expressionUrl, 'url')">
                <n-popover
                  trigger="manual"
                  :show="activeMenuId === item.id"
                  :duration="300"
                  :show-arrow="false"
                  placement="top"
                  @clickoutside="activeMenuId = ''">
                  <template #trigger>
                    <n-image
                      width="60"
                      height="60"
                      preview-disabled
                      :src="item.expressionUrl"
                      @contextmenu.prevent="handleContextMenu($event, item)"
                      class="size-full object-contain rounded-8px transition duration-300 ease-in-out transform-gpu" />
                  </template>
                  <n-button quaternary size="tiny" @click.stop="deleteMyEmoji(item.id)">
                    删除
                    <template #icon>
                      <n-icon>
                        <svg><use href="#delete"></use></svg>
                      </n-icon>
                    </template>
                  </n-button>
                </n-popover>
              </n-flex>
            </n-flex>
          </div>
          <span v-else>暂无表情包</span>
        </div>
      </div>
    </transition>
  </n-scrollbar>

  <!-- 底部选项 -->
  <n-flex align="center" class="expression-item">
    <n-scrollbar x-scrollable class="scrollbar-container">
      <div class="series-container">
        <template v-for="item in tabList" :key="item.id">
          <!-- 图标类型选项 -->
          <svg
            class="series-icon"
            v-if="item.type === 'icon'"
            :class="{ active: activeIndex === item.id }"
            @click="handleTabChange(item.id)">
            <use :href="item.icon"></use>
          </svg>

          <!-- 系列类型选项 -->
          <div
            v-else
            :class="{ active: activeIndex === item.id }"
            @click="selectSeries(item.id - 1)"
            class="series-icon">
            <img :title="item.name" :src="item.cover" class="w-full h-full object-contain" />
          </div>
        </template>
      </div>
    </n-scrollbar>
  </n-flex>
</template>

<script setup lang="ts">
import { getAllTypeEmojis } from '@/utils/Emoji.ts'
import { useHistoryStore } from '@/stores/history.ts'
import { useEmojiStore } from '@/stores/emoji'
import HulaEmojis from 'hula-emojis'

type EmojiType = {
  expressionEmojis: EmojiItem
  animalEmojis: EmojiItem
  gestureEmojis: EmojiItem
}

type TabItem = {
  id: number
  type: 'icon' | 'series'
  name: string
  icon?: string
  cover?: string
}

interface EmojiItem {
  name: string
  value: any[]
}

const emit = defineEmits(['emojiHandle'])
const props = defineProps<{
  all: boolean
}>()
const { emoji, setEmoji, lastEmojiTabIndex, setLastEmojiTabIndex } = useHistoryStore()
const emojiStore = useEmojiStore()
/** 获取米游社的表情包 */
const emojisBbs = HulaEmojis.MihoyoBbs
const activeIndex = ref(lastEmojiTabIndex)
const currentSeriesIndex = ref(0)
// 设置当前右键点击的表情项ID
const activeMenuId = ref('')

// 生成选项卡数组
const tabList = computed<TabItem[]>(() => {
  const baseItems: TabItem[] = [
    { id: 0, type: 'icon', name: 'emoji表情', icon: '#face' },
    { id: -1, type: 'icon', name: '我喜欢的', icon: '#heart' }
  ]

  // 添加米游社表情包系列
  const seriesItems: TabItem[] = emojisBbs.series.map((series, index) => ({
    id: index + 1,
    type: 'series',
    name: series.name,
    cover: series.cover
  }))

  return [...baseItems, ...seriesItems]
})

const currentSeries = computed(() => (activeIndex.value > 0 ? emojisBbs.series[activeIndex.value - 1] : null))

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
 * 检查字符串是否为URL
 */
const checkIsUrl = (str: string) => {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

/**
 * 处理右键菜单点击事件
 * @param event 鼠标事件
 * @param item 表情项
 */
const handleContextMenu = (event: MouseEvent, item: any) => {
  // 阻止原生右键菜单
  event.preventDefault()
  activeMenuId.value = item.id
}

/**
 * 删除我的表情包
 * @param id 表情包ID
 */
const deleteMyEmoji = async (id: string) => {
  try {
    await emojiStore.deleteEmoji(id)
    window.$message.success('删除表情成功')
    // 关闭菜单
    activeMenuId.value = ''
  } catch (error) {
    console.error('删除表情失败:', error)
    window.$message.error('删除表情失败')
  }
}

/**
 * 选择表情
 * @param item
 */
const chooseEmoji = (item: string, type: 'emoji' | 'url' = 'emoji') => {
  emojiRef.chooseItem = item

  // 只有非URL的表情（emoji）才记录到历史记录中
  if (type === 'emoji') {
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
  }

  // 传递表情类型信息，URL类型的表情作为EMOJI类型处理
  emit('emojiHandle', item, type === 'url' ? 'emoji-url' : 'emoji')
  return item
}

/**
 * 切换表情类型标签
 */
const handleTabChange = (index: number) => {
  activeIndex.value = index
  if (index === 1) {
    currentSeriesIndex.value = 0
  }
  setLastEmojiTabIndex(index)
}

/**
 * 选择表情包系列
 */
const selectSeries = (index: number) => {
  currentSeriesIndex.value = index
  activeIndex.value = index + 1
  setLastEmojiTabIndex(index + 1)
}

onMounted(async () => {
  // try {
  //   const file = await create('emoji-test.txt', { baseDir: BaseDirectory.App })
  //   await file.write(new TextEncoder().encode('Hello world'))
  //   await file.close()
  // } catch (error) {
  //   console.error('Error handling file:', error)
  // }
  // 获取我的表情包列表
  await emojiStore.getEmojiList()
  // 如果上次选择的是表情包系列，设置正确的currentSeriesIndex
  if (activeIndex.value > 0) {
    currentSeriesIndex.value = activeIndex.value - 1
  }
})
</script>

<style lang="scss">
/**! 修改naive-ui滚动条的间距 */
.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--vertical,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--vertical {
  right: 0;
}

.n-scrollbar > .n-scrollbar-rail.n-scrollbar-rail--horizontal > .n-scrollbar-rail__scrollbar,
.n-scrollbar + .n-scrollbar-rail.n-scrollbar-rail--horizontal > .n-scrollbar-rail__scrollbar {
  top: 4px;
}

.emoji-item {
  @apply cursor-pointer;

  // 默认表情的样式
  &:not(:has(.n-image)) {
    @apply size-36px text-26px hover:bg-[--emoji-hover] rounded-8px;
  }

  // 米游社表情包的样式
  &:has(.n-image) {
    @apply size-60px;
    &:hover .n-image {
      @apply hover:scale-116 bg-[--emoji-hover] rounded-8px;
    }
  }
}

.expression-item {
  @apply h-50px w-full p-[0_14px] box-border select-none;
  border-top: 1px solid var(--line-color);

  .scrollbar-container {
    @apply w-full max-w-420px;
    overflow-x: auto;
  }

  .series-container {
    @apply flex items-center;
    white-space: nowrap;
    width: max-content;

    svg {
      @apply size-26px my-4px p-6px rounded-8px mr-12px flex-shrink-0 inline-flex items-center justify-center;
      &:not(.active):hover {
        background-color: var(--emoji-hover);
        cursor: pointer;
      }
    }
  }

  .series-icon {
    @apply size-30px my-4px p-4px rounded-8px mr-12px flex-shrink-0 inline-flex items-center justify-center;
    &:not(.active):hover {
      background-color: var(--emoji-hover);
      cursor: pointer;
    }

    &.active {
      background-color: var(--emoji-active-color) !important;
    }

    &:last-child {
      margin-right: 0;
    }
  }
}

.emoji-content {
  position: relative;
  width: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
