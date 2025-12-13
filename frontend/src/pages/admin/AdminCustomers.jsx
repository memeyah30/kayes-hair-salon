import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const AdminCustomers = () => {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/appointments')
      setAppointments(res.data)
    } catch (e) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Group appointments by customer
  const customers = appointments.reduce((acc, apt) => {
    const key = apt.customer_email || apt.customer_phone || apt.customer_name
    if (!acc[key]) {
      acc[key] = {
        name: apt.customer_name,
        email: apt.customer_email,
        phone: apt.customer_phone,
        appointments: [],
        totalSpent: 0,
        totalAppointments: 0,
      }
    }
    acc[key].appointments.push(apt)
    acc[key].totalAppointments++
    if (apt.status === 'completed') {
      acc[key].totalSpent += apt.service?.price_cents || 0
    }
    return acc
  }, {})

  const customerList = Object.values(customers)

  const currency = cents => `₱${(cents / 100).toFixed(2)}`

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const navigate = useNavigate()

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
            <h1 className="text-2xl font-bold">Customer Management</h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ← Return to Dashboard
            </button>
          </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">All Customers ({customerList.length})</h2>
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {customerList.map((customer, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedCustomer?.name === customer.name ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-600">
                  {customer.email || customer.phone}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {customer.totalAppointments} appointments • {currency(customer.totalSpent)} spent
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedCustomer && (
          <div className="bg-white rounded-xl shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Customer Profile</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="font-medium">{selectedCustomer.name}</div>
              </div>
              {selectedCustomer.email && (
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div>{selectedCustomer.email}</div>
                </div>
              )}
              {selectedCustomer.phone && (
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div>{selectedCustomer.phone}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500">Total Appointments</div>
                <div className="font-medium">{selectedCustomer.totalAppointments}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Spent</div>
                <div className="font-medium text-green-600">{currency(selectedCustomer.totalSpent)}</div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Appointment History</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCustomer.appointments
                    .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
                    .map(apt => (
                      <div key={apt.id} className="border rounded p-2 text-sm">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{apt.service?.name}</div>
                            <div className="text-gray-600">
                              {new Date(apt.start_datetime).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </div>
                            <div className="text-gray-500">with {apt.stylist?.name}</div>
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
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  )
}

export default AdminCustomers

