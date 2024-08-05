import {
  NAvatar,
  NButton,
  NFlex,
  NFormItem,
  NInput,
  NModal,
  NForm,
  NTimelineItem,
  NTimeline,
  NScrollbar,
  NSkeleton,
  NIcon
} from 'naive-ui'
import { FormInst } from 'naive-ui'
import { setting } from '@/stores/setting.ts'
import { storeToRefs } from 'pinia'
import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import pkg from '~/package.json'
import { handRelativeTime } from '@/utils/Day.ts'

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
      trigger: ['input']
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
/**  锁屏弹窗 */
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

/** 检查更新弹窗 */
export const CheckUpdate = defineComponent(() => {
  const url = `https://gitee.com/api/v5/repos/nongyehong/HuLa-IM-Tauri/releases/tags/${pkg.version}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
  /** 项目提交日志记录 */
  const commitLog = ref<{ message: string; icon: string }[]>([])
  const loading = ref(false)
  const checkLoading = ref(false)
  /** 版本更新日期 */
  const versionTime = ref('')

  const commitTypeMap: { [key: string]: string } = {
    feat: 'feat',
    fix: 'fix',
    docs: 'docs',
    style: 'style',
    refactor: 'refactor',
    perf: 'perf',
    test: 'test',
    build: 'build',
    ci: 'ci',
    revert: 'revert',
    chore: 'chore'
  }

  const mapCommitType = (commitMessage: string) => {
    for (const type in commitTypeMap) {
      if (new RegExp(`^${type}`, 'i').test(commitMessage)) {
        return commitTypeMap[type]
      }
    }
  }

  /* 记录检测更新的版本 */
  let lastVersion: string | null = null

  const checkUpdate = () => {
    const url = `https://gitee.com/api/v5/repos/nongyehong/HuLa-IM-Tauri/tags?access_token=${import.meta.env.VITE_GITEE_TOKEN}&sort=name&direction=desc&page=1&per_page=1`
    if (lastVersion && lastVersion === pkg.version) {
      window.$message.success('当前已是最新版本')
      return
    }
    checkLoading.value = true
    fetch(url).then((res) => {
      res
        .json()
        .then(async (data) => {
          if (data[0].name === pkg.version) {
            checkLoading.value = false
            window.$message.success('当前已是最新版本')
            lastVersion = pkg.version
          } else {
            // TODO 获取最新版本的提交日志，并且更换按钮文字为下载最新版本 (nyh -> 2024-07-11 22:20:33)
          }
        })
        .catch(() => {
          checkLoading.value = false
          window.$message.error('请检查配置，配置好token后再试')
        })
    })
  }

  const init = () => {
    loading.value = true
    fetch(url).then((res) => {
      if (!res.ok) {
        commitLog.value = [{ message: '获取更新日志失败，请配置token后再试', icon: 'cloudError' }]
        loading.value = false
        return
      }
      res.json().then(async (data) => {
        versionTime.value = data.created_at
        await nextTick(() => {
          // 使用正则表达式提取 * 号后面的内容
          const regex = /\* (.+)/g
          let match
          const logs = []
          while ((match = regex.exec(data.body)) !== null) {
            logs.push(match[1])
          }
          commitLog.value = logs.map((commit) => {
            // 获取最后一个 : 号的位置
            const lastColonIndex = commit.lastIndexOf(':')
            // 截取最后一个 : 号后的内容
            const message = lastColonIndex !== -1 ? commit.substring(lastColonIndex + 1).trim() : commit
            return {
              message: message,
              icon: mapCommitType(commit)!
            }
          })
          loading.value = false
        })
      })
    })
  }

  onMounted(() => {
    init()
  })
  return () => (
    <NModal v-model:show={lock.value.modalShow} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-500px h-full p-6px box-border flex flex-col">
        <svg onClick={() => (lock.value.modalShow = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
          <use href="#close"></use>
        </svg>
        {loading.value ? (
          <NFlex vertical justify={'center'} size={10}>
            <NSkeleton text repeat={1} class="rounded-8px h-30px w-120px" />
            <NSkeleton text repeat={1} class="rounded-8px h-300px" />
            <NSkeleton text repeat={1} class="rounded-8px w-80px h-30px m-[0_0_0_auto]" />
          </NFlex>
        ) : (
          <NFlex size={10} vertical justify={'center'} class="p-14px box-border select-none">
            <NFlex justify={'space-between'} align={'center'}>
              <NFlex align={'center'} size={10}>
                <p>当前版本:</p>
                <p class="text-(24px #909090) font-bold">{pkg.version}</p>
              </NFlex>
              <NFlex align={'center'} size={10}>
                <p class="text-(12px #909090)">版本发布日期:</p>
                <p class="text-(12px #13987f)">{handRelativeTime(versionTime.value)}</p>
              </NFlex>
            </NFlex>
            <p class="text-(14px #909090)">版本更新日志</p>
            <NScrollbar class="max-h-460px p-[0_10px] box-border">
              <NTimeline class="p-[0_6px] box-border">
                {commitLog.value.map((log, index) => (
                  <NTimelineItem key={index} content={log.message}>
                    {{
                      icon: () => (
                        <NIcon size={20}>
                          <svg>
                            <use href={`#${log.icon}`}></use>
                          </svg>
                        </NIcon>
                      )
                    }}
                  </NTimelineItem>
                ))}
              </NTimeline>
            </NScrollbar>
            <NFlex justify={'end'}>
              <NButton loading={checkLoading.value} onClick={checkUpdate} secondary type="tertiary">
                检查更新
              </NButton>
            </NFlex>
          </NFlex>
        )}
      </div>
    </NModal>
  )
})
