<template>
  <!-- 弹出框 -->
  <n-modal v-model:show="isShow" :mask-closable="false" class="w-450px border-rd-8px">
    <div class="bg-[--bg-popover] h-full box-border flex flex-col">
      <!-- 顶部图片加上操作栏 -->
      <div class="h-140px relative w-full p-6px box-border">
        <img
          class="absolute blur-6px rounded-t-6px z-1 top-0 left-0 w-full h-140px object-cover"
          src="@/assets/img/dispersion-bg.png"
          alt="" />
        <img
          class="absolute rounded-t-6px z-2 top-0 left-0 w-full h-140px object-cover"
          src="@/assets/img/dispersion-bg.png"
          alt="" />

        <div
          v-if="type() === 'macos'"
          @click="handleClose"
          class="mac-close z-10 relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
          <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
            <use href="#close"></use>
          </svg>
        </div>

        <svg
          v-if="type() === 'windows'"
          @click="handleClose"
          class="z-10 w-12px h-12px ml-a cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
      </div>

      <n-flex :size="4" align="center" class="p-18px">
        <p class="text-(16px [--text-color])">插件管理</p>
        <div class="ml-6px p-[4px_8px] size-fit bg-[--bate-bg] rounded-8px text-(12px [--bate-color] center)">Beta</div>
      </n-flex>

      <n-scrollbar style="max-height: 320px">
        <n-flex :size="26" class="z-10 p-[4px_18px] bg-#cc w-full h-280px">
          <template v-for="(plugin, index) in plugins" :key="index">
            <n-flex :size="12">
              <Transition name="fade" mode="out-in">
                <!-- 未安装和下载中状态 -->
                <n-flex
                  v-if="plugin.state === PluginEnum.NOT_INSTALLED || plugin.state === PluginEnum.DOWNLOADING"
                  vertical
                  justify="center"
                  align="center"
                  :size="8"
                  class="box bg-#f1f1f1">
                  <svg class="size-38px color-#555"><use :href="`#${plugin.icon}`"></use></svg>
                  <p class="text-(12px #666)">{{ plugin.title }}</p>

                  <n-flex
                    @click="handleState(plugin)"
                    class="relative rounded-22px border-(1px solid #4C77BD)"
                    :class="[
                      plugin.state === PluginEnum.DOWNLOADING ? 'downloading' : 'bg-#e0e9fc size-fit p-[4px_8px]'
                    ]">
                    <div
                      :style="{
                        width: plugin.state === PluginEnum.DOWNLOADING ? `${plugin.progress * 0.8}px` : 'auto'
                      }"
                      :class="[
                        plugin.progress < 100 ? 'rounded-l-24px rounded-r-0' : 'rounded-24px',
                        plugin.progress > 0 ? 'h-18px border-(1px solid transparent)' : 'h-20px'
                      ]"
                      v-if="plugin.state === PluginEnum.DOWNLOADING"
                      class="bg-#8CA9F4">
                      <p class="absolute-center text-(12px #4C77BD)">{{ plugin.progress }}%</p>
                    </div>

                    <p v-else class="text-(12px #4C77BD center)">安装</p>
                  </n-flex>

                  <!-- 闪光效果 -->
                  <div class="flash"></div>
                </n-flex>

                <!-- 可卸载状态 -->
                <n-flex v-else vertical justify="center" align="center" :size="8" class="box colorful">
                  <svg class="size-38px color-#555"><use :href="`#${plugin.iconActive || plugin.icon}`"></use></svg>
                  <p class="text-(12px #666)">{{ plugin.title }}</p>

                  <n-flex
                    v-if="plugin.state === PluginEnum.UNINSTALLING"
                    class="relative rounded-22px border-(1px solid #c14053) bg-#f6dfe3 p-[4px_8px]">
                    <p class="text-(12px #c14053 center)">卸载中</p>
                  </n-flex>

                  <n-flex
                    v-else
                    class="relative rounded-22px border-(1px solid #4C77BD) bg-#e0e9fc size-fit p-[4px_8px]">
                    <p class="text-(12px #4C77BD center)">{{ plugin.version }}</p>
                  </n-flex>

                  <!-- 闪光效果 -->
                  <div class="flash"></div>

                  <!-- 插件操作 -->
                  <n-popover
                    v-model:show="plugin.isAction"
                    style="padding: 0"
                    :show-arrow="false"
                    trigger="click"
                    placement="bottom-end">
                    <template #trigger>
                      <svg class="absolute color-#666 right-0 top-0 size-18px rotate-90"><use href="#more"></use></svg>
                    </template>

                    <div @click.stop="plugin.isAction = false" class="action-item">
                      <div class="menu-list">
                        <div @click="handleAdd(index)" class="menu-item">
                          <svg class="color-#4C77BD"><use href="#add"></use></svg>
                          <p class="text-#4C77BD">添加侧边栏</p>
                        </div>
                        <div @click="handleDelete(index)" class="menu-item">
                          <svg class="color-#c14053"><use href="#reduce"></use></svg>
                          <p class="text-#c14053">删除</p>
                        </div>
                        <div @click="handleUnload(index)" class="menu-item">
                          <svg><use href="#delete"></use></svg>
                          <p>卸载</p>
                        </div>
                      </div>
                    </div>
                  </n-popover>
                </n-flex>
              </Transition>
            </n-flex>
          </template>
        </n-flex>
      </n-scrollbar>
    </div>
  </n-modal>
