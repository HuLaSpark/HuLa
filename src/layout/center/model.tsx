import type { TransferRenderTargetLabel, TransferRenderSourceList } from 'naive-ui'
import { NAvatar, NCheckbox } from 'naive-ui'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import apis from '@/services/apis'
import { useGroupStore } from '@/stores/group.ts'
import { useGlobalStore } from '@/stores/global.ts'

const contactStore = useContactStore()
const groupStore = useGroupStore()
const globalStore = useGlobalStore()

export const options = computed(
  () =>
    contactStore.contactsList.map((item) => ({
      label: useUserInfo(item.uid).value.name,
      value: item.uid,
      avatar: AvatarUtils.getAvatarUrl(useUserInfo(item.uid).value.avatar!)
    })) as any
)

// 获取已禁用选项的值列表
export const getDisabledOptions = () => {
  // 当前选中的房间id
  const currentRoomId = globalStore.currentSession?.roomId

  if (!currentRoomId || !groupStore.userList.length) return []

  // 确保返回群内所有成员的UID
  const result = groupStore.userList.map((member) => member.uid)
  return result
}

// 获取过滤后的选项列表
export const getFilteredOptions = () => {
  // 获取禁用选项列表
  const disabledOptions = getDisabledOptions()
  // 当前选中的房间id
  const currentRoomId = globalStore.currentSession?.roomId
  // 如果没有房间ID，返回所有好友
  if (!currentRoomId) return options.value

  // 标记已在群内的好友
  return options.value.map((option: { value: string; label: string; avatar?: string; [key: string]: any }) => {
    const isInGroup = disabledOptions.includes(option.value)

    if (isInGroup) {
      // 对于已在群内的好友，添加禁用标记，但保持所有原始属性不变
      return {
        ...option,
        disabled: true
      }
    } else {
      // 对于未在群内的好友，保持原样
      return option
    }
  })
}

export const createGroup = async (selectedUids: string[]) => {
  try {
    const uidList = selectedUids.map((uid) => uid)
    const result = await apis.createGroup({ uidList })
    return result
  } catch (error) {
    console.error('创建群聊失败:', error)
    throw error
  }
}

// 统一的源列表渲染函数，通过参数控制是否使用过滤后的选项
export const renderSourceList = (useFiltered = false): TransferRenderSourceList => {
  return ({ onCheck, checkedOptions, pattern }) => {
    // 根据参数决定使用哪个选项列表
    const baseOptions = useFiltered ? getFilteredOptions() : options.value

    // 根据搜索模式进一步过滤
    const displayOptions = pattern
      ? baseOptions.filter((option: { label: string }) => option.label?.toLowerCase().includes(pattern.toLowerCase()))
      : baseOptions

    return (
      <div>
        {displayOptions.map((option: any) => {
          // 判断是否被禁用(已在群内)
          const isDisabled = option.disabled === true
          // 如果被禁用(已在群内)或已被选中，则显示为选中状态
          const checked = isDisabled || checkedOptions.some((o) => o.value === option.value)

          return (
            <div
              key={option.value}
              style={{
                userSelect: 'none',
                display: 'flex',
                margin: '4px 0',
                padding: '4px 8px',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                alignItems: 'center',
                borderRadius: '3px',
                fontSize: '14px',
                opacity: isDisabled ? 0.5 : 1,
                transition: 'background-color .3s var(--n-bezier)'
              }}
              class={isDisabled ? '' : 'hover:bg-[var(--n-item-color-pending)]'}
              onClick={() => {
                if (isDisabled) return

                const index = checkedOptions.findIndex((o) => o.value === option.value)
                if (index === -1) {
                  onCheck([...checkedOptions.map((o) => o.value), option.value])
                } else {
                  const newCheckedOptions = [...checkedOptions]
                  newCheckedOptions.splice(index, 1)
                  onCheck(newCheckedOptions.map((o) => o.value))
                }
              }}>
              <NCheckbox checked={checked} disabled={isDisabled} style={{ marginRight: '12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                {option.avatar ? (
                  <NAvatar round src={option.avatar} size={24} fallbackSrc="/logo.png" />
                ) : (
                  <NAvatar round size={24}>
                    {option.label?.slice(0, 1)}
                  </NAvatar>
                )}
                <div style={{ marginLeft: '12px', fontSize: '14px' }}>{option.label}</div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

export const renderLabel: TransferRenderTargetLabel = ({ option }: { option: any }) => {
  return (
    <div style={{ display: 'flex', margin: '6px 0' }}>
      {option.avatar ? (
        <NAvatar round src={option.avatar} size={24} fallbackSrc="/logo.png" />
      ) : (
        <NAvatar round size={24}>
          {option.label.slice(0, 1)}
        </NAvatar>
      )}
      <div style={{ display: 'flex', marginLeft: '12px', alignSelf: 'center', fontSize: '14px' }}>{option.label}</div>
    </div>
  )
}
