import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const formatCurrency = (cents) => `PHP ${(Number(cents || 0) / 100).toFixed(2)}`

const StylistAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [rangeFilter, setRangeFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [openActionId, setOpenActionId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse((sessionStorage.getItem('user') || localStorage.getItem('user')) || '{}')

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime

  const getAppointmentServices = (appointment) =>
    appointment.services && appointment.services.length > 0
      ? appointment.services
      : (appointment.service ? [appointment.service] : [])

  const toManilaDate = (value) => {
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

  const getRangeDates = (range) => {
    const today = toManilaDate(new Date())
    if (!today) return null
    if (range === 'today') return { start: today, end: today }

    const todayStart = new Date(`${today}T00:00:00+08:00`)
    if (range === 'week') {
      const startDate = new Date(todayStart)
      startDate.setDate(startDate.getDate() - 6)
      return { start: toManilaDate(startDate), end: today }
    }
    if (range === 'month') {
      const [year, month] = today.split('-')
      const monthStart = new Date(`${year}-${month}-01T00:00:00+08:00`)
      return { start: toManilaDate(monthStart), end: today }
    }
    return null
  }

  useEffect(() => {
    loadAppointments()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const filterParam = (params.get('filter') || '').toLowerCase()
    const rangeParam = (params.get('range') || '').toLowerCase()
    const dateParam = params.get('date') || ''
    const qParam = params.get('q') || ''

    const allowedFilters = ['all', 'today', 'upcoming', 'completed', 'cancelled']
    const allowedRanges = ['today', 'week', 'month']

    setFilter(allowedFilters.includes(filterParam) ? filterParam : 'all')
    setRangeFilter(allowedRanges.includes(rangeParam) ? rangeParam : '')
    setSearchDate(dateParam)
    setSearchTerm(qParam)
  }, [location.search])

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest('.apt-actions')) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const res = await api.get('/appointments')
      const myAppointments = res.data
        .filter((a) => a.stylist_id === user.id)
        .sort((a, b) => new Date(getStart(a)) - new Date(getStart(b)))
      setAppointments(myAppointments)
    } catch (e) {
      console.error(e)
      if (e.response?.status === 401) {
        localStorage.clear(); sessionStorage.clear()
        navigate('/login/stylist')
      }
      toast.error('Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    try {
      if (action === 'complete') {
        await api.post(`/appointments/${id}/complete`)
        toast.success('Appointment marked as completed')
      } else if (action === 'cancel') {
        await api.post(`/appointments/${id}/cancel`)
        toast.success('Appointment cancelled')
      }
      loadAppointments()
    } catch (e) {
      toast.error('Failed to update appointment')
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear(); sessionStorage.clear()
      navigate('/login/stylist')
    })
  }

  const appointmentCounts = useMemo(() => {
    const now = new Date()
    const todayDate = now.toDateString()
    return {
      all: appointments.length,
      today: appointments.filter((apt) => new Date(getStart(apt)).toDateString() === todayDate).length,
      upcoming: appointments.filter((apt) => new Date(getStart(apt)) > now && apt.status === 'booked').length,
      completed: appointments.filter((apt) => apt.status === 'completed').length,
    }
  }, [appointments])

  const rangeDates = useMemo(() => getRangeDates(rangeFilter), [rangeFilter])

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const now = new Date()

    return appointments.filter((apt) => {
      const aptDate = new Date(getStart(apt))
      const aptStatus = (apt.status || '').toLowerCase()

      if (filter === 'today' && aptDate.toDateString() !== now.toDateString()) return false
      if (filter === 'upcoming' && !(aptDate > now && aptStatus === 'booked')) return false
      if (filter === 'completed' && aptStatus !== 'completed') return false
      if (filter === 'cancelled' && aptStatus !== 'cancelled') return false

      const aptManilaDate = toManilaDate(getStart(apt))
      if (searchDate && aptManilaDate !== searchDate) return false
      if (!searchDate && rangeDates) {
        if (!aptManilaDate || aptManilaDate < rangeDates.start || aptManilaDate > rangeDates.end) return false
      }

      if (normalizedSearch) {
        const serviceNames = getAppointmentServices(apt).map((s) => s.name || '').join(' ').toLowerCase()
        const customerName = (apt.customer_name || '').toLowerCase()
        const customerPhone = (apt.customer_phone || '').toLowerCase()
        if (
          !customerName.includes(normalizedSearch) &&
          !customerPhone.includes(normalizedSearch) &&
          !serviceNames.includes(normalizedSearch)
        ) {
          return false
        }
      }

      return true
    })
  }, [appointments, filter, rangeDates, searchDate, searchTerm])

  const sortedAppointments = useMemo(() => {
    return [...filteredAppointments].sort((a, b) => new Date(getStart(a)) - new Date(getStart(b)))
  }, [filteredAppointments])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4edff] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4edff] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="stylist" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/stylist/dashboard')}
                className="h-11 w-11 rounded-full bg-white/80 border border-[#eadfd5] shadow-[0_8px_16px_rgba(92,64,51,0.08)] text-[#8f7a6f] hover:text-[#6f5b50] hover:bg-white transition text-xl font-bold flex items-center justify-center"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >
                &larr;
              </button>
              <div>
                <h1 className="text-2xl font-semibold">My Appointments</h1>
                <p className="text-sm text-[#8f7a6f]">All your assigned bookings in one view</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/stylist/schedule')}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-[#b48a6b] text-white hover:bg-[#a27758]"
            >
              Go to My Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`text-left rounded-2xl border p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)] ${filter === 'all' ? 'bg-[#f3e7dd] border-[#d8b8a4]' : 'bg-white/80 border-[#eadfd5]'}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">All</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.all}</p>
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`text-left rounded-2xl border p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)] ${filter === 'today' ? 'bg-[#eaf1ff] border-[#b9ccff]' : 'bg-white/80 border-[#eadfd5]'}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Today</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.today}</p>
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`text-left rounded-2xl border p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)] ${filter === 'upcoming' ? 'bg-[#ebf7f0] border-[#bfe2cf]' : 'bg-white/80 border-[#eadfd5]'}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Upcoming</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.upcoming}</p>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`text-left rounded-2xl border p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)] ${filter === 'completed' ? 'bg-[#edf7ef] border-[#c5decb]' : 'bg-white/80 border-[#eadfd5]'}`}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Completed</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.completed}</p>
            </button>
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-3 md:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full lg:w-auto bg-white/90 border border-[#eadfd5] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d9bfb1]"
              >
                <option value="all">All Status</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={rangeFilter}
                onChange={(e) => setRangeFilter(e.target.value)}
                className="w-full lg:w-auto bg-white/90 border border-[#eadfd5] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d9bfb1]"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">This Month</option>
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
                  setRangeFilter('')
                  setFilter('all')
                }}
                className="w-full lg:w-auto bg-[#f4ebe4] text-[#6f5b50] border border-[#eadfd5] rounded-xl px-4 py-2 text-sm hover:bg-[#eadfd5]"
              >
                Reset
              </button>
              <div className="relative w-full lg:flex-1">
                <input
                  type="text"
                  placeholder="Search customer or service..."
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

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-[#f6efea]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e4dc]">
                  {sortedAppointments.map((apt) => {
                    const appointmentServices = getAppointmentServices(apt)
                    const totalPrice = appointmentServices.reduce((sum, service) => sum + (service?.price_cents || 0), 0)
                    const primaryService = appointmentServices[0]?.name || 'Service'
                    const extraCount = Math.max(appointmentServices.length - 1, 0)
                    const startDate = new Date(getStart(apt))
                    const canModify = apt.status === 'booked'

                    return (
                      <tr key={apt.id} className="hover:bg-[#f9f4ef]">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-sm">{apt.customer_name}</div>
                          <div className="text-xs text-[#9b857a] mt-1">{apt.customer_phone || apt.customer_email || 'No contact'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">{primaryService}{extraCount > 0 ? ` +${extraCount} more` : ''}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium">
                            {startDate.toLocaleDateString('en-US', {
                              timeZone: 'Asia/Manila',
                              month: 'short',
                              day: '2-digit',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-[#9b857a] mt-1">
                            {startDate.toLocaleTimeString('en-US', {
                              timeZone: 'Asia/Manila',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(getEnd(apt)).toLocaleTimeString('en-US', {
                              timeZone: 'Asia/Manila',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            apt.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : apt.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                          }`}>
                            {apt.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-semibold">{formatCurrency(totalPrice)}</div>
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
                              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-[#eadfd5] bg-white/95 shadow-[0_16px_32px_rgba(92,64,51,0.12)] p-2 z-20">
                                <button
                                  onClick={() => {
                                    if (!canModify) return
                                    setOpenActionId(null)
                                    handleAction(apt.id, 'complete')
                                  }}
                                  className={`w-full text-left text-sm px-3 py-2 rounded-xl ${
                                    canModify ? 'hover:bg-emerald-50 text-emerald-700' : 'text-[#b7a59a] cursor-not-allowed'
                                  }`}
                                >
                                  Mark Complete
                                </button>
                                <button
                                  onClick={() => {
                                    if (!canModify) return
                                    setOpenActionId(null)
                                    handleAction(apt.id, 'cancel')
                                  }}
                                  className={`w-full text-left text-sm px-3 py-2 rounded-xl ${
                                    canModify ? 'hover:bg-red-50 text-red-700' : 'text-[#b7a59a] cursor-not-allowed'
                                  }`}
                                >
                                  Cancel
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
      </main>
    </div>
  )
}

export default StylistAppointments
