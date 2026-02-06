import axios from 'axios'

// In development, use relative URLs so Vite proxy works
// In production, use the full URL
// If accessing from Laravel backend directly, use relative URLs to stay on same origin
const baseURL = import.meta.env.DEV 
  ? '' // Use relative URLs in dev (Vite proxy will handle it)
  : (import.meta.env.VITE_API_URL || '') // Use relative URLs when served from Laravel (same origin)

const api = axios.create({
  baseURL,
  withCredentials: true, // Important for session-based auth
})

// Get CSRF token and add to requests
let csrfToken = null
let csrfTokenPromise = null

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
  const csrfBaseURL = import.meta.env.DEV 
    ? '' // Use relative URLs in dev
    : (import.meta.env.VITE_API_URL || '') // Use relative URLs when served from Laravel (same origin)
  
  csrfTokenPromise = axios.get(`${csrfBaseURL}/csrf-token`, {
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
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login/admin'
    }
    // Handle CSRF token mismatch - refresh token and retry
    if (error.response?.status === 419) {
      csrfToken = null // Reset token to fetch new one
      csrfTokenPromise = null
      try {
        const newToken = await getCsrfToken()
        if (newToken && error.config) {
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

