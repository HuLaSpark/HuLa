<template>
  <div data-tauri-drag-region class="bg-[--bg-popover] w-500px h-full p-6px box-border flex flex-col">
    <div
      v-if="type() === 'macos'"
      :onclick="handleClose"
      class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
      <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
        <use href="#close"></use>
      </svg>
    </div>
    <svg v-else :onclick="handleClose" class="w-12px h-12px ml-a cursor-pointer select-none">
      <use href="#close"></use>
    </svg>
    <NFlex data-tauri-drag-region v-if="loading" vertical justify="center" size="small" class="mt-6px">
      <NSkeleton text :repeat="1" class="rounded-8px h-30px w-120px" />
      <NSkeleton text :repeat="1" class="rounded-8px h-300px" />
      <NSkeleton text :repeat="1" class="rounded-8px w-80px h-30px m-[0_0_0_auto]" />
    </NFlex>
    <NFlex data-tauri-drag-region v-else size="small" vertical justify="center" class="p-14px box-border select-none">
      <NFlex justify="space-between" align="center" size="small">
        <NFlex align="center" size="small">
          <NFlex align="center" size="small">
            <p>当前版本:</p>
            <p class="text-(20px #909090) font-500">{{ currentVersion }}</p>
          </NFlex>

          <NFlex v-if="newVersion" align="center" size="small" class="relative">
            <svg class="w-24px h-24px select-none color-#ccc">
              <use href="#RightArrow"></use>
            </svg>

            <p class="relative text-(20px #13987f) font-500">{{ newVersion }}</p>

            <span class="absolute top--10px right--44px p-[4px_8px] bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
              new
            </span>
          </NFlex>
        </NFlex>
        <NFlex align="center" size="medium">
          <div v-if="newVersionTime">
            <span class="text-(12px #909090)">新版本发布日期：</span>
            <span class="text-(12px #13987f)">{{ handRelativeTime(newVersionTime) }}</span>
          </div>

          <div v-else>
            <span class="text-(12px #909090)">版本发布日期：</span>
            <span class="text-(12px #13987f)">{{ handRelativeTime(versionTime) }}</span>
          </div>
        </NFlex>
      </NFlex>
      <p class="text-(14px #909090)">版本更新日志</p>
      <NScrollbar class="max-h-460px p-[0_10px] box-border">
        <div v-if="newCommitLog.length > 0">
          <div class="p-[4px_8px] mt-4px w-fit bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
            {{ newVersion }}
          </div>

          <NTimeline class="p-16px box-border">
            <NTimelineItem
              data-tauri-drag-region
              v-for="(log, index) in newCommitLog"
              :key="index"
              :content="log.message">
              <template #icon>
                <NIcon size="{32}">
                  <img class="size-32px" :src="`/emoji/${log.icon}.webp`" alt="" />
                </NIcon>
              </template>
            </NTimelineItem>
          </NTimeline>

          <NFlex>
            <NFlex vertical :size="20">
              <svg class="m-[4px_40px] w-24px h-24px select-none rotate-270 color-#ccc">
                <use href="#RightArrow"></use>
              </svg>

              <span class="p-[4px_8px] w-fit bg-#f1f1f1 rounded-6px text-(12px #999)">{{ currentVersion }}</span>
            </NFlex>
          </NFlex>
        </div>

        <NTimeline class="p-16px box-border">
          <NTimelineItem v-for="(log, index) in commitLog" :key="index" :content="log.message">
            <template #icon>
              <NIcon size="{32}">
                <img class="size-32px" :src="`/emoji/${log.icon}.webp`" alt="" />
              </NIcon>
            </template>
          </NTimelineItem>
        </NTimeline>
      </NScrollbar>
      <NFlex justify="end" class="mt-10px">
        <NButton :onclick="dismissUpdate" secondary> 忽略更新 </NButton>
        <NButton :onclick="doUpdate" secondary type="primary"> 立即更新 </NButton>
      </NFlex>
    </NFlex>
  </div>
</template>
<script setup lang="tsx">
import { confirm } from '@tauri-apps/plugin-dialog'
import { check } from '@tauri-apps/plugin-updater'
import { handRelativeTime } from '../utils/Day.ts'
import { getVersion } from '@tauri-apps/api/app'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { useSettingStore } from '@/stores/setting.ts'
import { useWindow } from '@/hooks/useWindow.ts'
import { type } from '@tauri-apps/plugin-os'

const settingStore = useSettingStore()
const { createWebviewWindow } = useWindow()
/** 项目提交日志记录 */
const commitLog = ref<{ message: string; icon: string }[]>([])
const newCommitLog = ref<{ message: string; icon: string }[]>([])
const text = ref('检查更新')
const currentVersion = ref('')
const newVersion = ref('')
const loading = ref(false)
/** 版本更新日期 */
const versionTime = ref('')
const newVersionTime = ref('')

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

const handleClose = async () => {
  const current = await WebviewWindow.getCurrent()
  current?.close()
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
  // 显示登录窗口
  const loginWindow = await WebviewWindow.getByLabel('login')
  await loginWindow?.show()
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

const init = async () => {
  loading.value = true
  currentVersion.value = await getVersion()
}

onMounted(async () => {
  await init()
  const url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${currentVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
  await getCommitLog(url)
  await checkUpdate()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
</style>
