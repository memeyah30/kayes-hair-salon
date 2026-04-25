import { isBackendHostedAssetPath, resolveApiOrigin } from './apiConfig'

export const resolveBackendOrigin = () => {
  return resolveApiOrigin()
}

const extractPathname = (value) => {
  try {
    return new URL(value).pathname || ''
  } catch {
    return ''
  }
}

export const resolveAssetUrl = (path) => {
  if (!path) return null

  if (/^https?:\/\//i.test(path)) {
    const normalizedAbsolutePath = extractPathname(path).replace(/^\/+/, '')
    if (isBackendHostedAssetPath(normalizedAbsolutePath)) {
      if (import.meta.env.DEV) {
        return `/${normalizedAbsolutePath}`
      }
      return `${resolveBackendOrigin()}/${normalizedAbsolutePath}`
    }

    return path
  }

  const normalizedPath = String(path).replace(/^\/+/, '')

  if (isBackendHostedAssetPath(normalizedPath)) {
    if (import.meta.env.DEV) {
      return `/${normalizedPath}`
    }
    return `${resolveBackendOrigin()}/${normalizedPath}`
  }

  return `/${normalizedPath}`
}
