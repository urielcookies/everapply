import { create } from 'zustand'
import { everApplyApi } from '#/lib/api'

interface User {
  id: string
  clerk_user_id: string
  email: string
  resume_url: string | null
  preferences: Record<string, unknown> | null
  is_free: boolean
  parsed_data: Record<string, unknown> | null
}

interface UserStore {
  user: User | null
  isLoading: boolean
  error: string | null
  fetchUser: (getToken: () => Promise<string | null>) => Promise<void>
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  fetchUser: async (getToken) => {
    set({ isLoading: true, error: null })
    try {
      const user = await everApplyApi<User>('/users/me', getToken, {
        method: 'POST',
      })
      set({ user, isLoading: false })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  clearUser: () => set({ user: null, error: null }),
}))
