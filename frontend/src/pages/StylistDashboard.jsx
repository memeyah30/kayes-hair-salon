import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const StylistDashboard = () => {
  const [stats, setStats] = useState({
    today_appointments: [],
    total_completed: 0,
    upcoming: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const user = JSON.parse((sessionStorage.getItem('user') || localStorage.getItem('user')) || '{}')
  const glassPanelClass = 'rounded-[28px] border border-white/32 bg-white/78 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md'
  const mutedTextClass = 'text-[#7b67a9]'

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/stylist/stats')
      const payload = res.data || {}
      setStats({
        today_appointments: payload.today_appointments || [],
        total_completed: payload.total_completed || 0,
        upcoming: payload.upcoming || 0,
        total: payload.total || 0,
      })
    } catch (e) {
      console.error(e)
      if (e.response?.status === 401) {
        localStorage.clear(); sessionStorage.clear()
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
      localStorage.clear(); sessionStorage.clear()
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#24173f]">Welcome, {user.name || 'Stylist'}!</h1>
              <p className={`mt-1 text-sm ${mutedTextClass}`}>Your daily bookings and actions in one view.</p>
            </div>
            <button
              onClick={() => navigate('/stylist/schedule')}
              className="w-full lg:w-auto rounded-2xl bg-gradient-to-r from-[#6f4ed0] to-[#8766df] px-4 py-2 text-white shadow-[0_14px_28px_rgba(43,20,97,0.24)] hover:from-[#6546c4] hover:to-[#7b5cd2]"
            >
              View Full Schedule
            </button>
          </div>

          <div className={`${glassPanelClass} overflow-hidden`}>
            <div className="border-b border-[#ece2ff] px-4 py-3">
              <h2 className="text-lg font-semibold text-[#2f2252]">Today&apos;s Schedule</h2>
            </div>
            {todayAppointments.length === 0 ? (
              <div className="py-8 text-center text-[#8a75b9]">No appointments scheduled for today</div>
            ) : (
              <div className="divide-y divide-[#ece2ff]">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between hover:bg-[#fbf8ff]/70">
                    <div>
                      <div className="font-semibold text-[#2f2252]">{appt.customer_name}</div>
                      <div className={`mt-1 text-sm ${mutedTextClass}`}>
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
                      <div className={`text-sm ${mutedTextClass}`}>Service: {getServiceLabel(appt)}</div>
                      <div className="text-xs text-[#8a75b9]">
                        {appt.customer_phone ? `Phone: ${appt.customer_phone}` : 'No phone provided'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        appt.status === 'completed'
                          ? 'bg-[#e9f5ef] text-[#4f8177]'
                          : appt.status === 'cancelled'
                            ? 'bg-[#fae8ee] text-[#9a4963]'
                            : 'bg-[#fff1e2] text-[#a86a2f]'
                      }`}>
                        {appt.status}
                      </span>
                      {appt.status === 'booked' && (
                        <>
                          <button
                            onClick={() => handleAction(appt.id, 'complete')}
                            className="rounded-full border border-[#d7ebdf] bg-[#eef8f2] px-3 py-1 text-sm text-[#3f7f5f] hover:bg-[#e4f3ea]"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleAction(appt.id, 'cancel')}
                            className="rounded-full border border-[#f3d8e1] bg-[#faedf2] px-3 py-1 text-sm text-[#ad5b76] hover:bg-[#f6e4eb]"
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
