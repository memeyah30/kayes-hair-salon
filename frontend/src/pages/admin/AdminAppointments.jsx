import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'
import Pagination from '../../components/Pagination'
import { resolveAssetUrl } from '../../utils/runtime'

const toRgba = (hex, alpha) => {
  if (!hex) return `rgba(0,0,0,${alpha})`
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getStatusBadgeStyle = (status) => {
  if (status === 'completed' || status === 'confirmed') {
    return {
      backgroundColor: toRgba('#6ea499', 0.18),
      color: '#4f8177',
    }
  }

  if (status === 'cancelled' || status === 'missed') {
    return {
      backgroundColor: toRgba('#cc6b84', 0.18),
      color: '#9a4963',
    }
  }

  return {
    backgroundColor: toRgba('#df9a57', 0.18),
    color: '#9d6a2d',
  }
}

const glassPanelClass = 'rounded-[24px] border border-white/32 bg-white/76 p-4 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md animate-fadeInUp'
const statCardClass = 'rounded-[20px] border border-white/32 bg-white/76 p-4 shadow-[0_16px_34px_rgba(59,31,114,0.12)] backdrop-blur-md animate-fadeInUp'
const emptyStateClass = 'py-12 text-center text-[#856fb4] font-medium'

const titleCaseStatus = (s) => {
  if (!s) return 'Unknown'
  const lower = s.toLowerCase().trim()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

const GradientMetricCard = ({ title, value, note, icon, start, end, onClick, delay = 0, isHero = false }) => {
  const Wrapper = onClick ? 'button' : 'div'
  const delayClass = {
    0: '',
    100: 'animation-delay-100',
    200: 'animation-delay-200',
    300: 'animation-delay-300',
    400: 'animation-delay-400',
  }[delay] || ''
  
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[22px] border border-white/18 p-4 text-left text-white shadow-[0_12px_28px_rgba(39,19,88,0.18)] transition duration-200 animate-fadeInUp ${delayClass} ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(39,19,88,0.22)]' : ''
      }`}
      style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
    >
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/85">{title}</div>
            <div className="mt-1 text-xl font-bold leading-none">{value}</div>
            {note && <div className="mt-1 text-[10px] opacity-75">{note}</div>}
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/16 text-white shadow-sm">
            {icon}
          </div>
        </div>
      </div>
    </Wrapper>
  )
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MOBILE_TABS = [
  { id: 'calendar', label: 'Calendar' },
  { id: 'slots', label: 'Time Slots' },
  { id: 'appointments', label: 'Appointments' },
]
const SLOT_CAPACITY = 5
const BUSINESS_SLOT_KEYS = Array.from({ length: 12 }, (_, index) =>
  `${String(index + 8).padStart(2, '0')}:00`
)

const normalizeStatus = (status) => (status || '').toLowerCase().trim()

const parseDateKey = (dateKey) => {
  if (!dateKey) return null
  const parts = dateKey.split('-').map((value) => Number(value))
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) return null
  return { year: parts[0], month: parts[1], day: parts[2] }
}

const monthStartFromKey = (dateKey) => {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return null
  return new Date(parsed.year, parsed.month - 1, 1)
}

const dateFromKey = (dateKey) => {
  const parsed = parseDateKey(dateKey)
  if (!parsed) return null
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0))
}

const formatDateKeyLabel = (dateKey, options) => {
  const date = dateFromKey(dateKey)
  if (!date) return 'N/A'
  return date.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', ...options })
}

const formatTimeKeyLabel = (timeKey) => {
  if (!timeKey) return 'N/A'
  const [hourText, minuteText] = timeKey.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeKey
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = ((hour + 11) % 12) + 1
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`
}

const isRescheduledAppointment = (appointment) => Boolean(appointment?.is_rescheduled || appointment?.rescheduled_at)

const formatRescheduledTimestampLabel = (value) => {
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

const getCustomerInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name[0].toUpperCase()
}

const getCustomerColor = (name) => {
  const colors = [
    { bg: '#E0E7FF', text: '#4338CA' }, // Indigo
    { bg: '#FCE7F3', text: '#BE185D' }, // Pink
    { bg: '#FEF3C7', text: '#B45309' }, // Amber
    { bg: '#DCFCE7', text: '#15803D' }, // Green
    { bg: '#DBEAFE', text: '#1D4ED8' }, // Blue
    { bg: '#F3E8FF', text: '#7E22CE' }, // Purple
  ]
  if (!name) return colors[0]
  const charCode = name.charCodeAt(0)
  return colors[charCode % colors.length]
}

const buildMonthGrid = (monthDate) => {
  const year = monthDate.getFullYear()
  const monthIndex = monthDate.getMonth()
  const firstWeekday = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate()
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7
  const cells = []

  for (let index = 0; index < totalCells; index += 1) {
    const dayOffset = index - firstWeekday + 1
    let cellYear = year
    let cellMonthIndex = monthIndex
    let dayNumber = dayOffset
    let isCurrentMonth = true

    if (dayOffset <= 0) {
      isCurrentMonth = false
      dayNumber = daysInPrevMonth + dayOffset
      if (monthIndex === 0) {
        cellYear -= 1
        cellMonthIndex = 11
      } else {
        cellMonthIndex -= 1
      }
    } else if (dayOffset > daysInMonth) {
      isCurrentMonth = false
      dayNumber = dayOffset - daysInMonth
      if (monthIndex === 11) {
        cellYear += 1
        cellMonthIndex = 0
      } else {
        cellMonthIndex += 1
      }
    }

    cells.push({
      dateKey: `${cellYear}-${String(cellMonthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`,
      dayNumber,
      isCurrentMonth,
    })
  }

  return cells
}

const statusPillClass = (status) => {
  if (status === 'confirmed') return 'bg-[#DCFCE7] text-[#15803D]'
  if (status === 'pending') return 'bg-[#FEF3C7] text-[#B45309]'
  if (status === 'booked') return 'bg-[#DBEAFE] text-[#1D4ED8]'
  if (status === 'completed') return 'bg-[#DCFCE7] text-[#15803D]'
  if (status === 'cancelled') return 'bg-[#FEE2E2] text-[#B91C1C]'
  if (status === 'missed') return 'bg-[#FDE68A] text-[#92400E]'
  return 'bg-[#F2EDFF] text-[#6B6B6B]'
}

const getFifoId = (appointment) => {
  const bookingId = Number(appointment.booking_id)
  if (!Number.isNaN(bookingId)) return bookingId
  const id = Number(appointment.id)
  if (!Number.isNaN(id)) return id
  return Number.MAX_SAFE_INTEGER
}

