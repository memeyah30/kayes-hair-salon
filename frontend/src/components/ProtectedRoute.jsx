import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../utils/api'

const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const [isValidating, setIsValidating] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const token = localStorage.getItem('token')
  const userType = localStorage.getItem('userType')

  useEffect(() => {
    const validateAuth = async () => {
      if (!token) {
        setIsAuthorized(false)
        setIsValidating(false)
        return
      }

      // Verify token is valid by checking user endpoint
      try {
        const res = await api.get('/me')
        const currentUserType = res.data.type || userType
        
        if (allowedTypes.length > 0 && !allowedTypes.includes(currentUserType)) {
          setIsAuthorized(false)
        } else {
          setIsAuthorized(true)
        }
      } catch (e) {
        // Token is invalid or expired
        localStorage.clear()
        setIsAuthorized(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateAuth()
  }, [token, userType, allowedTypes])

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div>Verifying authentication...</div>
      </div>
    )
  }

  if (!token || !isAuthorized) {
    return <Navigate to={`/login/${allowedTypes[0] || 'admin'}`} replace />
  }

  return children
}

export default ProtectedRoute

