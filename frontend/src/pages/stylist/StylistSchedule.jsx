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
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime

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
        localStorage.clear()
        navigate('/login/stylist')
      }
      toast.error('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate('/login/stylist')
    })
  }

  // Group appointments by date
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    const date = new Date(getStart(apt)).toISOString().slice(0, 10)
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(apt)
    return acc
  }, {})

  const selectedDateAppointments = appointmentsByDate[selectedDate] || []

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/stylist/dashboard')}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-bold"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >
                ←
              </button>
              <h1 className="text-2xl font-bold">My Schedule</h1>
            </div>
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2"
            />
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <h2 className="font-semibold text-lg mb-4">
              Schedule for {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h2>
            
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center py-8 text-[#9b857a]">No appointments scheduled for this date</div>
            ) : (
              <div className="space-y-3">
                {selectedDateAppointments
                  .sort((a, b) => new Date(getStart(a)) - new Date(getStart(b)))
                  .map(apt => (
                    <div key={apt.id} className="border-l-4 border-blue-500 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">
                              {apt.customer_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{apt.customer_name}</div>
                              <div className="text-xs text-[#8f7a6f]">Customer</div>
                            </div>
                          </div>
                          <div className="text-sm text-[#8f7a6f] mt-1">
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
                          <div className="text-sm font-medium text-gray-700 mt-1">
                            <span className="text-[#9b857a]">Service:</span> {apt.service?.name}
                          </div>
                          <div className="text-xs text-[#8f7a6f] mt-2 space-y-1">
                            {apt.customer_phone && (
                              <div className="flex items-center gap-1">
                                <span>📞</span>
                                <span>{apt.customer_phone}</span>
                              </div>
                            )}
                            {apt.customer_email && (
                              <div className="flex items-center gap-1">
                                <span>✉️</span>
                                <span>{apt.customer_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            apt.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                            apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
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
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <h2 className="font-semibold text-lg mb-4">Monthly Overview</h2>
            <div className="grid grid-cols-7 gap-2 text-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center font-medium text-[#8f7a6f] py-2">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const date = new Date()
                date.setDate(1)
                date.setDate(date.getDate() + i - date.getDay())
                const dateStr = date.toISOString().slice(0, 10)
                const dayAppointments = appointmentsByDate[dateStr] || []
                const isSelected = dateStr === selectedDate
                const isToday = dateStr === new Date().toISOString().slice(0, 10)
                
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`p-2 rounded text-center ${
                      isSelected ? 'bg-blue-600 text-white' :
                      isToday ? 'bg-blue-100 text-blue-700' :
                      dayAppointments.length > 0 ? 'bg-green-100 text-green-700' :
                      'hover:bg-[#f7f1ec]'
                    }`}
                  >
                    <div>{date.getDate()}</div>
                    {dayAppointments.length > 0 && (
                      <div className="text-xs mt-1">{dayAppointments.length}</div>
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


