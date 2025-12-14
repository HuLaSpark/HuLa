<template>
  <!-- 主体内容 -->
  <main class="chat-main-container">
    <div class="chat-content-area">
      <div
        data-tauri-drag-region
        class="chat-header flex truncate p-[8px_16px_10px_16px] justify-between items-center gap-50px">
        <n-flex :size="10" vertical class="truncate">
          <p
            v-if="!isEdit"
            @click="handleEdit"
            class="leading-6 text-(18px [--chat-text-color]) truncate font-500 hover:underline cursor-pointer">
            {{ currentChat.title || '新的会话' }}
          </p>
          <n-input
            v-else
            @blur="handleBlur"
            ref="inputInstRef"
            v-model:value="currentChat.title"
            clearable
            placeholder="输入标题"
            type="text"
            size="small"
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            style="width: 200px; height: 28px"
            class="text-14px rounded-6px"></n-input>

          <!-- 当前选择的模型显示 -->
          <n-flex align="center" :size="8" class="mt-4px">
            <div class="flex items-center gap-6px">
              <span class="text-(11px #909090)">当前模型:</span>
              <n-tag
                v-if="selectedModel"
                size="small"
                :type="selectedModel.status === 0 ? 'success' : 'error'"
                class="cursor-pointer"
                @click="handleModelClick">
                {{ selectedModel.name }}
                <template #icon>
                  <Icon icon="mdi:robot" class="text-14px" />
                </template>
              </n-tag>
              <n-tag v-if="selectedModel && selectedModel.publicStatus === 0" size="small" type="info">官网模型</n-tag>
              <n-tag v-else-if="selectedModel" size="small" type="warning">自建模型</n-tag>
              <n-tag v-if="selectedModel && selectedModel.type === 1" size="small" type="info">文字</n-tag>
              <n-tag v-if="selectedModel && selectedModel.type === 2" size="small" type="success">图片</n-tag>
              <n-tag v-if="selectedModel && selectedModel.type === 3" size="small" type="info">音频</n-tag>
              <n-tag v-if="selectedModel && selectedModel.type === 4" size="small" type="warning">视频</n-tag>
              <n-tag v-if="selectedModel && selectedModel.type === 7" size="small" type="warning">文生视频</n-tag>
              <n-tag v-if="selectedModel && selectedModel.type === 8" size="small" type="success">图生视频</n-tag>
              <n-tag
                v-else-if="!selectedModel"
                size="small"
                type="warning"
                class="cursor-pointer"
                @click="handleModelClick">
                未选择模型
                <template #icon>
                  <Icon icon="mdi:robot-off" class="text-14px" />
                </template>
              </n-tag>
            </div>
            <p class="text-(11px #707070)">共{{ currentChat.messageCount }}条对话</p>
          </n-flex>
        </n-flex>

        <n-flex class="min-w-fit">
          <!-- 新增会话按钮 -->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="right-btn" @click="handleCreateNewChat">
                <svg><use href="#plus"></use></svg>
              </div>
            </template>
            <p>新建会话</p>
          </n-popover>

          <!-- 编辑标题按钮 -->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="right-btn" @click="handleEdit">
                <svg><use href="#edit"></use></svg>
              </div>
            </template>
            <p>编辑标题</p>
          </n-popover>

          <!-- 删除会话按钮 -->
          <n-popover
            v-model:show="showDeleteChatConfirm"
            trigger="click"
            placement="bottom"
            :show-arrow="true"
            style="padding: 16px; width: 280px">
            <template #trigger>
              <div class="right-btn right-btn-danger" title="删除会话">
                <svg><use href="#delete"></use></svg>
              </div>
            </template>
            <n-flex vertical :size="12">
              <p class="text-(14px [--chat-text-color]) font-500">确定要删除当前会话吗？</p>
              <p class="text-(12px #d5304f)">删除后将无法恢复！</p>

              <!-- 是否同时删除消息选项 -->
              <n-checkbox v-model:checked="deleteWithMessages" size="small">
                <span class="text-(12px [--chat-text-color])">同时删除会话中的所有消息</span>
              </n-checkbox>

              <n-flex justify="end" :size="8">
                <n-button size="small" @click="showDeleteChatConfirm = false">取消</n-button>
                <n-button size="small" type="error" @click="handleDeleteChat">确定删除</n-button>
              </n-flex>
            </n-flex>
          </n-popover>

          <!-- 分享按钮 -->
          <n-popover trigger="hover" :show-arrow="false" placement="bottom">
            <template #trigger>
              <div class="right-btn">
                <svg><use href="#Sharing"></use></svg>
              </div>
            </template>
            <p>分享</p>
          </n-popover>
        </n-flex>
      </div>
      <div class="h-1px bg-[--line-color]"></div>

      <!-- 聊天信息框 -->
      <div :class="{ 'shadow-inner': page.shadow }" class="chat-messages-container w-full box-border flex flex-col">
        <div
          ref="scrollContainerRef"
          class="chat-scrollbar flex-1 min-h-0 scrollbar-container"
          :class="{ 'hide-scrollbar': !showScrollbar }"
          @scroll="handleScroll"
          @mouseenter="showScrollbar = true"
          @mouseleave="showScrollbar = false">
          <div ref="messageContentRef" class="p-[16px_16px] box-border">
            <!-- 欢迎消息 -->
            <div class="flex gap-12px mb-12px">
              <n-avatar
                class="rounded-8px flex-shrink-0"
                :src="getModelAvatar(selectedModel)"
                :fallback-src="getDefaultAvatar()" />
              <n-flex vertical justify="space-between">
                <p class="text-(12px [--chat-text-color])">
                  {{ selectedModel ? selectedModel.name : 'GPT-4' }}
                  <n-tag
                    v-if="selectedModel"
                    :type="selectedModel.status === 0 ? 'success' : 'error'"
                    size="tiny"
                    class="ml-8px">
                    {{ selectedModel.status === 0 ? '可用' : '不可用' }}
                  </n-tag>
                </p>
                <div class="bubble select-text text-14px">
                  <p>{{ `你好，我是${selectedModel?.name || ''}，很高兴为您服务。` }}</p>
                </div>
              </n-flex>
            </div>

            <!-- 加载状态 -->
            <div v-if="loadingMessages" class="flex justify-center items-center py-20px text-(12px #909090)">
              <n-spin size="small" />
              <span class="ml-10px">加载消息中...</span>
            </div>

            <!-- 消息列表 -->
            <div
              v-for="(message, index) in messageList"
              class="message-row group flex flex-col mb-12px"
              :data-message-index="index"
              :data-message-id="message.id">
              <div class="flex items-start gap-10px" :class="message.type === 'user' ? 'flex-row-reverse' : ''">
                <n-avatar
                  v-if="message.type === 'user'"
                  :size="34"
                  class="select-none rounded-8px flex-shrink-0"
                  :class="message.type === 'user' ? 'ml-2px' : 'mr-2px'"
                  :src="userStore.userInfo?.avatar ? AvatarUtils.getAvatarUrl(userStore.userInfo.avatar) : ''"
                  :fallback-src="getDefaultAvatar()" />
                <n-avatar
                  v-else
                  :size="34"
                  class="select-none rounded-8px flex-shrink-0"
                  :class="message.type === 'assistant' ? 'mr-2px' : 'ml-2px'"
                  :src="getModelAvatar(selectedModel)"
                  :fallback-src="getDefaultAvatar()" />
                <n-flex
                  vertical
                  :size="6"
                  class="flex-1"
                  :class="message.type === 'user' ? 'items-end' : 'items-start'">
                  <n-flex
                    align="center"
                    :size="8"
                    class="select-none text-(12px #909090)"
                    :class="message.type === 'user' ? 'flex-row-reverse' : ''">
                    <p>
                      {{ message.type === 'user' ? '我' : selectedModel ? selectedModel.name : 'AI' }}
                    </p>
                    <n-popconfirm
                      v-if="message.id"
                      @positive-click="() => handleDeleteMessage(message.id!, index)"
                      positive-text="删除"
                      negative-text="取消">
                      <template #trigger>
                        <div
                          class="delete-btn opacity-0 group-hover:opacity-100 cursor-pointer text-#909090 hover:text-#d5304f transition-all"
                          title="删除消息">
                          <svg class="w-14px h-14px"><use href="#delete"></use></svg>
                        </div>
                      </template>
                      <p>确定要删除这条消息吗？</p>
                    </n-popconfirm>
                  </n-flex>
                  <div
                    :class="getMessageBubbleClass(message)"
                    class="select-text text-14px"
                    style="white-space: pre-wrap">
                    <template v-if="message.type === 'user'">
                      {{ message.content }}
                    </template>
                    <template v-else>
                      <!-- msgType: 使用枚举 AiMsgContentTypeEnum -->
                      <template v-if="message.msgType === AiMsgContentTypeEnum.IMAGE">
                        <!-- 图片消息 -->
                        <template v-if="isRenderableAiImage(message)">
                          <img
                            :src="message.content"
                            alt="生成的图片"
                            class="max-w-400px max-h-400px rounded-8px cursor-pointer"
                            @click="handleImagePreview(message.content)" />
                        </template>
                        <template v-else>
                          <div class="flex flex-col gap-8px">
                            <div class="bubble bubble-ai select-text text-14px" style="white-space: pre-wrap">
                              {{ getAiPlaceholderText(message) }}
                            </div>
                          </div>
                        </template>
                      </template>
                      <template v-else-if="message.msgType === AiMsgContentTypeEnum.VIDEO">
                        <!-- 视频消息 -->
                        <template v-if="isLikelyMediaUrl(message.content)">
                          <video
                            :src="message.content"
                            controls
                            class="max-w-600px max-h-400px rounded-8px"
                            preload="metadata">
                            您的浏览器不支持视频播放
                          </video>
                        </template>
                        <template v-else>
                          <div class="bubble bubble-ai select-text text-14px" style="white-space: pre-wrap">
                            {{ getAiPlaceholderText(message) }}
                          </div>
                        </template>
                      </template>
                      <template v-else-if="message.msgType === AiMsgContentTypeEnum.AUDIO">
                        <!-- 音频消息 -->
                        <template v-if="isLikelyMediaUrl(message.content)">
                          <audio :src="message.content" controls class="w-300px" preload="metadata">
                            您的浏览器不支持音频播放
                          </audio>
                        </template>
                        <template v-else>
                          <div class="bubble bubble-ai select-text text-14px" style="white-space: pre-wrap">
                            {{ getAiPlaceholderText(message) }}
                          </div>
                        </template>
                      </template>
                      <template v-else>
                        <!-- 文本消息（msgType === 1 或未设置） -->
                        <div class="flex flex-col gap-8px">
                          <!-- 推理过程（如果存在） -->
                          <div
                            v-if="message.reasoningContent"
                            class="reasoning-content p-12px rounded-8px bg-[#f5f5f5] dark:bg-[#2a2a2a] border-(1px solid #e0e0e0) dark:border-(1px solid #404040)">
                            <div class="flex items-center gap-6px mb-8px">
                              <Icon icon="mdi:brain" class="text-16px text-[#1890ff]" />
                              <span class="text-12px text-[#666] dark:text-[#aaa] font-500">思考过程</span>
                            </div>
                            <div
                              class="code-block-wrapper"
                              :class="isDarkTheme ? 'code-block-dark' : 'code-block-light'">
                              <MarkdownRender
                                :content="message.reasoningContent"
                                :custom-id="markdownCustomId"
                                :is-dark="isDarkTheme"
                                :viewportPriority="false"
                                :themes="markdownThemes"
                                :code-block-props="markdownCodeBlockProps" />
                            </div>
                          </div>

                          <!-- 最终答案 -->
                          <div class="code-block-wrapper" :class="isDarkTheme ? 'code-block-dark' : 'code-block-light'">
                            <MarkdownRender
                              :content="message.content"
                              :custom-id="markdownCustomId"
                              :is-dark="isDarkTheme"
                              :viewportPriority="false"
                              :themes="markdownThemes"
                              :code-block-props="markdownCodeBlockProps" />
                          </div>
                        </div>
                      </template>
                    </template>
                  </div>
                </n-flex>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="h-1px bg-[--line-color]"></div>
      <!-- 下半部分输入框以及功能栏 -->
      <div class="chat-input-container min-h-180px">
        <n-flex vertical :size="6" class="p-[8px_16px] box-border">
          <n-flex align="center" :size="26" class="options">
            <!-- 角色选择 -->
            <n-popover
              v-model:show="showRolePopover"
              trigger="click"
              placement="top-start"
              :show-arrow="false"
              style="padding: 0; width: 320px">
              <template #trigger>
                <div class="flex items-center gap-6px cursor-pointer" @click="showRolePopover = !showRolePopover">
                  <n-avatar
                    v-if="selectedRole"
                    :src="selectedRole.avatar"
                    :size="24"
                    round
                    :fallback-src="getDefaultAvatar()" />
                  <Icon v-else icon="mdi:account-circle" class="text-24px color-#909090" />
                  <span class="text-(12px [--chat-text-color])">
                    {{ selectedRole ? selectedRole.name : '选择角色' }}
                  </span>
                  <Icon icon="mdi:chevron-down" class="text-16px color-#909090" />
                </div>
              </template>
              <div class="role-selector">
                <div class="role-header">
                  <span class="role-title">选择角色</span>
                  <n-button size="small" @click="handleOpenRoleManagement">
                    <template #icon>
                      <Icon icon="mdi:cog" />
                    </template>
                    管理
                  </n-button>
                </div>

                <div class="role-list">
                  <div v-if="roleLoading" class="loading-container">
                    <n-spin size="small" />
                    <span class="loading-text">加载中...</span>
                  </div>

                  <div v-else-if="roleList.length === 0" class="empty-container">
                    <n-empty description="暂无角色数据" size="small">
                      <template #icon>
                        <Icon icon="mdi:account-off" class="text-24px color-#909090" />
                      </template>
                    </n-empty>
                  </div>

                  <div v-else class="roles-container">
                    <div
                      v-for="role in roleList"
                      :key="role.id"
                      class="role-item"
                      :class="{ active: selectedRole?.id === role.id }"
                      @click="handleSelectRole(role)">
                      <n-avatar :src="role.avatar" :size="32" round :fallback-src="getDefaultAvatar()" />
                      <n-flex vertical :size="2" class="flex-1 min-w-0">
                        <n-flex align="center" :size="8">
                          <span class="role-name">{{ role.name }}</span>
                          <n-tag v-if="role.status === 0" size="tiny" type="success">可用</n-tag>
                        </n-flex>
                        <span class="role-desc">{{ role.description }}</span>
                      </n-flex>
                      <Icon
                        v-if="selectedRole?.id === role.id"
                        icon="mdi:check-circle"
                        class="text-18px color-[--primary-color]" />
                    </div>
                  </div>
                </div>
              </div>
            </n-popover>

            <!-- 模型选择 -->
            <n-popover
              v-model:show="showModelPopover"
              trigger="click"
              placement="top-start"
              :show-arrow="false"
              style="padding: 0; width: 320px">
              <template #trigger>
                <div class="flex items-center gap-6px cursor-pointer" @click="handleModelClick">
                  <svg><use href="#model"></use></svg>
                  <span class="text-(12px [--chat-text-color])">
                    {{ selectedModel ? selectedModel.name : '选择模型' }}
                  </span>
                </div>
              </template>
              <div class="model-selector">
                <div class="model-header">
                  <span class="model-title">选择模型</span>
                  <n-flex :size="8">
                    <n-button size="small" @click="handleOpenModelManagement">
                      <template #icon>
                        <Icon icon="mdi:cog" />
                      </template>
                      管理
                    </n-button>
                    <n-input
                      v-model:value="modelSearch"
                      placeholder="搜索模型..."
                      clearable
                      size="small"
                      style="width: 140px">
                      <template #prefix>
                        <Icon icon="mdi:magnify" class="text-16px color-#909090" />
                      </template>
                    </n-input>
                  </n-flex>
                </div>

                <div class="model-list">
                  <div v-if="modelLoading" class="loading-container">
                    <n-spin size="small" />
                    <span class="loading-text">加载中...</span>
                  </div>

                  <div v-else-if="filteredModels.length === 0" class="empty-container">
                    <n-empty description="暂无模型数据" size="small">
                      <template #icon>
                        <Icon icon="mdi:package-variant-closed" class="text-24px color-#909090" />
                      </template>
                    </n-empty>
                  </div>

                  <div v-else class="models-container">
                    <div v-if="officialModels.length > 0">
                      <div class="model-section-title">官方模型</div>
                      <div
                        v-for="model in officialModels"
                        :key="model.id"
                        :class="['model-item', { 'model-item-active': selectedModel?.id === model.id }]"
                        @click="selectModel(model)">
                        <n-avatar
                          round
                          :size="40"
                          :src="getModelAvatar(model)"
                          :fallback-src="getDefaultAvatar()"
                          class="mr-12px flex-shrink-0" />
                        <div class="model-info">
                          <div class="model-name">
                            {{ model.name }}
                            <n-tag v-if="model.type === 1" size="tiny" type="info" class="ml-4px">文字</n-tag>
                            <n-tag v-else-if="model.type === 2" size="tiny" type="success" class="ml-4px">图片</n-tag>
                            <n-tag v-else-if="model.type === 3" size="tiny" type="primary" class="ml-4px">音频</n-tag>
                            <n-tag v-else-if="model.type === 4" size="tiny" type="warning" class="ml-4px">视频</n-tag>
                            <n-tag v-else-if="model.type === 5" size="tiny" type="default" class="ml-4px">向量</n-tag>
                            <n-tag v-else-if="model.type === 6" size="tiny" type="default" class="ml-4px">重排序</n-tag>
                            <n-tag v-else-if="model.type === 7" size="tiny" type="warning" class="ml-4px">
                              文生视频
                            </n-tag>
                            <n-tag v-else-if="model.type === 8" size="tiny" type="error" class="ml-4px">图生视频</n-tag>
                          </div>
                          <div class="model-description">{{ model.description || '暂无描述' }}</div>
                          <div class="model-meta">
                            <span class="model-provider">{{ model.platform }}</span>
                            <span class="model-version">v{{ model.model }}</span>
                          </div>
                        </div>
                        <div class="model-status">
                          <n-tag v-if="model.status === 0" type="success" size="small">可用</n-tag>
                          <n-tag v-else type="error" size="small">不可用</n-tag>
                        </div>
                      </div>
                    </div>

                    <div v-if="officialModels.length > 0 && userModels.length > 0" class="model-divider"></div>

                    <div v-if="userModels.length > 0">
                      <div class="model-section-title">自建模型</div>
                      <div
                        v-for="model in userModels"
                        :key="model.id"
                        :class="['model-item', { 'model-item-active': selectedModel?.id === model.id }]"
                        @click="selectModel(model)">
                        <n-avatar
                          round
                          :size="40"
                          :src="getModelAvatar(model)"
                          :fallback-src="getDefaultAvatar()"
                          class="mr-12px flex-shrink-0" />
                        <div class="model-info">
                          <div class="model-name">
                            {{ model.name }}
                            <n-tag v-if="model.type === 1" size="tiny" type="info" class="ml-4px">文字</n-tag>
                            <n-tag v-else-if="model.type === 2" size="tiny" type="success" class="ml-4px">图片</n-tag>
                            <n-tag v-else-if="model.type === 3" size="tiny" type="primary" class="ml-4px">音频</n-tag>
                            <n-tag v-else-if="model.type === 4" size="tiny" type="warning" class="ml-4px">视频</n-tag>
                            <n-tag v-else-if="model.type === 5" size="tiny" type="default" class="ml-4px">向量</n-tag>
                            <n-tag v-else-if="model.type === 6" size="tiny" type="default" class="ml-4px">重排序</n-tag>
                            <n-tag v-else-if="model.type === 7" size="tiny" type="warning" class="ml-4px">
                              文生视频
                            </n-tag>
                            <n-tag v-else-if="model.type === 8" size="tiny" type="error" class="ml-4px">图生视频</n-tag>
                          </div>
                          <div class="model-description">{{ model.description || '暂无描述' }}</div>
                          <div class="model-meta">
                            <span class="model-provider">{{ model.platform }}</span>
                            <span class="model-version">v{{ model.model }}</span>
                          </div>
                        </div>
                        <div class="model-status">
                          <n-tag v-if="model.status === 0" type="success" size="small">可用</n-tag>
                          <n-tag v-else type="error" size="small">不可用</n-tag>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="modelPagination.total > modelPagination.pageSize" class="model-pagination">
                  <n-pagination
                    v-model:page="modelPagination.pageNo"
                    :page-size="modelPagination.pageSize"
                    :page-count="Math.ceil(modelPagination.total / modelPagination.pageSize)"
                    size="small"
                    @update:page="handleModelPageChange" />
                </div>
              </div>
            </n-popover>

            <!-- 图片/视频尺寸选择 -->
            <n-select
              v-if="selectedModel && selectedModel.type === 2"
              v-model:value="imageParams.size"
              :options="imageSizeOptions"
              size="small"
              placeholder="图片尺寸"
              style="width: 150px" />
            <n-select
              v-if="selectedModel && (selectedModel.type === 4 || selectedModel.type === 7 || selectedModel.type === 8)"
              v-model:value="videoParams.size"
              :options="videoSizeOptions"
              size="small"
              placeholder="视频尺寸"
              style="width: 150px" />
            <n-select
              v-if="selectedModel && (selectedModel.type === 4 || selectedModel.type === 7 || selectedModel.type === 8)"
              v-model:value="videoParams.duration"
              :options="videoDurationOptions"
              size="small"
              placeholder="视频时长"
              style="width: 100px" />

            <!-- 音频语音选择 -->
            <n-select
              v-if="selectedModel && selectedModel.type === 3"
              v-model:value="audioParams.voice"
              :options="audioVoiceOptions"
              size="small"
              placeholder="选择语音"
              style="width: 150px" />

            <!-- 音频速度选择 -->
            <n-select
              v-if="selectedModel && selectedModel.type === 3"
              v-model:value="audioParams.speed"
              :options="audioSpeedOptions"
              size="small"
              placeholder="播放速度"
              style="width: 120px" />

            <!-- 视频参考图片上传 (仅type=8图生视频模型显示) -->
            <n-popover
              v-if="selectedModel && selectedModel.type === 8"
              trigger="hover"
              :show-arrow="false"
              placement="top">
              <template #trigger>
                <div style="position: relative; display: inline-block">
                  <n-upload
                    ref="videoImageFileRef"
                    :show-file-list="false"
                    :custom-request="handleVideoImageUpload"
                    :disabled="isUploadingVideoImage"
                    accept="image/jpeg,image/jpg,image/png,image/webp">
                    <n-button
                      size="small"
                      :type="videoImagePreview ? 'success' : 'default'"
                      :loading="isUploadingVideoImage"
                      :disabled="isUploadingVideoImage"
                      style="margin-left: 8px">
                      <template #icon v-if="!isUploadingVideoImage">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                      </template>
                      {{ isUploadingVideoImage ? '上传中...' : videoImagePreview ? '已上传' : '参考图' }}
                    </n-button>
                  </n-upload>
                  <!-- 清除按钮 -->
                  <n-button
                    v-if="videoImagePreview"
                    size="tiny"
                    circle
                    type="error"
                    @click="clearVideoImage"
                    style="
                      position: absolute;
                      top: -6px;
                      right: -6px;
                      width: 18px;
                      height: 18px;
                      padding: 0;
                      min-width: 18px;
                    ">
                    <template #icon>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </template>
                  </n-button>
                </div>
              </template>
              <div style="max-width: 300px">
                <div v-if="videoImagePreview" style="margin-bottom: 8px">
                  <img :src="videoImagePreview" style="max-width: 100%; border-radius: 4px" />
                </div>
                <div style="font-size: 12px; color: #666">
                  <div v-if="isUploadingVideoImage" style="color: #18a058">⏳ 正在上传到七牛云...</div>
                  <div v-else>
                    {{ videoImagePreview ? '已上传到七牛云，点击按钮可重新上传' : '上传参考图片用于图生视频' }}
                    <br />
                    支持格式: JPG、PNG、WEBP
                    <br />
                    最大大小: 10MB
                    <br />
                    <span style="color: #999; font-size: 11px">图片将上传到七牛云存储</span>
                  </div>
                </div>
              </div>
            </n-popover>

            <!-- 其他功能图标 -->
            <n-popover
              v-for="(item, index) in otherFeatures"
              :key="index"
              trigger="hover"
              :show-arrow="false"
              placement="top">
              <template #trigger>
                <svg><use :href="`#${item.icon}`"></use></svg>
              </template>
              <p>{{ item.label }}</p>
            </n-popover>

            <div class="flex items-center gap-6px bg-[--chat-hover-color] rounded-50px w-fit h-fit p-[4px_6px]">
              <svg style="width: 22px; height: 22px; outline: none; cursor: pointer"><use href="#explosion"></use></svg>
              <n-popover trigger="hover" :show-arrow="false" placement="top">
                <template #trigger>
                  <p class="text-(12px #707070) cursor-default select-none pr-6px">
                    Token 使用 {{ serverTokenUsage ?? conversationTokens }} / {{ selectedModel?.maxTokens || 0 }}
                  </p>
                </template>
                <span>按会话累计 Token 进行限制，达到上限后将拒绝继续生成</span>
              </n-popover>
              <n-popover trigger="hover" :show-arrow="false" placement="top">
                <template #trigger>
                  <n-switch v-model:value="reasoningEnabled" size="small">
                    <template #checked>深度思考</template>
                    <template #unchecked>关闭</template>
                  </n-switch>
                </template>
                <span v-if="supportsReasoning">开启后将优先展示思考过程</span>
                <span v-else>该模型不支持深度思考</span>
              </n-popover>
            </div>
          </n-flex>

          <div style="height: 100px" class="flex flex-col items-end gap-6px">
            <MsgInput ref="MsgInputRef" :isAIMode="!!selectedModel" @send-ai="handleSendAI" />
          </div>
        </n-flex>
      </div>
    </div>
  </main>

  <!-- 历史记录弹窗 -->
  <n-modal
    v-model:show="showHistoryModal"
    preset="card"
    title="生成历史"
    style="width: 90%; max-width: 1200px"
    :bordered="false">
    <!-- 类型切换按钮 -->
    <template #header-extra>
      <n-button-group size="small">
        <n-button :type="historyType === 'image' ? 'primary' : 'default'" @click="switchHistoryType('image')">
          <template #icon>
            <Icon icon="mdi:image" />
          </template>
          图片
        </n-button>
        <n-button :type="historyType === 'audio' ? 'primary' : 'default'" @click="switchHistoryType('audio')">
          <template #icon>
            <Icon icon="mdi:music" />
          </template>
          音频
        </n-button>
        <n-button :type="historyType === 'video' ? 'primary' : 'default'" @click="switchHistoryType('video')">
          <template #icon>
            <Icon icon="mdi:video" />
          </template>
          视频
        </n-button>
      </n-button-group>
    </template>

    <n-spin :show="historyLoading">
      <div v-if="historyList.length > 0" class="history-grid">
        <div v-for="item in historyList" :key="item.id" class="history-item">
          <div class="history-wrapper">
            <!-- 图片预览 -->
            <div v-if="historyType === 'image'" class="media-preview">
              <img
                v-if="item.status === 20 && item.picUrl"
                :src="item.picUrl"
                :alt="item.prompt"
                class="preview-img"
                @click="handlePreviewImage(item)" />
              <div v-else-if="item.status === 10" class="preview-placeholder">
                <n-spin size="large" />
                <p class="text-12px text-#909090 mt-8px">生成中...</p>
              </div>
              <div v-else class="preview-placeholder error">
                <Icon icon="mdi:alert-circle-outline" class="text-48px text-#d5304f" />
                <p class="text-12px text-#d5304f mt-8px">生成失败</p>
              </div>
            </div>

            <!-- 音频预览 -->
            <div v-else-if="historyType === 'audio'" class="media-preview">
              <div v-if="item.status === 20 && item.audioUrl" class="audio-preview">
                <Icon icon="mdi:music-circle" class="text-64px text-#1890ff" />
                <p class="text-12px text-#1890ff mt-8px">点击播放</p>
              </div>
              <div v-else-if="item.status === 10" class="preview-placeholder">
                <n-spin size="large" />
                <p class="text-12px text-#909090 mt-8px">生成中...</p>
              </div>
              <div v-else class="preview-placeholder error">
                <Icon icon="mdi:alert-circle-outline" class="text-48px text-#d5304f" />
                <p class="text-12px text-#d5304f mt-8px">生成失败</p>
              </div>
            </div>

            <!-- 视频预览 -->
            <div v-else class="media-preview">
              <div v-if="item.status === 20 && item.videoUrl" class="video-preview" @click="handlePreviewVideo(item)">
                <Icon icon="mdi:play-circle" class="text-64px text-white" />
                <p class="text-12px text-white mt-8px">点击播放</p>
              </div>
              <div v-else-if="item.status === 10" class="preview-placeholder">
                <n-spin size="large" />
                <p class="text-12px text-#909090 mt-8px">生成中...</p>
              </div>
              <div v-else class="preview-placeholder error">
                <Icon icon="mdi:alert-circle-outline" class="text-48px text-#d5304f" />
                <p class="text-12px text-#d5304f mt-8px">生成失败</p>
              </div>
            </div>

            <!-- 信息 -->
            <div class="history-info">
              <p class="prompt" :title="item.prompt">{{ item.prompt }}</p>
              <p class="text-11px text-#909090 mt-4px">{{ item.width }} × {{ item.height }}</p>
            </div>
          </div>
        </div>
      </div>
      <n-empty v-else description="暂无生成记录" class="py-40px" />
    </n-spin>

    <!-- 分页 -->
    <n-flex v-if="historyPagination.total > historyPagination.pageSize" justify="center" class="mt-16px">
      <n-pagination
        v-model:page="historyPagination.pageNo"
        :page-size="historyPagination.pageSize"
        :page-count="Math.ceil(historyPagination.total / historyPagination.pageSize)"
        @update:page="handleHistoryPageChange" />
    </n-flex>
  </n-modal>

  <!-- 图片预览弹窗 -->
  <n-modal v-model:show="showImagePreview" preset="card" title="图片预览" style="width: 90%; max-width: 1000px">
    <div v-if="previewItem" class="preview-container">
      <img :src="previewItem.picUrl" :alt="previewItem.prompt" class="preview-image" />
      <div class="preview-info mt-16px">
        <p class="text-14px">
          <strong>提示词：</strong>
          {{ previewItem.prompt }}
        </p>
        <p class="text-12px text-#909090 mt-8px">
          <strong>尺寸：</strong>
          {{ previewItem.width }} × {{ previewItem.height }}
        </p>
      </div>
    </div>
  </n-modal>

  <!-- 视频预览弹窗 -->
  <n-modal v-model:show="showVideoPreview" preset="card" title="视频预览" style="width: 90%; max-width: 1000px">
    <div v-if="previewItem" class="preview-container">
      <video :src="previewItem.videoUrl" controls class="preview-video" />
      <div class="preview-info mt-16px">
        <p class="text-14px">
          <strong>提示词：</strong>
          {{ previewItem.prompt }}
        </p>
        <p class="text-12px text-#909090 mt-8px">
          <strong>尺寸：</strong>
          {{ previewItem.width }} × {{ previewItem.height }}
        </p>
      </div>
    </div>
  </n-modal>
</template>
<script setup lang="ts">
import { convertFileSrc } from '@tauri-apps/api/core'
import { fetch as nativeFetch } from '@tauri-apps/plugin-http'
import { type InputInst, UploadFileInfo } from 'naive-ui'
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import MsgInput from '@/components/rightBox/MsgInput.vue'
import { useMitt } from '@/hooks/useMitt.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import MarkdownRender from 'markstream-vue'
import { ROBOT_MARKDOWN_CUSTOM_ID } from '@/plugins/robot/utils/markdown'
import { useResizeObserver } from '@vueuse/core'
import { ThemeEnum, AiMsgContentTypeEnum } from '@/enums'
import 'markstream-vue/index.css'
import {
  modelPage,
  conversationCreateMy,
  conversationUpdateMy,
  conversationDeleteMy,
  messageListByConversationId,
  messageDelete,
  messageDeleteByConversationId,
  chatRolePage,
  imageDraw,
  videoGenerate,
  audioGenerate,
  imageMyPage,
  videoMyPage,
  audioMyPage,
  imageMyListByIds,
  videoMyListByIds,
  audioMyListByIds,
  audioGetVoices
} from '@/utils/ImRequestUtils'
import { messageSendStream } from '@/utils/ImRequestUtils'
import { conversationGetMy } from '@/utils/ImRequestUtils'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { persistAiImageFile, resolveAiImagePath } from '@/utils/PathUtil'
import { md5FromString } from '@/utils/Md5Util'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useUpload, UploadProviderEnum } from '@/hooks/useUpload'
import { UploadSceneEnum } from '@/enums'

const settingStore = useSettingStore()
const userStore = useUserStore()
const { page, themes } = storeToRefs(settingStore)
const SHIKI_LIGHT_THEME = 'vitesse-light'
const SHIKI_DARK_THEME = 'vitesse-dark'
const markdownCustomId = ROBOT_MARKDOWN_CUSTOM_ID
const markdownThemes = [SHIKI_LIGHT_THEME, SHIKI_DARK_THEME] as const as any

const MsgInputRef = ref()
/** 是否是编辑模式 */
const isEdit = ref(false)
const inputInstRef = ref<InputInst | null>(null)
/** 原始标题 */
const originalTitle = ref('')
/** 当前聊天的标题、id 以及元信息 */
const currentChat = ref({
  id: '0',
  title: '',
  messageCount: 0,
  createTime: 0
})

// 计算是否是暗色主题，处理空值和未初始化的情况
const isDarkTheme = computed(() => {
  const content = themes.value.content
  // 如果 content 为空，尝试从 document.documentElement.dataset.theme 获取
  if (!content) {
    const datasetTheme = document.documentElement.dataset.theme
    return datasetTheme === ThemeEnum.DARK
  }
  return content === ThemeEnum.DARK
})

const markdownCodeBlockProps = computed(() => ({
  isDark: isDarkTheme.value,
  darkTheme: SHIKI_DARK_THEME,
  lightTheme: SHIKI_LIGHT_THEME,
  themes: [SHIKI_DARK_THEME, SHIKI_LIGHT_THEME] as const,
  showHeader: true
}))

// 同时监听 isDarkTheme 的变化，确保在主题切换时组件能正确更新
watch(
  isDarkTheme,
  (newVal) => {
    // 主题切换时，确保 CSS 类正确应用
    nextTick(() => {
      // 查找所有 code-block-wrapper 元素，确保它们有正确的类
      const wrappers = document.querySelectorAll('.code-block-wrapper')
      wrappers.forEach((wrapper) => {
        wrapper.classList.remove('code-block-dark', 'code-block-light')
        wrapper.classList.add(newVal ? 'code-block-dark' : 'code-block-light')
      })
    })
  },
  { immediate: true }
)

// 消息列表
interface Message {
  type: 'user' | 'assistant'
  content: string
  reasoningContent?: string // 推理思考内容（用于支持思考模型，如 DeepSeek R1）
  streaming?: boolean
  createTime?: number
  id?: string // 消息ID，用于删除
  replyId?: string | null // 回复的消息ID
  model?: string // 使用的模型
  isGenerating?: boolean // 是否正在生成中(用于图片/视频/音频生成)
  msgType?: AiMsgContentTypeEnum // 消息内容类型枚举
  imageUrl?: string // 图片URL
  imageInfo?: {
    // 图片信息
    prompt: string
    width: number
    height: number
    model: string
  }
  videoUrl?: string // 视频URL
  videoInfo?: {
    // 视频信息
    prompt: string
    width: number
    height: number
    model: string
  }
  audioUrl?: string // 音频URL
  audioInfo?: {
    // 音频信息
    prompt: string
    voice: string
    model: string
    speed: number
  }
}

const messageList = ref<Message[]>([])
const MAX_MESSAGE_COUNT = 40 // 最多保留40条消息，防止内存泄漏
const scrollContainerRef = ref<HTMLElement | null>(null)
const messageContentRef = ref<HTMLElement | null>(null)
const shouldAutoStickBottom = ref(true)
const showScrollbar = ref(true)
const loadingMessages = ref(false) // 消息加载状态
const estimateTokens = (text: string) => {
  if (!text) return 0
  const chars = Array.from(text)
  const asciiChars = chars.filter((ch) => (ch.codePointAt(0) as number) <= 0x7f)
  const ascii = asciiChars.join('')
  const nonAsciiCount = chars.length - asciiChars.length
  const asciiWords = ascii.trim().split(/\s+/).filter(Boolean)
  const asciiTokens = asciiWords.reduce((acc, w) => acc + Math.ceil(w.length / 4), 0)
  const nonAsciiTokens = nonAsciiCount
  return asciiTokens + nonAsciiTokens
}
const estimateMessageTokens = (m: Message) => {
  const base = estimateTokens(m.content || '')
  const reasoning = estimateTokens(m.reasoningContent || '')
  return base + reasoning
}
const conversationTokens = computed(() => {
  return messageList.value.reduce((sum, m) => sum + estimateMessageTokens(m), 0)
})
const serverTokenUsage = ref<number | null>(null)

const aiMediaDownloadTasks = new Map<string, Promise<ArrayBuffer>>()
const MAX_MEDIA_CACHE_SIZE = 10 // 最多缓存10个媒体下载任务

// 将各种可能的二进制返回形式统一转成 ArrayBuffer，兼容 plugin-http/浏览器 fetch 等场景
const convertHttpDataToArrayBuffer = (rawData: unknown): ArrayBuffer => {
  if (rawData === null || rawData === undefined) {
    throw new Error('图片数据为空')
  }

  if (rawData instanceof ArrayBuffer) {
    return rawData
  }

  if (rawData instanceof Uint8Array) {
    return rawData.slice().buffer
  }

  if (ArrayBuffer.isView(rawData)) {
    // 复制一份，避免 SharedArrayBuffer 类型不兼容
    const view = rawData as ArrayBufferView
    const copy = new Uint8Array(view.byteLength)
    copy.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength))
    return copy.buffer
  }

  if (Array.isArray(rawData)) {
    return Uint8Array.from(rawData).buffer
  }

  if (typeof rawData === 'object') {
    const maybeData = (rawData as { data?: number[] }).data
    if (Array.isArray(maybeData)) {
      return Uint8Array.from(maybeData).buffer
    }
  }

  if (typeof rawData === 'string') {
    const binaryString = atob(rawData)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  throw new Error('无法解析图片数据')
}

// 下载 AI 媒体的二进制数据：同 URL 复用 Promise，避免重复下载；按 plugin-http 的多种返回形态兜底
const requestAiMediaBuffer = (url: string) => {
  if (!url) {
    return Promise.reject(new Error('图片地址无效'))
  }

  const existingTask = aiMediaDownloadTasks.get(url)
  if (existingTask) {
    return existingTask
  }

  // 清理缓存，防止内存泄漏
  if (aiMediaDownloadTasks.size >= MAX_MEDIA_CACHE_SIZE) {
    const firstKey = aiMediaDownloadTasks.keys().next().value
    if (firstKey) {
      aiMediaDownloadTasks.delete(firstKey)
    }
  }

  const downloadTask = (async () => {
    const response = await nativeFetch(url, {
      method: 'GET'
    })

    const anyResponse = response as any
    const status = typeof anyResponse.status === 'number' ? anyResponse.status : 200
    const statusText = typeof anyResponse.statusText === 'string' ? anyResponse.statusText : ''
    const ok = 'ok' in anyResponse ? Boolean(anyResponse.ok) : status >= 200 && status < 400

    if (!ok) {
      throw new Error(`下载失败: ${status} ${statusText}`.trim())
    }

    // 优先使用标准的 arrayBuffer
    if (typeof anyResponse.arrayBuffer === 'function') {
      const buffer = await anyResponse.arrayBuffer()
      if (buffer instanceof ArrayBuffer) {
        return buffer
      }
    }

    // plugin-http 额外提供的 bytes 方法
    if (typeof anyResponse.bytes === 'function') {
      const bytes = await anyResponse.bytes()
      return convertHttpDataToArrayBuffer(bytes)
    }

    // 最后回退 data 字段
    if ('data' in anyResponse) {
      return convertHttpDataToArrayBuffer(anyResponse.data)
    }

    throw new Error('无法解析图片数据')
  })().finally(() => {
    aiMediaDownloadTasks.delete(url)
  })

  aiMediaDownloadTasks.set(url, downloadTask)
  return downloadTask
}

// 解析媒体扩展名，默认回退为指定后缀
const getAiMediaExtension = (url: string, fallback = 'png') => {
  const cleanUrl = url.split(/[?#]/)[0] || ''
  const ext = cleanUrl.split('.').pop() || ''
  if (!ext || ext.length > 5 || ext.includes('/')) return fallback
  return ext
}

const buildAiMediaFileName = async (url: string, fallbackExt: string, prefix: string) => {
  const ext = getAiMediaExtension(url, fallbackExt)
  try {
    const hash = await md5FromString(url)
    return `${prefix}-${hash}.${ext}`
  } catch (error) {
    console.error('生成 AI 媒体文件名失败:', error)
    return `${prefix}-${Date.now()}.${ext}`
  }
}

const ensureLocalAiImage = async (remoteUrl: string, messageIndex: number) => {
  if (!remoteUrl || !userStore.userInfo?.uid || !currentChat.value.id) return
  const targetMessage = messageList.value[messageIndex]
  if (!targetMessage || targetMessage.type !== 'assistant') return
  const isSameImage = targetMessage.imageUrl
    ? targetMessage.imageUrl === remoteUrl
    : targetMessage.content === remoteUrl
  if (!isSameImage) return
  try {
    const fileName = await buildAiMediaFileName(remoteUrl, 'png', 'ai-image')
    const existsResult = await resolveAiImagePath({
      userUid: userStore.userInfo.uid,
      conversationId: currentChat.value.id,
      fileName
    })
    let absolutePath = existsResult.absolutePath
    if (!existsResult.exists) {
      const buffer = await requestAiMediaBuffer(remoteUrl)
      const data = new Uint8Array(buffer)
      const saved = await persistAiImageFile({
        userUid: userStore.userInfo.uid,
        conversationId: currentChat.value.id,
        fileName,
        data
      })
      absolutePath = saved.absolutePath
    }
    if (messageList.value[messageIndex]) {
      const displayUrl = convertFileSrc(absolutePath)
      messageList.value[messageIndex].content = displayUrl
      messageList.value[messageIndex].imageUrl = remoteUrl
    }
  } catch (error) {
    console.error('AI 图片本地化失败:', error)
  }
}

// 视频本地化：与图片同目录策略，下载后替换展示 URL
const ensureLocalAiVideo = async (remoteUrl: string, messageIndex: number) => {
  if (!remoteUrl || !userStore.userInfo?.uid || !currentChat.value.id) return
  const targetMessage = messageList.value[messageIndex]
  if (!targetMessage || targetMessage.type !== 'assistant') return
  const isSameVideo = targetMessage.videoUrl
    ? targetMessage.videoUrl === remoteUrl
    : targetMessage.content === remoteUrl
  if (!isSameVideo) return
  try {
    const fileName = await buildAiMediaFileName(remoteUrl, 'mp4', 'ai-video')
    const existsResult = await resolveAiImagePath({
      userUid: userStore.userInfo.uid,
      conversationId: currentChat.value.id,
      fileName
    })
    let absolutePath = existsResult.absolutePath
    if (!existsResult.exists) {
      const buffer = await requestAiMediaBuffer(remoteUrl)
      const data = new Uint8Array(buffer)
      const saved = await persistAiImageFile({
        userUid: userStore.userInfo.uid,
        conversationId: currentChat.value.id,
        fileName,
        data
      })
      absolutePath = saved.absolutePath
    }
    if (messageList.value[messageIndex]) {
      const displayUrl = convertFileSrc(absolutePath)
      messageList.value[messageIndex].content = displayUrl
      messageList.value[messageIndex].videoUrl = remoteUrl
    }
  } catch (error) {
    console.error('AI 视频本地化失败:', error)
  }
}

// 音频本地化：与图片同目录策略，下载后替换展示 URL
const ensureLocalAiAudio = async (remoteUrl: string, messageIndex: number) => {
  if (!remoteUrl || !userStore.userInfo?.uid || !currentChat.value.id) return
  const targetMessage = messageList.value[messageIndex]
  if (!targetMessage || targetMessage.type !== 'assistant') return
  const isSameAudio = targetMessage.audioUrl
    ? targetMessage.audioUrl === remoteUrl
    : targetMessage.content === remoteUrl
  if (!isSameAudio) return
  try {
    const fileName = await buildAiMediaFileName(remoteUrl, 'mp3', 'ai-audio')
    const existsResult = await resolveAiImagePath({
      userUid: userStore.userInfo.uid,
      conversationId: currentChat.value.id,
      fileName
    })
    let absolutePath = existsResult.absolutePath
    if (!existsResult.exists) {
      const buffer = await requestAiMediaBuffer(remoteUrl)
      const data = new Uint8Array(buffer)
      const saved = await persistAiImageFile({
        userUid: userStore.userInfo.uid,
        conversationId: currentChat.value.id,
        fileName,
        data
      })
      absolutePath = saved.absolutePath
    }
    if (messageList.value[messageIndex]) {
      const displayUrl = convertFileSrc(absolutePath)
      messageList.value[messageIndex].content = displayUrl
      messageList.value[messageIndex].audioUrl = remoteUrl
    }
  } catch (error) {
    console.error('AI 音频本地化失败:', error)
  }
}

const getMessageBubbleClass = (message: Message) => {
  if (message.type === 'assistant' && isRenderableAiImage(message)) {
    return []
  }
  return ['bubble', message.type === 'user' ? 'bubble-oneself' : 'bubble-ai']
}

const showDeleteChatConfirm = ref(false) // 删除会话确认框显示状态
const deleteWithMessages = ref(false) // 是否同时删除消息
const showRolePopover = ref(false) // 角色选择弹窗显示状态
const selectedRole = ref<any>(null) // 当前选中的角色
const roleList = ref<any[]>([]) // 角色列表
const roleLoading = ref(false) // 角色加载状态

// 滚动到底部
const getScrollContainer = () => scrollContainerRef.value

const isNearBottom = () => {
  const container = getScrollContainer()
  if (!container) return true
  const offset = container.scrollHeight - (container.scrollTop + container.clientHeight)
  return offset <= 80
}

const scrollToBottom = (retryCount = 2) => {
  shouldAutoStickBottom.value = true
  const raf =
    typeof window === 'undefined'
      ? (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16)
      : window.requestAnimationFrame

  const scroll = () => {
    const container = getScrollContainer()
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'auto' })
  }

  const runWithRetry = (remaining: number) => {
    raf(() => {
      scroll()
      if (remaining > 0) {
        runWithRetry(remaining - 1)
      }
    })
  }

  nextTick(() => {
    runWithRetry(retryCount)
  })
}

const handleScroll = () => {
  shouldAutoStickBottom.value = isNearBottom()
}

watch(scrollContainerRef, () => {
  handleScroll()
})

useResizeObserver(messageContentRef, () => {
  if (shouldAutoStickBottom.value) {
    scrollToBottom()
  }
})

/** 通知会话元信息变化 */
const notifyConversationMetaChange = (payload: { messageCount?: number; createTime: number }) => {
  if (!currentChat.value.id || currentChat.value.id === '0') {
    return
  }

  if (payload.messageCount !== undefined) {
    currentChat.value.messageCount = payload.messageCount
  }

  const resolvedCreateTime =
    typeof payload.createTime === 'number' && Number.isFinite(payload.createTime)
      ? payload.createTime
      : currentChat.value.createTime || Date.now()
  currentChat.value.createTime = resolvedCreateTime

  useMitt.emit('update-chat-meta', {
    id: currentChat.value.id,
    messageCount: currentChat.value.messageCount,
    createTime: resolvedCreateTime
  })
}

// 模型选择相关状态
const showModelPopover = ref(false)
const modelLoading = ref(false)
const modelSearch = ref('')
const selectedModel = ref<any>(null)
const reasoningEnabled = ref(false)
const supportsReasoning = computed(() => Boolean(selectedModel.value?.supportsReasoning))

// 模型分页数据
const modelPagination = ref({
  pageNo: 1,
  pageSize: 10,
  total: 0
})

// 模型列表
const modelList = ref<any[]>([])

// 过滤后的模型列表
const filteredModels = computed(() => {
  const list = modelList.value.slice()
  const search = modelSearch.value?.toLowerCase() || ''
  const filtered = search
    ? list.filter(
        (model) =>
          model.name?.toLowerCase().includes(search) ||
          model.description?.toLowerCase().includes(search) ||
          model.platform?.toLowerCase().includes(search)
      )
    : list
  return filtered.sort((a: any, b: any) => {
    const ao = a.publicStatus === 0
    const bo = b.publicStatus === 0
    if (ao !== bo) return ao ? -1 : 1
    const as = a.sort ?? 0
    const bs = b.sort ?? 0
    if (as !== bs) return as - bs
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
})

const officialModels = computed(() => filteredModels.value.filter((m: any) => m.publicStatus === 0))
const userModels = computed(() => filteredModels.value.filter((m: any) => m.publicStatus !== 0))

// 图片生成参数
const imageParams = ref({
  size: '1024x1024'
})

// 图片尺寸选项
const imageSizeOptions = [
  { label: '1024x1024 (正方形)', value: '1024x1024' },
  { label: '1024x1792 (竖屏)', value: '1024x1792' },
  { label: '1792x1024 (横屏)', value: '1792x1024' }
]

// 视频生成参数
const videoParams = ref({
  size: '1280x720',
  duration: 5, // 视频时长(秒)
  image: null as string | null // 用于I2V模型的参考图片 (七牛云URL)
})

// 视频尺寸选项
const videoSizeOptions = [
  { label: '1280x720 (横屏)', value: '1280x720' },
  { label: '720x1280 (竖屏)', value: '720x1280' },
  { label: '960x960 (正方形)', value: '960x960' }
]

// 视频时长选项
const videoDurationOptions = [
  { label: '5秒', value: 5 },
  { label: '10秒', value: 10 }
]

// 音频生成参数
const audioParams = ref({
  voice: 'alloy',
  speed: 1.0
})

// 音频语音选项 (动态加载)
const audioVoiceOptions = ref([
  { label: 'Alloy (中性)', value: 'alloy' },
  { label: 'Echo (男性)', value: 'echo' },
  { label: 'Fable (男性)', value: 'fable' },
  { label: 'Onyx (男性)', value: 'onyx' },
  { label: 'Nova (女性)', value: 'nova' },
  { label: 'Shimmer (女性)', value: 'shimmer' }
])

// 加载指定模型支持的声音列表
const loadAudioVoices = async (model: any) => {
  try {
    if (!model || !model.model) {
      return
    }

    const voices = await audioGetVoices({ model: model.model })

    if (voices && voices.length > 0) {
      // 将声音列表转换为选项格式
      audioVoiceOptions.value = voices.map((voice: string) => {
        // 提取声音名称 (例如: "fnlp/MOSS-TTSD-v0.5:anna" -> "anna")
        const voiceName = voice.includes(':') ? voice.split(':')[1] : voice
        return {
          label: voiceName.charAt(0).toUpperCase() + voiceName.slice(1),
          value: voice
        }
      })

      // 设置默认值为第一个选项
      if (audioVoiceOptions.value.length > 0) {
        audioParams.value.voice = audioVoiceOptions.value[0].value
      }
    } else {
      // 如果返回空列表,表示支持动态音色,使用默认选项
      audioVoiceOptions.value = [{ label: 'Default', value: 'default' }]
      audioParams.value.voice = 'default'
    }
  } catch (error) {
    console.error('加载声音列表失败:', error)
    // 保持默认选项
  }
}

// 音频速度选项
const audioSpeedOptions = [
  { label: '0.5x (慢速)', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1.0x (正常)', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x (快速)', value: 1.5 },
  { label: '2.0x (极快)', value: 2.0 }
]

// 视频参考图片上传
const videoImageFileRef = ref<any>(null)
const videoImagePreview = ref<string | null>(null)
const isUploadingVideoImage = ref(false)

// 初始化上传hook
const { uploadFile: uploadToQiniu, fileInfo } = useUpload()

// 处理视频参考图片上传
const handleVideoImageUpload = async (options: { file: UploadFileInfo; onFinish: () => void; onError: () => void }) => {
  const file = options.file.file as File
  if (!file) {
    options.onError()
    return
  }

  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    window.$message.error('只支持 JPG、PNG、WEBP 格式的图片')
    options.onError()
    return
  }

  // 检查文件大小 (最大 10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    window.$message.error('图片大小不能超过 10MB')
    options.onError()
    return
  }

  try {
    isUploadingVideoImage.value = true

    // 上传到七牛云
    await uploadToQiniu(file, {
      provider: UploadProviderEnum.QINIU,
      scene: UploadSceneEnum.CHAT,
      enableDeduplication: true
    })

    // 获取七牛云URL
    const qiniuUrl = fileInfo.value?.downloadUrl
    if (qiniuUrl) {
      videoParams.value.image = qiniuUrl
      videoImagePreview.value = qiniuUrl
      console.log('视频参考图片上传成功，七牛云URL:', qiniuUrl)
      options.onFinish()
    } else {
      throw new Error('未获取到图片URL')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    options.onError()
  } finally {
    isUploadingVideoImage.value = false
  }
}

// 清除视频参考图片
const clearVideoImage = () => {
  videoParams.value.image = null
  videoImagePreview.value = null
  if (videoImageFileRef.value) {
    videoImageFileRef.value.clear()
  }
}

// 轮询任务管理
const MAX_POLL_DURATION = 5 * 60 * 1000 // 5 分钟超时保护，避免长时间挂起占用内存
const pollingTasks = new Map<number, { timerId: number; conversationId: string; startedAt: number }>()

// 停止所有轮询任务
const stopAllPolling = () => {
  pollingTasks.forEach(({ timerId }) => window.clearInterval(timerId))
  pollingTasks.clear()
  console.log('已停止所有轮询任务')
}

// 停止特定会话的轮询任务
const stopConversationPolling = (conversationId: string) => {
  const tasksToStop: number[] = []
  pollingTasks.forEach(({ timerId, conversationId: taskConvId }, imageId) => {
    if (taskConvId === conversationId) {
      window.clearInterval(timerId)
      tasksToStop.push(imageId)
    }
  })
  tasksToStop.forEach((id) => pollingTasks.delete(id))
  if (tasksToStop.length > 0) {
    console.log(`已停止会话 ${conversationId} 的 ${tasksToStop.length} 个轮询任务`)
  }
}

// 历史记录相关
const showHistoryModal = ref(false)
const historyType = ref<'image' | 'video' | 'audio'>('image')
const historyLoading = ref(false)
const historyList = ref<any[]>([])
const historyPagination = ref({
  pageNo: 1,
  pageSize: 12,
  total: 0
})

// 预览相关
const showImagePreview = ref(false)
const showVideoPreview = ref(false)
const previewItem = ref<any>(null)
const AI_THINKING_PLACEHOLDER = '正在思考中...'

const isLikelyImageUrl = (value?: string) => {
  if (!value) return false
  const lower = value.toLowerCase()
  return (
    /^https?:\/\//.test(value) ||
    lower.startsWith('data:image/') ||
    lower.startsWith('asset:') ||
    lower.startsWith('file:') ||
    lower.startsWith('tauri://') ||
    lower.startsWith('blob:')
  )
}

const isLikelyMediaUrl = (value?: string) => {
  if (!value) return false
  const lower = value.toLowerCase()
  return (
    /^https?:\/\//.test(value) ||
    lower.startsWith('data:') ||
    lower.startsWith('asset:') ||
    lower.startsWith('file:') ||
    lower.startsWith('tauri://') ||
    lower.startsWith('blob:')
  )
}

const isRenderableAiImage = (message: Message) => {
  if (message.type !== 'assistant') return false
  if (!isLikelyImageUrl(message.content)) return false
  return message.msgType === AiMsgContentTypeEnum.IMAGE || message.msgType === undefined || message.msgType === null
}

const getAiPlaceholderText = (message: Message) => {
  if (message.content && message.content.trim()) return message.content
  return AI_THINKING_PLACEHOLDER
}

// AI消息发送处理
const handleSendAI = (data: { content: string }) => {
  if (!selectedModel.value) {
    window.$message.warning('请先选择AI模型')
    return
  }

  if (!data.content.trim()) {
    window.$message.warning('消息内容不能为空')
    return
  }

  // 根据模型类型调用不同的处理逻辑
  const modelType = selectedModel.value.type

  if (modelType === 1) {
    // 文字对话模型
    sendAIMessage(data.content, selectedModel.value)
  } else if (modelType === 2) {
    // 图片生成模型
    generateImage(data.content, selectedModel.value)
  } else if (modelType === 3) {
    // 音频生成模型
    generateAudio(data.content, selectedModel.value)
  } else if (modelType === 4 || modelType === 7 || modelType === 8) {
    // 视频生成模型（包括旧的type=4、文生视频type=7、图生视频type=8）
    generateVideo(data.content, selectedModel.value)
  } else {
    window.$message.warning('不支持的模型类型')
  }
}

// AI消息发送实现
const sendAIMessage = async (content: string, model: any) => {
  try {
    const tokenBudget = Number(model?.maxTokens || 0)
    if (tokenBudget > 0 && conversationTokens.value >= tokenBudget) {
      window.$message.warning(`本会话 Token 已用完（${tokenBudget}），请新建会话或更换模型`)
      return
    }
    window.$message.loading('AI思考中...', { duration: 0 })

    console.log('开始发送AI消息:', {
      内容: content,
      模型: model.name,
      会话ID: currentChat.value.id
    })

    // 添加用户消息到列表
    messageList.value.push({
      type: 'user',
      msgType: 1, // 1=TEXT
      content: content,
      createTime: Date.now()
    })

    // 添加AI消息占位符（用于流式更新）
    const aiMessageIndex = messageList.value.length
    messageList.value.push({
      type: 'assistant',
      msgType: 1, // 1=TEXT
      content: AI_THINKING_PLACEHOLDER,
      createTime: Date.now()
    })

    // 滚动到底部、用于累积AI回复内容
    scrollToBottom()
    let accumulatedContent = ''
    let accumulatedReasoningContent = '' // 用于累积推理内容

    if (!currentChat.value.messageCount) {
      currentChat.value.messageCount = 0
    }
    currentChat.value.messageCount += 2 // 用户消息 + AI消息
    notifyConversationMetaChange({
      messageCount: currentChat.value.messageCount,
      createTime: Date.now()
    })

    await messageSendStream(
      {
        conversationId: currentChat.value.id,
        content: content,
        useContext: true,
        reasoningEnabled: reasoningEnabled.value
      },
      {
        onChunk: (chunk: string) => {
          try {
            const data = JSON.parse(chunk)
            if (data.success && data.data?.receive) {
              // 处理正常内容
              if (data.data.receive.content) {
                const incrementalContent = data.data.receive.content
                // 第一段内容到达时清空占位符
                if (
                  messageList.value[aiMessageIndex].content === AI_THINKING_PLACEHOLDER &&
                  accumulatedContent === ''
                ) {
                  messageList.value[aiMessageIndex].content = ''
                }
                // 手动累加内容、更新AI消息内容
                accumulatedContent += incrementalContent
                messageList.value[aiMessageIndex].content = accumulatedContent
              }

              // 处理推理思考内容
              if (data.data.receive.reasoningContent) {
                const incrementalReasoningContent = data.data.receive.reasoningContent
                accumulatedReasoningContent += incrementalReasoningContent
                messageList.value[aiMessageIndex].reasoningContent = accumulatedReasoningContent
              }

              // 设置 msgType（如果后端返回了）
              if (data.data.receive.msgType !== undefined) {
                messageList.value[aiMessageIndex].msgType = data.data.receive.msgType
              }

              scrollToBottom()
            }
          } catch (e) {
            console.error('解析JSON失败:', e, '原始数据:', chunk)
          }
        },
        onDone: () => {
          scrollToBottom()
          const latestEntry = messageList.value[messageList.value.length - 1]
          const latestTimestamp = latestEntry?.createTime ?? currentChat.value.createTime ?? Date.now()

          notifyConversationMetaChange({
            createTime: latestTimestamp
          })
          if (currentChat.value.id && currentChat.value.id !== '0') {
            conversationGetMy({ id: currentChat.value.id })
              .then((conv: any) => {
                if (conv && typeof conv.tokenUsage === 'number') {
                  serverTokenUsage.value = conv.tokenUsage
                }
              })
              .catch(() => {})
            if (!messageList.value[aiMessageIndex].reasoningContent) {
              messageListByConversationId({ conversationId: currentChat.value.id, pageNo: 1, pageSize: 100 })
                .then((list: any[]) => {
                  if (Array.isArray(list) && list.length > 0) {
                    const last = list[list.length - 1]
                    if (last && last.type === 'assistant' && last.reasoningContent) {
                      messageList.value[aiMessageIndex].reasoningContent = last.reasoningContent
                    }
                  }
                })
                .catch(() => {})
            }
          }
        },
        onError: (error: string) => {
          console.error('AI流式响应错误:', error)
          messageList.value[aiMessageIndex].content = '抱歉，发生了错误：' + error
        }
      }
    )

    // 清空输入框
    if (MsgInputRef.value?.clearInput) {
      MsgInputRef.value.clearInput()
    }

    // 更新消息计数
  } catch (error) {
    console.error('AI消息发送失败:', error)
    window.$message.error('发送失败，请检查网络连接')
  } finally {
    window.$message.destroyAll()
  }
}

// 图片生成实现
const generateImage = async (prompt: string, model: any) => {
  try {
    const tokenBudget = Number(model?.maxTokens || 0)
    if (tokenBudget > 0 && conversationTokens.value >= tokenBudget) {
      window.$message.warning(`本会话 Token 已用完（${tokenBudget}），请新建会话或更换模型`)
      return
    }
    messageList.value.push({
      type: 'user',
      content: prompt,
      msgType: 2,
      createTime: Date.now()
    })

    // 添加AI消息占位符（用于显示进度）
    const aiMessageIndex = messageList.value.length
    messageList.value.push({
      type: 'assistant',
      msgType: 2,
      content: AI_THINKING_PLACEHOLDER,
      createTime: Date.now(),
      isGenerating: true
    })

    scrollToBottom()

    console.log('开始生成图片:', {
      提示词: prompt,
      模型: model.name,
      尺寸: imageParams.value.size
    })

    // 解析尺寸
    const [width, height] = imageParams.value.size.split('x').map(Number)

    const imageId = await imageDraw({
      modelId: String(model.id),
      prompt: prompt,
      width: width,
      height: height,
      conversationId: currentChat.value.id
    })

    // 开始轮询查询生成状态
    pollImageStatus(imageId, aiMessageIndex, prompt, width, height, model.name)

    // 清空输入框
    if (MsgInputRef.value?.clearInput) {
      MsgInputRef.value.clearInput()
    }
  } catch (error: any) {
    console.error('图片生成失败:', error)
    // 更新为错误消息
    const lastMessage = messageList.value[messageList.value.length - 1]
    if (lastMessage && lastMessage.isGenerating) {
      lastMessage.content = `图片生成失败: ${error.message || '未知错误'}`
      lastMessage.isGenerating = false
    }
    window.$message.error('图片生成失败，请检查网络连接')
  }
}

// 轮询查询图片生成状态
const pollImageStatus = async (
  imageId: number,
  messageIndex: number,
  prompt: string,
  width: number,
  height: number,
  modelName: string
) => {
  const interval = 3000 // 每3秒轮询一次
  const conversationId = currentChat.value.id

  const poll = async () => {
    const task = pollingTasks.get(imageId)
    if (!task) return

    // 超时保护
    if (Date.now() - task.startedAt > MAX_POLL_DURATION) {
      window.clearInterval(task.timerId)
      pollingTasks.delete(imageId)
      messageList.value[messageIndex].content = '图片生成超时，请重试'
      messageList.value[messageIndex].isGenerating = false
      window.$message.warning('图片生成超时，已停止轮询')
      return
    }

    try {
      if (!pollingTasks.has(imageId)) {
        return
      }

      const imageList = await imageMyListByIds({ ids: imageId.toString() })

      if (!imageList || !Array.isArray(imageList) || imageList.length === 0) {
        messageList.value[messageIndex].content = '图片生成失败: 记录不存在'
        messageList.value[messageIndex].isGenerating = false
        pollingTasks.delete(imageId)
        return
      }

      const image = imageList[0]

      // 状态: 10=进行中, 20=成功, 30=失败
      if (image.status === 20) {
        messageList.value[messageIndex] = {
          type: 'assistant',
          content: image.picUrl,
          msgType: AiMsgContentTypeEnum.IMAGE,
          createTime: Date.now(),
          isGenerating: false,
          imageUrl: image.picUrl,
          imageInfo: {
            prompt: prompt,
            width: width,
            height: height,
            model: modelName
          }
        }

        void ensureLocalAiImage(image.picUrl, messageIndex)

        window.$message.success('图片生成成功')

        scrollToBottom()
        pollingTasks.delete(imageId)
        return
      } else if (image.status === 30) {
        // 生成失败
        messageList.value[messageIndex].content = `图片生成失败: ${image.errorMessage || '未知错误'}`
        messageList.value[messageIndex].isGenerating = false
        window.$message.error('图片生成失败')
        pollingTasks.delete(imageId)
        return
      }

      // 状态=10 (进行中), 继续轮询
      console.log('图片生成中，继续轮询...')
    } catch (error: any) {
      console.error('轮询图片状态失败:', error)
      messageList.value[messageIndex].content = `查询状态失败: ${error.message || '未知错误'}`
      messageList.value[messageIndex].isGenerating = false
      pollingTasks.delete(imageId)
    }
  }

  // 启动定时轮询
  const timerId = window.setInterval(poll, interval)
  pollingTasks.set(imageId, { timerId, conversationId, startedAt: Date.now() })

  // 立即执行第一次轮询
  poll()
}

// 视频生成实现
const generateVideo = async (prompt: string, model: any) => {
  try {
    const tokenBudget = Number(model?.maxTokens || 0)
    if (tokenBudget > 0 && conversationTokens.value >= tokenBudget) {
      window.$message.warning(`本会话 Token 已用完（${tokenBudget}），请新建会话或更换模型`)
      return
    }
    messageList.value.push({
      type: 'user',
      msgType: 3, // 3=VIDEO
      content: prompt,
      createTime: Date.now()
    })

    // 添加AI消息占位符
    const aiMessageIndex = messageList.value.length
    messageList.value.push({
      type: 'assistant',
      msgType: 3, // 3=VIDEO
      content: AI_THINKING_PLACEHOLDER,
      createTime: Date.now(),
      isGenerating: true
    })

    scrollToBottom()

    console.log('开始生成视频:', {
      提示词: prompt,
      模型: model.name,
      尺寸: videoParams.value.size,
      参考图片: videoParams.value.image ? '已上传' : '未上传'
    })

    // 解析尺寸
    const [width, height] = videoParams.value.size.split('x').map(Number)

    // 构建请求参数
    const requestBody: any = {
      modelId: String(model.id),
      prompt: prompt,
      width: width,
      height: height,
      duration: videoParams.value.duration,
      conversationId: currentChat.value.id
    }

    // 如果有参考图片，添加到 options 中
    if (videoParams.value.image) {
      requestBody.options = {
        image: videoParams.value.image
      }
    }

    // 调用视频生成API，返回视频ID
    const videoId = await videoGenerate(requestBody)

    // 开始轮询查询生成状态
    pollVideoStatus(videoId, aiMessageIndex, prompt, width, height, model.name)

    // 清空输入框和参考图片
    if (MsgInputRef.value?.clearInput) {
      MsgInputRef.value.clearInput()
    }
    clearVideoImage()
  } catch (error: any) {
    console.error('视频生成失败:', error)
    // 更新为错误消息
    const lastMessage = messageList.value[messageList.value.length - 1]
    if (lastMessage && lastMessage.isGenerating) {
      lastMessage.content = `视频生成失败: ${error.message || '未知错误'}`
      lastMessage.isGenerating = false
    }
    window.$message.error('视频生成失败，请检查网络连接')
  }
}

// 轮询查询视频生成状态
const pollVideoStatus = async (
  videoId: number,
  messageIndex: number,
  prompt: string,
  width: number,
  height: number,
  modelName: string
) => {
  const interval = 5000 // 每5秒轮询一次
  const conversationId = currentChat.value.id

  const poll = async () => {
    const task = pollingTasks.get(videoId)
    if (!task) return

    // 超时保护
    if (Date.now() - task.startedAt > MAX_POLL_DURATION) {
      window.clearInterval(task.timerId)
      pollingTasks.delete(videoId)
      messageList.value[messageIndex].content = '视频生成超时，请重试'
      messageList.value[messageIndex].isGenerating = false
      window.$message.warning('视频生成超时，已停止轮询')
      return
    }

    try {
      // 检查任务是否已被停止
      if (!pollingTasks.has(videoId)) {
        return
      }

      // 后端返回的是数组 List<AiVideoRespVO>
      const videoList = await videoMyListByIds({ ids: videoId.toString() })

      if (!videoList || !Array.isArray(videoList) || videoList.length === 0) {
        messageList.value[messageIndex].content = '视频生成失败: 记录不存在'
        messageList.value[messageIndex].isGenerating = false
        pollingTasks.delete(videoId)
        return
      }

      const video = videoList[0]

      // 状态: 10=进行中, 20=成功, 30=失败
      if (video.status === 20) {
        messageList.value[messageIndex] = {
          type: 'assistant',
          content: video.videoUrl,
          msgType: AiMsgContentTypeEnum.VIDEO,
          createTime: Date.now(),
          isGenerating: false,
          videoUrl: video.videoUrl,
          videoInfo: {
            prompt: prompt,
            width: width,
            height: height,
            model: modelName
          }
        }

        void ensureLocalAiVideo(video.videoUrl, messageIndex)

        window.$message.success('视频生成成功')

        scrollToBottom()
        pollingTasks.delete(videoId)
        return
      } else if (video.status === 30) {
        // 生成失败
        messageList.value[messageIndex].content = `视频生成失败: ${video.errorMessage || '未知错误'}`
        messageList.value[messageIndex].isGenerating = false
        window.$message.error('视频生成失败')
        pollingTasks.delete(videoId)
        return
      }

      // 状态=10 (进行中), 继续轮询
    } catch (error: any) {
      console.error('轮询视频状态失败:', error)
      messageList.value[messageIndex].content = `查询状态失败: ${error.message || '未知错误'}`
      messageList.value[messageIndex].isGenerating = false
      pollingTasks.delete(videoId)
    }
  }

  // 启动定时轮询
  const timerId = window.setInterval(poll, interval)
  pollingTasks.set(videoId, { timerId, conversationId, startedAt: Date.now() })

  // 立即执行第一次轮询
  poll()
}

// 音频生成实现：添加用户消息
const generateAudio = async (prompt: string, model: any) => {
  try {
    const tokenBudget = Number(model?.maxTokens || 0)
    if (tokenBudget > 0 && conversationTokens.value >= tokenBudget) {
      window.$message.warning(`本会话 Token 已用完（${tokenBudget}），请新建会话或更换模型`)
      return
    }
    messageList.value.push({
      type: 'user',
      msgType: 4, // 4=AUDIO
      content: prompt,
      createTime: Date.now()
    })

    // 添加AI消息占位符（用于显示进度）
    const aiMessageIndex = messageList.value.length
    messageList.value.push({
      type: 'assistant',
      msgType: 4, // 4=AUDIO
      content: AI_THINKING_PLACEHOLDER,
      createTime: Date.now(),
      isGenerating: true
    })

    scrollToBottom()

    console.log('开始生成音频:', {
      提示词: prompt,
      模型: model.name,
      语音: audioParams.value.voice,
      速度: audioParams.value.speed
    })

    const audioId = await audioGenerate({
      modelId: model.id,
      prompt: prompt,
      conversationId: currentChat.value.id,
      options: {
        voice: audioParams.value.voice,
        speed: String(audioParams.value.speed)
      }
    })

    pollAudioStatus(audioId, aiMessageIndex, prompt, model.name)

    if (MsgInputRef.value?.clearInput) {
      MsgInputRef.value.clearInput()
    }
  } catch (error: any) {
    console.error('音频生成失败:', error)
    const lastMessage = messageList.value[messageList.value.length - 1]
    if (lastMessage && lastMessage.isGenerating) {
      lastMessage.content = `音频生成失败: ${error.message || '未知错误'}`
      lastMessage.isGenerating = false
    }
    window.$message.error('音频生成失败，请检查网络连接')
  }
}

// 轮询查询音频生成状态
const pollAudioStatus = async (audioId: number, messageIndex: number, prompt: string, modelName: string) => {
  const interval = 3000
  const conversationId = currentChat.value.id

  const poll = async () => {
    const task = pollingTasks.get(audioId)
    if (!task) return

    // 超时保护
    if (Date.now() - task.startedAt > MAX_POLL_DURATION) {
      window.clearInterval(task.timerId)
      pollingTasks.delete(audioId)
      messageList.value[messageIndex].content = '音频生成超时，请重试'
      messageList.value[messageIndex].isGenerating = false
      window.$message.warning('音频生成超时，已停止轮询')
      return
    }

    try {
      if (!pollingTasks.has(audioId)) {
        return
      }

      const audioList = await audioMyListByIds({ ids: audioId.toString() })

      if (!audioList || !Array.isArray(audioList) || audioList.length === 0) {
        messageList.value[messageIndex].content = '音频生成失败: 记录不存在'
        messageList.value[messageIndex].isGenerating = false
        pollingTasks.delete(audioId)
        return
      }

      const audio = audioList[0]

      // 20 代表成功
      if (audio.status === 20) {
        messageList.value[messageIndex] = {
          type: 'assistant',
          content: audio.audioUrl,
          msgType: AiMsgContentTypeEnum.AUDIO,
          createTime: Date.now(),
          isGenerating: false,
          audioUrl: audio.audioUrl,
          audioInfo: {
            prompt: prompt,
            model: modelName,
            voice: audioParams.value.voice,
            speed: audioParams.value.speed
          }
        }

        void ensureLocalAiAudio(audio.audioUrl, messageIndex)

        window.$message.success('音频生成成功')

        scrollToBottom()
        pollingTasks.delete(audioId)
        return
      } else if (audio.status === 30) {
        messageList.value[messageIndex].content = `音频生成失败: ${audio.errorMessage || '未知错误'}`
        messageList.value[messageIndex].isGenerating = false
        window.$message.error('音频生成失败')
        pollingTasks.delete(audioId)
        return
      }
    } catch (error: any) {
      // 轮询失败
      messageList.value[messageIndex].content = `查询状态失败: ${error.message || '未知错误'}`
      messageList.value[messageIndex].isGenerating = false
      pollingTasks.delete(audioId)
    }
  }

  const timerId = window.setInterval(poll, interval)
  pollingTasks.set(audioId, { timerId, conversationId, startedAt: Date.now() })

  poll()
}

// 图片预览处理
const handleImagePreview = (imageUrl: string) => {
  previewItem.value = { picUrl: imageUrl }
  showImagePreview.value = true
}

// 功能列表
const features = ref([
  {
    icon: 'model',
    label: '模型'
  },
  {
    icon: 'voice',
    label: '语音输入'
  },
  {
    icon: 'plugins2',
    label: '插件'
  }
])

// 其他功能
const otherFeatures = computed(() => features.value.filter((item) => item.icon !== 'model'))

// 获取默认头像
const getDefaultAvatar = () => {
  return 'https://img1.baidu.com/it/u=3613958228,3522035000&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=500'
}

// 获取模型头像
const getModelAvatar = (model: any) => {
  if (!model) {
    return getDefaultAvatar()
  }

  if (model.avatar) {
    return model.avatar
  }

  // 根据模型名称生成默认头像
  const modelName = model.name || ''

  // 常见模型的默认头像映射
  const defaultAvatars: Record<string, string> = {
    'gpt-4': getDefaultAvatar()
  }

  // 检查模型名称是否包含关键词
  const lowerName = modelName.toLowerCase()
  for (const [key, avatar] of Object.entries(defaultAvatars)) {
    if (lowerName.includes(key)) {
      return avatar
    }
  }

  // 默认返回通用头像
  return getDefaultAvatar()
}

// 获取模型列表
const fetchModelList = async () => {
  modelLoading.value = true
  try {
    const data = await modelPage({
      pageNo: modelPagination.value.pageNo,
      pageSize: modelPagination.value.pageSize
    })

    modelList.value = data.list || []
    modelPagination.value.total = data.total || 0
  } catch (error) {
    console.error('获取模型列表失败:', error)
    window.$message.error('获取模型列表失败')
  } finally {
    modelLoading.value = false
  }
}

// 处理模型点击
const handleModelClick = () => {
  showModelPopover.value = !showModelPopover.value
  if (showModelPopover.value && modelList.value.length === 0) {
    fetchModelList()
  }
}

// 选择模型
const selectModel = async (model: any) => {
  selectedModel.value = model ? { ...model } : null
  showModelPopover.value = false

  // 如果切换到非图生视频模型，清空参考图片
  if (model && model.type !== 8) {
    clearVideoImage()
  }

  // 如果是音频模型，加载支持的声音列表
  if (model && model.type === 3) {
    await loadAudioVoices(model)
  }

  // 如果当前有会话，则调用后端API更新会话的模型
  if (currentChat.value.id && currentChat.value.id !== '0') {
    try {
      await conversationUpdateMy({
        id: currentChat.value.id,
        modelId: String(model.id)
      })
    } catch (error) {
      console.error('切换模型失败:', error)
      window.$message.destroyAll()
      window.$message.error('切换模型失败')
    }
  } else {
    window.$message.success(`已选择模型: ${model.name}`)
  }

  // 可以通过mitt通知其他组件模型已选择
  useMitt.emit('model-selected', model)
}

// 处理模型分页变化
const handleModelPageChange = (page: number) => {
  modelPagination.value.pageNo = page
  fetchModelList()
}

// 打开模型管理
const handleOpenModelManagement = () => {
  showModelPopover.value = false
  useMitt.emit('open-model-management')
}

// 加载角色列表
const loadRoleList = async () => {
  roleLoading.value = true
  try {
    const data = await chatRolePage({ pageNo: 1, pageSize: 100 })
    roleList.value = (data.list || []).filter((item: any) => item.status === 0) // 只显示可用的角色

    // 如果没有选中角色，默认选中第一个
    if (!selectedRole.value && roleList.value.length > 0) {
      selectedRole.value = roleList.value[0]
    }
  } catch (error) {
    console.error('加载角色列表失败:', error)
    window.$message.error('加载角色列表失败')
  } finally {
    roleLoading.value = false
  }
}

// 选择角色
const handleSelectRole = async (role: any) => {
  selectedRole.value = role ? { ...role } : null
  showRolePopover.value = false

  try {
    if (currentChat.value.id && currentChat.value.id !== '0') {
      await conversationUpdateMy({
        id: currentChat.value.id,
        roleId: role.id,
        modelId: role.modelId ? role.modelId : undefined
      })
    } else {
      // 如果没有会话，只选择角色，不创建会话
      window.$message.success(`已选择角色: ${role.name}`)
    }
  } catch (error) {
    console.error('切换角色失败:', error)
    window.$message.destroyAll()
    window.$message.error('切换角色失败')
  }
}

// 打开角色管理
const handleOpenRoleManagement = () => {
  showRolePopover.value = false
  useMitt.emit('open-role-management')
}

const handleBlur = async () => {
  isEdit.value = false
  if (originalTitle.value === currentChat.value.title) {
    return
  }
  if (currentChat.value.title === '') {
    currentChat.value.title = `新的聊天${currentChat.value.id}`
  }

  try {
    await conversationUpdateMy({
      id: currentChat.value.id,
      title: currentChat.value.title
    })

    useMitt.emit('update-chat-title', { title: currentChat.value.title, id: currentChat.value.id })
  } catch (error) {
    console.error('更新会话标题失败:', error)
    window.$message.error('重命名失败')
    currentChat.value.title = originalTitle.value
  }
}

const handleEdit = () => {
  originalTitle.value = currentChat.value.title
  isEdit.value = true
  nextTick(() => {
    inputInstRef.value?.select()
  })
}

// 加载会话的历史消息
const loadMessages = async (conversationId: string) => {
  if (!conversationId || conversationId === '0') {
    console.log('会话ID无效，跳过加载消息')
    return
  }

  try {
    loadingMessages.value = true
    const data = await messageListByConversationId({
      conversationId: conversationId,
      pageNo: 1,
      pageSize: 100
    })

    if (data && Array.isArray(data) && data.length > 0) {
      // 清空当前消息列表
      messageList.value = []

      // 限制消息数量，只保留最近的 MAX_MESSAGE_COUNT 条
      const limitedData = data.slice(-MAX_MESSAGE_COUNT)

      limitedData.forEach((msg: any) => {
        const nextMessage: Message = {
          type: msg.type,
          content: msg.content || '',
          reasoningContent: msg.reasoningContent, // 推理思考内容
          msgType: msg.msgType, // 消息内容类型枚举
          createTime: msg.createTime ?? Date.now(),
          id: msg.id,
          replyId: msg.replyId,
          model: msg.model
        }
        if (
          nextMessage.type === 'assistant' &&
          (nextMessage.msgType === undefined || nextMessage.msgType === null) &&
          isLikelyImageUrl(nextMessage.content)
        ) {
          nextMessage.msgType = AiMsgContentTypeEnum.IMAGE
        }
        if (nextMessage.msgType === AiMsgContentTypeEnum.IMAGE && isLikelyImageUrl(nextMessage.content)) {
          nextMessage.imageUrl = msg.imageUrl || nextMessage.content
        }
        messageList.value.push(nextMessage)
      })

      if (userStore.userInfo?.uid && currentChat.value.id) {
        void Promise.all(
          messageList.value.map((msg, index) => {
            if (msg.type !== 'assistant') return Promise.resolve()
            if (msg.msgType === AiMsgContentTypeEnum.IMAGE) {
              const remoteUrl = msg.imageUrl || msg.content
              return ensureLocalAiImage(remoteUrl, index)
            }
            if (msg.msgType === AiMsgContentTypeEnum.VIDEO) {
              const remoteUrl = msg.videoUrl || msg.content
              return ensureLocalAiVideo(remoteUrl, index)
            }
            if (msg.msgType === AiMsgContentTypeEnum.AUDIO) {
              const remoteUrl = msg.audioUrl || msg.content
              return ensureLocalAiAudio(remoteUrl, index)
            }
            return Promise.resolve()
          })
        )
      }

      nextTick(() => {
        scrollToBottom()
      })
      try {
        const conv = await conversationGetMy({ id: conversationId })
        if (conv && typeof conv.tokenUsage === 'number') {
          serverTokenUsage.value = conv.tokenUsage
        }
      } catch {}
    } else {
      messageList.value = []
    }
  } catch (error) {
    console.error('加载消息失败:', error)
    window.$message.error('加载消息失败')
    messageList.value = []
  } finally {
    loadingMessages.value = false
  }
}

// 新增会话
const handleCreateNewChat = async () => {
  try {
    const data = await conversationCreateMy({
      roleId: selectedRole.value?.id,
      knowledgeId: undefined,
      title: selectedRole.value?.name || '新的会话'
    })

    if (data) {
      window.$message.success('会话创建成功')

      // 直接通知左侧列表添加新会话，不需要刷新整个列表
      const rawCreateTime = Number(data.createTime)
      const newChat = {
        id: data.id || data,
        title: data.title || selectedRole.value?.name || '新的会话',
        createTime: Number.isFinite(rawCreateTime) ? rawCreateTime : Date.now(),
        messageCount: data.messageCount || 0,
        isPinned: data.pinned || false,
        roleId: selectedRole.value?.id,
        modelId: data.modelId
      }

      useMitt.emit('add-conversation', newChat)

      // 跳转到聊天页面
      serverTokenUsage.value = null
      messageList.value = []
      router.push('/chat')
    }
  } catch (error) {
    console.error('创建会话失败:', error)
    window.$message.error('创建会话失败')
  }
}

// 删除单条消息
const handleDeleteMessage = async (messageId: string, index: number) => {
  if (!messageId) {
    window.$message.warning('消息ID无效')
    return
  }

  try {
    await messageDelete({ id: messageId })

    // 从消息列表中移除
    messageList.value.splice(index, 1)
    window.$message.success('消息已删除')

    // 更新会话的消息数量
    currentChat.value.messageCount = Math.max((currentChat.value.messageCount || 0) - 1, 0)
    const latestEntry = messageList.value[messageList.value.length - 1]
    const latestTimestamp = latestEntry?.createTime ?? currentChat.value.createTime ?? Date.now()
    notifyConversationMetaChange({
      messageCount: currentChat.value.messageCount,
      createTime: latestTimestamp
    })
  } catch (error) {
    console.error('删除消息失败:', error)
    window.$message.error('删除消息失败')
  }
}

// 删除会话
const handleDeleteChat = async () => {
  if (!currentChat.value.id || currentChat.value.id === '0') {
    window.$message.warning('请先选择一个会话')
    showDeleteChatConfirm.value = false
    return
  }

  try {
    if (deleteWithMessages.value) {
      try {
        await messageDeleteByConversationId({ conversationIdList: [currentChat.value.id] })
      } catch (error) {
        console.error('删除会话消息失败:', error)
      }
    }

    // 删除会话
    await conversationDeleteMy({ conversationIdList: [currentChat.value.id] })
    window.$message.success(deleteWithMessages.value ? '会话及消息已删除' : '会话删除成功')

    // 关闭确认框
    showDeleteChatConfirm.value = false
    deleteWithMessages.value = false // 重置选项

    // 清空当前会话数据
    currentChat.value = {
      id: '0',
      title: '',
      messageCount: 0,
      createTime: 0
    }
    messageList.value = []
    serverTokenUsage.value = null

    // 先跳转到欢迎页、然后通知左侧列表刷新
    await router.push('/welcome')
    useMitt.emit('refresh-conversations')
  } catch (error) {
    console.error('删除会话失败:', error)
    window.$message.error('删除会话失败')
    showDeleteChatConfirm.value = false
  }
}

// 提前监听会话切换事件
useMitt.on('chat-active', async (e) => {
  const { title, id, messageCount, roleId, modelId, createTime } = e

  currentChat.value.title = title || `新的聊天${currentChat.value.id}`
  currentChat.value.id = id
  currentChat.value.messageCount = messageCount ?? 0
  currentChat.value.createTime = createTime ?? currentChat.value.createTime ?? Date.now()

  serverTokenUsage.value = null
  messageList.value = []

  if (modelList.value.length === 0) {
    await fetchModelList()
  }

  // 确保角色列表已加载
  if (roleList.value.length === 0) {
    await loadRoleList()
  }

  if (roleId) {
    const role = roleList.value.find((r: any) => String(r.id) === String(roleId))
    if (role) {
      selectedRole.value = role
    }
  }

  if (modelId) {
    const model = modelList.value.find((m: any) => String(m.id) === String(modelId))
    if (model) {
      selectedModel.value = model
      // 如果是音频模型，加载支持的声音列表
      if (model.type === 3) {
        await loadAudioVoices(model)
      }
    }
  }

  await loadMessages(id)
})

// 打开历史记录
const handleOpenHistory = () => {
  // 如果有选中的模型,根据模型类型显示对应历史
  if (selectedModel.value) {
    if (selectedModel.value.type === 2) {
      historyType.value = 'image'
    } else if (selectedModel.value.type === 3) {
      historyType.value = 'audio'
    } else if (selectedModel.value.type === 4 || selectedModel.value.type === 7 || selectedModel.value.type === 8) {
      historyType.value = 'video'
    } else {
      // 其他类型默认显示图片历史
      historyType.value = 'image'
    }
  } else {
    // 如果没有选中模型,默认显示图片历史
    historyType.value = 'image'
  }

  historyPagination.value.pageNo = 1
  showHistoryModal.value = true
  loadHistory()
}

// 加载历史记录
const loadHistory = async () => {
  historyLoading.value = true
  try {
    let apiFunc
    if (historyType.value === 'image') {
      apiFunc = imageMyPage
    } else if (historyType.value === 'audio') {
      apiFunc = audioMyPage
    } else {
      apiFunc = videoMyPage
    }

    const data = await apiFunc({
      pageNo: historyPagination.value.pageNo,
      pageSize: historyPagination.value.pageSize
    })
    historyList.value = data.list || []
    historyPagination.value.total = data.total || 0
  } catch (error) {
    console.error('加载历史记录失败:', error)
    window.$message.error('加载历史记录失败')
  } finally {
    historyLoading.value = false
  }
}

// 切换历史记录类型
const switchHistoryType = (type: 'image' | 'video' | 'audio') => {
  historyType.value = type
  historyPagination.value.pageNo = 1
  loadHistory()
}

// 历史记录分页变化
const handleHistoryPageChange = (page: number) => {
  historyPagination.value.pageNo = page
  loadHistory()
}

// 预览图片
const handlePreviewImage = (item: any) => {
  previewItem.value = item
  showImagePreview.value = true
}

// 预览视频
const handlePreviewVideo = (item: any) => {
  previewItem.value = item
  showVideoPreview.value = true
}

// 事件处理函数(定义在顶层作用域,以便在 onUnmounted 中移除)
const handleRefreshRoleList = () => {
  console.log('收到角色列表刷新事件')
  loadRoleList()
}

const handleRefreshModelList = async () => {
  await fetchModelList()

  // 如果当前有选中的模型，需要更新 selectedModel 对象
  if (selectedModel.value && selectedModel.value.id) {
    const updatedModel = modelList.value.find((m: any) => m.id === selectedModel.value.id)
    if (updatedModel) {
      // 记录旧的模型类型
      const oldType = selectedModel.value.type
      // 更新为新的模型对象
      selectedModel.value = { ...updatedModel }
      console.log('已更新 selectedModel:', selectedModel.value)

      // 如果模型类型从 8 改为其他类型，清空参考图片
      if (oldType === 8 && updatedModel.type !== 8) {
        clearVideoImage()
        console.log('模型类型已改变，已清空参考图片')
      }
    }
  }
}

const handleLeftChatTitle = (e: any) => {
  const { title, id, messageCount, createTime } = e
  if (id === currentChat.value.id) {
    currentChat.value.title = title ?? ''
    currentChat.value.messageCount = messageCount ?? 0
    currentChat.value.createTime = createTime ?? currentChat.value.createTime ?? Date.now()
  }
}

onMounted(async () => {
  // 等待模型列表加载完成
  if (modelList.value.length === 0) {
    await fetchModelList()
  }

  // 等待角色列表加载完成
  await loadRoleList()

  // 监听角色列表刷新事件
  useMitt.on('refresh-role-list', handleRefreshRoleList)

  // 监听模型列表刷新事件
  useMitt.on('refresh-model-list', handleRefreshModelList)

  // 监听打开生成历史事件
  useMitt.on('open-generation-history', handleOpenHistory)

  // 监听左侧聊天标题更新事件
  useMitt.on('left-chat-title', handleLeftChatTitle)
})

onUnmounted(() => {
  // 停止所有轮询任务
  stopAllPolling()

  useMitt.off('refresh-role-list', handleRefreshRoleList)
  useMitt.off('refresh-model-list', handleRefreshModelList)
  useMitt.off('open-generation-history', handleOpenHistory)
  useMitt.off('left-chat-title', handleLeftChatTitle)
})

// 监听会话切换，停止旧会话的轮询任务
watch(
  () => currentChat.value.id,
  (newId, oldId) => {
    if (oldId && oldId !== newId) {
      stopConversationPolling(oldId)
    }
  }
)
</script>

<style scoped lang="scss">
@use '@/styles/scss/render-message';
@use '@/styles/scss/chatBot/code-block';

/* 主容器布局 */
.chat-main-container {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

/* 左侧角色选择区域 */
.chat-role-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--line-color);
  background: var(--bg-color);

  .role-sidebar-header {
    padding: 16px;
    border-bottom: 1px solid var(--line-color);
  }

  .role-sidebar-content {
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  }
}

/* 右侧聊天区域 */
.chat-content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部区域 */
.chat-header {
  flex-shrink: 0;
  min-height: 60px;
  max-height: 80px;
}

/* 聊天消息区域 */
.chat-messages-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.link-node),
  :deep(.footnote-link) {
    --link-color: #13987f;
    color: #13987f;
  }
}

/* 原生滚动条样式与交互 */
.scrollbar-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  will-change: scroll-position;
  transform: translateZ(0);

  &::-webkit-scrollbar {
    width: 6px;
    transition: opacity 0.3s ease;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(144, 144, 144, 0.3);
    border-radius: 3px;
    transition:
      opacity 0.3s ease,
      background-color 0.3s ease;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(144, 144, 144, 0.5);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &.hide-scrollbar {
    &::-webkit-scrollbar,
    &::-webkit-scrollbar-thumb,
    &::-webkit-scrollbar-track {
      background: transparent;
    }

    padding-right: 0.01px;
  }
}

/* 输入框容器固定在底部 */
.chat-input-container {
  flex-shrink: 0;
  background: var(--bg-color);
}

.right-btn {
  @apply size-fit border-(1px solid [--line-color]) cursor-pointer bg-[--chat-bt-color] color-[--chat-text-color] rounded-8px custom-shadow p-[10px_11px];
  transition: all 0.2s ease;
  svg {
    @apply size-18px;
  }

  // &:hover {
  //   @apply bg-[--chat-hover-color];
  // }

  &.right-btn-disabled {
    @apply opacity-50 cursor-not-allowed;
    &:hover {
      @apply bg-[--chat-bt-color];
    }
  }
}

.options {
  padding-left: 4px;
  svg {
    @apply size-22px cursor-pointer outline-none;
  }
}

/* AI 消息气泡样式 */
.bubble-ai {
  display: flex;
  flex-direction: column;
  width: fit-content;
  max-width: 80%;
  line-height: 2;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    font-size: 18px;
    line-height: 1.6;
  }
}

/* 模型选择器样式 */
.model-selector {
  background: var(--chat-bt-color);
  border-radius: 8px;
  padding: 12px;
  max-height: 400px;
  display: flex;
  flex-direction: column;

  .model-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .model-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--chat-text-color);
    }
  }

  .model-list {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 12px;

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;

      .loading-text {
        margin-left: 8px;
        font-size: 12px;
        color: #909090;
      }
    }

    .empty-container {
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .models-container {
      .model-section-title {
        font-size: 12px;
        color: #707070;
        padding: 4px 8px;
      }
      .model-divider {
        height: 1px;
        background: var(--line-color);
        margin: 6px 0;
      }
      .model-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 4px;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
          background: var(--chat-hover-color);
        }

        &.model-item-active {
          border-color: #13987f;
          background: rgba(19, 152, 127, 0.1);
        }

        .model-info {
          flex: 1;
          margin-left: 12px;

          .model-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--chat-text-color);
            margin-bottom: 2px;
          }

          .model-description {
            font-size: 11px;
            color: #909090;
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .model-meta {
            display: flex;
            gap: 8px;

            .model-provider,
            .model-version {
              font-size: 10px;
              color: #707070;
              background: rgba(0, 0, 0, 0.05);
              padding: 1px 4px;
              border-radius: 3px;
            }
          }
        }

        .model-status {
          margin-left: 8px;
        }
      }
    }
  }

  .model-pagination {
    display: flex;
    justify-content: center;
    padding-top: 8px;
    border-top: 1px solid var(--line-color);
  }
}

/* 角色选择器样式 */
.role-selector {
  background: var(--chat-bt-color);
  border-radius: 8px;
  padding: 12px;
  max-height: 400px;
  display: flex;
  flex-direction: column;

  .role-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .role-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--chat-text-color);
    }
  }

  .role-list {
    flex: 1;
    overflow-y: auto;

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;

      .loading-text {
        margin-left: 8px;
        font-size: 12px;
        color: #909090;
      }
    }

    .empty-container {
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .roles-container {
      .role-item {
        display: flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        margin-bottom: 4px;
        transition: all 0.2s ease;
        border: 1px solid transparent;
        gap: 12px;

        &:hover {
          background: var(--chat-hover-color);
        }

        &.active {
          border-color: #13987f;
          background: rgba(19, 152, 127, 0.1);
        }

        .role-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--chat-text-color);
        }

        .role-desc {
          font-size: 11px;
          color: #909090;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }
}

:deep(.paragraph-node) {
  margin: 0.5rem 0;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.history-item {
  border: 1px solid var(--line-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.history-wrapper {
  display: flex;
  flex-direction: column;
}

.media-preview {
  width: 100%;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  cursor: pointer;
  position: relative;

  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-preview {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .preview-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    &.error {
      background: #fff1f0;
    }
  }
}

.history-info {
  padding: 12px;

  .prompt {
    font-size: 13px;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
}

.preview-container {
  .preview-image,
  .preview-video {
    width: 100%;
    max-height: 70vh;
    object-fit: contain;
    border-radius: 8px;
  }

  .preview-info {
    padding: 16px;
    background: var(--bg-color);
    border-radius: 8px;
  }
}
</style>
