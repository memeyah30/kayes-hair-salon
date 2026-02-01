import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { QRCodeSVG } from 'qrcode.react'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const CustomerDashboard = () => {
  const navigate = useNavigate()
  const [customerEmail, setCustomerEmail] = useState(localStorage.getItem('customer_email') || '')
  const [customerPhone, setCustomerPhone] = useState(localStorage.getItem('customer_phone') || '')
  const [showProfile, setShowProfile] = useState(!customerEmail && !customerPhone)
  const [appointments, setAppointments] = useState({ upcoming: [], history: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Load appointments if email/phone is available
    if (customerEmail || customerPhone) {
      loadAppointments()
    }
  }, [customerEmail, customerPhone])

  const loadAppointments = async () => {
    if (!customerEmail && !customerPhone) {
      setAppointments({ upcoming: [], history: [] })
      return
    }
    try {
      setLoading(true)
      const res = await api.get('/dashboard/customer/stats', {
        params: { email: customerEmail, phone: customerPhone }
      })
      setAppointments({
        upcoming: res.data.upcoming || [],
        history: res.data.history || []
      })
    } catch (e) {
      console.error('Failed to load appointments:', e)
      toast.error('Failed to load appointments')
      setAppointments({ upcoming: [], history: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = () => {
    if (!customerEmail && !customerPhone) {
      toast.warn('Please enter at least email or phone')
      return
    }
    localStorage.setItem('customer_email', customerEmail)
    localStorage.setItem('customer_phone', customerPhone)
    setShowProfile(false)
    loadAppointments()
    toast.success('Profile saved! Loading your appointments...')
  }

  const handleCancel = async (id) => {
    try {
      await api.post(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      loadAppointments()
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
              <p className="text-sm text-gray-600 mb-4">
                Enter the email or phone number you used when booking to view your appointments.
                If you just booked, your information is already saved and appointments will appear automatically.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="your@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="09171234567"
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
            <div>Loading your appointments...</div>
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
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800 text-sm"
              >
                ← Back to Home
              </button>
              <button
                onClick={() => navigate('/book')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                📅 Book New
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Upcoming Appointments</div>
              <div className="text-2xl font-bold text-blue-600">{appointments.upcoming.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm">Total Appointments</div>
              <div className="text-2xl font-bold">{appointments.upcoming.length}</div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          {appointments.upcoming.length > 0 ? (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="font-semibold text-lg mb-4">Upcoming Appointments</h2>
              <div className="space-y-3">
                {appointments.upcoming
                  .filter(appt => {
                    const appointmentDate = new Date(appt.start_datetime)
                    const now = new Date()
                    return appointmentDate > now
                  })
                  .map(appt => {
                  const appointmentDate = new Date(appt.start_datetime)
                  
                  // Get all services for this appointment
                  const appointmentServices = appt.services && appt.services.length > 0 
                    ? appt.services 
                    : (appt.service ? [appt.service] : [])
                  const totalPrice = appointmentServices.reduce((sum, s) => sum + (s.price_cents || 0), 0)
                  
                  return (
                    <div key={appt.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">
                            {appointmentServices.length > 1 ? (
                              <span>{appointmentServices.length} Services</span>
                            ) : (
                              <span>{appointmentServices[0]?.name || 'Service'}</span>
                            )}
                          </div>
                          {appointmentServices.length > 1 && (
                            <div className="text-sm text-gray-600 mt-1">
                              <ul className="list-disc list-inside ml-2 space-y-0.5">
                                {appointmentServices.map((s, idx) => (
                                  <li key={idx}>{s.name} - {currency(s.price_cents || 0)}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-sm text-gray-600 mt-1">
                            {appointmentDate.toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })} at {appointmentDate.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            with {appt.stylist?.name}
                          </div>
                          <div className="text-sm font-medium text-green-600 mt-2">
                            {appointmentServices.length > 1 ? (
                              <span>Total: {currency(totalPrice)}</span>
                            ) : (
                              <span>{currency(totalPrice)}</span>
                            )}
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
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">No Appointments Yet</h3>
              <p className="text-gray-600 mb-4">Book your first appointment to get started!</p>
              <button
                onClick={() => navigate('/book')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Book Appointment Now
              </button>
            </div>
          )}

          {/* Share Booking Link */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="font-semibold text-lg mb-4">Share & Book</h2>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex flex-col items-center">
                <QRCodeSVG 
                  value={`${window.location.origin}/book`}
                  size={150}
                  bgColor="#ffffff"
                  fgColor="#1e40af"
                  level="M"
                  includeMargin={true}
                />
                <p className="text-sm text-gray-600 mt-2">Scan to book an appointment</p>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Share this booking link with friends & family:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/book`}
                      className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/book`)
                        toast.success('Booking link copied!')
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/book')}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  📅 Book New Appointment
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/book')}
                  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  📅 Book New Appointment
                </button>
                <button
                  onClick={() => navigate('/services')}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  💅 View Services
                </button>
                <button
                  onClick={() => navigate('/stylists')}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  💇 View Stylists
                </button>
              </div>
            </div>

            {/* Share Booking Link */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-lg mb-4">Share & Book</h3>
              <div className="flex flex-col items-center gap-4">
                <QRCodeSVG 
                  value={`${window.location.origin}/book`}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#1e40af"
                  level="M"
                  includeMargin={true}
                />
                <p className="text-sm text-gray-600 text-center">Scan to book an appointment</p>
                <div className="w-full">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/book`}
                      className="flex-1 border rounded px-3 py-2 text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/book`)
                        toast.success('Booking link copied!')
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl mb-2">✂️</div>
              <h4 className="font-semibold">Professional Stylists</h4>
              <p className="text-sm text-gray-500">Expert care for your beauty needs</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl mb-2">📅</div>
              <h4 className="font-semibold">Easy Booking</h4>
              <p className="text-sm text-gray-500">Book appointments in seconds</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-3xl mb-2">💖</div>
              <h4 className="font-semibold">Quality Service</h4>
              <p className="text-sm text-gray-500">Premium beauty experience</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CustomerDashboard

