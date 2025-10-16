<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="发布新动态" />
    </template>

    <template>
      <div class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px">
          <n-form class="bg-white rounded-15px p-10px" label-placement="left" label-width="100px">
            <n-form-item>
              <n-input
                v-model:value="noticeTitle"
                type="textarea"
                placeholder="尽情分享生活吧~😎"
                class="w-full"
                :autosize="{ minRows: 5, maxRows: 10 }"
                :maxlength="3000"
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
              发布
            </div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import type { UploadFileInfo } from 'naive-ui'

const noticeTitle = ref('')

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
