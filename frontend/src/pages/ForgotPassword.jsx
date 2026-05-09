import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email address.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/forgot-password', { email })
      toast.success(data.message || 'Password reset link sent!')
      setIsSent(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4edff] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-[32px] bg-white p-10 shadow-[0_20px_50px_rgba(95,62,180,0.15)]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#f0ebff]">
            <svg className="h-8 w-8 text-[#5f3eb4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-[#2d1b4a]">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-[#7a6794]">
            {isSent 
              ? "Check your email for the reset link." 
              : "No worries! Enter your email and we'll send you instructions."}
          </p>
        </div>

        {!isSent ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-[#57476e]">
                  Email Address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-[#DDD6FE] px-4 py-3 text-sm text-[#2d1b4a] placeholder-[#b4acc5] outline-none transition focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/20"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-2xl bg-[#5f3eb4] px-4 py-4 text-sm font-bold text-white shadow-lg shadow-[#5f3eb4]/20 transition hover:bg-[#4d3299] focus:outline-none focus:ring-2 focus:ring-[#5f3eb4] focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-[#5f3eb4] hover:text-[#4d3299]"
            >
              Back to Login
            </button>
          </div>
        )}

        <div className="text-center">
          <Link to="/login" className="text-sm font-medium text-[#5f3eb4] hover:text-[#4d3299]">
            Remember your password? Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
