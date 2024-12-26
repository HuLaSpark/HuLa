import { useCommon } from '@/hooks/useCommon.ts'

function getBaseDate(): string {
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = String(currentDate.getMonth() + 1).padStart(2, '0') // 月份从0开始，需要加1
  const day = String(currentDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getImageCache(subFolder: string): string {
  const { userUid } = useCommon()
  return 'cache/' + String(userUid.value) + '/' + subFolder + '/'
}

export { getImageCache, getBaseDate }
