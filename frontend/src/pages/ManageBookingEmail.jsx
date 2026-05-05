import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import manageBookingApi, { CUSTOMER_BOOKING_PENDING_EMAIL_KEY } from '../utils/manageBookingApi'
import {
  isManageBookingVerified,
  setManageBookingPendingEmail,
} from '../utils/customerVerification'

const ManageBookingEmail = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (isManageBookingVerified()) {
      navigate('/customer', { replace: true })
    }
  }, [navigate])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      toast.warn('Please enter your email.')
      return
    }

    try {
      setSending(true)
      await manageBookingApi.post('/manage-booking/send-otp', { email: normalizedEmail })
      setManageBookingPendingEmail(normalizedEmail)
      toast.success('OTP sent to your email.')
      navigate('/manage-booking/verify', { state: { email: normalizedEmail } })
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP.'
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#e9e2ff,#d8ccff)] px-4 py-8 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-md rounded-[22px] border border-[#d8ccff] bg-white px-6 py-7 shadow-[0_18px_40px_rgba(91,60,196,0.16)] sm:px-7">
          <h1 className="mb-2 text-3xl font-semibold text-[#2d2d2d]">Manage My Booking</h1>
          <p className="mb-5 text-sm leading-6 text-[#6b6b6b]">
            Enter the same email you used when booking. We&apos;ll send a 6-digit OTP.
          </p>

          <div className="mb-5 rounded-xl bg-[#f2edff] px-4 py-3 text-sm text-[#4c1d95]">
            Use your booking email so we can securely open your booking dashboard.
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4" autoComplete="off">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2d2d2d]">Email</label>
              <input
                type="email"
                name="manage_booking_email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="tap-safe w-full rounded-[10px] border border-[#d8ccff] px-4 py-3 text-[#2d2d2d] outline-none transition focus:border-[#7b5cf5] focus:ring-4 focus:ring-[#7b5cf522]"
                placeholder="your@email.com"
                required
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="tap-safe w-full rounded-[10px] bg-gradient-to-r from-[#6d4de6] to-[#7b5cf5] px-4 py-3 font-semibold text-white transition hover:from-[#5b3cc4] hover:to-[#6846e8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="tap-safe w-full rounded-[10px] border border-[#d8ccff] bg-white px-4 py-3 font-semibold text-[#6d4de6] transition hover:bg-[#faf7ff]"
            >
              Back to Home
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ManageBookingEmail
