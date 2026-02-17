import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, booked, completed, cancelled
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null)
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    preferred_time: '',
    reschedule_reason: '',
  })
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [searchServiceId, setSearchServiceId] = useState('')
  const [rangeFilter, setRangeFilter] = useState('')
  const [openActionId, setOpenActionId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const storedUserType = localStorage.getItem('userType') || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime
  const getAppointmentServices = (appointment) =>
    appointment.services && appointment.services.length > 0
      ? appointment.services
      : (appointment.service ? [appointment.service] : [])
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
  const toManilaDate = (value) => formatManilaDate(value)

  useEffect(() => {
    if (!location.search) {
      setFilter('all')
      setSearchTerm('')
      setSearchDate('')
      setSearchServiceId('')
      setRangeFilter('')
      return
    }

    setFilter('all')
    setSearchTerm('')
    setSearchDate('')
    setSearchServiceId('')
    setRangeFilter('')

    const params = new URLSearchParams(location.search)
    const status = params.get('status')
    const dateParam = params.get('date')
    const range = params.get('range')
    const serviceId = params.get('serviceId')
    const query = params.get('q')

    if (status) {
      const normalized = status.toLowerCase()
      const allowed = ['all', 'booked', 'confirmed', 'completed', 'cancelled']
      setFilter(allowed.includes(normalized) ? normalized : 'all')
    }

    if (serviceId) setSearchServiceId(serviceId)
    if (query !== null) setSearchTerm(query)

    if (dateParam) {
      setSearchDate(dateParam)
      setRangeFilter('')
    } else if (range) {
      const normalizedRange = range.toLowerCase()
      const allowedRanges = ['today', 'week', 'month']
      setRangeFilter(allowedRanges.includes(normalizedRange) ? normalizedRange : '')
      if (allowedRanges.includes(normalizedRange)) {
        setSearchDate('')
      }
    }
  }, [location.search])

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

  const loadData = async () => {
    try {
      setLoading(true)
      const [apptsRes, stylistsRes, servicesRes] = await Promise.all([
        api.get('/appointments'),
        api.get('/stylists'),
        api.get('/services'),
      ])
      setAppointments(apptsRes.data)
      setStylists(stylistsRes.data)
      setServices(servicesRes.data)
    } catch (e) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    try {
      if (action === 'cancel') {
        await api.post(`/appointments/${id}/cancel`)
        toast.success('Appointment cancelled')
      } else if (action === 'complete') {
        await api.post(`/appointments/${id}/complete`)
        toast.success('Appointment marked as completed and sales recorded')
      } else if (action === 'confirm') {
        await api.post(`/appointments/${id}/confirm`)
        toast.success('Appointment confirmed')
      } else if (action === 'delete') {
        await api.delete(`/appointments/${id}`)
        toast.success('Appointment deleted successfully')
      }
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update appointment')
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
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reschedule appointment')
    }
  }

  const handleDelete = async (apt) => {
    const confirmMessage = `Are you sure you want to permanently delete this appointment?\n\n` +
      `Customer: ${apt.customer_name}\n` +
      `Service: ${apt.service?.name}\n` +
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

    appointments.forEach((apt) => {
      const aptDate = toManilaDate(getStart(apt))
      if (monthKey && aptDate && aptDate.startsWith(monthKey)) {
        total += 1
        if (apt.status === 'completed') {
          completed += 1
          const appointmentServices = getAppointmentServices(apt)
          revenueCents += appointmentServices.reduce((sum, s) => sum + (s.price_cents || 0), 0)
        }
        if (apt.status === 'booked' || apt.status === 'confirmed') {
          pending += 1
        }
      }
    })

    return { total, pending, completed, revenueCents }
  }, [appointments, monthKey])

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAppointments = appointments.filter(apt => {
    if (filter !== 'all') {
      if (filter === 'confirmed' && apt.status !== 'confirmed') return false
      if (filter !== 'confirmed' && apt.status !== filter) return false
    }

    const appointmentServices = getAppointmentServices(apt)

    if (searchServiceId) {
      const serviceIdNum = parseInt(searchServiceId, 10)
      if (!appointmentServices.some(s => s.id === serviceIdNum)) return false
    }

    const aptDate = toManilaDate(getStart(apt))
    if (searchDate) {
      if (aptDate !== searchDate) return false
    } else if (rangeDates) {
      if (!aptDate || aptDate < rangeDates.start || aptDate > rangeDates.end) return false
    }

    if (normalizedSearch) {
      const customerName = (apt.customer_name || '').toLowerCase()
      const customerPhone = (apt.customer_phone || '').toLowerCase()
      const serviceNames = appointmentServices.map(s => s.name || '').join(' ').toLowerCase()
      if (
        !customerName.includes(normalizedSearch) &&
        !customerPhone.includes(normalizedSearch) &&
        !serviceNames.includes(normalizedSearch)
      ) return false
    }

    return true
  })

  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => {
      const aTime = new Date(getStart(a)).getTime()
      const bTime = new Date(getStart(b)).getTime()
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0
      if (Number.isNaN(aTime)) return 1
      if (Number.isNaN(bTime)) return -1
      return aTime - bTime
    })
  }, [filteredAppointments])

  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`

  const paymentStatusLabel = (status) => {
    if (!status) return 'UNPAID'
    const map = {
      unpaid: 'UNPAID',
      pending: 'PENDING',
      paid: 'PAID',
      rejected: 'REJECTED',
      downpayment: 'DOWNPAYMENT',
      refunded: 'REFUNDED',
    }
    return map[status] || status.toUpperCase()
  }
  const paymentStatusClass = (status) => {
    const s = status || 'unpaid'
    if (s === 'paid') return 'bg-green-100 text-green-800'
    if (s === 'pending' || s === 'downpayment') return 'bg-yellow-100 text-yellow-800'
    if (s === 'rejected' || s === 'refunded') return 'bg-red-100 text-red-800'
    return 'bg-[#f7f1ec] text-[#3b2f2a]'
  }
  const paymentChoiceLabel = (method, status) => {
    const normalizedMethod = (method || '').toLowerCase()
    const normalizedStatus = (status || '').toLowerCase()
    if (normalizedMethod === 'online') return 'Online Payment (GCash)'
    if (normalizedMethod === 'on_hand' && normalizedStatus === 'downpayment') return 'Paid at Salon (Downpayment)'
    if (normalizedMethod === 'on_hand') return 'Paid at Salon'
    if (normalizedStatus === 'downpayment') return 'Downpayment'
    return 'Not Set'
  }
  const paymentChoiceClass = (method, status) => {
    const normalizedMethod = (method || '').toLowerCase()
    const normalizedStatus = (status || '').toLowerCase()
    if (normalizedMethod === 'online') return 'bg-blue-100 text-blue-700'
    if (normalizedMethod === 'on_hand' && normalizedStatus === 'downpayment') return 'bg-amber-100 text-amber-700'
    if (normalizedMethod === 'on_hand') return 'bg-[#e9edf3] text-[#566173]'
    if (normalizedStatus === 'downpayment') return 'bg-yellow-100 text-yellow-800'
    return 'bg-[#f4ebe4] text-[#6f5b50]'
  }
  const resolveProofUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `/${url.replace(/^\/+/, '')}`
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate(loginPath)
    })
  }

  return (
    <div className="min-h-screen bg-[#f7f1ec] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="h-11 w-11 rounded-full bg-white/80 border border-[#eadfd5] shadow-[0_8px_16px_rgba(92,64,51,0.08)] text-[#8f7a6f] hover:text-[#6f5b50] hover:bg-white transition text-xl font-bold flex items-center justify-center"
                  aria-label="Return to Dashboard"
                  title="Return to Dashboard"
                >
                  &larr;
                </button>
                <div>
                  <h1 className="text-2xl font-semibold">Appointment Management</h1>
                  <p className="text-sm text-[#8f7a6f]">Manage and monitor all salon bookings</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/book')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#b48a6b] text-white shadow-[0_10px_20px_rgba(92,64,51,0.18)] hover:bg-[#a27758] transition"
              >
                + New Appointment
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Total This Month</p>
                  <p className="text-2xl font-semibold mt-2">{monthlyStats.total}</p>
                  <p className="text-xs text-[#9b857a] mt-1">This month</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#f4ebe4] flex items-center justify-center text-[#b48a6b]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
                  </svg>
                </div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Pending</p>
                  <p className="text-2xl font-semibold mt-2">{monthlyStats.pending}</p>
                  <p className="text-xs text-[#9b857a] mt-1">Awaiting service</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#f4ebe4] flex items-center justify-center text-[#c79a6b]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3M12 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z" />
                  </svg>
                </div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Completed</p>
                  <p className="text-2xl font-semibold mt-2">{monthlyStats.completed}</p>
                  <p className="text-xs text-[#9b857a] mt-1">Completed</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#edf2ed] flex items-center justify-center text-[#6e8f74]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
                  </svg>
                </div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Revenue</p>
                  <p className="text-2xl font-semibold mt-2">{currency(monthlyStats.revenueCents)}</p>
                  <p className="text-xs text-[#9b857a] mt-1">This month</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#f4ebe4] flex items-center justify-center text-[#b48a6b]">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="4" y="6" width="16" height="12" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 10h16M9 14h2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-3 md:p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full lg:w-auto bg-white/90 border border-[#eadfd5] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d9bfb1]"
                >
                  <option value="all">All Status</option>
                  <option value="booked">Booked</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={searchServiceId}
                  onChange={(e) => setSearchServiceId(e.target.value)}
                  className="w-full lg:w-56 bg-white/90 border border-[#eadfd5] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d9bfb1]"
                >
                  <option value="">All Services</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="w-full lg:w-auto bg-white/90 border border-[#eadfd5] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d9bfb1]"
                />
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSearchDate('')
                    setSearchServiceId('')
                    setRangeFilter('')
                  }}
                  className="w-full lg:w-auto bg-[#f4ebe4] text-[#6f5b50] border border-[#eadfd5] rounded-xl px-4 py-2 text-sm hover:bg-[#eadfd5]"
                >
                  Reset
                </button>
                <div className="relative w-full lg:flex-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/90 border border-[#eadfd5] rounded-xl pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d9bfb1]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b79b8f]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3.5-3.5" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-[#f6efea]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Payment Choice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e4dc]">
                  {sortedAppointments.map(apt => {
                    const appointmentServices = getAppointmentServices(apt)
                    const totalPrice = appointmentServices.reduce((sum, s) => sum + (s.price_cents || 0), 0)
                    const proofUrl = resolveProofUrl(apt.payment_proof_url)
                    const primaryService = appointmentServices[0]?.name || 'N/A'
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
                    const paymentLabel = paymentStatusLabel(apt.payment_status)
                    const paymentChoice = paymentChoiceLabel(apt.payment_method, apt.payment_status)

                    return (
                    <tr key={apt.id} className="hover:bg-[#f9f4ef]">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-sm">{apt.customer_name}</div>
                        <div className="text-xs text-[#9b857a] mt-1">
                          {apt.customer_phone || apt.customer_email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium">{primaryService}{extraCount > 0 ? ` +${extraCount} more` : ''}</div>
                        <div className="text-xs text-[#9b857a] mt-1 flex items-center gap-1">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#f4ebe4] text-[#b48a6b]">
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                              <circle cx="12" cy="8" r="3" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c1.5-3 5-5 7-5s5.5 2 7 5" />
                            </svg>
                          </span>
                          <span>{apt.stylist?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium">{dateLabel}</div>
                        <div className="text-xs text-[#9b857a] mt-1">{timeLabel}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${
                            normalizedStatus === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            normalizedStatus === 'booked' ? 'bg-blue-100 text-blue-700' :
                            normalizedStatus === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            normalizedStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-[#f4ebe4] text-[#6f5b50]'
                          }`}>
                            {normalizedStatus === 'confirmed' ? 'Confirmed' : displayStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium w-fit ${paymentChoiceClass(apt.payment_method, apt.payment_status)}`}>
                            {paymentChoice}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-[11px] w-fit ${paymentStatusClass(apt.payment_status)}`}>
                            {paymentLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold">{currency(totalPrice)}</div>
                        <div className="text-xs text-[#9b857a] mt-1">{appointmentServices.length > 1 ? 'Total' : 'Service price'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative apt-actions">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              setOpenActionId(openActionId === apt.id ? null : apt.id)
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-[#eadfd5] text-sm text-[#6f5b50] hover:bg-[#f4ebe4]"
                            aria-haspopup="menu"
                            aria-expanded={openActionId === apt.id}
                          >
                            Actions
                            <svg
                              className={`h-4 w-4 transition ${openActionId === apt.id ? 'rotate-180' : ''}`}
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l5 5 5-5" />
                            </svg>
                          </button>
                          {openActionId === apt.id && (
                            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#eadfd5] bg-white/95 shadow-[0_16px_32px_rgba(92,64,51,0.12)] p-2 z-20">
                              {proofUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionId(null)
                                    window.open(proofUrl, '_blank')
                                  }}
                                  className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-[#f4ebe4] text-[#6f5b50]"
                                >
                                  View Proof
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (!canConfirm) return
                                  setOpenActionId(null)
                                  handleAction(apt.id, 'confirm')
                                }}
                                className={`w-full text-left text-sm px-3 py-2 rounded-xl ${canConfirm ? 'hover:bg-emerald-50 text-emerald-700' : 'text-[#b7a59a] cursor-not-allowed'}`}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  if (!canModify) return
                                  setOpenActionId(null)
                                  handleRescheduleClick(apt)
                                }}
                                className={`w-full text-left text-sm px-3 py-2 rounded-xl ${canModify ? 'hover:bg-blue-50 text-blue-700' : 'text-[#b7a59a] cursor-not-allowed'}`}
                              >
                                Reschedule
                              </button>
                              {apt.payment_method === 'online' && apt.payment_status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setOpenActionId(null)
                                      handlePaymentStatus(apt.id, 'paid')
                                    }}
                                    className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-emerald-50 text-emerald-700"
                                  >
                                    Mark Paid
                                  </button>
                                  <button
                                    onClick={() => {
                                      setOpenActionId(null)
                                      handlePaymentStatus(apt.id, 'rejected')
                                    }}
                                    className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-red-50 text-red-700"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => {
                                  if (!canModify) return
                                  setOpenActionId(null)
                                  handleAction(apt.id, 'cancel')
                                }}
                                className={`w-full text-left text-sm px-3 py-2 rounded-xl ${canModify ? 'hover:bg-amber-50 text-amber-700' : 'text-[#b7a59a] cursor-not-allowed'}`}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  if (!canModify) return
                                  setOpenActionId(null)
                                  handleAction(apt.id, 'complete')
                                }}
                                className={`w-full text-left text-sm px-3 py-2 rounded-xl ${canModify ? 'hover:bg-purple-50 text-purple-700' : 'text-[#b7a59a] cursor-not-allowed'}`}
                              >
                                Complete
                              </button>
                              <div className="border-t border-[#f0e4dc] my-1" />
                              <button
                                onClick={() => {
                                  setOpenActionId(null)
                                  handleDelete(apt)
                                }}
                                className="w-full text-left text-sm px-3 py-2 rounded-xl hover:bg-red-50 text-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              {sortedAppointments.length === 0 && (
                <div className="text-center py-8 text-[#9b857a]">No appointments found</div>
              )}
            </div>
          </div>
        </div>
        {/* Reschedule Modal */}
        {showRescheduleModal && reschedulingAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white/90 rounded-2xl border border-[#eadfd5] shadow-[0_16px_32px_rgba(92,64,51,0.12)] p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Reschedule Appointment</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-[#8f7a6f]">
                  <strong>Customer:</strong> {reschedulingAppointment.customer_name}
                </p>
                <p className="text-sm text-[#8f7a6f]">
                  <strong>Current Date:</strong> {new Date(getStart(reschedulingAppointment)).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT
                </p>
              </div>
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded px-3 py-2"
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
                    className="w-full border rounded px-3 py-2"
                    value={rescheduleData.preferred_time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, preferred_time: e.target.value })}
                    min="08:00"
                    max="19:59"
                  />
                  <p className="text-xs text-[#9b857a] mt-1">Business hours: 8:00 AM - 8:00 PM</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={rescheduleData.reschedule_reason}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, reschedule_reason: e.target.value })}
                    placeholder="Reason for rescheduling..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminAppointments






