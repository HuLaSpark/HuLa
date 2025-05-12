<template>
  <div class="size-full bg-[--bg-popover] select-none cursor-default">
    <!--顶部操作栏-->
    <ActionBar :is-drag="false" :max-w="false" :min-w="false" :shrink="false" />

    <n-flex v-if="loading" vertical justify="center" class="mt-6px box-border px-12px">
      <n-skeleton text :repeat="1" class="rounded-8px h-30px w-120px" />
      <n-skeleton text :repeat="1" class="rounded-8px h-300px" />
      <n-skeleton text :repeat="1" class="rounded-8px w-80px h-30px m-[0_0_0_auto]" />
    </n-flex>
    <n-flex v-else vertical justify="center" class="p-14px box-border select-none">
      <n-flex justify="space-between" align="center">
        <n-flex align="center">
          <n-flex align="center">
            <p class="text-[--text-color]">当前版本:</p>
            <p class="text-(20px #909090) font-500">{{ currentVersion }}</p>
          </n-flex>

          <n-flex v-if="newVersion" align="center" class="relative">
            <svg class="w-24px h-24px select-none color-#ccc">
              <use href="#RightArrow"></use>
            </svg>

            <p class="relative text-(20px #13987f) font-500">{{ newVersion }}</p>

            <span class="absolute top--10px right--44px p-[4px_8px] bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
              new
            </span>
          </n-flex>
        </n-flex>
        <n-flex align="center" size="medium">
          <div v-if="newVersionTime">
            <span class="text-(12px #909090)">新版本发布日期：</span>
            <span class="text-(12px #13987f)">{{ handRelativeTime(newVersionTime) }}</span>
          </div>

          <div v-else>
            <span class="text-(12px #909090)">版本发布日期：</span>
            <span class="text-(12px #13987f)">{{ handRelativeTime(versionTime) }}</span>
          </div>
        </n-flex>
      </n-flex>
      <n-flex justify="space-between" align="center" class="mb-2px">
        <p class="text-(14px #909090)">版本更新日志</p>
        <n-button text @click="toggleLogVisible">
          <n-flex align="center">
            <span class="text-(12px #13987f)">{{ logVisible ? '收起' : '展开' }}</span>
            <svg
              class="w-16px h-16px select-none color-#13987f ml-2px transition-transform duration-300"
              :class="{ 'rotate-180': !logVisible }">
              <use href="#ArrowDown"></use>
            </svg>
          </n-flex>
        </n-button>
      </n-flex>
      <div
        v-show="logVisible"
        class="overflow-hidden transition-all duration-300"
        :class="logVisible ? 'h-460px' : 'h-0'">
        <n-scrollbar class="p-[0_10px] box-border">
          <div v-if="newCommitLog.length > 0">
            <div class="p-[4px_8px] mt-4px w-fit bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
              {{ newVersion }}
            </div>

            <n-timeline class="p-16px box-border">
              <n-timeline-item v-for="(log, index) in newCommitLog" :key="index" :content="log.message">
                <template #icon>
                  <n-icon :size="32">
                    <img class="size-32px" :src="`/emoji/${log.icon}.webp`" alt="" />
                  </n-icon>
                </template>
              </n-timeline-item>
            </n-timeline>

            <n-flex>
              <n-flex vertical :size="20">
                <svg class="m-[4px_40px] w-24px h-24px select-none rotate-270 color-#ccc">
                  <use href="#RightArrow"></use>
                </svg>

                <span class="p-[4px_8px] w-fit bg-#f1f1f1 rounded-6px text-(12px #999)">{{ currentVersion }}</span>
              </n-flex>
            </n-flex>
          </div>

          <n-timeline class="p-16px box-border">
            <n-timeline-item v-for="(log, index) in commitLog" :key="index" :content="log.message">
              <template #icon>
                <n-icon :size="32">
                  <img class="size-32px" :src="`/emoji/${log.icon}.webp`" alt="" />
                </n-icon>
              </template>
            </n-timeline-item>
          </n-timeline>
        </n-scrollbar>
      </div>
      <n-flex justify="end" class="mt-10px">
        <n-button :onclick="dismissUpdate" secondary> 忽略更新</n-button>
        <n-button :onclick="doUpdate" secondary type="primary"> 立即更新</n-button>
      </n-flex>
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import { confirm } from '@tauri-apps/plugin-dialog'
import { check } from '@tauri-apps/plugin-updater'
import { handRelativeTime } from '@/utils/Day.ts'
import { getVersion } from '@tauri-apps/api/app'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useSettingStore } from '@/stores/setting.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { currentMonitor, PhysicalPosition } from '@tauri-apps/api/window'
import { type } from '@tauri-apps/plugin-os'
import { invoke } from '@tauri-apps/api/core'

const settingStore = useSettingStore()
const { createWebviewWindow, resizeWindow, setResizable } = useWindow()
/** 项目提交日志记录 */
const commitLog = ref<{ message: string; icon: string }[]>([])
const newCommitLog = ref<{ message: string; icon: string }[]>([])
const text = ref('检查更新')
const currentVersion = ref('')
const newVersion = ref('')
const loading = ref(false)
/** 控制日志是否可见 */
const logVisible = ref(false)
/** 版本更新日期 */
const versionTime = ref('')
const newVersionTime = ref('')
// 获取操作系统类型
const osType = type()

