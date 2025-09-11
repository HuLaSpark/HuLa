<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-#FAFAFA"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="群设置" />
    </template>

    <template #container="{ changedHeight }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: changedHeight + 'px' }" class="z-2 absolute flex flex-col overflow-auto min-h-70vh w-full">
        <div class="flex flex-col gap-15px py-15px px-20px">
          <div class="flex shadow bg-white rounded-10px w-full h-60px items-center gap-10px">
            <!-- 群头像 -->
            <div class="ms-15px self-center h-38px bg-gray-100 rounded-full flex items-center justify-center">
              <n-badge>
                <n-avatar
                  :size="40"
                  :src="AvatarUtils.getAvatarUrl(gloabalStore.currentSession.avatar)"
                  fallback-src="/logo.png"
                  round />
              </n-badge>
            </div>
            <div class="text-14px flex items-center h-full gap-5px">
              <span>
                {{
                  gloabalStore.currentSession.remark
                    ? gloabalStore.currentSession.remark
                    : gloabalStore.currentSession.name
                }}
              </span>
              <span>
                <svg class="w-18px h-18px iconpark-icon text-#1A9B83">
                  <use href="#auth"></use>
                </svg>
              </span>
            </div>
          </div>
          <!-- 群成员  -->
          <div class="bg-white rounded-10px w-full h-180px shadow">
            <div class="p-[15px_15px_0px_15px] flex flex-col">
              <!-- 群号 -->
              <div class="flex justify-between items-center">
                <div class="text-14px">群聊成员</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <div>{{ gloabalStore.currentSession.memberNum || 0 }}</div>
                  <div>
                    <svg class="w-14px h-14px iconpark-icon">
                      <use href="#right"></use>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div class="py-15px px-5px grid grid-cols-5 gap-15px text-12px">
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
                  <!-- <svg class="iconpark-icon h-25px w-25px"><use href="#plus"></use></svg> -->
                </div>
                <div>张三</div>
              </div>
              <div class="flex flex-col justify-center items-center gap-5px">
                <div class="rounded-full bg-#E5EFEE w-36px h-36px flex items-center justify-center">
                  <svg class="iconpark-icon h-25px w-25px">
                    <use href="#plus"></use>
                  </svg>
                </div>
                <div>张三</div>
              </div>
            </div>
          </div>
          <!-- 群公告 -->
          <div class="flex bg-white rounded-10px w-full h-auto shadow">
            <div class="px-15px flex flex-col w-full">
              <!-- 群号 -->
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                @click="handleCopy(gloabalStore.currentSession.account)"
                class="flex justify-between py-15px items-center">
                <div class="text-14px">群号/二维码</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <div>{{ gloabalStore.currentSession.account }}</div>
                  <div>
                    <svg class="w-14px h-14px iconpark-icon">
                      <use href="#saoma-i3589iic"></use>
                    </svg>
                  </div>
                </div>
              </div>

              <!-- 公告内容 -->
              <div @click="goToNotice" class="pt-15px flex flex-col text-14px gap-10px">
                <div>群公告</div>
                <div class="text-#707070 line-clamp-2 text-12px line-height-20px">
                  静夜思·李白 床前明月光，疑是地上霜。 举头望明月，低头思故乡。静夜思·李白 床前明月光，疑是地上霜。
                  举头望明月，低头思故乡。
                </div>
              </div>

              <div class="flex justify-between py-15px items-center">
                <div class="text-14px">我的群昵称</div>
                <div class="text-12px text-#6E6E6E flex flex-wrap gap-10px items-center">
                  <input
                    style="
                      height: 17px;
                      border: none;
                      text-align: right;
                      outline: none;
                      font-size: 14px;
                      text-align: right;
                    "
                    placeholder="请输入群昵称" />
                </div>
              </div>
            </div>
          </div>
          <!-- 群备注 -->
          <div class="w-full flex flex-col gap-15px rounded-10px">
            <div class="ps-15px text-14px">
              <span>群备注</span>
              <span class="text-#6E6E6E">（仅自己可见）</span>

              <div v-if="isEditingRemark" class="flex items-center">
                <n-input
                  ref="remarkInputRef"
                  v-model:value="item.remark"
                  size="tiny"
                  class="border-(1px solid #90909080)"
                  placeholder="请输入群聊备注"
                  clearable
                  spellCheck="false"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  @blur="handleRemarkUpdate"
                  @keydown.enter="handleRemarkUpdate" />
              </div>
              <span v-else class="cursor-pointer" @click="startEditRemark">
                {{ item.remark || '设置群聊备注' }} （仅自己可见）
              </span>
            </div>
            <!-- <div class="rounded-10px flex w-full bg-white shadow">
              <div class="w-full px-15px">
                <input class="h-50px w-full" style="border: none; outline: none; font-size: 14px"
                  placeholder="请输入群备注" />
              </div>
            </div> -->
          </div>
          <div class="flex bg-white rounded-10px w-full h-auto shadow">
            <div class="px-15px flex flex-col w-full">
              <div class="pt-15px text-14px text-#6E6E6E">群设置</div>
              <!-- 群号 -->
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">设置为置顶</div>
                <n-switch v-model:value="active1" />
              </div>
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">消息免打扰</div>
                <n-switch v-model:value="active2" />
              </div>
            </div>
          </div>
          <div class="flex shadow bg-white cursor-pointer text-red text-14px rounded-10px w-full">
            <div class="p-15px">删除聊天记录</div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { RoomTypeEnum } from '@/enums'
