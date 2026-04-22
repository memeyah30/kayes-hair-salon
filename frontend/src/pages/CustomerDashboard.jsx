import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import {
  isManageBookingVerified,
  persistManageBookingVerification,
} from '../utils/customerVerification'

const primaryActionButtonClass = 'tap-safe rounded-[30px] bg-[#7b5cf5] px-5 py-2.5 text-white font-semibold shadow-[0_14px_30px_rgba(40,28,110,0.3)] transition hover:-translate-y-px hover:bg-[#8a6cf8] disabled:opacity-60'
const secondaryActionButtonClass = 'tap-safe rounded-xl border border-[#e2d7ea] bg-white px-4 py-2 text-sm text-[#5c4b68] shadow-[0_8px_24px_rgba(44,19,56,0.05)] transition hover:bg-[#faf6fd]'

const clearLegacyCustomerLookup = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('customer_email')
  window.localStorage.removeItem('customer_phone')
}

const CustomerDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const queryToken = (params.get('token') || '').trim()
  const queryEmail = (params.get('email') || '').trim().toLowerCase()
  const hasVerifiedAccess = Boolean(queryToken && queryEmail) || isManageBookingVerified()

  useEffect(() => {
    clearLegacyCustomerLookup()

    if (queryToken && queryEmail) {
      persistManageBookingVerification({
        email: queryEmail,
        token: queryToken,
      })
      navigate('/customer/manage', { replace: true })
      return
    }

    if (hasVerifiedAccess) {
      navigate('/customer/manage', { replace: true })
    }
  }, [hasVerifiedAccess, navigate, queryEmail, queryToken])

  if (hasVerifiedAccess) {
    return (
      <div className="min-h-screen app-panel-bg flex flex-col md:flex-row text-[#2C1338]">
        <Sidebar userType="customer" />
        <main className="flex-1 min-w-0 flex flex-col">
          <Navbar hideUserBadge />
          <div className="flex items-center justify-center min-h-screen">
            <div>Opening your verified booking dashboard...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-panel-bg flex flex-col md:flex-row text-[#2C1338]">
      <Sidebar userType="customer" />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar hideUserBadge />
        <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/home')}
                className="tap-safe px-3 py-2 bg-[#2C1338] text-white rounded hover:brightness-110 text-lg font-bold"
                aria-label="Back to Home"
                title="Back to Home"
              >
                &larr;
              </button>
              <h1 className="text-2xl font-bold">My Appointments</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate('/book?fresh=1')}
                className={`${primaryActionButtonClass} w-full sm:w-auto text-sm`}
              >
                Book New
              </button>
              <button
                onClick={() => navigate('/manage-booking/start')}
                className={`${secondaryActionButtonClass} w-full sm:w-auto`}
              >
                Verify Booking
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <div className="text-[#7c688f] text-sm">Upcoming Appointments</div>
              <div className="text-2xl font-bold text-[#E75480]">0</div>
              <div className="text-sm text-[#6f5b7e] mt-2">Verification is required before booking details are shown.</div>
            </div>
            <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <div className="text-[#7c688f] text-sm">Total Booked Appointments</div>
              <div className="text-2xl font-bold text-emerald-700">0</div>
              <div className="text-sm text-[#6f5b7e] mt-2">Use OTP verification to securely open your linked booking history.</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-6 md:p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#efe8ff] text-[#6b46dc]">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a4 4 0 0 0-4 4v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a4 4 0 0 0-4-4Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V7a3 3 0 1 1 6 0v2" />
              </svg>
            </div>
            <div className="text-sm font-semibold text-[#6f5b7e] mb-3">Secure Access Required</div>
            <h2 className="text-2xl font-semibold text-[#2C1338] mb-3">Verify your booking before viewing appointments</h2>
            <p className="mx-auto max-w-2xl text-[#6f5b7e] mb-6">
              For privacy and security, booking history, appointment details, rescheduling, and cancellation options are only available after
              you verify your booking through the OTP process sent to your booking email.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/manage-booking/start')}
                className={primaryActionButtonClass}
              >
                Verify My Booking
              </button>
              <button
                onClick={() => navigate('/book?fresh=1')}
                className={secondaryActionButtonClass}
              >
                Book Appointment Now
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CustomerDashboard
