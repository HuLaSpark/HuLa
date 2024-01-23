<template>
  <n-tabs type="segment" animated>
    <n-tab-pane name="1" tab="好友">
      <n-collapse display-directive="show">
        <n-collapse-item title="我的设备" name="1">
          <template #header-extra>
            <p class="font-size-10px color-#707070">1/1</p>
          </template>
          <div>可以</div>
        </n-collapse-item>
        <n-collapse-item title="特别关心" name="2">
          <template #header-extra>
            <p class="font-size-10px color-#707070">1/1</p>
          </template>

          <!-- 用户框 -->
          <div class="msg-box w-full h-75px mb-5px" v-for="n in 20" :key="n">
            <div class="flex items-center h-full pl-6px pr-8px gap-10px">
              <img class="w-44px h-44px rounded-50% bg-#fff" style="border: 1px solid #f1f1f1" src="/logo.png" alt="" />

              <div class="w-full h-38px flex flex-col justify-between">
                <span class="font-size-14px">宝贝🍓</span>

                <p
                  class="w-135px font-size-12px color-#808080"
                  style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                  说的很经典哈萨克的哈萨克看到贺卡上
                </p>
              </div>
            </div>
          </div>
        </n-collapse-item>
        <n-collapse-item title="默认分组" name="3">
          <div>真棒</div>
          <template #header-extra>
            <p class="font-size-10px color-#707070">1/1</p>
          </template>
        </n-collapse-item>
      </n-collapse>
    </n-tab-pane>
    <n-tab-pane name="2" tab="群聊">
      <n-collapse>
        <n-collapse-item title="青铜" name="1">
          <div>可以</div>
        </n-collapse-item>
        <n-collapse-item title="白银" name="2">
          <div>很好</div>
        </n-collapse-item>
        <n-collapse-item title="黄金" name="3">
          <div>真棒</div>
        </n-collapse-item>
      </n-collapse>
    </n-tab-pane>
  </n-tabs>
</template>
<script setup lang="ts"></script>

<style scoped>
:deep(.n-collapse .n-collapse-item:not(:first-child)) {
  border: none;
}
:deep(.n-collapse .n-collapse-item) {
  margin: 6px 0 0;
}
</style>
