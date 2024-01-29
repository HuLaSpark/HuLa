<template>
  <div class="w-60px h-full pt-30px pl-6px pr-6px pb-15px box-border flex-col-center select-none">
    <img @click="toLogin" class="border-rounded-50% w-36px h-36px bg-#fff cursor-pointer" src="/logo.png" alt="" />

    <div data-tauri-drag-region class="wh-full mt-20px flex-col-x-center justify-between">
      <!-- 上部分操作栏 -->
      <div class="flex-col-x-center gap-10px">
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
      </div>

      <!-- 下部分操作栏 -->
      <div class="flex-col-x-center gap-10px">
        <div v-for="(item, index) in itemsBottom" :key="index" @click="openContent(item.label)" class="bottom-action">
          <svg class="w-22px h-22px">
            <use :href="`#${item.icon}`"></use>
          </svg>
        </div>

        <svg class="more w-22px h-22px"><use href="#hamburger-button"></use></svg>
      </div>
    </div>
  </div>
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
  url: string
  label: string
  icon: string
  iconAction?: string
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
    url: '/mail',
    label: 'mail',
    icon: 'mail',
    iconAction: 'mail-action'
  },
  {
    url: '/folder',
    label: 'mail',
    icon: 'file',
    iconAction: 'file-action'
  },
  {
    url: '/collection',
    label: 'mail',
    icon: 'collect',
    iconAction: 'collect-action'
  }
]

/*当前选中的元素 默认选中itemsTop的第一项*/
const activeItem = ref<string>(itemsTop.value[0].url)
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
 * */
const openContent = (label: string) => {
  delay(async () => {
    await createWebviewWindow(label, 840, 600)
  }, 300)
}

const toLogin = () => {
  // todo 暂时使用创建新窗口来跳转到登录页面，生产环境一般不会跳转到登录页面
  delay(async () => {
    await createWebviewWindow('login', 320, 448, 'home', false, 320, 448)
  }, 800)
}

onMounted(() => {
  /* 页面加载的时候默认显示消息列表 */
  pageJumps(activeItem.value)
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

.top-action,
.bottom-action,
.more {
  @include action;
}

.active {
  background: rgba(193, 193, 193, 0.4);
  border-radius: 8px;
  color: #059669;
}

:deep(.n-badge .n-badge-sup) {
  font-weight: bold;
  font-size: 10px;
}

:deep(.n-badge) {
  color: inherit;
}
</style>
