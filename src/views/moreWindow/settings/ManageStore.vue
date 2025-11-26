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
          <n-flex vertical align="center" justify="center" :size="4" class="text-center">
            <span class="text-(18px [--text-color] center)">
              {{ showDiskUsage ? scanFilesUsagePercentage.toFixed(2) : scanningProgress.toFixed(0) }}%
            </span>
            <span class="text-(12px #666 center)">
              {{ showDiskUsage ? t('setting.storage.usage') : t('setting.storage.file_scan_progress') }}
            </span>
          </n-flex>
        </n-progress>
      </n-flex>

      <!-- 颜色说明 -->
      <n-flex justify="center" :size="8">
        <n-flex align="center" :size="8">
          <div class="w-12px h-12px rounded-2px bg-#13987f"></div>
          <span class="text-(11px #666)">{{ t('setting.storage.app_used_space') }}</span>
        </n-flex>
        <n-flex align="center" :size="8">
          <div class="w-12px h-12px rounded-2px bg-[--warning-text]"></div>
          <span class="text-(11px #666)">{{ t('setting.storage.used_space') }}</span>
        </n-flex>
        <n-flex align="center" :size="8">
          <div class="w-12px h-12px rounded-2px bg-#7db1ac50"></div>
          <span class="text-(11px #666)">{{ t('setting.storage.free_space') }}</span>
        </n-flex>
      </n-flex>

      <!-- 详细信息 -->
      <n-flex vertical :size="8">
        <n-flex v-if="scanning" justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.current_file') }}:</span>
          <span class="text-(12px #666) max-w-300px truncate">
            {{ scanProgress.current_path }}
          </span>
        </n-flex>

        <n-flex v-if="scanning" justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.scanning_progress') }}:</span>
          <span class="text-(12px #666)">{{ scanningProgress.toFixed(2) }}%</span>
        </n-flex>

        <n-flex justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.processed_files') }}:</span>
          <span class="text-(12px #666)">
            {{ t('setting.storage.processed_files_unit', { count: scanProgress.files_processed }) }}
          </span>
        </n-flex>

        <n-flex justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.total_size') }}:</span>
          <span class="text-(12px #666)">{{ formatBytes(scanProgress.total_size) }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.mount_point') }}:</span>
          <span class="text-(12px #666)">{{ diskInfo.disk_mount_point }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.disk_total') }}:</span>
          <span class="text-(12px #666)">{{ formatBytes(diskInfo.disk_total_space) }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.disk_used') }}:</span>
          <span class="text-(12px #666)">{{ formatBytes(diskInfo.disk_used_space) }}</span>
        </n-flex>

        <n-flex v-if="diskInfo" justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.disk_usage_percent') }}:</span>
          <span class="text-(12px #666)" :style="{ color: getUsageColor(diskInfo.disk_usage_percentage) }">
            {{ diskInfo.disk_usage_percentage.toFixed(2) }}%
          </span>
        </n-flex>

        <n-flex justify="space-between">
          <span class="text-(12px #666)">{{ t('setting.storage.elapsed') }}:</span>
          <span class="text-(12px #666)">
            {{ t('setting.storage.elapsed_unit', { seconds: scanProgress.elapsed_seconds.toFixed(2) }) }}
          </span>
        </n-flex>
      </n-flex>
    </n-flex>

    <!-- 用户目录 -->
    <n-flex vertical class="text-(14px [--text-color])" :size="16">
      <span class="pl-10px">{{ t('setting.storage.directory') }}</span>

      <!-- 存储目录设置 -->
      <n-flex class="item" :size="16" vertical>
        <!-- 路径类型选择 -->
        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.storage.path_type') }}</span>
          <n-radio-group v-model:value="pathType">
            <n-radio value="default">{{ t('setting.storage.path_type_default') }}</n-radio>
            <n-radio value="custom">{{ t('setting.storage.path_type_custom') }}</n-radio>
          </n-radio-group>
        </n-flex>

        <span class="w-full h-1px bg-[--line-color]"></span>

        <!-- 当前扫描目录显示 -->
        <n-flex align="center" justify="space-between">
          <span>{{ t('setting.storage.curr_dir') }}</span>
          <n-flex vertical align="end" :size="8">
            <span class="text-(12px #666) max-w-300px truncate">
              {{ currentDirectory || t('setting.storage.fetching_directory') }}
            </span>
            <n-flex :size="8">
              <n-button
                v-if="pathType === 'custom'"
                secondary
                size="small"
                @click="selectCustomDirectory"
                :disabled="scanning">
                {{ scanning ? t('setting.storage.scanning') : t('setting.storage.select_directory') }}
              </n-button>
              <n-button size="small" color="#13987f" @click="startScan" :disabled="scanning || !currentDirectory">
                {{ scanning ? t('setting.storage.scanning') : t('setting.storage.start_scan') }}
              </n-button>
            </n-flex>
          </n-flex>
        </n-flex>
      </n-flex>
    </n-flex>
  </n-flex>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { open } from '@tauri-apps/plugin-dialog'
import { useScannerStore } from '@/stores/scanner.ts'
import { formatBytes } from '@/utils/Formatting.ts'

const { t } = useI18n()

const scannerStore = useScannerStore()
const {
  pathType,
  currentDirectory,
  scanning,
  showDiskUsage,
  diskInfo,
  scanProgress,
  scanFilesUsagePercentage,
  scanningProgress
} = storeToRefs(scannerStore)

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

// 选择自定义目录
const selectCustomDirectory = async () => {
  try {
    const result = await open({
      directory: true,
      title: '选择要扫描的目录'
    })

    if (result) {
      scannerStore.setCustomDirectory(result)
    }
  } catch (error) {
    console.error('选择目录失败:', error)
    window.$message?.error('选择目录失败')
  }
}

// 开始扫描
const startScan = async () => {
  await scannerStore.startScan()
}

// 组件挂载时初始化扫描器
onMounted(async () => {
  await scannerStore.initializeScanner()
})

// 路径类型改变处理
watch(pathType, (newType) => {
  scannerStore.setPathType(newType)
})
</script>

<style scoped lang="scss">
.item {
  @apply bg-[--bg-setting-item] rounded-12px size-full p-12px box-border border-(solid 1px [--line-color]) custom-shadow;
}
</style>
