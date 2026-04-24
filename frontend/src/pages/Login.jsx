import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import { resolveBackendOrigin } from '../utils/runtime'

const easeOut = [0.22, 1, 0.36, 1]
const SESSION_CONFIRMATION_ATTEMPTS = 4
const SESSION_CONFIRMATION_DELAY_MS = 250

const pause = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms)
})

const roleOptions = [
  { value: 'admin', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
]

const Login = ({ userType: propUserType }) => {
  const initialType = propUserType === 'manager' ? 'manager' : 'admin'
  const [selectedType, setSelectedType] = useState(initialType)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  const confirmSession = async (type, fallbackUser) => {
    const requestConfig = {
      params: { type },
      headers: { 'X-User-Type': type },
    }

    for (let attempt = 0; attempt < SESSION_CONFIRMATION_ATTEMPTS; attempt += 1) {
      try {
        const sessionProbe = await api.get('/me', requestConfig)
        const sessionPayload = sessionProbe.data || {}
        const resolvedUser = sessionPayload.user || sessionPayload
        const resolvedType = sessionPayload.type || type

        if (resolvedUser && typeof resolvedUser === 'object') {
          sessionStorage.setItem('user', JSON.stringify(resolvedUser))
        } else if (fallbackUser) {
          sessionStorage.setItem('user', JSON.stringify(fallbackUser))
        }

        sessionStorage.setItem('userType', resolvedType)
        localStorage.removeItem('user')
        localStorage.removeItem('userType')
        window.dispatchEvent(new Event('user:updated'))
        return true
      } catch {
        if (attempt === SESSION_CONFIRMATION_ATTEMPTS - 1) {
          return false
        }

        await pause(SESSION_CONFIRMATION_DELAY_MS)
      }
    }

    return false
  }

  const shellReveal = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      scale: shouldReduceMotion ? 1 : 0.985,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.65,
        ease: easeOut,
      },
    },
  }

  const panelReveal = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 34 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.62,
        ease: easeOut,
      },
    },
  }

  const leftPanelReveal = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -34 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.62,
        ease: easeOut,
      },
    },
  }

  const staggerChildren = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.09,
        delayChildren: 0.12,
      },
    },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.48,
        ease: easeOut,
      },
    },
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post('/login', {
        email,
        password,
        type: selectedType,
      })
      
      // Session-based auth - keep auth identity tab-scoped to avoid
      // admin/manager/staff data leaking between tabs.
      const serializedUser = JSON.stringify(res.data.user)
      sessionStorage.setItem('user', serializedUser)
      sessionStorage.setItem('userType', res.data.type)
      localStorage.removeItem('user')
      localStorage.removeItem('userType')
      window.dispatchEvent(new Event('user:updated'))

      const sessionConfirmed = await confirmSession(res.data.type, res.data.user)
      if (!sessionConfirmed) {
        throw new Error('Login succeeded, but the session is still syncing. Please try again in a moment.')
      }

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
      
      console.log('Current origin:', currentOrigin)
      console.log('Is dev server:', isDevServer)
      console.log('Final redirect path:', finalRedirectPath)
      
      // Force a full page reload to ensure session cookie is properly set and recognized
      // This is necessary for session-based authentication to work correctly
      // Use immediate redirect - localStorage is already set, ProtectedRoute will allow access
      console.log('Executing redirect to:', finalRedirectPath)
      window.location.href = finalRedirectPath
    } catch (e) {
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
    <motion.div
      className="flex min-h-screen items-center justify-center bg-[#dfe4f3] p-3 sm:p-4 md:p-8"
      initial="hidden"
      animate="visible"
      variants={shellReveal}
    >
      <motion.div
        className="w-full max-w-6xl overflow-hidden rounded-2xl border border-[#d3daee] bg-[#eef2fb] shadow-[0_22px_60px_rgba(58,79,133,0.2)] md:rounded-[30px]"
        variants={shellReveal}
      >
        <div className="grid lg:grid-cols-[1fr_1fr]">
          <motion.section
            className="relative overflow-hidden bg-gradient-to-br from-[#8ea3f1] via-[#7d95e8] to-[#6c84dc] px-5 py-8 text-white sm:px-8 sm:py-10 lg:min-h-[700px] lg:rounded-r-[220px] lg:px-12 lg:py-14"
            variants={leftPanelReveal}
          >
            <motion.div
              aria-hidden="true"
              className="absolute -right-14 top-8 h-44 w-44 rounded-full bg-white/12 blur-sm"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { x: [0, -20, 0], y: [0, 18, 0], scale: [1, 1.08, 1] }
              }
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute bottom-[-3.5rem] left-[-2rem] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_70%)]"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { x: [0, 18, 0], y: [0, -16, 0], scale: [1, 1.1, 1] }
              }
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }}
            />

            <motion.div
              className="relative flex h-full flex-col justify-between gap-12"
              variants={staggerChildren}
            >
              <motion.div variants={fadeUp}>
               
                <motion.h1
                  className="mt-6 text-[clamp(2rem,8vw,3.25rem)] font-semibold leading-none"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.58, ease: easeOut, delay: 0.16 }}
                >
                  Welcome!
                </motion.h1>
                
                <motion.div
                  className="mt-8 flex flex-wrap gap-3"
                  variants={staggerChildren}
                >
                  {['Secure access', 'Fast scheduling', 'Live updates'].map((label) => (
                    <motion.span
                      key={label}
                      variants={fadeUp}
                      className="inline-flex items-center rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm"
                    >
                      {label}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <p className="mb-4 text-sm md:text-base text-white/90">Need customer booking instead?</p>
                <motion.button
                  type="button"
                  onClick={() => navigate('/')}
                  className="tap-safe rounded-xl border border-white/70 px-6 py-3 text-sm font-semibold text-white hover:bg-white hover:text-[#5f74d0]"
                  whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                >
                  Back to Home
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section
            className="px-4 py-7 sm:px-6 sm:py-8 lg:px-12 lg:py-14"
            variants={panelReveal}
          >
            <motion.div
              className="mx-auto w-full max-w-md"
              variants={staggerChildren}
            >
              <motion.div className="flex items-start gap-3" variants={fadeUp}>
                <div>
                  <h2 className="text-[clamp(2rem,8vw,3rem)] font-semibold text-[#394667]">Sign in</h2>
                  <p className="mt-2 text-sm text-[#6f7ea5]">Kaye&apos;s Hair Salon and Spa</p>
                </div>
              </motion.div>

              <motion.div className="mt-8" variants={fadeUp}>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#7784aa]">Role</label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#dde5f7] p-1.5">
                  {roleOptions.map((role) => {
                    const isSelected = selectedType === role.value

                    return (
                      <motion.button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedType(role.value)}
                        className={`tap-safe relative rounded-lg px-2 py-2 text-xs font-semibold sm:px-3 sm:text-sm ${
                          isSelected
                            ? 'text-[#5670ca]'
                            : 'text-[#6f7ca3] hover:bg-white/80'
                        }`}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                      >
                        {isSelected ? (
                          <motion.span
                            layoutId="login-role-pill"
                            className="absolute inset-0 rounded-lg bg-white shadow-[0_10px_18px_rgba(91,115,199,0.18)]"
                            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                          />
                        ) : null}
                        <span className="relative z-10">{role.label}</span>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>

              <motion.form onSubmit={handleSubmit} className="mt-6 space-y-4" variants={staggerChildren}>
                <motion.div variants={fadeUp}>
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
                </motion.div>

                <motion.div variants={fadeUp}>
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
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="tap-safe mt-2 w-full rounded-xl bg-gradient-to-r from-[#6f86da] to-[#5672d0] px-4 py-3 text-lg font-semibold text-white shadow-[0_12px_24px_rgba(72,97,185,0.34)] hover:from-[#617ad6] hover:to-[#4f69c8] disabled:cursor-not-allowed disabled:opacity-55"
                  variants={fadeUp}
                  whileHover={loading || shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={loading || shouldReduceMotion ? undefined : { scale: 0.985 }}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </motion.button>
              </motion.form>
            </motion.div>
          </motion.section>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Login

