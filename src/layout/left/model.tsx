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
  NIcon,
  NProgress
} from 'naive-ui'
import { FormInst } from 'naive-ui'
import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import { handRelativeTime } from '@/utils/Day.ts'
import './style.scss'
import { type } from '@tauri-apps/plugin-os'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { useUserStore } from '@/stores/user.ts'
import { useSettingStore } from '@/stores/setting.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { confirm } from '@tauri-apps/plugin-dialog'
import apis from '@/services/apis'
import { useLogin } from '@/hooks/useLogin'
import { getVersion } from '@tauri-apps/api/app'

const { logout, resetLoginState } = useLogin()
const formRef = ref<FormInst | null>()
const formValue = ref({
  lockPassword: ''
})
export const modalShow = ref(false)
export const remotelogin = ref({
  loading: false,
  async logout() {
    remotelogin.value.loading = true
    const settingStore = useSettingStore()
    const { login } = storeToRefs(settingStore)
    // token已在后端清空，只需要返回登录页
    await apis.logout(login.value.autoLogin)
    await resetLoginState()
    await logout()
    modalShow.value = false
    remotelogin.value.loading = false
  }
})
export const lock = ref({
  loading: false,
  rules: {
    lockPassword: {
      required: true,
      message: '请输入锁屏密码',
      trigger: ['input']
    }
  },
  async handleLock() {
    const settingStore = useSettingStore()
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
        modalShow.value = false
        formValue.value.lockPassword = ''
      }, 1000)
    })
    formRef.value?.restoreValidation()
  }
})

