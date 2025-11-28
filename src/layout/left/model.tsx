import {
  type FormInst,
  NAvatar,
  NButton,
  NFlex,
  NForm,
  NFormItem,
  NIcon,
  NInput,
  NModal,
  NProgress,
  NScrollbar,
  NSkeleton,
  NTimeline,
  NTimelineItem
} from 'naive-ui'
import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import { handRelativeTime } from '@/utils/ComputedTime'
import './style.scss'
import { getVersion } from '@tauri-apps/api/app'
import { confirm } from '@tauri-apps/plugin-dialog'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import { isMac } from '@/utils/PlatformConstants'
import { useI18n } from 'vue-i18n'

const formRef = ref<FormInst | null>()
const formValue = ref({
  lockPassword: ''
})
export const modalShow = ref(false)
export const lock = ref({
  loading: false,
  rules: {
    lockPassword: {
      required: true,
      message: '',
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
  const { t } = useI18n()
  lock.value.rules.lockPassword.message = t('message.lock_screen.validation_required')
  return () => (
    <NModal v-model:show={modalShow.value} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
        {isMac() ? (
          <div
            onClick={() => (modalShow.value = false)}
            class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
            <svg class="hidden size-7px color-#000 select-none absolute top-3px left-3px">
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
            <span class="text-(14px center)">{t('message.lock_screen.title')}</span>

            <NAvatar bordered round size={80} src={AvatarUtils.getAvatarUrl(userStore.userInfo!.avatar!)} />

            <p class="text-(14px center [--text-color]) truncate w-200px">{userStore.userInfo!.name}</p>
          </NFlex>
          <NForm ref={formRef} model={formValue.value} rules={lock.value.rules}>
            <NFormItem
              label-placement="left"
              label={t('message.lock_screen.password_label')}
              path={'lockPassword'}
              class="w-full">
              <NInput
                show-password-on="click"
                v-model:value={formValue.value.lockPassword}
                class="border-(1px solid #ccc)"
                size="small"
                type="password"
                placeholder={t('message.lock_screen.password_placeholder')}
              />
            </NFormItem>
          </NForm>

          <NButton loading={lock.value.loading} onClick={lock.value.handleLock} class="w-full" color="#13987f">
            {t('message.lock_screen.confirm_button')}
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
  const { t } = useI18n()
  /** 项目提交日志记录 */
  const commitLog = ref<{ message: string; icon: string }[]>([])
  const newCommitLog = ref<{ message: string; icon: string }[]>([])
  type ButtonState = 'check_now' | 'update_now' | 'downloading' | 'update_success'
  const buttonState = ref<ButtonState>('check_now')
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
        commitLog.value = [{ message: t('message.check_update.fetch_log_failed'), icon: 'cloudError' }]
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
    if (!(await confirm(t('message.check_update.confirm_update')))) {
      return
    }
    buttonState.value = 'downloading'
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
              window.$message.success(t('message.check_update.download_success_toast'))
              buttonState.value = 'update_success'
              updating.value = false
              break
          }
        })
        try {
          await relaunch()
        } catch (e) {
          console.log(e)
          window.$message.error(t('message.check_update.restart_failed'))
        }
      })
      .catch(() => {
        window.$message.error(t('message.check_update.update_error'))
      })
      .finally(() => {
        checkLoading.value = false
        updating.value = false
      })
  }

  const checkUpdate = async () => {
    checkLoading.value = true
    buttonState.value = 'check_now'
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
        buttonState.value = 'update_now'
        checkLoading.value = false
      })
      .catch(() => {
        checkLoading.value = false
        window.$message.error(t('message.check_update.update_error'))
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
        {isMac() ? (
          <div
            onClick={() => (modalShow.value = false)}
            class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
            <svg class="hidden size-7px color-#000  select-none absolute top-3px left-3px">
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
                  <p>{t('message.check_update.current_version')}:</p>
                  <p class="text-(20px #909090) font-500">{currentVersion.value}</p>
                </NFlex>

                {newVersion.value ? (
                  <NFlex align={'center'} size={10} class="relative">
                    <svg class="w-24px h-24px select-none color-#ccc">
                      <use href={'#RightArrow'}></use>
                    </svg>

                    <p class="relative text-(20px #13987f) font-500">{newVersion.value}</p>

                    <span class="absolute top--10px right--44px p-[4px_8px] bg-#f6dfe3ff rounded-6px text-(12px #ce304f)">
                      {t('message.check_update.new_tag')}
                    </span>
                  </NFlex>
                ) : null}
              </NFlex>
              <NFlex align={'center'} size={10}>
                {newVersionTime.value ? (
                  <>
                    <p class="text-(12px #909090)">{t('message.check_update.new_release_date')}</p>
                    <p class="text-(12px #13987f)">{handRelativeTime(newVersionTime.value)}</p>
                  </>
                ) : (
                  <>
                    <p class="text-(12px #909090)">{t('message.check_update.release_date')}</p>
                    <p class="text-(12px #13987f)">{handRelativeTime(versionTime.value)}</p>
                  </>
                )}
              </NFlex>
            </NFlex>
            <p class="text-(14px #909090)">{t('message.check_update.log_title')}</p>
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
                onClick={buttonState.value === 'update_now' ? doUpdate : checkUpdate}
                secondary
                type={buttonState.value === 'update_now' ? 'primary' : 'tertiary'}>
                {t(`message.check_update.${buttonState.value}`)}
                {buttonState.value === 'downloading' &&
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
