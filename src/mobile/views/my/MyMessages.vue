<template>
  <AutoFixHeightPage :show-footer="false">
    <template #header>
      <HeaderBar :isOfficial="false" border :hidden-right="true" :room-name="t('mobile_mymessage.title')" />
    </template>

    <template #container>
      <div class="flex flex-col overflow-auto h-full relative">
        <div class="flex flex-col p-[10px_20px_0px_20px] gap-20px">
          <CommunityTab @update="onUpdate" :options="tabOptions" active-tab-name="friend-message">
            <template #friend-message>
              <MobileApplyList :close-header="true" type="friend" />
            </template>

            <template #group-message>
              <MobileApplyList :close-header="true" type="group" />
            </template>
          </CommunityTab>
        </div>
      </div>
    </template>
  </AutoFixHeightPage>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const onUpdate = (newTab: string) => {
  console.log('已更新：', newTab)
}

const tabOptions = reactive([
  {
    tab: t('mobile_mymessage.tab.friend_messages'),
    name: 'friend-message'
  },
  {
    tab: t('mobile_mymessage.tab.group_messages'),
    name: 'group-message'
  }
])
</script>

<style scoped></style>
