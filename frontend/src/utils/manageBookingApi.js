import axios from 'axios'

export const CUSTOMER_BOOKING_TOKEN_KEY = 'customer_manage_booking_token'
export const CUSTOMER_BOOKING_EMAIL_KEY = 'customer_manage_booking_email'
export const CUSTOMER_BOOKING_PENDING_EMAIL_KEY = 'customer_manage_booking_pending_email'

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

const manageBookingApi = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: false,
})

manageBookingApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY)
  const email = localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (email) {
    config.headers['X-Customer-Email'] = email
  }

  return config
})

export default manageBookingApi

