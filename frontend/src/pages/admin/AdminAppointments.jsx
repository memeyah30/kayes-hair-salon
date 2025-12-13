import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, booked, completed, cancelled
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const navigate = useNavigate()

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
        toast.success('Appointment marked as completed')
      } else if (action === 'confirm') {
        await api.post(`/appointments/${id}/confirm`)
        toast.success('Appointment confirmed')
      }
      loadData()
    } catch (e) {
      toast.error('Failed to update appointment')
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    if (filter === 'all') return true
    return apt.status === filter
  })

  const currency = cents => `₱${(cents / 100).toFixed(2)}`

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate('/login/admin')
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex text-gray-800">
      <Sidebar userType="admin" onLogout={handleLogout} />
      <main className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Appointment Management</h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ← Return to Dashboard
            </button>
          </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">All Appointments</option>
            <option value="booked">Booked</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button
            onClick={() => navigate('/book')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Create Appointment
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stylist</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAppointments.map(apt => (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{apt.customer_name}</div>
                    <div className="text-xs text-gray-500">
                      {apt.customer_email || apt.customer_phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">{apt.service?.name}</td>
                  <td className="px-4 py-3">{apt.stylist?.name}</td>
                  <td className="px-4 py-3">
                    {new Date(apt.start_datetime).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      apt.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                      apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{currency(apt.service?.price_cents || 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {apt.status === 'booked' && (
                        <>
                          <button
                            onClick={() => handleAction(apt.id, 'confirm')}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => navigate(`/book?reschedule=${apt.id}`)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleAction(apt.id, 'cancel')}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {apt.status === 'booked' && (
                        <button
                          onClick={() => handleAction(apt.id, 'complete')}
                          className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAppointments.length === 0 && (
            <div className="text-center py-8 text-gray-500">No appointments found</div>
          )}
        </div>
        </div>
        </div>
      </main>
    </div>
  )
}

export default AdminAppointments

