import { create } from 'zustand'
import { everApplyApi } from '#/lib/api'

export interface User {
  id: string
  clerk_user_id: string
  email: string
  resume_url: string | null
  preferences: Record<string, unknown> | null
  is_free: boolean
  is_whitelisted: boolean
  is_paid: boolean
  trial_expired: boolean
  parsed_data: Record<string, unknown> | null
}

interface UserStore {
  user: User
  isFetched: boolean
  isLoading: boolean
  error: string | null
  fetchUser: (getToken: () => Promise<string | null>) => Promise<void>
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: {} as User,
  isFetched: false,
  isLoading: false,
  error: null,

  fetchUser: async (getToken) => {
    set({ isLoading: true, error: null })
    try {
      const user = await everApplyApi<User>('/users/me', getToken, {
        method: 'POST',
      })
      set({ user, isFetched: true, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  clearUser: () => set({ user: {} as User, isFetched: false, error: null }),
}))
