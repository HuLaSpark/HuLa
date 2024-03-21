<template>
  <!-- 好友详情 -->
  <div v-if="item.type === RoomTypeEnum.SINGLE" class="flex flex-col items-center mt-60px gap-30px select-none">
    <n-image width="146px" height="146px" class="rounded-50%" :src="item.avatar" alt="" />

    <span class="text-20px">{{ item.accountName }}</span>

    <span class="text-14px color-#909090">这个人很高冷,暂时没有留下什么</span>

    <n-flex align="center" justify="space-between" :size="30" class="color-#606060">
      <span>性别：男</span>
      <span>电话：13213213213</span>
    </n-flex>
    <!-- 选项按钮 -->
    <n-flex align="center" justify="space-between" :size="60">
      <n-icon-wrapper
        v-for="(item, index) in footerOptions"
        :key="index"
        @click="() => item.click()"
        class="cursor-pointer"
        :size="28"
        :border-radius="10"
        :color="'rgba(5, 150, 105, 0.8)'">
        <n-icon :size="20">
          <svg><use :href="item.url"></use></svg>
        </n-icon>
      </n-icon-wrapper>
    </n-flex>
  </div>

  <!-- 群聊详情 -->
  <div v-else class="flex flex-col flex-1 mt-60px gap-30px select-none p-[0_40px] box-border">
    <!-- 群聊头像以及简介 -->
    <n-flex align="center" justify="space-between">
      <n-flex align="center">
        <n-image width="120px" height="120px" class="rounded-50%" :src="item.avatar" alt="" />

        <n-flex vertical :size="16" justify="space-between" class="text-14px color-#909090">
          <span class="text-16px color-[--text-color]">{{ item.accountName }}</span>
          <span>群号：1235873897182</span>
          <span>创建时间：2021-01-01</span>
        </n-flex>
      </n-flex>

      <n-icon-wrapper class="cursor-pointer" :size="40" :border-radius="10" :color="'rgba(5, 150, 105, 0.8)'">
        <n-icon :size="22">
          <svg><use href="#message"></use></svg>
        </n-icon>
      </n-icon-wrapper>
    </n-flex>

    <n-flex vertical :size="20">
      <span>群成员：({{ options.length }}人)</span>

      <n-avatar-group :options="options" :size="40" :max="4">
        <template #avatar="{ option: { name, src } }">
          <n-tooltip>
            <template #trigger>
              <n-avatar :src="src" />
            </template>
            {{ name }}
          </n-tooltip>
        </template>
        <template #rest="{ options: restOptions, rest }">
          <n-dropdown :options="createDropdownOptions(restOptions)" placement="top">
            <n-avatar :color="'#52aea3'">+{{ rest }}</n-avatar>
          </n-dropdown>
        </template>
      </n-avatar-group>
    </n-flex>
  </div>
</template>
<script setup lang="ts">
import { MockItem } from '@/services/types.ts'
import { RoomTypeEnum } from '@/enums'

const props = defineProps<{
  content: any[]
}>()
const { content } = toRefs(props)
const item = computed<MockItem>(() => {
  return content.value[0]
})

type FooterOption = {
  url: string
  click: (...args: any[]) => void
}
const footerOptions = ref<FooterOption[]>([
  {
    url: '#message',
    click: () => {
      console.log(123)
    }
  },
  {
    url: '#phone-telephone',
    click: () => {
      console.log(123)
    }
  },
  {
    url: '#video-one',
    click: () => {
      console.log(123)
    }
  }
])
const options = [
  {
    name: '张三',
    src: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
  },
  {
    name: '李四',
    src: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
  },
  {
    name: '王五',
    src: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
  },
  {
    name: '赵六',
    src: 'https://07akioni.oss-cn-beijing.aliyuncs.com/07akioni.jpeg'
  },
  {
    name: '七仔',
    src: 'https://gw.alipayobjects.com/zos/antfincdn/aPkFc8Sj7n/method-draw-image.svg'
  }
]

const createDropdownOptions = (options: Array<{ name: string; src: string }>) => {
  return options.map((option) => ({
    key: option.name,
    label: option.name
  }))
}
</script>

<style scoped></style>
