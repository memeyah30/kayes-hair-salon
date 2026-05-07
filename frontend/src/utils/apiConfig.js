const trimTrailingSlashes = (value) => String(value || '').replace(/\/+$/, '')

const stripApiSuffix = (value) => trimTrailingSlashes(value).replace(/\/api$/i, '')

const getConfiguredApiUrl = () => trimTrailingSlashes(import.meta.env.VITE_API_URL || '')

export const normalizeApiPath = (path) => {
  const value = String(path || '')

  if (!value) {
    return '/api'
  }

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(value) || value.startsWith('//')) {
    return value
  }

  if (value === '/api' || value.startsWith('/api/')) {
    return value
  }

  if (value.startsWith('/')) {
    return `/api${value}`
  }

  return `/api/${value}`
}

export const resolveApiOrigin = () => {
  const configured = getConfiguredApiUrl()

  if (configured) {
    return stripApiSuffix(configured)
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:'
    const hostname = window.location.hostname || '127.0.0.1'
    return `${protocol}//${hostname}:8000`
  }

  return 'http://127.0.0.1:8000'
}

export const resolveApiBaseUrl = ({ withApiPrefix = false } = {}) => {
  if (import.meta.env.DEV) {
    return withApiPrefix ? '/api' : ''
  }

  const configured = getConfiguredApiUrl()

  if (!configured) {
    return withApiPrefix ? '/api' : ''
  }

  if (withApiPrefix) {
    return configured.endsWith('/api') ? configured : `${configured}/api`
  }

  return stripApiSuffix(configured)
}

export const isBackendHostedAssetPath = (path) => {
  const normalized = String(path || '').replace(/^\/+/, '')

  return /^(storage|uploads)\b/i.test(normalized)
}
