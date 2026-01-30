<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar :isOfficial="false" border :hidden-right="true" :room-name="t('mobile_post.title')" />
    </template>

    <template #container>
      <div class="flex flex-col gap-1 overflow-auto h-full">
        <div class="flex flex-col p-16px gap-12px">
          <n-card
            class="rounded-12px p-0!"
            content-class="p-16px!"
            header-class="text-14px! pb-0!"
            :title="t('mobile_post.content.label')">
            <!-- 动态内容输入 -->
            <van-field
              v-model="feedContent"
              type="textarea"
              :placeholder="t('mobile_post.content.placeholder')"
              :maxlength="500"
              show-word-limit
              :rows="8"
              class="bg-transparent!"
              :autosize="feedAutosize" />
          </n-card>

          <!-- 媒体类型提示（暂时禁用） -->
          <!-- <div class="bg-white rounded-12px p-16px"> -->
          <n-card
            class="p-0! rounded-12px"
            content-class="p-16px!"
            header-class="text-14px! pb-0!"
            :title="t('mobile_post.media_type.label')">
            <div class="flex items-center gap-8px mb-6px">
              <n-text depth="3" s>📷</n-text>
              <n-text depth="3">{{ t('mobile_post.media_type.option_image') }}</n-text>
            </div>
            <div class="flex items-center gap-8px">
              <n-text depth="3">🎬</n-text>
              <n-text depth="3">{{ t('mobile_post.media_type.option_video') }}</n-text>
            </div>
          </n-card>
          <!-- </div> -->

          <!-- 权限选择 -->
          <n-card
            class="p-0! rounded-12px"
            content-class="p-16px"
            header-class="text-14px! pb-0!"
            :title="t('mobile_post.visibility.label')">
            <n-radio-group
              :value="permission"
              @update:value="
                (e) => {
                  permission = e
                  handlePermissionChange(e)
                }
              ">
              <n-radio class="w-full" value="open">{{ t('mobile_post.visibility.public') }}</n-radio>
              <n-radio class="w-full" value="partVisible">{{ t('mobile_post.visibility.selected') }}</n-radio>
              <n-radio class="w-full" value="notAnyone">{{ t('mobile_post.visibility.exclude') }}</n-radio>
            </n-radio-group>
          </n-card>

          <!-- 选择用户 -->
          <n-card
            v-if="permission === 'partVisible' || permission === 'notAnyone'"
            class="rounded-12px p-0!"
            content-class="p-16px!"
            header-class="text-14px! pb-0!"
            :title="
              permission === 'partVisible'
                ? t('mobile_post.visibility_selected_btn_label')
                : t('mobile_post.visibility_exclude_btn_label')
            ">
            <n-button
              size="small"
              strong
              secondary
              type="primary"
              plain
              @click="showUserSelectPopup = true"
              class="w-full"
              :style="{ borderColor: '#13987f', color: '#13987f' }">
              {{ t('mobile_post.visibility_select_btn', { count: selectedUsers.length }) }}
            </n-button>
            <div v-if="selectedUsers.length > 0" class="mt-12px flex flex-wrap gap-8px">
              <n-tag
                v-for="user in selectedUsers"
                :key="user.uid"
                closeable
                type="success"
                size="small"
                round
                closable
                text-color="#13987f"
                @close="removeSelectedUser(user.uid)">
                {{ getUserName(user) }}
              </n-tag>
            </div>
          </n-card>

          <!--  strong secondary round  -->
          <!-- 发布按钮 -->
          <n-grid :cols="2" x-gap="12">
            <n-gi>
              <n-button
                block
                secondary
                round
                size="large"
                @click="goBack"
                :style="{ borderColor: '#c8c9cc', color: '#666' }">
                {{ t('mobile_post.btn.cancel') }}
              </n-button>
            </n-gi>
            <n-gi>
              <n-button
                strong
                secondary
                round
                block
                size="large"
                :loading="isPublishing"
                :disabled="!isPublishValid"
                @click="handlePublish"
                :style="{ background: '#13987f', borderColor: '#13987f' }">
                {{ t('mobile_post.btn.publish') }}
              </n-button>
            </n-gi>
          </n-grid>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>

  <!-- 用户选择弹窗 -->
  <n-drawer
    v-model:show="showUserSelectPopup"
    class="rounded-t-20px!"
    :style="{ background: themeVars.cardColor }"
    position="bottom"
    round
    placement="bottom"
    default-height="80%">
    <n-drawer-content>
      <template #header>
        <n-flex justify="space-between">
          <n-h3>{{ t('mobile_post.select_users.title') }}</n-h3>
          <n-button strong secondary type="primary" size="small" @click="confirmUserSelection">
            {{ t('mobile_post.select_users.btn.done') }}
          </n-button>
        </n-flex>
      </template>
      <n-space vertical :size="16">
        <!-- 搜索框 -->
        <n-input
          size="large"
          v-model:value="userSearchKeyword"
          :placeholder="t('mobile_post.select_users.search_placeholder')" />

        <!-- 用户列表 -->
        <div class="flex-1 overflow-y-auto">
          <n-checkbox-group v-model:value="selectedUserIds">
            <n-list hoverable clickable class="bg-transparent" :bordered="false">
              <n-list-item v-for="user in filteredContactsList" :key="user.uid" @click="toggleUser(user.uid)">
                <n-flex class="flex items-center justify-between w-full" :gap="10">
                  <n-avatar size="medium" class="shrink-0" :src="getUserAvatar(user)" round />

                  <div class="grow overflow-hidden">
                    <n-text class="truncate block">
                      {{ getUserName(user) }}
                    </n-text>
                    <n-text depth="3" v-if="user.remark" class="text-12px">{{ user.remark }}</n-text>
                  </div>

                  <n-checkbox :value="user.uid" class="shrink-0" @click.stop />
                </n-flex>
              </n-list-item>
            </n-list>
          </n-checkbox-group>
          <!-- 空状态 -->
          <van-empty v-if="filteredContactsList.length === 0" :description="t('mobile_post.empty')" />
        </div>
      </n-space>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useFeedStore } from '@/stores/feed'
