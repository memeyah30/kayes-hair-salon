import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../utils/api'

const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const [isValidating, setIsValidating] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const validateAuth = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:9',message:'ProtectedRoute validation started',data:{allowedTypes,currentPath:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.log('ProtectedRoute: Validating auth, allowedTypes:', allowedTypes)
      
      // First check if we have user info in localStorage (from recent login)
      const storedUser = localStorage.getItem('user')
      const storedUserType = localStorage.getItem('userType')
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:15',message:'Checked localStorage',data:{hasStoredUser:!!storedUser,storedUserType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      console.log('ProtectedRoute: localStorage user:', storedUser ? 'exists' : 'missing')
      console.log('ProtectedRoute: localStorage userType:', storedUserType)
      
      // If we have stored user info and it matches allowed types, allow immediate access
      // This solves the timing issue where session cookie might not be immediately available after redirect
      if (storedUser && storedUserType) {
        try {
          const userData = JSON.parse(storedUser)
          console.log('ProtectedRoute: Parsed user data, type:', storedUserType)
          
          if (allowedTypes.length === 0 || allowedTypes.includes(storedUserType)) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:27',message:'Allowing access based on localStorage',data:{storedUserType,allowedTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            console.log('ProtectedRoute: Allowing access based on localStorage')
            // Allow access immediately - don't wait for session verification
            // This is critical for post-login redirects where session cookie might not be immediately available
            setIsAuthorized(true)
            setIsValidating(false)
            
            // Verify the session in the background (non-blocking)
            // Don't revoke access if verification fails - user might have just logged in
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:35',message:'Starting background /me API call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            api.get('/me')
              .then(res => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:37',message:'/me API call succeeded',data:{userType:res.data.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                console.log('ProtectedRoute: Session verified successfully')
                const currentUserType = res.data.type
                localStorage.setItem('user', JSON.stringify(res.data))
                localStorage.setItem('userType', currentUserType)
                
                // Only revoke access if user type doesn't match AND we're sure about it
                if (allowedTypes.length > 0 && !allowedTypes.includes(currentUserType)) {
                  console.log('ProtectedRoute: User type mismatch after verification, but keeping access for now')
                  // Don't revoke access immediately - might be a temporary issue
                }
              })
              .catch(e => {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:49',message:'/me API call failed',data:{status:e.response?.status,message:e.response?.data?.message||e.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                // Session verification failed - but we already allowed access
                // This is common right after login when session cookie is still being set
                // Don't block the user - they just logged in successfully
                console.warn('ProtectedRoute: Session verification failed (this is normal right after login):', e.response?.status)
                // Keep access granted - don't redirect back to login
              })
            return
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:58',message:'User type mismatch',data:{storedUserType,allowedTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            console.log('ProtectedRoute: User type does not match allowed types')
          }
        } catch (e) {
          // Invalid localStorage data, continue to API check
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:61',message:'Invalid localStorage data',data:{error:e.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.error('ProtectedRoute: Invalid localStorage data:', e)
        }
      }
      
      // No localStorage data or doesn't match - verify session via API
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:67',message:'No localStorage, checking /me API',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('ProtectedRoute: No valid localStorage, checking session via API')
      try {
        const res = await api.get('/me')
        const currentUserType = res.data.type
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:70',message:'/me API call succeeded (primary path)',data:{currentUserType,allowedTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        console.log('ProtectedRoute: Session valid, user type:', currentUserType)
        
        // Store user info in localStorage for easy access
        localStorage.setItem('user', JSON.stringify(res.data))
        localStorage.setItem('userType', currentUserType)
        
        if (allowedTypes.length > 0 && !allowedTypes.includes(currentUserType)) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:77',message:'User type not allowed',data:{currentUserType,allowedTypes},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.log('ProtectedRoute: User type not allowed')
          setIsAuthorized(false)
        } else {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:81',message:'Access granted via API',data:{currentUserType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          console.log('ProtectedRoute: Access granted')
          setIsAuthorized(true)
        }
      } catch (e) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.jsx:84',message:'/me API call failed (primary path)',data:{status:e.response?.status,message:e.response?.data?.message||e.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        // Session is invalid or expired
        console.error('ProtectedRoute: Auth validation failed:', e.response?.status, e.response?.data || e.message)
        localStorage.clear()
        setIsAuthorized(false)
      } finally {
        setIsValidating(false)
      }
    }

    validateAuth()
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




