import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
}

interface AuthWorkspace {
  id: string
  name: string
  slug: string
  plan: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  workspace: AuthWorkspace | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: { email: string; password: string; name: string; workspace_name: string }) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      workspace: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        const { token, user, workspace } = res.data as { token: string; user: AuthUser; workspace: AuthWorkspace }

        localStorage.setItem('sg_token', token)
        set({ token, user, workspace, isAuthenticated: true })
      },

      signup: async (data) => {
        const res = await api.post('/auth/signup', data)
        const { token, user, workspace } = res.data as { token: string; user: AuthUser; workspace: AuthWorkspace }

        localStorage.setItem('sg_token', token)
        set({ token, user, workspace, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('sg_token')
        set({ token: null, user: null, workspace: null, isAuthenticated: false })
      },
    }),
    {
      name: 'sg-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        workspace: state.workspace,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
