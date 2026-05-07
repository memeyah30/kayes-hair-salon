import axios from 'axios'
import { normalizeApiPath } from './apiConfig'

const api = axios.create({
  baseURL: '',
  withCredentials: true, // Important for session-based auth
})

// Get CSRF token and add to requests
let csrfToken = null
let csrfTokenPromise = null

const clearAuthStorage = () => {
  localStorage.removeItem('user')
  localStorage.removeItem('userType')
}

const getCsrfToken = async () => {
  // If we already have a token, return it
  if (csrfToken) {
    return csrfToken
  }
  
  // If we're already fetching, wait for that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise
  }
  
  // Fetch new token
  csrfTokenPromise = axios.get(normalizeApiPath('/csrf-token'), {
    withCredentials: true
  }).then(response => {
    csrfToken = response.data.csrf_token
    csrfTokenPromise = null
    return csrfToken
  }).catch(error => {
    console.error('Failed to get CSRF token:', error)
    csrfTokenPromise = null
    return null
  })
  
  return csrfTokenPromise
}

// Add CSRF token to all requests
api.interceptors.request.use(async (config) => {
  window.dispatchEvent(new CustomEvent('global-loading-start'))
  if (config.url) {
    config.url = normalizeApiPath(config.url)
  }

  const currentUserType = localStorage.getItem('userType')
  if (currentUserType && !config.headers['X-User-Type']) {
    config.headers['X-User-Type'] = currentUserType
  }

  // Only add CSRF token for state-changing methods
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
    try {
      const token = await getCsrfToken()
      if (token) {
        // Always add as header
        config.headers['X-CSRF-TOKEN'] = token
        // Also add to FormData if it exists (Laravel accepts both)
        if (config.data instanceof FormData) {
          config.data.append('_token', token)
        }
      }
    } catch (error) {
      console.error('Error getting CSRF token:', error)
    }
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('global-loading-finish'))
    return response
  },
  async (error) => {
    window.dispatchEvent(new CustomEvent('global-loading-finish'))
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || ''
      const isSessionProbe = requestUrl.includes('/me')
      const isAuthRequest = requestUrl.includes('/login') || requestUrl.includes('/csrf-token')

      // Allow auth/session probes to be handled by caller logic (e.g., ProtectedRoute).
      if (!isSessionProbe && !isAuthRequest) {
        const currentUserType = localStorage.getItem('userType') || 'admin'
        const loginPath =
          currentUserType === 'manager'
              ? '/login/manager'
              : '/login'

        clearAuthStorage()
        window.location.href = loginPath
      }
    }
    // Handle CSRF token mismatch - refresh token and retry
    if (error.response?.status === 419 && error.config && !error.config._csrfRetried) {
      csrfToken = null // Reset token to fetch new one
      csrfTokenPromise = null
      try {
        const newToken = await getCsrfToken()
        if (newToken && error.config) {
          error.config._csrfRetried = true
          // Update the request with new token
          error.config.headers['X-CSRF-TOKEN'] = newToken
          if (error.config.data instanceof FormData) {
            error.config.data.append('_token', newToken)
          }
          // Retry the request
          return api.request(error.config)
        }
      } catch (retryError) {
        console.error('Failed to retry after CSRF error:', retryError)
      }
    }
    return Promise.reject(error)
  }
)

export default api