</template>
<script setup lang="ts">
import { type } from '@tauri-apps/plugin-os'
import { PluginEnum } from '@/enums'
import { itemsTop } from '../config.tsx'

// todo: 这里需要修改和 OPT.L.Common[] 的类型定义
type Plugins = {
  title: string
  state: PluginEnum
  version: string
  isAction: boolean
  icon: string
  iconActive: string
}

const props = defineProps<{
  show: boolean
}>()

const { show } = toRefs(props)
const isShow = ref(show.value)
const plugins = ref<Plugins[]>([
  {
    title: 'HuLa云音乐',
    state: PluginEnum.NOT_INSTALLED,
    version: 'v1.0.0-Bate',
    isAction: false,
    icon: 'Music'
  },
  {
    title: 'HuLa AI',
    state: PluginEnum.NOT_INSTALLED,
    version: 'v2.0.0-Bate',
    isAction: false,
    icon: 'robot',
    icon_active: 'robot-action'
  }
])
const emits = defineEmits(['close'])

watch(show, (newVal) => {
  isShow.value = newVal
})

const handleClose = () => {
  isShow.value = false
  emits('close', isShow.value)
}

const handleState = (plugin) => {
  if (plugin.state === PluginEnum.INSTALLED) return
  plugin.state = PluginEnum.DOWNLOADING
  plugin.progress = 0
  const interval = setInterval(() => {
    if (plugin.progress < 100) {
      plugin.progress += 10
    } else {
      clearInterval(interval)
      plugin.state = PluginEnum.INSTALLED
    }
  }, 500)
}

const handleUnload = (index: number) => {
  plugins.value.filter((item, i) => {
    if (i === index) {
      item.state = PluginEnum.UNINSTALLING
      setTimeout(() => {
        handleDelete(index)
        item.state = PluginEnum.NOT_INSTALLED
      }, 2000)
    }
  })
}

const handleDelete = (index) => {
  plugins.value.filter((item, i) => {
    if (i === index) {
      // 找到 itemsTop 中与 item.icon 匹配的项并删除
      const itemIndex = itemsTop.value.findIndex((topItem) => topItem.icon === item.icon)
      if (itemIndex !== -1) {
        itemsTop.value.splice(itemIndex, 1)
      }
    }
  })
}

const handleAdd = (index) => {
  plugins.value.filter((item, i) => {
    if (i === index) {
      // 判断如果itemsTop中已经存在该插件，则不再添加
      const itemIndex = itemsTop.value.findIndex((topItem) => topItem.icon === item.icon)
      if (itemIndex !== -1) {
        return
      }
      itemsTop.value.push(item)
    }
  })
}
</script>

<style scoped lang="scss">
.box {
  @apply relative select-none custom-shadow cursor-pointer size-fit w-100px h-100px rounded-8px overflow-hidden;
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.2));
  transition: all 0.2s;
  .flash {
    position: absolute;
    left: -130%;
    top: 0;
    width: 100px;
    height: 100px;
    background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
    transform: skew(-30deg);
    pointer-events: none;
  }
  &:hover .flash {
    left: 130%;
    transition: all 0.8s ease-in-out;
  }
}

.downloading {
  width: 80px;
  background: #f1f1f1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.action-item {
  @include menu-item-style();
  left: -80px;
  @include menu-list();
}

.colorful {
  background: linear-gradient(45deg, #fdcbf1 0%, #fdcbf1 1%, #e6dee9 100%);
}
</style>
