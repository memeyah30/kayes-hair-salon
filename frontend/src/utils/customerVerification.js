import {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_PENDING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from './manageBookingApi'
import {
  RETURNING_BOOKING_EMAIL_KEY,
  RETURNING_BOOKING_PENDING_EMAIL_KEY,
  RETURNING_BOOKING_TOKEN_KEY,
} from './returningBookingApi'

export const CUSTOMER_BOOKING_VERIFIED_KEY = 'customer_manage_booking_verified'
export const CUSTOMER_BOOKING_NAME_KEY = 'customer_manage_booking_name'
export const RETURNING_BOOKING_VERIFIED_KEY = 'customer_returning_booking_verified'

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const normalizeName = (name) => String(name || '').trim().replace(/\s+/g, ' ')

const readValue = (key) => {
  if (typeof window === 'undefined') return ''
  return String(window.localStorage.getItem(key) || '').trim()
}

export const getManageBookingVerifiedEmail = () => {
  if (!isManageBookingVerified()) return ''
  return normalizeEmail(readValue(CUSTOMER_BOOKING_EMAIL_KEY))
}

export const getManageBookingVerifiedName = () => (
  normalizeName(readValue(CUSTOMER_BOOKING_NAME_KEY))
)

export const isManageBookingVerified = () => {
  const token = readValue(CUSTOMER_BOOKING_TOKEN_KEY)
  const email = normalizeEmail(readValue(CUSTOMER_BOOKING_EMAIL_KEY))
  const flag = readValue(CUSTOMER_BOOKING_VERIFIED_KEY)
  return Boolean(token && email) && (flag === '' || flag === 'true')
}

export const setManageBookingPendingEmail = (email) => {
  if (typeof window === 'undefined') return
  const normalizedEmail = normalizeEmail(email)
  if (normalizedEmail) {
    window.localStorage.setItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY, normalizedEmail)
  } else {
    window.localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
  }
}

export const persistManageBookingVerification = ({ email, token }) => {
  if (typeof window === 'undefined') return
  const normalizedEmail = normalizeEmail(email)
  const nextToken = String(token || readValue(CUSTOMER_BOOKING_TOKEN_KEY)).trim()

  if (nextToken) {
    window.localStorage.setItem(CUSTOMER_BOOKING_TOKEN_KEY, nextToken)
  }
  if (normalizedEmail) {
    window.localStorage.setItem(CUSTOMER_BOOKING_EMAIL_KEY, normalizedEmail)
  }

  window.localStorage.setItem(CUSTOMER_BOOKING_VERIFIED_KEY, 'true')
  window.localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
}

export const setManageBookingVerifiedName = (name) => {
  if (typeof window === 'undefined') return
  const normalizedName = normalizeName(name)
  if (normalizedName) {
    window.localStorage.setItem(CUSTOMER_BOOKING_NAME_KEY, normalizedName)
  } else {
    window.localStorage.removeItem(CUSTOMER_BOOKING_NAME_KEY)
  }
}

export const clearManageBookingVerification = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(CUSTOMER_BOOKING_TOKEN_KEY)
  window.localStorage.removeItem(CUSTOMER_BOOKING_EMAIL_KEY)
  window.localStorage.removeItem(CUSTOMER_BOOKING_NAME_KEY)
  window.localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
  window.localStorage.removeItem(CUSTOMER_BOOKING_VERIFIED_KEY)
  window.localStorage.removeItem('customer_email')
  window.localStorage.removeItem('customer_phone')
}

export const getReturningBookingPendingEmail = () => (
  normalizeEmail(readValue(RETURNING_BOOKING_PENDING_EMAIL_KEY))
)

export const getReturningBookingVerifiedEmail = () => {
  if (!isReturningBookingVerified()) return ''
  return normalizeEmail(readValue(RETURNING_BOOKING_EMAIL_KEY))
}

export const isReturningBookingVerified = () => {
  const token = readValue(RETURNING_BOOKING_TOKEN_KEY)
  const email = normalizeEmail(readValue(RETURNING_BOOKING_EMAIL_KEY))
  const flag = readValue(RETURNING_BOOKING_VERIFIED_KEY)
  return Boolean(token && email) && (flag === '' || flag === 'true')
}

export const setReturningBookingPendingEmail = (email) => {
  if (typeof window === 'undefined') return
  const normalizedEmail = normalizeEmail(email)
  if (normalizedEmail) {
    window.localStorage.setItem(RETURNING_BOOKING_PENDING_EMAIL_KEY, normalizedEmail)
  } else {
    window.localStorage.removeItem(RETURNING_BOOKING_PENDING_EMAIL_KEY)
  }
}

export const persistReturningBookingVerification = ({ email, token }) => {
  if (typeof window === 'undefined') return
  const normalizedEmail = normalizeEmail(email)
  const nextToken = String(token || readValue(RETURNING_BOOKING_TOKEN_KEY)).trim()

  if (nextToken) {
    window.localStorage.setItem(RETURNING_BOOKING_TOKEN_KEY, nextToken)
  }
  if (normalizedEmail) {
    window.localStorage.setItem(RETURNING_BOOKING_EMAIL_KEY, normalizedEmail)
  }

  window.localStorage.setItem(RETURNING_BOOKING_VERIFIED_KEY, 'true')
  window.localStorage.removeItem(RETURNING_BOOKING_PENDING_EMAIL_KEY)
}

export const clearReturningBookingVerification = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(RETURNING_BOOKING_TOKEN_KEY)
  window.localStorage.removeItem(RETURNING_BOOKING_EMAIL_KEY)
  window.localStorage.removeItem(RETURNING_BOOKING_PENDING_EMAIL_KEY)
  window.localStorage.removeItem(RETURNING_BOOKING_VERIFIED_KEY)
}
