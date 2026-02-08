import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'

const Login = ({ userType: propUserType }) => {
  const [selectedType, setSelectedType] = useState(propUserType || 'admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:14',message:'Login form submitted',data:{email,selectedType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:18',message:'Sending login API request',data:{email,selectedType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const res = await api.post('/login', {
        email,
        password,
        type: selectedType,
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:25',message:'Login API response received',data:{userType:res.data.type,hasUser:!!res.data.user},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Session-based auth - store user info but no token needed
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('userType', res.data.type)
      
      toast.success(`Welcome, ${res.data.user.name}!`)
      
      // Store user info immediately - this is critical for ProtectedRoute to work
      localStorage.setItem('user', JSON.stringify(res.data.user))
      localStorage.setItem('userType', res.data.type)
      
      // Determine redirect path
      let redirectPath = '/admin/dashboard'
      if (selectedType === 'manager') {
        redirectPath = '/admin/dashboard' // Managers use admin dashboard
      } else if (selectedType === 'stylist') {
        redirectPath = '/stylist/dashboard'
      }
      
      console.log('Login successful, redirecting to:', redirectPath)
      console.log('User type:', res.data.type)
      console.log('User data stored in localStorage')
      
      // Check if we're on Vite dev server (localhost:5173) or Laravel (localhost:8000 or 127.0.0.1:8000)
      const currentOrigin = window.location.origin
      const isDevServer = currentOrigin.includes(':5173')
      
      // If on dev server, redirect to Laravel backend
      // Preserve the hostname (localhost or 127.0.0.1) to maintain cookie domain consistency
      // Otherwise, use relative path (will stay on same origin)
      let finalRedirectPath = redirectPath
      if (isDevServer) {
        // Determine backend hostname - prefer localhost but support 127.0.0.1
        const backendHost = currentOrigin.includes('127.0.0.1') ? 'http://127.0.0.1:8000' : 'http://localhost:8000'
        finalRedirectPath = `${backendHost}${redirectPath}`
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:52',message:'Calculated redirect path',data:{currentOrigin,isDevServer,redirectPath,finalRedirectPath,storedUserType:localStorage.getItem('userType')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.log('Current origin:', currentOrigin)
      console.log('Is dev server:', isDevServer)
      console.log('Final redirect path:', finalRedirectPath)
      
      // Force a full page reload to ensure session cookie is properly set and recognized
      // This is necessary for session-based authentication to work correctly
      // Use immediate redirect - localStorage is already set, ProtectedRoute will allow access
      console.log('Executing redirect to:', finalRedirectPath)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:82',message:'Executing window.location.href redirect',data:{finalRedirectPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      window.location.href = finalRedirectPath
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:86',message:'Login API error',data:{status:e.response?.status,message:e.response?.data?.message||e.message,errorDetails:e.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Login error:', e)
      console.error('Error response:', e.response)
      const errorMessage = e.response?.data?.message || e.response?.data?.errors?.email?.[0] || e.message || 'Login failed. Please check your credentials and try again.'
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Staff Login</h1>
          <p className="text-gray-600">Kaye's Hair Salon and Spa</p>
        </div>
        
        {/* User Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700">Login As</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedType('admin')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                selectedType === 'admin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Admin/Owner
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('manager')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                selectedType === 'manager'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Manager
            </button>
            <button
              type="button"
              onClick={() => setSelectedType('stylist')}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                selectedType === 'stylist'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Staff
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              {selectedType === 'admin' ? 'Username or Email' : selectedType === 'manager' ? 'Username' : 'Email or Phone'}
            </label>
            <input
              type="text"
              required
              className="w-full border rounded px-3 py-2 text-gray-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={
                selectedType === 'admin' ? 'admin' : 
                selectedType === 'manager' ? 'username' : 
                'email or phone'
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full border rounded px-3 py-2 pr-10 text-gray-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42L21 21M12 12l.01.01" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login
