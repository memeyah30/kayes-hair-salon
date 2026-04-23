import { isBackendHostedAssetPath, resolveApiOrigin } from './apiConfig'

export const resolveBackendOrigin = () => {
  return resolveApiOrigin()
}

export const resolveAssetUrl = (path) => {
  if (!path) return null
  if (/^https?:\/\//i.test(path)) return path

  const normalizedPath = String(path).replace(/^\/+/, '')

  if (isBackendHostedAssetPath(normalizedPath)) {
    return `${resolveBackendOrigin()}/${normalizedPath}`
  }

  return `/${normalizedPath}`
}
