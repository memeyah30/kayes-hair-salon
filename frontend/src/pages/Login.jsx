import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import { resolveBackendOrigin } from '../utils/runtime'

const Login = ({ userType: propUserType }) => {
  const initialType = propUserType === 'manager' ? 'manager' : 'admin'
  const [selectedType, setSelectedType] = useState(initialType)
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
      
      // Session-based auth - keep auth identity tab-scoped to avoid
      // admin/manager/staff data leaking between tabs.
      const serializedUser = JSON.stringify(res.data.user)
      sessionStorage.setItem('user', serializedUser)
      sessionStorage.setItem('userType', res.data.type)
      localStorage.removeItem('user')
      localStorage.removeItem('userType')

      toast.success(`Welcome, ${res.data.user.name}!`)
      
      // Determine redirect path
      const redirectPath = '/admin/dashboard'
      
      console.log('Login successful, redirecting to:', redirectPath)
      console.log('User type:', res.data.type)
      console.log('User data stored in sessionStorage')
      
      // Check if we're on Vite dev server (localhost:5173) or Laravel (localhost:8000 or 127.0.0.1:8000)
      const currentOrigin = window.location.origin
      const isDevServer = currentOrigin.includes(':5173')
      
      // If on dev server, redirect to Laravel backend
      // Preserve the hostname (localhost or 127.0.0.1) to maintain cookie domain consistency
      // Otherwise, use relative path (will stay on same origin)
      let finalRedirectPath = redirectPath
      if (isDevServer) {
        finalRedirectPath = `${resolveBackendOrigin()}${redirectPath}`
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.jsx:52',message:'Calculated redirect path',data:{currentOrigin,isDevServer,redirectPath,finalRedirectPath,storedUserType:(sessionStorage.getItem('userType') || localStorage.getItem('userType'))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
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

  const loginLabel = selectedType === 'admin'
    ? 'Username or Email'
    : 'Username'

  const loginPlaceholder = selectedType === 'admin'
    ? 'admin'
    : ''

  return (
    <div className="min-h-screen bg-[#dfe4f3] p-3 sm:p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl overflow-hidden rounded-2xl md:rounded-[30px] border border-[#d3daee] bg-[#eef2fb] shadow-[0_22px_60px_rgba(58,79,133,0.2)]">
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <section className="bg-gradient-to-br from-[#8ea3f1] via-[#7d95e8] to-[#6c84dc] px-5 sm:px-8 py-8 sm:py-10 text-white lg:min-h-[700px] lg:rounded-r-[220px] lg:px-12 lg:py-14">
            <div className="flex h-full flex-col justify-between gap-12">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/75">Management Portal</p>
                <h1 className="mt-6 text-[clamp(2rem,8vw,3.25rem)] font-semibold leading-none">Welcome!</h1>
                <p className="mt-6 max-w-md text-sm sm:text-base md:text-lg text-white/90">
                  Manage appointments, services, and salon operations from one secure dashboard.
                </p>
              </div>
              <div>
                <p className="mb-4 text-sm md:text-base text-white/90">Need customer booking instead?</p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="tap-safe rounded-xl border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white hover:text-[#5f74d0]"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </section>

          <section className="px-4 sm:px-6 py-7 sm:py-8 lg:px-12 lg:py-14">
            <div className="mx-auto w-full max-w-md">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[clamp(2rem,8vw,3rem)] font-semibold text-[#394667]">Sign in</h2>
                  <p className="mt-2 text-sm text-[#6f7ea5]">Kaye&apos;s Hair Salon and Spa</p>
                </div>
                <button
                  type="button"
                  onClick={() => !loading && navigate('/')}
                  className="tap-safe rounded-xl border border-[#c7d2f0] px-4 py-2 text-xs font-semibold text-[#5e74cb] hover:bg-[#e8edfb]"
                >
                  Close
                </button>
              </div>

              <div className="mt-8">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#7784aa]">Role</label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#dde5f7] p-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedType('admin')}
                    className={`tap-safe rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold ${
                      selectedType === 'admin'
                        ? 'bg-white text-[#5670ca]'
                        : 'text-[#6f7ca3] hover:bg-white/80'
                    }`}
                  >
                    Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedType('manager')}
                    className={`tap-safe rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold ${
                      selectedType === 'manager'
                        ? 'bg-white text-[#5670ca]'
                        : 'text-[#6f7ca3] hover:bg-white/80'
                    }`}
                  >
                    Manager
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d698f]">{loginLabel}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#90a0c8]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 1 1 14 0" />
                        <circle cx="12" cy="8" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      required
                      className="tap-safe w-full rounded-xl border border-[#c6d1ef] bg-[#f2f5fc] py-3 pl-10 pr-3 text-[#31405f] outline-none focus:border-[#7d94e9] focus:ring-2 focus:ring-[#8da3ef]/30"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={loginPlaceholder}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#5d698f]">Password</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#90a0c8]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      className="tap-safe w-full rounded-xl border border-[#c6d1ef] bg-[#f2f5fc] py-3 pl-10 pr-10 text-[#31405f] outline-none focus:border-[#7d94e9] focus:ring-2 focus:ring-[#8da3ef]/30"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="********"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f8fb8] hover:text-[#5d74ce]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42L21 21M12 12l.01.01" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="tap-safe mt-2 w-full rounded-xl bg-gradient-to-r from-[#6f86da] to-[#5672d0] px-4 py-3 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(72,97,185,0.34)] hover:from-[#617ad6] hover:to-[#4f69c8] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Login



