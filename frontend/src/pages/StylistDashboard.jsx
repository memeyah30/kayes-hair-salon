import { useEffect, useState } from 'react'
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

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/stylist/stats')
      setStats(res.data)
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

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate('/login/stylist')
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
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

  const todayAppointments = stats.today_appointments || []
  const upcomingAppointments = todayAppointments.filter(apt => 
    new Date(getStart(apt)) > new Date() && apt.status === 'booked'
  )
  const pastAppointments = todayAppointments.filter(apt => 
    new Date(getStart(apt)) <= new Date() || apt.status !== 'booked'
  )

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row text-gray-800">
      <Sidebar userType="stylist" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="bg-white px-4 py-2 rounded shadow">
                <div className="text-gray-500">Today's Appointments</div>
                <div className="font-bold text-lg">{todayAppointments.length}</div>
              </div>
              <div className="bg-white px-4 py-2 rounded shadow">
                <div className="text-gray-500">Completed</div>
                <div className="font-bold text-lg">{stats.total_completed}</div>
              </div>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-lg mb-4">Today's Schedule</h2>
            
            {upcomingAppointments.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-blue-600 mb-3">Upcoming Appointments</h3>
                <div className="space-y-3">
                  {upcomingAppointments.map(appt => (
                    <div key={appt.id} className="border-l-4 border-blue-500 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">
                              {appt.customer_name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="font-semibold text-lg">{appt.customer_name}</div>
                              <div className="text-xs text-gray-500">Customer</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Time:</span>{' '}
                            {new Date(getStart(appt)).toLocaleTimeString('en-US', { timeStyle: 'short', timeZone: 'Asia/Manila' })} - {new Date(getEnd(appt)).toLocaleTimeString('en-US', { timeStyle: 'short', timeZone: 'Asia/Manila' })} PHT
                          </div>
                          <div className="text-sm font-medium text-gray-700 mt-1">
                            <span className="text-gray-500">Service:</span> {appt.service?.name}
                          </div>
                          <div className="text-xs text-gray-600 mt-2 space-y-1">
                            {appt.customer_phone && (
                              <div className="flex items-center gap-1">
                                <span>📞</span>
                                <span>{appt.customer_phone}</span>
                              </div>
                            )}
                            {appt.customer_email && (
                              <div className="flex items-center gap-1">
                                <span>✉️</span>
                                <span>{appt.customer_email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleAction(appt.id, 'complete')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => handleAction(appt.id, 'cancel')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pastAppointments.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-600 mb-3">Past Appointments Today</h3>
                <div className="space-y-2">
                  {pastAppointments.map(appt => (
                    <div key={appt.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{appt.customer_name}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(getStart(appt)).toLocaleTimeString('en-US', { timeStyle: 'short', timeZone: 'Asia/Manila' })} PHT • {appt.service?.name}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {appt.customer_phone && `📞 ${appt.customer_phone}`}
                            {appt.customer_email && ` • ✉️ ${appt.customer_email}`}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${
                          appt.status === 'completed' ? 'bg-green-100 text-green-800' :
                          appt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todayAppointments.length === 0 && (
              <div className="text-center py-8 text-gray-500">No appointments scheduled for today</div>
            )}
          </div>

          {/* Performance Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Total Completed</div>
              <div className="text-2xl font-bold text-green-600">{stats.total_completed}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Upcoming</div>
              <div className="text-2xl font-bold text-blue-600">{stats.upcoming}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Total Appointments</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StylistDashboard
