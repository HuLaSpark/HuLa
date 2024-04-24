const DISTANCE = 35 // 距离
const DURATION = 300 // 持续时间

const map = new WeakMap() // 弱引用映射

/** 创建观察器 */
const ob = new IntersectionObserver((entries: any) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const animation = map.get(entry.target) // 获取映射中的动画
      if (animation) {
        animation.play() // 播放动画
        ob.unobserve(entry.target) // 停止观察该元素
      }
    }
  }
})

function isBelowViewport(el: any) {
  return el.getBoundingClientRect().top - DISTANCE > window.innerHeight // 判断元素是否在视口下方
}

export default {
  mounted(el: any) {
    if (!isBelowViewport(el)) return // 如果元素在视口内，则不执行下面的代码
    const animation = el.animate(
      [
        {
          transform: `translateY(${DISTANCE}px)`,
          opacity: 0.5
        },
        {
          transform: 'translateY(0)',
          opacity: 1
        }
      ],
      {
        duration: DURATION, // 设置动画持续时间
        easing: 'ease-in-out', // 设置动画缓动效果
        fill: 'forwards' // 设置动画填充模式
      }
    )
    animation.pause() // 暂停动画
    ob.observe(el) // 开始观察该元素
    map.set(el, animation) // 将动画对象存入映射中
  },
  unmounted(el: any) {
    ob.unobserve(el) // 停止观察该元素
  }
}
