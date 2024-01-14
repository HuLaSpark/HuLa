<template>
  <div ref="containerRef">
    <!--    <slot></slot>-->
    <!--    <Teleport to="body">-->
    <!--      <Transition @before-enter="handleBeforeEnter" @enter="handleEnter">-->
    <!--        <div v-if="showMenu" class="context-menu" :style="{left: `${x}px`, top: `${y}px`}"></div>-->
    <!--      </Transition>-->
    <!--    </Teleport>-->
  </div>
</template>

<script setup lang="ts">
// const { menu } = defineProps({
//   menu: {
//     type: Array,
//     default: () => []
//   }
// })
// const containerRef = ref(null)
// const emit = defineEmits(['select'])
// const { x, y, showMenu } = useContextMenu(containerRef)
//
// const useContextMenu = (container) => {
//   const x = ref(0)
//   const y = ref(0)
//   const showMenu = ref(false)
//   const openMenu = (e) => {
//     e.preventDefault()
//     e.stopPropagation()
//     showMenu.value = true
//     x.value = e.clientX
//     y.value = e.clientY
//   }
//
//   const closeMenu = () => {
//     showMenu.value = false
//   }
//
//   onMounted(() => {
//     container.addEventListener('contextmenu', openMenu)
//     window.addEventListener('click', closeMenu, true)
//     window.addEventListener('contextmenu', closeMenu, true)
//   })
//
//   onUnmounted(() => {
//     container.removeEventListener('contextmenu', openMenu)
//   })
//
//   return {
//     x, y, showMenu, handleClick
//   }
// }
//
// const handleClick = (item) => {
//   showMenu.value = false
//   emit('select', item)
// }
//
// const handleBeforeEnter = (el) => {
//   el.style.height = 0
// }
//
// const handleEnter = (el) => {
//   el.style.height = 'auto'
//   const h = el.clientHeight
//   el.style.height = 0
//   requestAnimationFrame(() => {
//     el.style.height = `${h}px`
//     el.style.transition = '.5s'
//   })
// }
</script>
