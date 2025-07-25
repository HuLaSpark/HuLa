<template>
  <n-flex vertical :size="24">
    <!-- 扫描进度 -->
    <n-flex class="item" :size="16" vertical>
      <!-- 进度条 -->
      <n-flex justify="center" align="center" class="py-20px">
        <n-progress
          type="multiple-circle"
          :circle-gap="-16"
          :color="showDiskUsage ? ['var(--warning-text)', '#13987f'] : ['#13987f']"
          :rail-style="[
            { stroke: '#7db1ac', opacity: 0.2 },
            { stroke: '#fff', opacity: 0 }
          ]"
          :percentage="
            showDiskUsage
              ? [Number(diskInfo?.disk_usage_percentage.toFixed(2)), scanFilesUsagePercentage]
              : [Number(scanningProgress.toFixed(0))]
          "
          :processing="scanning"
          :offset-degree="180"
          style="width: 160px; height: 160px"
          :stroke-width="16">
          <n-flex vertical align="center" justify="center" :size="4">
            <span class="text-(18px [--text-color])">
              {{ showDiskUsage ? scanFilesUsagePercentage.toFixed(2) : scanningProgress.toFixed(0) }}%
            </span>
            <span class="text-(12px #666)">
              {{ showDiskUsage ? '扫描文件占比' : '扫描进度' }}
            </span>
          </n-flex>
        </n-progress>
      </n-flex>

      <!-- 颜色说明 -->
      <n-flex justify="center" :size="8">
        <n-flex align="center" :size="8">
          <div class="w-12px h-12px rounded-2px bg-#13987f"></div>
          <span class="text-(11px #666)">扫描文件已用空间</span>
        </n-flex>
        <n-flex align="center" :size="8">
          <div class="w-12px h-12px rounded-2px bg-[--warning-text]"></div>
          <span class="text-(11px #666)">磁盘分区已用空间</span>
        </n-flex>
        <n-flex align="center" :size="8">
          <div class="w-12px h-12px rounded-2px bg-#7db1ac50"></div>
          <span class="text-(11px #666)">剩余可用空间</span>
        </n-flex>
      </n-flex>

      <!-- 详细信息 -->
      <n-flex vertical :size="8">
        <n-flex v-if="scanning" justify="space-between">
          <span class="text-(12px #666)">当前文件:</span>
          <span class="text-(12px #666) max-w-300px truncate">
            {{ scanProgress.current_path }}
          </span>
        </n-flex>

        <n-flex v-if="scanning" justify="space-between">
          <span class="text-(12px #666)">扫描进度:</span>
          <span class="text-(12px #666)">{{ scanningProgress.toFixed(2) }}%</span>
        </n-flex>

        <n-flex justify="space-between">
          <span class="text-(12px #666)">已处理文件:</span>
          <span class="text-(12px #666)">{{ scanProgress.files_processed }} 个</span>
        </n-flex>

        <n-flex justify="space-between">
          <span class="text-(12px #666)">累计大小:</span>
          <span class="text-(12px #666)">{{ formatBytes(scanProgress.total_size) }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">挂载点:</span>
          <span class="text-(12px #666)">{{ diskInfo.disk_mount_point }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">磁盘分区总容量:</span>
          <span class="text-(12px #666)">{{ formatBytes(diskInfo.disk_total_space) }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">磁盘分区已用空间:</span>
          <span class="text-(12px #666)">{{ formatBytes(diskInfo.disk_used_space) }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">磁盘已用空间占比:</span>
          <span class="text-(12px #666)" :style="{ color: getUsageColor(diskInfo.disk_usage_percentage) }">
            {{ diskInfo.disk_usage_percentage.toFixed(2) }}%
          </span>
        </n-flex>

        <n-flex justify="space-between">
          <span class="text-(12px #666)">耗时:</span>
          <span class="text-(12px #666)">{{ scanProgress.elapsed_seconds.toFixed(2) }} 秒</span>
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 用户目录 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">用户目录</span>

      <!-- 存储目录设置 -->
      <n-flex class="item" :size="16" vertical>
        <!-- 路径类型选择 -->
        <n-flex align="center" justify="space-between">
          <span>扫描目录类型</span>
          <n-radio-group v-model:value="pathType">
            <n-radio value="default">默认目录</n-radio>
            <n-radio value="custom">自定义目录</n-radio>
          </n-radio-group>
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <!-- 当前扫描目录显示 -->
        <n-flex align="center" justify="space-between">
          <span>当前目录：</span>
          <n-flex vertical align="end" :size="8">
            <span class="text-(12px #666) max-w-300px truncate">
              {{ currentDirectory || '正在获取目录路径...' }}
            </span>
            <n-flex :size="8">
              <n-button
                v-if="pathType === 'custom'"
                secondary
                size="small"
                @click="selectCustomDirectory"
                :disabled="scanning">
                {{ scanning ? '扫描中...' : '选择目录' }}
              </n-button>
              <n-button size="small" color="#13987f" @click="startScan" :disabled="scanning || !currentDirectory">
                {{ scanning ? '扫描中...' : '开始扫描' }}
              </n-button>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { listen } from '@tauri-apps/api/event'
import { appCacheDir } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { useTauriListener } from '@/hooks/useTauriListener'
import { formatBytes } from '@/utils/Formatting.ts'
import { ErrorType, invokeSilently, invokeWithErrorHandler } from '@/utils/TauriInvokeHandler.ts'

type DirectoryScanProgress = {
  current_path: string
  files_processed: number
  total_size: number
  elapsed_time: number
  elapsed_seconds: number
  progress_percentage: number
}

type DirectoryInfo = {
  path: string
  total_size: number
  disk_mount_point: string
  disk_total_space: number
  disk_used_space: number
  disk_usage_percentage: number
  usage_percentage: number
}

const { addListener } = useTauriListener()
const pathType = ref<'default' | 'custom'>('default')
const defaultDirectory = ref<string>('')
const customDirectory = ref<string>('')
const currentDirectory = computed(() => {
  return pathType.value === 'default' ? defaultDirectory.value : customDirectory.value
})
const scanning = ref<boolean>(false)
const scanComplete = ref<boolean>(false)
const showDiskUsage = ref<boolean>(false)
const totalSize = ref<number>(0)
const diskInfo = ref<DirectoryInfo | null>(null)
const scanProgress = ref<DirectoryScanProgress>({
  current_path: '',
  files_processed: 0,
  total_size: 0,
  elapsed_time: 0,
  elapsed_seconds: 0,
  progress_percentage: 0
})

// 计算扫描文件占比百分比
const scanFilesUsagePercentage = computed(() => {
  if (!diskInfo.value || !scanProgress.value.total_size) return 0

  // 计算当前扫描文件相对于磁盘总容量的占比
  const percentage = (scanProgress.value.total_size / diskInfo.value.disk_total_space) * 100
  return Math.min(percentage, 1000)
})

// 获取占比严重程度颜色
const getUsageColor = (usage: number) => {
  if (!diskInfo.value) return '#13987f'
  if (usage < 50) {
    return '#13987f'
  } else if (usage < 80) {
    return '#f0a020'
  } else {
    return '#d03050'
  }
}

// 扫描进度百分比（用于显示扫描进度，不是磁盘占比）
const scanningProgress = computed(() => {
  if (!scanning.value && !scanComplete.value) return 0
  if (scanComplete.value && !showDiskUsage.value) return 100

  // 直接使用后端返回的实际进度
  return scanProgress.value.progress_percentage || 0
})

// 获取默认目录
const getDefaultDirectory = async () => {
  try {
    const cacheDir = await appCacheDir()
    defaultDirectory.value = cacheDir
  } catch (error) {
    console.error('获取默认目录失败:', error)
    window.$message?.error('获取默认目录失败')
  }
}

// 选择自定义目录
const selectCustomDirectory = async () => {
  try {
    const result = await open({
      directory: true,
      title: '选择要扫描的目录'
    })

    if (result) {
      customDirectory.value = result
    }
  } catch (error) {
    console.error('选择目录失败:', error)
    window.$message?.error('选择目录失败')
  }
}

// 开始扫描
const startScan = async () => {
  if (!currentDirectory.value) {
    window.$message?.warning('请先选择目录')
    return
  }

  scanning.value = true
  scanComplete.value = false
  showDiskUsage.value = false
  totalSize.value = 0
  diskInfo.value = null

  // 重置进度
  scanProgress.value = {
    current_path: '开始扫描...',
    files_processed: 0,
    total_size: 0,
    elapsed_time: 0,
    elapsed_seconds: 0,
    progress_percentage: 0
  }

  try {
    const result = await invokeWithErrorHandler<DirectoryInfo>(
      'get_directory_usage_info_with_progress',
      {
        directoryPath: currentDirectory.value
      },
      {
        customErrorMessage: '获取目录信息失败',
        errorType: ErrorType.Client
      }
    )

    diskInfo.value = result
    totalSize.value = result.total_size
    scanComplete.value = true
    scanning.value = false
  } catch (error) {
    console.error('扫描失败:', error)
    scanning.value = false
  }
}

// 取消扫描的方法
const cancelScan = async () => {
  try {
    await invokeSilently('cancel_directory_scan')
    console.log('扫描已取消')
  } catch (error) {
    console.error('取消扫描失败:', error)
  }
}

// 监听进度事件
onMounted(async () => {
  // 获取默认目录
  await getDefaultDirectory()

  // 监听进度更新
  addListener(
    listen<DirectoryScanProgress>('directory-scan-progress', (event) => {
      scanProgress.value = event.payload
    })
  )

  // 监听扫描完成
  addListener(
    listen<DirectoryScanProgress>('directory-scan-complete', (event) => {
      scanProgress.value = event.payload
      scanComplete.value = true
      scanning.value = false

      // 扫描完成后直接切换到磁盘占比
      setTimeout(() => {
        showDiskUsage.value = true
      }, 300)
    })
  )

  // 监听扫描取消
  addListener(
    listen('directory-scan-cancelled', () => {
      console.log('收到扫描取消事件')
      scanning.value = false
      scanComplete.value = false
      showDiskUsage.value = false
    })
  )

  // 自动开始扫描
  if (currentDirectory.value) {
    await startScan()
  }
})

// 组件卸载时取消扫描
onUnmounted(async () => {
  await cancelScan()
})
</script>

<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full p-12px box-border border-(solid 1px [--line-color]) custom-shadow;
}
</style>
