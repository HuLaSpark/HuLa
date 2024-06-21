<template>
  <main class="left min-w-60px h-full p-[30px_6px_15px] box-border flex-col-center select-none" data-tauri-drag-region>
    <!-- 点击时头像内容框 -->
    <n-popover
      v-model:show="infoShow"
      :placement="shrinkStatus ? 'bottom-start' : 'right-start'"
      :show-arrow="false"
      style="padding: 0; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(10px)"
      trigger="click">
      <template #trigger>
        <!-- 头像 -->
        <div class="relative size-36px rounded-50% cursor-pointer">
          <n-avatar :color="'#fff'" :size="36" :src="login.accountInfo.avatar" fallback-src="/logo.png" round />

          <div
            class="bg-[--bg-avatar] text-10px rounded-50% size-12px absolute bottom--2px right--2px border-(2px solid [--bg-avatar])"
            @click.stop="openContent('在线状态', 'onlineStatus', 320, 480)">
            <img :src="url" alt="" class="rounded-50% size-full" />
          </div>
        </div>
      </template>
      <!-- 用户个人信息框 -->
      <n-flex
        :size="26"
        :style="`background: linear-gradient(to bottom, ${bgColor} 0%, ${themeColor} 100%)`"
        class="size-full p-15px box-border rounded-8px"
        vertical>
        <!-- 头像以及信息区域 -->
        <n-flex :size="25" align="center" justify="space-between">
          <n-flex>
            <img :src="login.accountInfo.avatar" alt="" class="size-68px rounded-50% select-none" />

            <n-flex :size="10" class="text-[--text-color]" justify="center" vertical>
              <span class="text-18px">{{ login.accountInfo.name }}</span>
              <span class="text-(12px [--info-text-color])">账号 {{ login.accountInfo.uid }}</span>
              <n-flex
                :size="5"
                align="center"
                class="item-hover ml--4px"
                @click="openContent('在线状态', 'onlineStatus', 320, 480)">
                <img :src="url" alt="" class="rounded-50% size-18px" />
                <span>{{ title }}</span>
              </n-flex>
            </n-flex>
          </n-flex>

          <n-flex :size="5" align="center" class="item-hover" vertical>
            <svg class="size-20px"><use href="#thumbs-up"></use></svg>
            <span class="text-12px">9999+</span>
          </n-flex>
        </n-flex>
        <!-- 地址 -->
        <n-flex :size="26" class="select-none">
          <span class="text-[--info-text-color]">所在地</span>
          <span>中国</span>
        </n-flex>
        <!-- 动态 -->
        <n-flex :size="40" class="select-none">
          <span class="text-[--info-text-color]">动态</span>
          <n-image-group>
            <n-flex :class="shrinkStatus ? 'overflow-hidden w-180px' : ''" :size="6" :wrap="false">
              <n-image
                v-for="n in 4"
                :key="n"
                class="rounded-8px"
                preview-disabled
                src="https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg"
                width="50" />
            </n-flex>
          </n-image-group>
        </n-flex>

        <n-flex :size="40" align="center" justify="center">
          <n-button secondary @click="handleEditing"> 编辑资料 </n-button>
        </n-flex>
      </n-flex>
    </n-popover>

    <div class="flex-1 mt-20px flex-col-x-center justify-between" data-tauri-drag-region>
      <!-- 上部分操作栏 -->
      <header class="flex-col-x-center gap-10px color-[--icon-color]">
        <div
          v-for="(item, index) in itemsTop"
          :key="index"
          :class="[
            { active: activeUrl === item.url && item.url !== 'dynamic' },
            openWindowsList.has(item.url) ? 'p-[6px_8px] color-#13987f' : 'top-action'
          ]"
          @click="pageJumps(item.url)">
          <n-badge :max="99" :value="item.badge">
            <svg class="size-22px">
              <use
                :href="`#${activeUrl === item.url || openWindowsList.has(item.url) ? item.iconAction : item.icon}`"></use>
            </svg>
          </n-badge>
        </div>
      </header>

      <!-- 下部分操作栏 -->
      <footer class="flex-col-x-center gap-10px color-[--icon-color]">
        <div
          v-for="(item, index) in itemsBottom"
          :key="index"
          :class="openWindowsList.has(item.url.substring(1)) ? 'p-[6px_8px] color-#13987f' : 'bottom-action'"
          @click="openContent(item.title, item.label)">
          <svg class="size-22px">
            <use :href="`#${openWindowsList.has(item.url.substring(1)) ? item.iconAction : item.icon}`"></use>
          </svg>
        </div>

        <svg
          :class="{ 'color-#13987f': settingShow }"
          class="more size-22px relative"
          @click="settingShow = !settingShow">
          <use :href="settingShow ? '#hamburger-button-action' : '#hamburger-button'"></use>
        </svg>

        <!--  更多选项面板  -->
        <div v-if="settingShow" class="setting-item">
          <div class="menu-list">
            <div v-for="(item, index) in moreList" :key="index">
              <div class="menu-item" @click="() => item.click()">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>

    <!-- 编辑资料弹窗 -->
    <n-modal v-model:show="editInfo.show" :mask-closable="false" class="rounded-8px" transform-origin="center">
      <div class="bg-[--bg-edit] w-480px h-fit box-border flex flex-col">
        <n-flex :size="6" vertical>
          <n-flex class="text-(14px --text-color) select-none pt-6px" justify="center">编辑资料</n-flex>
          <svg
            class="size-14px ml-a cursor-pointer pt-6px select-none absolute right-6px"
            @click="editInfo.show = false">
            <use href="#close"></use>
          </svg>
          <span class="h-1px w-full bg-[--line-color]"></span>
        </n-flex>
        <n-flex :size="20" class="p-22px select-none" vertical>
          <!-- 头像 -->
          <n-flex justify="center">
            <n-avatar :size="80" :src="editInfo.content.avatar" round style="border: 3px solid #fff" />
          </n-flex>
          <n-flex v-if="currentBadge" align="center" justify="center">
            <span class="text-(14px #707070)">当前佩戴的徽章:</span>
            <n-popover trigger="hover">
              <template #trigger>
                <img :src="currentBadge?.img" alt="" class="size-22px" />
              </template>
              <span>{{ currentBadge?.describe }}</span>
            </n-popover>
          </n-flex>
          <!-- 昵称编辑输入框 -->
          <n-popover placement="top-start" trigger="click">
            <template #trigger>
              <n-input
                ref="inputInstRef"
                v-model:value="editInfo.content.name"
                :count-graphemes="countGraphemes"
                :default-value="editInfo.content.name"
                :maxlength="8"
                :passively-activated="true"
                class="rounded-6px"
                clearable
                placeholder="请输入你的昵称"
                show-count
                type="text">
                <template #prefix>
                  <span class="pr-6px text-#909090">昵称</span>
                </template>
              </n-input>
            </template>
            <span>剩余改名次数: {{ editInfo.content.modifyNameChance || 0 }}</span>
          </n-popover>

          <!-- 徽章列表  -->
          <n-flex :size="[56, 20]" align="center">
            <template v-for="item in editInfo.badgeList" :key="item.id">
              <div class="badge-item">
                <n-image
                  :class="{ 'grayscale-0': item.obtain === IsYetEnum.YES }"
                  :src="item.img"
                  alt="badge"
                  class="flex-center grayscale"
                  width="100"
                  height="100"
                  preview-disabled
                  round />
                <div class="tip">
                  <template v-if="item.obtain === IsYetEnum.YES">
                    <n-button v-if="item.wearing === IsYetEnum.NO" color="#13987f" @click="toggleWarningBadge(item)">
                      佩戴
                    </n-button>
                  </template>
                  <n-popover trigger="hover">
                    <template #trigger>
                      <svg class="size-24px outline-none"><use href="#tips"></use></svg>
                    </template>
                    <span>{{ item.describe }}</span>
                  </n-popover>
                </div>
              </div>
            </template>
          </n-flex>
        </n-flex>
        <n-flex class="p-12px" align="center" justify="center">
          <n-button :disabled="editInfo.content.name === login.accountInfo.name" color="#13987f" @click="saveEditInfo">
            保存
          </n-button>
        </n-flex>
      </div>
    </n-modal>
  </main>
