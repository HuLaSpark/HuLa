<template>
  <NaiveProvider :message-max="3" :notific-max="3">
    <div id="app">
      <router-view />
      <!--      <div class="container" style="transform: scale(1.1)">-->
      <!--        <ContextMenu-->
      <!--          class="block"-->
      <!--          :menu="[{ label: '添加' }, { label: '编辑' }, { label: '删除' }, { label: '查看' }, { label: '复制' }]"-->
      <!--          @select="choose1 = $event.label">-->
      <!--          <h2>{{ choose1 }}</h2>-->
      <!--        </ContextMenu>-->
      <!--        <ContextMenu-->
      <!--          class="block"-->
      <!--          :menu="[{ label: '员工' }, { label: '部门' }, { label: '角色' }, { label: '权限' }, { label: '菜单' }]"-->
      <!--          @select="choose2 = $event.label">-->
      <!--          <h2>{{ choose2 }}</h2>-->
      <!--          <ContextMenu-->
      <!--            class="block"-->
      <!--            :menu="[{ label: '菜单1' }, { label: '菜单2' }, { label: '菜单3' }, { label: '菜单4' }]"-->
      <!--            @select="choose3 = $event.label">-->
      <!--            <h2>{{ choose3 }}</h2>-->
      <!--          </ContextMenu>-->
      <!--        </ContextMenu>-->
      <!--      </div>-->
    </div>
  </NaiveProvider>
</template>
<script setup lang="ts">
import { theme } from '@/stores/theme.ts'
import { storeToRefs } from 'pinia'

// const choose1 = ref('')
// const choose2 = ref('')
// const choose3 = ref('')
const themeStore = theme()
const { BGC } = storeToRefs(themeStore)

onMounted(() => {
  // window.addEventListener('contextmenu', (e) => e.preventDefault(), false)
})

onUnmounted(() => {
  window.removeEventListener('contextmenu', (e) => e.preventDefault(), false)
})
</script>
<style scoped>
#app {
  min-height: 100vh;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  position: fixed;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  transition: all 0.9s ease;
  background-color: v-bind(BGC);
  border-radius: 10px;
}
.container {
  display: grid;
  height: 100vh;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
}
.block {
  background-color: #ccc;
  margin: 10px;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding-top: 20px;
  color: #fff;
}
.block:nth-child(1) {
  background: #dcabaf;
}
.block:nth-child(2) {
  background: #6f8874;
}
.block .block {
  background: #415a46;
  margin-top: 20vh;
  height: 20vh;
  width: 80%;
}
.block h2 {
  font-size: 1.2em;
}
</style>
