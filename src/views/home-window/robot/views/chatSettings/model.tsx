import {
  NButton,
  NFlex,
  NSelect,
  NSlider,
  NSwitch,
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
  },
  Button: {
    textColorHover: '#red'
  }
}

export const Button = (title: string, icon: string) => {
  return (
    <>
      <NButton quaternary size={'small'}>
        <NFlex justify="center" align="center" size={6}>
          <svg class={'size-12px'}>
            <use href={`#${icon}`}></use>
          </svg>
          <p class={'text-12px'}>{title}</p>
        </NFlex>
      </NButton>
    </>
  )
}

export const Select = (content: any[]) => {
  return (
    <>
      <NSelect
        class={'w-120px rounded-8px'}
        consistentMenuWidth={false}
        size={'small'}
        options={content}
        value={content[0].value}></NSelect>
    </>
  )
}

export const Slider = defineComponent(
  (props: { value: number; max: number; min: number }) => {
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
          min={props.min}
          step={1}></NSlider>
      </NFlex>
    )
  },
  {
    props: ['value', 'max', 'min']
  }
)

export const Switch = () => {
  return (
    <>
      <NSwitch class={'text-(12px [--chat-text-color])'} size={'small'}>
        {{
          checked: () => '开启',
          unchecked: () => '关闭'
        }}
      </NSwitch>
    </>
  )
}
