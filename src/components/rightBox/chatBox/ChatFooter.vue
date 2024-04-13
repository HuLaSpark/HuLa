<template>
  <!-- 底部栏 -->
  <main
    class="size-full relative z-10 bg-[--right-bg-color] color-[--icon-color]"
    style="box-shadow: 0 -4px 4px var(--box-shadow-color)">
    <!-- 输入框顶部选项栏 -->
    <n-flex align="center" justify="space-between" class="p-[10px_22px_5px] select-none">
      <n-flex align="center" :size="0" class="input-options">
        <!-- emoji表情 -->
        <n-popover
          v-model:show="emojiShow"
          trigger="click"
          :show-arrow="false"
          placement="top-start"
          style="
            padding: 0;
            background: var(--bg-emoji);
            backdrop-filter: blur(10px);
            box-shadow: 2px 2px 12px 2px var(--box-shadow-color);
            border: 1px solid var(--box-shadow-color);
          ">
          <template #trigger>
            <n-popover trigger="hover" :show-arrow="false" placement="bottom">
              <template #trigger>
                <svg class="mr-18px"><use href="#smiling-face"></use></svg>
              </template>
              <span>表情</span>
            </n-popover>
          </template>
          <Emoji @emojiHandle="emojiHandle" :all="false" />
        </n-popover>

        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <div class="flex-center gap-2px mr-12px">
              <svg><use href="#screenshot"></use></svg>
              <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
            </div>
          </template>
          <span>截图</span>
        </n-popover>
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <div class="flex-center gap-2px mr-12px">
              <svg @click="open()"><use href="#file2"></use></svg>
              <svg style="width: 14px; height: 14px"><use href="#down"></use></svg>
            </div>
          </template>
          <span>文件</span>
        </n-popover>
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg @click="open({ accept: 'image/*' })" class="mr-18px"><use href="#photo"></use></svg>
          </template>
          <span>图片</span>
        </n-popover>
        <!--        <n-popover trigger="hover" :show-arrow="false" placement="bottom">-->
        <!--          <template #trigger>-->
        <!--            <svg class="mr-18px"><use href="#shake"></use></svg>-->
        <!--          </template>-->
        <!--          <span>窗口抖动</span>-->
        <!--        </n-popover>-->
        <!--        <n-popover trigger="hover" :show-arrow="false" placement="bottom">-->
        <!--          <template #trigger>-->
        <!--            <svg class="mr-18px"><use href="#red-packet"></use></svg>-->
        <!--          </template>-->
        <!--          <span>红包</span>-->
        <!--        </n-popover>-->
        <n-popover trigger="hover" :show-arrow="false" placement="bottom">
          <template #trigger>
            <svg class="mr-18px"><use href="#voice"></use></svg>
          </template>
          <span>语音信息</span>
        </n-popover>
      </n-flex>

      <n-popover trigger="hover" :show-arrow="false" placement="bottom">
        <template #trigger>
          <svg class="w-22px h-22px cursor-pointer outline-none"><use href="#history"></use></svg>
        </template>
        <span>聊天记录</span>
      </n-popover>
    </n-flex>

    <!-- 输入框及其发送按钮 -->
    <div class="pl-20px flex flex-col items-end gap-6px">
      <MsgInput ref="MsgInputRef" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { createFileOrVideoDom } from '@/utils/CreateDom.ts'
import { MsgEnum } from '@/enums'

const { open, onChange } = useFileDialog()
const MsgInputRef = ref()
const msgInputDom = ref()
const emojiShow = ref()

/**
 * 选择表情，并把表情插入输入框
 * @param item 选择的表情
 */
const emojiHandle = (item: string) => {
  emojiShow.value = false
  msgInputDom.value.focus()
  const sel = window.getSelection()
  const res = sel?.getRangeAt(0)
  res?.setStart(msgInputDom.value, msgInputDom.value.childNodes.length)
  // 插入表情
  MsgInputRef.value.insertNode(MsgEnum.TEXT, item)
  MsgInputRef.value.triggerInputEvent(msgInputDom.value)
}

onChange((files) => {
  if (!files) return
  if (files.length > 5) {
    window.$message.warning('一次性只能上传5个文件')
    return
  }
  for (let file of files) {
    // 检查文件大小
    let fileSizeInMB = file.size / 1024 / 1024 // 将文件大小转换为兆字节(MB)
    if (fileSizeInMB > 300) {
      window.$message.warning(`文件 ${file.name} 超过300MB`)
      continue // 如果文件大小超过300MB，就跳过这个文件，处理下一个文件
    }
    let reader = new FileReader()
    let type = file.type
    if (type.startsWith('image/')) {
      reader.onload = (e: any) => {
        const img = document.createElement('img')
        img.src = e.target.result
        // 设置图片的最大高度和最大宽度
        img.style.maxHeight = '88px'
        img.style.maxWidth = '140px'
        img.style.marginRight = '6px'
        // 插入图片
        MsgInputRef.value.insertNode(MsgEnum.IMAGE, img)
        MsgInputRef.value.triggerInputEvent(msgInputDom.value)
      }
    } else {
      // 使用函数
      createFileOrVideoDom(file).then((imgTag) => {
        // 获取光标
        const selection = window.getSelection()
        // 获取选中的内容
        const range = selection?.getRangeAt(0)
        // 删除选中的内容
        range?.deleteContents()
        // 将生成的img标签插入到页面中
        MsgInputRef.value.insertNode(MsgEnum.FILE, imgTag)
        MsgInputRef.value.triggerInputEvent(msgInputDom.value)
      })
    }
    nextTick(() => {
      reader.readAsDataURL(file)
    })
  }
})

onMounted(() => {
  msgInputDom.value = MsgInputRef.value.messageInputDom
})
</script>

<style scoped lang="scss">
.input-options {
  svg {
    width: 22px;
    height: 22px;
    cursor: pointer;
    outline: none;
    &:hover {
      color: #13987f;
    }
  }
}

:deep(.n-input .n-input-wrapper) {
  padding: 0;
}
</style>
