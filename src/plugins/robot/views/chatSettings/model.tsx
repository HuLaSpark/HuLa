import {
  NButton,
  NFlex,
  NSelect,
  NSlider,
  NSwitch,
  NInput,
  NInputNumber,
  NConfigProvider,
  GlobalThemeOverrides
} from 'naive-ui'

/** 单独设置数字输入框的主题 */
const commonTheme: GlobalThemeOverrides = {
  Input: {
    borderRadius: '10px',
    borderHover: '1px solid #ccc',
    border: '1px solid #ccc',
    borderDisabled: '1px solid #ccc',
    borderFocus: '1px solid #ccc',
    boxShadowFocus: '1px solid #ccc'
  }
}

export const Button = defineComponent(
  (props: { title: string; icon?: string; isSecondary?: boolean }) => {
    const loading = ref(false)
    const handleClick = () => {
      loading.value = true
      setTimeout(() => {
        loading.value = false
      }, 1000)
    }
    return () => (
      <NButton
        loading={loading.value}
        onClick={handleClick}
        type={props.isSecondary ? 'error' : 'default'}
        quaternary={!props.isSecondary}
        secondary={props.isSecondary}
        size={'small'}>
        {{
          icon: () =>
            props.icon ? (
              <svg class={'size-12px'}>
                <use href={`#${props.icon}`}></use>
              </svg>
            ) : (
              void 0
            ),
          default: () => props.title
        }}
      </NButton>
    )
  },
  {
    props: ['title', 'icon', 'isSecondary']
  }
)

export const Select = defineComponent(
  (props: { content: any[] }) => {
    const v = ref(props.content[0].value)
    return () => (
      <NSelect
        class={'w-120px rounded-8px'}
        consistentMenuWidth={false}
        size={'small'}
        v-model:value={v.value}
        options={props.content}
        value={props.content[0].value}></NSelect>
    )
  },
  {
    props: ['content']
  }
)

export const Slider = defineComponent(
  (props: { value: number; max: number; min: number; isDecimal?: boolean }) => {
    const v = ref(props.value)
    const formatTooltip = (value: number) => `${value}px`
    return () => (
      <NFlex align={'center'} size={12}>
        <NConfigProvider themeOverrides={commonTheme}>
          <NInputNumber min={props.min} max={props.max} class={'w-80px'} v-model:value={v.value} size="tiny" />
        </NConfigProvider>
        <NSlider
          class={'w-160px'}
          formatTooltip={formatTooltip}
          v-model:value={v.value}
          max={props.max}
          min={props.min}></NSlider>
      </NFlex>
    )
  },
  {
    props: ['value', 'max', 'min']
  }
)

export const Switch = defineComponent(
  (props: { active: boolean }) => {
    const v = ref(props.active)
    return () => (
      <NSwitch v-model:value={v.value} class={'text-(12px [--chat-text-color])'} size={'small'}>
        {{
          checked: () => '开启',
          unchecked: () => '关闭'
        }}
      </NSwitch>
    )
  },
  {
    props: ['active']
  }
)

export const Input = defineComponent(
  (props: { value: string; isPassword?: boolean }) => {
    const v = ref(props.value)
    return () => (
      <NConfigProvider themeOverrides={commonTheme}>
        <NInput
          style={{ width: '160px' }}
          v-model:value={v.value}
          type={props.isPassword ? 'password' : 'text'}
          size={'small'}
          showPasswordOn={'click'}></NInput>
      </NConfigProvider>
    )
  },
  { props: ['value', 'isPassword'] }
)

export const InputNumber = defineComponent(
  (props: { value: number; max: number; min: number }) => {
    const v = ref(props.value)
    return () => (
      <NInputNumber
        style={{ width: '120px', borderRadius: '10px', border: '1px solid #ccc' }}
        min={props.min}
        max={props.max}
        v-model:value={v.value}
        step={100}
        size={'small'}></NInputNumber>
    )
  },
  { props: ['value'] }
)
