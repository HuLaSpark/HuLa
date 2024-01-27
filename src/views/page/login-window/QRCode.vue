import router from '@/router' import { delay } from 'lodash-es' const loading = ref(true) const loadText =
ref('加载中...') const QRCode = ref('HuLa-IM-Tauri') const toLogin = () => { router.push('/login') } // TODO
做一个二维码过期时间重新刷新二维码的功能 (nyh -> 2024-01-27 00:37:18) onMounted(() => { delay(() => { loading.value =
false loadText.value = '请使用HuLaApp扫码登录' }, 1000) })
