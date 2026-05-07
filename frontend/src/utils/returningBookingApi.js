import axios from 'axios'
import { normalizeApiPath } from './apiConfig'
import {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from './manageBookingApi'

export const RETURNING_BOOKING_TOKEN_KEY = 'customer_returning_booking_token'
export const RETURNING_BOOKING_EMAIL_KEY = 'customer_returning_booking_email'
export const RETURNING_BOOKING_PENDING_EMAIL_KEY = 'customer_returning_booking_pending_email'

const returningBookingApi = axios.create({
  baseURL: '',
  withCredentials: true,
})

returningBookingApi.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeApiPath(config.url)
  }

  const token = localStorage.getItem(RETURNING_BOOKING_TOKEN_KEY)
    || localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY)
  const email = localStorage.getItem(RETURNING_BOOKING_EMAIL_KEY)
    || localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (email) {
    config.headers['X-Customer-Email'] = email
  }

  return config
})

export default returningBookingApi
