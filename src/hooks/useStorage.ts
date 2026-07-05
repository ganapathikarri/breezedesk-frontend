import { useQuery } from '@tanstack/react-query'
import { storageApi } from '../lib/api'
import { formatBytes } from '../lib/format'

export const useStorageInfo = () =>
  useQuery({
    queryKey: ['storage-info'],
    queryFn: storageApi.info,
    staleTime: 30_000,
    retry: 1,
  })

export { formatBytes }
