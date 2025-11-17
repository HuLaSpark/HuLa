<template>
  <n-scrollbar
    style="max-height: 290px"
    :class="[isMobile() ? 'h-15rem w-auto' : 'h-290px w-460px']"
    class="p-[14px_14px_0_14px] box-border select-none"
    @scroll="activeMenuId = ''">
    <transition name="fade" mode="out-in">
      <div :key="activeIndex" class="emoji-content">
        <!-- 最近使用 -->
        <div v-if="activeIndex === 0">
          <div v-if="emojiRef.historyList?.length > 0">
            <span v-if="!checkIsUrl(emojiRef.historyList[0])" class="text-12px text-[--text-color]">最近使用</span>
            <n-flex align="center" :class="isMobile() ? 'emoji-grid-mobile mt-12px mb-12px' : 'mt-12px mb-12px'">
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
              <n-flex align="center" :class="isMobile() ? 'emoji-grid-mobile my-12px' : 'my-12px'">
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
          <n-flex align="center" :class="isMobile() ? 'emoji-pack-grid-mobile mx-6px my-12px' : 'mx-6px my-12px'">
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
            <n-flex align="center" :class="isMobile() ? 'emoji-pack-grid-mobile mx-6px my-12px' : 'mx-6px my-12px'">
              <n-flex
                align="center"
                justify="center"
                class="emoji-item py-4px"
                v-for="(item, index) in reversedEmojiList"
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
                    <div
                      class="emoji-visibility-wrapper size-full"
                      :ref="(el) => registerEmojiVisibilityTarget(el, item)">
                      <n-image
                        width="60"
                        height="60"
                        preview-disabled
                        :src="emojiLocalPathMap[item.id] || item.expressionUrl"
                        @contextmenu.prevent="handleContextMenu($event, item)"
                        class="size-full object-contain rounded-8px transition duration-300 ease-in-out transform-gpu" />
                    </div>
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
import type { ComponentPublicInstance } from 'vue'
import { convertFileSrc } from '@tauri-apps/api/core'
import { appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { BaseDirectory, exists, writeFile } from '@tauri-apps/plugin-fs'
import HulaEmojis from 'hula-emojis'
import type { EmojiItem as EmojiListItem } from '@/services/types'
import { useIntersectionTaskQueue } from '@/hooks/useIntersectionTaskQueue'
import { useEmojiStore } from '@/stores/emoji'
import { useHistoryStore } from '@/stores/history.ts'
import { useUserStore } from '@/stores/user'
import { getAllTypeEmojis } from '@/utils/Emoji.ts'
import { md5FromString } from '@/utils/Md5Util'
import { detectRemoteFileType, getUserEmojiDir } from '@/utils/PathUtil'
import { isMobile } from '@/utils/PlatformConstants'

type TabItem = {
  id: number
  type: 'icon' | 'series'
  name: string
  icon?: string
  cover?: string
}

interface EmojiGroupItem {
  name: string
  value: any[]
}

type EmojiType = {
  expressionEmojis: EmojiGroupItem
  animalEmojis: EmojiGroupItem
  gestureEmojis: EmojiGroupItem
}

type EmojiCacheEnvironment = {
  uid: string
  emojiDir: string
  baseDir: BaseDirectory
  baseDirPath: string
}

const emit = defineEmits(['emojiHandle'])
const props = defineProps<{
  all: boolean
}>()
const { emoji, setEmoji, lastEmojiTabIndex, setLastEmojiTabIndex } = useHistoryStore()
const emojiStore = useEmojiStore()
const userStore = useUserStore()
/** 获取米游社的表情包 */
const emojisBbs = HulaEmojis.MihoyoBbs
const activeIndex = ref(lastEmojiTabIndex)
const currentSeriesIndex = ref(0)
// 设置当前右键点击的表情项ID
const activeMenuId = ref('')
const emojiLocalPathMap = ref<Record<string, string>>({})
// 仅在元素可见时调度本地缓存，阈值随端变化
const {
  observe: observeEmojiVisibility,
  unobserve: unobserveEmojiVisibility,
  disconnect: disconnectEmojiObserver
} = useIntersectionTaskQueue({
  threshold: isMobile() ? 0.2 : 0.35,
  rootMargin: isMobile() ? '24px 0px 24px' : '40px 0px 80px'
})
const emojiVisibilityTargetMap = new Map<string, Element>()
const cachingEmojiIds = new Set<string>()
const emojiCacheEnv = ref<EmojiCacheEnvironment | null>(null)
const emojiWorkerUrl = new URL('../../../workers/imageDownloader.ts', import.meta.url)
let emojiCacheWorker: Worker | null = null
const emojiExtCache = new Map<string, string>()

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

// 将"我的表情包"列表倒序显示
const reversedEmojiList = computed(() => {
  return [...emojiStore.emojiList].reverse()
})

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

// 只在支持 window/Worker 的环境下按需创建 emoji 缓存 Worker，并在全局复用
const getEmojiWorker = () => {
  if (typeof window === 'undefined') {
    return null
  }
  if (!emojiCacheWorker) {
    emojiCacheWorker = new Worker(emojiWorkerUrl)
  }
  return emojiCacheWorker
}

const getEmojiBaseDir = () => (isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource)
const getEmojiBaseDirPath = async () => (isMobile() ? await appDataDir() : await resourceDir())

// 兜底从 URL 字符串中推断扩展名，避免远端类型识别失败
const inferExtFromUrl = (url: string) => {
  try {
    const { pathname } = new URL(url)
    const index = pathname.lastIndexOf('.')
    if (index !== -1) {
      return pathname.slice(index + 1)
    }
  } catch {
    const clean = url.split('?')[0]
    const index = clean.lastIndexOf('.')
    if (index !== -1) {
      return clean.slice(index + 1)
    }
  }
  return null
}

// 优先使用 detectRemoteFileType 获取真实扩展名，否则回退到 URL 规则推断并缓存结果
const resolveEmojiExtension = async (url: string) => {
  if (emojiExtCache.has(url)) {
    return emojiExtCache.get(url)!
  }
  let ext = ''
  try {
    const info = await detectRemoteFileType({ url, fileSize: 1 })
    ext = info?.ext || ''
  } catch (error) {
    console.warn('识别表情类型失败:', error)
  }
  if (!ext) {
    ext = inferExtFromUrl(url) || 'png'
  }
  emojiExtCache.set(url, ext)
  return ext
}

// 使用 Emoji URL 的 md5 + 扩展名生成稳定文件名，避免重复下载
const buildEmojiFileName = async (url: string) => {
  const hash = await md5FromString(url)
  const ext = await resolveEmojiExtension(url)
  return `${hash}.${ext}`
}

// 将绝对路径转换为 Tauri 可访问的 file URI，并写入响应式映射
const setEmojiLocalPath = (id: string, absolutePath: string) => {
  emojiLocalPathMap.value = {
    ...emojiLocalPathMap.value,
    [id]: convertFileSrc(absolutePath)
  }
}

const ensureEmojiCacheEnvironment = async () => {
  const uid = userStore.userInfo?.uid
  if (!uid) {
    return null
  }
  if (emojiCacheEnv.value?.uid === uid) {
    return emojiCacheEnv.value
  }
  try {
    const [emojiDir, baseDirPath] = await Promise.all([getUserEmojiDir(uid), getEmojiBaseDirPath()])
    const env: EmojiCacheEnvironment = {
      uid,
      emojiDir,
      baseDir: getEmojiBaseDir(),
      baseDirPath
    }
    emojiCacheEnv.value = env
    return env
  } catch (error) {
    console.error('初始化表情缓存目录失败:', error)
    return null
  }
}

const releaseEmojiObserver = (id: string) => {
  const target = emojiVisibilityTargetMap.get(id)
  if (target) {
    unobserveEmojiVisibility(target)
    emojiVisibilityTargetMap.delete(id)
  }
}

const resolveVisibilityElement = (target: Element | ComponentPublicInstance | null) => {
  if (!target) {
    return null
  }
  if (target instanceof Element) {
    return target
  }
  const el = target.$el
  return el instanceof Element ? el : null
}

// 首选借助 Worker 下载以隔离网络 I/O；若无 Worker（如 SSR）则回退到 fetch
const downloadEmojiFile = async (url: string) => {
  const worker = getEmojiWorker()
  if (!worker) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`下载表情失败: ${response.status} ${response.statusText}`)
    }
    return new Uint8Array(await response.arrayBuffer())
  }

  return await new Promise<Uint8Array>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<any>) => {
      const data = event.data
      if (!data || data.url !== url) {
        return
      }
      cleanup()
      if (data.success && data.buffer) {
        resolve(new Uint8Array(data.buffer))
      } else {
        reject(new Error(data.error || '下载表情失败'))
      }
    }

    const handleError = (event: ErrorEvent) => {
      cleanup()
      reject(new Error(event.message))
    }

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage({ url })
  })
}

