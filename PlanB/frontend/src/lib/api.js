import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let _refreshing = false
let _queue = []

const processQueue = (error, token = null) => {
  _queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  _queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry || window.location.pathname === '/login') {
      return Promise.reject(error)
    }

    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }

    if (_refreshing) {
      return new Promise((resolve, reject) => {
        _queue.push({ resolve, reject })
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    _refreshing = true

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL || ''}/api/auth/token/refresh/`,
        { refresh: refreshToken }
      )
      localStorage.setItem('access_token', data.access)
      api.defaults.headers.common.Authorization = `Bearer ${data.access}`
      processQueue(null, data.access)
      original.headers.Authorization = `Bearer ${data.access}`
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    } finally {
      _refreshing = false
    }
  }
)

export default api
