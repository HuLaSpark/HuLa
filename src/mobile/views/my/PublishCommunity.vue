<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        :room-name="t('mobile_post.title')" />
    </template>

    <template #container>
      <div class="flex flex-col gap-1 overflow-auto h-full bg-#f5f5f5">
        <div class="flex flex-col p-16px gap-12px">
          <!-- 动态内容输入 -->
          <div class="bg-white rounded-12px p-16px">
            <div class="text-14px text-#333 mb-8px font-500">{{ t('mobile_post.content.label') }}</div>
            <van-field
              v-model="feedContent"
              type="textarea"
              :placeholder="t('mobile_post.content.placeholder')"
              :maxlength="500"
              show-word-limit
              :rows="8"
              :autosize="feedAutosize" />
          </div>

          <!-- 媒体类型提示（暂时禁用） -->
          <div class="bg-white rounded-12px p-16px">
            <div class="text-14px text-#333 mb-8px font-500">{{ t('mobile_post.media_type.label') }}</div>
            <div class="text-13px text-#999">
              <div class="flex items-center gap-8px mb-6px">
                <span class="text-#c8c9cc">📷</span>
                <span class="text-#c8c9cc">{{ t('mobile_post.media_type.option_image') }}</span>
              </div>
              <div class="flex items-center gap-8px">
                <span class="text-#c8c9cc">🎬</span>
                <span class="text-#c8c9cc">{{ t('mobile_post.media_type.option_video') }}</span>
              </div>
            </div>
          </div>

          <!-- 权限选择 -->
          <div class="bg-white rounded-12px p-16px">
            <div class="text-14px text-#333 mb-12px font-500">{{ t('mobile_post.visibility.label') }}</div>
            <van-radio-group v-model="permission" direction="vertical" @change="handlePermissionChange">
              <van-radio name="open" icon-size="18px" class="mb-12px">
                <template #icon="props">
                  <div
                    :class="[
                      'w-20px h-20px rounded-full border-2 flex items-center justify-center transition-all',
                      props.checked ? 'border-#13987f bg-#13987f' : 'border-#c8c9cc'
                    ]">
                    <div v-if="props.checked" class="w-8px h-8px rounded-full bg-white"></div>
                  </div>
                </template>
                <span class="ml-8px text-14px">{{ t('mobile_post.visibility.public') }}</span>
              </van-radio>
              <van-radio name="partVisible" icon-size="18px" class="mb-12px">
                <template #icon="props">
                  <div
                    :class="[
                      'w-20px h-20px rounded-full border-2 flex items-center justify-center transition-all',
                      props.checked ? 'border-#13987f bg-#13987f' : 'border-#c8c9cc'
                    ]">
                    <div v-if="props.checked" class="w-8px h-8px rounded-full bg-white"></div>
                  </div>
                </template>
                <span class="ml-8px text-14px">{{ t('mobile_post.visibility.selected') }}</span>
              </van-radio>
              <van-radio name="notAnyone" icon-size="18px">
                <template #icon="props">
                  <div
                    :class="[
                      'w-20px h-20px rounded-full border-2 flex items-center justify-center transition-all',
                      props.checked ? 'border-#13987f bg-#13987f' : 'border-#c8c9cc'
                    ]">
                    <div v-if="props.checked" class="w-8px h-8px rounded-full bg-white"></div>
                  </div>
                </template>
                <span class="ml-8px text-14px">{{ t('mobile_post.visibility.exclude') }}</span>
              </van-radio>
            </van-radio-group>
          </div>

          <!-- 选择用户 -->
          <div v-if="permission === 'partVisible' || permission === 'notAnyone'" class="bg-white rounded-12px p-16px">
            <div class="text-14px text-#333 mb-12px font-500">
              {{
                permission === 'partVisible'
                  ? t('mobile_post.visibility_selected_btn_label')
                  : t('mobile_post.visibility_exclude_btn_label')
              }}
            </div>
            <van-button
              type="primary"
              size="small"
              plain
              @click="showUserSelectPopup = true"
              class="w-full"
              :style="{ borderColor: '#13987f', color: '#13987f' }">
              {{ t('mobile_post.visibility_select_btn', { count: selectedUsers.length }) }}
            </van-button>
            <div v-if="selectedUsers.length > 0" class="mt-12px flex flex-wrap gap-8px">
              <van-tag
                v-for="user in selectedUsers"
                :key="user.uid"
                closeable
                size="medium"
                color="#e8f5f4"
                text-color="#13987f"
                @close="removeSelectedUser(user.uid)">
                {{ getUserName(user) }}
              </van-tag>
            </div>
          </div>

          <!-- 发布按钮 -->
          <div class="flex gap-12px mt-8px pb-20px">
            <van-button block plain @click="goBack" :style="{ borderColor: '#c8c9cc', color: '#666' }">
              {{ t('mobile_post.btn.cancel') }}
            </van-button>
            <van-button
              block
              type="primary"
              :loading="isPublishing"
              :disabled="!isPublishValid"
              @click="handlePublish"
              :style="{ background: '#13987f', borderColor: '#13987f' }">
              {{ t('mobile_post.btn.publish') }}
            </van-button>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>

  <!-- 用户选择弹窗 -->
  <van-popup v-model:show="showUserSelectPopup" position="bottom" :style="{ height: '70%' }" round>
    <div class="flex flex-col h-full">
      <!-- 弹窗标题 -->
      <div class="flex items-center justify-between p-16px border-b border-#eee">
        <span class="text-16px font-500 text-#333">{{ t('mobile_post.select_users.title') }}</span>
        <van-button type="primary" size="small" @click="confirmUserSelection" :style="{ background: '#13987f' }">
          {{ t('mobile_post.select_users.btn.done') }}
        </van-button>
      </div>

      <!-- 搜索框 -->
      <div class="p-12px border-b border-#f5f5f5">
        <van-search
          v-model="userSearchKeyword"
          :placeholder="t('mobile_post.select_users.search_placeholder')"
          shape="round" />
      </div>

      <!-- 用户列表 -->
      <div class="flex-1 overflow-y-auto">
        <van-checkbox-group v-model="selectedUserIds">
          <van-cell-group>
            <van-cell
              v-for="user in filteredContactsList"
              :key="user.uid"
              clickable
              @click="toggleUser(user.uid)"
              class="user-item">
              <template #title>
                <div class="flex items-center gap-12px">
                  <van-image
                    :src="getUserAvatar(user)"
                    round
                    width="40"
                    height="40"
                    fit="cover"
                    :style="{ flexShrink: 0 }" />
                  <div class="flex-1 min-w-0">
                    <div class="text-14px text-#333 font-500 truncate">
                      {{ getUserName(user) }}
                    </div>
                    <div v-if="user.remark" class="text-12px text-#999 truncate mt-2px">{{ user.remark }}</div>
                  </div>
                </div>
              </template>
              <template #right-icon>
                <van-checkbox :name="user.uid" @click.stop ref="checkboxes" />
              </template>
            </van-cell>
          </van-cell-group>
        </van-checkbox-group>

        <!-- 空状态 -->
        <van-empty v-if="filteredContactsList.length === 0" :description="t('mobile_post.empty')" />
      </div>
    </div>
  </van-popup>
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
</style>