</template>
<script lang="ts" setup>
import { delay } from 'lodash-es'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import Mitt from '@/utils/Bus.ts'
import { EventEnum, IsYetEnum, MittEnum, MsgEnum, ThemeEnum } from '@/enums'
import { listen } from '@tauri-apps/api/event'
import { itemsBottom, itemsTop, moreList } from './config.ts'
import { onlineStatus } from '@/stores/onlineStatus.ts'
import { storeToRefs } from 'pinia'
import { setting } from '@/stores/setting.ts'
import apis from '@/services/apis.ts'
import GraphemeSplitter from 'grapheme-splitter'
import { BadgeType, UserInfoType } from '@/services/types.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { renderReplyContent } from '@/utils/RenderReplyContent.ts'
import { formatTimestamp } from '@/utils/ComputedTime.ts'
import { useChatStore } from '@/stores/chat.ts'
import { useUserStore } from '@/stores/user.ts'
import { useCachedStore } from '@/stores/cached.ts'

const prefers = matchMedia('(prefers-color-scheme: dark)')
const { createWebviewWindow } = useWindow()
const settingStore = setting()
const userStore = useUserStore()
const cachedStore = useCachedStore()
const { themes, login } = storeToRefs(settingStore)
const OLStatusStore = onlineStatus()
const { url, title, bgColor } = storeToRefs(OLStatusStore)
/**当前选中的元素 默认选中itemsTop的第一项*/
const activeUrl = ref<string>(itemsTop.value[0].url)
const settingShow = ref(false)
const shrinkStatus = ref(false)
const infoShow = ref(false)
const themeColor = ref(themes.value.content === ThemeEnum.DARK ? 'rgba(63,63,63, 0.2)' : 'rgba(241,241,241, 0.2)')
/** 已打开窗口的列表 */
const openWindowsList = ref(new Set())
/** 编辑资料弹窗 */
// TODO 这里考虑是否查接口查实时的用户信息还是直接查本地存储的用户信息 (nyh -> 2024-05-05 01:12:36)
const editInfo = ref<{
  show: boolean
  content: Partial<UserInfoType>
  badgeList: BadgeType[]
}>({
  show: false,
  content: {},
  badgeList: []
})
/** 当前用户佩戴的徽章  */
const currentBadge = computed(() =>
  editInfo.value.badgeList.find((item) => item.obtain === IsYetEnum.YES && item.wearing === IsYetEnum.YES)
)