import router from '@/router'
import type { UserItem } from '@/services/types'
import { useCachedStore } from '@/stores/cached'
import { useGlobalStore } from '@/stores/global'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { getGroupDetail } from '@/utils/ImRequestUtils'

const gloabalStore = useGlobalStore()
const groupStore = useGroupStore()
const cacheStore = useCachedStore()

const item = ref<any>(null)
const active1 = ref(false)
const active2 = ref(false)
const nicknameValue = ref('')
const options = ref<Array<{ name: string; src: string }>>([])
// 编辑群备注相关状态
const isEditingRemark = ref(false)
const remarkInputRef = useTemplateRef('remarkInputRef')

const handleCopy = (val: string) => {
  if (val) {
    navigator.clipboard.writeText(val)
    window.$message.success(`复制成功 ${val}`)
  }
}

// 开始编辑群备注
const startEditRemark = () => {
  isEditingRemark.value = true
  nextTick(() => {
    remarkInputRef.value?.focus()
  })
}

const goToNotice = () => {
  router.push('/mobile/chatRoom/notice')
}

// 处理群备注更新
const handleRemarkUpdate = async () => {
  await cacheStore.updateMyRoomInfo({
    id: item.value!.roomId,
    remark: item.value!.remark,
    myName: item.value!.myName || ''
  })
  window.$message.success('群备注更新成功')
  isEditingRemark.value = false
}

// 获取群组详情和成员信息
const fetchGroupMembers = async (roomId: string) => {
  try {
    // 使用每个成员的uid获取详细信息
    const userList = groupStore.getUserListByRoomId(roomId)
    const memberDetails = userList.map((member: UserItem) => {
      const userInfo = groupStore.getUserInfo(member.uid)!
      return {
        name: userInfo.name || member.name || member.uid,
        src: userInfo.avatar || member.avatar
      }
    })

    options.value = memberDetails
  } catch (error) {
    console.error('获取群成员失败:', error)
  }
}

/**
 * 这里直接监听状态的值
 */
onMounted(async () => {
  console.log('gloabalStore.currentSession --> ', gloabalStore.currentSession)
  if (gloabalStore.currentSession.type === RoomTypeEnum.SINGLE) {
    item.value = groupStore.getUserInfo(gloabalStore.currentSession.detailId)!
  } else {
    await getGroupDetail(gloabalStore.currentSession.detailId)
      .then((response: any) => {
        item.value = response
        nicknameValue.value = response.myName || ''
        if (item.value && item.value.roomId) {
          fetchGroupMembers(item.value.roomId)
        }
      })
      .catch((e: any) => {
        console.error('获取群组详情失败:', e)
      })
  }
  console.log('item --> ', item)
})
</script>

<style scoped></style>
