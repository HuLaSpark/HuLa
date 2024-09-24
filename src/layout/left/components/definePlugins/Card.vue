<template>
  <div>
    <n-scrollbar style="max-height: 280px">
      <n-flex :size="26" class="z-10 p-[18px_18px_36px_18px] box-border w-full">
        <template v-for="(plugin, index) in plugins" :key="index">
          <Transition name="fade" mode="out-in">
            <!-- 未安装和下载中状态 -->
            <n-flex
              v-if="plugin.state === PluginEnum.NOT_INSTALLED || plugin.state === PluginEnum.DOWNLOADING"
              vertical
              justify="center"
              align="center"
              :size="8"
              :class="{ 'filter-shadow': page.shadow }"
              class="box bg-[--info-hover]">
              <svg class="size-38px color-#999"><use :href="`#${plugin.icon}`"></use></svg>
              <p class="text-(12px #666)">{{ plugin.title }}</p>

              <!-- 在下载中进度条 -->
              <n-flex
                @click="handleState(plugin)"
                class="relative rounded-22px border-(1px solid #4C77BD)"
                :class="[
                  plugin.state === PluginEnum.DOWNLOADING ? 'downloading' : 'bg-[--progress-bg] size-fit p-[4px_8px]'
                ]">
                <div
                  :style="{
                    width: plugin.state === PluginEnum.DOWNLOADING ? `${plugin?.progress * 0.8}px` : 'auto'
                  }"
                  :class="[
                    plugin?.progress < 100 ? 'rounded-l-24px rounded-r-0' : 'rounded-24px',
                    plugin?.progress > 0 ? 'h-18px border-(1px solid transparent)' : 'h-20px'
                  ]"
                  v-if="plugin.state === PluginEnum.DOWNLOADING"
                  class="bg-#8CA9F4">
                  <p class="absolute-center text-(12px #4C77BD)">{{ plugin?.progress }}%</p>
                </div>

                <p v-else class="text-(12px #4C77BD center)">安装</p>
              </n-flex>

              <!-- 闪光效果 -->
              <div class="flash"></div>
            </n-flex>

            <!-- 可卸载状态或内置插件状态 -->
            <n-flex
              v-else
              vertical
              justify="center"
              align="center"
              :size="8"
              class="box"
              :class="[
                plugin.state === PluginEnum.BUILTIN
                  ? 'built'
                  : plugin.state === PluginEnum.UNINSTALLING
                    ? 'unload'
                    : 'colorful',
                {
                  'filter-shadow': page.shadow
                }
              ]">
              <svg class="size-38px color-#555"><use :href="`#${plugin.iconAction || plugin.icon}`"></use></svg>
              <p class="text-(12px #666)">{{ plugin.title }}</p>

              <n-flex
                v-if="plugin.state === PluginEnum.UNINSTALLING"
                class="relative rounded-22px border-(1px solid #c14053) bg-#f6dfe3 p-[4px_8px]">
                <p class="text-(12px #c14053 center)">卸载中</p>
              </n-flex>

              <n-flex
                v-if="plugin.state === PluginEnum.BUILTIN"
                class="relative rounded-22px border-(1px solid #777) bg-#e3e3e3 size-fit p-[4px_8px]">
                <p class="text-(12px #777 center)">已内置</p>
              </n-flex>

              <n-flex
                v-if="plugin.state === PluginEnum.INSTALLED"
                class="relative rounded-22px border-(1px solid #4C77BD) bg-#e0e9fc p-[4px_8px]">
                <p class="text-(12px #4C77BD center)">{{ plugin.version }}</p>
              </n-flex>

              <!-- 闪光效果 -->
              <div class="flash"></div>

              <Transition>
                <svg
                  v-if="plugin.isAdd && plugin.state !== PluginEnum.BUILTIN"
                  class="absolute color-#666 left-2px top-2px size-14px">
                  <use href="#notOnTop"></use>
                </svg>
              </Transition>

              <!-- 插件操作 -->
              <n-popover
                v-if="plugin.state === PluginEnum.INSTALLED || index === isCurrently"
                :show="isCurrently === index"
                style="padding: 0"
                :show-arrow="false"
                trigger="click"
                placement="bottom">
                <template #trigger>
                  <svg @click.stop="isCurrently = index" class="absolute color-#666 right-0 top-0 size-18px rotate-90">
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
          </Transition>
        </template>
      </n-flex>
    </n-scrollbar>
  </div>
</template>
<script setup lang="ts">
import { PluginEnum } from '@/enums'
import { setting } from '@/stores/setting.ts'
import { usePluginsStore } from '@/stores/plugins.ts'
import { useMenuTopStore } from '@/stores/menuTop.ts'

const settingStore = setting()
const { updatePlugins, plugins } = usePluginsStore()
const { menuTop } = useMenuTopStore()
const { page } = storeToRefs(settingStore)
const isCurrently = ref(-1)

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

onMounted(() => {
  window.addEventListener('click', closeMenu, true)
})

onUnmounted(() => {
  window.removeEventListener('click', closeMenu, true)
})
</script>

<style scoped lang="scss">
.box {
  @apply relative select-none custom-shadow cursor-pointer size-fit w-100px h-100px rounded-8px overflow-hidden;
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
  background: var(--progress-bg);
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
  background-image: linear-gradient(45deg, #a8edea 0%, #fed6e3 100%);
}

.built {
  background-image: linear-gradient(-20deg, #e9defa 0%, #fbfcdb 100%);
}

.unload {
  background-image: linear-gradient(to top, #feada6 0%, #f5efef 100%);
}

.filter-shadow {
  filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.2));
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