const cleanupLocalEmojiMap = (validIds: string[]) => {
  const validSet = new Set(validIds)
  const nextMap = { ...emojiLocalPathMap.value }
  let changed = false
  Object.keys(nextMap).forEach((id) => {
    if (!validSet.has(id)) {
      delete nextMap[id]
      changed = true
    }
  })
  if (changed) {
    emojiLocalPathMap.value = nextMap
  }
}

const cleanupEmojiObservers = (validIds: string[]) => {
  const validSet = new Set(validIds)
  emojiVisibilityTargetMap.forEach((el, id) => {
    if (!validSet.has(id)) {
      unobserveEmojiVisibility(el)
      emojiVisibilityTargetMap.delete(id)
    }
  })
}

// 只有当收藏项真正出现在视口内时才执行缓存下载
const handleEmojiVisibility = async (emojiItem: EmojiListItem) => {
  const id = emojiItem.id
  if (emojiLocalPathMap.value[id] || cachingEmojiIds.has(id)) {
    releaseEmojiObserver(id)
    return
  }
  const env = await ensureEmojiCacheEnvironment()
  if (!env) {
    return
  }
  cachingEmojiIds.add(id)
  try {
    await ensureEmojiCached(emojiItem, env.emojiDir, env.baseDir, env.baseDirPath)
  } catch (error) {
    console.error('缓存表情失败:', emojiItem.expressionUrl, error)
  } finally {
    cachingEmojiIds.delete(id)
    releaseEmojiObserver(id)
  }
}

