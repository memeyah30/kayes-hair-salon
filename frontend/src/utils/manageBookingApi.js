import axios from 'axios'
import { normalizeApiPath } from './apiConfig'

export const CUSTOMER_BOOKING_TOKEN_KEY = 'customer_manage_booking_token'
export const CUSTOMER_BOOKING_EMAIL_KEY = 'customer_manage_booking_email'
export const CUSTOMER_BOOKING_PENDING_EMAIL_KEY = 'customer_manage_booking_pending_email'

const manageBookingApi = axios.create({
  baseURL: '',
  withCredentials: true,
})

manageBookingApi.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeApiPath(config.url)
  }

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
