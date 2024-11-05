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
import { useSettingStore } from '@/stores/setting.ts'
import { emit } from '@tauri-apps/api/event'
import { EventEnum } from '@/enums'
import pkg from '~/package.json'
import { handRelativeTime } from '@/utils/Day.ts'
import './style.scss'
import { type } from '@tauri-apps/plugin-os'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

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
  const settingStore = useSettingStore()
  const { login } = storeToRefs(settingStore)
  return () => (
    <NModal v-model:show={lock.value.modalShow} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-360px h-full p-6px box-border flex flex-col">
        {type() === 'macos' ? (
          <div
            onClick={() => (lock.value.modalShow = false)}
            class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
            <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>
        ) : (
          <svg onClick={() => (lock.value.modalShow = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
            <use href="#close"></use>
          </svg>
        )}
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

/**
 * 检查更新弹窗
 */
export const CheckUpdate = defineComponent(() => {
  const url = ref(
    `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/v${pkg.version}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
  )
  /** 项目提交日志记录 */
  const commitLog = ref<{ message: string; icon: string }[]>([])
  const newCommitLog = ref<{ message: string; icon: string }[]>([])
  const text = ref('检查更新')
  const newVersion = ref()
  const loading = ref(false)
  const checkLoading = ref(false)
  const updating = ref(false)
  /** 版本更新日期 */
  const versionTime = ref('')
  const newVersionTime = ref('')
  const percentage = ref(0)
  const total = ref(0)
  const downloaded = ref(0)

  // const commitTypeMap: { [key: string]: string } = {
  //   feat: 'feat',
  //   fix: 'fix',
  //   docs: 'docs',
  //   style: 'style',
  //   refactor: 'refactor',
  //   perf: 'perf',
  //   test: 'test',
  //   build: 'build',
  //   ci: 'ci',
  //   revert: 'revert',
  //   chore: 'chore'
  // }

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

  const getCommitLog = (url: string, isNew = false) => {
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

  const handleUpdate = async () => {
    if (!(await window.confirm('确定更新吗'))) {
      return
    }
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
              window.$message.success('安装包下载成功，3s后重启并安装')
              setTimeout(() => {
                updating.value = false
                relaunch()
              }, 3000)
              break
          }
        })
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

    const url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/tags?access_token=${import.meta.env.VITE_GITEE_TOKEN}&sort=name&direction=desc&page=1&per_page=1`

    await check()
      .then((e) => {
        if (!e?.available) {
          checkLoading.value = false
          return
        }
        // 检查版本之间不同的提交信息和提交日期
        fetch(url).then((res) => {
          res
            .json()
            .then(async () => {
              await nextTick(() => {
                let url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/tags?access_token=${import.meta.env.VITE_GITEE_TOKEN}&sort=name&direction=asc&page=1`
                fetch(url).then((res) => {
                  res.json().then(async (data) => {
                    const allVersion = [] as number[]
                    data.forEach((item: any) => {
                      // 只获取item.name中[1,4]的内容
                      allVersion.push(Number(item.name.slice(1, 4)))
                    })
                    newVersion.value = `v${Math.max(...allVersion)}.0`
                    url = `https://gitee.com/api/v5/repos/HuLaSpark/HuLa/releases/tags/${newVersion.value}?access_token=${import.meta.env.VITE_GITEE_TOKEN}`
                    getCommitLog(url, true)
                  })
                })
              })
            })
            .catch(() => {
              checkLoading.value = false
              window.$message.error('请检查配置，配置好token后再试')
            })
        })
        text.value = '立即更新'
        checkLoading.value = false
      })
      .catch(() => {
        checkLoading.value = false
        window.$message.error('检查更新错误，请稍后再试')
      })
  }

  const init = () => {
    loading.value = true
  }

  onMounted(async () => {
    init()
    getCommitLog(url.value)
    await checkUpdate()
  })
  return () => (
    <NModal v-model:show={lock.value.modalShow} maskClosable={false} class="w-350px border-rd-8px">
      <div class="bg-[--bg-popover] w-500px h-full p-6px box-border flex flex-col">
        {type() === 'macos' ? (
          <div
            onClick={() => (lock.value.modalShow = false)}
            class="mac-close relative size-13px shadow-inner bg-#ed6a5eff rounded-50% select-none">
            <svg class="hidden size-7px color-#000 font-bold select-none absolute top-3px left-3px">
              <use href="#close"></use>
            </svg>
          </div>
        ) : (
          <svg onClick={() => (lock.value.modalShow = false)} class="w-12px h-12px ml-a cursor-pointer select-none">
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
                  <p class="text-(20px #909090) font-500">{pkg.version}</p>
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

                      <span class="p-[4px_8px] w-fit bg-#f1f1f1 rounded-6px text-(12px #999)">{pkg.version}</span>
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
              {text.value === '立即更新' ? (
                <NButton loading={checkLoading.value} onClick={handleUpdate} secondary type="primary">
                  {text.value}
                  {total.value > 0 && parseFloat(total.value / 1024 / 1024 + '').toFixed(2) + 'M'}
                </NButton>
              ) : (
                <NButton loading={checkLoading.value} onClick={checkUpdate} secondary type="tertiary">
                  {text.value}
                </NButton>
              )}
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
