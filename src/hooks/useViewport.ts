const vw = ref(document.documentElement.clientWidth)
const vh = ref(document.documentElement.clientHeight)

/** 获取视口的宽高 */
export const useViewport = () => {
  window.addEventListener('resize', () => {
    vw.value = document.documentElement.clientWidth
    vh.value = document.documentElement.clientHeight
  })
  return {
    vw,
    vh
  }
}
