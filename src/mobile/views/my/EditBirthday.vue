<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="编辑生日" />
    </template>

    <template #container="{ height }">
      <img src="@/assets/mobile/chat-home/background.webp" class="w-100% relative top-0 z-1" alt="hula" />
      <div :style="{ height: height + 'px' }" class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-20px gap-20px">
          <div class="flex justify-center w-full bg-white rounded-10px shadow">
            <n-date-picker panel type="date" />
          </div>

          <div class="flex bg-white rounded-10px w-full h-auto shadow">
            <div class="px-15px flex flex-col w-full">
              <!-- 群号 -->
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">展示生日标签</div>
                <n-switch />
              </div>
            </div>
          </div>

          <div class="flex bg-white rounded-10px w-full h-auto shadow">
            <div class="px-15px flex flex-col w-full">
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">展示年龄</div>
                <n-switch />
              </div>
              <div
                style="border-bottom: 1px solid; border-color: #ebebeb"
                class="flex justify-between py-12px items-center">
                <div class="text-14px">展示星座</div>
                <n-switch />
              </div>
            </div>
          </div>

          <div class="flex justify-center mt-20px">
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

<script setup lang="ts"></script>

<style lang="scss" scoped></style>
