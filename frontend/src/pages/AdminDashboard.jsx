import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const StatCard = ({ title, value, accent }) => (
  <div className="bg-white rounded-xl shadow p-4 border-l-4" style={{ borderColor: accent }}>
    <div className="text-gray-500 text-sm font-semibold">{title}</div>
    <div className="text-3xl font-bold mt-2">{value}</div>
  </div>
)

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    appointments: { today: 0, week: 0, month: 0, total: 0 },
    stylists: { active: 0, total: 0 },
    customers: 0,
    services: 0,
    status_summary: { booked: 0, completed: 0, cancelled: 0 },
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const storedUserType = localStorage.getItem('userType') || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await api.get('/dashboard/admin/stats')
      setStats(res.data)
    } catch (e) {
      console.error('Dashboard load error:', e)
      console.error('Response status:', e.response?.status)
      console.error('Response data:', e.response?.data)
      
      if (e.response?.status === 401) {
        localStorage.clear()
        navigate(loginPath)
        toast.error('Session expired. Please log in again.')
      } else if (e.response?.status === 403) {
        toast.error('You do not have permission to access this page')
      } else {
        toast.error(`Failed to load dashboard data: ${e.response?.data?.message || e.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate(loginPath)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row text-gray-800">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          
          {/* Overview Metrics */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Overview Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard title="Today Appointments" value={stats.appointments.today} accent="#0ea5e9" />
              <StatCard title="Week Appointments" value={stats.appointments.week} accent="#3b82f6" />
              <StatCard title="Month Appointments" value={stats.appointments.month} accent="#2563eb" />
              <StatCard title="Total Appointments" value={stats.appointments.total} accent="#1e40af" />
              <StatCard title="Active Stylists" value={stats.stylists.active} accent="#22c55e" />
              <StatCard title="Total Customers" value={stats.customers} accent="#10b981" />
            </div>
          </div>

          {/* Appointment Status Summary */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Appointment Status Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Booked" value={stats.status_summary.booked} accent="#3b82f6" />
              <StatCard title="Completed" value={stats.status_summary.completed} accent="#22c55e" />
              <StatCard title="Cancelled" value={stats.status_summary.cancelled} accent="#ef4444" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Appointment Management</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/appointments')}
                  className="w-full text-left px-4 py-2 bg-purple-50 hover:bg-purple-100 rounded"
                >
                  View All Appointments
                </button>
                <button
                  onClick={() => navigate('/book')}
                  className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded"
                >
                  Create New Appointment
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Stylist Management</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/manage/stylists')}
                  className="w-full text-left px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded"
                >
                  Manage Stylists
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Active: {stats.stylists.active} / Total: {stats.stylists.total}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Service Management</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/manage/services')}
                  className="w-full text-left px-4 py-2 bg-green-50 hover:bg-green-100 rounded"
                >
                  Manage Services
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Total Services: {stats.services}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Customer Management</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/customers')}
                  className="w-full text-left px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded"
                >
                  View Customers
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Total Customers: {stats.customers}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Customer Ratings</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/ratings')}
                  className="w-full text-left px-4 py-2 bg-yellow-50 hover:bg-yellow-100 rounded"
                >
                  View Customer Ratings
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  View and manage customer feedback
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Holidays & Occasions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/holidays')}
                  className="w-full text-left px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded"
                >
                  Manage Holidays
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Set salon closure dates
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Payment Accounts</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/payment-accounts')}
                  className="w-full text-left px-4 py-2 bg-teal-50 hover:bg-teal-100 rounded"
                >
                  Manage Payment Accounts
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Add/Edit GCash, PayMaya, etc.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold mb-3">Inventory & Sales</h2>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/inventory')}
                  className="w-full text-left px-4 py-2 bg-orange-50 hover:bg-orange-100 rounded"
                >
                  Manage Inventory
                </button>
                <button
                  onClick={() => navigate('/admin/sales')}
                  className="w-full text-left px-4 py-2 bg-indigo-50 hover:bg-indigo-100 rounded"
                >
                  Sales Monitoring
                </button>
                <div className="text-xs text-gray-500 mt-2">
                  Track inventory and monitor sales
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
