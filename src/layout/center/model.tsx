import type { TransferRenderTargetLabel, TransferRenderSourceList } from 'naive-ui'
import { NAvatar, NCheckbox } from 'naive-ui'
import { useContactStore } from '@/stores/contacts.ts'
import { useUserInfo } from '@/hooks/useCached.ts'
import { AvatarUtils } from '@/utils/AvatarUtils'
import apis from '@/services/apis'

const contactStore = useContactStore()
export const options = computed(() =>
  contactStore.contactsList.map((item) => ({
    label: useUserInfo(item.uid).value.name,
    value: item.uid,
    avatar: AvatarUtils.getAvatarUrl(useUserInfo(item.uid).value.avatar!)
  }))
)

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

export const renderSourceList: TransferRenderSourceList = ({ onCheck, checkedOptions, pattern }) => {
  const filteredOptions = pattern
    ? options.value.filter((option) => option.label?.toLowerCase().includes(pattern.toLowerCase()))
    : options.value

  return (
    <div>
      {filteredOptions.map((option) => {
        const checked = checkedOptions.some((o) => o.value === option.value)
        return (
          <div
            key={option.value}
            style={{
              userSelect: 'none',
              display: 'flex',
              margin: '4px 0',
              padding: '4px 8px',
              cursor: 'pointer',
              alignItems: 'center',
              borderRadius: '3px',
              fontSize: '14px',
              transition: 'background-color .3s var(--n-bezier)'
            }}
            class="hover:bg-[var(--n-item-color-pending)]"
            onClick={() => {
              const index = checkedOptions.findIndex((o) => o.value === option.value)
              if (index === -1) {
                onCheck([...checkedOptions.map((o) => o.value), option.value])
              } else {
                const newCheckedOptions = [...checkedOptions]
                newCheckedOptions.splice(index, 1)
                onCheck(newCheckedOptions.map((o) => o.value))
              }
            }}>
            <NCheckbox checked={checked} style={{ marginRight: '12px' }} />
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
