import axios from 'axios'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sg_token') : null
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout only when the server explicitly rejects the token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window === 'undefined') return Promise.reject(err)

    const status = err.response?.status
    const message: string = err.response?.data?.error ?? ''

    // Only logout if the server says the token is invalid/expired —
    // NOT on network errors, timeouts, or unrelated 401s (e.g. file upload bugs)
    const isTokenError =
      status === 401 &&
      (message.toLowerCase().includes('token') ||
       message.toLowerCase().includes('unauthorized') ||
       message.toLowerCase().includes('jwt') ||
       message === 'Unauthorized')

    if (isTokenError) {
      localStorage.removeItem('sg_token')
      // Use Next.js router-friendly navigation instead of hard reload
      window.dispatchEvent(new CustomEvent('sg:logout'))
    }

    return Promise.reject(err)
  }
)
