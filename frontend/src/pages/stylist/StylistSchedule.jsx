import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const StylistSchedule = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const navigate = useNavigate()
  const user = JSON.parse((sessionStorage.getItem('user') || localStorage.getItem('user')) || '{}')
  const glassPanelClass = 'rounded-[28px] border border-white/32 bg-white/78 p-4 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md'
  const inputClass = 'rounded-xl border border-[#ddccff] bg-white/88 px-3 py-2 text-[#2d1f4f] outline-none focus:border-[#8c72df] focus:ring-2 focus:ring-[#d8cbff]'

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

  const getDayServiceNames = (dayAppointments) => {
    const uniqueNames = new Set()
    dayAppointments.forEach((apt) => {
      getAppointmentServices(apt).forEach((service) => {
        if (service?.name) {
          uniqueNames.add(service.name)
        }
      })
    })
    return Array.from(uniqueNames)
  }

  useEffect(() => {
    loadAppointments()
  }, [selectedDate])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      const res = await api.get('/appointments')
      // Filter appointments for this stylist
      const myAppointments = res.data
        .filter(a => a.stylist_id === user.id)
        .sort((a, b) => new Date(getStart(a)) - new Date(getStart(b)))
      setAppointments(myAppointments)
    } catch (e) {
      console.error(e)
      if (e.response?.status === 401) {
        localStorage.clear(); sessionStorage.clear()
        navigate('/login/stylist')
      }
      toast.error('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear(); sessionStorage.clear()
      navigate('/login/stylist')
    })
  }

  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    const date = toManilaDate(getStart(apt))
    if (!date) return acc
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(apt)
    return acc
  }, {})

  const selectedDateAppointments = appointmentsByDate[selectedDate] || []
  const selectedBaseDate = new Date(`${selectedDate}T00:00:00`)
  const selectedMonthStart = new Date(selectedBaseDate.getFullYear(), selectedBaseDate.getMonth(), 1)
  const selectedGridStart = new Date(selectedMonthStart)
  selectedGridStart.setDate(selectedMonthStart.getDate() - selectedMonthStart.getDay())

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/stylist/dashboard')}
                className="rounded-2xl border border-white/36 bg-white/82 px-3 py-2 text-lg font-bold text-[#654abf] shadow-[0_14px_28px_rgba(43,20,97,0.12)] hover:bg-white"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <h1 className="text-2xl font-bold text-[#24173f]">My Schedule</h1>
            </div>
          </div>

          <div className={glassPanelClass}>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className={glassPanelClass}>
            <h2 className="font-semibold text-lg mb-4">
              Schedule for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h2>
            
            {selectedDateAppointments.length === 0 ? (
              <div className="py-8 text-center text-[#8a75b9]">No appointments scheduled for this date</div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments
                  .sort((a, b) => new Date(getStart(a)) - new Date(getStart(b)))
                  .map(apt => (
                    <div key={apt.id} className="rounded-2xl border border-[#e7dbff] bg-[#f8f3ff] p-4 shadow-[0_10px_22px_rgba(59,31,114,0.08)]">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e3d7ff] font-bold text-[#6046b7]">
                              {apt.customer_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{apt.customer_name}</div>
                              <div className="text-xs text-[#7b67a9]">Customer</div>
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-[#7b67a9]">
                            <span className="font-medium">Time:</span>{' '}
                            {new Date(getStart(apt)).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Manila'
                            })} - {new Date(getEnd(apt)).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Manila'
                            })} PHT
                          </div>
                          <div className="mt-1 text-sm font-medium text-[#47356f]">
                            <span className="text-[#8a75b9]">Service:</span>{' '}
                            {getAppointmentServices(apt).map((service) => service.name).join(', ') || 'N/A'}
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-[#7b67a9]">
                            {apt.customer_phone && (
                              <div className="flex items-center gap-1">
                                <span>Phone:</span>
                                <span>{apt.customer_phone}</span>
                              </div>
                            )}
                            {apt.customer_email && (
                              <div className="flex items-center gap-1">
                                <span>Email:</span>
                                <span>{apt.customer_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            apt.status === 'booked' ? 'bg-[#fff1e2] text-[#a86a2f]' :
                            apt.status === 'completed' ? 'bg-[#e9f5ef] text-[#4f8177]' :
                            'bg-[#fae8ee] text-[#9a4963]'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Calendar View */}
          <div className={glassPanelClass}>
            <h2 className="font-semibold text-lg mb-4">Monthly Overview</h2>
            <div className="grid grid-cols-7 gap-2 text-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-2 text-center font-medium text-[#7b67a9]">
                  {day}
                </div>
              ))}
              {Array.from({ length: 42 }, (_, i) => {
                const date = new Date(selectedGridStart)
                date.setDate(selectedGridStart.getDate() + i)
                const dateStr = toManilaDate(date)
                const dayAppointments = appointmentsByDate[dateStr] || []
                const dayServiceNames = getDayServiceNames(dayAppointments)
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === toManilaDate(new Date())
                const isCurrentMonth = date.getMonth() === selectedBaseDate.getMonth()
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-2 rounded text-left min-h-[84px] transition ${
                      isSelected ? 'bg-gradient-to-br from-[#7f63e8] to-[#5a3dbd] text-white shadow-[0_14px_28px_rgba(43,20,97,0.24)]' :
                      isToday ? 'bg-[#efe7ff] text-[#6046b7]' :
                      dayAppointments.length > 0 ? 'bg-[#edf8f3] text-[#4f8177]' :
                      'hover:bg-[#f5eeff]'
                    }`}
                  >
                    <div className={`font-medium ${isCurrentMonth ? '' : 'opacity-45'}`}>{date.getDate()}</div>
                    {dayServiceNames.length > 0 && (
                      <div className={`mt-1 space-y-0.5 ${isSelected ? 'text-white/90' : ''}`}>
                        {dayServiceNames.slice(0, 2).map((serviceName) => (
                          <div key={serviceName} className="text-[10px] leading-4 truncate">
                            {serviceName}
                          </div>
                        ))}
                        {dayServiceNames.length > 2 && (
                          <div className="text-[10px] leading-4 opacity-80">
                            +{dayServiceNames.length - 2} more
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StylistSchedule




