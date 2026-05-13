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
const Login = () => {
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
          localStorage.setItem('user', JSON.stringify(resolvedUser))
        } else if (fallbackUser) {
          localStorage.setItem('user', JSON.stringify(fallbackUser))
        }

        localStorage.setItem('userType', resolvedType)
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
      })

      // Persistent auth - use localStorage so it survives page reloads reliably.
      const serializedUser = JSON.stringify(res.data.user)
      localStorage.setItem('user', serializedUser)
      localStorage.setItem('userType', res.data.type)
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
      console.log('User data stored in localStorage')

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

  const loginLabel = 'Username or Email'
  const loginPlaceholder = ''

  return (
    <motion.div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f4edff] p-3 sm:p-4 md:p-8"
      initial="hidden"
      animate="visible"
      variants={shellReveal}
    >
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.div
          animate={shouldReduceMotion ? undefined : {
            scale: [1, 1.2, 1],
            x: [0, 40, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-[#e4d6fd]/40 blur-[80px]"
        />
        <motion.div
          animate={shouldReduceMotion ? undefined : {
            scale: [1, 1.1, 1],
            x: [0, -50, 0],
            y: [0, 60, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[15%] -right-[5%] h-[600px] w-[600px] rounded-full bg-[#7B5CF5]/10 blur-[100px]"
        />
        <motion.div
          animate={shouldReduceMotion ? undefined : {
            scale: [1, 1.3, 1],
            rotate: [0, 45, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute left-[30%] top-[20%] h-[300px] w-[300px] rounded-full bg-white/30 blur-[60px]"
        />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/80 bg-white/40 shadow-[0_32px_80px_rgba(123,92,245,0.15)] backdrop-blur-2xl md:rounded-[40px]"
        variants={shellReveal}
      >
        <div className="grid lg:grid-cols-[0.94fr_1.06fr]">
          <motion.section
            className="relative isolate overflow-hidden bg-gradient-to-br from-[#7B5CF5] via-[#8B71F7] to-[#A78BFA] px-4 py-10 text-white sm:px-8 sm:py-10 lg:min-h-[720px] lg:px-12 lg:py-14"
            variants={leftPanelReveal}
          >
            {/* Inner panel decorative shapes */}
            <motion.div
              aria-hidden="true"
              className="absolute -right-20 top-10 h-64 w-64 rounded-full bg-white/10 blur-md"
              animate={shouldReduceMotion ? undefined : {
                scale: [1, 1.1, 1],
                rotate: [0, 90, 0]
              }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              aria-hidden="true"
              className="absolute bottom-[-5rem] left-[-4rem] h-80 w-80 rounded-full bg-white/5 blur-xl"
              animate={shouldReduceMotion ? undefined : {
                y: [0, -20, 0],
                x: [0, 15, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />

            <motion.div
              className="relative flex min-h-[380px] flex-col justify-center lg:min-h-[720px]"
              variants={staggerChildren}
            >
              <motion.div className="mx-auto flex w-full max-w-md flex-col items-center text-center" variants={staggerChildren}>
                <motion.div
                  className="relative mb-6 flex flex-col items-center gap-4 rounded-[32px] border border-white/25 bg-white/10 px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,0.1)] backdrop-blur-md sm:mb-8 sm:px-7 sm:py-7"
                  variants={fadeUp}
                  whileHover={shouldReduceMotion ? undefined : { y: -5, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                >
                  <motion.div
                    className="absolute inset-x-8 top-5 h-[1.5px] bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    animate={shouldReduceMotion ? undefined : { opacity: [0.4, 0.9, 0.4] }}
                    transition={{ duration: 3.5, repeat: Infinity }}
                  />

                  <motion.div
                    className="relative"
                    animate={shouldReduceMotion ? undefined : {
                      y: [0, -8, 0],
                      scale: [1, 1.03, 1]
                    }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="absolute inset-0 rounded-full bg-[#7B5CF5]/30 blur-2xl" />
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white p-2 sm:h-24 sm:w-24 sm:p-2.5 shadow-[0_20px_40px_rgba(20,30,80,0.2)]">
                      <img
                        src="/logo-transparent.png"
                        alt="Logo"
                        className="h-full w-full object-contain"
                        onError={(e) => { e.currentTarget.src = '/logo.png' }}
                      />
                    </div>
                  </motion.div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[0.65rem] font-bold uppercase tracking-[0.4em] text-white/75 sm:text-[0.75rem]">Professional Care</span>
                    <span className="text-[clamp(1.4rem,5vw,2.5rem)] font-bold tracking-tight text-white">Kaye&apos;s Salon</span>
                  </div>
                </motion.div>

                <motion.h1
                  className="text-[clamp(2rem,8vw,4rem)] font-bold leading-[0.9] tracking-tight text-white"
                  variants={fadeUp}
                >
                  Welcome!
                </motion.h1>

                <motion.p
                  className="mt-4 max-w-sm text-sm leading-7 text-white/95 sm:text-base"
                  variants={fadeUp}
                >
                  Experience the pinnacle of hair care and relaxation in our modern dashboard designed for effortless salon management.
                </motion.p>

                <motion.div
                  className="mt-10 flex flex-wrap justify-center gap-3.5"
                  variants={staggerChildren}
                >

                </motion.div>
              </motion.div>

              <motion.div
                className="mt-8 flex flex-col items-center gap-5 text-center lg:absolute lg:bottom-12 lg:left-14 lg:mt-0 lg:items-start lg:text-left"
                variants={fadeUp}
              >
                <p className="text-sm font-medium text-white/85">Need customer booking instead?</p>
                <motion.button
                  type="button"
                  onClick={() => navigate('/')}
                  className="tap-safe group relative overflow-hidden rounded-2xl border border-white/80 px-8 py-3 text-sm font-bold text-white transition-all hover:bg-white hover:text-[#7B5CF5] hover:shadow-lg sm:py-3.5"
                  whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                >
                  <span className="relative z-10">Back to Home</span>
                  <div className="absolute inset-0 z-0 bg-white opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.section>

          <motion.section
            className="flex items-center px-4 py-8 sm:px-8 sm:py-12 lg:px-14 lg:py-20"
            variants={panelReveal}
          >
            <motion.div
              className="mx-auto w-full max-w-md rounded-[28px] border border-white/80 bg-white/70 p-6 shadow-[0_24px_64px_rgba(123,92,245,0.08)] backdrop-blur-md sm:rounded-[32px] sm:p-10"
              variants={staggerChildren}
            >
              <motion.div className="flex flex-col gap-1.5" variants={fadeUp}>
                <h2 className="text-[clamp(1.8rem,8vw,3.2rem)] font-bold tracking-tight text-[#2d1f4f]">Sign in</h2>
                <div className="h-1 w-12 rounded-full bg-gradient-to-r from-[#7B5CF5] to-[#A78BFA] sm:h-1.5 sm:w-16" />
                <p className="mt-1 text-xs font-medium text-[#6b589b] sm:mt-2 sm:text-sm">Access your administrative dashboard</p>
              </motion.div>

              <motion.form onSubmit={handleSubmit} className="mt-9 space-y-5" variants={staggerChildren} autoComplete="off">
                <motion.div variants={fadeUp}>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#6b589b]">{loginLabel}</label>
                  <div className="relative group">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#90a0c8] transition-colors group-focus-within:text-[#7B5CF5]">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 1 1 14 0" />
                        <circle cx="12" cy="8" r="4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      className="tap-safe w-full rounded-2xl border-2 border-[#e4d6fd] bg-[#f8f6ff] py-3.5 pl-11 pr-4 text-sm text-[#2d1f4f] placeholder-[#90a0c8] outline-none transition-all focus:border-[#7B5CF5] focus:bg-white focus:ring-4 focus:ring-[#7B5CF5]/10 sm:py-4 sm:pl-12 sm:text-base"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={loginPlaceholder}
                    />
                  </div>
                </motion.div>

                <motion.div variants={fadeUp}>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#6b589b]">Password</label>
                  <div className="relative group">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#90a0c8] transition-colors group-focus-within:text-[#7B5CF5]">
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      className="tap-safe w-full rounded-2xl border-2 border-[#e4d6fd] bg-[#f8f6ff] py-3.5 pl-11 pr-11 text-sm text-[#2d1f4f] placeholder-[#90a0c8] outline-none transition-all focus:border-[#7B5CF5] focus:bg-white focus:ring-4 focus:ring-[#7B5CF5]/10 sm:py-4 sm:pl-12 sm:pr-12 sm:text-base"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder=""
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7f8fb8] transition-colors hover:text-[#7B5CF5]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42L21 21M12 12l.01.01" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="text-xs font-semibold text-[#7B5CF5] transition hover:text-[#5b3cc4] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="tap-safe relative mt-4 w-full overflow-hidden rounded-2xl bg-[#7B5CF5] px-4 py-4 text-lg font-bold text-white shadow-[0_12px_28px_rgba(123,92,245,0.35)] transition-all hover:bg-[#6b4ae8] hover:shadow-[0_16px_32px_rgba(123,92,245,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
                  variants={fadeUp}
                  whileHover={loading || shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={loading || shouldReduceMotion ? undefined : { scale: 0.98 }}
                >
                  <span className={loading ? 'opacity-0' : 'opacity-100'}>Login</span>
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                    </div>
                  )}
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