import { useContactStore } from '@/stores/contacts'
import { useGroupStore } from '@/stores/group'
import { AvatarUtils } from '@/utils/AvatarUtils'
import type { FriendItem } from '@/services/types'
import 'vant/lib/index.css' // Vant UI 样式
import { useI18n } from 'vue-i18n'
import { useThemeVars } from 'naive-ui'

const themeVars = useThemeVars()

const { t, getLocaleMessage } = useI18n()
console.log(getLocaleMessage('en'))

const router = useRouter()
const feedAutosize = { minHeight: 150, maxHeight: 300 }
const feedStore = useFeedStore()
const contactStore = useContactStore()
const groupStore = useGroupStore()

// 响应式数据
const feedContent = ref('')
const isPublishing = ref(false)

// 权限相关
const permission = ref<'open' | 'partVisible' | 'notAnyone'>('open')
const showUserSelectPopup = ref(false)
const selectedUserIds = ref<string[]>([])
const selectedUsers = ref<FriendItem[]>([])
const userSearchKeyword = ref('')

// 过滤后的联系人列表
const filteredContactsList = computed(() => {
  // 过滤掉 uid 为 1 的好友
  const validContacts = contactStore.contactsList.filter((user) => user.uid !== '1')

  if (!userSearchKeyword.value.trim()) {
    return validContacts
  }

  const keyword = userSearchKeyword.value.toLowerCase()
  return validContacts.filter((user) => {
    const userInfo = groupStore.getUserInfo(user.uid)
    const name = userInfo?.name || user.remark || user.uid || ''
    return name.toLowerCase().includes(keyword) || user.uid.toLowerCase().includes(keyword)
  })
})

// 获取用户头像
const getUserAvatar = (user: FriendItem) => {
  const userInfo = groupStore.getUserInfo(user.uid)
  return AvatarUtils.getAvatarUrl(userInfo?.avatar || '')
}

// 获取用户名称
const getUserName = (user: FriendItem) => {
  const userInfo = groupStore.getUserInfo(user.uid)
  return userInfo?.name || user.remark || user.uid || t('mobile_post.unknown_user')
}

// 验证发布内容是否有效
const isPublishValid = computed(() => {
  // 只需要验证内容不为空
  return feedContent.value.trim().length > 0
})

// 处理权限变化
const handlePermissionChange = (value: string) => {
  // 如果切换到公开，清空已选用户
  if (value === 'open') {
    selectedUserIds.value = []
    selectedUsers.value = []
  }
}

// 切换用户选择
const toggleUser = (uid: string) => {
  const index = selectedUserIds.value.indexOf(uid)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  } else {
    selectedUserIds.value.push(uid)
  }
}

// 确认用户选择
const confirmUserSelection = () => {
  // 更新选中的用户列表
  selectedUsers.value = contactStore.contactsList.filter((user) => selectedUserIds.value.includes(user.uid))
  showUserSelectPopup.value = false
}

// 移除已选用户
const removeSelectedUser = (uid: string) => {
  const index = selectedUserIds.value.indexOf(uid)
  if (index > -1) {
    selectedUserIds.value.splice(index, 1)
  }
  selectedUsers.value = selectedUsers.value.filter((user) => user.uid !== uid)
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 发布动态
const handlePublish = async () => {
  // 验证内容
  if (!feedContent.value.trim()) {
    showToast(t('mobile_post.error.required'))
    return
  }

  // 验证权限设置
  if ((permission.value === 'partVisible' || permission.value === 'notAnyone') && selectedUsers.value.length === 0) {
    showToast(
      permission.value === 'partVisible'
        ? t('mobile_post.error.select_visible_users')
        : t('mobile_post.error.select_exclude_users')
    )
    return
  }

  isPublishing.value = true

  try {
    const feedData: any = {
      content: feedContent.value.trim(),
      mediaType: 0, // 纯文本
      permission: permission.value
    }

    // 添加权限限制的用户ID列表
    if (permission.value === 'partVisible' || permission.value === 'notAnyone') {
      feedData.uidList = selectedUsers.value.map((user) => Number(user.uid))
    }

    // 调用 store 的发布方法，会自动刷新列表
    await feedStore.publishFeed(feedData)

    showToast(t('mobile_post.success.publish_success'))

    // 返回上一页
    router.back()
  } catch (error) {
    console.error('发布动态失败:', error)
    showToast(t('mobile_post.error.publish_failed'))
  } finally {
    isPublishing.value = false
  }
}

// 初始化
onMounted(async () => {
  // 加载联系人列表
  try {
    await contactStore.getContactList(true)
  } catch (error) {
    console.error('加载联系人列表失败:', error)
  }
})
</script>

<style scoped>
.user-item {
  transition: background-color 0.2s;
}

.user-item:active {
  background-color: #f5f5f5;
}

.custom-rounded {
  border-top-left-radius: 20px !important; /* 左上角 */
  border-top-right-radius: 20px !important;
  overflow: hidden;
}
</style>
