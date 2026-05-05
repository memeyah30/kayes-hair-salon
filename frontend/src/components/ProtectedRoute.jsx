import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../utils/api'

const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const [isValidating, setIsValidating] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true

    const clearAuthStorage = () => {
      localStorage.removeItem('user')
      localStorage.removeItem('userType')
    }

    const validateAuth = async () => {
      try {
        const storedType = localStorage.getItem('userType') || ''
        const preferredType = storedType && (
          allowedTypes.length === 0 || allowedTypes.includes(storedType)
        )
          ? storedType
          : ''

        const requestConfig = preferredType
          ? {
              params: { type: preferredType },
              headers: { 'X-User-Type': preferredType },
            }
          : {}
        const res = await api.get('/me', requestConfig)
        const currentUserType = res.data.type

        localStorage.setItem('user', JSON.stringify(res.data))
        localStorage.setItem('userType', currentUserType)
        window.dispatchEvent(new Event('user:updated'))

        if (!mounted) return
        if (allowedTypes.length > 0 && !allowedTypes.includes(currentUserType)) {
          setIsAuthorized(false)
        } else {
          setIsAuthorized(true)
        }
      } catch {
        clearAuthStorage()
        if (!mounted) return
        setIsAuthorized(false)
      } finally {
        if (mounted) setIsValidating(false)
      }
    }

    validateAuth()

    return () => {
      mounted = false
    }
  }, [allowedTypes])

  if (isValidating) {
    return (
      <div className="min-h-screen app-panel-bg flex items-center justify-center">
        <div>Verifying authentication...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    const loginPath = allowedTypes[0] === 'manager'
      ? '/login/manager'
      : '/login'
    return <Navigate to={loginPath} replace />
  }

  return children
}

export default ProtectedRoute
