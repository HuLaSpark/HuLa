import { appDataDir, join, resourceDir } from '@tauri-apps/api/path'
import { writeImage, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { save } from '@tauri-apps/plugin-dialog'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import type { FileTypeResult } from 'file-type'
import { computed, onUnmounted, type InjectionKey } from 'vue'
import { ErrorType } from '@/common/exception'
import {
  MergeMessageType,
  MittEnum,
  MsgEnum,
  PowerEnum,
  CallTypeEnum,
  RoleEnum,
  RoomTypeEnum,
  TauriCommand
} from '@/enums'
import { useCommon } from '@/hooks/useCommon.ts'
import { useDownload } from '@/hooks/useDownload'
import { useMitt } from '@/hooks/useMitt.ts'
import { useVideoViewer } from '@/hooks/useVideoViewer'
import { translateTextStream } from '@/services/translate'
import type { FilesMeta, MessageType, RightMouseMessageItem } from '@/services/types.ts'
import { useCachedStore } from '@/stores/cached'
import { useChatStore } from '@/stores/chat.ts'
import { useContactStore } from '@/stores/contacts'
import { useEmojiStore } from '@/stores/emoji'
import { type FileDownloadStatus, useFileDownloadStore } from '@/stores/fileDownload'
import { useGlobalStore } from '@/stores/global.ts'
import { useGroupStore } from '@/stores/group'
import { useSettingStore } from '@/stores/setting.ts'
import { useUserStore } from '@/stores/user'
import { saveFileAttachmentAs, saveVideoAttachmentAs } from '@/utils/AttachmentSaver'
import { isDiffNow } from '@/utils/ComputedTime.ts'
import { extractFileName, removeTag } from '@/utils/Formatting'
import { detectImageFormat, imageUrlToUint8Array, isImageUrl } from '@/utils/ImageUtils'
import { recallMsg, removeGroupMember, updateMyRoomInfo } from '@/utils/ImRequestUtils'
import { detectRemoteFileType, getFilesMeta } from '@/utils/PathUtil'
import { isMac, isMobile } from '@/utils/PlatformConstants'
import { invokeWithErrorHandler } from '@/utils/TauriInvokeHandler'
import { useWindow } from './useWindow'
import { useI18n } from 'vue-i18n'

type UseChatMainOptions = {
  enableGroupNicknameModal?: boolean
  disableHistoryActions?: boolean
}

type GroupNicknameModalPayload = {
  roomId: string
  currentUid: string
  originalNickname: string
}

export const useChatMain = (isHistoryMode = false, options: UseChatMainOptions = {}) => {
  const { t } = useI18n()
  const { openMsgSession, userUid } = useCommon()
  const { createWebviewWindow, sendWindowPayload, startRtcCall } = useWindow()
  const { getLocalVideoPath, checkVideoDownloaded } = useVideoViewer()
  const fileDownloadStore = useFileDownloadStore()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  const globalStore = useGlobalStore()
  const groupStore = useGroupStore()
  const chatStore = useChatStore()
  const cachedStore = useCachedStore()
  const emojiStore = useEmojiStore()
  const userStore = useUserStore()
  const { downloadFile } = useDownload()
  const enableGroupNicknameModal = options.enableGroupNicknameModal ?? false
  const disableHistoryActions = options.disableHistoryActions ?? false
  /** 滚动条位置 */
  const scrollTop = ref(-1)
  /** 提醒框标题 */
  const tips = ref()
  /** 是否显示删除信息的弹窗 */
  const modalShow = ref(false)
  /** 需要删除信息的下标 */
  const delIndex = ref('')
  const delRoomId = ref('')
  /** 选中的气泡消息 */
  const activeBubble = ref('')
  /** 记录历史消息下标 */
  const historyIndex = ref(0)
  /** 当前点击的用户的key */
  const selectKey = ref()

  /** 修改群昵称的模态框是否显示 */
  const groupNicknameModalVisible = ref(false)
  /** 修改群昵称输入的值 */
  const groupNicknameValue = ref('')
  /** 修改群昵称错误提示 */
  const groupNicknameError = ref('')
  /** 修改群昵称提交状态 */
  const groupNicknameSubmitting = ref(false)
  /** 修改群昵称上下文信息 */
  const groupNicknameContext = ref<{ roomId: string; currentUid: string; originalNickname: string } | null>(null)

  const handleGroupNicknameConfirm = async () => {
    if (!groupNicknameContext.value) {
      return
    }

    const trimmedName = groupNicknameValue.value.trim()
    if (!trimmedName) {
      groupNicknameError.value = t('home.chat_main.group_nickname.error.empty')
      return
    }

    if (trimmedName === groupNicknameContext.value.originalNickname) {
      groupNicknameModalVisible.value = false
      return
    }

    const { roomId, currentUid } = groupNicknameContext.value
    if (!roomId) {
      window.$message?.error(t('home.chat_main.group_nickname.error.invalid_room'))
      return
    }

    try {
      groupNicknameSubmitting.value = true
      const remark = groupStore.countInfo?.remark || ''
      const payload = {
        id: roomId,
        myName: trimmedName,
        remark
      }
      await cachedStore.updateMyRoomInfo(payload)
      await updateMyRoomInfo(payload)
      groupStore.updateUserItem(currentUid, { myName: trimmedName }, roomId)
      await groupStore.updateGroupDetail(roomId, { myName: trimmedName })
      if (currentUid === userUid.value) {
        groupStore.myNameInCurrentGroup = trimmedName
      }
      groupNicknameModalVisible.value = false
    } catch (error) {
      console.error('修改群昵称失败', error)
      groupNicknameSubmitting.value = false
    }
  }

  if (enableGroupNicknameModal) {
    useMitt.on(MittEnum.OPEN_GROUP_NICKNAME_MODAL, (payload: GroupNicknameModalPayload) => {
      groupNicknameContext.value = payload
      groupNicknameValue.value = payload.originalNickname || ''
      groupNicknameError.value = ''
      groupNicknameSubmitting.value = false
      groupNicknameModalVisible.value = true
    })
  }

  /** 通用右键菜单 */
  const handleForward = async (item: MessageType) => {
    if (!item?.message?.id) return
    const target = chatStore.chatMessageList.find((msg) => msg.message.id === item.message.id)
    if (!target) {
      return
    }
    chatStore.clearMsgCheck()
    target.isCheck = true
    chatStore.setMsgMultiChoose(true, 'forward')
    await nextTick()
    useMitt.emit(MittEnum.MSG_MULTI_CHOOSE, {
      action: 'open-forward',
      mergeType: MergeMessageType.SINGLE
    })
  }

  // 复制禁用类型
  const copyDisabledTypes: MsgEnum[] = [MsgEnum.NOTICE, MsgEnum.MERGE, MsgEnum.LOCATION, MsgEnum.VOICE]
  const shouldHideCopy = (item: MessageType) => copyDisabledTypes.includes(item.message.type)
  const isNoticeMessage = (item: MessageType) => item.message.type === MsgEnum.NOTICE
  const revealInDirSafely = async (targetPath?: string | null) => {
    if (!targetPath) {
      window.$message?.error(t('home.chat_main.file.missing_local'))
      return
    }
    try {
      await revealItemInDir(targetPath)
    } catch (error) {
      console.error('在文件夹中显示文件失败:', error)
      window.$message?.error(t('home.chat_main.file.show_failed'))
    }
  }

  const commonMenuList = ref<OPT.RightMenu[]>([
    {
      label: () => t('menu.select'),
      icon: 'list-checkbox',
      click: () => {
        chatStore.setMsgMultiChoose(true)
      },
      visible: (item: MessageType) => !isNoticeMessage(item)
    },
    {
      label: () => t('menu.add_sticker'),
      icon: 'add-expression',
      click: async (item: MessageType) => {
        const imageUrl = item.message.body.url || item.message.body.content
        if (!imageUrl) {
          window.$message.error(t('home.chat_main.image.fetch_failed'))
          return
        }
        await emojiStore.addEmoji(imageUrl)
      },
      visible: (item: MessageType) => {
        return item.message.type === MsgEnum.IMAGE || item.message.type === MsgEnum.EMOJI
      }
    },
    {
      label: () => t('menu.forward'),
      icon: 'share',
      click: (item: MessageType) => {
        if (isMobile()) {
          window.$message.warning(t('home.chat_main.feature.coming_soon'))
          return
        }
        handleForward(item)
      },
      visible: (item: MessageType) => !isNoticeMessage(item)
    },
    // {
    //   label: '收藏',
    //   icon: 'collection-files',
    //   click: () => {
    //     window.$message.warning('暂未实现')
    //   }
    // },
    {
      label: () => t('menu.reply'),
      icon: 'reply',
      click: (item: any) => {
        useMitt.emit(MittEnum.REPLY_MEG, item)
      }
    },
    {
      label: () => t('menu.recall'),
      icon: 'corner-down-left',
      click: async (item: MessageType) => {
        const msg = { ...item }
        // 在调用 API 前先保存原始类型，避免 WebSocket 消息先到达导致 type 被修改
        const originalType = item.message.type
        const originalContent = item.message.body.content
        const res = await recallMsg({ roomId: globalStore.currentSessionRoomId, msgId: item.message.id })
        if (res) {
          window.$message.error(res)
          return
        }
        chatStore.recordRecallMsg({
          recallUid: userStore.userInfo!.uid,
          msg,
          originalType,
          originalContent
        })
        await chatStore.updateRecallMsg({
          recallUid: userStore.userInfo!.uid,
          roomId: msg.message.roomId,
          msgId: msg.message.id
        })
      },
      visible: (item: MessageType) => {
        const isSystemAdmin = userStore.userInfo?.power === PowerEnum.ADMIN
        if (isSystemAdmin) {
          return true
        }

        const isGroupSession = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        const groupMembers = groupStore.userList
        const currentMember = isGroupSession ? groupMembers.find((member) => member.uid === userUid.value) : undefined
        const isGroupManager =
          isGroupSession &&
          (currentMember?.roleId === RoleEnum.LORD ||
            currentMember?.roleId === RoleEnum.ADMIN ||
            groupStore.currentLordId === userUid.value ||
            groupStore.adminUidList.includes(userUid.value))

        if (isGroupManager) {
          return true
        }

        const isCurrentUser = item.fromUser.uid === userUid.value
        if (!isCurrentUser) {
          return false
        }

        return !isDiffNow({ time: item.message.sendTime, unit: 'minute', diff: 2 })
      }
    }
  ])
  const videoMenuList = ref<OPT.RightMenu[]>([
    {
      label: () => t('menu.copy'),
      icon: 'copy',
      click: (item: MessageType) => {
        if (isMobile()) {
          window.$message.warning(t('home.chat_main.feature.coming_soon'))
          return
        }
        handleCopy(item.message.body.url, true, item.message.id)
      }
    },
    ...commonMenuList.value,
    {
      label: () => t('menu.save_as'),
      icon: 'Importing',
      click: async (item: MessageType) => {
        if (isMobile()) {
          window.$message.warning(t('home.chat_main.feature.coming_soon'))
          return
        }
        await saveVideoAttachmentAs({
          url: item.message.body.url,
          downloadFile,
          defaultFileName: item.message.body.fileName
        })
      }
    },

    {
      label: () => (isMac() ? t('menu.show_in_finder') : t('menu.show_in_folder')),
      icon: 'file2',
      click: async (item: MessageType) => {
        try {
          const localPath = await getLocalVideoPath(item.message.body.url)

          // 检查视频是否已下载
          const isDownloaded = await checkVideoDownloaded(item.message.body.url)

          if (!isDownloaded) {
            // 如果未下载，先下载视频
            const baseDir = isMobile() ? BaseDirectory.AppData : BaseDirectory.Resource
            await downloadFile(item.message.body.url, localPath, baseDir)
            // 通知相关组件更新视频下载状态
            useMitt.emit(MittEnum.VIDEO_DOWNLOAD_STATUS_UPDATED, { url: item.message.body.url, downloaded: true })
          }

          // 获取视频的绝对路径
          const baseDirPath = isMobile() ? await appDataDir() : await resourceDir()
          const absolutePath = await join(baseDirPath, localPath)
          await revealInDirSafely(absolutePath)
        } catch (error) {
          console.error('Failed to show video in folder:', error)
        }
      }
    }
  ])
  /** 右键消息菜单列表 */
  const menuList = ref<OPT.RightMenu[]>([
    {
      label: () => t('menu.copy'),
      icon: 'copy',
      click: (item: MessageType) => {
        handleCopy(item.message.body.content, true, item.message.id)
      },
      visible: (item: MessageType) => !shouldHideCopy(item)
    },
    {
      label: () => t('menu.translate'),
      icon: 'translate',
      click: async (item: MessageType) => {
        const selectedText = getSelectedText(item.message.id)
        if (!selectedText && item.message.body.translatedText) {
          delete item.message.body.translatedText
          return
        }

        const content = selectedText || item.message.body.content
        if (!content) {
          window.$message?.warning(t('home.chat_main.translate.empty'))
          return
        }

        item.message.body.translatedText = { provider: chat.value.translate || 'tencent', text: '' }
        await translateTextStream(content, chat.value.translate || 'tencent', (seg) => {
          const prev = item.message.body.translatedText?.text || ''
          item.message.body.translatedText = { provider: chat.value.translate || 'tencent', text: prev + seg }
        })
      },
      visible: (item: MessageType) => item.message.type === MsgEnum.TEXT
    },

    ...commonMenuList.value
  ])
  const specialMenuList = computed(() => {
    return (messageType?: MsgEnum): OPT.RightMenu[] => {
      if (isHistoryMode) {
        // 历史记录模式：基础菜单（复制、转发）
        const baseMenus: OPT.RightMenu[] = [
          {
            label: () => t('menu.copy'),
            icon: 'copy',
            click: (item: MessageType) => {
              const content = item.message.body.url || item.message.body.content
              handleCopy(content, true, item.message.id)
            }
          }
        ]

        if (!disableHistoryActions) {
          baseMenus.push(
            {
              label: () => t('menu.select'),
              icon: 'list-checkbox',
              click: () => {
                chatStore.setMsgMultiChoose(true)
              }
            },
            {
              label: () => t('menu.forward'),
              icon: 'share',
              click: (item: MessageType) => {
                handleForward(item)
              }
            }
          )
        }

        // 媒体文件额外菜单（收藏、另存为、在文件中打开）
        if (
          messageType === MsgEnum.IMAGE ||
          messageType === MsgEnum.EMOJI ||
          messageType === MsgEnum.VIDEO ||
          messageType === MsgEnum.FILE
        ) {
          const mediaMenus: OPT.RightMenu[] = [
            // {
            //   label: '收藏',
            //   icon: 'collection-files',
            //   click: () => {
            //     window.$message.warning('暂未实现')
            //   }
            // },
            {
              label: () => t('menu.save_as'),
              icon: 'Importing',
              click: async (item: MessageType) => {
                if (isMobile()) {
                  window.$message.warning(t('home.chat_main.feature.coming_soon'))
                  return
                }
                const fileUrl = item.message.body.url
                const fileName = item.message.body.fileName
                if (item.message.type === MsgEnum.VIDEO) {
                  await saveVideoAttachmentAs({
                    url: fileUrl,
                    downloadFile,
                    defaultFileName: fileName
                  })
                } else {
                  await saveFileAttachmentAs({
                    url: fileUrl,
                    downloadFile,
                    defaultFileName: fileName
                  })
                }
              }
            },

            {
              label: () => (isMac() ? t('menu.show_in_finder') : t('menu.show_in_folder')),
              icon: 'file2',
              click: async (item: RightMouseMessageItem) => {
                console.log('打开文件夹的item项：', item)

                const fileUrl = item.message.body.url
                const fileName = item.message.body.fileName || extractFileName(fileUrl)

                // 检查文件是否已下载
                const fileStatus = fileDownloadStore.getFileStatus(fileUrl)

                console.log('找到的文件状态：', fileStatus)
                const currentChatRoomId = globalStore.currentSessionRoomId // 这个id可能为群id可能为用户uid，所以不能只用用户uid
                const currentUserUid = userStore.userInfo!.uid as string

                const resourceDirPath = await userStore.getUserRoomAbsoluteDir()
                let absolutePath = await join(resourceDirPath, fileName)

                const [fileMeta] = await getFilesMeta<FilesMeta>([fileStatus?.absolutePath || absolutePath || fileUrl])

                // 最后判断文件不存在本地，那就下载它
                if (!fileMeta.exists) {
                  // 文件不存在本地
                  const downloadMessage = window.$message.info(t('home.chat_main.file.download_prompt'))
                  const _absolutePath = await fileDownloadStore.downloadFile(fileUrl, fileName)

                  if (_absolutePath) {
                    absolutePath = _absolutePath
                    downloadMessage.destroy()
                    window.$message.success(t('home.chat_main.file.download_success'))
                    await revealInDirSafely(_absolutePath)
                    await fileDownloadStore.refreshFileDownloadStatus({
                      fileUrl: item.message.body.url,
                      roomId: currentChatRoomId,
                      userId: currentUserUid,
                      fileName: item.message.body.fileName,
                      exists: true
                    })
                    return
                  } else {
                    absolutePath = ''
                    window.$message.error(t('home.chat_main.file.download_failed'))
                    return
                  }
                }

                await revealInDirSafely(absolutePath)
              }
            }
          ]
          return [...baseMenus, ...mediaMenus]
        }

        return baseMenus
      } else {
        // 正常聊天模式：只显示删除
        return [
          {
            label: () => t('menu.del'),
            icon: 'delete',
            click: (item: any) => {
              tips.value = t('home.chat_main.delete.confirm')
              modalShow.value = true
              delIndex.value = item.message.id
              delRoomId.value = item.message.roomId
            }
          }
        ]
      }
    }
  })
  /** 文件类型右键菜单 */
  const fileMenuList = ref<OPT.RightMenu[]>([
    {
      label: () => t('menu.preview'),
      icon: 'preview-open',
      click: (item: RightMouseMessageItem) => {
        console.log('预览文件的参数：', item)
        nextTick(async () => {
          const path = 'previewFile'
          const LABEL = 'previewFile'

          const fileStatus: FileDownloadStatus = fileDownloadStore.getFileStatus(item.message.body.url)

          const currentChatRoomId = globalStore.currentSessionRoomId // 这个id可能为群id可能为用户uid，所以不能只用用户uid
          const currentUserUid = userStore.userInfo!.uid as string

          /**
           * 构建窗口所需的 payload 数据，用于传递文件预览相关的信息。
           *
           * 包括用户 ID、房间 ID、消息 ID、文件路径、类型、是否存在本地等。
           * 若本地存在文件，则 url 使用本地路径，否则使用远程 URL。
           *
           * @param item - 右键点击的消息项，包含文件的消息结构和用户信息。
           * @param type - 文件类型信息（扩展名和 MIME 类型），可为空。
           * @param localExists - 文件是否存在于本地，用于决定路径选择。
           * @returns 构建后的 payload 对象。
           */
          const buildPayload = (
            item: RightMouseMessageItem,
            type: FileTypeResult | undefined,
            localExists: boolean
          ) => {
            const payload = {
              userId: currentUserUid,
              roomId: currentChatRoomId,
              messageId: item.message.id,
              resourceFile: {
                fileName: item.message.body.fileName,
                absolutePath: fileStatus?.absolutePath,
                nativePath: fileStatus?.nativePath,
                url: item.message.body.url,
                type,
                localExists
              }
            }
            return payload
          }

          /**
           * 当本地文件不存在或获取元数据失败时，执行远程文件类型检测，并构建 fallback payload。
           *
           * 构建完成后通过窗口通信接口发送该 payload，供目标窗口使用。
           *
           * @returns Promise<void>
           */
          const fallbackToRemotePayload = async () => {
            const remoteType = await detectRemoteFileType({
              url: item.message.body.url,
              fileSize: Number(item.message.body.size)
            })
            const fallbackPayload = buildPayload(item, remoteType, false)
            await sendWindowPayload(LABEL, fallbackPayload)
          }

          // 这里不用状态中的absolute，是因为不能完全相信状态的绝对路径是否存在，有时不存在
          const resourceDirPath = await userStore.getUserRoomAbsoluteDir()
          const absolutePath = await join(resourceDirPath, item.message.body.fileName)

          // 获取文件元信息（判断文件是否已下载/存在）
          const result = await getFilesMeta<FilesMeta>([
            fileStatus?.absolutePath || absolutePath || item.message.body.url
          ])
          const fileMeta = result[0]

          try {
            // 如果本地不存在该文件，清空旧的下载状态，准备读取远程链接作为兜底
            if (!fileMeta.exists) {
              await fallbackToRemotePayload()
            } else {
              // 本地存在文件，构造 payload 使用本地路径和已知类型
              const payload = buildPayload(
                item,
                {
                  ext: fileMeta.file_type,
                  mime: fileMeta.mime_type
                },
                fileMeta.exists
              )

              await sendWindowPayload(LABEL, payload)
            }
          } catch (error) {
            // 本地信息获取失败，可能是路径非法或 RPC 异常，兜底走远程解析
            await fallbackToRemotePayload()
            console.error('检查文件出错：', error)
          }

          console.log('预览时刷新下载状态')
          await fileDownloadStore.refreshFileDownloadStatus({
            fileUrl: item.message.body.url,
            roomId: currentChatRoomId,
            userId: currentUserUid,
            fileName: item.message.body.fileName,
            exists: fileMeta.exists
          })

          // 最后创建用于预览文件的 WebView 窗口
          await createWebviewWindow('预览文件', path, 860, 720, '', true)
        })
      }
    },
    ...commonMenuList.value,
    {
      label: () => t('menu.save_as'),
      icon: 'Importing',
      click: async (item: RightMouseMessageItem) => {
        if (isMobile()) {
          window.$message.warning(t('home.chat_main.feature.coming_soon'))
          return
        }
        await saveFileAttachmentAs({
          url: item.message.body.url,
          downloadFile,
          defaultFileName: item.message.body.fileName
        })
      }
    },

    {
      label: () => (isMac() ? t('menu.show_in_finder') : t('menu.show_in_folder')),
      icon: 'file2',
      click: async (item: RightMouseMessageItem) => {
        console.log('打开文件夹的item项：', item)

        const fileUrl = item.message.body.url
        const fileName = item.message.body.fileName || extractFileName(fileUrl)

        // 检查文件是否已下载
        const fileStatus = fileDownloadStore.getFileStatus(fileUrl)

        console.log('找到的文件状态：', fileStatus)
        const currentChatRoomId = globalStore.currentSessionRoomId // 这个id可能为群id可能为用户uid，所以不能只用用户uid
        const currentUserUid = userStore.userInfo!.uid as string

        const resourceDirPath = await userStore.getUserRoomAbsoluteDir()
        let absolutePath = await join(resourceDirPath, fileName)

        const [fileMeta] = await getFilesMeta<FilesMeta>([fileStatus?.absolutePath || absolutePath || fileUrl])

        // 最后判断文件不存在本地，那就下载它
        if (!fileMeta.exists) {
          // 文件不存在本地
          const downloadMessage = window.$message.info(t('home.chat_main.file.download_prompt'))
          const _absolutePath = await fileDownloadStore.downloadFile(fileUrl, fileName)

          if (_absolutePath) {
            absolutePath = _absolutePath
            downloadMessage.destroy()
            window.$message.success(t('home.chat_main.file.save_success'))
            await revealInDirSafely(_absolutePath)
            await fileDownloadStore.refreshFileDownloadStatus({
              fileUrl: item.message.body.url,
              roomId: currentChatRoomId,
              userId: currentUserUid,
              fileName: item.message.body.fileName,
              exists: true
            })
            return
          } else {
            absolutePath = ''
            window.$message.error(t('home.chat_main.file.download_failed'))
            return
          }
        }

        await revealInDirSafely(absolutePath)
      }
    }
  ])
  /** 图片类型右键菜单 */
  const imageMenuList = ref<OPT.RightMenu[]>([
    {
      label: () => t('menu.copy'),
      icon: 'copy',
      click: async (item: MessageType) => {
        // 对于图片消息，优先使用 url 字段，回退到 content 字段
        const imageUrl = item.message.body.url || item.message.body.content
        await handleCopy(imageUrl, true, item.message.id)
      }
    },
    ...commonMenuList.value,
    {
      label: () => t('menu.save_as'),
      icon: 'Importing',
      click: async (item: MessageType) => {
        if (isMobile()) {
          window.$message.warning(t('home.chat_main.feature.coming_soon'))
          return
        }
        try {
          const imageUrl = item.message.body.url
          const suggestedName = imageUrl || 'image.png'

          // 这里会自动截取url后的文件名，可以尝试打印一下
          const savePath = await save({
            filters: [
              {
                name: '图片',
                extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
              }
            ],
            defaultPath: suggestedName
          })

          if (savePath) {
            await downloadFile(imageUrl, savePath)
          }
        } catch (error) {
          console.error('保存图片失败:', error)
          window.$message.error(t('home.chat_main.image.save_failed'))
        }
      }
    },
    {
      label: () => (isMac() ? t('menu.show_in_finder') : t('menu.show_in_folder')),
      icon: 'file2',
      click: async (item: MessageType) => {
        const fileUrl = item.message.body.url || item.message.body.content
        const fileName = item.message.body.fileName || extractFileName(fileUrl)
        if (!fileUrl || !fileName) {
          window.$message.warning(t('home.chat_main.image.locate_failed'))
          return
        }

        const fileStatus = fileDownloadStore.getFileStatus(fileUrl)
        const currentChatRoomId = globalStore.currentSessionRoomId
        const currentUserUid = userStore.userInfo!.uid as string

        const resourceDirPath = await userStore.getUserRoomAbsoluteDir()
        let absolutePath = await join(resourceDirPath, fileName)

        const [fileMeta] = await getFilesMeta<FilesMeta>([fileStatus?.absolutePath || absolutePath || fileUrl])

        if (!fileMeta.exists) {
          const downloadMessage = window.$message.info(t('home.chat_main.image.download_prompt'))
          const _absolutePath = await fileDownloadStore.downloadFile(fileUrl, fileName)

          if (_absolutePath) {
            absolutePath = _absolutePath
            downloadMessage.destroy()
            window.$message.success(t('home.chat_main.image.save_success'))
            await revealInDirSafely(_absolutePath)
            await fileDownloadStore.refreshFileDownloadStatus({
              fileUrl,
              roomId: currentChatRoomId,
              userId: currentUserUid,
              fileName,
              exists: true
            })
            return
          } else {
            absolutePath = ''
            window.$message.error(t('home.chat_main.image.download_failed'))
            return
          }
        }

        await revealInDirSafely(absolutePath)
      }
    }
  ])
  /** 右键用户信息菜单(群聊的时候显示) */
  const optionsList = ref<OPT.RightMenu[]>([
    {
      label: () => t('menu.send_message'),
      icon: 'message-action',
      click: (item: any) => {
        openMsgSession(item.uid || item.fromUser.uid)
      },
      visible: (item: any) => checkFriendRelation(item.uid || item.fromUser.uid, 'friend')
    },
    {
      label: 'TA',
      icon: 'aite',
      click: (item: any) => {
        useMitt.emit(MittEnum.AT, item.uid || item.fromUser.uid)
      },
      visible: (item: any) => (item.uid ? item.uid !== userUid.value : item.fromUser.uid !== userUid.value)
    },
    {
      label: () => t('menu.get_user_info'),
      icon: 'notes',
      click: (item: any, type: string) => {
        // 如果是聊天框内的资料就使用的是消息的key，如果是群聊成员的资料就使用的是uid
        const uid = item.uid || item.message.id
        useMitt.emit(`${MittEnum.INFO_POPOVER}-${type}`, { uid: uid, type: type })
      }
    },
    {
      label: () => t('menu.modify_group_nickname'),
      icon: 'edit',
      click: (item: any) => {
        const targetUid = item.uid || item.fromUser?.uid
        const currentUid = userUid.value
        const roomId = globalStore.currentSessionRoomId
        const isGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP

        if (!isGroup || targetUid !== currentUid) {
          return
        }

        const currentUserInfo = groupStore.getUserInfo(currentUid, roomId)
        const currentNickname = currentUserInfo?.myName || ''

        useMitt.emit(MittEnum.OPEN_GROUP_NICKNAME_MODAL, {
          roomId,
          currentUid,
          originalNickname: currentNickname
        } as GroupNicknameModalPayload)
      },
      visible: (item: any) => (item.uid ? item.uid === userUid.value : item.fromUser.uid === userUid.value)
    },
    {
      label: () => t('menu.add_friend'),
      icon: 'people-plus',
      click: async (item: any) => {
        await createWebviewWindow('申请加好友', 'addFriendVerify', 380, 300, '', false, 380, 300)
        globalStore.addFriendModalInfo.show = true
        globalStore.addFriendModalInfo.uid = item.uid || item.fromUser.uid
      },
      visible: (item: any) => !checkFriendRelation(item.uid || item.fromUser.uid, 'all')
    },
    {
      label: () => t('menu.set_admin'),
      icon: 'people-safe',
      click: async (item: any) => {
        const targetUid = item.uid || item.fromUser.uid
        const roomId = globalStore.currentSessionRoomId
        if (!roomId) return

        try {
          await groupStore.addAdmin([targetUid])
          window.$message.success(t('menu.set_admin_success'))
        } catch (_error) {
          window.$message.error(t('menu.set_admin_fail'))
        }
      },
      visible: (item: any) => {
        // 1. 检查是否在群聊中
        const isInGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        if (!isInGroup) return false

        // 2. 检查房间号是否为1(频道)
        const roomId = globalStore.currentSessionRoomId
        if (!roomId || roomId === '1') return false

        // 3. 获取目标用户ID
        const targetUid = item.uid || item.fromUser?.uid
        if (!targetUid) return false

        // 4. 检查目标用户角色
        let targetRoleId = item.roleId

        // 如果item中没有roleId，则通过uid从群成员列表中查找
        if (targetRoleId === void 0) {
          const targetUser = groupStore.userList.find((user) => user.uid === targetUid)
          targetRoleId = targetUser?.roleId
        }

        // 检查目标用户是否已经是管理员或群主
        if (targetRoleId === RoleEnum.ADMIN || targetRoleId === RoleEnum.LORD) return false

        // 5. 检查当前用户是否是群主
        const currentUser = groupStore.userList.find((user) => user.uid === userUid.value)
        return currentUser?.roleId === RoleEnum.LORD
      }
    },
    {
      label: () => t('menu.revoke_admin'),
      icon: 'reduce-user',
      click: async (item: any) => {
        const targetUid = item.uid || item.fromUser.uid
        const roomId = globalStore.currentSessionRoomId
        if (!roomId) return

        try {
          await groupStore.revokeAdmin([targetUid])
          window.$message.success(t('menu.revoke_admin_success'))
        } catch (_error) {
          window.$message.error(t('menu.revoke_admin_fail'))
        }
      },
      visible: (item: any) => {
        // 1. 检查是否在群聊中
        const isInGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        if (!isInGroup) return false

        // 2. 检查房间号是否为1(频道)
        const roomId = globalStore.currentSessionRoomId
        if (!roomId || roomId === '1') return false

        // 3. 获取目标用户ID
        const targetUid = item.uid || item.fromUser?.uid
        if (!targetUid) return false

        // 4. 检查目标用户角色
        let targetRoleId = item.roleId

        // 如果item中没有roleId，则通过uid从群成员列表中查找
        if (targetRoleId === void 0) {
          const targetUser = groupStore.userList.find((user) => user.uid === targetUid)
          targetRoleId = targetUser?.roleId
        }

        // 检查目标用户是否是管理员(只能撤销管理员,不能撤销群主)
        if (targetRoleId !== RoleEnum.ADMIN) return false

        // 5. 检查当前用户是否是群主
        const currentUser = groupStore.userList.find((user) => user.uid === userUid.value)
        return currentUser?.roleId === RoleEnum.LORD
      }
    }
  ])
  /** 举报选项 */
  const report = ref([
    {
      label: () => t('menu.remove_from_group'),
      icon: 'people-delete-one',
      click: async (item: any) => {
        const targetUid = item.uid || item.fromUser.uid
        const roomId = globalStore.currentSessionRoomId
        if (!roomId) return

        try {
          await removeGroupMember({ roomId, uidList: [targetUid] })
          // 从群成员列表中移除该用户
          groupStore.removeUserItem(targetUid, roomId)
          window.$message.success(t('menu.remove_from_group_success'))
        } catch (_error) {
          window.$message.error(t('menu.remove_from_group_fail'))
        }
      },
      visible: (item: any) => {
        // 1. 检查是否在群聊中
        const isInGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        if (!isInGroup) return false

        // 2. 检查房间号是否为1(频道)
        const roomId = globalStore.currentSessionRoomId
        if (!roomId || roomId === '1') return false

        // 3. 获取目标用户ID
        const targetUid = item.uid || item.fromUser?.uid
        if (!targetUid) return false

        // 4. 检查目标用户角色
        let targetRoleId = item.roleId

        // 如果item中没有roleId，则通过uid从群成员列表中查找
        if (targetRoleId === void 0) {
          const targetUser = groupStore.userList.find((user) => user.uid === targetUid)
          targetRoleId = targetUser?.roleId
        }

        // 检查目标用户是否是群主(群主不能被移出)
        if (targetRoleId === RoleEnum.LORD) return false

        // 5. 检查当前用户是否有权限(群主或管理员)
        const currentUser = groupStore.userList.find((user) => user.uid === userUid.value)
        const isLord = currentUser?.roleId === RoleEnum.LORD
        const isAdmin = currentUser?.roleId === RoleEnum.ADMIN

        // 6. 如果当前用户是管理员,则不能移出其他管理员
        if (isAdmin && targetRoleId === RoleEnum.ADMIN) return false

        return isLord || isAdmin
      }
    },
    {
      label: () => t('menu.report'),
      icon: 'caution',
      click: () => {}
    }
  ])
  /** emoji表情菜单 */
  const emojiList = computed(() => [
    {
      url: '/msgAction/like.png',
      value: 1,
      title: t('home.chat_reaction.like')
    },
    {
      url: '/msgAction/slightly-frowning-face.png',
      value: 2,
      title: t('home.chat_reaction.unsatisfied')
    },
    {
      url: '/msgAction/heart-on-fire.png',
      value: 3,
      title: t('home.chat_reaction.heart')
    },
    {
      url: '/msgAction/enraged-face.png',
      value: 4,
      title: t('home.chat_reaction.angry')
    },
    {
      url: '/emoji/party-popper.webp',
      value: 5,
      title: t('home.chat_reaction.party')
    },
    {
      url: '/emoji/rocket.webp',
      value: 6,
      title: t('home.chat_reaction.rocket')
    },
    {
      url: '/msgAction/face-with-tears-of-joy.png',
      value: 7,
      title: t('home.chat_reaction.lol')
    },
    {
      url: '/msgAction/clapping.png',
      value: 8,
      title: t('home.chat_reaction.clap')
    },
    {
      url: '/msgAction/rose.png',
      value: 9,
      title: t('home.chat_reaction.flower')
    },
    {
      url: '/msgAction/bomb.png',
      value: 10,
      title: t('home.chat_reaction.bomb')
    },
    {
      url: '/msgAction/exploding-head.png',
      value: 11,
      title: t('home.chat_reaction.question')
    },
    {
      url: '/msgAction/victory-hand.png',
      value: 12,
      title: t('home.chat_reaction.victory')
    },
    {
      url: '/msgAction/flashlight.png',
      value: 13,
      title: t('home.chat_reaction.light')
    },
    {
      url: '/msgAction/pocket-money.png',
      value: 14,
      title: t('home.chat_reaction.red_envelope')
    }
  ])

  /**
   * 检查用户关系
   * @param uid 用户ID
   * @param type 检查类型: 'friend' - 仅好友, 'all' - 好友或自己
   */
  const checkFriendRelation = (uid: string, type: 'friend' | 'all' = 'all') => {
    const contactStore = useContactStore()
    const userStore = useUserStore()
    const myUid = userStore.userInfo!.uid
    const isFriend = contactStore.contactsList.some((item) => item.uid === uid)
    return type === 'friend' ? isFriend && uid !== myUid : isFriend || uid === myUid
  }

  const extractMsgIdFromDataKey = (dataKey?: string | null) => {
    if (!dataKey) return ''
    return dataKey.replace(/^[A-Za-z]/, '')
  }

  const resolveSelectionMessageId = (selection: Selection): string => {
    const resolveElement = (node: Node | null) => {
      if (!node) return null
      return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
    }

    const anchorElement = resolveElement(selection.anchorNode)
    const focusElement = resolveElement(selection.focusNode)

    if (!anchorElement || !focusElement) return ''

    const anchorKey = anchorElement.closest('[data-key]')?.getAttribute('data-key')
    const focusKey = focusElement.closest('[data-key]')?.getAttribute('data-key')

    if (!anchorKey || !focusKey || anchorKey !== focusKey) {
      return ''
    }

    const chatMainElement = document.getElementById('image-chat-main')
    if (chatMainElement && (!chatMainElement.contains(anchorElement) || !chatMainElement.contains(focusElement))) {
      return ''
    }

    return extractMsgIdFromDataKey(anchorKey)
  }

  /**
   * 获取用户选中的文本（仅返回聊天气泡内的选择，并可校验消息ID）
   */
  const getSelectedText = (messageId?: string): string => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      return ''
    }

    const text = selection.toString().trim()
    if (!text) {
      return ''
    }

    const selectedMessageId = resolveSelectionMessageId(selection)
    if (!selectedMessageId) {
      return ''
    }

    if (messageId && selectedMessageId !== messageId) {
      return ''
    }

    return text
  }

  /**
   * 检查是否有文本被选中
   */
  const hasSelectedText = (messageId?: string): boolean => {
    return getSelectedText(messageId).length > 0
  }

  /**
   * 清除文本选择
   */
  const clearSelection = (): void => {
    const selection = window.getSelection()
    if (selection) {
      selection.removeAllRanges()
    }
  }

  /**
   * 处理复制事件
   * @param content 复制的内容（作为回退）
   * @param prioritizeSelection 是否优先复制选中的文本
   */
  const handleCopy = async (content: string | undefined, prioritizeSelection: boolean = true, messageId?: string) => {
    try {
      let textToCopy = content || ''
      let isSelectedText = false

      // 如果启用了优先选择模式，检查是否有选中的文本
      if (prioritizeSelection) {
        const selectedText = getSelectedText(messageId)
        if (selectedText) {
          textToCopy = selectedText
          isSelectedText = true
        }
      }

      // 检查内容是否为空
      if (!textToCopy) {
        window.$message?.warning('没有可复制的内容')
        return
      }

      // 如果是图片
      if (isImageUrl(textToCopy)) {
        try {
          const imageFormat = detectImageFormat(textToCopy)

          // 提示用户正在处理不同格式的图片
          if (imageFormat === 'GIF' || imageFormat === 'WEBP') {
            window.$message?.info(`正在将 ${imageFormat} 格式图片转换为 PNG 并复制...`)
          }

          // 使用 Tauri 的 clipboard API 复制图片（自动转换为 PNG 格式）
          const imageBytes = await imageUrlToUint8Array(textToCopy)
          await writeImage(imageBytes)

          const successMessage = imageFormat === 'PNG' ? '图片已复制到剪贴板' : '图片已转换为 PNG 格式并复制到剪贴板'
          window.$message?.success(successMessage)
        } catch (imageError) {
          console.error('图片复制失败:', imageError)
        }
      } else {
        // 如果是纯文本
        await writeText(removeTag(textToCopy))
        const message = isSelectedText ? '选中文本已复制' : '消息内容已复制'
        window.$message?.success(message)
      }
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  /**
   * 根据消息类型获取右键菜单列表
   * @param type 消息类型
   */
  const handleItemType = (type: MsgEnum) => {
    return type === MsgEnum.IMAGE || type === MsgEnum.EMOJI
      ? imageMenuList.value
      : type === MsgEnum.FILE
        ? fileMenuList.value
        : type === MsgEnum.VIDEO
          ? videoMenuList.value
          : menuList.value
  }

  /** 删除信息事件 */
  const handleConfirm = async () => {
    if (!delIndex.value) return
    const targetRoomId = delRoomId.value || globalStore.currentSessionRoomId
    if (!targetRoomId) {
      window.$message?.error('无法确定消息所属的会话')
      return
    }
    try {
      await invokeWithErrorHandler(
        TauriCommand.DELETE_MESSAGE,
        {
          messageId: delIndex.value,
          roomId: targetRoomId
        },
        {
          customErrorMessage: '删除消息失败',
          errorType: ErrorType.Client
        }
      )
      chatStore.deleteMsg(delIndex.value)
      useMitt.emit(MittEnum.UPDATE_SESSION_LAST_MSG, { roomId: targetRoomId })
      delIndex.value = ''
      delRoomId.value = ''
      modalShow.value = false
      window.$message?.success('消息已删除')
    } catch (error) {
      console.error('删除消息失败:', error)
    }
  }

  let activeKeyPressListener: ((e: KeyboardEvent) => void) | null = null

  const removeKeyPressListener = () => {
    if (activeKeyPressListener) {
      document.removeEventListener('keydown', activeKeyPressListener)
      activeKeyPressListener = null
    }
  }

  /** 点击气泡消息时候监听用户是否按下ctrl+c来复制内容 */
  const handleMsgClick = (item: MessageType) => {
    if (item.message.type === MsgEnum.VIDEO_CALL) {
      startRtcCall(CallTypeEnum.VIDEO)
      return
    } else if (item.message.type === MsgEnum.AUDIO_CALL) {
      startRtcCall(CallTypeEnum.AUDIO)
      return
    }

    // 移动端不触发 active 效果
    if (!isMobile()) {
      if (chatStore.msgMultiChooseMode === 'forward') {
        activeBubble.value = ''
      } else {
        activeBubble.value = item.message.id
      }
    }

    // 先移除可能残留的监听，避免重复绑定
    removeKeyPressListener()

    // 启用键盘监听
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'c') || (e.metaKey && e.key === 'c')) {
        // 优先复制用户选中的文本，如果没有选中则复制整个消息内容
        // 对于图片或其他类型的消息，优先使用 url 字段
        const contentToCopy = item.message.body.url || item.message.body.content
        handleCopy(contentToCopy, true, item.message.id)
        // 取消监听键盘事件，以免多次绑定
        removeKeyPressListener()
      }
    }
    activeKeyPressListener = handleKeyPress
    // 绑定键盘事件到 document
    document.addEventListener('keydown', handleKeyPress)
  }

  onUnmounted(() => {
    removeKeyPressListener()
  })

  return {
    handleMsgClick,
    handleConfirm,
    handleItemType,
    handleCopy,
    videoMenuList,
    getSelectedText,
    hasSelectedText,
    clearSelection,
    historyIndex,
    tips,
    modalShow,
    specialMenuList,
    optionsList,
    report,
    selectKey,
    emojiList,
    commonMenuList,
    scrollTop,
    groupNicknameModalVisible,
    groupNicknameValue,
    groupNicknameError,
    groupNicknameSubmitting,
    handleGroupNicknameConfirm,
    activeBubble
  }
}

export type UseChatMainContext = ReturnType<typeof useChatMain>
export const chatMainInjectionKey = Symbol('chatMainInjectionKey') as InjectionKey<UseChatMainContext>