/*============================================ model =====================================================*/
/**  锁屏弹窗 */
export const LockScreen = defineComponent(() => {
  const userStore = useUserStore()
  return () => (
    <NModal v-model:show={modalShow.value} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
        {type() === 'macos' ? (
          <div
            onClick={() => (modalShow.value = false)}
            class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
            <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>
        ) : (
          <svg onClick={() => (modalShow.value = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
            <use href="#close"></use>
          </svg>
        )}
        <div class="flex flex-col gap-10px p-10px select-none">
          <NFlex vertical justify="center" align="center" size={20}>
            <span class="text-(14px center)">锁定屏幕</span>

            <NAvatar bordered round size={80} src={AvatarUtils.getAvatarUrl(userStore.userInfo.avatar!)} />

            <p class="text-(14px center [--text-color]) truncate w-200px">{userStore.userInfo.name}</p>
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

/**
 * 检查更新弹窗
 */
export const CheckUpdate = defineComponent(() => {
  /** 项目提交日志记录 */
  const commitLog = ref<{ message: string; icon: string }[]>([])
  const newCommitLog = ref<{ message: string; icon: string }[]>([])
  const text = ref('检查更新')
  const currentVersion = ref('')
  const newVersion = ref('')
  const loading = ref(false)
  const checkLoading = ref(false)
  const updating = ref(false)
  /** 版本更新日期 */
  const versionTime = ref('')
  const newVersionTime = ref('')
  const percentage = ref(0)
  const total = ref(0)
  const downloaded = ref(0)

  const commitTypeMap: { [key: string]: string } = {
    feat: 'comet',
    fix: 'bug',
    docs: 'memo',
    style: 'lipstick',
    refactor: 'recycling-symbol',
    perf: 'rocket',
    test: 'test-tube',
    build: 'package',
    ci: 'gear',
    revert: 'right-arrow-curving-left',
    chore: 'hammer-and-wrench'
  }

  const mapCommitType = (commitMessage: string) => {
    for (const type in commitTypeMap) {
      if (new RegExp(`^${type}`, 'i').test(commitMessage)) {
        return commitTypeMap[type]
      }
    }
  }

  /* 记录检测更新的版本 */
  //let lastVersion: string | null = null

  const getCommitLog = async (url: string, isNew = false) => {
    fetch(url).then((res) => {
      if (!res.ok) {
        commitLog.value = [{ message: '获取更新日志失败，请配置token后再试', icon: 'cloudError' }]
        loading.value = false
        return
      }
      res.json().then(async (data) => {
        isNew ? (newVersionTime.value = data.created_at) : (versionTime.value = data.created_at)
        await nextTick(() => {
          // 使用正则表达式提取 * 号后面的内容
          const regex = /\* (.+)/g
          let match
          const logs = []
          while ((match = regex.exec(data.body)) !== null) {
            logs.push(match[1])
          }
          const processedLogs = logs.map((commit) => {
            // 获取最后一个 : 号的位置
            const lastColonIndex = commit.lastIndexOf(':')
            // 截取最后一个 : 号后的内容
            const message = lastColonIndex !== -1 ? commit.substring(lastColonIndex + 1).trim() : commit
            return {
              message: message,
              icon: mapCommitType(commit) || 'alien-monster'
            }
          })
          isNew ? (newCommitLog.value = processedLogs) : (commitLog.value = processedLogs)
          loading.value = false
        })
      })
    })
  }

  const doUpdate = async () => {
    if (!(await confirm('确定更新吗'))) {
      return
    }
    text.value = '正在下载...'
    updating.value = true
    checkLoading.value = true
    await check()
      .then(async (e) => {
        if (!e?.available) {
          return
        }

        await e.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              total.value = event.data.contentLength ? event.data.contentLength : 0
              break
            case 'Progress':
              downloaded.value += event.data.chunkLength
              percentage.value = parseFloat(((downloaded.value / total.value) * 100 + '').substring(0, 4))
              break
            case 'Finished':
              window.$message.success('安装包下载成功，稍后将自动安装并重启')
              text.value = '更新成功'
              updating.value = false
              break
          }
        })
        try {
          await relaunch()
        } catch (e) {
          console.log(e)
          window.$message.error('重启失败，请手动重启')
        }
      })
      .catch(() => {
        window.$message.error('检查更新错误，请稍后再试')
      })
      .finally(() => {
        checkLoading.value = false
        updating.value = false
      })
  }

  const checkUpdate = async () => {
    checkLoading.value = true
    await check()
      .then((e) => {
        if (!e?.available) {
          checkLoading.value = false
          return
        }
        newVersion.value = e.version
        // 检查版本之间不同的提交信息和提交日期
        const url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${newVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
        getCommitLog(url, true)
        text.value = '立即更新'
        checkLoading.value = false
      })
      .catch(() => {
        checkLoading.value = false
        window.$message.error('检查更新错误，请稍后再试')
      })
  }

  const init = async () => {
    loading.value = true
    currentVersion.value = await getVersion()
  }

  onMounted(async () => {
    await init()
    const url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${currentVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
    await getCommitLog(url)
    await checkUpdate()
  })
  return () => (
    <NModal v-model:show={modalShow.value} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-500px h-full p-6px box-border flex flex-col">
        {type() === 'macos' ? (
          <div
            onClick={() => (modalShow.value = false)}
            class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
            <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>
        ) : (
          <svg onClick={() => (modalShow.value = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
            <use href="#close"></use>
          </svg>
        )}
        {loading.value ? (
          <NFlex vertical justify={'center'} size={10} class="mt-6px">
            <NSkeleton text repeat={1} class="rounded-8px h-30px w-120px" />
            <NSkeleton text repeat={1} class="rounded-8px h-300px" />
            <NSkeleton text repeat={1} class="rounded-8px w-80px h-30px m-[0_0_0_auto]" />
          </NFlex>
        ) : (
          <NFlex size={10} vertical justify={'center'} class="p-14px box-border select-none">
            <NFlex justify={'space-between'} align={'center'} size={0}>
              <NFlex align={'center'} size={10}>
                <NFlex align={'center'} size={10}>
                  <p>当前版本:</p>
                  <p class="text-(20px #909090) font-500">{currentVersion.value}</p>
                </NFlex>

                {newVersion.value ? (
                  <NFlex align={'center'} size={10} class="relative">
                    <svg class="w-24px h-24px select-none color-#ccc">
                      <use href={'#RightArrow'}></use>
                    </svg>

                    <p class="relative text-(20px #13987f) font-500">{newVersion.value}</p>

                    <span class="absolute top--10px right--44px p-[4px_8px] bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
                      new
                    </span>
                  </NFlex>
                ) : null}
              </NFlex>
              <NFlex align={'center'} size={10}>
                {newVersionTime.value ? (
                  <>
                    <p class="text-(12px #909090)">新版本发布日期:</p>
                    <p class="text-(12px #13987f)">{handRelativeTime(newVersionTime.value)}</p>
                  </>
                ) : (
                  <>
                    <p class="text-(12px #909090)">版本发布日期:</p>
                    <p class="text-(12px #13987f)">{handRelativeTime(versionTime.value)}</p>
                  </>
                )}
              </NFlex>
            </NFlex>
            <p class="text-(14px #909090)">版本更新日志</p>
            <NScrollbar class="max-h-460px p-[0_10px] box-border">
              {newCommitLog.value.length > 0 ? (
                <>
                  <div class="p-[4px_8px] mt-4px w-fit bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
                    {newVersion.value}
                  </div>

                  <NTimeline class="p-16px box-border">
                    {newCommitLog.value.map((log, index) => (
                      <NTimelineItem key={index} content={log.message}>
                        {{
                          icon: () => (
                            <NIcon size={32}>
                              <img class="size-32px" src={`/emoji/${log.icon}.webp`} alt="" />
                            </NIcon>
                          )
                        }}
                      </NTimelineItem>
                    ))}
                  </NTimeline>

                  <NFlex>
                    <NFlex vertical size={20}>
                      <svg class="m-[4px_40px] w-24px h-24px select-none rotate-270 color-#ccc">
                        <use href={'#RightArrow'}></use>
                      </svg>

                      <span class="p-[4px_8px] w-fit bg-#f1f1f1 rounded-6px text-(12px #999)">
                        {currentVersion.value}
                      </span>
                    </NFlex>
                  </NFlex>
                </>
              ) : null}

              <NTimeline class="p-16px box-border">
                {commitLog.value.map((log, index) => (
                  <NTimelineItem key={index} content={log.message}>
                    {{
                      icon: () => (
                        <NIcon size={32}>
                          {/*<svg>*/}
                          {/*  <use href={`#${log.icon}`}></use>*/}
                          {/*</svg>*/}
                          <img class="size-32px" src={`/emoji/${log.icon}.webp`} alt="" />
                        </NIcon>
                      )
                    }}
                  </NTimelineItem>
                ))}
              </NTimeline>
            </NScrollbar>
            <NFlex justify={'end'}>
              <NButton
                loading={checkLoading.value}
                onClick={text.value === '立即更新' ? doUpdate : checkUpdate}
                secondary
                type={text.value === '立即更新' ? 'primary' : 'tertiary'}>
                {text.value}
                {text.value === '正在下载...' &&
                  total.value > 0 &&
                  `${parseFloat((total.value / 1024 / 1024).toString()).toFixed(2)}M`}
              </NButton>
              {updating.value && (
                <NProgress
                  type="line"
                  color="#13987f"
                  indicator-placement="inside"
                  percentage={percentage.value}
                  processing
                />
              )}
            </NFlex>
          </NFlex>
        )}
      </div>
    </NModal>
  )
})

/**
 * 异地登录弹窗
 */
export const RemoteLogin = defineComponent({
  props: {
    ip: {
      type: String,
      default: '未知IP'
    }
  },
  setup(props) {
    const userStore = useUserStore()
    return () => (
      <NModal
        v-model:show={modalShow.value}
        maskClosable={false}
        class="w-350px border-rd-8px select-none cursor-default">
        <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
          {type() === 'macos' ? (
            <div
              onClick={remotelogin.value.logout}
              class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
              <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
                <use href="#close"></use>
              </svg>
            </div>
          ) : (
            <svg onClick={remotelogin.value.logout} class="w-12px h-12px ml-a cursor-pointer select-none">
              <use href="#close"></use>
            </svg>
          )}
          <div class="flex flex-col gap-10px p-10px select-none">
            <NFlex vertical align="center" size={30}>
              <span class="text-(14px [--text-color])">下线通知</span>

              <div class="relative">
                <img class="rounded-full size-72px" src={AvatarUtils.getAvatarUrl(userStore.userInfo.avatar!)} />
                <div class="absolute inset-0 bg-[--avatar-hover-bg] backdrop-blur-[2px] rounded-full flex items-center justify-center">
                  <svg class="size-34px text-white animate-pulse">
                    <use href="#cloudError"></use>
                  </svg>
                </div>
              </div>

              <div class="text-(13px centent [--text-color]) px-12px leading-loose mb-20px">
                您的账号在其他设备 <span class="text-#13987f">{props.ip}</span>{' '}
                登录，如非本人登录，请尽快修改密码，建议联系管理员
              </div>
            </NFlex>
            <NButton
              disabled={remotelogin.value.loading}
              loading={remotelogin.value.loading}
              onClick={remotelogin.value.logout}
              style={{ color: '#fff' }}
              class="w-full"
              color="#13987f">
              重新登录
            </NButton>
          </div>
        </div>
      </NModal>
    )
  }
})
