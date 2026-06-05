import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
})

// Request interceptor — read token from Zustand persisted store
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('electrofix-admin-v2')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.token) config.headers.Authorization = `Bearer ${state.token}`
    }
  } catch {}
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong'
    if (error.response?.status === 401) {
      // Clear stored auth and redirect
      try {
        const stored = localStorage.getItem('electrofix-admin-v2')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.state.admin = null
          parsed.state.token = null
          localStorage.setItem('electrofix-admin-v2', JSON.stringify(parsed))
        }
      } catch {}
      window.location.href = '/login'
    } else if (error.response?.status !== 404) {
      toast.error(message)
    }
    return Promise.reject(error)
  }
)

export default api
