<template>
  <div class="w-60px h-full pt-30px pl-6px pr-6px pb-15px box-border flex-col-center select-none">
    <img @click="toLogin" class="border-rounded-50% w-36px h-36px bg-#fff cursor-pointer" src="/logo.png" alt="" />

    <div class="wh-full mt-20px flex-col-x-center justify-between">
      <!-- 上部分操作栏 -->
      <div class="flex-col-x-center gap-10px">
        <div
          v-for="(item, index) in items"
          :key="index"
          @click="pageJumps(item.url)"
          class="top-action"
          :class="{ active: activeItem === item.url }">
          <svg class="w-22px h-22px"><use :href="`#${item.icon}`"></use></svg>
        </div>
      </div>

      <!-- 下部分操作栏 -->
      <div class="bottom-action flex-col-x-center gap-18px">
        <svg><use href="#mail"></use></svg>
        <svg><use href="#folder-close"></use></svg>
        <svg><use href="#collection-files"></use></svg>
        <svg><use href="#hamburger-button"></use></svg>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { delay } from 'lodash-es'
import { useWindow } from '@/hooks/useWindow.ts'
import router from '@/router'

const items = [
  {
    url: 'message',
    icon: 'message'
  },
  {
    url: 'friendsList',
    icon: 'avatar'
  },
  {
    url: 'space',
    icon: 'star-one'
  },
  {
    url: 'more',
    icon: 'application-menu'
  }
]

/*当前选中的元素 默认选中items的第一项*/
const activeItem = ref<string>(items[0].url)
const { createWebviewWindow } = useWindow()

/**
 * 统一跳转路由方法
 * @param url 跳转的路由
 * */
const pageJumps = (url: string) => {
  activeItem.value = url
  router.push(`/${url}`)
}

const toLogin = () => {
  // todo 暂时使用创建新窗口来跳转到登录页面，生产环境一般不会跳转到登录页面
  delay(async () => {
    await createWebviewWindow('login', 320, 448, 'home')
  }, 800)
}

onMounted(() => {
  /* 页面加载的时候默认显示消息列表 */
  pageJumps(activeItem.value)
})
</script>

<style scoped lang="scss">
@mixin wh($w: 22px, $h: 22px) {
  width: $w;
  height: $h;
}
.top-action {
  padding: 6px 8px 6px 8px;
  &:not(.active):hover {
    background: rgba(193, 193, 193, 0.4);
    border-radius: 8px;
    color: #189f57;
    cursor: pointer;
    animation: linearAnimation 5s linear forwards;
  }
}

.bottom-action {
  svg {
    @include wh;
    &:hover {
      color: #189f57;
      cursor: pointer;
    }
  }
}

.active {
  background: rgba(193, 193, 193, 0.4);
  border-radius: 8px;
  color: #189f57;
}
</style>
