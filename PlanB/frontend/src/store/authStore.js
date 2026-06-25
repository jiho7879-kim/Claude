import { create } from 'zustand'
import api from '../lib/api'

let _fetchMeRunning = false

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  fetchMe: async () => {
    if (_fetchMeRunning) return
    _fetchMeRunning = true

    const params = new URLSearchParams(window.location.search)
    const urlToken   = params.get('token')
    const urlRefresh = params.get('refresh')
    if (urlToken) {
      localStorage.setItem('access_token', urlToken)
      if (urlRefresh) localStorage.setItem('refresh_token', urlRefresh)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const token = localStorage.getItem('access_token')
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false })
      _fetchMeRunning = false
      return
    }

    try {
      const { data } = await api.get('/api/auth/me/')
      set({ user: data, isAuthenticated: true, isLoading: false })
    } catch (err) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken && err?.response?.status === 401) {
        try {
          const { data } = await api.post('/api/auth/token/refresh/', { refresh: refreshToken })
          localStorage.setItem('access_token', data.access)
          const { data: me } = await api.get('/api/auth/me/')
          set({ user: me, isAuthenticated: true, isLoading: false })
          _fetchMeRunning = false
          return
        } catch {}
      }
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, isAuthenticated: false, isLoading: false })
    } finally {
      _fetchMeRunning = false
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    _fetchMeRunning = false
    set({ user: null, isAuthenticated: false, isLoading: true })
    window.location.href = '/login'
  },
}))

export default useAuthStore
