import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import RatingModal from '../components/RatingModal'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import manageBookingApi from '../utils/manageBookingApi'
import {
  clearManageBookingVerification,
  getManageBookingVerifiedEmail,
  isManageBookingVerified,
  persistManageBookingVerification,
} from '../utils/customerVerification'

const primaryActionButtonClass = 'tap-safe rounded-[30px] bg-[#7b5cf5] px-5 py-2.5 text-white font-semibold shadow-[0_14px_30px_rgba(40,28,110,0.3)] transition hover:-translate-y-px hover:bg-[#8a6cf8] disabled:opacity-60'
const secondaryActionButtonClass = 'tap-safe rounded-xl border border-[#e2d7ea] bg-white px-4 py-2 text-sm text-[#5c4b68] shadow-[0_8px_24px_rgba(44,19,56,0.05)] transition hover:bg-[#faf6fd]'

const statusClasses = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-[#fce7f1] text-[#9b2f64]',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-gray-200 text-gray-700',
  booked: 'bg-[#fce7f1] text-[#9b2f64]',
}

const clearLegacyCustomerLookup = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('customer_email')
  window.localStorage.removeItem('customer_phone')
}

const wasRescheduled = (appointment) => Boolean(appointment?.is_rescheduled || appointment?.rescheduled_at)

