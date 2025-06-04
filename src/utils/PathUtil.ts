import { useCommon } from '@/hooks/useCommon.ts'

function getPathCache(subFolder: string): string {
  const { userUid } = useCommon()
  return 'cache/' + String(userUid.value) + '/' + subFolder + '/'
}

export { getPathCache }
