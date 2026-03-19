import { queryOptions } from '@tanstack/react-query'
import { everApplyApi } from '#/lib/api'
import type { User } from '#/stores/useUserStore'

export const userQueryOptions = (getToken: () => Promise<string | null>) =>
  queryOptions({
    queryKey: ['user', 'me'],
    queryFn: () =>
      everApplyApi<User>('/users/me', getToken, { method: 'POST' }),
  })
