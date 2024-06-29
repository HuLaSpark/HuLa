import { NButton, NFlex, NSelect, NSlider, NSwitch } from 'naive-ui'

export const Button = (title: string, icon: string) => {
  return (
    <>
      <NButton quaternary>
        <NFlex justify="center" align="center" size={6}>
          <svg class={'size-16px'}>
            <use href={`#${icon}`}></use>
          </svg>
          {title}
        </NFlex>
      </NButton>
    </>
  )
}

export const Select = (content: any[]) => {
  return (
    <>
      <NSelect class={'w-120px rounded-8px'} options={content} value={content[0].value}></NSelect>
    </>
  )
}

export const Slider = (max: number, min: number) => {
  const formatTooltip = (value: number) => `${value}px`
  return (
    <>
      <NSlider
        class={'w-160px'}
        defaultValue={14}
        formatTooltip={formatTooltip}
        showTooltip={true}
        max={max}
        min={min}
        step={1}></NSlider>
    </>
  )
}

export const Switch = () => {
  return (
    <>
      <NSwitch></NSwitch>
    </>
  )
}