const sortByFifo = (a, b) => {
  const aCreated = a.created_at || a.createdAt
  const bCreated = b.created_at || b.createdAt
  if (aCreated && bCreated) {
    const aTime = new Date(aCreated).getTime()
    const bTime = new Date(bCreated).getTime()
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime) && aTime !== bTime) {
      return aTime - bTime
    }
  }
  return getFifoId(a) - getFifoId(b)
}

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [tableAppointments, setTableAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [filter, setFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const statusParam = (params.get('status') || '').toLowerCase().trim()
    if (statusParam === 'pending' || statusParam === 'booked') return 'booked'
    if (['all', 'confirmed', 'completed', 'cancelled', 'missed'].includes(statusParam)) return statusParam
    return 'all'
  })
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null)
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    preferred_time: '',
    reschedule_reason: '',
  })
  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [searchDate, setSearchDate] = useState(() => new URLSearchParams(window.location.search).get('date') || '')
  const [searchEndDate, setSearchEndDate] = useState(() => new URLSearchParams(window.location.search).get('end_date') || '')
  const [searchServiceId, setSearchServiceId] = useState(() => new URLSearchParams(window.location.search).get('serviceId') || '')
  const [rangeFilter, setRangeFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const rangeParam = (params.get('range') || '').toLowerCase().trim()
    return ['today', 'week', 'month'].includes(rangeParam) ? rangeParam : ''
  })
  const [statusDateScope, setStatusDateScope] = useState('month') // day | month | year | all
  const [openActionId, setOpenActionId] = useState(null)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [selectedProofLoadError, setSelectedProofLoadError] = useState(false)
  const [processingAppointmentId, setProcessingAppointmentId] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [mobileTab, setMobileTab] = useState('calendar')
  const [tablePage, setTablePage] = useState(1)
  const [tablePagination, setTablePagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  })
  const navigate = useNavigate()
  const location = useLocation()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'
  const canAccessSales = storedUserType === 'admin'
  const [showRejectionModal, setShowRejectionModal] = useState(false)
  const [rejectingAppointmentId, setRejectingAppointmentId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageModalUrl, setImageModalUrl] = useState('')

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getAppointmentServices = (appointment) =>
    appointment.services && appointment.services.length > 0
      ? appointment.services
      : (appointment.service ? [appointment.service] : [])
  const getServiceVariant = (service) => {
    const variantId = service?.pivot?.service_variant_id
    if (!variantId || !Array.isArray(service?.variants)) return null
    return service.variants.find((variant) => String(variant.id) === String(variantId)) || null
  }
  const getServiceName = (service) => {
    if (!service) return 'Service'
    const variant = getServiceVariant(service)
    if (variant?.name) return `${service.name || 'Service'} - ${variant.name}`
    return service.name || 'Service'
  }
  const getServicePriceCents = (service) => {
    const variant = getServiceVariant(service)
    const price = variant?.price_cents ?? service?.price_cents ?? 0
    const parsed = Number(price)
    return Number.isFinite(parsed) ? parsed : 0
  }
  const getAppointmentTotalPriceCents = (appointment) => {
    const storedTotal = Number(appointment?.total_amount_cents)
    if (Number.isFinite(storedTotal)) return storedTotal
    return getAppointmentServices(appointment).reduce((sum, service) => sum + getServicePriceCents(service), 0)
  }
  const getAppointmentAmountPaidCents = (appointment) => {
    const storedAmountPaid = Number(appointment?.amount_paid_cents)
    if (Number.isFinite(storedAmountPaid)) return Math.max(0, storedAmountPaid)

    const totalAmountCents = getAppointmentTotalPriceCents(appointment)
    const modeOfPayment = String(appointment?.mode_of_payment || '').toLowerCase().trim()
    if (modeOfPayment === 'full') return totalAmountCents

    const downpaymentAmountCents = Number(appointment?.downpayment_amount_cents)
    if (Number.isFinite(downpaymentAmountCents)) return Math.max(0, downpaymentAmountCents)

    return 0
  }
  const getAppointmentRemainingBalanceCents = (appointment) => {
    const storedRemainingBalance = Number(appointment?.remaining_balance_cents)
    if (Number.isFinite(storedRemainingBalance)) return Math.max(0, storedRemainingBalance)

    const totalAmountCents = getAppointmentTotalPriceCents(appointment)
    return Math.max(0, totalAmountCents - getAppointmentAmountPaidCents(appointment))
  }
  const getServiceDurationMinutes = (service) =>
    Number(service?.duration_minutes || service?.duration || service?.estimated_duration_minutes || 0)
  const formatManilaDate = (value) => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    } catch {
      return ''
    }
  }
  const formatManilaTimeKey = (value) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(value))
    } catch {
      return ''
    }
  }
  const titleCaseStatus = (status) => {
    const normalized = normalizeStatus(status)
    if (!normalized) return 'Unknown'
    if (normalized === 'booked') return 'Pending'
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }
  const toManilaDate = (value) => formatManilaDate(value)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const statusParam = (params.get('status') || '').toLowerCase().trim()
    const dateParam = params.get('date') || ''
    const endDateParam = params.get('end_date') || ''
    const rangeParam = params.get('range') || ''
    const serviceIdParam = params.get('serviceId') || ''
    const queryParam = params.get('q') || ''

    let nextFilter = 'all'
    if (statusParam) {
      if (statusParam === 'pending' || statusParam === 'booked') {
        nextFilter = 'booked'
      } else if (['all', 'confirmed', 'completed', 'cancelled', 'missed'].includes(statusParam)) {
        nextFilter = statusParam
      }
    }

    let nextRangeFilter = ''
    if (rangeParam) {
      const normalizedRange = rangeParam.toLowerCase()
      const allowedRanges = ['today', 'week', 'month']
      if (allowedRanges.includes(normalizedRange)) {
        nextRangeFilter = normalizedRange
      }
    }

    setFilter(nextFilter)
    setSearchTerm(queryParam)
    setSearchServiceId(serviceIdParam)
    
    if (nextFilter === 'booked' || nextFilter === 'completed') {
      setStatusDateScope('month')
    }

    if (dateParam || endDateParam) {
      setSearchDate(dateParam)
      setSearchEndDate(endDateParam)
      setRangeFilter('')
    } else {
      setSearchDate('')
      setSearchEndDate('')
      setRangeFilter(nextRangeFilter)
    }
  }, [location.search])

  const applyStatusOnlyFilter = (nextFilter) => {
    setFilter(nextFilter)
    setSearchTerm('')
    setSearchDate('')
    setSearchEndDate('')
    setSearchServiceId('')
    setRangeFilter('')
    if (nextFilter === 'booked' || nextFilter === 'completed') {
      setStatusDateScope('month')
    }
    setSelectedDate('')
    setSelectedTimeSlot('')
    setMobileTab('calendar')
  }

  useEffect(() => {
    if (!searchDate) return
    setSelectedDate(searchDate)
    const month = monthStartFromKey(searchDate)
    if (month) setCalendarMonth(month)
  }, [searchDate])

  const rangeDates = useMemo(() => {
    if (!rangeFilter) return null
    const today = formatManilaDate(new Date())
    if (!today) return null
    if (rangeFilter === 'today') {
      return { start: today, end: today }
    }
    const todayStart = new Date(`${today}T00:00:00+08:00`)
    if (rangeFilter === 'week') {
      const startDate = new Date(todayStart)
      startDate.setDate(startDate.getDate() - 6)
      return { start: formatManilaDate(startDate), end: today }
    }
    if (rangeFilter === 'month') {
      const [year, month] = today.split('-')
      const monthStart = new Date(`${year}-${month}-01T00:00:00+08:00`)
      return { start: formatManilaDate(monthStart), end: today }
    }
    return null
  }, [rangeFilter])

  const scopedStatusDateWindow = useMemo(() => {
    if (statusDateScope === 'all') return null

    const anchorDate = searchDate || formatManilaDate(new Date())
    const parsed = parseDateKey(anchorDate)
    if (!parsed) return null

    if (statusDateScope === 'year') {
      return {
        start: `${parsed.year}-01-01`,
        end: `${parsed.year}-12-31`,
      }
    }

    if (statusDateScope === 'month') {
      const lastDay = new Date(parsed.year, parsed.month, 0).getDate()
      return {
        start: `${parsed.year}-${String(parsed.month).padStart(2, '0')}-01`,
        end: `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      }
    }

    return { start: anchorDate, end: anchorDate }
  }, [searchDate, statusDateScope])

  const tableDateWindow = useMemo(() => {
    if (rangeDates) {
      return rangeDates
    }
    if (searchDate && searchEndDate) {
      return { start: searchDate, end: searchEndDate }
    }
    if (scopedStatusDateWindow) {
      return scopedStatusDateWindow
    }
    if (searchDate) {
      return { start: searchDate, end: searchDate }
    }
    return null
  }, [scopedStatusDateWindow, searchDate, searchEndDate, rangeDates])

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest('.apt-actions')) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setTablePage(1)
  }, [filter, searchTerm, searchDate, searchEndDate, searchServiceId, rangeFilter, statusDateScope])

  useEffect(() => {
    loadTableData(tablePage)
  }, [tablePage, filter, searchTerm, searchDate, searchEndDate, searchServiceId, rangeFilter, statusDateScope, tableDateWindow])

  const loadData = async () => {
    try {
      setLoading(true)
      const [apptsRes, servicesRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/services'),
      ])
      setAppointments(apptsRes.data)
      setServices(servicesRes.data)
    } catch {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadTableData = async (page = 1) => {
    try {
      setTableLoading(true)

      const params = {
        paginate: 1,
        per_page: 10,
        page,
      }

      if (filter !== 'all') {
        params.status = filter
      }
      if (searchServiceId) {
        params.service_id = searchServiceId
      }
      if (normalizedSearch) {
        params.q = searchTerm.trim()
      }
      if (tableDateWindow?.start) {
        params.start_date = tableDateWindow.start
      }
      if (tableDateWindow?.end) {
        params.end_date = tableDateWindow.end
      }

      const res = await api.get('/appointments', { params })
      setTableAppointments(res.data?.data || [])
      setTablePagination({
        current_page: res.data?.current_page || 1,
        last_page: res.data?.last_page || 1,
        per_page: res.data?.per_page || 10,
        total: res.data?.total || 0,
        from: res.data?.from || 0,
        to: res.data?.to || 0,
      })
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load appointments')
      setTableAppointments([])
      setTablePagination({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
      })
    } finally {
      setTableLoading(false)
    }
  }

  const updateAppointmentInState = (appointmentId, updater) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? updater(apt) : apt))
    )
    setSelectedAppointment((prev) =>
      prev && prev.id === appointmentId ? updater(prev) : prev
    )
  }

  const handleAction = async (id, action) => {
    if (processingAppointmentId === id) return
    try {
      setProcessingAppointmentId(id)
      if (action === 'complete') {
        const response = await api.post(`/appointments/${id}/complete`)
        if (response?.data?.id) {
          updateAppointmentInState(id, () => response.data)
        } else {
          updateAppointmentInState(id, (apt) => ({
            ...apt,
            status: 'completed',
            payment_status: 'paid',
          }))
        }
        toast.success(canAccessSales ? 'Appointment marked as completed and sales recorded' : 'Appointment marked as completed')
      } else if (action === 'confirm') {
        const response = await api.post(`/appointments/${id}/confirm`)
        if (response?.data?.id) {
          updateAppointmentInState(id, () => response.data)
        } else {
          updateAppointmentInState(id, (apt) => ({ ...apt, status: 'confirmed' }))
        }
        toast.success('Appointment confirmed')
      } else if (action === 'reject') {
        setRejectingAppointmentId(id)
        setRejectionReason('')
        setShowRejectionModal(true)
        setProcessingAppointmentId(null)
        return
      } else if (action === 'delete') {
        await api.delete(`/appointments/${id}`)
        setAppointments((prev) => prev.filter((apt) => apt.id !== id))
        setSelectedAppointment((prev) => (prev && prev.id === id ? null : prev))
        toast.success('Appointment deleted successfully')
      }
      setOpenActionId(null)
      await loadData()
      await loadTableData(tablePage)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update appointment')
    } finally {
      setProcessingAppointmentId(null)
    }
  }

  const submitRejection = async () => {
    if (!rejectingAppointmentId || isRejecting) return
    if (!rejectionReason.trim()) {
      toast.warn('Please provide a reason for rejection')
      return
    }

    try {
      setIsRejecting(true)
      const response = await api.post(`/appointments-reject/${rejectingAppointmentId}`, {
        reason: rejectionReason.trim(),
      })

      if (response?.data?.appointment) {
        updateAppointmentInState(rejectingAppointmentId, () => response.data.appointment)
      } else {
        updateAppointmentInState(rejectingAppointmentId, (apt) => ({ ...apt, status: 'cancelled' }))
      }

      toast.success('Appointment rejected and customer notified')
      setShowRejectionModal(false)
      setRejectingAppointmentId(null)
      setRejectionReason('')
      await loadData()
      await loadTableData(tablePage)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reject appointment')
    } finally {
      setIsRejecting(false)
    }
  }

  const handlePaymentStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}`, { payment_status: status })
      toast.success(`Payment marked as ${status.toUpperCase()}`)
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update payment status')
    }
  }

  const handleRescheduleClick = (appointment) => {
    setReschedulingAppointment(appointment)
    const appointmentDate = new Date(getStart(appointment))
    setRescheduleData({
      date: appointmentDate.toISOString().split('T')[0],
      preferred_time: appointmentDate.toTimeString().slice(0, 5),
      reschedule_reason: '',
    })
    setShowRescheduleModal(true)
  }

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault()
    if (!reschedulingAppointment) return

    try {
      await api.post(`/appointments/${reschedulingAppointment.id}/reschedule`, rescheduleData)
      toast.success('Appointment rescheduled successfully')
      setShowRescheduleModal(false)
      setReschedulingAppointment(null)
      setRescheduleData({
        date: '',
        preferred_time: '',
        reschedule_reason: '',
      })
      await loadData()
      await loadTableData(tablePage)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reschedule appointment')
    }
  }

  const handleDelete = async (apt) => {
    const appointmentServices = getAppointmentServices(apt)
    const confirmMessage = `Are you sure you want to permanently delete this appointment?\n\n` +
      `Customer: ${apt.customer_name}\n` +
      `Service: ${getServiceName(appointmentServices[0])}\n` +
      `Date: ${new Date(getStart(apt)).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT\n\n` +
      `This action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      await handleAction(apt.id, 'delete')
    }
  }

  const monthKey = formatManilaDate(new Date()).slice(0, 7)
  const monthlyStats = useMemo(() => {
    let total = 0
    let pending = 0
    let completed = 0
    let revenueCents = 0

    const range = tableDateWindow

    appointments.forEach((apt) => {
      const aptDate = toManilaDate(getStart(apt))
      if (!range || (aptDate && aptDate >= range.start && aptDate <= range.end)) {
        total += 1
        if (apt.status === 'completed') {
          completed += 1
          revenueCents += getAppointmentTotalPriceCents(apt)
        }
        if (apt.status === 'booked' || apt.status === 'confirmed') {
          pending += 1
        }
      }
    })

    return { total, pending, completed, revenueCents }
  }, [appointments, tableDateWindow, toManilaDate])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAppointments = appointments.filter(apt => {
    if (filter !== 'all') {
      if (filter === 'booked') {
        if (apt.status !== 'booked' && apt.status !== 'confirmed') return false
      } else if (filter === 'confirmed') {
        if (apt.status !== 'confirmed') return false
      } else if (apt.status !== filter) {
        return false
      }
    }

    const appointmentServices = getAppointmentServices(apt)

    if (searchServiceId) {
      const serviceIdNum = parseInt(searchServiceId, 10)
      if (!appointmentServices.some(s => s.id === serviceIdNum)) return false
    }

    const aptDate = toManilaDate(getStart(apt))
    if (rangeDates) {
      if (!aptDate || aptDate < rangeDates.start || aptDate > rangeDates.end) return false
    } else if (scopedStatusDateWindow) {
      if (!aptDate || aptDate < scopedStatusDateWindow.start || aptDate > scopedStatusDateWindow.end) return false
    } else if (searchDate) {
      if (aptDate !== searchDate) return false
    }

      if (normalizedSearch) {
        const customerName = (apt.customer_name || '').toLowerCase()
        const customerPhone = (apt.customer_phone || '').toLowerCase()
        const serviceNames = appointmentServices.map((service) => getServiceName(service)).join(' ').toLowerCase()
        if (
          !customerName.includes(normalizedSearch) &&
          !customerPhone.includes(normalizedSearch) &&
        !serviceNames.includes(normalizedSearch)
      ) return false
    }

    return true
  })

  const paginatedAppointments = useMemo(() => {
    return [...tableAppointments]
  }, [tableAppointments])

  const calendarDateCounts = useMemo(() => {
    const counts = {}
    filteredAppointments.forEach((apt) => {
      const dateKey = toManilaDate(getStart(apt))
      if (!dateKey) return
      if (!counts[dateKey]) {
        counts[dateKey] = { pending: 0, confirmed: 0, completed: 0 }
      }
      const status = normalizeStatus(apt.status)
      if (status === 'confirmed') counts[dateKey].confirmed += 1
      else if (status === 'completed') counts[dateKey].completed += 1
      else if (status !== 'cancelled') counts[dateKey].pending += 1
    })
    return counts
  }, [filteredAppointments, toManilaDate])

  const appointmentsByDateAndSlot = useMemo(() => {
    const grouped = {}
    filteredAppointments.forEach((apt) => {
      const dateKey = toManilaDate(getStart(apt))
      const slotKey = formatManilaTimeKey(getStart(apt))
      if (!dateKey || !slotKey) return
      if (!grouped[dateKey]) grouped[dateKey] = {}
      if (!grouped[dateKey][slotKey]) grouped[dateKey][slotKey] = []
      grouped[dateKey][slotKey].push(apt)
    })
    Object.keys(grouped).forEach((dateKey) => {
      Object.keys(grouped[dateKey]).forEach((slotKey) => {
        grouped[dateKey][slotKey] = [...grouped[dateKey][slotKey]].sort(sortByFifo)
      })
    })
    return grouped
  }, [filteredAppointments])

  const selectedDateSlots = useMemo(() => {
    if (!selectedDate) return []
    const slots = appointmentsByDateAndSlot[selectedDate] || {}
    return Array.from(new Set([...BUSINESS_SLOT_KEYS, ...Object.keys(slots)])).sort((a, b) => a.localeCompare(b))
  }, [appointmentsByDateAndSlot, selectedDate])

  useEffect(() => {
    setSelectedTimeSlot('')
  }, [selectedDate])

  useEffect(() => {
    if (!selectedTimeSlot && mobileTab === 'appointments') {
      setMobileTab(selectedDate ? 'slots' : 'calendar')
    }
  }, [selectedDate, selectedTimeSlot, mobileTab])

  const timeSlotSummaries = useMemo(() => {
    if (!selectedDate) return []
    return selectedDateSlots.map((slotKey) => {
      const slotAppointments = appointmentsByDateAndSlot[selectedDate]?.[slotKey] || []
      const statusCounts = slotAppointments.reduce((acc, apt) => {
        const status = normalizeStatus(apt.status)
        if (status === 'confirmed') acc.confirmed += 1
        else if (status === 'completed') acc.completed += 1
        else if (status !== 'cancelled') acc.pending += 1
        return acc
      }, { pending: 0, confirmed: 0, completed: 0 })
      return {
        slotKey,
        total: slotAppointments.length,
        ...statusCounts,
        isFull: SLOT_CAPACITY > 0 && slotAppointments.length >= SLOT_CAPACITY,
      }
    })
  }, [appointmentsByDateAndSlot, selectedDate, selectedDateSlots])

  const slotAppointments = useMemo(() => {
    if (!selectedDate || !selectedTimeSlot) return []
    const appointmentsInSlot = appointmentsByDateAndSlot[selectedDate]?.[selectedTimeSlot] || []
    return [...appointmentsInSlot].sort(sortByFifo)
  }, [appointmentsByDateAndSlot, selectedDate, selectedTimeSlot])
  const calendarCells = useMemo(() => buildMonthGrid(calendarMonth), [calendarMonth])
  const selectedDateLongLabel = formatDateKeyLabel(selectedDate, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const selectedDateShortLabel = formatDateKeyLabel(selectedDate, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`

  const shouldHidePaymentStatusBadge = (method, appointmentStatus) => {
    const normalizedMethod = (method || '').toLowerCase()
    const normalizedAppointmentStatus = normalizeStatus(appointmentStatus)
    return normalizedMethod === 'on_hand' && normalizedAppointmentStatus === 'completed'
  }

  const effectivePaymentStatus = (status, appointmentStatus, method) => {
    const normalizedStatus = (status || 'unpaid').toLowerCase()
    const normalizedAppointmentStatus = normalizeStatus(appointmentStatus)
    const normalizedMethod = (method || '').toLowerCase()

    // For paid-at-salon downpayment bookings, show PENDING while appointment is active.
    if (
      normalizedMethod === 'on_hand' &&
      normalizedStatus === 'downpayment' &&
      (normalizedAppointmentStatus === 'booked' || normalizedAppointmentStatus === 'confirmed')
    ) {
      return 'pending'
    }

    return normalizedStatus
  }
  const paymentStatusLabel = (status, appointmentStatus, method) => {
    if (shouldHidePaymentStatusBadge(method, appointmentStatus)) return ''
    const normalizedStatus = effectivePaymentStatus(status, appointmentStatus, method)
    const map = {
      unpaid: 'UNPAID',
      pending: 'PENDING',
      paid: 'PAID',
      rejected: 'REJECTED',
      downpayment: 'DOWNPAYMENT',
      refunded: 'REFUNDED',
    }
    return map[normalizedStatus] || normalizedStatus.toUpperCase()
  }
  const paymentStatusClass = (status, appointmentStatus, method) => {
    if (shouldHidePaymentStatusBadge(method, appointmentStatus)) return ''
    const s = effectivePaymentStatus(status, appointmentStatus, method)
    if (s === 'paid') return 'bg-[#DCFCE7] text-[#15803D]'
    if (s === 'pending' || s === 'downpayment') return 'bg-[#FEF3C7] text-[#B45309]'
    if (s === 'rejected' || s === 'refunded') return 'bg-[#FEE2E2] text-[#B91C1C]'
    return 'bg-[#F2EDFF] text-[#6B6B6B]'
  }
  const paymentChoiceLabel = (method, status, appointmentStatus) => {
    const normalizedMethod = (method || '').toLowerCase()
    const normalizedStatus = (status || '').toLowerCase()
    if (normalizedMethod === 'online') return 'Online Payment (GCash)'
    if (normalizedMethod === 'on_hand' && normalizedStatus === 'downpayment') return 'Paid at Salon (Downpayment)'
    if (normalizedMethod === 'on_hand') return 'Paid at Salon'
    if (normalizedStatus === 'downpayment') return 'Downpayment'
    return 'Not Set'
  }
  const paymentChoiceClass = (method, status, appointmentStatus) => {
    const normalizedMethod = (method || '').toLowerCase()
    const normalizedStatus = (status || '').toLowerCase()
    if (normalizedMethod === 'online') return 'bg-[#EDE9FE] text-[#6D4DE6]'
    if (normalizedMethod === 'on_hand' && normalizedStatus === 'downpayment') return 'bg-[#FEF3C7] text-[#B45309]'
    if (normalizedMethod === 'on_hand') return 'bg-[#EEF2FF] text-[#5B3CC4]'
    if (normalizedStatus === 'downpayment') return 'bg-[#FEF3C7] text-[#B45309]'
    return 'bg-[#F2EDFF] text-[#6B6B6B]'
  }
  const shouldShowPaymentStatusBadge = (method, status, appointmentStatus) =>
    !shouldHidePaymentStatusBadge(method, appointmentStatus)
  const handleOpenImageModal = (url) => {
    if (!url) return
    setImageModalUrl(url)
    setShowImageModal(true)
  }

  const resolveProofUrl = (url) => {
    if (!url) return null
    return resolveAssetUrl(url)
  }

  const selectedAppointmentServices = selectedAppointment ? getAppointmentServices(selectedAppointment) : []
  const selectedProofUrl = selectedAppointment ? resolveProofUrl(selectedAppointment.payment_proof_url) : null
  const selectedStartDate = selectedAppointment ? new Date(getStart(selectedAppointment)) : null
  const selectedStatus = normalizeStatus(selectedAppointment?.status)
  const selectedStatusLabel = titleCaseStatus(selectedStatus)
  const selectedIsRescheduled = isRescheduledAppointment(selectedAppointment)
  const selectedRescheduledAtLabel = formatRescheduledTimestampLabel(
    selectedAppointment?.rescheduled_at_pht || selectedAppointment?.rescheduled_at
  )
  const selectedDateLabel = selectedStartDate
    ? selectedStartDate.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium' })
    : 'N/A'
  const selectedTimeLabel = selectedStartDate
    ? selectedStartDate.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })
    : 'N/A'
  const selectedTotalPrice = selectedAppointment ? getAppointmentTotalPriceCents(selectedAppointment) : 0
  const selectedAmountPaid = selectedAppointment ? getAppointmentAmountPaidCents(selectedAppointment) : 0
  const selectedRemainingBalance = selectedAppointment ? getAppointmentRemainingBalanceCents(selectedAppointment) : 0
  const selectedCreatedAtLabel = selectedAppointment?.created_at
    ? formatRescheduledTimestampLabel(selectedAppointment.created_at)
    : 'N/A'

  useEffect(() => {
    setSelectedProofLoadError(false)
  }, [selectedAppointment?.id, selectedProofUrl])

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear(); sessionStorage.clear()
      navigate(loginPath)
    })
  }

  const todayKey = formatManilaDate(new Date())
  const calendarMonthLabel = calendarMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })


  return (
    <AdminLayout
      userType={storedUserType}
      onLogout={handleLogout}
      title="Appointments"
    >
      <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="tap-safe flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-xl font-bold text-[#7B5CF5] shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition hover:bg-[#F6F2FF] hover:text-[#6846E8]"
                  aria-label="Return to Dashboard"
                  title="Return to Dashboard"
                >
                  &larr;
                </button>
                <div>
                  <h1 className="text-2xl font-semibold">Appointment Management</h1>
                  <p className="text-sm text-[#6B6B6B]">Manage and monitor all salon bookings</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/book')}
                className="tap-safe inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#7B5CF5] px-5 py-2.5 text-white shadow-[0_8px_20px_rgba(123,92,245,0.24)] transition hover:bg-[#6846E8] sm:w-auto"
              >
                + New Appointment
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <GradientMetricCard
                title={`Total ${tableDateWindow ? 'in Period' : 'All Time'}`}
                value={monthlyStats.total}
                note={tableDateWindow ? 'Selected range' : 'All time'}
                start="#7f63e8"
                end="#5a3dbd"
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                }
              />
              <GradientMetricCard
                title="Pending"
                value={monthlyStats.pending}
                note="Awaiting service"
                start="#f0a160"
                end="#d9874d"
                delay={100}
                onClick={() => applyStatusOnlyFilter('booked')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                }
              />
              <GradientMetricCard
                title="Completed"
                value={monthlyStats.completed}
                note="Completed"
                start="#74a0ae"
                end="#547f91"
                delay={200}
                onClick={() => applyStatusOnlyFilter('completed')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                }
              />
              {canAccessSales && (
                <GradientMetricCard
                  title="Revenue"
                  value={currency(monthlyStats.revenueCents)}
                  note="Selected range"
                  start="#958bf4"
                  end="#6f67d7"
                  delay={300}
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                      <line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  }
                />
              )}
            </div>

            <div className={glassPanelClass}>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <select
                    value={filter}
                    onChange={(e) => {
                      const nextFilter = e.target.value
                      setFilter(nextFilter)
                      if (nextFilter === 'booked' || nextFilter === 'completed') {
                        setStatusDateScope('month')
                      }
                    }}
                    className="tap-safe w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  >
                    <option value="all">All Status</option>
                    <option value="booked">Booked / Confirmed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="missed">Missed</option>
                  </select>
                  <select
                    value={searchServiceId}
                    onChange={(e) => setSearchServiceId(e.target.value)}
                    className="tap-safe w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  >
                    <option value="">All Services</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={searchDate}
                      title="Start Date"
                      onChange={(e) => {
                        setSearchDate(e.target.value)
                        setRangeFilter('')
                        if (e.target.value) {
                          setStatusDateScope('day')
                          setSelectedDate(e.target.value)
                          const month = monthStartFromKey(e.target.value)
                          if (month) setCalendarMonth(month)
                        }
                      }}
                      className="tap-safe w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    />
                    <input
                      type="date"
                      value={searchEndDate}
                      title="End Date"
                      onChange={(e) => {
                        setSearchEndDate(e.target.value)
                        setRangeFilter('')
                      }}
                      className="tap-safe w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    />
                  </div>
                  <select
                    value={statusDateScope}
                    onChange={(e) => setStatusDateScope(e.target.value)}
                    className="tap-safe w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    title="Date Scope"
                  >
                    <option value="day">By Day</option>
                    <option value="month">By Month</option>
                    <option value="year">By Year</option>
                    <option value="all">All Time</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-1 gap-2">
                    <button
                      onClick={() => {
                        setSearchDate(todayKey)
                        setSearchEndDate(todayKey)
                        setRangeFilter('')
                        setStatusDateScope('day')
                        setSelectedDate(todayKey)
                        setSelectedTimeSlot('')
                        const month = monthStartFromKey(todayKey)
                        if (month) setCalendarMonth(month)
                        setMobileTab('slots')
                      }}
                      className={`tap-safe flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                        searchDate === todayKey
                          ? 'border-[#7B5CF5] bg-[#7B5CF5] text-white shadow-sm'
                          : 'border-[#DDD6FE] bg-white text-[#7B5CF5] hover:bg-[#F6F2FF]'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setSearchTerm('')
                        setSearchDate('')
                        setSearchEndDate('')
                        setSearchServiceId('')
                        setRangeFilter('')
                        setStatusDateScope('month')
                        setSelectedDate('')
                        setSelectedTimeSlot('')
                        setMobileTab('calendar')
                      }}
                      className="tap-safe flex-1 rounded-xl border border-[#DDD6FE] bg-white px-4 py-2.5 text-sm font-semibold text-[#7B5CF5] transition hover:bg-[#F6F2FF]"
                    >
                      Reset
                    </button>
                  </div>
                  <div className="relative flex-[2]">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="tap-safe w-full rounded-xl border border-[#DDD6FE] bg-white py-2.5 pl-4 pr-10 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7B5CF5]">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="7" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3.5-3.5" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#DDD6FE] bg-white shadow-[0_8px_32px_rgba(59,31,114,0.1)]">
            <div className="md:hidden space-y-4 p-4">
              {paginatedAppointments.length === 0 && !tableLoading && (
                <div className={emptyStateClass}>
                  No appointments found for the selected filters.
                </div>
              )}
              {tableLoading && paginatedAppointments.length === 0 && (
                <div className="py-12 text-center text-[#7B5CF5]">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#7B5CF5] border-t-transparent"></div>
                  <p className="mt-3 text-sm">Loading appointments...</p>
                </div>
              )}
              {paginatedAppointments.map((apt) => {
                const appointmentServices = getAppointmentServices(apt)
                const totalPrice = getAppointmentTotalPriceCents(apt)
                const startDate = new Date(getStart(apt))
                const dateLabel = startDate.toLocaleDateString('en-US', {
                  timeZone: 'Asia/Manila',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
                const timeLabel = startDate.toLocaleTimeString('en-US', {
                  timeZone: 'Asia/Manila',
                  hour: 'numeric',
                  minute: '2-digit'
                })
                const normalizedStatus = normalizeStatus(apt.status)
                const statusBadgeStyle = getStatusBadgeStyle(normalizedStatus)
                const isProcessingAction = processingAppointmentId === apt.id
                const initials = getCustomerInitials(apt.customer_name)
                const color = getCustomerColor(apt.customer_name)
                const isRescheduled = isRescheduledAppointment(apt)
                const rescheduledLabel = formatRescheduledTimestampLabel(apt.rescheduled_at_pht || apt.rescheduled_at)
                
                return (
                  <article
                    key={apt.id}
                    className="overflow-hidden rounded-[24px] border border-white/40 bg-white/80 p-4 shadow-[0_12px_32px_rgba(59,31,114,0.06)] backdrop-blur-sm animate-fadeInUp"
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div 
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold shadow-sm"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {initials}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Top Info Grid */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-[#2d1f4f]">
                              {apt.customer_name || 'Customer'}
                            </h3>
                            <p className="text-[10px] text-[#856fb4]">
                              {apt.customer_phone || 'No phone'}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-bold text-[#4a3481]">{dateLabel}</div>
                            <div className="text-[10px] text-[#856fb4]">{timeLabel}</div>
                          </div>
                        </div>

                        {/* Service and Price Row */}
                        <div className="mt-2.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-[11px] font-extrabold uppercase tracking-tight text-[#4a3481]">
                              {getServiceName(appointmentServices[0])}
                            </div>
                            {appointmentServices.length > 1 && (
                              <div className="text-[9px] text-[#856fb4] leading-tight">+{appointmentServices.length - 1} more service</div>
                            )}
                            
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tight ${paymentChoiceClass(apt.payment_method, apt.payment_status, apt.status)}`}>
                                {paymentChoiceLabel(apt.payment_method, apt.payment_status, apt.status)}
                              </span>
                              {shouldShowPaymentStatusBadge(apt.payment_method, apt.payment_status, apt.status) && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tight ${paymentStatusClass(apt.payment_status, apt.status, apt.payment_method)}`}>
                                  {paymentStatusLabel(apt.payment_status, apt.status, apt.payment_method)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <div className="text-[10px] font-bold text-[#856fb4] leading-none mb-0.5">PHP</div>
                            <div className="text-sm font-black text-[#5c40cc]">
                              {currency(totalPrice).replace('PHP', '').trim()}
                            </div>
                            <div className="text-[9px] text-[#856fb4] leading-none mt-0.5">
                              {appointmentServices.length > 1 ? 'Total' : 'Service price'}
                            </div>
                          </div>
                        </div>

                        {/* Rescheduled Info */}
                        {isRescheduled && (
                          <div className="mt-2 rounded-lg bg-[#F6F2FF] p-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded px-1 py-0.5 bg-[#7B5CF5]/10 text-[#7B5CF5] text-[8px] font-bold uppercase">Rescheduled</span>
                              <span className="text-[9px] text-[#7B5CF5] font-medium truncate">{rescheduledLabel} PHT</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Status & Quick Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span 
                          className="rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow-sm"
                          style={statusBadgeStyle}
                        >
                          {normalizedStatus === 'booked' ? 'PENDING' : normalizedStatus.toUpperCase()}
                        </span>
                        {normalizedStatus === 'cancelled' && apt.rejection_reason && (
                          <div className="text-[9px] text-[#DC2626] text-right max-w-[80px] truncate" title={apt.rejection_reason}>
                            {apt.rejection_reason}
                          </div>
                        )}
                        
                        <div className="mt-auto flex flex-col gap-1.5">
                          {(normalizedStatus === 'booked' || normalizedStatus === 'pending') && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => !isProcessingAction && handleAction(apt.id, 'confirm')}
                                disabled={isProcessingAction}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7B5CF5] text-white shadow-sm transition hover:bg-[#6846E8]"
                                title="Confirm"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => !isProcessingAction && handleAction(apt.id, 'reject')}
                                disabled={isProcessingAction}
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EF4444] text-white shadow-sm transition hover:bg-[#DC2626]"
                                title="Reject"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedAppointment(apt)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f2efff] text-[#7B5CF5] transition hover:bg-[#e6e0ff]"
                              title="View Details"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => !isProcessingAction && handleDelete(apt)}
                              disabled={isProcessingAction}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fff0f3] text-[#cc6b84] transition hover:bg-[#ffe4e9]"
                              title="Delete"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-[#F2EDFF]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Payment Choice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDD6FE]">
                  {paginatedAppointments.map(apt => {
                    const appointmentServices = getAppointmentServices(apt)
                    const totalPrice = getAppointmentTotalPriceCents(apt)
                    const proofUrl = resolveProofUrl(apt.payment_proof_url)
                    const primaryService = getServiceName(appointmentServices[0])
                    const extraCount = Math.max(appointmentServices.length - 1, 0)
                    const startDate = new Date(getStart(apt))
                    const dateLabel = startDate.toLocaleDateString('en-US', {
                      timeZone: 'Asia/Manila',
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    })
                    const timeLabel = startDate.toLocaleTimeString('en-US', {
                      timeZone: 'Asia/Manila',
                      hour: 'numeric',
                      minute: '2-digit'
                    })
                    const normalizedStatus = (apt.status || '').toLowerCase().trim()
                    const displayStatus = normalizedStatus
                      ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
                      : 'Unknown'
                    const canModify = normalizedStatus === 'booked' || normalizedStatus === 'confirmed'
                    const canConfirm = normalizedStatus === 'booked'
                    const isProcessingAction = processingAppointmentId === apt.id
                    const paymentLabel = paymentStatusLabel(apt.payment_status, apt.status, apt.payment_method)
                    const paymentChoice = paymentChoiceLabel(apt.payment_method, apt.payment_status, apt.status)
                    const isRescheduled = isRescheduledAppointment(apt)
                    const rescheduledAtLabel = formatRescheduledTimestampLabel(apt.rescheduled_at_pht || apt.rescheduled_at)

                    return (
                    <tr
                      key={apt.id}
                      className="cursor-pointer transition hover:bg-[#F6F2FF] focus-visible:bg-[#F6F2FF] focus-visible:outline-none"
                      onClick={() => {
                        setOpenActionId(null)
                        setSelectedAppointment(apt)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setOpenActionId(null)
                          setSelectedAppointment(apt)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for appointment of ${apt.customer_name || 'customer'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-[#2D2D2D]">{apt.customer_name}</div>
                        <div className="mt-1 text-xs text-[#6B6B6B]">
                          {apt.customer_phone || apt.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[#2D2D2D]">{primaryService}{extraCount > 0 ? ` +${extraCount} more` : ''}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-[#2D2D2D]">{dateLabel}</div>
                        <div className="mt-1 text-xs text-[#6B6B6B]">{timeLabel}</div>
                        {isRescheduled && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-[11px] font-medium text-[#6d28d9]">
                              Rescheduled
                            </span>
                            {rescheduledAtLabel && (
                              <span className="text-[11px] text-[#6d28d9]">
                                {rescheduledAtLabel} PHT
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${statusPillClass(normalizedStatus)}`}>
                            {normalizedStatus === 'confirmed' ? 'Confirmed' : displayStatus}
                          </span>
                          {isRescheduled && (
                            <span className="w-fit rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-medium text-[#6d28d9]">
                              Rescheduled
                            </span>
                          )}
                          {normalizedStatus === 'cancelled' && (
                            <span
                              className="text-xs text-[#DC2626] max-w-[150px] truncate"
                              title={apt.rejection_reason || 'No reason recorded.'}
                            >
                              Reason: {apt.rejection_reason || 'No reason recorded.'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${paymentChoiceClass(apt.payment_method, apt.payment_status, apt.status)}`}>
                            {paymentChoice}
                          </span>
                          {shouldShowPaymentStatusBadge(apt.payment_method, apt.payment_status, apt.status) && (
                            <span className={`px-3 py-1 rounded-full text-[11px] w-fit ${paymentStatusClass(apt.payment_status, apt.status, apt.payment_method)}`}>
                              {paymentLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#2D2D2D]">{currency(totalPrice)}</div>
                        <div className="mt-1 text-xs text-[#6B6B6B]">{appointmentServices.length > 1 ? 'Total' : 'Service price'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div
                          className="flex flex-wrap items-center gap-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {(normalizedStatus === 'booked' || normalizedStatus === 'pending') && (
                            <button
                              type="button"
                              onClick={() => !isProcessingAction && handleAction(apt.id, 'confirm')}
                              disabled={isProcessingAction}
                              className={`tap-safe flex h-8 w-8 items-center justify-center rounded-lg transition ${!isProcessingAction ? 'bg-[#7B5CF5] text-white hover:bg-[#6846E8]' : 'cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]'}`}
                              title="Confirm Booking"
                            >
                              {isProcessingAction && processingAppointmentId === apt.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                            </button>
                          )}
                          {normalizedStatus === 'booked' && (
                            <button
                              type="button"
                              onClick={() => !isProcessingAction && handleAction(apt.id, 'reject')}
                              disabled={isProcessingAction}
                              className={`tap-safe flex h-8 w-8 items-center justify-center rounded-lg transition ${!isProcessingAction ? 'bg-[#EF4444] text-white hover:bg-[#DC2626]' : 'cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]'}`}
                              title="Reject Booking"
                            >
                              {isProcessingAction && processingAppointmentId === apt.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                            </button>
                          )}
                          {normalizedStatus === 'confirmed' && (
                            <>
                              <button
                                type="button"
                                onClick={() => !isProcessingAction && handleRescheduleClick(apt)}
                                disabled={isProcessingAction}
                                className={`tap-safe flex h-8 w-8 items-center justify-center rounded-lg border border-[#7B5CF5] text-[#7B5CF5] transition hover:bg-[#F6F2FF]`}
                                title="Reschedule"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => !isProcessingAction && handleAction(apt.id, 'complete')}
                                disabled={isProcessingAction}
                                className={`tap-safe flex h-8 w-8 items-center justify-center rounded-lg transition ${!isProcessingAction ? 'bg-[#6846E8] text-white hover:bg-[#5B3CC4]' : 'cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]'}`}
                                title="Complete"
                              >
                                {isProcessingAction && processingAppointmentId === apt.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => !isProcessingAction && handleDelete(apt)}
                            disabled={isProcessingAction}
                            className={`tap-safe flex h-8 w-8 items-center justify-center rounded-lg transition ${isProcessingAction ? 'cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]' : 'bg-[#EF4444] text-white hover:bg-[#DC2626]'}`}
                            title="Delete"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              {paginatedAppointments.length === 0 && !tableLoading && (
                <div className="py-8 text-center text-[#6B6B6B]">No appointments found</div>
              )}
              {tableLoading && (
                <div className="py-8 text-center text-[#6B6B6B]">Loading appointments...</div>
              )}
            </div>
            {paginatedAppointments.length > 0 && (
              <Pagination
                pagination={tablePagination}
                onPageChange={setTablePage}
                loading={tableLoading}
              />
            )}
          </div>
        </div>
        {selectedAppointment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1237]/45 p-4"
          >
            <div
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.12)] sm:p-5 md:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Appointment Details</h2>
                  <p className="mt-1 text-sm text-[#6B6B6B]">View booking information and payment proof.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="h-9 w-9 rounded-full border border-[#DDD6FE] text-[#7B5CF5] transition hover:bg-[#F6F2FF]"
                  aria-label="Close details"
                >
                  X
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                <div className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Customer</p>
                  <p className="mt-2 font-semibold">{selectedAppointment.customer_name || 'N/A'}</p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{selectedAppointment.customer_phone || 'No phone provided'}</p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{selectedAppointment.customer_email || 'No email provided'}</p>
                  {selectedAppointment.customer_address && (
                    <p className="mt-1 text-sm text-[#6B6B6B]">{selectedAppointment.customer_address}</p>
                  )}
                </div>
                <div className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Schedule</p>
                  <p className="mt-2 font-semibold">{selectedDateLabel}</p>
                  <p className="mt-1 text-sm text-[#6B6B6B]">{selectedTimeLabel} PHT</p>
                  <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-[#6B6B6B]">Booked On</p>
                    <p className="mt-1 text-sm font-medium text-[#2D2D2D]">{selectedCreatedAtLabel} PHT</p>
                  </div>
                  {selectedIsRescheduled && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-xs font-medium text-[#6d28d9]">
                        Rescheduled
                      </span>
                      {selectedRescheduledAtLabel && (
                        <span className="text-xs text-[#6d28d9]">
                          Updated on {selectedRescheduledAtLabel} PHT
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Status</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusPillClass(selectedStatus)}`}>
                      {selectedStatusLabel}
                    </span>
                    {selectedIsRescheduled && (
                      <span className="rounded-full bg-[#ede9fe] px-3 py-1 text-xs font-medium text-[#6d28d9]">
                        Rescheduled
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentChoiceClass(selectedAppointment.payment_method, selectedAppointment.payment_status, selectedAppointment.status)}`}>
                      {paymentChoiceLabel(selectedAppointment.payment_method, selectedAppointment.payment_status, selectedAppointment.status)}
                    </span>
                    {shouldShowPaymentStatusBadge(selectedAppointment.payment_method, selectedAppointment.payment_status, selectedAppointment.status) && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusClass(selectedAppointment.payment_status, selectedAppointment.status, selectedAppointment.payment_method)}`}>
                        {paymentStatusLabel(selectedAppointment.payment_status, selectedAppointment.status, selectedAppointment.payment_method)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Total Price</p>
                  <p className="mt-2 text-xl font-semibold">{currency(selectedTotalPrice)}</p>
                  <p className="mt-1 text-xs text-[#6B6B6B]">{selectedAppointmentServices.length} service{selectedAppointmentServices.length === 1 ? '' : 's'}</p>
                </div>
              </div>

              {selectedAppointment.status === 'cancelled' && (
                <div className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#DC2626]">Cancellation Reason</p>
                  <div className="mt-2 text-sm text-[#991B1B]">
                    {selectedAppointment.rejection_reason || 'No reason recorded.'}
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Payment Details</p>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#6B6B6B]">Amount Paid</span>
                    <span className="font-medium text-[#2D2D2D]">{currency(selectedAmountPaid)}</span>
                  </div>
                  {selectedRemainingBalance > 0 && (
                    <div className="flex items-center justify-between gap-3 border-t border-[#E9E2FF] pt-2">
                      <span className="text-[#6B6B6B]">Remaining Balance</span>
                      <span className="font-medium text-[#B45309]">{currency(selectedRemainingBalance)}</span>
                    </div>
                  )}
                  <div className="border-t border-[#E9E2FF] pt-2 mt-2">
                    <span className="inline-block rounded-md bg-[#ede9fe] px-2.5 py-1.5 text-xs font-medium text-[#6d28d9]">
                      ✓ Customer agreed to Non-Refundable Payment Policy
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Services</p>
                <div className="mt-2 space-y-2">
                    {selectedAppointmentServices.length > 0 ? (
                      selectedAppointmentServices.map((service, index) => (
                        <div key={`${service.id || service.name || 'service'}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium">{getServiceName(service)}</span>
                          <span className="text-[#6B6B6B]">{currency(getServicePriceCents(service))}</span>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-[#6B6B6B]">No service information available.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-[#6B6B6B]">Payment Proof</p>
                {selectedProofUrl ? (
                  <div className="mt-2 space-y-3">
                    {!selectedProofLoadError ? (
                      <>
                        <img
                          src={selectedProofUrl}
                          alt="Payment proof"
                          className="w-full max-h-72 rounded-lg border border-[#DDD6FE] bg-white object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                          onError={() => setSelectedProofLoadError(true)}
                          onClick={() => handleOpenImageModal(selectedProofUrl)}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenImageModal(selectedProofUrl);
                          }}
                          className="tap-safe rounded-lg border border-[#7B5CF5] px-4 py-2 text-sm text-[#7B5CF5] transition hover:bg-[#F6F2FF]"
                        >
                          Open Full Image
                        </button>
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#DDD6FE] bg-white px-4 py-6 text-sm text-[#6B6B6B]">
                        Payment proof file was not found for this appointment.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#6B6B6B]">No payment proof uploaded.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Reschedule Modal */}
        {showRescheduleModal && reschedulingAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1237]/45 p-4">
            <div className="w-full max-w-md rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_16px_32px_rgba(0,0,0,0.12)] sm:p-6">
              <h2 className="text-xl font-bold mb-4">Reschedule Appointment</h2>
              <div className="mb-4 rounded-xl border border-[#DDD6FE] bg-[#F6F2FF] p-3">
                <p className="text-sm text-[#6B6B6B]">
                  <strong>Customer:</strong> {reschedulingAppointment.customer_name}
                </p>
                <p className="text-sm text-[#6B6B6B]">
                  <strong>Current Date:</strong> {new Date(getStart(reschedulingAppointment)).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT
                </p>
              </div>
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Time *</label>
                  <input
                    type="time"
                    required
                    className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    value={rescheduleData.preferred_time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, preferred_time: e.target.value })}
                    min="08:00"
                    max="19:59"
                  />
                  <p className="mt-1 text-xs text-[#6B6B6B]">Business hours: 9:30 AM - 5:30 PM</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                  <textarea
                    className="w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                    rows="3"
                    value={rescheduleData.reschedule_reason}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, reschedule_reason: e.target.value })}
                    placeholder="Reason for rescheduling..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="tap-safe flex-1 rounded-lg bg-[#7B5CF5] px-4 py-2 text-white transition hover:bg-[#6846E8]"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRescheduleModal(false)
                      setReschedulingAppointment(null)
                      setRescheduleData({
                        date: '',
                        preferred_time: '',
                        reschedule_reason: '',
                      })
                    }}
                    className="tap-safe flex-1 rounded-lg border border-[#7B5CF5] bg-transparent px-4 py-2 text-[#7B5CF5] transition hover:bg-[#F6F2FF]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1B1237]/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#DDD6FE] bg-white shadow-[0_24px_48px_rgba(41,21,93,0.18)] animate-fadeInScale">
            <div className="border-b border-[#F2EDFF] bg-[#F9F7FF] px-6 py-4">
              <h2 className="text-lg font-bold text-[#2D1F4F]">Reject Appointment</h2>
              <p className="text-xs text-[#856FB4]">Please provide a reason for rejecting this booking.</p>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-[#4A3481]">Reason for Rejection <span className="text-[#EF4444]">*</span></label>
                  <textarea
                    className="w-full rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] px-4 py-3 text-sm text-[#2D2D2D] transition focus:border-[#7B5CF5] focus:outline-none focus:ring-4 focus:ring-[#7B5CF5]/10"
                    rows="4"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Invalid payment proof, schedule conflict, etc."
                    autoFocus
                  />
                  <p className="mt-2 text-[11px] text-[#856FB4]">The customer will receive an email with this reason.</p>
                </div>
              </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectionModal(false)
                    setRejectingAppointmentId(null)
                    setRejectionReason('')
                  }}
                  className="flex-1 rounded-xl border border-[#DDD6FE] py-3 text-sm font-bold text-[#6B6B6B] transition hover:bg-[#F9F7FF]"
                  disabled={isRejecting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRejection}
                  disabled={isRejecting || !rejectionReason.trim()}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold text-white transition shadow-md ${
                    isRejecting || !rejectionReason.trim() 
                      ? 'cursor-not-allowed bg-[#E5E7EB]' 
                      : 'bg-[#EF4444] hover:bg-[#DC2626] shadow-[#EF4444]/20'
                  }`}
                >
                  {isRejecting ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Confirm Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Image Viewer Modal */}
      {showImageModal && (
        <>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes fadeInScale {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
            .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
            .animate-fadeInScale { animation: fadeInScale 0.3s ease-out forwards; }
          `}</style>
          <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-xl"
            onClick={() => setShowImageModal(false)}
          >
          <button
            type="button"
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setShowImageModal(false)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div 
            className="relative max-h-[85vh] max-w-[95vw] overflow-hidden rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageModalUrl}
              alt="Payment Proof Full View"
              className="max-h-[85vh] w-auto object-contain"
            />
          </div>
          
          <div className="mt-6 flex gap-4">
            <a
              href={imageModalUrl}
              download
              className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </a>
            <button
              type="button"
              onClick={() => setShowImageModal(false)}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-sm font-bold text-[#1B1237] transition hover:bg-white/90"
            >
              Close
            </button>
          </div>
          </div>
        </>
      )}

    </AdminLayout>
  )
}

export default AdminAppointments