const formatRescheduledAtLabel = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const CustomerActionsMenu = ({ open, onToggle, options }) => {
  if (!options.length) return null

  return (
    <div data-customer-action-menu="true" className="relative sm:ml-4">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="tap-safe inline-flex items-center gap-2 rounded-[18px] border border-[#d9cdf0] bg-white px-4 py-2 text-sm font-semibold text-[#5c4b68] shadow-[0_8px_20px_rgba(44,19,56,0.08)] transition hover:border-[#cbb9ea] hover:bg-[#faf7fe]"
      >
        Actions
        <span aria-hidden="true" className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>
          v
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-[#e6dbf3] bg-white shadow-[0_18px_40px_rgba(44,19,56,0.16)]">
          <div className="py-2">
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={option.onClick}
                disabled={option.disabled}
                className={`tap-safe flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-[#faf7fe] disabled:cursor-not-allowed disabled:opacity-60 ${
                  option.tone === 'danger' ? 'text-red-600' : 'text-[#4f3c5f]'
                }`}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const formatCurrency = (amount) => `PHP ${Number(amount || 0).toFixed(2)}`

const formatServiceSummary = (serviceName) => {
  const segments = String(serviceName || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (segments.length === 0) {
    return {
      title: 'Service',
      items: [],
    }
  }

  if (segments.length === 1) {
    return {
      title: segments[0],
      items: [],
    }
  }

  return {
    title: `${segments.length} Services`,
    items: segments,
  }
}

const CustomerDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const appointmentsSectionRef = useRef(null)
  const historySectionRef = useRef(null)

  const params = new URLSearchParams(location.search)
  const queryToken = (params.get('token') || '').trim()
  const queryEmail = (params.get('email') || '').trim().toLowerCase()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [submittingCancelId, setSubmittingCancelId] = useState(null)
  const [ratingAppointment, setRatingAppointment] = useState(null)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showBookingHistory, setShowBookingHistory] = useState(false)
  const [openActionForId, setOpenActionForId] = useState(null)

  const hasVerifiedAccess = Boolean(queryToken && queryEmail) || isManageBookingVerified()
  const verifiedEmail = queryEmail || getManageBookingVerifiedEmail()
  const customerBookRoute = hasVerifiedAccess
    ? '/book?fresh=1&source=customer-dashboard'
    : '/book?fresh=1'

  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) => ['pending', 'confirmed', 'booked'].includes(appointment.status)),
    [appointments]
  )

  const historyAppointments = useMemo(
    () => appointments.filter((appointment) => !['pending', 'confirmed', 'booked'].includes(appointment.status)),
    [appointments]
  )

  useEffect(() => {
    clearLegacyCustomerLookup()

    if (!queryToken || !queryEmail) return

    persistManageBookingVerification({
      email: queryEmail,
      token: queryToken,
    })

    navigate('/customer', { replace: true })
  }, [navigate, queryEmail, queryToken])

  useEffect(() => {
    if (!hasVerifiedAccess) {
      setAppointments([])
      setShowBookingHistory(false)
      return
    }

    const loadAppointments = async () => {
      try {
        setLoading(true)
        const { data } = await manageBookingApi.get('/manage-booking/appointments')
        setAppointments(data.appointments || [])
      } catch (error) {
        if (error.response?.status === 401) {
          clearManageBookingVerification()
          toast.error('Session expired. Please verify OTP again.')
          navigate('/customer', { replace: true })
          return
        }

        toast.error(error.response?.data?.message || 'Failed to load appointments.')
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    loadAppointments()
  }, [hasVerifiedAccess, navigate])

  useEffect(() => {
    if (!showBookingHistory) return
    historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showBookingHistory])

  useEffect(() => {
    if (historyAppointments.length > 0) return
    setShowBookingHistory(false)
  }, [historyAppointments.length])

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (event.target.closest('[data-customer-action-menu="true"]')) return
      setOpenActionForId(null)
    }

    document.addEventListener('click', handleDocumentClick)
    return () => document.removeEventListener('click', handleDocumentClick)
  }, [])

  const clearSessionAndStayOnCustomer = async () => {
    try {
      await manageBookingApi.post('/manage-booking/logout')
    } catch {
      // Best-effort logout.
    } finally {
      clearManageBookingVerification()
      setAppointments([])
      setShowBookingHistory(false)
      setOpenActionForId(null)
      navigate('/customer', { replace: true })
    }
  }

  const openReschedule = (appointment) => {
    setOpenActionForId(null)
    navigate(`/book?reschedule=${appointment.id}&source=customer-dashboard`)
  }

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Cancel this appointment?')) return

    try {
      setSubmittingCancelId(appointmentId)
      setOpenActionForId(null)
      await manageBookingApi.post(`/manage-booking/appointments/${appointmentId}/cancel`)
      toast.success('Appointment cancelled.')

      const { data } = await manageBookingApi.get('/manage-booking/appointments')
      setAppointments(data.appointments || [])
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        void clearSessionAndStayOnCustomer()
        return
      }

      toast.error(error.response?.data?.message || 'Failed to cancel appointment.')
    } finally {
      setSubmittingCancelId(null)
    }
  }

  const submitRating = async (payload) => {
    if (!ratingAppointment) return

    try {
      setSubmittingRating(true)
      await manageBookingApi.post(`/manage-booking/appointments/${ratingAppointment.id}/rate`, payload)
      toast.success('Thank you for your rating.')
      setRatingAppointment(null)

      const { data } = await manageBookingApi.get('/manage-booking/appointments')
      setAppointments(data.appointments || [])
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        void clearSessionAndStayOnCustomer()
        return
      }

      toast.error(error.response?.data?.message || 'Failed to submit rating.')
    } finally {
      setSubmittingRating(false)
    }
  }

  const openBookingHistory = () => {
    if (historyAppointments.length > 0) {
      setShowBookingHistory(true)
      return
    }

    appointmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const renderAppointmentCard = (appointment) => {
    const serviceSummary = formatServiceSummary(appointment.service_name)
    const hasCanRateFlag = Object.prototype.hasOwnProperty.call(appointment, 'can_rate')
    const normalizedStatus = String(appointment.raw_status || appointment.status || '').toLowerCase()
    const canRate = hasCanRateFlag ? Boolean(appointment.can_rate) : normalizedStatus === 'completed'
    const statusLabel = appointment.status === 'pending' ? 'booked' : appointment.status
    const isRescheduled = wasRescheduled(appointment)
    const rescheduledAtLabel = formatRescheduledAtLabel(appointment.rescheduled_at)

    const actionOptions = [
      appointment.can_reschedule
        ? {
            label: 'Reschedule',
            onClick: () => openReschedule(appointment),
          }
        : null,
      appointment.can_cancel
        ? {
            label: submittingCancelId === appointment.id ? 'Cancelling...' : 'Cancel',
            onClick: () => handleCancel(appointment.id),
            disabled: submittingCancelId === appointment.id,
            tone: 'danger',
          }
        : null,
      canRate
        ? {
            label: 'Rate Appointment',
            onClick: () => {
              setOpenActionForId(null)
              setRatingAppointment(appointment)
            },
          }
        : null,
    ].filter(Boolean)

    return (
      <div key={appointment.id} className="border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold text-lg">{serviceSummary.title}</div>
            {serviceSummary.items.length > 0 && (
              <div className="text-sm text-[#6f5b7e] mt-1">
                <ul className="list-disc list-inside ml-2 space-y-0.5">
                  {serviceSummary.items.map((item) => (
                    <li key={`${appointment.id}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="text-sm text-[#6f5b7e] mt-1">
              {new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at{' '}
              {new Date(`${appointment.appointment_date}T${appointment.appointment_time}:00`).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}{' '}
              PHT
            </div>
            {isRescheduled && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-xs font-medium text-[#6d28d9]">
                  Rescheduled
                </span>
                {rescheduledAtLabel && (
                  <span className="text-xs text-[#7c688f]">
                    Updated on {rescheduledAtLabel} PHT
                  </span>
                )}
              </div>
            )}
            <div className="text-sm text-[#7c688f] mt-1">with {appointment.stylist_name}</div>
            <div className="text-sm font-medium text-green-600 mt-2">
              Total: {formatCurrency(appointment.total_amount)}
            </div>
          </div>

          <div className="flex flex-wrap sm:justify-end gap-2 sm:ml-4">
            <CustomerActionsMenu
              open={openActionForId === appointment.id}
              onToggle={() => setOpenActionForId((current) => (current === appointment.id ? null : appointment.id))}
              options={actionOptions}
            />

            {!canRate && appointment.rating && (
              <span className="px-2 py-1 rounded text-xs self-center bg-emerald-100 text-emerald-700">
                Rated {Number(appointment.rating.overall_rating) || 0}/5
              </span>
            )}

            <span className={`px-2 py-1 rounded text-xs self-center ${statusClasses[appointment.status] || 'bg-gray-100 text-gray-700'}`}>
              {statusLabel}
            </span>
          </div>
        </div>

      </div>
    )
  }

  if (!hasVerifiedAccess) {
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
                  onClick={() => navigate(customerBookRoute)}
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
                  onClick={() => navigate(customerBookRoute)}
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

  if (loading) {
    return (
      <div className="min-h-screen app-panel-bg flex flex-col md:flex-row text-[#2C1338]">
        <Sidebar userType="customer" />
        <main className="flex-1 min-w-0 flex flex-col">
          <Navbar hideUserBadge />
          <div className="flex items-center justify-center min-h-screen">
            <div>Loading your appointments...</div>
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
                onClick={() => navigate(customerBookRoute)}
                className={`${primaryActionButtonClass} w-full sm:w-auto text-sm`}
              >
                Book New
              </button>
              <button
                onClick={() => { void clearSessionAndStayOnCustomer() }}
                className={`${secondaryActionButtonClass} w-full sm:w-auto`}
              >
                End Session
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <div className="text-[#7c688f] text-sm">Upcoming Appointments</div>
              <div className="text-2xl font-bold text-[#E75480]">{upcomingAppointments.length}</div>
            </div>
            <button
              type="button"
              onClick={openBookingHistory}
              disabled={appointments.length === 0}
              className={`bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4 text-left transition ${
                appointments.length > 0
                  ? 'tap-safe hover:-translate-y-px hover:border-[#d9cdf0] cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="text-[#7c688f] text-sm">Total Booked Appointments</div>
              <div className="text-2xl font-bold text-emerald-700">{appointments.length}</div>
              <div className="text-sm text-[#6f5b7e] mt-2">
                {historyAppointments.length > 0
                  ? 'Click to view booking history'
                  : `Verified as ${verifiedEmail || 'your booking email'}`}
              </div>
            </button>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div ref={appointmentsSectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <h2 className="font-semibold text-lg mb-4">Upcoming Appointments</h2>
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))}
              </div>
            </div>
          ) : (
            <div ref={appointmentsSectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-6 text-center">
              <div className="text-sm font-semibold text-[#6f5b7e] mb-4">No upcoming appointments</div>
              <h3 className="text-xl font-semibold mb-2">No Upcoming Appointment</h3>
              <p className="text-[#6f5b7e] mb-4">Book a new appointment to get started.</p>
              <button
                onClick={() => navigate(customerBookRoute)}
                className={primaryActionButtonClass}
              >
                Book Appointment Now
              </button>
            </div>
          )}

          {showBookingHistory && historyAppointments.length > 0 && (
            <div ref={historySectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-lg">Booking History</h2>
                <button
                  type="button"
                  onClick={() => setShowBookingHistory(false)}
                  className="tap-safe rounded-lg border border-[#e2d7ea] bg-white px-3 py-1.5 text-sm text-[#5c4b68] hover:bg-[#faf6fd]"
                >
                  Close History
                </button>
              </div>
              <div className="space-y-3">
                {historyAppointments.map((appointment) => renderAppointmentCard(appointment))}
              </div>
            </div>
          )}
        </div>
      </main>

      {ratingAppointment && (
        <RatingModal
          open={Boolean(ratingAppointment)}
          appointment={ratingAppointment}
          onClose={() => setRatingAppointment(null)}
          onSubmit={submitRating}
          submitting={submittingRating}
        />
      )}
    </div>
  )
}

export default CustomerDashboard
