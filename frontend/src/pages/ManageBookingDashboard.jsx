import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import RatingModal from '../components/RatingModal'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { actionButtonClasses } from '../components/ActionButton'
import manageBookingApi from '../utils/manageBookingApi'
import {
  clearManageBookingVerification,
  getManageBookingVerifiedEmail,
  isManageBookingVerified,
  persistManageBookingVerification,
} from '../utils/customerVerification'

const statusClasses = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-[#fce7f1] text-[#9b2f64]',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-gray-200 text-gray-700',
  booked: 'bg-[#fce7f1] text-[#9b2f64]',
}

const formatCurrency = (amount) => `PHP ${Number(amount || 0).toFixed(2)}`
const primaryActionButtonClass = 'tap-safe rounded-[30px] bg-[#7b5cf5] px-5 py-2.5 text-white font-semibold shadow-[0_14px_30px_rgba(40,28,110,0.3)] transition hover:-translate-y-px hover:bg-[#8a6cf8] disabled:opacity-60'
const secondaryActionButtonClass = 'tap-safe rounded-xl border border-[#e2d7ea] bg-white px-4 py-2 text-sm text-[#5c4b68] shadow-[0_8px_24px_rgba(44,19,56,0.05)] transition hover:bg-[#faf6fd]'

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

const ManageBookingDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const params = new URLSearchParams(location.search)
  const queryToken = (params.get('token') || '').trim()
  const queryEmail = (params.get('email') || '').trim().toLowerCase()

  if (queryToken && queryEmail) {
    persistManageBookingVerification({
      email: queryEmail,
      token: queryToken,
    })
  }

  const customerEmail = queryEmail || getManageBookingVerifiedEmail()

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [rescheduleForId, setRescheduleForId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)
  const [submittingCancelId, setSubmittingCancelId] = useState(null)
  const [ratingAppointment, setRatingAppointment] = useState(null)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showBookingHistory, setShowBookingHistory] = useState(false)
  const upcomingSectionRef = useRef(null)
  const historySectionRef = useRef(null)

  const hasSession = useMemo(
    () => Boolean(queryToken && queryEmail) || isManageBookingVerified(),
    [queryEmail, queryToken]
  )

  const upcomingCount = useMemo(
    () => appointments.filter((appointment) => ['pending', 'confirmed', 'booked'].includes(appointment.status)).length,
    [appointments]
  )

  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) => ['pending', 'confirmed', 'booked'].includes(appointment.status)),
    [appointments]
  )

  const historyAppointments = useMemo(
    () => appointments.filter((appointment) => !['pending', 'confirmed', 'booked'].includes(appointment.status)),
    [appointments]
  )

  const successfulAppointmentsCount = useMemo(
    () => appointments.filter((appointment) => ['pending', 'confirmed', 'booked', 'completed'].includes(appointment.status)).length,
    [appointments]
  )

  const clearLocalSessionAndGoToStart = () => {
    clearManageBookingVerification()
    navigate('/manage-booking/start')
  }

  const clearSessionAndGoToStart = async () => {
    try {
      await manageBookingApi.post('/manage-booking/logout')
    } catch {
      // Best-effort logout; local cleanup still runs below.
    } finally {
      clearLocalSessionAndGoToStart()
    }
  }

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const { data } = await manageBookingApi.get('/manage-booking/appointments')
      setAppointments(data.appointments || [])
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        void clearSessionAndGoToStart()
        return
      }
      const message = error.response?.data?.message || 'Failed to load appointments.'
      toast.error(message)
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasSession) {
      navigate('/manage-booking/start')
      return
    }
    loadAppointments()
  }, [hasSession]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (queryToken && queryEmail) {
      navigate('/customer/manage', { replace: true })
    }
  }, [navigate, queryEmail, queryToken])

  useEffect(() => {
    if (pathname === '/customer/dashboard') {
      navigate('/customer/manage', { replace: true })
    }
  }, [navigate, pathname])

  useEffect(() => {
    if (!showBookingHistory) return
    historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showBookingHistory])

  useEffect(() => {
    if (historyAppointments.length > 0) return
    setShowBookingHistory(false)
  }, [historyAppointments.length])

  const openReschedule = (appointment) => {
    setRescheduleForId(appointment.id)
    setRescheduleDate(appointment.appointment_date || '')
    setRescheduleTime(appointment.appointment_time || '')
  }

  const handleReschedule = async (appointmentId) => {
    if (!rescheduleDate || !rescheduleTime) {
      toast.warn('Please provide new date and time.')
      return
    }

    try {
      setSubmittingReschedule(true)
      await manageBookingApi.post(`/manage-booking/appointments/${appointmentId}/reschedule`, {
        appointment_date: rescheduleDate,
        appointment_time: rescheduleTime,
      })
      toast.success('Appointment rescheduled.')
      setRescheduleForId(null)
      await loadAppointments()
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        void clearSessionAndGoToStart()
        return
      }
      const message = error.response?.data?.message || 'Failed to reschedule appointment.'
      toast.error(message)
    } finally {
      setSubmittingReschedule(false)
    }
  }

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Cancel this appointment?')) return

    try {
      setSubmittingCancelId(appointmentId)
      await manageBookingApi.post(`/manage-booking/appointments/${appointmentId}/cancel`)
      toast.success('Appointment cancelled.')
      await loadAppointments()
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        void clearSessionAndGoToStart()
        return
      }
      const message = error.response?.data?.message || 'Failed to cancel appointment.'
      toast.error(message)
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
        void clearSessionAndGoToStart()
        return
      }
      const message = error.response?.data?.message || 'Failed to submit rating.'
      toast.error(message)
    } finally {
      setSubmittingRating(false)
    }
  }

  const openBookingHistory = () => {
    if (historyAppointments.length === 0) {
      upcomingSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }

    setShowBookingHistory(true)
  }

  const renderAppointmentCard = (appointment) => {
    const hasCanRateFlag = Object.prototype.hasOwnProperty.call(appointment, 'can_rate')
    const normalizedStatus = String(appointment.raw_status || appointment.status || '').toLowerCase()
    const canRate = hasCanRateFlag ? Boolean(appointment.can_rate) : normalizedStatus === 'completed'
    const statusLabel = appointment.status === 'pending' ? 'booked' : appointment.status
    const isRescheduled = wasRescheduled(appointment)
    const rescheduledAtLabel = formatRescheduledAtLabel(appointment.rescheduled_at)

    return (
      <div key={appointment.id} className="border rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold text-lg">{appointment.service_name}</div>
            <div className="text-sm text-[#6f5b7e] mt-1">
              {appointment.appointment_date} at {appointment.appointment_time}
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
            <div className="text-sm text-[#7c688f] mt-1">with {appointment.team_name || 'Salon Team'}</div>
            <div className="text-sm font-medium text-green-600 mt-2">
              {formatCurrency(appointment.total_amount)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:ml-4">
            {appointment.can_reschedule && (
              <button
                onClick={() => openReschedule(appointment)}
                className={actionButtonClasses({ tone: 'primary', size: 'compact' })}
              >
                Reschedule
              </button>
            )}

            {appointment.can_cancel && (
              <button
                onClick={() => handleCancel(appointment.id)}
                disabled={submittingCancelId === appointment.id}
                className={actionButtonClasses({ tone: 'danger', size: 'compact' })}
              >
                {submittingCancelId === appointment.id ? 'Cancelling...' : 'Cancel'}
              </button>
            )}

            {canRate && (
              <button
                onClick={() => setRatingAppointment(appointment)}
                className={actionButtonClasses({ tone: 'success', size: 'compact' })}
              >
                Rate Appointment
              </button>
            )}

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

        {rescheduleForId === appointment.id && (
          <div className="mt-4 rounded-xl border border-[#f3cade] bg-[#fff4f9] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">New Date</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#E75480]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">New Time</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#E75480]"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => handleReschedule(appointment.id)}
                disabled={submittingReschedule}
                className={`${primaryActionButtonClass} px-4 py-1.5 text-xs`}
              >
                {submittingReschedule ? 'Saving...' : 'Save Reschedule'}
              </button>
              <button
                onClick={() => setRescheduleForId(null)}
                className="tap-safe rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
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
              <h1 className="text-2xl font-bold">Manage My Booking</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate('/book?fresh=1')}
                className={`${primaryActionButtonClass} w-full sm:w-auto text-sm`}
              >
                Book New
              </button>
              <button
                onClick={() => { void clearSessionAndGoToStart() }}
                className={`${secondaryActionButtonClass} w-full sm:w-auto`}
              >
                End Session
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <div className="text-[#7c688f] text-sm">Upcoming Appointments</div>
              <div className="text-2xl font-bold text-[#E75480]">{upcomingCount}</div>
              <div className="text-sm text-[#6f5b7e] mt-2">Verified booking access is active for this session.</div>
            </div>
            <button
              type="button"
              onClick={openBookingHistory}
              className={`bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4 text-left transition flex flex-col ${
                appointments.length > 0
                  ? 'tap-safe hover:-translate-y-px hover:border-[#d9cdf0] cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="text-[#7c688f] text-sm">Total Booked Appointments</div>
              <div className="text-2xl font-bold text-emerald-700">{successfulAppointmentsCount}</div>
              <div className="text-sm text-[#6f5b7e] mt-2 break-all">
                {historyAppointments.length > 0
                  ? 'Click to view booking history'
                  : `Verified as ${customerEmail || 'your booking email'}`}
              </div>
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-6 text-center">
              <div className="text-sm font-semibold text-[#6f5b7e] mb-4">No appointments found</div>
              <h2 className="text-xl font-semibold mb-2">No bookings are linked to this verified email yet</h2>
              <p className="text-[#6f5b7e] mb-4">You can create a new appointment anytime.</p>
              <button
                onClick={() => navigate('/book?fresh=1')}
                className={primaryActionButtonClass}
              >
                Book Appointment Now
              </button>
            </div>
          ) : (
            <>
              <div ref={upcomingSectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
                <h2 className="font-semibold text-lg mb-4">
                  {upcomingAppointments.length > 0 ? 'My Appointments' : 'Upcoming Appointments'}
                </h2>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#ece6f4] bg-white p-6 text-center">
                    <div className="text-sm font-semibold text-[#6f5b7e] mb-4">No upcoming appointments</div>
                    <h3 className="text-xl font-semibold mb-2">No Upcoming Appointment</h3>
                    <p className="text-[#6f5b7e] mb-4">Your previous bookings are still available in your booking history.</p>
                    <button
                      onClick={() => navigate('/book?fresh=1')}
                      className={primaryActionButtonClass}
                    >
                      Book Appointment Now
                    </button>
                  </div>
                )}
              </div>

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
            </>
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

export default ManageBookingDashboard
