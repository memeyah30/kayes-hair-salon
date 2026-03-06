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
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/appointments')
      console.log('Loaded appointments:', res.data)
      setAppointments(res.data || [])
    } catch (e) {
      console.error('Error loading appointments:', e)
      toast.error('Failed to load data: ' + (e.response?.data?.message || e.message))
      setAppointments([])
    } finally {
      setLoading(false)
    }
  }

  // Group appointments by customer (use email+phone combination for unique identification)
  const customers = appointments.reduce((acc, apt) => {
    if (!apt || !apt.customer_name) return acc // Skip invalid appointments
    
    // Create unique key from email and phone combination
    // Use a more reliable key that handles null/undefined values
    const emailKey = apt.customer_email || 'no-email'
    const phoneKey = apt.customer_phone || 'no-phone'
    const key = `${emailKey}_${phoneKey}_${apt.customer_name}`
    
    if (!acc[key]) {
      acc[key] = {
        name: apt.customer_name,
        email: apt.customer_email || null,
        phone: apt.customer_phone || null,
        appointments: [],
        totalSpent: 0,
        totalAppointments: 0,
      }
    }
    acc[key].appointments.push(apt)
    acc[key].totalAppointments++
    if (apt.status === 'completed' && apt.service?.price_cents) {
      acc[key].totalSpent += apt.service.price_cents
    }
    return acc
  }, {})

  // Filter customers based on search term
  let customerList = Object.values(customers)
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    customerList = customerList.filter(customer => 
      customer.name.toLowerCase().includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term)) ||
      (customer.phone && customer.phone.includes(term))
    )
  }

  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`

  const getStart = (appointment) => appointment.start_datetime_pht || appointment.start_datetime
  const getEnd = (appointment) => appointment.end_datetime_pht || appointment.end_datetime

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear(); sessionStorage.clear()
      navigate(loginPath)
    })
  }

  return (
    <div className="min-h-screen app-admin-bg flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-bold"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <div>
                <h1 className="text-2xl font-bold">Customer Management</h1>
                <p className="text-sm text-[#8f7a6f] mt-1">
                  View all customers who have made appointments, their contact information, appointment history, and spending statistics.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-8 text-center">
              <div className="text-lg text-[#8f7a6f]">Loading customer data...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
          <div className="p-4 border-b">
            <h2 className="font-semibold mb-3">All Customers ({customerList.length})</h2>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full border rounded px-3 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="divide-y max-h-96 overflow-y-auto">
            {customerList.length === 0 ? (
              <div className="p-8 text-center">
                {appointments.length === 0 ? (
                  <div className="space-y-3">
                    <div className="text-base font-semibold mb-2">No customer records</div>
                    <div className="text-[#8f7a6f] font-medium">No customers yet</div>
                    <div className="text-sm text-gray-400">
                      Customers will appear here automatically after they make their first appointment booking.
                    </div>
                    <div className="text-xs text-gray-400 mt-4">
                      Total Appointments: {appointments.length}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    No customers match your search. Try a different search term.
                  </div>
                )}
              </div>
            ) : (
              customerList.map((customer, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedCustomer?.name === customer.name && 
                    selectedCustomer?.email === customer.email && 
                    selectedCustomer?.phone === customer.phone ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{customer.name}</div>
                      <div className="text-sm text-[#8f7a6f] mt-1 space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-1">
                            <span>Email:</span>
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-1">
                            <span>Phone:</span>
                            <span>{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-semibold text-blue-600">{customer.totalAppointments}</div>
                      <div className="text-xs text-[#9b857a]">appointments</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-[#9b857a]">
                      Total Spent: <span className="font-semibold text-green-600">{currency(customer.totalSpent)}</span>
                    </span>
                    <span className="text-gray-400">|</span>
                    <span className="text-[#9b857a]">
                      Completed: {customer.appointments.filter(a => a.status === 'completed').length}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedCustomer ? (
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Customer Information</h2>
            </div>
            <div className="p-4 space-y-4">
              {/* Customer Details Section */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-lg mb-3">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-[#9b857a] mb-1">Full Name</div>
                    <div className="font-medium text-lg">{selectedCustomer.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-[#9b857a] mb-1">Contact Information</div>
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">Email:</span>
                        <span>{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Phone:</span>
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {!selectedCustomer.email && !selectedCustomer.phone && (
                      <div className="text-sm text-gray-400 italic">No contact information</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-[#8f7a6f] mb-1">Total Appointments</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedCustomer.totalAppointments}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-[#8f7a6f] mb-1">Total Spent</div>
                  <div className="text-2xl font-bold text-green-600">{currency(selectedCustomer.totalSpent)}</div>
                </div>
              </div>

              {/* Appointment Status Summary */}
              <div>
                <h3 className="font-semibold mb-2">Appointment Status Summary</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">
                      {selectedCustomer.appointments.filter(a => a.status === 'booked').length}
                    </div>
                    <div className="text-xs text-[#8f7a6f]">Booked</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-lg font-bold text-green-600">
                      {selectedCustomer.appointments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-xs text-[#8f7a6f]">Completed</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-600">
                      {selectedCustomer.appointments.filter(a => a.status === 'cancelled').length}
                    </div>
                    <div className="text-xs text-[#8f7a6f]">Cancelled</div>
                  </div>
                </div>
              </div>

              {/* Complete Appointment History */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Complete Appointment History</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedCustomer.appointments
                    .sort((a, b) => new Date(getStart(b)) - new Date(getStart(a)))
                    .map(apt => {
                      // Get all services for this appointment
                      const appointmentServices = apt.services && apt.services.length > 0 
                        ? apt.services 
                        : (apt.service ? [apt.service] : [])
                      const totalPrice = appointmentServices.reduce((sum, s) => sum + (s.price_cents || 0), 0)
                      
                      return (
                      <div key={apt.id} className="border rounded-lg p-3 hover:bg-gray-50 transition">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {appointmentServices.length > 1 ? (
                              <div>
                                <div className="font-semibold text-lg mb-1">{appointmentServices.length} Services</div>
                                <ul className="list-disc list-inside ml-2 text-sm text-[#8f7a6f] mb-1">
                                  {appointmentServices.map((s, idx) => (
                                    <li key={idx}>{s.name} - {currency(s.price_cents || 0)}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="font-semibold text-lg mb-1">{appointmentServices[0]?.name || 'Service'}</div>
                            )}
                            <div className="text-sm text-[#8f7a6f] mb-1">
                              Date: {new Date(getStart(apt)).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                timeZone: 'Asia/Manila'
                              })}
                            </div>
                            <div className="text-sm text-[#8f7a6f] mb-1">
                              Time: {new Date(getStart(apt)).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Manila'
                              })} - {new Date(getEnd(apt)).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Manila'
                              })} PHT
                            </div>
                            <div className="text-sm text-[#9b857a] mb-1">
                              Stylist: {apt.stylist?.name}
                            </div>
                            <div className="text-sm font-medium text-green-600">
                              {appointmentServices.length > 1 ? 'Total Price: ' : 'Price: '}{currency(totalPrice)}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              Booking ID: APT-{String(apt.id).padStart(6, '0')}
                            </div>
                          </div>
                          <div className="ml-4">
                            <span className={`px-3 py-1 rounded text-xs font-medium ${
                              apt.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                              apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {apt.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  {selectedCustomer.appointments.length === 0 && (
                    <div className="text-center py-8 text-gray-400">No appointment history</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Customer Information</h2>
            </div>
            <div className="p-8 text-center text-gray-400">
              <div className="text-base font-semibold mb-3">No customer selected</div>
              <div className="text-lg font-medium mb-2">Select a customer</div>
              <div className="text-sm">
                Click on a customer from the list to view their details and appointment history.
              </div>
            </div>
          </div>
        )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminCustomers




