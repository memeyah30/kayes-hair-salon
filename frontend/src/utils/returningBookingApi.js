import axios from 'axios'

export const RETURNING_BOOKING_TOKEN_KEY = 'customer_returning_booking_token'
export const RETURNING_BOOKING_EMAIL_KEY = 'customer_returning_booking_email'
export const RETURNING_BOOKING_PENDING_EMAIL_KEY = 'customer_returning_booking_pending_email'

const resolveBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL || ''

  if (import.meta.env.DEV) {
    return '/api'
  }

  if (!configured) {
    return '/api'
  }

  return configured.endsWith('/api')
    ? configured
    : `${configured.replace(/\/+$/, '')}/api`
}

const returningBookingApi = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
})

returningBookingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(RETURNING_BOOKING_TOKEN_KEY)
  const email = localStorage.getItem(RETURNING_BOOKING_EMAIL_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (email) {
    config.headers['X-Customer-Email'] = email
  }

  return config
})

export default returningBookingApi
