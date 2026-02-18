import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../utils/api'

const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const [isValidating, setIsValidating] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let mounted = true

    const validateAuth = async () => {
      try {
        const res = await api.get('/me')
        const currentUserType = res.data.type

        localStorage.setItem('user', JSON.stringify(res.data))
        localStorage.setItem('userType', currentUserType)

        if (!mounted) return
        if (allowedTypes.length > 0 && !allowedTypes.includes(currentUserType)) {
          setIsAuthorized(false)
        } else {
          setIsAuthorized(true)
        }
      } catch {
        localStorage.clear()
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
      <div className="min-h-screen bg-[#f7f1ec] flex items-center justify-center">
        <div>Verifying authentication...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <Navigate to={`/login/${allowedTypes[0] || 'admin'}`} replace />
  }

  return children
}

export default ProtectedRoute
