import { useCommon } from '@/hooks/useCommon.ts'
import { MittEnum, MsgEnum, PowerEnum, RoleEnum, RoomTypeEnum } from '@/enums'
import { MessageType } from '@/services/types.ts'
import { useMitt } from '@/hooks/useMitt.ts'
import { useChatStore } from '@/stores/chat.ts'
import apis from '@/services/apis.ts'
import { useContactStore } from '@/stores/contacts'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global.ts'
import { isDiffNow } from '@/utils/ComputedTime.ts'
import { writeText, writeImage } from '@tauri-apps/plugin-clipboard-manager'
import { detectImageFormat, imageUrlToUint8Array, isImageUrl } from '@/utils/imageUtils'
import { translateText } from '@/services/translate'
import { useSettingStore } from '@/stores/setting.ts'
import { save } from '@tauri-apps/plugin-dialog'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { type } from '@tauri-apps/plugin-os'
import { BaseDirectory } from '@tauri-apps/plugin-fs'
import { resourceDir } from '@tauri-apps/api/path'
import { join } from '@tauri-apps/api/path'
import { useDownload } from '@/hooks/useDownload'
import { useGroupStore } from '@/stores/group'
import { useWindow } from './useWindow'
import { useEmojiStore } from '@/stores/emoji'
import { useVideoViewer } from '@/hooks/useVideoViewer'

