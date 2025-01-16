import { handRelativeTime } from '@/utils/Day.ts'
import { NButton, NAvatar } from 'naive-ui'
import { useNoticeStore } from '@/stores/notice.ts'

const { systemNotice } = storeToRefs(useNoticeStore())
const SysNTF = null
if (!systemNotice.value) {
  const SysNTF = window.$notification.create({
    title: () => <p class="text-14px font-bold pl-10px">系统提示</p>,
    content: () => <p class="text-12px pl-10px">当前系统尚未完善，请不要把重要信息保存在这里</p>,
    meta: () => <p class="text-12px pl-10px">{handRelativeTime('2024/11/28 16:48:32')}</p>,
    closable: false,
    avatar: () => <NAvatar class="flex-shrink-0" size={44} src="/logo.png" round />,
    action: () => (
      <NButton
        text
        type="primary"
        onClick={() => {
          systemNotice.value = true
          SysNTF.destroy()
        }}>
        <p class="text-(12px #13987f)">已读</p>
      </NButton>
    )
  })
}

export default SysNTF
