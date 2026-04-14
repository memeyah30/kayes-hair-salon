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
    <div className="min-h-screen bg-[linear-gradient(135deg,#e9e2ff,#d8ccff)] px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-[22px] border border-[#d8ccff] bg-white px-6 py-7 shadow-[0_18px_40px_rgba(91,60,196,0.16)] sm:px-7">
          <h1 className="mb-2 text-3xl font-semibold text-[#2d2d2d]">Verify OTP</h1>
          <p className="mb-5 text-sm leading-6 text-[#6b6b6b]">
            Enter the 6-digit code sent to <span className="font-semibold text-[#4c1d95]">{email || 'your email'}</span>.
          </p>

          <div className="mb-5 rounded-xl bg-[#f2edff] px-4 py-3 text-sm text-[#4c1d95]">
            This step protects your booking details before we show your appointments.
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2d2d2d]">OTP Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="tap-safe w-full rounded-[10px] border border-[#d8ccff] px-4 py-3 text-center text-xl tracking-[0.35em] text-[#2d2d2d] outline-none transition focus:border-[#7b5cf5] focus:ring-4 focus:ring-[#7b5cf522]"
                placeholder="000000"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="tap-safe w-full rounded-[10px] bg-gradient-to-r from-[#6d4de6] to-[#7b5cf5] px-4 py-3 font-semibold text-white transition hover:from-[#5b3cc4] hover:to-[#6846e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => navigate('/manage-booking/start')}
              className="tap-safe font-medium text-[#6b6b6b] transition hover:text-[#4c1d95]"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="tap-safe font-semibold text-[#6d4de6] transition hover:text-[#5b3cc4] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? 'Resending...' : 'Resend OTP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyOtp
