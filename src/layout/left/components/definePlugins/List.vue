<template>
  <div>
    <n-scrollbar style="max-height: 280px" @scroll="handleScroll($event)">
      <n-flex vertical :size="0" class="z-10 box-border w-full">
        <template v-for="(plugin, index) in plugins as STO.Plugins<PluginEnum>[]" :key="index">
          <n-flex align="center" justify="space-between" class="float-block p-[0_20px]">
            <n-flex :size="14" align="center">
              <n-flex align="center" justify="center" class="size-48px rounded-50% bg-#7676760f">
                <Transition mode="out-in">
                  <svg
                    v-if="plugin.state === PluginEnum.NOT_INSTALLED || plugin.state === PluginEnum.DOWNLOADING"
                    class="size-34px color-#999">
                    <use :href="`#${plugin.icon}`"></use>
                  </svg>
                  <template v-else>
                    <svg class="size-34px color-#555">
                      <use :href="`#${plugin.iconAction || plugin.icon}`"></use>
                    </svg>
                  </template>
                </Transition>
              </n-flex>

              <n-flex vertical :size="10">
                <n-flex align="center" :size="6">
                  <p class="text-(14px #666) pl-4px">{{ plugin.title }}</p>

                  <Transition>
                    <svg v-if="plugin.isAdd && plugin.state !== PluginEnum.BUILTIN" class="color-#666 size-14px">
                      <use href="#notOnTop"></use>
                    </svg>
                  </Transition>
                </n-flex>

                <Transition mode="out-in">
                  <n-flex
                    v-if="plugin.state === PluginEnum.UNINSTALLING"
                    class="relative rounded-22px bg-#f6dfe3 size-fit p-[4px_8px]">
                    <p class="text-(12px #c14053 center)">卸载中</p>
                  </n-flex>

                  <n-flex
                    v-else-if="plugin.state === PluginEnum.BUILTIN"
                    class="relative rounded-22px bg-#e3e3e3 size-fit p-[4px_8px]">
                    <p class="text-(12px #777 center)">已内置</p>
                  </n-flex>

                  <n-flex v-else class="relative rounded-22px bg-#e0e9fc size-fit p-[4px_8px]">
                    <p class="text-(12px #4C77BD center)">{{ plugin.version }}</p>
                  </n-flex>
                </Transition>
              </n-flex>
            </n-flex>

            <!-- 未安装和下载中状态 -->
            <n-flex
              v-if="plugin.state === PluginEnum.NOT_INSTALLED || plugin.state === PluginEnum.DOWNLOADING"
              vertical
              justify="center"
              align="center"
              :size="8"
              class="box bg-[--button-bg-color]">
              <!-- 在下载中进度条 -->
              <n-flex
                @click="handleState(plugin)"
                align="center"
                class="relative"
                :class="[plugin.state === PluginEnum.DOWNLOADING ? 'downloading' : 'bg-[--primary-color] size-full']">
                <div
                  :style="{
                    width: plugin.state === PluginEnum.DOWNLOADING ? `${plugin.progress * 0.6}px` : 'auto'
                  }"
                  :class="[
                    plugin.progress < 100 ? 'rounded-l-0 rounded-r-0' : 'rounded-2px',
                    plugin.progress > 0 ? 'h-40px border-(1px solid transparent)' : 'h-40px'
                  ]"
                  v-if="plugin.state === PluginEnum.DOWNLOADING"
                  class="bg-#8CA9F4">
                  <p class="absolute-center text-(12px #4C77BD)">{{ plugin.progress }}%</p>
                </div>

                <p v-else class="text-(12px [--chat-text-color] center) w-full">安装</p>
              </n-flex>
            </n-flex>

            <!-- 卸载中 -->
            <n-spin v-if="plugin.state === PluginEnum.UNINSTALLING" :stroke="'#c14053'" :size="22" />

            <!-- 插件操作 -->
            <n-popover
              v-if="plugin.state === PluginEnum.INSTALLED || index === isCurrently"
              :show="isCurrently === index"
              style="padding: 0"
              :show-arrow="false"
              trigger="click"
              placement="bottom">
              <template #trigger>
                <svg @click.stop="isCurrently = index" class="size-22px rotate-90">
                  <use href="#more"></use>
                </svg>
              </template>

              <div class="action-item">
                <div class="menu-list">
                  <div v-if="!plugin.isAdd" @click="handleAdd(plugin)" class="menu-item">
                    <svg class="color-#4C77BD"><use href="#add"></use></svg>
                    <p class="text-#4C77BD">固定侧边栏</p>
                  </div>
                  <div v-else @click="handleDelete(plugin)" class="menu-item">
                    <svg class="color-#c14053"><use href="#reduce"></use></svg>
                    <p class="text-#c14053">取消固定</p>
                  </div>
                  <div @click="handleUnload(plugin)" class="menu-item">
                    <svg><use href="#delete"></use></svg>
                    <p>卸载</p>
                  </div>
                </div>
              </div>
            </n-popover>
          </n-flex>
        </template>
      </n-flex>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { PluginEnum } from '@/enums'
import { usePluginsStore } from '@/stores/plugins.ts'
import { useMenuTopStore } from '@/stores/menuTop.ts'

const { plugins, updatePlugins } = usePluginsStore()
const { menuTop } = useMenuTopStore()
const scrollTop = ref(-1)
const itemCount = Object.values(plugins).length
const isCurrently = ref(-1)

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
  updateHoverClasses()
}

const handleState = (plugin: STO.Plugins<PluginEnum>) => {
  if (plugin.state === PluginEnum.INSTALLED) return
  plugin.state = PluginEnum.DOWNLOADING
  const interval = setInterval(() => {
    if (plugin.progress < 100) {
      plugin.progress += 10
    } else {
      clearInterval(interval)
      plugin.state = PluginEnum.INSTALLED
      plugin.progress = 0
      updatePlugins(plugin)
    }
  }, 500)
}

const handleUnload = (plugin: STO.Plugins<PluginEnum>) => {
  plugin.state = PluginEnum.UNINSTALLING
  setTimeout(() => {
    handleDelete(plugin)
    plugin.isAdd = false
    plugin.state = PluginEnum.NOT_INSTALLED
    plugin.progress = 0
    updatePlugins(plugin)
  }, 2000)
}

const handleDelete = (plugin: STO.Plugins<PluginEnum>) => {
  // 找到 menuTop 中与 item.url 匹配的项并删除
  const itemIndex = menuTop.findIndex((topItem) => topItem.title === plugin.title)
  if (itemIndex !== -1) {
    setTimeout(() => {
      plugin.isAdd = false
      updatePlugins(plugin)
      menuTop.splice(itemIndex, 1)
    }, 300)
  }
}

const handleAdd = (plugin: STO.Plugins<PluginEnum>) => {
  // 判断如果itemsTop中已经存在该插件，则不再添加
  const itemIndex = menuTop.findIndex((topItem) => topItem.title === plugin.title)
  if (itemIndex !== -1) {
    return
  }
  setTimeout(() => {
    plugin.isAdd = true
    updatePlugins(plugin)
    menuTop.push(plugin)
  }, 300)
}

const closeMenu = (event: Event) => {
  const e = event.target as HTMLInputElement
  if (!e.matches('.action-item')) {
    isCurrently.value = -1
  }
}

const updateHoverClasses = () => {
  let styleStr = ''

  for (let i = 0, len = itemCount; i < len - 1; i++) {
    styleStr += `
      .float-block:nth-child(${i + 1}):hover~.float-block:last-child::before {
        --y: calc(var(--height) * ${i} - ${scrollTop.value}px);
      }
    `
  }

  styleStr += `.float-block:nth-child(${itemCount}):hover::before {
    --y: calc(var(--height) * ${itemCount - 1} - ${scrollTop.value}px);
    opacity: .06;
  }`

  const styleTag = document.getElementById('hover-classes')
  if (styleTag) styleTag.remove()

  const style = document.createElement('style')
  style.id = 'hover-classes'
  style.innerHTML = styleStr
  document.head.appendChild(style)
}

onMounted(() => {
  updateHoverClasses()
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
.float-block {
  --y: 0;
  --height: 70px;
  --surface-2: #767676;

  width: 100%;
  height: var(--height);
  cursor: pointer;
  box-sizing: border-box;
}

.float-block:last-child::before {
  content: '';
  display: block;
  position: absolute;
  background: var(--surface-2);
  opacity: 0;
  width: 100%;
  transform: translateY(var(--y));
  top: 0;
  left: 0;
  height: var(--height);
  pointer-events: none;
  transition: all 0.5s cubic-bezier(0.2, 1, 0.2, 1);
}

.float-block:hover ~ .float-block:last-child:before {
  opacity: 0.06;
}

.box {
  @apply relative select-none cursor-pointer size-fit w-60px h-40px rounded-8px overflow-hidden;
  transition: all 0.2s;
}

.downloading {
  width: 60px;
  background: var(--progress-bg);
}

.action-item {
  @include menu-item-style();
  left: -80px;
  @include menu-list();
}

.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
