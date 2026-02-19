import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import manageBookingApi, {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_PENDING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from '../utils/manageBookingApi'

const VerifyOtp = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const email = useMemo(() => {
    const routeEmail = location.state?.email || ''
    return (routeEmail || localStorage.getItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY) || '').trim().toLowerCase()
  }, [location.state])

  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!email) {
      toast.error('Email session not found. Please start again.')
      navigate('/manage-booking/start')
      return
    }

    const code = otp.replace(/\D/g, '').slice(0, 6)
    if (code.length !== 6) {
      toast.warn('Enter the 6-digit OTP.')
      return
    }

    try {
      setLoading(true)
      const { data } = await manageBookingApi.post('/manage-booking/verify-otp', {
        email,
        otp: code,
      })

      localStorage.setItem(CUSTOMER_BOOKING_TOKEN_KEY, data.token)
      localStorage.setItem(CUSTOMER_BOOKING_EMAIL_KEY, data.email)
      localStorage.setItem('customer_email', data.email)
      localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
      toast.success('Verified successfully.')
      window.location.assign('/customer')
    } catch (error) {
      const message = error.response?.data?.message || 'OTP verification failed.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email) {
      toast.error('Email session not found. Please start again.')
      navigate('/manage-booking/start')
      return
    }

    try {
      setResending(true)
      await manageBookingApi.post('/manage-booking/send-otp', { email })
      toast.success('OTP resent.')
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend OTP.'
      toast.error(message)
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4edff] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#eadfd5] bg-white/90 p-6 shadow-[0_12px_28px_rgba(92,64,51,0.12)]">
        <h1 className="mb-2 text-2xl font-bold text-[#3b2f2a]">Verify OTP</h1>
        <p className="mb-4 text-sm text-[#8f7a6f]">
          Enter the 6-digit code sent to <span className="font-medium text-[#5a463c]">{email || 'your email'}</span>.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.3em] outline-none focus:border-blue-500"
              placeholder="000000"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate('/manage-booking/start')}
            className="text-[#8f7a6f] hover:underline"
          >
            Change email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="text-blue-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? 'Resending...' : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default VerifyOtp
