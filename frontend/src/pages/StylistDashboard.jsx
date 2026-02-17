import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const formatCurrency = (cents) => `PHP ${(Number(cents || 0) / 100).toFixed(2)}`

const StylistDashboard = () => {
  const [stats, setStats] = useState({
    today_appointments: [],
    total_completed: 0,
    upcoming: 0,
    total: 0,
    sales: {
      day: 0,
      week: 0,
      month: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/stylist/stats')
      setStats({
        ...res.data,
        sales: {
          day: res.data?.sales?.day || 0,
          week: res.data?.sales?.week || 0,
          month: res.data?.sales?.month || 0,
        },
      })
    } catch (e) {
      console.error(e)
      if (e.response?.status === 401) {
        localStorage.clear()
        navigate('/login/stylist')
      }
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate('/login/stylist')
    })
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
      loadStats()
    } catch (e) {
      toast.error('Failed to update appointment')
    }
  }

  const todayAppointments = useMemo(() => {
    return [...(stats.today_appointments || [])].sort((a, b) => new Date(getStart(a)) - new Date(getStart(b)))
  }, [stats.today_appointments])

  const getServiceLabel = (appointment) => {
    if (appointment.services?.length) {
      const primary = appointment.services[0]?.name || 'Service'
      const extra = Math.max(appointment.services.length - 1, 0)
      return extra > 0 ? `${primary} +${extra} more` : primary
    }
    return appointment.service?.name || 'Service'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f1ec] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f1ec] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="stylist" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Welcome, {user.name || 'Stylist'}!</h1>
              <p className="text-sm text-[#8f7a6f]">Quick view of your appointments and sales</p>
            </div>
            <button
              onClick={() => navigate('/stylist/schedule')}
              className="w-full lg:w-auto px-4 py-2 rounded-xl bg-[#b48a6b] text-white hover:bg-[#a27758]"
            >
              View Full Schedule
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/stylist/appointments?filter=today')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Today Appointments</div>
              <div className="text-2xl font-semibold mt-2">{todayAppointments.length}</div>
              <div className="text-xs text-[#9b857a] mt-1">Tap to open today list</div>
            </button>
            <button
              onClick={() => navigate('/stylist/appointments?filter=upcoming')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Upcoming</div>
              <div className="text-2xl font-semibold mt-2 text-blue-700">{stats.upcoming || 0}</div>
              <div className="text-xs text-[#9b857a] mt-1">Tap to open upcoming</div>
            </button>
            <button
              onClick={() => navigate('/stylist/appointments?filter=completed')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Completed</div>
              <div className="text-2xl font-semibold mt-2 text-green-700">{stats.total_completed || 0}</div>
              <div className="text-xs text-[#9b857a] mt-1">Tap to open completed</div>
            </button>
            <button
              onClick={() => navigate('/stylist/appointments?filter=all')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Total Appointments</div>
              <div className="text-2xl font-semibold mt-2">{stats.total || 0}</div>
              <div className="text-xs text-[#9b857a] mt-1">Tap to open all appointments</div>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/stylist/appointments?filter=completed&range=today')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Sales Today</div>
              <div className="text-2xl font-semibold mt-2 text-emerald-700">{formatCurrency(stats.sales?.day)}</div>
              <div className="text-xs text-[#9b857a] mt-1">Completed services</div>
            </button>
            <button
              onClick={() => navigate('/stylist/appointments?filter=completed&range=week')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Sales This Week</div>
              <div className="text-2xl font-semibold mt-2 text-emerald-700">{formatCurrency(stats.sales?.week)}</div>
              <div className="text-xs text-[#9b857a] mt-1">Completed services</div>
            </button>
            <button
              onClick={() => navigate('/stylist/appointments?filter=completed&range=month')}
              className="text-left bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 hover:bg-white transition"
            >
              <div className="text-xs uppercase tracking-[0.2em] text-[#b79b8f]">Sales This Month</div>
              <div className="text-2xl font-semibold mt-2 text-emerald-700">{formatCurrency(stats.sales?.month)}</div>
              <div className="text-xs text-[#9b857a] mt-1">Completed services</div>
            </button>
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f0e4dc]">
              <h2 className="font-semibold text-lg">Today&apos;s Schedule</h2>
            </div>
            {todayAppointments.length === 0 ? (
              <div className="text-center py-8 text-[#9b857a]">No appointments scheduled for today</div>
            ) : (
              <div className="divide-y divide-[#f0e4dc]">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div>
                      <div className="font-semibold">{appt.customer_name}</div>
                      <div className="text-sm text-[#8f7a6f] mt-1">
                        {new Date(getStart(appt)).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Manila',
                        })}
                        {' - '}
                        {new Date(getEnd(appt)).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Manila',
                        })}{' '}
                        PHT
                      </div>
                      <div className="text-sm text-[#8f7a6f]">Service: {getServiceLabel(appt)}</div>
                      <div className="text-xs text-[#9b857a]">
                        {appt.customer_phone ? `Phone: ${appt.customer_phone}` : 'No phone provided'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        appt.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : appt.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}>
                        {appt.status}
                      </span>
                      {appt.status === 'booked' && (
                        <>
                          <button
                            onClick={() => handleAction(appt.id, 'complete')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleAction(appt.id, 'cancel')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default StylistDashboard
