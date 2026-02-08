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
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [reschedulingAppointment, setReschedulingAppointment] = useState(null)
  const [rescheduleData, setRescheduleData] = useState({
    date: '',
    preferred_time: '',
    reschedule_reason: '',
  })
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [searchServiceId, setSearchServiceId] = useState('')
  const navigate = useNavigate()
  const storedUserType = localStorage.getItem('userType') || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

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
        toast.success('Appointment marked as completed and sales recorded')
      } else if (action === 'confirm') {
        await api.post(`/appointments/${id}/confirm`)
        toast.success('Appointment confirmed')
      } else if (action === 'delete') {
        await api.delete(`/appointments/${id}`)
        toast.success('Appointment deleted successfully')
      }
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update appointment')
    }
  }

  const handlePaymentStatus = async (id, status) => {
    try {
      await api.patch(`/appointments/${id}`, { payment_status: status })
      toast.success(`Payment marked as ${status.toUpperCase()}`)
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update payment status')
    }
  }

  const handleRescheduleClick = (appointment) => {
    setReschedulingAppointment(appointment)
    const appointmentDate = new Date(getStart(appointment))
    setRescheduleData({
      date: appointmentDate.toISOString().split('T')[0],
      preferred_time: appointmentDate.toTimeString().slice(0, 5),
      reschedule_reason: '',
    })
    setShowRescheduleModal(true)
  }

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault()
    if (!reschedulingAppointment) return

    try {
      await api.post(`/appointments/${reschedulingAppointment.id}/reschedule`, rescheduleData)
      toast.success('Appointment rescheduled successfully')
      setShowRescheduleModal(false)
      setReschedulingAppointment(null)
      setRescheduleData({
        date: '',
        preferred_time: '',
        reschedule_reason: '',
      })
      loadData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to reschedule appointment')
    }
  }

  const handleDelete = async (apt) => {
    const confirmMessage = `Are you sure you want to permanently delete this appointment?\n\n` +
      `Customer: ${apt.customer_name}\n` +
      `Service: ${apt.service?.name}\n` +
      `Date: ${new Date(getStart(apt)).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT\n\n` +
      `This action cannot be undone.`
    
    if (window.confirm(confirmMessage)) {
      await handleAction(apt.id, 'delete')
    }
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAppointments = appointments.filter(apt => {
    if (filter !== 'all') {
      if (filter === 'confirmed' && apt.status !== 'confirmed') return false
      if (filter !== 'confirmed' && apt.status !== filter) return false
    }

    const appointmentServices = getAppointmentServices(apt)

    if (searchServiceId) {
      const serviceIdNum = parseInt(searchServiceId, 10)
      if (!appointmentServices.some(s => s.id === serviceIdNum)) return false
    }

    if (searchDate) {
      const aptDate = toManilaDate(getStart(apt))
      if (aptDate !== searchDate) return false
    }

    if (normalizedSearch) {
      const customerName = (apt.customer_name || '').toLowerCase()
      const customerPhone = (apt.customer_phone || '').toLowerCase()
      const serviceNames = appointmentServices.map(s => s.name || '').join(' ').toLowerCase()
      if (
        !customerName.includes(normalizedSearch) &&
        !customerPhone.includes(normalizedSearch) &&
        !serviceNames.includes(normalizedSearch)
      ) return false
    }

    return true
  })

  const currency = cents => `₱${(cents / 100).toFixed(2)}`

  const paymentStatusLabel = (status) => {
    if (!status) return 'UNPAID'
    const map = {
      unpaid: 'UNPAID',
      pending: 'PENDING',
      paid: 'PAID',
      rejected: 'REJECTED',
      downpayment: 'DOWNPAYMENT',
      refunded: 'REFUNDED',
    }
    return map[status] || status.toUpperCase()
  }
  const paymentStatusClass = (status) => {
    const s = status || 'unpaid'
    if (s === 'paid') return 'bg-green-100 text-green-800'
    if (s === 'pending' || s === 'downpayment') return 'bg-yellow-100 text-yellow-800'
    if (s === 'rejected' || s === 'refunded') return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }
  const paymentMethodLabel = (method) => {
    if (method === 'online') return 'GCash (Manual)'
    if (method === 'on_hand') return 'Cash'
    return method || 'Cash'
  }
  const resolveProofUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `/${url.replace(/^\/+/, '')}`
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate(loginPath)
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row text-gray-800">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              aria-label="Return to Dashboard"
              title="Return to Dashboard"
            >
              &larr;
            </button>
            <h1 className="text-2xl font-bold">Appointment Management</h1>
          </div>
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full lg:w-auto border rounded px-3 py-2"
          >
            <option value="all">All Appointments</option>
            <option value="booked">Booked</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            type="text"
            placeholder="Search name or service"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full lg:w-56 border rounded px-3 py-2"
          />
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="w-full lg:w-auto border rounded px-3 py-2"
          />
          <select
            value={searchServiceId}
            onChange={(e) => setSearchServiceId(e.target.value)}
            className="w-full lg:w-56 border rounded px-3 py-2"
          >
            <option value="">All Services</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchTerm('')
              setSearchDate('')
              setSearchServiceId('')
            }}
            className="w-full lg:w-auto border rounded px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={() => navigate('/book')}
            className="w-full lg:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + Create Appointment
          </button>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stylist</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAppointments.map(apt => {
                // Get all services for this appointment
                const appointmentServices = getAppointmentServices(apt)
                const totalPrice = appointmentServices.reduce((sum, s) => sum + (s.price_cents || 0), 0)
                const proofUrl = resolveProofUrl(apt.payment_proof_url)
                
                return (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{apt.customer_name}</div>
                    <div className="text-xs text-gray-500">
                      {apt.customer_email || apt.customer_phone}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {appointmentServices.length > 1 ? (
                      <div>
                        <div className="font-medium">{appointmentServices.length} Services</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {appointmentServices.map((s, idx) => (
                            <div key={idx}>• {s.name}</div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span>{appointmentServices[0]?.name || 'N/A'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{apt.stylist?.name}</td>
                  <td className="px-4 py-3">
                    {new Date(getStart(apt)).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Manila'
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      apt.status === 'confirmed' ? 'bg-green-100 text-green-800 font-semibold' :
                      apt.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                      apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {apt.status === 'confirmed' ? '✓ Confirmed' : apt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={`px-2 py-1 rounded text-xs ${paymentStatusClass(apt.payment_status)}`}>
                        {paymentStatusLabel(apt.payment_status)}
                      </span>
                      <div className="text-xs text-gray-500">{paymentMethodLabel(apt.payment_method)}</div>
                      {proofUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(proofUrl, '_blank')}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          title="View payment proof"
                        >
                          View Proof
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {appointmentServices.length > 1 ? (
                      <div>
                        <div className="font-semibold text-green-600">{currency(totalPrice)}</div>
                        <div className="text-xs text-gray-500">Total</div>
                      </div>
                    ) : (
                      <span>{currency(totalPrice)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 flex-wrap">
                      {(apt.status === 'booked' || apt.status === 'confirmed') && (
                        <>
                          {apt.status === 'booked' && (
                            <button
                              onClick={() => handleAction(apt.id, 'confirm')}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              title="Confirm appointment"
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            onClick={() => handleRescheduleClick(apt)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            title="Reschedule appointment"
                          >
                            Reschedule
                          </button>
                          {apt.payment_method === 'online' && apt.payment_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handlePaymentStatus(apt.id, 'paid')}
                                className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                                title="Mark payment as paid"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handlePaymentStatus(apt.id, 'rejected')}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Reject payment proof"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleAction(apt.id, 'cancel')}
                            className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                            title="Cancel appointment"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAction(apt.id, 'complete')}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                            title="Mark as completed and record sales"
                          >
                            Complete
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(apt)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="Permanently delete appointment"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
          {filteredAppointments.length === 0 && (
            <div className="text-center py-8 text-gray-500">No appointments found</div>
          )}
        </div>
        </div>
        </div>

        {/* Reschedule Modal */}
        {showRescheduleModal && reschedulingAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Reschedule Appointment</h2>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  <strong>Customer:</strong> {reschedulingAppointment.customer_name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Current Date:</strong> {new Date(getStart(reschedulingAppointment)).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT
                </p>
              </div>
              <form onSubmit={handleRescheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">New Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={rescheduleData.date}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Time *</label>
                  <input
                    type="time"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={rescheduleData.preferred_time}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, preferred_time: e.target.value })}
                    min="08:00"
                    max="19:59"
                  />
                  <p className="text-xs text-gray-500 mt-1">Business hours: 8:00 AM - 8:00 PM</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={rescheduleData.reschedule_reason}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, reschedule_reason: e.target.value })}
                    placeholder="Reason for rescheduling..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRescheduleModal(false)
                      setReschedulingAppointment(null)
                      setRescheduleData({
                        date: '',
                        preferred_time: '',
                        reschedule_reason: '',
                      })
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminAppointments


