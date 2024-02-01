<template>
  <n-tabs type="segment" animated class="mt-4px">
    <n-tab-pane name="1" tab="好友">
      <n-scrollbar style="max-height: calc(100vh - 126px)">
        <n-collapse :display-directive="'show'">
          <ContextMenu
            @contextmenu="showMenu($event)"
            @select="handleSelect($event.label)"
            :menu="[{ label: '添加分组' }, { label: '重命名该组' }, { label: '删除分组' }]">
            <n-collapse-item title="我的设备" name="1">
              <template #header-extra>
                <p class="font-size-10px color-#707070">1/1</p>
              </template>
              <div>可以</div>
            </n-collapse-item>
            <n-collapse-item title="特别关心" name="2">
              <template #header-extra>
                <p class="font-size-10px color-#707070">1/1</p>
              </template>

              <!-- 用户框 多套一层div来移除默认的右键事件然后覆盖掉因为margin空隙而导致右键可用 -->
              <div @contextmenu.stop="$event.preventDefault()">
                <div
                  @click="handleClick(n)"
                  :class="{ active: activeItem === n }"
                  class="user-box w-full h-75px mb-5px"
                  v-for="n in 20"
                  :key="n">
                  <div class="flex items-center h-full pl-6px pr-8px gap-10px">
                    <img
                      class="w-44px h-44px rounded-50% bg-#fff"
                      style="border: 1px solid #f1f1f1"
                      src="/logo.png"
                      alt="" />

                    <div class="w-full h-38px flex flex-col justify-between">
                      <div class="font-size-14px flex-y-center gap-4px">
                        <p>宝贝🍓</p>
                        <p>(快乐羊多多)</p>
                      </div>

                      <div
                        class="text w-155px h-14px font-size-12px flex-y-center gap-4px"
                        style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                        <p class="font-size-12px">[⛅今日天气]</p>
                        <p>说的很经典哈萨克的哈萨克看到贺卡上</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-collapse-item>
            <n-collapse-item title="默认分组" name="3">
              <template #header-extra>
                <p class="font-size-10px color-#707070">1/1</p>
              </template>

              <div>123</div>
            </n-collapse-item>
          </ContextMenu>
        </n-collapse>
      </n-scrollbar>
    </n-tab-pane>
    <n-tab-pane name="2" tab="群聊">
      <n-collapse>
        <n-collapse-item title="青铜" name="1">
          <div>可以</div>
        </n-collapse-item>
        <n-collapse-item title="白银" name="2">
          <div>很好</div>
        </n-collapse-item>
        <n-collapse-item title="黄金" name="3">
          <div>真棒</div>
        </n-collapse-item>
      </n-collapse>
    </n-tab-pane>
  </n-tabs>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'

/* 建议把此状态存入localStorage中 */
const activeItem = ref(0)
const detailsShow = ref(false)

const handleClick = (index: number) => {
  detailsShow.value = true
  activeItem.value = index
  Mitt.emit('detailsShow', detailsShow.value)
}
// todo 需要循环数组来展示分组
const showMenu = (event: MouseEvent) => {
  console.log(event)
}

const handleSelect = (event: MouseEvent) => {
  console.log(event)
}

onUnmounted(() => {
  detailsShow.value = false
  Mitt.emit('detailsShow', detailsShow.value)
})
</script>

<style scoped lang="scss">
.user-box {
  .text {
    color: #808080;
  }
  &:not(.active):hover {
    background: #f3f3f3;
    border-radius: 6px;
    cursor: pointer;
  }
}

.active {
  background: rgba(5, 150, 105, 0.8);
  border-radius: 8px;
  color: #fff;
  .text {
    color: #fff;
  }
}

:deep(.n-collapse .n-collapse-item:not(:first-child)) {
  border: none;
}
:deep(.n-collapse .n-collapse-item) {
  margin: 6px 0 0;
}
</style>
