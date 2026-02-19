import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import manageBookingApi, { CUSTOMER_BOOKING_PENDING_EMAIL_KEY } from '../utils/manageBookingApi'

const ManageBookingEmail = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState(localStorage.getItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY) || '')
  const [sending, setSending] = useState(false)

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
      localStorage.setItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY, normalizedEmail)
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
    <div className="min-h-screen bg-[#f4edff] px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#eadfd5] bg-white/90 p-6 shadow-[0_12px_28px_rgba(92,64,51,0.12)]">
        <h1 className="mb-2 text-2xl font-bold text-[#3b2f2a]">Manage My Booking</h1>
        <p className="mb-6 text-sm text-[#8f7a6f]">
          Enter the same email you used when booking. We&apos;ll send a 6-digit OTP.
        </p>

        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ManageBookingEmail

