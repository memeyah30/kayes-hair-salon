import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../components/AdminLayout'
import RatingModal from '../components/RatingModal'
import LandingFooter from '../components/LandingFooter'
import api from '../utils/api'
import manageBookingApi, {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_PENDING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from '../utils/manageBookingApi'

const statusClasses = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-[#fce7f1] text-[#9b2f64]',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  missed: 'bg-gray-200 text-gray-700',
  booked: 'bg-[#fce7f1] text-[#9b2f64]',
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

const CustomerDashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const initialOtpEmail = (localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY) || '').trim().toLowerCase()
  const initialOtpToken = (localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY) || '').trim()
  const initialCustomerEmail = (localStorage.getItem('customer_email') || '').trim().toLowerCase()
  const initialCustomerPhone = (localStorage.getItem('customer_phone') || '').trim()

  const [otpEmail, setOtpEmail] = useState(initialOtpEmail)
  const [otpToken, setOtpToken] = useState(initialOtpToken)
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail || initialOtpEmail)
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone)
  const [showProfile, setShowProfile] = useState(() => !initialOtpToken && (!initialCustomerEmail || !initialCustomerPhone))
  const [appointments, setAppointments] = useState({ upcoming: [], history: [] })
  const [otpAppointments, setOtpAppointments] = useState([])
  const [loading, setLoading] = useState(false)

  const [rescheduleForId, setRescheduleForId] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)
  const [submittingCancelId, setSubmittingCancelId] = useState(null)
  const [ratingAppointment, setRatingAppointment] = useState(null)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [showBookingHistory, setShowBookingHistory] = useState(false)
  const appointmentsSectionRef = useRef(null)
  const historySectionRef = useRef(null)

  const isOtpSession = Boolean(otpEmail && otpToken)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const queryToken = (params.get('token') || '').trim()
    const queryEmail = (params.get('email') || '').trim().toLowerCase()

    if (!queryToken || !queryEmail) return

    localStorage.setItem(CUSTOMER_BOOKING_TOKEN_KEY, queryToken)
    localStorage.setItem(CUSTOMER_BOOKING_EMAIL_KEY, queryEmail)
    localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)

    setOtpToken(queryToken)
    setOtpEmail(queryEmail)
    setCustomerEmail(queryEmail)
    setShowProfile(false)

    navigate('/customer', { replace: true })
  }, [location.search, navigate])

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getServiceName = (service) => {
    const variantId = service.pivot?.service_variant_id
    if (variantId && service.variants) {
      const variant = service.variants.find(v => v.id === variantId)
      if (variant) return `${service.name} - ${variant.name}`
    }
    return service.name
  }
  const getServicePrice = (service) => {
    const variantId = service.pivot?.service_variant_id
    if (variantId && service.variants) {
      const variant = service.variants.find(v => v.id === variantId)
      if (variant) return variant.price_cents
    }
    return service.price_cents || 0
  }
  const getAppointmentServices = (appointment) => (
    appointment.services && appointment.services.length > 0
      ? appointment.services
      : (appointment.service ? [appointment.service] : [])
  )
  const getAppointmentTotal = (appointment) => (
    getAppointmentServices(appointment).reduce((sum, service) => sum + getServicePrice(service), 0)
  )
  const currencyFromCents = (cents) => `PHP ${(Number(cents || 0) / 100).toFixed(2)}`
  const currency = (amount) => `PHP ${Number(amount || 0).toFixed(2)}`
  const primaryActionButtonClass = 'tap-safe rounded-[30px] bg-[#7b5cf5] px-5 py-2.5 text-white font-semibold shadow-[0_14px_30px_rgba(40,28,110,0.3)] transition hover:-translate-y-px hover:bg-[#8a6cf8] disabled:opacity-60'

  const clearOtpSession = () => {
    localStorage.removeItem(CUSTOMER_BOOKING_TOKEN_KEY)
    localStorage.removeItem(CUSTOMER_BOOKING_EMAIL_KEY)
    localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
    setOtpEmail('')
    setOtpToken('')
    setOtpAppointments([])
  }

  const loadOtpAppointments = async () => {
    try {
      setLoading(true)
      const { data } = await manageBookingApi.get('/manage-booking/appointments')
      setOtpAppointments(data.appointments || [])
    } catch (e) {
      if (e.response?.status === 401) {
        clearOtpSession()
        toast.error('Session expired. Please verify OTP again.')
        navigate('/manage-booking/start')
        return
      }
      toast.error(e.response?.data?.message || 'Failed to load appointments')
      setOtpAppointments([])
    } finally {
      setLoading(false)
    }
  }

  const loadLegacyAppointments = async () => {
    if (!customerEmail || !customerPhone) {
      setAppointments({ upcoming: [], history: [] })
      return
    }

    try {
      setLoading(true)
      const normalizedEmail = customerEmail.trim().toLowerCase()
      const normalizedPhone = customerPhone.replace(/[\s-]/g, '')
      const res = await api.get('/dashboard/customer/stats', {
        params: { email: normalizedEmail, phone: normalizedPhone },
      })
      setAppointments({
        upcoming: res.data.upcoming || [],
        history: res.data.history || [],
      })
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load appointments')
      setAppointments({ upcoming: [], history: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOtpSession) {
      setShowProfile(false)
      loadOtpAppointments()
      return
    }

    if (customerEmail && customerPhone) {
      loadLegacyAppointments()
    } else {
      setAppointments({ upcoming: [], history: [] })
    }
  }, [isOtpSession, customerEmail, customerPhone]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProfile = () => {
    if (!customerEmail || !customerPhone) {
      toast.warn('Please enter your email and phone number')
      return
    }

    const normalizedEmail = customerEmail.trim().toLowerCase()
    const normalizedPhone = customerPhone.replace(/[\s-]/g, '')
    localStorage.setItem('customer_email', normalizedEmail)
    localStorage.setItem('customer_phone', normalizedPhone)
    setCustomerEmail(normalizedEmail)
    setCustomerPhone(normalizedPhone)
    setShowProfile(false)
    loadLegacyAppointments()
    toast.success('Profile saved! Loading your appointments...')
  }

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

    if (!isOtpSession) {
      toast.warn('Please verify with OTP first.')
      navigate('/manage-booking/start')
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
      await loadOtpAppointments()
    } catch (e) {
      if (e.response?.status === 401) {
        clearOtpSession()
        toast.error('Session expired. Please verify OTP again.')
        navigate('/manage-booking/start')
        return
      }
      toast.error(e.response?.data?.message || 'Failed to reschedule appointment.')
    } finally {
      setSubmittingReschedule(false)
    }
  }

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Cancel this appointment?')) return

    if (!isOtpSession) {
      try {
        await api.post(`/appointments/${appointmentId}/cancel`)
        toast.success('Appointment cancelled')
        loadLegacyAppointments()
      } catch {
        toast.error('Failed to cancel appointment')
      }
      return
    }

    try {
      setSubmittingCancelId(appointmentId)
      await manageBookingApi.post(`/manage-booking/appointments/${appointmentId}/cancel`)
      toast.success('Appointment cancelled.')
      await loadOtpAppointments()
    } catch (e) {
      if (e.response?.status === 401) {
        clearOtpSession()
        toast.error('Session expired. Please verify OTP again.')
        navigate('/manage-booking/start')
        return
      }
      toast.error(e.response?.data?.message || 'Failed to cancel appointment.')
    } finally {
      setSubmittingCancelId(null)
    }
  }

  const submitRating = async (payload) => {
    if (!ratingAppointment) return

    if (!isOtpSession) {
      toast.warn('Please verify with OTP first.')
      navigate('/manage-booking/start')
      return
    }

    try {
      setSubmittingRating(true)
      await manageBookingApi.post(`/manage-booking/appointments/${ratingAppointment.id}/rate`, payload)
      toast.success('Thank you for your rating.')
      setRatingAppointment(null)
      await loadOtpAppointments()
    } catch (e) {
      if (e.response?.status === 401) {
        clearOtpSession()
        toast.error('Session expired. Please verify OTP again.')
        navigate('/manage-booking/start')
        return
      }
      toast.error(e.response?.data?.message || 'Failed to submit rating.')
    } finally {
      setSubmittingRating(false)
    }
  }

  const otpUpcomingCount = otpAppointments.filter((a) => ['pending', 'confirmed', 'booked'].includes(a.status)).length
  const totalBookedCount = isOtpSession
    ? otpAppointments.length
    : appointments.upcoming.length + appointments.history.length
  const totalCardInteractive = isOtpSession
    ? otpAppointments.length > 0
    : (appointments.history.length > 0 || appointments.upcoming.length > 0)

  const scrollToLinkedBookings = () => {
    if (!totalCardInteractive) return

    if (!isOtpSession && appointments.history.length > 0) {
      setShowBookingHistory(true)
      return
    }

    appointmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!showBookingHistory) return
    historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [showBookingHistory])

  useEffect(() => {
    if (isOtpSession || appointments.history.length > 0) return
    setShowBookingHistory(false)
  }, [isOtpSession, appointments.history.length])

  if (showProfile && !isOtpSession) {
    return (
      <AdminLayout userType="customer" title="Dashboard" hideUserBadge>
          <div className="app-mobile-shell flex-1">
            <div className="max-w-md mx-auto bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-6">
              <h2 className="text-xl font-bold mb-4">Customer Profile</h2>
              <p className="text-sm text-[#6f5b7e] mb-4">
                Enter the email and phone you used when booking to view your appointments.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="tap-safe w-full border rounded px-3 py-2"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="tap-safe w-full border rounded px-3 py-2"
                    placeholder="09171234567"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className={`${primaryActionButtonClass} w-full`}
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
          <LandingFooter />
      </AdminLayout>
    )
  }

  if (loading) {
    return (
      <AdminLayout userType="customer" title="Dashboard" hideUserBadge>
          <div className="flex flex-1 items-center justify-center min-h-screen">
            <div>Loading your appointments...</div>
          </div>
          <LandingFooter />
      </AdminLayout>
    )
  }

  return (
    <>
      <AdminLayout userType="customer" title="Dashboard" hideUserBadge>
        <div className="app-mobile-shell flex-1 space-y-6">
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
              {!isOtpSession && (
                <button
                  onClick={() => setShowProfile(true)}
                  className="tap-safe w-full sm:w-auto px-4 py-2 border border-[#e2d7ea] bg-white text-[#5c4b68] rounded hover:bg-[#faf6fd] text-sm"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <div className="text-[#7c688f] text-sm">Upcoming Appointments</div>
              <div className="text-2xl font-bold text-[#E75480]">
                {isOtpSession ? otpUpcomingCount : appointments.upcoming.length}
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToLinkedBookings}
              disabled={!totalCardInteractive}
              className={`bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4 text-left transition ${totalCardInteractive ? 'tap-safe hover:-translate-y-px hover:border-[#d9cdf0] cursor-pointer' : 'cursor-default'}`}
            >
              <div className="text-[#7c688f] text-sm">Total Booked Appointments</div>
              <div className="text-2xl font-bold text-emerald-700">{totalBookedCount}</div>
              <div className="text-sm text-[#6f5b7e] mt-2">
                {totalCardInteractive
                  ? (!isOtpSession && appointments.history.length > 0
                    ? 'Click to view booking history'
                    : 'Click to view all bookings linked to this account')
                  : 'All bookings linked to this account'}
              </div>
            </button>
          </div>

          {isOtpSession ? (
            otpAppointments.length > 0 ? (
              <div ref={appointmentsSectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
                <h2 className="font-semibold text-lg mb-4">My Appointments</h2>
                <div className="space-y-3">
                  {otpAppointments.map((appt) => {
                    const canRate = Object.prototype.hasOwnProperty.call(appt, 'can_rate')
                      ? Boolean(appt.can_rate)
                      : String(appt.raw_status || appt.status || '').toLowerCase() === 'completed'
                    const statusLabel = appt.status === 'pending' ? 'booked' : appt.status
                    const isRescheduled = wasRescheduled(appt)
                    const rescheduledAtLabel = formatRescheduledAtLabel(appt.rescheduled_at_pht || appt.rescheduled_at)

                    return (
                      <div key={appt.id} className="border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-lg">{appt.service_name}</div>
                            <div className="text-sm text-[#6f5b7e] mt-1">
                              {appt.appointment_date} at {appt.appointment_time}
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
                            <div className="text-sm text-[#7c688f] mt-1">with {appt.stylist_name}</div>
                            <div className="text-sm font-medium text-green-600 mt-2">
                              {currency(appt.total_amount)}
                            </div>
                          </div>
                          <div className="flex flex-wrap sm:justify-end gap-2 sm:ml-4">
                            {appt.can_reschedule && (
                              <button
                                onClick={() => openReschedule(appt)}
                                className={`${primaryActionButtonClass} px-4 py-1.5 text-sm`}
                              >
                                Reschedule
                              </button>
                            )}
                            {appt.can_cancel && (
                              <button
                                onClick={() => handleCancel(appt.id)}
                                disabled={submittingCancelId === appt.id}
                                className="tap-safe px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm disabled:opacity-60"
                              >
                                {submittingCancelId === appt.id ? 'Cancelling...' : 'Cancel'}
                              </button>
                            )}
                            {canRate && (
                              <button
                                onClick={() => setRatingAppointment(appt)}
                                className="tap-safe px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
                              >
                                Rate
                              </button>
                            )}
                            {!canRate && appt.rating && (
                              <span className="px-2 py-1 rounded text-xs self-center bg-emerald-100 text-emerald-700">
                                Rated {Number(appt.rating.overall_rating) || 0}/5
                              </span>
                            )}
                            {isRescheduled && (
                              <span className="px-2 py-1 rounded text-xs self-center bg-[#ede9fe] text-[#6d28d9]">
                                rescheduled
                              </span>
                            )}
                            <span className={`px-2 py-1 rounded text-xs self-center ${statusClasses[appt.status] || 'bg-gray-100 text-gray-700'}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>

                        {rescheduleForId === appt.id && (
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
                                onClick={() => handleReschedule(appt.id)}
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
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-6 text-center">
                <div className="text-sm font-semibold text-[#6f5b7e] mb-4">No appointments found</div>
                <h3 className="text-xl font-semibold mb-2">No Appointment Yet</h3>
                <p className="text-[#6f5b7e] mb-4">Book a new appointment to get started.</p>
                  <button
                    onClick={() => navigate('/book?fresh=1')}
                    className={primaryActionButtonClass}
                  >
                    Book Appointment Now
                  </button>
              </div>
            )
          ) : appointments.upcoming.length > 0 ? (
            <div ref={appointmentsSectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-4">
              <h2 className="font-semibold text-lg mb-4">Upcoming Appointments</h2>
              <div className="space-y-3">
                {appointments.upcoming.map((appt) => {
                  const appointmentDate = new Date(getStart(appt))
                  const appointmentServices = getAppointmentServices(appt)
                  const totalPrice = getAppointmentTotal(appt)
                  const isRescheduled = wasRescheduled(appt)
                  const rescheduledAtLabel = formatRescheduledAtLabel(appt.rescheduled_at_pht || appt.rescheduled_at)

                  return (
                    <div key={appt.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {appointmentServices.length > 1 ? (
                              <span>{appointmentServices.length} Services</span>
                            ) : (
                              <span>{appointmentServices[0]?.name || 'Service'}</span>
                            )}
                          </div>
                          {appointmentServices.length > 1 && (
                            <div className="text-sm text-[#6f5b7e] mt-1">
                              <ul className="list-disc list-inside ml-2 space-y-0.5">
                                {appointmentServices.map((s, idx) => (
                                  <li key={idx}>{getServiceName(s)} - {currencyFromCents(getServicePrice(s))}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-sm text-[#6f5b7e] mt-1">
                            {appointmentDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              timeZone: 'Asia/Manila',
                            })}{' '}
                            at{' '}
                            {appointmentDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Manila',
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
                          <div className="text-sm text-[#7c688f] mt-1">with {appt.stylist?.name}</div>
                          <div className="text-sm font-medium text-green-600 mt-2">
                            {appointmentServices.length > 1 ? (
                              <span>Total: {currencyFromCents(totalPrice)}</span>
                            ) : (
                              <span>{currencyFromCents(totalPrice)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-4">
                          {appt.status === 'booked' && (
                            <>
                              <button
                                onClick={() => { window.location.href = `/book?reschedule=${appt.id}` }}
                                className={`${primaryActionButtonClass} px-4 py-1.5 text-sm`}
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancel(appt.id)}
                                className="tap-safe px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          {isRescheduled && (
                            <span className="px-2 py-1 rounded text-xs self-center bg-[#ede9fe] text-[#6d28d9]">
                              rescheduled
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs self-center ${statusClasses[appt.status] || 'bg-gray-100 text-gray-700'}`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div ref={appointmentsSectionRef} className="bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.08)] p-6 text-center">
              <div className="text-sm font-semibold text-[#6f5b7e] mb-4">No upcoming appointments</div>
              <h3 className="text-xl font-semibold mb-2">No Upcoming Appointment</h3>
              <p className="text-[#6f5b7e] mb-4">Book a new appointment to get started.</p>
              <button
                onClick={() => navigate('/book?fresh=1')}
                className={primaryActionButtonClass}
              >
                Book Appointment Now
              </button>
            </div>
          )}

          {!isOtpSession && showBookingHistory && appointments.history.length > 0 && (
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
                {appointments.history.map((appt) => {
                  const appointmentDate = new Date(getStart(appt))
                  const appointmentServices = getAppointmentServices(appt)
                  const totalPrice = getAppointmentTotal(appt)
                  const isRescheduled = wasRescheduled(appt)
                  const rescheduledAtLabel = formatRescheduledAtLabel(appt.rescheduled_at_pht || appt.rescheduled_at)

                  return (
                    <div key={appt.id} className="border rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {appointmentServices.length > 1 ? (
                              <span>{appointmentServices.length} Services</span>
                            ) : (
                              <span>{appointmentServices[0]?.name || 'Service'}</span>
                            )}
                          </div>
                          {appointmentServices.length > 1 && (
                            <div className="text-sm text-[#6f5b7e] mt-1">
                              <ul className="list-disc list-inside ml-2 space-y-0.5">
                                {appointmentServices.map((s, idx) => (
                                  <li key={idx}>{getServiceName(s)} - {currencyFromCents(getServicePrice(s))}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-sm text-[#6f5b7e] mt-1">
                            {appointmentDate.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              timeZone: 'Asia/Manila',
                            })}{' '}
                            at{' '}
                            {appointmentDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Manila',
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
                          <div className="text-sm text-[#7c688f] mt-1">with {appt.stylist?.name || 'No stylist assigned'}</div>
                          <div className="text-sm font-medium text-green-600 mt-2">
                            {appointmentServices.length > 1 ? (
                              <span>Total: {currencyFromCents(totalPrice)}</span>
                            ) : (
                              <span>{currencyFromCents(totalPrice)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:ml-4">
                          {isRescheduled && (
                            <span className="px-2 py-1 rounded text-xs self-center bg-[#ede9fe] text-[#6d28d9]">
                              rescheduled
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded text-xs self-center ${statusClasses[appt.status] || 'bg-gray-100 text-gray-700'}`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <LandingFooter />
      </AdminLayout>
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
  )
}

export default CustomerDashboard
