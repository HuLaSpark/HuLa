import router from '../router'
import { useGlobalStore } from '../stores/global'

/**
 * 跳转到移动端用户详情页
 * @param uid 用户uid
 */
export const toFriendInfoPage = (uid: string): void => {
  const globalStore = useGlobalStore()

  globalStore.addFriendModalInfo.uid = uid
  router.push(`/mobile/mobileFriends/friendInfo/${uid}`)
}
