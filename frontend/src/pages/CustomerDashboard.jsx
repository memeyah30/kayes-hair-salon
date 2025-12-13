import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const CustomerDashboard = () => {
  const [stats, setStats] = useState({
    upcoming: [],
    history: [],
    total_spent: 0,
    total_appointments: 0,
  })
  // Initialize state based on localStorage
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { email: '', phone: '', loading: false, showProfile: true }
    }
    const email = localStorage.getItem('customer_email') || ''
    const phone = localStorage.getItem('customer_phone') || ''
    const hasData = !!(email || phone)
    return {
      email,
      phone,
      loading: hasData,
      showProfile: !hasData
    }
  }
  
  const initialState = getInitialState()
  const [loading, setLoading] = useState(initialState.loading)
  const [customerEmail, setCustomerEmail] = useState(initialState.email)
  const [customerPhone, setCustomerPhone] = useState(initialState.phone)
  const [showProfile, setShowProfile] = useState(initialState.showProfile)

  useEffect(() => {
    // If we have saved data, load stats
    if (customerEmail || customerPhone) {
      loadStats(customerEmail, customerPhone)
    }
  }, [])

  const loadStats = async (email = customerEmail, phone = customerPhone) => {
    if (!email && !phone) {
      setLoading(false)
      setStats({
        upcoming: [],
        history: [],
        total_spent: 0,
        total_appointments: 0,
      })
      return
    }
    try {
      setLoading(true)
      const res = await api.get('/dashboard/customer/stats', {
        params: { email, phone }
      })
      setStats(res.data)
    } catch (e) {
      console.error('Failed to load customer stats:', e)
      toast.error('Failed to load appointments')
      setStats({
        upcoming: [],
        history: [],
        total_spent: 0,
        total_appointments: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = () => {
    localStorage.setItem('customer_email', customerEmail)
    localStorage.setItem('customer_phone', customerPhone)
    setShowProfile(false)
    loadStats(customerEmail, customerPhone)
    toast.success('Profile saved')
  }

  const handleCancel = async (id) => {
    try {
      await api.post(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      loadStats()
    } catch (e) {
      toast.error('Failed to cancel appointment')
    }
  }

  const currency = cents => `₱${(cents / 100).toFixed(2)}`

  if (showProfile) {
    return (
      <div className="min-h-screen bg-gray-100 flex text-gray-800">
        <Sidebar userType="customer" />
        <main className="flex-1 flex flex-col">
          <Navbar />
          <div className="p-4 md:p-6">
            <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Customer Profile</h2>
              <p className="text-sm text-gray-600 mb-4">Enter your email or phone to view your appointments</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                <button
                  onClick={handleSaveProfile}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Save Profile
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex text-gray-800">
        <Sidebar userType="customer" />
        <main className="flex-1 flex flex-col">
          <Navbar />
          <div className="flex items-center justify-center min-h-screen">
            <div>Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex text-gray-800">
      <Sidebar userType="customer" />
      <main className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">My Appointments</h1>
            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = '/login/admin'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Admin Login
              </button>
              <button
                onClick={() => window.location.href = '/login/stylist'}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              >
                Stylist Login
              </button>
              <button
                onClick={() => setShowProfile(true)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Upcoming</div>
              <div className="text-2xl font-bold text-blue-600">{stats.upcoming.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Total Appointments</div>
              <div className="text-2xl font-bold">{stats.total_appointments}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Total Spent</div>
              <div className="text-2xl font-bold text-green-600">{currency(stats.total_spent)}</div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-lg mb-4">Upcoming Appointments</h2>
            <div className="space-y-3">
              {stats.upcoming.map(appt => (
                <div key={appt.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{appt.service?.name}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {new Date(appt.start_datetime).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        with {appt.stylist?.name}
                      </div>
                      <div className="text-sm font-medium text-green-600 mt-2">
                        {currency(appt.service?.price_cents || 0)}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {appt.status === 'booked' && (
                        <>
                          <button
                            onClick={() => window.location.href = `/book?reschedule=${appt.id}`}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancel(appt.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      <span className={`px-2 py-1 rounded text-xs self-center ${
                        appt.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                        appt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {stats.upcoming.length === 0 && (
                <div className="text-center py-8 text-gray-500">No upcoming appointments</div>
              )}
            </div>
          </div>

          {/* Appointment History */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-lg mb-4">Appointment History</h2>
            <div className="space-y-2">
              {stats.history.map(appt => (
                <div key={appt.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{appt.service?.name}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(appt.start_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500">with {appt.stylist?.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{currency(appt.service?.price_cents || 0)}</div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        appt.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {appt.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {stats.history.length === 0 && (
                <div className="text-center py-8 text-gray-500">No appointment history</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CustomerDashboard