export const useChatMain = () => {
  const { removeTag, openMsgSession, userUid } = useCommon()
  const { createWebviewWindow } = useWindow()
  const { openVideoViewer, getLocalVideoPath, checkVideoDownloaded } = useVideoViewer()
  const settingStore = useSettingStore()
  const { chat } = storeToRefs(settingStore)
  const globalStore = useGlobalStore()
  const groupStore = useGroupStore()
  const chatStore = useChatStore()
  const emojiStore = useEmojiStore()
  const userStore = useUserStore()?.userInfo
  const { downloadFile } = useDownload()
  // const userInfo = useUserStore()?.userInfo
  // const chatMessageList = computed(() => chatStore.chatMessageList)
  // const messageOptions = computed(() => chatStore.currentMessageOptions)
  /** 滚动条位置 */
  const scrollTop = ref(-1)
  /** 是否是超级管理员 */
  // const isAdmin = computed(() => userInfo?.power === PowerEnum.ADMIN)
  /** 选中的气泡消息 */
  const activeBubble = ref('')
  /** 提醒框标题 */
  const tips = ref()
  /** 是否显示删除信息的弹窗 */
  const modalShow = ref(false)
  /** 需要删除信息的下标 */
  const delIndex = ref('')
  /** 记录历史消息下标 */
  const historyIndex = ref(0)
  /** 当前点击的用户的key */
  const selectKey = ref()

  /** 通用右键菜单 */
  const commonMenuList = ref<OPT.RightMenu[]>([
    {
      label: '添加到表情',
      icon: 'add-expression',
      click: async (item: MessageType) => {
        // 优先使用 url 字段，回退到 content 字段
        const imageUrl = item.message.body.url || item.message.body.content
        if (!imageUrl) {
          window.$message.error('获取图片地址失败')
          return
        }
        await emojiStore.addEmoji(imageUrl)
      },
      visible: (item: MessageType) => {
        return item.message.type === MsgEnum.IMAGE || item.message.type === MsgEnum.EMOJI
      }
    },
    {
      label: '转发',
      icon: 'share',
      click: () => {
        window.$message.warning('暂未实现')
      }
    },
    {
      label: '收藏',
      icon: 'collection-files',
      click: () => {
        window.$message.warning('暂未实现')
      }
    },
    {
      label: '回复',
      icon: 'reply',
      click: (item: any) => {
        useMitt.emit(MittEnum.REPLY_MEG, item)
      }
    },
    {
      label: '撤回',
      icon: 'corner-down-left',
      click: async (item: MessageType) => {
        const res = (await apis.recallMsg({ roomId: '1', msgId: item.message.id })) as any
        if (res) {
          window.$message.error(res)
          return
        }
        chatStore.updateRecallStatus({
          recallUid: item.fromUser.uid,
          msgId: item.message.id,
          roomId: item.message.roomId
        })
      },
      visible: (item: MessageType) => {
        // 判断当前选择的信息的发送时间是否超过2分钟
        if (isDiffNow({ time: item.message.sendTime, unit: 'minute', diff: 2 })) return
        // 判断自己是否是发送者或者是否是管理员
        const isCurrentUser = item.fromUser.uid === userUid.value
        const isAdmin = userStore?.power === PowerEnum.ADMIN
        return isCurrentUser || isAdmin
      }
    }
  ])
  /** 视频右键菜单 */
  const videoMenuList = ref<OPT.RightMenu[]>([
    {
      label: '复制',
      icon: 'copy',
      click: (item: MessageType) => {
        handleCopy(item.message.body.url, true)
      }
    },
    ...commonMenuList.value,
    {
      label: '预览',
      icon: 'play',
      click: async (item: MessageType) => {
        try {
          await openVideoViewer(item.message.body.url, [MsgEnum.VIDEO])
        } catch (error) {
          console.error('预览视频失败:', error)
          window.$message.error('预览视频失败')
        }
      }
    },
    {
      label: '另存为',
      icon: 'Importing',
      click: async (item: MessageType) => {
        try {
          const fileUrl = item.message.body.url
          const filename = fileUrl.split('/').pop() || 'file'

          const savePath = await save({
            defaultPath: filename,
            filters: [
              {
                name: 'Video',
                extensions: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm']
              }
            ]
          })
          if (savePath) {
            await downloadFile(item.message.body.url, savePath)
            window.$message.success('视频保存成功')
          }
        } catch (error) {
          console.error('保存视频失败:', error)
          window.$message.error('保存视频失败')
        }
      }
    },
    {
      label: type() === 'macos' ? '在Finder中显示' : '在文件夹中打开',
      icon: 'file2',
      click: async (item: MessageType) => {
        try {
          const localPath = await getLocalVideoPath(item.message.body.url)

          // 检查视频是否已下载
          const isDownloaded = await checkVideoDownloaded(item.message.body.url)

          if (!isDownloaded) {
            // 如果未下载，先下载视频
            await downloadFile(item.message.body.url, localPath, BaseDirectory.Resource)
          }

          // 获取视频的绝对路径
          const resourceDirPath = await resourceDir()
          const absolutePath = await join(resourceDirPath, localPath)
          // 在文件管理器中显示视频
          await revealItemInDir(absolutePath)
        } catch (error) {
          console.error('Failed to show video in folder:', error)
        }
      }
    }
  ])
  /** 右键消息菜单列表 */
  const menuList = ref<OPT.RightMenu[]>([
    {
      label: '复制',
      icon: 'copy',
      click: (item: MessageType) => {
        handleCopy(item.message.body.content, true)
      }
    },
    {
      label: '翻译',
      icon: 'translate',
      click: async (item: MessageType) => {
        const content = item.message.body.content
        const result = await translateText(content, chat.value.translate)
        // 将翻译结果添加到消息中
        if (!item.message.body.translatedText) {
          item.message.body.translatedText = {
            provider: result.provider,
            text: result.text
          }
        } else {
          delete item.message.body.translatedText
        }
      },
      visible: (item: MessageType) => {
        return item.message.type === MsgEnum.TEXT
      }
    },
    ...commonMenuList.value
  ])
  /** 右键菜单下划线后的列表 */
  const specialMenuList = ref<OPT.RightMenu[]>([
    {
      label: '删除',
      icon: 'delete',
      click: (item: any) => {
        tips.value = '删除后将不会出现在你的消息记录中，确定删除吗?'
        modalShow.value = true
        delIndex.value = item.message.id
      }
    }
  ])
  /** 文件类型右键菜单 */
  const fileMenuList = ref<OPT.RightMenu[]>([
    {
      label: '预览',
      icon: 'preview-open',
      click: (item: any) => {
        console.log(item)
      }
    },
    ...commonMenuList.value,
    {
      label: '另存为',
      icon: 'Importing',
      click: async (item: any) => {
        try {
          const fileUrl = item.message.body.url
          const filename = fileUrl.split('/').pop() || 'file'
          const savePath = await save({
            defaultPath: filename
          })
          if (savePath) {
            await downloadFile(fileUrl, savePath)
            window.$message.success('文件下载成功')
          }
        } catch (error) {
          console.error('保存文件失败:', error)
          window.$message.error('保存文件失败')
        }
      }
    },
    {
      label: type() === 'macos' ? '在Finder中显示' : '打开文件夹',
      icon: 'file2',
      click: async (item: any) => {
        try {
          const fileUrl = item.message.body.url
          const filename = fileUrl.split('/').pop() || 'file'
          const savePath = await save({
            defaultPath: filename
          })
          if (savePath) {
            await downloadFile(fileUrl, savePath)
            // 下载完成后在文件管理器中显示
            await revealItemInDir(savePath)
          }
        } catch (error) {
          console.error('显示文件失败:', error)
          window.$message.error('显示文件失败')
        }
      }
    }
  ])
  /** 图片类型右键菜单 */
  const imageMenuList = ref<OPT.RightMenu[]>([
    {
      label: '复制',
      icon: 'copy',
      click: async (item: MessageType) => {
        // 对于图片消息，优先使用 url 字段，回退到 content 字段
        const imageUrl = item.message.body.url || item.message.body.content
        await handleCopy(imageUrl, true)
      }
    },
    ...commonMenuList.value,
    {
      label: '另存为',
      icon: 'Importing',
      click: async (item: MessageType) => {
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
          window.$message.error('保存图片失败')
        }
      }
    },
    {
      label: type() === 'macos' ? '在Finder中显示' : '打开文件夹',
      icon: 'file2',
      click: async (item: MessageType) => {
        try {
          const imageUrl = item.message.body.url
          const suggestedName = imageUrl || 'image.png'

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
            // 下载完成后在文件管理器中显示
            await revealItemInDir(savePath)
          }
        } catch (error) {
          console.error('显示图片失败:', error)
          window.$message.error('显示图片失败')
        }
      }
    }
  ])
  /** 右键用户信息菜单(群聊的时候显示) */
  const optionsList = ref<OPT.RightMenu[]>([
    {
      label: '发送信息',
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
      label: '查看资料',
      icon: 'notes',
      click: (item: any, type: string) => {
        // 如果是聊天框内的资料就使用的是消息的key，如果是群聊成员的资料就使用的是uid
        const uid = item.uid || item.message.id
        useMitt.emit(`${MittEnum.INFO_POPOVER}-${type}`, { uid: uid, type: type })
      }
    },
    {
      label: '修改群昵称',
      icon: 'edit',
      click: () => {},
      visible: (item: any) => (item.uid ? item.uid === userUid.value : item.fromUser.uid === userUid.value)
    },
    {
      label: '添加好友',
      icon: 'people-plus',
      click: async (item: any) => {
        await createWebviewWindow('申请加好友', 'addFriendVerify', 380, 300, '', false, 380, 300)
        globalStore.addFriendModalInfo.show = true
        globalStore.addFriendModalInfo.uid = item.uid || item.fromUser.uid
      },
      visible: (item: any) => !checkFriendRelation(item.uid || item.fromUser.uid, 'all')
    },
    {
      label: '设为管理员',
      icon: 'people-safe',
      click: async (item: any) => {
        const targetUid = item.uid || item.fromUser.uid
        const roomId = globalStore.currentSession?.roomId
        if (!roomId) return

        try {
          await groupStore.addAdmin([targetUid])
          window.$message.success('设置管理员成功')
        } catch (error) {
          window.$message.error('设置管理员失败')
        }
      },
      visible: (item: any) => {
        // 1. 检查是否在群聊中
        const isInGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        if (!isInGroup) return false

        // 2. 检查房间号是否为1(频道)
        const roomId = globalStore.currentSession?.roomId
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
      label: '撤销管理员',
      icon: 'reduce-user',
      click: async (item: any) => {
        const targetUid = item.uid || item.fromUser.uid
        const roomId = globalStore.currentSession?.roomId
        if (!roomId) return

        try {
          await groupStore.revokeAdmin([targetUid])
          window.$message.success('撤销管理员成功')
        } catch (error) {
          window.$message.error('撤销管理员失败')
        }
      },
      visible: (item: any) => {
        // 1. 检查是否在群聊中
        const isInGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        if (!isInGroup) return false

        // 2. 检查房间号是否为1(频道)
        const roomId = globalStore.currentSession?.roomId
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
      label: '移出本群',
      icon: 'people-delete-one',
      click: async (item: any) => {
        const targetUid = item.uid || item.fromUser.uid
        const roomId = globalStore.currentSession?.roomId
        if (!roomId) return

        try {
          await apis.removeGroupMember({ roomId, uid: targetUid })
          // 从群成员列表中移除该用户
          groupStore.filterUser(targetUid)
          window.$message.success('移出群聊成功')
        } catch (error) {
          window.$message.error('移出群聊失败')
        }
      },
      visible: (item: any) => {
        // 1. 检查是否在群聊中
        const isInGroup = globalStore.currentSession?.type === RoomTypeEnum.GROUP
        if (!isInGroup) return false

        // 2. 检查房间号是否为1(频道)
        const roomId = globalStore.currentSession?.roomId
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
      label: '举报',
      icon: 'caution',
      click: () => {}
    }
  ])
  /** emoji表情菜单 */
  const emojiList = ref([
    {
      url: '/msgAction/like.png',
      value: 1,
      title: '好赞'
    },
    {
      url: '/msgAction/slightly-frowning-face.png',
      value: 2,
      title: '不满'
    },
    {
      url: '/msgAction/heart-on-fire.png',
      value: 3,
      title: '爱心'
    },
    {
      url: '/msgAction/enraged-face.png',
      value: 4,
      title: '愤怒'
    },
    {
      url: '/emoji/party-popper.webp',
      value: 5,
      title: '礼炮'
    },
    {
      url: '/emoji/rocket.webp',
      value: 6,
      title: '火箭'
    },
    {
      url: '/msgAction/face-with-tears-of-joy.png',
      value: 7,
      title: '笑哭'
    },
    {
      url: '/msgAction/clapping.png',
      value: 8,
      title: '鼓掌'
    },
    {
      url: '/msgAction/rose.png',
      value: 9,
      title: '鲜花'
    },
    {
      url: '/msgAction/bomb.png',
      value: 10,
      title: '炸弹'
    },
    {
      url: '/msgAction/exploding-head.png',
      value: 11,
      title: '疑问'
    },
    {
      url: '/msgAction/victory-hand.png',
      value: 12,
      title: '胜利'
    },
    {
      url: '/msgAction/flashlight.png',
      value: 13,
      title: '灯光'
    },
    {
      url: '/msgAction/pocket-money.png',
      value: 14,
      title: '红包'
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
    const myUid = userStore.userInfo.uid
    const isFriend = contactStore.contactsList.some((item) => item.uid === uid)
    return type === 'friend' ? isFriend && uid !== myUid : isFriend || uid === myUid
  }

  /**
   * 获取用户选中的文本
   */
  const getSelectedText = (): string => {
    const selection = window.getSelection()
    return selection ? selection.toString().trim() : ''
  }

  /**
   * 检查是否有文本被选中
   */
  const hasSelectedText = (): boolean => {
    const selection = window.getSelection()
    return selection ? selection.toString().trim().length > 0 : false
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
  const handleCopy = async (content: string | undefined, prioritizeSelection: boolean = true) => {
    try {
      let textToCopy = content || ''
      let isSelectedText = false

      // 如果启用了优先选择模式，检查是否有选中的文本
      if (prioritizeSelection) {
        const selectedText = getSelectedText()
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
  const handleConfirm = () => {
    chatStore.deleteMsg(delIndex.value)
    modalShow.value = false
  }

  /** 点击气泡消息时候监听用户是否按下ctrl+c来复制内容 */
  const handleMsgClick = (item: MessageType) => {
    activeBubble.value = item.message.id
    // 启用键盘监听
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'c') || (e.metaKey && e.key === 'c')) {
        // 优先复制用户选中的文本，如果没有选中则复制整个消息内容
        // 对于图片或其他类型的消息，优先使用 url 字段
        const contentToCopy = item.message.body.url || item.message.body.content
        handleCopy(contentToCopy, true)
        // 取消监听键盘事件，以免多次绑定
        document.removeEventListener('keydown', handleKeyPress)
      }
    }
    // 绑定键盘事件到 document
    document.addEventListener('keydown', handleKeyPress)
  }

  return {
    handleMsgClick,
    handleConfirm,
    handleItemType,
    handleCopy,
    videoMenuList,
    getSelectedText,
    hasSelectedText,
    clearSelection,
    activeBubble,
    historyIndex,
    tips,
    modalShow,
    specialMenuList,
    optionsList,
    report,
    selectKey,
    emojiList,
    commonMenuList,
    scrollTop
  }
}
