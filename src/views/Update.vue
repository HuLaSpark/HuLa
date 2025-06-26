<template>
  <n-flex data-tauri-drag-region vertical class="login-box size-full select-none !gap-0">
    <video class="w-full h-240px rounded-t-8px object-cover" autoplay loop data-tauri-drag-region>
      <source src="@/assets/video/issue.mp4" type="video/mp4" />
      <source src="@/assets/video/star.mp4" type="video/mp4" />
    </video>
    <div data-tauri-drag-region>
      <n-progress
        data-tauri-drag-region
        size="12"
        :border-radius="0"
        :color="changeColor('#13987f', { alpha: 0.6 })"
        :rail-color="changeColor('#13987f', { alpha: 0.2 })"
        :percentage="percentage"
        :show-indicator="false" />

      <NCarousel
        autoplay
        direction="vertical"
        :interval="3000"
        :show-dots="false"
        class="w-[90%] text-sm line-height-30px h-[30px] px-2 overflow-hidden cursor-default">
        <NCarouselItem
          data-tauri-drag-region
          v-for="(it, i) in list"
          :key="i"
          class="whitespace-nowrap align-middle text-(12px ellipsis) max-w-full box-border color-#909090"
          :title="it"
          >{{ it }}</NCarouselItem
        >
      </NCarousel>

      <p class="cursor-default color-#13987f text-center text-sm mt-4" data-tauri-drag-region>
        更新中 {{ percentage }}%
      </p>
    </div>
  </n-flex>
</template>
<script setup lang="tsx">
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { changeColor } from 'seemly'
import { NCarousel, NCarouselItem } from 'naive-ui'

const list = ref<string[]>([])
const updating = ref(false)
const percentage = ref(0)
const total = ref(0)
const downloaded = ref(0)

// https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${newVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}

interface GiteeCommitResultStruct {
  id: number
  tag_name: string
  target_commitish: string
  prerelease: boolean
  name: string
  body: string
  author: unknown
  created_at: string
  assets: unknown
}

const fetchGiteeReleaseData = async (version: string) => {
  const apiEndpoint = new URL(`https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${version}`)

  apiEndpoint.search = new URLSearchParams({
    access_token: import.meta.env.VITE_GITEE_TOKEN
  }).toString()

  const response = await fetch(apiEndpoint.toString())

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }

  return (await response.json()) as GiteeCommitResultStruct
}

const extractCommitMessages = (releaseBody: string) => {
  const commitmessageRegex = /^\* (.+)/gm
  const matchs = releaseBody.matchAll(commitmessageRegex)
  return Array.from(matchs, (match) => match[1])
}

const setupCommitList = async (version: string) => {
  try {
    const releaseData = await fetchGiteeReleaseData(version)
    list.value = extractCommitMessages(releaseData.body)
  } catch (err) {
    console.error(`v${version} 版本 Commit 信息获取失败:`, err)
    list.value =
      err instanceof Error ? [`Error fetching release data: ${err.message}`] : ['Error fetching release data']
  }
}

const doUpdate = async () => {
  await check()
    .then(async (e) => {
      if (!e?.available) {
        return
      }

      await setupCommitList(e.version)

      await e.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total.value = event.data.contentLength ? event.data.contentLength : 0
            break
          case 'Progress':
            downloaded.value += event.data.chunkLength
            percentage.value = parseFloat(((downloaded.value / total.value) * 100 + '').substring(0, 4))
            break
          case 'Finished':
            break
        }
      })
      try {
        await relaunch()
      } catch (e) {
        console.log(e)
      }
    })
    .catch((e) => {
      console.log(e)
    })
    .finally(() => {
      updating.value = false
    })
}

onMounted(async () => {
  await doUpdate()
})
</script>

<style scoped lang="scss">
@use '@/styles/scss/global/login-bg';
</style>
