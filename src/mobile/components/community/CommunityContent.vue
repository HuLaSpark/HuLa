<template>
  <div class="flex flex-col gap-4">
    <!-- 头像数据 -->
    <div class="grid grid-cols-[38px_1fr] items-start gap-1">
      <!-- 头像：单独居中 -->
      <div class="self-center h-38px">
        <n-avatar :size="40" src="#" fallback-src="/logo.png" round />
      </div>

      <!-- 中间：两行内容 -->
      <div class="truncate pl-4 flex gap-10px flex-col">
        <div class="text-14px leading-tight font-bold flex-1 truncate text-#333 truncate">用户1</div>
        <div class="text-12px text-#333 truncate">发布于：2025-01-01 南京市</div>
      </div>
    </div>
    <!-- 动态内容 -->
    <div class="grid grid-cols-[38px_1fr] items-start gap-1">
      <!-- 留空 -->
      <div></div>
      <div class="flex flex-col gap-2">
        <div>床前明月光，疑是地上霜。 举头望明月，低头思故乡。</div>
        <div class="grid grid-cols-[1fr_1fr_1fr] gap-2">
          <div class="relative w-full aspect-square bg-pink rounded-10px mask-rounded">
            <!-- 关键修改在这里 -->
            <img
              src="https://ts1.tc.mm.bing.net/th/id/R-C.f40ba86561918519b95431a5921e4f5d?rik=9AIbo9AhOYel0w&riu=http%3a%2f%2fwww.quazero.com%2fuploads%2fallimg%2f131210%2f1-131210210248.jpg&ehk=v81JiWKphT%2baLBzbhrxRkTUUwwnhJ5F2PFkm4xn4nEM%3d&risl=&pid=ImgRaw&r=0"
              class="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div class="bg-pink relative w-full aspect-square rounded-10px mask-rounded">
            <img
              src="https://img-baofun.zhhainiao.com/pcwallpaper_ugc/static/705b5a8db5ffef241846340e11f1c9fd.jpg?x-oss-process=image%2fresize%2cm_lfit%2cw_3840%2ch_2160"
              class="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div class="bg-pink relative w-full aspect-square rounded-10px mask-rounded">
            <img
              src="https://img.shetu66.com/2023/06/27/1687846677099296.png"
              class="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped></style>
