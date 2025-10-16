<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="编辑群公告" />
    </template>

    <template>
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px">
          <n-form class="bg-white rounded-15px p-10px shadow" label-placement="left" label-width="100px">
            <n-form-item>
              <n-input
                v-model:value="noticeTitle"
                type="textarea"
                placeholder="请输入公告标题"
                class="w-full"
                :autosize="{ minRows: 5, maxRows: 10 }"
                :maxlength="1000"
                :show-count="true" />
            </n-form-item>

            <n-form-item>
              <n-upload
                class="w-full h-84px"
                action="https://www.mocky.io/v2/5e4bafc63100007100d8b70f"
                :default-file-list="fileList"
                list-type="image-card">
                点击上传
              </n-upload>
            </n-form-item>
          </n-form>

          <n-form class="bg-white flex flex-col rounded-15px shadow">
            <div class="flex bg-white rounded-10px w-full h-auto shadow">
              <div class="px-15px flex flex-col w-full">
                <!-- 群号 -->
                <div
                  style="border-bottom: 1px solid; border-color: #ebebeb"
                  class="flex justify-between py-12px items-center">
                  <div class="text-14px">使用弹窗显示公告</div>
                  <n-switch v-model:value="active1" />
                </div>
                <div
                  style="border-bottom: 1px solid; border-color: #ebebeb"
                  class="flex justify-between py-12px items-center">
                  <div class="text-14px">需群成员确认收到</div>
                  <n-switch v-model:value="active2" />
                </div>

                <div
                  style="border-bottom: 1px solid; border-color: #ebebeb"
                  class="flex justify-between py-12px items-center">
                  <div class="text-14px">设为置顶</div>
                  <n-switch v-model:value="active2" />
                </div>
              </div>
            </div>
          </n-form>

          <div class="flex justify-center">
            <div
              class="w-20%"
              style="
                background: linear-gradient(145deg, #7eb7ac, #6fb0a4, #5fa89c);
                border-radius: 30px;
                padding: 10px 30px;
                color: white;
                font-weight: 500;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                text-align: center;
                display: inline-block;
              ">
              确定
            </div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'

defineOptions({
  name: 'mobileChatNoticeEdit'
})

const noticeTitle = ref('')

const active1 = ref(false)
const active2 = ref(false)

const fileList = ref<UploadFileInfo[]>([
  {
    id: 'c',
    name: '我是自带url的图片.png',
    status: 'finished',
    url: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
  }
])
</script>

<style scoped></style>