/** 跟随系统主题模式切换主题 */
const followOS = () => {
  themeColor.value = prefers.matches ? 'rgba(63,63,63, 0.2)' : 'rgba(241,241,241, 0.2)'
}
const chatStore = useChatStore()
const sessionList = computed(() =>
  chatStore.sessionList.map((item) => {
    // 最后一条消息内容
    const lastMsg = Array.from(chatStore.messageMap.get(item.roomId)?.values() || [])?.slice(-1)?.[0]
    let LastUserMsg = ''
    if (lastMsg) {
      const lastMsgUserName = useUserInfo(lastMsg.fromUser.uid)
      LastUserMsg =
        lastMsg.message?.type === MsgEnum.RECALL
          ? `${lastMsgUserName.value.name}:'撤回了一条消息'`
          : renderReplyContent(
              lastMsgUserName.value.name,
              lastMsg.message?.type,
              lastMsg.message?.body?.content || lastMsg.message?.body
            )!
    }
    return {
      ...item,
      lastMsg: LastUserMsg || item.text || '欢迎使用HuLa',
      lastMsgTime: formatTimestamp(item?.activeTime)
    }
  })
)
const msgTotal = computed(() => {
  return sessionList.value.reduce((total, item) => total + item.unreadCount, 0)
})
watchEffect(() => {
  Mitt.on(MittEnum.UPDATE_MSG_TOTAL, (event) => {
    itemsTop.value.find((item) => {
      if (item.url === 'message') {
        item.badge = event as number
      }
    })
  })
  itemsTop.value.find((item) => {
    if (item.url === 'message') {
      item.badge = msgTotal.value
    }
  })
  Mitt.on(MittEnum.TO_SEND_MSG, (event: any) => {
    activeUrl.value = event.url
  })
  /** 判断是否是跟随系统主题 */
  if (themes.value.pattern === ThemeEnum.OS) {
    followOS()
    prefers.addEventListener('change', followOS)
  } else {
    prefers.removeEventListener('change', followOS)
  }
})

