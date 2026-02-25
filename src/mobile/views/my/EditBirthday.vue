<template>
  <MobileScaffold :show-footer="false">
    <template #header>
      <HeaderBar :isOfficial="false" border :hidden-right="true" :room-name="t('mobile_edit_brithday.title')" />
    </template>

    <template #container>
      <div class="flex flex-col overflow-auto h-full">
        <div class="flex flex-col flex-1 gap-20px py-15px px-20px">
          <n-date-picker panel type="date" block class="m-auto rounded-16px" />

          <n-list class="px-15px flex flex-col w-full box-border rounded-16px">
            <n-list-item>
              <div class="flex w-full justify-between items-center">
                <n-text class="text-14px shrink-0">{{ t('mobile_edit_brithday.options.display_birthday_tag') }}</n-text>
                <n-switch class="shrink-0" />
              </div>
            </n-list-item>
          </n-list>

          <n-list class="px-15px flex flex-col w-full box-border rounded-10px">
            <n-list-item>
              <div class="flex w-full justify-between items-center">
                <n-text class="text-14px shrink-0">{{ t('mobile_edit_brithday.options.displsy_age') }}</n-text>
                <n-switch class="shrink-0" />
              </div>
            </n-list-item>

            <n-divider class="m-0! p-0!" />
            <n-list-item>
              <div class="flex w-full justify-between items-center">
                <n-text class="text-14px shrink-0">
                  {{ t('mobile_edit_brithday.options.display_constellation') }}
                </n-text>
                <n-switch class="shrink-0" />
              </div>
            </n-list-item>
          </n-list>

          <div class="flex justify-center mt-20px">
            <n-button strong secondary round type="primary" block>
              {{ t('mobile_edit_brithday.save_btn') }}
            </n-button>
          </div>
        </div>
      </div>
    </template>
  </MobileScaffold>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style lang="scss" scoped></style>
