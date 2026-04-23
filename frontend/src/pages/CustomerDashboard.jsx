import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../components/AdminLayout'
import RatingModal from '../components/RatingModal'
import manageBookingApi from '../utils/manageBookingApi'
import {
  clearManageBookingVerification,
  getManageBookingVerifiedEmail,
  getManageBookingVerifiedName,
  isManageBookingVerified,
  persistManageBookingVerification,
  setManageBookingVerifiedName,
} from '../utils/customerVerification'

const primaryActionButtonClass = 'tap-safe rounded-[30px] bg-[#7b5cf5] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(40,28,110,0.3)] transition hover:-translate-y-px hover:bg-[#8a6cf8] disabled:opacity-60'
const secondaryActionButtonClass = 'tap-safe rounded-[30px] border border-[#ddd3ee] bg-white px-5 py-2.5 text-sm font-semibold text-[#5c4b68] shadow-[0_10px_26px_rgba(44,19,56,0.08)] transition hover:-translate-y-px hover:border-[#cfc0ec] hover:bg-[#faf6fd]'
const logoutActionButtonClass = 'tap-safe rounded-[30px] border border-[#efd5df] bg-white px-5 py-2.5 text-sm font-semibold text-[#a24f69] shadow-[0_10px_26px_rgba(44,19,56,0.08)] transition hover:-translate-y-px hover:border-[#e8c6d2] hover:bg-[#fff5f8] disabled:opacity-60'
const backButtonClass = 'tap-safe w-fit rounded-2xl border border-white/36 bg-white/82 px-3 py-2 text-lg font-bold text-[#654abf] shadow-[0_14px_28px_rgba(43,20,97,0.12)] hover:bg-white'
const customerPanelClass = 'rounded-[28px] border border-white/40 bg-white/82 shadow-[0_14px_32px_rgba(59,31,114,0.12)] backdrop-blur-md'

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

const CustomerDashboardShell = ({ children, customerName = '', hideUserBadge = false }) => (
  <AdminLayout
    userType="customer"
    title="Dashboard"
    hideUserBadge={hideUserBadge}
    navbarProps={
      hideUserBadge
        ? {}
        : {
            userBadgeName: customerName || 'Customer',
            userBadgeSubtitle: 'Registered Customer',
          }
    }
  >
    {children}
  </AdminLayout>
)

const CustomerActionsMenu = ({ open, onToggle, options }) => {
  if (!options.length) return null

  return (
    <div data-customer-action-menu="true" className="relative sm:ml-4">
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="tap-safe inline-flex min-w-[9.25rem] items-center justify-between gap-3 rounded-[18px] border border-[#d7c9ef] bg-white px-4 py-2.5 text-sm font-semibold text-[#5a4780] shadow-[0_10px_24px_rgba(44,19,56,0.09)] transition hover:-translate-y-px hover:border-[#c8b7ea] hover:bg-[#faf7ff]"
      >
        <span>Actions</span>
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-[#f3eeff] text-[#6b4ed1] transition ${open ? 'rotate-180 bg-[#ebe3ff]' : ''}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-[20px] border border-[#e6dbf3] bg-white shadow-[0_18px_40px_rgba(44,19,56,0.16)]">
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
  const [customerName, setCustomerName] = useState(getManageBookingVerifiedName())
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

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

  const syncCustomerIdentity = (nextName) => {
    const normalizedName = String(nextName || '').trim().replace(/\s+/g, ' ')
    if (!normalizedName) return
    setCustomerName(normalizedName)
    setManageBookingVerifiedName(normalizedName)
  }

  const resetCustomerPanelState = () => {
    setAppointments([])
    setShowBookingHistory(false)
    setOpenActionForId(null)
    setRatingAppointment(null)
    setSubmittingCancelId(null)
    setSubmittingRating(false)
    setLogoutModalOpen(false)
    setCustomerName('')
  }

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const { data } = await manageBookingApi.get('/manage-booking/appointments')
      setAppointments(data.appointments || [])
      syncCustomerIdentity(data.customer_name)
      return data
    } catch (error) {
      if (error.response?.status === 401) {
        clearManageBookingVerification()
        resetCustomerPanelState()
        toast.error('Session expired. Please verify OTP again.')
        navigate('/customer', { replace: true })
        return null
      }

      toast.error(error.response?.data?.message || 'Failed to load appointments.')
      setAppointments([])
      return null
    } finally {
      setLoading(false)
    }
  }

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
      resetCustomerPanelState()
      return
    }

    void loadAppointments()
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
      resetCustomerPanelState()
      navigate('/customer', { replace: true })
    }
  }

  const handleConfirmedLogout = async () => {
    try {
      setLoggingOut(true)
      await manageBookingApi.post('/manage-booking/logout')
    } catch {
      // Best-effort logout.
    } finally {
      clearManageBookingVerification()
      resetCustomerPanelState()
      window.location.assign('/')
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
      await loadAppointments()
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
      await loadAppointments()
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
      <div key={appointment.id} className="rounded-[24px] border border-[#eee4ff] bg-white/90 p-4 shadow-[0_10px_24px_rgba(44,19,56,0.06)]">
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
      <CustomerDashboardShell hideUserBadge>
        <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className={backButtonClass}
                aria-label="Back to Home"
                title="Back to Home"
              >
                &larr;
              </button>
              <h1 className="text-2xl font-bold text-[#24173f]">My Appointments</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => navigate(customerBookRoute)}
                className={`${primaryActionButtonClass} w-full sm:w-auto`}
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${customerPanelClass} p-5`}>
              <div className="text-sm text-[#7c688f]">Upcoming Appointments</div>
              <div className="mt-2 text-2xl font-bold text-[#E75480]">0</div>
              <div className="mt-2 text-sm text-[#6f5b7e]">Verification is required before booking details are shown.</div>
            </div>
            <div className={`${customerPanelClass} p-5`}>
              <div className="text-sm text-[#7c688f]">Total Booked Appointments</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">0</div>
              <div className="mt-2 text-sm text-[#6f5b7e]">Use OTP verification to securely open your linked booking history.</div>
            </div>
          </div>

          <div className={`${customerPanelClass} p-6 text-center md:p-8`}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#efe8ff] text-[#6b46dc]">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a4 4 0 0 0-4 4v2H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a4 4 0 0 0-4-4Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V7a3 3 0 1 1 6 0v2" />
              </svg>
            </div>
            <div className="mb-3 text-sm font-semibold text-[#6f5b7e]">Secure Access Required</div>
            <h2 className="mb-3 text-2xl font-semibold text-[#2C1338]">Verify your booking before viewing appointments</h2>
            <p className="mx-auto mb-6 max-w-2xl text-[#6f5b7e]">
              For privacy and security, booking history, appointment details, rescheduling, and cancellation options are only available after
              you verify your booking through the OTP process sent to your booking email.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
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
      </CustomerDashboardShell>
    )
  }

  if (loading) {
    return (
      <CustomerDashboardShell customerName={customerName} hideUserBadge={!customerName}>
        <div className="flex min-h-[calc(100vh-var(--dashboard-navbar-height)-2rem)] items-center justify-center px-6">
          <div className={`${customerPanelClass} px-6 py-5 text-center text-[#5f4f8f]`}>Loading your appointments...</div>
        </div>
      </CustomerDashboardShell>
    )
  }

  return (
    <CustomerDashboardShell customerName={customerName}>
      <>
        <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className={backButtonClass}
                aria-label="Back to Home"
                title="Back to Home"
              >
                &larr;
              </button>
              <h1 className="text-2xl font-bold text-[#24173f]">My Appointments</h1>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => navigate(customerBookRoute)}
                className={`${primaryActionButtonClass} w-full sm:w-auto`}
              >
                Book New
              </button>
              <button
                type="button"
                onClick={() => setLogoutModalOpen(true)}
                className={`${logoutActionButtonClass} w-full sm:w-auto`}
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${customerPanelClass} p-5`}>
              <div className="text-[#7c688f] text-sm">Upcoming Appointments</div>
              <div className="mt-2 text-2xl font-bold text-[#E75480]">{upcomingAppointments.length}</div>
            </div>
            <button
              type="button"
              onClick={openBookingHistory}
              disabled={appointments.length === 0}
              className={`${customerPanelClass} p-5 text-left transition ${
                appointments.length > 0
                  ? 'tap-safe hover:-translate-y-px hover:border-[#d9cdf0] cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="text-[#7c688f] text-sm">Total Booked Appointments</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">{appointments.length}</div>
              <div className="text-sm text-[#6f5b7e] mt-2">
                {historyAppointments.length > 0
                  ? 'Click to view booking history'
                  : customerName
                    ? `Registered as ${customerName}`
                    : `Verified as ${verifiedEmail || 'your booking email'}`}
              </div>
            </button>
          </div>

          {upcomingAppointments.length > 0 ? (
            <div ref={appointmentsSectionRef} className={`${customerPanelClass} p-5`}>
              <h2 className="font-semibold text-lg mb-4">Upcoming Appointments</h2>
              <div className="space-y-3">
                {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))}
              </div>
            </div>
          ) : (
            <div ref={appointmentsSectionRef} className={`${customerPanelClass} p-6 text-center`}>
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
            <div ref={historySectionRef} className={`${customerPanelClass} p-5`}>
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

        {logoutModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-[#120628]/55"
              onClick={() => {
                if (!loggingOut) {
                  setLogoutModalOpen(false)
                }
              }}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-md rounded-[28px] border border-white/40 bg-[linear-gradient(180deg,#ffffff_0%,#f8f2ff_100%)] p-6 shadow-[0_24px_48px_rgba(41,21,93,0.24)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[#8a74bc]">Confirm Logout</div>
                  <h2 className="mt-2 text-2xl font-semibold text-[#24173f]">Leave your customer session?</h2>
                  <p className="mt-3 text-sm leading-6 text-[#6f5b7e]">
                    You will be logged out from the customer panel and sent back to the landing page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!loggingOut) {
                      setLogoutModalOpen(false)
                    }
                  }}
                  className="rounded-full border border-[#ddd3ee] px-3 py-1 text-sm text-[#6f4ed0] transition hover:bg-[#f6f2ff]"
                  disabled={loggingOut}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setLogoutModalOpen(false)}
                  className={secondaryActionButtonClass}
                  disabled={loggingOut}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => { void handleConfirmedLogout() }}
                  className={logoutActionButtonClass}
                  disabled={loggingOut}
                >
                  {loggingOut ? 'Logging out...' : 'Yes, Logout'}
                </button>
              </div>
            </div>
          </div>
        )}

      {ratingAppointment && (
        <RatingModal
          open={Boolean(ratingAppointment)}
          appointment={ratingAppointment}
          onClose={() => setRatingAppointment(null)}
          onSubmit={submitRating}
          submitting={submittingRating}
        />
      )}
      </>
    </CustomerDashboardShell>
  )
}

export default CustomerDashboard
