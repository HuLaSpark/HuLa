<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar
        :isOfficial="false"
        class="bg-white"
        style="border-bottom: 1px solid; border-color: #dfdfdf"
        :hidden-right="true"
        room-name="我的消息" />
    </template>

    <template #container="{ height }">
      <div :style="{ height: height + 'px' }" class="z-2 flex flex-col absolute overflow-auto min-h-70vh w-full">
        <div class="flex flex-col p-[10px_20px_0px_20px] gap-20px">
          <CommunityTab
            :customHeight="height - 55"
            @update="onUpdate"
            :options="tabOptions"
            active-tab-name="friend-message">
            <template #friend-message>
              <MobileApplyList :close-header="true" type="friend" :custom-height="height - 50" />
            </template>

            <template #group-message>
              <MobileApplyList :close-header="true" type="group" :custom-height="height - 50" />
            </template>
          </CommunityTab>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
const onUpdate = (newTab: string) => {
  console.log('已更新：', newTab)
}

const tabOptions = reactive([
  {
    tab: '好友消息',
    name: 'friend-message'
  },
  {
    tab: '群聊消息',
    name: 'group-message'
  }
])
</script>

<style scoped></style>
