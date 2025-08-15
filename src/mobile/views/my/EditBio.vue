<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="编辑个人简介" />
    </template>

    <template #container="{ height }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: height + 'px' }" class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px">
          <n-form class="bg-white rounded-15px p-10px shadow" label-placement="left" label-width="100px">
            <n-form-item>
              <n-input
                v-model:value="noticeTitle"
                type="textarea"
                placeholder="介绍一下你自己~"
                class="w-full"
                :autosize="{ minRows: 5, maxRows: 20 }"
                :maxlength="300"
                :show-count="true" />
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
              保存
            </div>
          </div>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
const noticeTitle = ref(
  `这是一个简介这是一个简介这是一个
  简介这是一个简介这是一个简介这是
  一个简介这是一个简介这是一个简介这是一个简介这是一个简
  介这是一个简介这是一个简介这是一个简介这是一个简介这是一
  个简介这是一个简介这是一个简介这是一个简
  介这是一个简介这是一个简介这是一个简介这是一
  个简介这是一个简介这是一个简介`
)
</script>

<style lang="scss" scoped>
@use '@/styles/scss/form-item.scss';
</style>