// 绑定 DOM 元素到观察器，等待其进入视口后触发下载
const registerEmojiVisibilityTarget = (target: Element | ComponentPublicInstance | null, emojiItem: EmojiListItem) => {
  releaseEmojiObserver(emojiItem.id)
  const el = resolveVisibilityElement(target)
  if (!el || !emojiItem.expressionUrl || emojiLocalPathMap.value[emojiItem.id]) {
    return
  }
  emojiVisibilityTargetMap.set(emojiItem.id, el)
  observeEmojiVisibility(el, () => {
    void handleEmojiVisibility(emojiItem)
  })
}

// 根据用户 UID 的缓存目录落盘单个 Emoji，若文件不存在则下载后写入
const ensureEmojiCached = async (
  emojiItem: EmojiListItem,
  emojiDir: string,
  baseDir: BaseDirectory,
  baseDirPath: string
) => {
  const fileName = await buildEmojiFileName(emojiItem.expressionUrl)
  const relativePath = await join(emojiDir, fileName)
  const hasFile = await exists(relativePath, { baseDir })
  if (!hasFile) {
    const bytes = await downloadEmojiFile(emojiItem.expressionUrl)
    await writeFile(relativePath, bytes, { baseDir })
  }
  const absolutePath = await join(baseDirPath, relativePath)
  setEmojiLocalPath(emojiItem.id, absolutePath)
}

// 监听收藏列表变化，保持本地映射与观察目标同步
watch(
  () => emojiStore.emojiList.map((item) => ({ id: item.id, url: item.expressionUrl })),
  (list) => {
    const ids = list.map((item) => item.id)
    cleanupLocalEmojiMap(ids)
    cleanupEmojiObservers(ids)
  },
  { immediate: true, deep: true }
)

// 用户切换时重置缓存上下文与观察器
watch(
  () => userStore.userInfo?.uid,
  () => {
    emojiLocalPathMap.value = {}
    emojiCacheEnv.value = null
    cachingEmojiIds.clear()
    emojiVisibilityTargetMap.forEach((el) => {
      unobserveEmojiVisibility(el)
    })
    emojiVisibilityTargetMap.clear()
    disconnectEmojiObserver()
  },
  { immediate: true }
)

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
  // 获取我的表情包列表
  await emojiStore.getEmojiList()
  // 如果上次选择的是表情包系列，设置正确的currentSeriesIndex
  if (activeIndex.value > 0) {
    currentSeriesIndex.value = activeIndex.value - 1
  }
})

onBeforeUnmount(() => {
  disconnectEmojiObserver()
  if (emojiCacheWorker) {
    emojiCacheWorker.terminate()
    emojiCacheWorker = null
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

.emoji-visibility-wrapper {
  @apply w-full h-full;
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

// 移动端表情网格布局 - 普通emoji表情（7列）
.emoji-grid-mobile {
  display: grid !important;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  justify-items: center;
  width: 100%;
}

// 移动端表情包网格布局 - 表情包图片（4列）
.emoji-pack-grid-mobile {
  display: grid !important;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  justify-items: center;
  width: 100%;
}
</style>
