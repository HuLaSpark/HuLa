<template>
  <n-scrollbar style="max-height: calc(100vh - 70px)">
    <n-tabs type="segment" animated class="mt-4px p-[4px_10px_0px_8px]">
      <n-tab-pane name="1" tab="好友">
        <n-scrollbar style="max-height: calc(100vh - 126px)">
          <n-collapse :display-directive="'show'">
            <ContextMenu @contextmenu="showMenu($event)" @select="handleSelect($event.label)" :menu="menuList">
              <n-collapse-item title="我的好友" name="1">
                <template #header-extra>
                  <span class="text-(10px #707070)">0/0</span>
                </template>

                <!-- 用户框 多套一层div来移除默认的右键事件然后覆盖掉因为margin空隙而导致右键可用 -->
                <div @contextmenu.stop="$event.preventDefault()">
                  <n-flex
                    :size="10"
                    @click="handleClick(item.uid, RoomTypeEnum.SINGLE)"
                    :class="{ active: activeItem === item.uid }"
                    class="user-box w-full h-75px mb-5px"
                    v-for="item in contactStore.contactsList"
                    :key="item.uid">
                    <n-flex align="center" :size="10" class="h-75px pl-6px pr-8px flex-1 truncate">
                      <n-avatar
                        round
                        bordered
                        :color="'#fff'"
                        :size="44"
                        :src="useUserInfo(item.uid).value.avatar"
                        fallback-src="/logo.png" />

                      <n-flex vertical justify="space-between" class="h-fit flex-1 truncate">
                        <span class="text-14px leading-tight flex-1 truncate">{{
                          useUserInfo(item.uid).value.name
                        }}</span>

                        <span class="text leading-tight text-12px flex-1 truncate">
                          [⛅今日天气] 说的很经典哈萨克的哈萨克看到贺卡上
                        </span>
                      </n-flex>
                    </n-flex>
                  </n-flex>
                </div>
              </n-collapse-item>
            </ContextMenu>
          </n-collapse>
        </n-scrollbar>
      </n-tab-pane>
      <!--      <n-tab-pane name="2" tab="群聊">-->
      <!--        <div-->
      <!--          @click="handleClick(item.key, RoomTypeEnum.GROUP)"-->
      <!--          :class="{ active: activeItem === item.key }"-->
      <!--          class="w-full h-75px mb-5px"-->
      <!--          v-for="item in groupChatList"-->
      <!--          :key="item.key">-->
      <!--          <n-flex v-slide align="center" :size="10" class="h-75px pl-6px pr-8px flex-1 truncate">-->
      <!--            <n-avatar round bordered :color="'#fff'" :size="44" :src="item.avatar" fallback-src="/logo.png" />-->

      <!--            <span class="text-14px leading-tight flex-1 truncate">{{ item.accountName }}</span>-->
      <!--          </n-flex>-->
      <!--        </div>-->
      <!--      </n-tab-pane>-->
    </n-tabs>
  </n-scrollbar>
</template>
<script setup lang="ts">
import Mitt from '@/utils/Bus.ts'
import { MittEnum, RoomTypeEnum } from '@/enums'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserInfo } from '@/hooks/useCached.ts'

const menuList = ref([
  { label: '添加分组', icon: 'plus' },
  { label: '重命名该组', icon: 'edit' },
  { label: '删除分组', icon: 'delete' }
])
/** 建议把此状态存入localStorage中 */
const activeItem = ref(0)
const detailsShow = ref(false)
const shrinkStatus = ref(false)
const contactStore = useContactStore()
/** 监听独立窗口关闭事件 */
watchEffect(() => {
  Mitt.on(MittEnum.SHRINK_WINDOW, async (event) => {
    shrinkStatus.value = event as boolean
  })
})

const handleClick = (index: number, type: number) => {
  detailsShow.value = true
  activeItem.value = index
  const data = {
    context: {
      type: type,
      uid: index
    },
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
    border-radius: 12px;
    cursor: pointer;
  }
}

.active {
  background: var(--bg-active-msg);
  border-radius: 12px;
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
