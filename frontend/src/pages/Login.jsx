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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isFormFocused, setIsFormFocused] = useState(false)
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

  const loginLabel = selectedType === 'admin'
    ? 'Username or Email'
    : selectedType === 'manager'
      ? 'Username'
      : 'Email or Phone'

  const loginPlaceholder = selectedType === 'admin'
    ? 'admin'
    : selectedType === 'manager'
      ? 'manager_username'
      : 'email or phone'

  const shouldPauseMotion = loading || isFormFocused || email.trim().length > 0 || password.trim().length > 0

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,#e2e8ff_0,#edf1ff_30%,#f5f6fb_60%,#eef1f7_100%)] p-4 md:p-8 flex items-center justify-center">
      <style>{`
        @keyframes loginPanelShift {
          0% { transform: translateX(0); }
          100% { transform: translateX(5.5%); }
        }
      `}</style>
      <div className="relative w-full max-w-5xl overflow-hidden rounded-[30px] border border-[#d9dfef] bg-white/85 shadow-[0_20px_60px_rgba(46,64,112,0.2)] backdrop-blur-sm transition duration-300 hover:shadow-[0_24px_70px_rgba(46,64,112,0.28)]">
        <div className="pointer-events-none absolute -top-20 -right-20 h-52 w-52 rounded-full bg-[#7a8fdf]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#6f86d8]/20 blur-3xl" />

        <div className={`grid transition-all duration-300 ${isFormOpen ? 'md:grid-cols-[1.02fr,1fr]' : 'md:grid-cols-[1.02fr,96px]'}`}>
          <section className="relative hidden md:block min-h-[620px]">
            <div
              className="absolute inset-y-0 left-0 right-0 rounded-l-[30px] rounded-r-[140px] bg-gradient-to-br from-[#8ea3f1] via-[#7e95e7] to-[#6d84db] px-10 py-12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] transition duration-300 hover:brightness-105 will-change-transform"
              style={{
                animation: 'loginPanelShift 3s ease-in-out infinite alternate',
                animationPlayState: shouldPauseMotion ? 'paused' : 'running',
              }}
            >
              <div className="flex h-full flex-col justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/80">Staff Portal</p>
                  <h1 className="mt-4 text-4xl font-semibold leading-tight">Welcome!</h1>
                  <p className="mt-3 max-w-xs text-sm text-white/90">
                    Manage appointments, services, and staff workflows from one secure dashboard.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-sm text-white/90">Need customer booking instead?</p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="rounded-lg border border-white/70 px-5 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-[#5b72cd]"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          </section>

          {!isFormOpen ? (
            <section className="relative z-10 flex items-center justify-center p-4 md:p-2">
              <div className="w-full md:w-auto">
                <div className="md:hidden rounded-2xl bg-gradient-to-br from-[#8ea3f1] via-[#7e95e7] to-[#6d84db] px-5 py-6 text-white shadow-[0_16px_36px_rgba(58,83,154,0.35)] mb-5">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-white/80">Staff Portal</p>
                  <h2 className="mt-2 text-2xl font-semibold">Welcome!</h2>
                  <p className="mt-1 text-sm text-white/90">Click the icons to open login form.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFormOpen(true)}
                  className="group w-full md:w-[72px] rounded-2xl border border-[#d7ddf0] bg-white/90 px-4 py-4 md:py-6 shadow-[0_10px_24px_rgba(53,75,140,0.15)] transition hover:-translate-y-0.5 hover:border-[#b8c4ec] hover:shadow-[0_16px_30px_rgba(53,75,140,0.24)]"
                  title="Open login form"
                >
                  <div className="flex md:flex-col items-center justify-center gap-3">
                    <span className="h-9 w-9 rounded-full bg-[#eff3ff] text-[#6077d1] flex items-center justify-center transition group-hover:bg-[#dfe8ff]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 1 1 14 0" />
                        <circle cx="12" cy="8" r="4" />
                      </svg>
                    </span>
                    <span className="h-9 w-9 rounded-full bg-[#eff3ff] text-[#6077d1] flex items-center justify-center transition group-hover:bg-[#dfe8ff]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <span className="h-9 w-9 rounded-full bg-[#6f86da] text-white flex items-center justify-center transition group-hover:bg-[#5b73cf]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                    <span className="md:hidden text-sm font-semibold text-[#4f67c4] ml-1">Open Login</span>
                  </div>
                </button>

                <div className="hidden md:block mt-3 text-center text-[11px] text-[#7f89ad]">
                  Login
                </div>
              </div>
            </section>
          ) : (
            <section className="relative z-10 p-6 sm:p-8 md:p-12">
              <div className="md:hidden rounded-2xl bg-gradient-to-br from-[#8ea3f1] via-[#7e95e7] to-[#6d84db] px-5 py-6 text-white shadow-[0_16px_36px_rgba(58,83,154,0.35)]">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/80">Staff Portal</p>
                <h2 className="mt-2 text-2xl font-semibold">Welcome!</h2>
                <p className="mt-1 text-sm text-white/90">Sign in to continue managing salon operations.</p>
              </div>

              <div className="mx-auto mt-7 w-full max-w-md md:mt-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-3xl font-semibold text-[#2d344f]">Sign in</h2>
                    <p className="mt-1 text-sm text-[#7c84a0]">Kaye&apos;s Hair Salon and Spa</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => !loading && setIsFormOpen(false)}
                    className="rounded-lg border border-[#d1dbf4] px-3 py-1.5 text-xs font-semibold text-[#5b72cd] transition hover:bg-[#eef3ff]"
                    title="Collapse login form"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-7">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-[#7a83a5]">Role</label>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#eff3ff] p-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedType('admin')}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition duration-200 ${
                        selectedType === 'admin'
                          ? 'bg-white text-[#4f67c4] shadow-sm'
                          : 'text-[#7780a3] hover:bg-white/80 hover:text-[#5d74cf]'
                      }`}
                    >
                      Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('manager')}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition duration-200 ${
                        selectedType === 'manager'
                          ? 'bg-white text-[#4f67c4] shadow-sm'
                          : 'text-[#7780a3] hover:bg-white/80 hover:text-[#5d74cf]'
                      }`}
                    >
                      Manager
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('stylist')}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition duration-200 ${
                        selectedType === 'stylist'
                          ? 'bg-white text-[#4f67c4] shadow-sm'
                          : 'text-[#7780a3] hover:bg-white/80 hover:text-[#5d74cf]'
                      }`}
                    >
                      Staff
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  onFocusCapture={() => setIsFormFocused(true)}
                  onBlurCapture={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setIsFormFocused(false)
                    }
                  }}
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#5b6383]">{loginLabel}</label>
                    <div className="group relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8690b4] transition group-hover:text-[#5f73c9]">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 1 1 14 0" />
                          <circle cx="12" cy="8" r="4" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        required
                        className="w-full rounded-lg border border-[#d8deef] bg-[#fbfcff] py-3 pl-10 pr-3 text-[#2f3550] outline-none transition hover:border-[#b6c2ec] focus:border-[#7f93e8] focus:ring-2 focus:ring-[#8094e7]/30"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={loginPlaceholder}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#5b6383]">Password</label>
                    <div className="group relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8690b4] transition group-hover:text-[#5f73c9]">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="11" width="14" height="10" rx="2" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="w-full rounded-lg border border-[#d8deef] bg-[#fbfcff] py-3 pl-10 pr-10 text-[#2f3550] outline-none transition hover:border-[#b6c2ec] focus:border-[#7f93e8] focus:ring-2 focus:ring-[#8094e7]/30"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="********"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8792b6] transition hover:scale-110 hover:text-[#5e75ce]"
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
                    className="w-full rounded-lg bg-gradient-to-r from-[#6f86da] to-[#5672d0] px-4 py-3 font-semibold text-white shadow-[0_12px_24px_rgba(72,97,185,0.34)] transition duration-200 hover:-translate-y-0.5 hover:from-[#617ad6] hover:to-[#4f69c8] hover:shadow-[0_16px_30px_rgba(72,97,185,0.45)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>
                </form>

                <div className="mt-6 text-center md:hidden">
                  <button
                    onClick={() => navigate('/')}
                    className="rounded-lg border border-[#c9d3f3] px-4 py-2 text-sm font-medium text-[#6173bd] transition hover:border-[#9fb0e8] hover:bg-[#f2f5ff]"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login



