import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

// const modules = import.meta.glob('../views/page/*.vue')
const { VITE_APP_TITLE, VITE_TITLE_SUFFIX, BASE_URL } = import.meta.env
const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/page/Login.vue')
  },
  {
    path: '/',
    name: 'page',
    component: () => import('@/layout/index.vue')
  }
]

// 创建路由
const router: any = createRouter({
  history: createWebHistory(BASE_URL),
  routes
})

// 注意：刷新页面会导致页面路由重置
// export const setRoutes = (menus?: MenuItem[]) => {
//   if (!menus || !menus.length) {
//     const manager = localStorage.getItem('localUserInfo')
//     if (!manager) {
//       return
//     }
//     menus = JSON.parse(manager).loginInfo.menus
//   }
//   if (menus?.length) {
//     /**
//      * 动态添加路由
//      * @param routeItem
//      */
//     const addDynamicRoute = (routeItem: MenuItem) => {
//       if (routeItem.page) {
//         /*添加views文件夹中page文件下面的全部.vue文件*/
//         router.addRoute('page', {
//           path: routeItem.path,
//           name: routeItem.page,
//           meta: { title: routeItem.name, icon: routeItem.icon, requiresAuth: true, dynamicAdded: true },
//           component: () => import(`@/views/page/${routeItem.page}.vue`)
//         })
//       }
//     }
//     menus.forEach((item) => {
//       addDynamicRoute(item)
//       if (item.children && item.children.length) {
//         item.children.forEach((sub) => {
//           addDynamicRoute(sub)
//         })
//       }
//     })
//   }
// }
// setRoutes()

//重置路由的方法
export const resetRouter = () => {
  // 获得当前路由器所有的路由记录
  const currentRoutes = router.getRoutes()
  // 过滤出动态添加的路由记录
  currentRoutes.forEach((route: any) => {
    if (route.meta && route.meta.dynamicAdded) {
      router.removeRoute(route.name)
    }
  })
}

// 路由前置守卫
router.beforeEach(async (to: any, _from: any, next: any) => {
  /*设置页面标题和标题后缀*/
  document.title = to.meta.title ? to.meta.title + VITE_TITLE_SUFFIX : VITE_APP_TITLE
  // 如果要访问的路径不存在(没有匹配的路由记录)
  if (!to.matched.length) {
    return next('/:catchAll(.*)') // 重定向到捕获所有路径的路由
  }
  // 其他情况，继续路由导航
  next()
})

export default router