const commitTypeMap: { [key: string]: string } = {
  feat: 'comet',
  fix: 'bug',
  docs: 'memo',
  style: 'lipstick',
  refactor: 'recycling-symbol',
  perf: 'rocket',
  test: 'test-tube',
  build: 'package',
  ci: 'gear',
  revert: 'right-arrow-curving-left',
  chore: 'hammer-and-wrench'
}

const mapCommitType = (commitMessage: string) => {
  for (const type in commitTypeMap) {
    if (new RegExp(`^${type}`, 'i').test(commitMessage)) {
      return commitTypeMap[type]
    }
  }
}

/* 记录检测更新的版本 */
//let lastVersion: string | null = null

const getCommitLog = async (url: string, isNew = false) => {
  fetch(url).then((res) => {
    if (!res.ok) {
      commitLog.value = [{ message: '获取更新日志失败，请配置token后再试', icon: 'cloudError' }]
      loading.value = false
      return
    }
    res.json().then(async (data) => {
      isNew ? (newVersionTime.value = data.created_at) : (versionTime.value = data.created_at)
      await nextTick(() => {
        // 使用正则表达式提取 * 号后面的内容
        const regex = /\* (.+)/g
        let match
        const logs = []
        while ((match = regex.exec(data.body)) !== null) {
          logs.push(match[1])
        }
        const processedLogs = logs.map((commit) => {
          // 获取最后一个 : 号的位置
          const lastColonIndex = commit.lastIndexOf(':')
          // 截取最后一个 : 号后的内容
          const message = lastColonIndex !== -1 ? commit.substring(lastColonIndex + 1).trim() : commit
          return {
            message: message,
            icon: mapCommitType(commit) || 'alien-monster'
          }
        })
        isNew ? (newCommitLog.value = processedLogs) : (commitLog.value = processedLogs)
        loading.value = false
      })
    })
  })
}

const doUpdate = async () => {
  if (!(await confirm('确定更新吗'))) {
    return
  }
  await createWebviewWindow('更新', 'update', 490, 335, '', false, 490, 335, false, true)
  const windows = await WebviewWindow.getAll()
  windows.forEach((window) => {
    if (window.label === 'login' || window.label === 'home' || window.label === 'checkupdate') {
      window.close()
    }
  })
}

const dismissUpdate = async () => {
  if (!(await confirm('忽略更新不影响登录后手动更新，后续将不再弹出此次更新提醒，确定忽略更新吗'))) {
    return
  }
  settingStore.update.dismiss = newVersion.value
  const checkUpdateWindow = await WebviewWindow.getByLabel('checkupdate')
  checkUpdateWindow?.close()
}

const checkUpdate = async () => {
  await check()
    .then(async (e) => {
      if (!e?.available) {
        return
      }
      newVersion.value = e.version
      // 检查版本之间不同的提交信息和提交日期
      let url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${newVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
      await getCommitLog(url, true)
      text.value = '立即更新'
    })
    .catch(() => {
      window.$message.error('检查更新错误，请稍后再试')
    })
}

// 根据操作系统类型设置窗口位置（macOS为右上角，其他为右下角）
const moveWindowToBottomRight = async () => {
  try {
    const checkUpdateWindow = await WebviewWindow.getByLabel('checkupdate')
    if (!checkUpdateWindow) return

    // 获取当前显示器信息
    const monitor = await currentMonitor()
    if (!monitor) return

    // 获取窗口大小
    const size = await checkUpdateWindow.outerSize()

    // 计算窗口位置（留出一定边距）
    let y = 0
    let x = 0

    if (osType === 'macos') {
      // macOS - 放置在右上角
      y = 50 // 为顶部菜单栏留出空间
      x = Math.floor(monitor.size.width - size.width - 10)
    } else {
      // Windows/Linux - 放置在右下角（保持原有逻辑）
      y = Math.floor(monitor.size.height - size.height - 50)
      x = Math.floor(monitor.size.width - size.width)
    }

    // 移动窗口到计算的位置
    await checkUpdateWindow.setPosition(new PhysicalPosition(x, y))
  } catch (error) {
    console.error('移动窗口失败:', error)
  }
}

const toggleLogVisible = async () => {
  logVisible.value = !logVisible.value

  // 获取当前窗口实例
  const checkUpdateWindow = await WebviewWindow.getByLabel('checkupdate')
  if (!checkUpdateWindow) return

  // 设置窗口可调整大小，以便能够调整窗口高度
  await setResizable('checkupdate', true)

  // 根据日志显示状态调整窗口高度
  if (logVisible.value) {
    // 展开日志，调整窗口高度为600px
    await resizeWindow('checkupdate', 500, 620)
  } else {
    // 收起日志，调整窗口高度为420px
    await resizeWindow('checkupdate', 500, 150)
  }
  await setResizable('checkupdate', false)
  // 调整窗口位置到右下角，保持右下角位置不变
  await moveWindowToBottomRight()
}

const init = async () => {
  await moveWindowToBottomRight()
  loading.value = true
  currentVersion.value = await getVersion()
  if (osType === 'macos') {
    // 隐藏标题栏按钮
    try {
      await invoke('hide_title_bar_buttons', { windowLabel: 'checkupdate' })
    } catch (error) {
      console.error('隐藏标题栏按钮失败:', error)
    }
  }
}

onMounted(async () => {
  await init()
  const url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${currentVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
  await getCommitLog(url)
  await checkUpdate()
})
</script>
