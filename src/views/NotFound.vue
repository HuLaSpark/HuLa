<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="message">页面不存在或已被移除</p>
    <button class="back" @click="goHome">返回首页</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
const goHome = () => router.replace('/')
</script>

<style scoped>
.not-found {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-color);
  background: var(--bg-popover);
}

.code {
  font-size: 72px;
  font-weight: 700;
  line-height: 1;
  color: #13987f;
}

.message {
  margin: 0;
  font-size: 14px;
  opacity: 0.7;
}

.back {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #13987f;
  color: #fff;
  cursor: pointer;
}

.back:hover {
  background: #17a98d;
}
</style>
