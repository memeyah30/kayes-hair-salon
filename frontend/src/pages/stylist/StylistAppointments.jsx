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
  const glassPanelClass = 'rounded-[28px] border border-white/32 bg-white/78 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md'
  const inputClass = 'w-full rounded-xl border border-[#ddccff] bg-white/88 px-3 py-2 text-sm text-[#2d1f4f] outline-none focus:border-[#8c72df] focus:ring-2 focus:ring-[#d8cbff]'

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
      <div className="min-h-screen app-admin-bg flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-admin-bg flex flex-col md:flex-row text-[#2d1f4f]">
      <Sidebar userType="stylist" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/stylist/dashboard')}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/36 bg-white/82 text-xl font-bold text-[#654abf] shadow-[0_14px_28px_rgba(43,20,97,0.12)] transition hover:bg-white"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >
                &larr;
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-[#24173f]">My Appointments</h1>
                <p className="text-sm text-[#7b67a9]">All your assigned bookings in one view</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/stylist/schedule')}
              className="w-full md:w-auto rounded-2xl bg-gradient-to-r from-[#6f4ed0] to-[#8867df] px-4 py-2 text-white shadow-[0_14px_28px_rgba(43,20,97,0.24)] hover:from-[#6546c4] hover:to-[#7b5cd2]"
            >
              Go to My Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`text-left rounded-[24px] border p-4 shadow-[0_14px_32px_rgba(59,31,114,0.12)] ${filter === 'all' ? 'border-white/14 bg-gradient-to-br from-[#8365ea] to-[#5b3dbe] text-white' : 'border-white/32 bg-white/78 backdrop-blur-md'}`}
            >
              <p className={`text-xs uppercase tracking-[0.2em] ${filter === 'all' ? 'text-white/76' : 'text-[#8a75b9]'}`}>All</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.all}</p>
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`text-left rounded-[24px] border p-4 shadow-[0_14px_32px_rgba(59,31,114,0.12)] ${filter === 'today' ? 'border-white/14 bg-gradient-to-br from-[#e88fa7] to-[#cf6d91] text-white' : 'border-white/32 bg-white/78 backdrop-blur-md'}`}
            >
              <p className={`text-xs uppercase tracking-[0.2em] ${filter === 'today' ? 'text-white/76' : 'text-[#8a75b9]'}`}>Today</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.today}</p>
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`text-left rounded-[24px] border p-4 shadow-[0_14px_32px_rgba(59,31,114,0.12)] ${filter === 'upcoming' ? 'border-white/14 bg-gradient-to-br from-[#f0a160] to-[#d9874d] text-white' : 'border-white/32 bg-white/78 backdrop-blur-md'}`}
            >
              <p className={`text-xs uppercase tracking-[0.2em] ${filter === 'upcoming' ? 'text-white/76' : 'text-[#8a75b9]'}`}>Upcoming</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.upcoming}</p>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`text-left rounded-[24px] border p-4 shadow-[0_14px_32px_rgba(59,31,114,0.12)] ${filter === 'completed' ? 'border-white/14 bg-gradient-to-br from-[#74a0ae] to-[#547f91] text-white' : 'border-white/32 bg-white/78 backdrop-blur-md'}`}
            >
              <p className={`text-xs uppercase tracking-[0.2em] ${filter === 'completed' ? 'text-white/76' : 'text-[#8a75b9]'}`}>Completed</p>
              <p className="text-2xl font-semibold mt-2">{appointmentCounts.completed}</p>
            </button>
          </div>

          <div className={`${glassPanelClass} p-3 md:p-4`}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`lg:w-auto ${inputClass}`}
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
                className={`lg:w-auto ${inputClass}`}
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
                className={`lg:w-auto ${inputClass}`}
              />
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSearchDate('')
                  setRangeFilter('')
                  setFilter('all')
                }}
                className="w-full rounded-2xl border border-[#ddccff] bg-white/88 px-4 py-2 text-sm text-[#6046b7] hover:bg-white lg:w-auto"
              >
                Reset
              </button>
              <div className="relative w-full lg:flex-1">
                <input
                  type="text"
                  placeholder="Search customer or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-4 pr-10 ${inputClass}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a75b9]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3.5-3.5" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div className={`${glassPanelClass} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-[#f3ebff]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8a75b9]">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8a75b9]">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8a75b9]">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8a75b9]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8a75b9]">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[#8a75b9]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece2ff]">
                  {sortedAppointments.map((apt) => {
                    const appointmentServices = getAppointmentServices(apt)
                    const totalPrice = appointmentServices.reduce((sum, service) => sum + (service?.price_cents || 0), 0)
                    const primaryService = appointmentServices[0]?.name || 'Service'
                    const extraCount = Math.max(appointmentServices.length - 1, 0)
                    const startDate = new Date(getStart(apt))
                    const canModify = apt.status === 'booked'

                    return (
                      <tr key={apt.id} className="hover:bg-[#fbf8ff]/70">
                        <td className="px-4 py-4">
                          <div className="text-sm font-semibold text-[#2f2252]">{apt.customer_name}</div>
                          <div className="mt-1 text-xs text-[#8a75b9]">{apt.customer_phone || apt.customer_email || 'No contact'}</div>
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
                          <div className="mt-1 text-xs text-[#8a75b9]">
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
                              ? 'bg-[#e9f5ef] text-[#4f8177]'
                              : apt.status === 'cancelled'
                                ? 'bg-[#fae8ee] text-[#9a4963]'
                                : 'bg-[#fff1e2] text-[#a86a2f]'
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
                              className="inline-flex items-center gap-2 rounded-full border border-[#ddccff] bg-white/90 px-4 py-2 text-sm text-[#6046b7] hover:bg-white"
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
                              <div className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-white/36 bg-white/95 p-2 shadow-[0_16px_32px_rgba(59,31,114,0.14)]">
                                <button
                                  onClick={() => {
                                    if (!canModify) return
                                    setOpenActionId(null)
                                    handleAction(apt.id, 'complete')
                                  }}
                                  className={`w-full text-left text-sm px-3 py-2 rounded-xl ${
                                    canModify ? 'text-[#4f8177] hover:bg-[#eef8f2]' : 'cursor-not-allowed text-[#b6a6d8]'
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
                                    canModify ? 'text-[#9a4963] hover:bg-[#faedf2]' : 'cursor-not-allowed text-[#b6a6d8]'
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
                <div className="py-8 text-center text-[#8a75b9]">No appointments found</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StylistAppointments
