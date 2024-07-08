import { NAvatar, NButton, NFlex, NFormItem, NInput, NModal, NForm } from 'naive-ui'
import { FormInst } from 'naive-ui'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'

const formRef = ref<FormInst | null>()
const formValue = ref({
  lockPassword: ''
})
export const lock = ref({
  modalShow: false,
  loading: false,
  rules: {
    lockPassword: {
      required: true,
      message: '请输入锁屏密码',
      trigger: ['input', 'blur']
    }
  },
  async handleLock() {
    const settingStore = setting()
    const { lockScreen } = storeToRefs(settingStore)
    formRef.value?.validate((errors) => {
      if (errors) return
      lock.value.loading = true
      lockScreen.value.password = formValue.value.lockPassword
      lockScreen.value.enable = true
      setTimeout(async () => {
        /** 发送锁屏事件，当打开的窗口接受到后会自动锁屏 */
        await emit(EventEnum.LOCK_SCREEN)
        lock.value.loading = false
        lock.value.modalShow = false
        formValue.value.lockPassword = ''
      }, 1000)
    })
    formRef.value?.restoreValidation()
  }
})

/*============================================ model =====================================================*/
export const LockScreen = defineComponent(() => {
  const settingStore = setting()
  const { login } = storeToRefs(settingStore)
  return () => (
    <NModal v-model:show={lock.value.modalShow} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
        <svg onClick={() => (lock.value.modalShow = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
        <div class="flex flex-col gap-10px p-10px select-none">
          <NFlex vertical justify="center" align="center" size={20}>
            <span class="text-(14px center)">锁定屏幕</span>

            <NAvatar bordered round size={80} src={login.value.accountInfo.avatar} />

            <p class="text-(14px center [--text-color]) truncate w-200px">{login.value.accountInfo.name}</p>
          </NFlex>
          <NForm ref={formRef} model={formValue.value} rules={lock.value.rules}>
            <NFormItem label-placement="left" label="锁屏密码" path={'lockPassword'} class="w-full">
              <NInput
                show-password-on="click"
                v-model:value={formValue.value.lockPassword}
                class="border-(1px solid #ccc)"
                size="small"
                type="password"
                placeholder="请输入锁屏密码"
              />
            </NFormItem>
          </NForm>

          <NButton loading={lock.value.loading} onClick={lock.value.handleLock} class="w-full" color="#13987f">
            确定
          </NButton>
        </div>
      </div>
    </NModal>
  )
})

export const CheckUpdate = defineComponent(() => {
  return () => (
    <NModal v-model:show={lock.value.modalShow} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
        <svg onClick={() => (lock.value.modalShow = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
        <p>123</p>
      </div>
    </NModal>
  )
})
