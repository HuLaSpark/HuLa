<template>
  <div class="flex-center cursor-default gap-12px text-12px color-#909090">
    <span class="h-px w-60px bg-#dadada dark:bg-#3a3a3a"></span>
    <span>{{ thirdPartyLabel }}</span>
    <span class="h-px w-60px bg-#dadada dark:bg-#3a3a3a"></span>
  </div>
  <div class="flex-x-center gap-28px mt-16px">
    <div
      v-for="item in thirdPartyOptions"
      :key="item.key"
      :title="item.label"
      :aria-label="item.label"
      :disabled="thirdPartyDisabled"
      @click="item.action()">
      <svg :class="item.style" class="size-22px cursor-pointer">
        <use :href="item.icon"></use>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLogin } from '@/hooks/useLogin'

export type ThirdPartyLoginContext = Pick<
  ReturnType<typeof useLogin>,
  'giteeLogin' | 'githubLogin' | 'gitcodeLogin' | 'loading' | 'loginDisabled'
>

const props = withDefaults(
  defineProps<{
    extraDisabled?: boolean
    loginContext?: ThirdPartyLoginContext
  }>(),
  {
    extraDisabled: false
  }
)

const { t } = useI18n()

const defaultContext = useLogin()
const resolvedContext = props.loginContext ? { ...defaultContext, ...props.loginContext } : defaultContext

const thirdPartyLabel = computed(() => t('login.third_party.title'))
const thirdPartyOptions = computed(() => [
  {
    key: 'gitee',
    label: t('login.third_party.gitee'),
    icon: '#gitee-login',
    style: 'color-#d5304f dark:color-#d5304f80',
    action: resolvedContext.giteeLogin
  },
  {
    key: 'github',
    label: t('login.third_party.github'),
    icon: '#github-login',
    style: 'color-#303030 dark:color-#fefefe90',
    action: resolvedContext.githubLogin
  },
  {
    key: 'gitcode',
    label: t('login.third_party.gitcode'),
    icon: '#gitcode-login',
    style: 'color-#d5304f dark:color-#d5304f80',
    action: resolvedContext.gitcodeLogin
  }
])

const thirdPartyDisabled = computed(
  () => resolvedContext.loading.value || resolvedContext.loginDisabled.value || props.extraDisabled
)
</script>
