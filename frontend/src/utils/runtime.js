export const resolveBackendOrigin = () => {
  const configured = import.meta.env.VITE_BACKEND_ORIGIN || ''
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:'
    const hostname = window.location.hostname || '127.0.0.1'
    return `${protocol}//${hostname}:8000`
  }

  return 'http://127.0.0.1:8000'
}

export const resolveAssetUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path

  const normalizedPath = String(path).replace(/^\/+/, '')

  if (import.meta.env.DEV) {
    return `${resolveBackendOrigin()}/${normalizedPath}`
  }

  return `/${normalizedPath}`
}
