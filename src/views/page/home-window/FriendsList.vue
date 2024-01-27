import Mitt from '@/utils/Bus.ts' /* 建议把此状态存入localStorage中 */ const activeItem = ref(0) const detailsShow =
ref(false) const handleClick = (index: number) => { detailsShow.value = true activeItem.value = index
Mitt.emit('detailsShow', detailsShow.value) } // todo 需要循环数组来展示分组 const showMenu = (event: MouseEvent) => {
console.log(event) } const handleSelect = (event: MouseEvent) => { console.log(event) } onUnmounted(() => {
detailsShow.value = false Mitt.emit('detailsShow', detailsShow.value) })