/** 更新缓存里面的用户信息 */
const updateCurrentUserCache = (key: 'name' | 'wearingItemId', value: any) => {
  const currentUser = userStore.userInfo.uid && cachedStore.userCachedList[userStore.userInfo.uid]
  if (currentUser) {
    currentUser[key] = value // 更新缓存里面的用户信息
  }
}

/** 保存用户信息 */
const saveEditInfo = () => {
  if (!editInfo.value.content.name || editInfo.value.content.name.trim() === '') {
    window.$message.error('昵称不能为空')
    return
  }
  if (editInfo.value.content.modifyNameChance === 0) {
    window.$message.error('改名次数不足')
    return
  }
  apis.modifyUserName(editInfo.value.content.name).then((res) => {
    if (!res.success) {
      window.$message.error(res.errMsg)
      return
    }
    // 更新本地缓存的用户信息
    login.value.accountInfo.name = editInfo.value.content.name!
    updateCurrentUserCache('name', editInfo.value.content.name) // 更新缓存里面的用户信息
    if (!editInfo.value.content.modifyNameChance) return
    editInfo.value.content.modifyNameChance -= 1
    window.$message.success('保存成功')
  })
}

/** 佩戴卸下徽章 */
const toggleWarningBadge = async (badge: BadgeType) => {
  if (!badge?.id) return
  await apis.setUserBadge(badge.id)
}

/** 计算字符长度 */
const countGraphemes = (value: string) => {
  const splitter = new GraphemeSplitter()
  return splitter.countGraphemes(value)
}

/* 打开并且创建modal */
const handleEditing = () => {
  /** 获取用户的徽章列表 */
  apis.getBadgeList().then((res) => {
    editInfo.value.badgeList = res.data
  })
  /** 获取用户信息 */
  apis.getUserInfo().then((res) => {
    editInfo.value.content = res.data
  })
  infoShow.value = false
  editInfo.value.show = true
}

/**
 * 统一跳转路由方法
 * @param url 跳转的路由
 * */
const pageJumps = (url: string) => {
  // 判断是否是动态页面
  if (url === 'dynamic') {
    delay(async () => {
      await createWebviewWindow('动态', 'dynamic', 840, 800)
    }, 300)
  } else {
    activeUrl.value = url
    router.push(`/${url}`)
  }
}

/**
 * 打开内容对应窗口
 * @param title 窗口的标题
 * @param label 窗口的标识
 * @param w 窗口的宽度
 * @param h 窗口的高度
 * */
const openContent = (title: string, label: string, w = 840, h = 600) => {
  delay(async () => {
    await createWebviewWindow(title, label, w, h)
  }, 300)
  infoShow.value = false
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.setting-item, .more, .more *')) {
    settingShow.value = false
  }
}

onMounted(async () => {
  /** 页面加载的时候默认显示消息列表 */
  pageJumps(activeUrl.value)
  window.addEventListener('click', closeMenu, true)

  Mitt.on(MittEnum.SHRINK_WINDOW, (event) => {
    shrinkStatus.value = event as boolean
  })
  await listen(EventEnum.WIN_SHOW, (e) => {
    // 如果已经存在就不添加
    if (openWindowsList.value.has(e.payload)) return
    openWindowsList.value.add(e.payload)
  })
  await listen(EventEnum.WIN_CLOSE, (e) => {
    openWindowsList.value.delete(e.payload)
  })
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style lang="scss" scoped>
@import 'style';
.badge-item {
  .tip {
    transition: opacity 0.4s ease-in-out;
    @apply absolute top-0 left-0 w-full h-full flex-center z-999 opacity-0;
  }
  @apply bg-#ccc relative rounded-50% size-fit p-4px cursor-pointer;
  &:hover .tip {
    @apply opacity-100;
  }
}
</style>
