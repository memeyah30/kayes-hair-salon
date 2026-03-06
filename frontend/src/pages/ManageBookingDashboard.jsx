import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import RatingModal from '../components/RatingModal'
import manageBookingApi, {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_PENDING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from '../utils/manageBookingApi'

const statusClasses = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-gray-200 text-gray-700',
}

const formatCurrency = (amount) => `PHP ${Number(amount || 0).toFixed(2)}`

const ManageBookingDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const pathname = location.pathname
  const params = new URLSearchParams(location.search)
  const queryToken = (params.get('token') || '').trim()
  const queryEmail = (params.get('email') || '').trim().toLowerCase()

  if (queryToken && queryEmail) {
    localStorage.setItem(CUSTOMER_BOOKING_TOKEN_KEY, queryToken)
    localStorage.setItem(CUSTOMER_BOOKING_EMAIL_KEY, queryEmail)
    localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
  }

  const customerEmail = queryEmail || localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY) || ''
  const customerToken = queryToken || localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY) || ''

  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [rescheduleForId, setRescheduleForId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)
  const [submittingCancelId, setSubmittingCancelId] = useState(null)
  const [ratingAppointment, setRatingAppointment] = useState(null)
  const [submittingRating, setSubmittingRating] = useState(false)

  const hasSession = useMemo(
    () => Boolean(customerEmail && customerToken),
    [customerEmail, customerToken]
  )

  const clearSessionAndGoToStart = () => {
    localStorage.removeItem(CUSTOMER_BOOKING_TOKEN_KEY)
    localStorage.removeItem(CUSTOMER_BOOKING_EMAIL_KEY)
    localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
    navigate('/manage-booking/start')
  }

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const { data } = await manageBookingApi.get('/manage-booking/appointments')
      setAppointments(data.appointments || [])
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        clearSessionAndGoToStart()
        return
      }
      const message = error.response?.data?.message || 'Failed to load appointments.'
      toast.error(message)
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
      navigate('/customer', { replace: true })
    }
  }, [navigate, queryEmail, queryToken])

  useEffect(() => {
    if (pathname === '/customer/dashboard') {
      navigate('/customer', { replace: true })
    }
  }, [navigate, pathname])

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
        clearSessionAndGoToStart()
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
        clearSessionAndGoToStart()
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
        clearSessionAndGoToStart()
        return
      }
      const message = error.response?.data?.message || 'Failed to submit rating.'
      toast.error(message)
    } finally {
      setSubmittingRating(false)
    }
  }

  return (
    <div className="min-h-screen app-panel-bg px-4 py-4 sm:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 rounded-2xl border border-[#eadfd5] bg-white/90 p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#3b2f2a]">Manage My Booking</h1>
              <p className="text-sm text-[#8f7a6f]">Verified as {customerEmail}</p>
            </div>
            <button
              onClick={clearSessionAndGoToStart}
              className="tap-safe rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              End Session
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#eadfd5] bg-white/90 p-6 text-center text-[#8f7a6f] shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
            Loading appointments...
          </div>
        ) : appointments.length === 0 ? (
          <div className="rounded-2xl border border-[#eadfd5] bg-white/90 p-6 text-center shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
            <h2 className="mb-2 text-lg font-semibold text-[#3b2f2a]">No appointments found</h2>
            <p className="text-sm text-[#8f7a6f]">No bookings are linked to this verified email yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const hasCanRateFlag = Object.prototype.hasOwnProperty.call(appointment, 'can_rate')
              const normalizedStatus = String(appointment.raw_status || appointment.status || '').toLowerCase()
              const canRate = hasCanRateFlag ? Boolean(appointment.can_rate) : normalizedStatus === 'completed'

              return (
              <div
                key={appointment.id}
                className="rounded-2xl border border-[#eadfd5] bg-white/90 p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-[#3b2f2a]">{appointment.service_name}</div>
                    <div className="text-sm text-[#8f7a6f]">Stylist: {appointment.stylist_name}</div>
                    <div className="text-sm text-[#8f7a6f]">
                      {appointment.appointment_date} at {appointment.appointment_time}
                    </div>
                    <div className="text-sm font-medium text-[#5a463c]">
                      Total: {formatCurrency(appointment.total_amount)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        statusClasses[appointment.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {appointment.status}
                    </span>

                    {appointment.can_reschedule && (
                      <button
                        onClick={() => openReschedule(appointment)}
                        className="tap-safe rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Reschedule
                      </button>
                    )}

                    {appointment.can_cancel && (
                      <button
                        onClick={() => handleCancel(appointment.id)}
                        disabled={submittingCancelId === appointment.id}
                        className="tap-safe rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {submittingCancelId === appointment.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}

                    {canRate && (
                      <button
                        onClick={() => setRatingAppointment(appointment)}
                        className="tap-safe rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      >
                        Rate
                      </button>
                    )}
                  </div>
                </div>

                {rescheduleForId === appointment.id && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">New Date</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">New Time</label>
                        <input
                          type="time"
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        onClick={() => handleReschedule(appointment.id)}
                        disabled={submittingReschedule}
                        className="tap-safe rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
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
            })}
          </div>
        )}
      </div>

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
