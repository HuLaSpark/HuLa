<template>
  <div class="p-[0_20px]">
    <div
      class="sponsor-card group relative overflow-hidden rounded-10px border-(solid 1px [--line-color]) custom-shadow"
      role="link"
      tabindex="0"
      @click="openSponsorLink"
      @keydown.enter.prevent="openSponsorLink"
      @keydown.space.prevent="openSponsorLink">
      <!-- 左侧品牌渐变装饰线 -->
      <div class="absolute inset-y-0 left-0 w-3px bg-gradient-to-b from-#38BDF8 to-#13987F"></div>

      <div class="flex items-start justify-between gap-20px p-[16px_18px_14px_20px]">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-8px">
            <span class="sponsored-badge">Sponsored</span>
            <span class="text-(11px #909090)">{{ copy.kicker }}</span>
          </div>

          <p class="mt-8px text-(15px [--chat-text-color]) font-600">{{ copy.title }}</p>
          <p class="mt-4px text-(12px #909090) leading-18px">{{ copy.description }}</p>
          <p class="mt-6px text-(11px #a3a3a3) leading-16px">{{ copy.note }}</p>
        </div>

        <div
          class="sponsor-cta flex shrink-0 items-center gap-6px rounded-8px px-12px py-7px text-(12px #fff) font-500">
          <span>{{ copy.action }}</span>
          <svg class="size-12px"><use href="#arrow-right"></use></svg>
        </div>
      </div>

      <div class="mx-[18px] flex items-center gap-6px border-t-(1px solid [--line-color]) py-[9px] text-(11px #909090)">
        <svg class="size-12px shrink-0 opacity-70"><use href="#share"></use></svg>
        <span class="truncate" :title="sponsorLink">{{ displayLink }}</span>
        <svg class="size-11px shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-2px">
          <use href="#arrow-right"></use>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { openExternalUrl } from '@/hooks/useLinkSegments'

const sponsorLink = 'https://infistar.cc/register?aff=R5GA55AM&ref_source=link'
const displayLink = sponsorLink.replace(/^https?:\/\//, '')

const sponsorCopy = {
  zh: {
    kicker: 'AI 聊天推荐',
    title: 'Infistar.cc',
    description: '一个 Key 用 Claude、GPT、Gemini 等模型，注册领人民币 5 元',
    note: '仅推荐，不会自动写入模型或 API 配置',
    action: '领取 5 元'
  },
  en: {
    kicker: 'AI Chat Recommendation',
    title: 'Infistar.cc',
    description: 'Use Claude, GPT, Gemini & more with one key. Sign up for CNY 5 in credit',
    note: 'Recommendation only. No model or API configuration is applied.',
    action: 'Get CNY 5'
  }
}

const { locale } = useI18n()
const copy = computed(() => (locale.value.toLowerCase().startsWith('en') ? sponsorCopy.en : sponsorCopy.zh))

const openSponsorLink = () => {
  openExternalUrl(sponsorLink)
}
</script>

<style scoped lang="scss">
.sponsor-card {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.08), transparent 55%),
    radial-gradient(120% 140% at 0% 100%, rgba(19, 152, 127, 0.1), transparent 55%), var(--bg-setting-item);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: rgba(19, 152, 127, 0.45);
  }

  &:focus-visible {
    outline: 2px solid #13987f;
    outline-offset: 2px;
  }
}

.sponsored-badge {
  @apply rounded-4px px-6px py-2px text-11px font-600 tracking-wide;
  color: #13987f;
  background: rgba(19, 152, 127, 0.12);
}

:global(html[data-theme='dark']) .sponsored-badge {
  color: #5eead4;
  background: rgba(19, 152, 127, 0.22);
}

.sponsor-cta {
  background: linear-gradient(135deg, #38bdf8 0%, #13987f 100%);
  box-shadow: 0 4px 12px rgba(19, 152, 127, 0.22);
  transition: filter 0.2s ease;
}

.sponsor-card:hover .sponsor-cta {
  filter: brightness(1.06);
}
</style>
