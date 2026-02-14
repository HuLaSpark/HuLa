<template>
  <NDrawer
    v-model:show="showModel"
    class="rounded-t-20px! overflow-hidden"
    position="bottom"
    round
    placement="bottom"
    default-height="300px">
    <VantArea :area-list="areaList" @cancel="onCancel" @change="onChange" @confirm="onConfirm" v-model="valueModel">
      <!-- TODO: @scroll-into="onScrollInto" 触发iOS震动 -->
      <template #cancel>
        <n-button strong secondary round>
          {{ t('components.common.cancel') }}
        </n-button>
      </template>

      <template #confirm>
        <n-button strong secondary round type="success">
          {{ t('components.common.confirm') }}
        </n-button>
      </template>
    </VantArea>
    <!-- <Picker :columns="columns" :columns-field-names="{
      text: 'cityName',
      value: 'cityName',
      children: 'cities',
    }" @scroll-into="console.log" /> -->
  </NDrawer>
</template>

<script setup lang="ts">
import { areaList as list } from '@vant/area-data'
import { NDrawer } from 'naive-ui'
// The exported props from vant cannot be used with defineProps.
import { AreaList, Area as VantArea } from 'vant'
import { useI18n } from 'vue-i18n'

interface AreaProps {
  areaList?: AreaList
}

interface Events {
  onChange?: ((...args: any[]) => any) | undefined
  'onUpdate:modelValue'?: ((...args: any[]) => any) | undefined
  onCancel?: ((...args: any[]) => any) | undefined
  onConfirm?: ((...args: any[]) => any) | undefined
}

type Props = AreaProps & Events

const showModel = defineModel<boolean>('show')
const valueModel = defineModel<string>('value')

const { areaList = list } = defineProps<Props>()

const { t } = useI18n()
</script>
