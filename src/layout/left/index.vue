<template>
  <main class="left w-60px h-full p-[30px_6px_15px] box-border flex-col-center select-none">
    <img class="border-rounded-50% w-36px h-36px bg-#fff cursor-pointer" src="/logo.png" alt="" />

    <div data-tauri-drag-region class="wh-full mt-20px flex-col-x-center justify-between">
      <!-- 上部分操作栏 -->
      <header class="flex-col-x-center gap-10px color-[--icon-color]">
        <div
          v-for="(item, index) in itemsTop"
          :key="index"
          @click="pageJumps(item.url)"
          class="top-action"
          :class="{ active: activeItem === item.url }">
          <n-badge :value="item.badge" :max="99">
            <svg class="w-22px h-22px">
              <use :href="`#${activeItem === item.url && item.iconAction ? item.iconAction : item.icon}`"></use>
            </svg>
          </n-badge>
        </div>
      </header>

      <!-- 下部分操作栏 -->
      <footer class="flex-col-x-center gap-10px color-[--icon-color]">
        <div
          v-for="(item, index) in itemsBottom"
          :key="index"
          @click="openContent(item.label, item.title)"
          class="bottom-action">
          <svg class="w-22px h-22px">
            <use :href="`#${item.icon}`"></use>
          </svg>
        </div>

        <svg @click="settingShow = !settingShow" class="more w-22px h-22px relative">
          <use href="#hamburger-button"></use>
        </svg>

        <!--  更多选项面板  -->
        <div v-if="settingShow" class="setting-item">
          <div class="menu-list">
            <div v-for="(item, index) in menuList" :key="index">
              <div class="menu-item" @click="() => item.click()">
                <svg><use :href="`#${item.icon}`"></use></svg>
                {{ item.label }}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </main>
</template>
<script setup lang="ts">
import { delay } from 'lodash-es'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'
import Mitt from '@/utils/Bus.ts'

type TopActive = {
  url: string
  icon: string
  iconAction?: string
  badge?: number
}[]

type BottomActive = {
  title: string
  url: string
  label: string
  icon: string
  iconAction?: string
}[]

type MenuList = {
  label: string
  icon: string
  click: () => void
}[]

const itemsTop = ref<TopActive>([
  {
    url: 'message',
    icon: 'message',
    iconAction: 'message-action'
  },
  {
    url: 'friendsList',
    icon: 'avatar',
    iconAction: 'avatar-action'
  },
  {
    url: 'space',
    icon: 'fire',
    iconAction: 'fire-action'
  }
])
const itemsBottom: BottomActive = [
  {
    title: '邮件',
    url: '/mail',
    label: 'mail',
    icon: 'mail',
    iconAction: 'mail-action'
  },
  {
    title: '文件管理器',
    url: '/folder',
    label: 'mail',
    icon: 'file',
    iconAction: 'file-action'
  },
  {
    title: '收藏',
    url: '/collection',
    label: 'mail',
    icon: 'collect',
    iconAction: 'collect-action'
  }
]
/* 设置列表菜单项 */
const menuList = ref<MenuList>([
  {
    label: '检查更新',
    icon: 'arrow-circle-up',
    click: () => {
      // todo 检查更新
      console.log('检查更新')
    }
  },
  {
    label: '设置',
    icon: 'settings',
    click: async () => {
      // todo 设置
      await createWebviewWindow('设置', 'settings', 840, 840)
    }
  },
  {
    label: '关于',
    icon: 'info',
    click: async () => {
      // todo 关于
      await createWebviewWindow('关于', 'about', 360, 480)
    }
  },
  {
    label: '退出账号',
    icon: 'power',
    click: async () => {
      // todo 退出账号 需要关闭其他的全部窗口
      // 1.需要退出账号
      await createWebviewWindow('登录', 'login', 320, 448, 'home', true, false, 320, 448)
    }
  }
])
/*当前选中的元素 默认选中itemsTop的第一项*/
const activeItem = ref<string>(itemsTop.value[0].url)
const settingShow = ref(false)
const { createWebviewWindow } = useWindow()

watchEffect(() => {
  Mitt.on('updateMsgTotal', (event) => {
    itemsTop.value.find((item) => {
      if (item.url === 'message') {
        item.badge = event as number
      }
    })
  })
})

/**
 * 统一跳转路由方法
 * @param url 跳转的路由
 * */
const pageJumps = (url: string) => {
  activeItem.value = url
  router.push(`/${url}`)
}

/**
 * 打开内容对应窗口
 * @param label 窗口的标识
 * @param title 窗口的标题
 * */
const openContent = (label: string, title: string) => {
  delay(async () => {
    await createWebviewWindow(title, label, 840, 600)
  }, 300)
}

const closeMenu = (event: any) => {
  if (!event.target.matches('.setting-item, .more')) {
    settingShow.value = false
  }
}

onMounted(() => {
  /* 页面加载的时候默认显示消息列表 */
  pageJumps(activeItem.value)
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
@mixin action() {
  padding: 6px 8px 6px 8px;
  &:not(.active):hover {
    background: rgba(193, 193, 193, 0.4);
    border-radius: 8px;
    color: #059669;
    cursor: pointer;
    animation: linearAnimation 3s linear forwards;
  }
}

.left {
  background: var(--left-bg-color);
}

.top-action,
.bottom-action,
.more {
  @include action;
}

.active {
  background: var(--left-active-color);
  border-radius: 8px;
  color: #059669;
}

.setting-item {
  @include menu-item-style(absolute);
  left: 58px;
  bottom: 10px;
  @include menu-list();
}

:deep(.n-badge .n-badge-sup) {
  font-weight: bold;
  font-size: 10px;
}

:deep(.n-badge) {
  color: inherit;
}
</style>
