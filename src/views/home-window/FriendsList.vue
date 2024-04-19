<template>
  <n-scrollbar style="max-height: calc(100vh - 70px)">
    <n-tabs type="segment" animated class="mt-4px p-[4px_10px_0px_8px]">
      <n-tab-pane name="1" tab="好友">
        <n-scrollbar style="max-height: calc(100vh - 126px)">
          <n-collapse :display-directive="'show'">
            <ContextMenu @contextmenu="showMenu($event)" @select="handleSelect($event.label)" :menu="menuList">
              <n-collapse-item title="我的设备" name="1">
                <template #header-extra>
                  <p class="text-(10px #707070)">1/1</p>
                </template>
                <div>可以</div>
              </n-collapse-item>
              <n-collapse-item title="特别关心" name="2">
                <template #header-extra>
                  <p class="text-(10px #707070)">1/1</p>
                </template>

                <!-- 用户框 多套一层div来移除默认的右键事件然后覆盖掉因为margin空隙而导致右键可用 -->
                <div @contextmenu.stop="$event.preventDefault()">
                  <div
                    v-slide
                    @click="handleClick(item.key, 2)"
                    :class="{ active: activeItem === item.key }"
                    class="user-box w-full h-75px mb-5px"
                    v-for="item in friendsList"
                    :key="item.key">
                    <div class="flex items-center h-full pl-6px pr-8px gap-10px">
                      <img class="size-44px rounded-50% bg-#fff border-(1px solid #f1f1f1)" :src="item.avatar" alt="" />

                      <div class="h-38px flex flex-1 flex-col justify-between">
                        <div class="text-14px flex-y-center gap-4px">
                          {{ item.accountName }}
                        </div>

                        <div
                          class="text w-155px h-14px text-12px flex-y-center gap-4px"
                          style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                          <p class="text-12px">[⛅今日天气]</p>
                          <p>说的很经典哈萨克的哈萨克看到贺卡上</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </n-collapse-item>
              <n-collapse-item title="默认分组" name="3">
                <template #header-extra>
                  <p class="text-(10px #707070)">1/1</p>
                </template>

                <div>123</div>
              </n-collapse-item>
            </ContextMenu>
          </n-collapse>
        </n-scrollbar>
      </n-tab-pane>
      <n-tab-pane name="2" tab="群聊">
        <div
          @click="handleClick(item.key, 1)"
          :class="{ active: activeItem === item.key }"
          class="w-full h-75px mb-5px cursor-pointer"
          v-for="item in groupChatList"
          :key="item.key">
          <!-- 消息框，使用v-slide自定义指令来自动抉择右键菜单位置 -->
          <div v-slide class="flex items-center h-full pl-6px pr-8px gap-10px">
            <img class="size-44px rounded-50% bg-#fff border-(1px solid #f1f1f1)" :src="item.avatar" alt="" />

            <div class="h-38px flex flex-1 flex-col justify-center">
              <div class="flex-between-center">
                <span class="text-14px">{{ item.accountName }}</span>
              </div>
            </div>
          </div>
        </div>
      </n-tab-pane>
    </n-tabs>
  </n-scrollbar>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import { MockList } from '@/mock/index.ts'
import { MittEnum } from '@/enums'

const menuList = ref([
  { label: '添加分组', icon: 'plus' },
  { label: '重命名该组', icon: 'edit' },
  { label: '删除分组', icon: 'delete' }
])
/* 建议把此状态存入localStorage中 */
const activeItem = ref(0)
const detailsShow = ref(false)
const shrinkStatus = ref(false)

const friendsList = ref(MockList.value.filter((item) => item.type === 2))
const groupChatList = ref(MockList.value.filter((item) => item.type === 1))

/* 监听独立窗口关闭事件 */
watchEffect(() => {
  Mitt.on(MittEnum.SHRINK_WINDOW, async (event) => {
    shrinkStatus.value = event as boolean
  })
})

const handleClick = (index: number, type: number) => {
  detailsShow.value = true
  activeItem.value = index
  const data = {
    type: type,
    data:
      type === 1
        ? groupChatList.value.filter((item) => item.key === index)
        : friendsList.value.filter((item) => item.key === index),
    detailsShow: detailsShow.value
  }
  Mitt.emit(MittEnum.DETAILS_SHOW, data)
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
  Mitt.emit(MittEnum.DETAILS_SHOW, detailsShow.value)
})
</script>

<style scoped lang="scss">
.user-box {
  color: var(--text-color);
  .text {
    color: #808080;
  }
  &:not(.active):hover {
    background: var(--bg-msg-hover);
    border-radius: 6px;
    cursor: pointer;
  }
}

.active {
  background: var(--bg-active-msg);
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
