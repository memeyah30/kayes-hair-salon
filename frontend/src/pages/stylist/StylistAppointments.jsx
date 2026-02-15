import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const StylistAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, today, upcoming, completed
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime

  useEffect(() => {
    loadAppointments()
  }, [])

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
      localStorage.clear()
      navigate('/login/stylist')
    })
  }

  const filteredAppointments = appointments.filter(apt => {
    const now = new Date()
    const aptDate = new Date(getStart(apt))
    
    if (filter === 'today') {
      return aptDate.toDateString() === now.toDateString()
    } else if (filter === 'upcoming') {
      return aptDate > now && apt.status === 'booked'
    } else if (filter === 'completed') {
      return apt.status === 'completed'
    }
    return true
  })

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
              <h1 className="text-2xl font-bold">My Appointments</h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded text-sm ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              All ({appointments.length})
            </button>
            <button
              onClick={() => setFilter('today')}
              className={`px-4 py-2 rounded text-sm ${
                filter === 'today' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded text-sm ${
                filter === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded text-sm ${
                filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
              }`}
            >
              Completed
            </button>
          </div>

          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-hidden">
            <div className="divide-y">
              {filteredAppointments.map(apt => (
                <div key={apt.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                          {apt.customer_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-lg">{apt.customer_name}</div>
                          <div className="text-xs text-[#9b857a]">Customer Information</div>
                        </div>
                      </div>
                      
                      <div className="ml-0 space-y-2">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-[#9b857a] mb-1">Contact Details</div>
                          <div className="text-sm">
                            {apt.customer_email && (
                              <div className="flex items-center gap-2 mb-1">
                                <span>✉️</span>
                                <span>{apt.customer_email}</span>
                              </div>
                            )}
                            {apt.customer_phone && (
                              <div className="flex items-center gap-2">
                                <span>📞</span>
                                <span>{apt.customer_phone}</span>
                              </div>
                            )}
                            {!apt.customer_email && !apt.customer_phone && (
                              <span className="text-gray-400 italic">No contact information</span>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-[#8f7a6f]">
                          <div className="font-medium mb-1">Appointment Details</div>
                          <div className="space-y-1">
                            <div>
                              <span className="text-[#9b857a]">Date & Time:</span>{' '}
                              <span className="font-medium">
                                {new Date(getStart(apt)).toLocaleString('en-US', {
                                  dateStyle: 'full',
                                  timeStyle: 'short',
                                  timeZone: 'Asia/Manila'
                                })} PHT
                              </span>
                            </div>
                            <div>
                              <span className="text-[#9b857a]">Service:</span>{' '}
                              <span className="font-medium">{apt.service?.name}</span>
                            </div>
                            <div>
                              <span className="text-[#9b857a]">Duration:</span>{' '}
                              <span className="font-medium">
                                {apt.service?.duration_minutes ? 
                                  `${Math.floor(apt.service.duration_minutes / 60)}h ${apt.service.duration_minutes % 60}m` : 
                                  'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#9b857a]">Price:</span>{' '}
                              <span className="font-medium text-green-600">
                                ₱{((apt.service?.price_cents || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            apt.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                            apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                            apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-[#f7f1ec] text-[#3b2f2a]'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {apt.status === 'booked' && (
                        <>
                          <button
                            onClick={() => handleAction(apt.id, 'complete')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                          >
                            Mark Complete
                          </button>
                          <button
                            onClick={() => handleAction(apt.id, 'cancel')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAppointments.length === 0 && (
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


