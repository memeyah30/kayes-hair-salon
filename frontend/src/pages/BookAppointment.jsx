import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

const Calendar = ({ month, year, selectedDate, onSelect }) => {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const startDay = start.getDay()
  const days = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= end.getDate(); d++) days.push(new Date(year, month, d))

  const label = start.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{label}</h3>
      </div>
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />
          const iso = day.toISOString().slice(0,10)
          const isSelected = selectedDate === iso
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className={`h-10 rounded flex items-center justify-center border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-300'}`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SlotList = ({ slots, selected, onSelect }) => (
  <div className="bg-white rounded-xl shadow p-4 h-full">
    <div className="font-semibold mb-3">Available time slots</div>
    {slots.length === 0 && <div className="text-sm text-gray-500">No slots. Pick another date/stylist/service.</div>}
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {slots.map((slot, idx) => {
        const label = new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const selectedKey = selected?.start
        return (
          <button
            key={idx}
            onClick={() => onSelect(slot)}
            className={`border rounded px-3 py-2 text-sm ${selectedKey === slot.start ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-300'}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  </div>
)

const ReceiptModal = ({ appointment, onClose }) => {
  const currency = cents => `₱${(cents / 100).toFixed(2)}`
  
  // Format duration in hours and minutes
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0 && mins > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    } else {
      return `${mins} minute${mins > 1 ? 's' : ''}`
    }
  }
  
  if (!appointment || !appointment.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6">
          <p>Loading receipt data...</p>
        </div>
      </div>
    )
  }
  
  // Check if required data exists
  if (!appointment.service || !appointment.stylist) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md">
          <h3 className="font-bold text-lg mb-2">Receipt Data Incomplete</h3>
          <p className="text-gray-600 mb-4">Some appointment details are missing. Your booking was successful, but we couldn't load the full receipt.</p>
          <button onClick={onClose} className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    )
  }
  
  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - ${appointment.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
              .section { margin: 15px 0; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    } else {
      window.print()
    }
  }

  const handleDownload = () => {
    const receiptContent = `
THOLITS SALON - APPOINTMENT RECEIPT
====================================
Receipt #: ${'APT-' + String(appointment.id).padStart(6, '0')}
Date: ${new Date(appointment.created_at).toLocaleString()}

CUSTOMER INFORMATION:
--------------------
Name: ${appointment.customer_name}
Email: ${appointment.customer_email || 'N/A'}
Phone: ${appointment.customer_phone || 'N/A'}

APPOINTMENT DETAILS:
--------------------
Service: ${appointment.service?.name}
Stylist: ${appointment.stylist?.name}
Date: ${new Date(appointment.start_datetime).toLocaleDateString()}
Time: ${new Date(appointment.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Duration: ${formatDuration(appointment.service?.duration_minutes)}

PRICING:
--------
Service Price: ${currency(appointment.service?.price_cents || 0)}
Status: ${appointment.status.toUpperCase()}

====================================
Thank you for choosing Tholits Salon!
    `.trim()

    const blob = new Blob([receiptContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `receipt-${appointment.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Appointment Receipt</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>
          
          <div className="border-2 border-gray-300 p-6 space-y-4" id="receipt-content">
            <div className="text-center border-b pb-4">
              <h1 className="text-3xl font-bold">THOLITS SALON</h1>
              <p className="text-gray-600">Appointment Receipt</p>
            </div>
            
            <div>
              <div className="text-sm text-gray-500">Receipt #</div>
              <div className="font-bold text-lg">{'APT-' + String(appointment.id).padStart(6, '0')}</div>
              <div className="text-sm text-gray-500 mt-1">Booking Date: {new Date(appointment.created_at).toLocaleString()}</div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Name:</span> {appointment.customer_name}</div>
                <div><span className="font-medium">Email:</span> {appointment.customer_email || 'N/A'}</div>
                <div><span className="font-medium">Phone:</span> {appointment.customer_phone || 'N/A'}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Appointment Details</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Service:</span> {appointment.service?.name}</div>
                <div><span className="font-medium">Stylist:</span> {appointment.stylist?.name}</div>
                <div><span className="font-medium">Date:</span> {new Date(appointment.start_datetime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><span className="font-medium">Time:</span> {new Date(appointment.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(appointment.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div><span className="font-medium">Duration:</span> {formatDuration(appointment.service?.duration_minutes)}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Pricing</h3>
              <div className="flex justify-between items-center">
                <span>Service Price:</span>
                <span className="font-bold text-lg text-green-600">{currency(appointment.service?.price_cents || 0)}</span>
              </div>
              <div className="mt-2">
                <span className={`px-3 py-1 rounded text-sm ${
                  appointment.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  Status: {appointment.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 text-center text-sm text-gray-600">
              Thank you for choosing Tholits Salon!
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Print Receipt
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Download Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const BookAppointment = () => {
  const [step, setStep] = useState(1) // 1: Customer Info, 2: Booking Details
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([])
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0,10))
  const [selectedStylist, setSelectedStylist] = useState('')
  const [selectedService, setSelectedService] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [booking, setBooking] = useState({ 
    name: '', 
    email: '', 
    phone: '',
    address: ''
  })
  const [rescheduling, setRescheduling] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    refreshData()
    const params = new URLSearchParams(window.location.search)
    const appointmentId = params.get('reschedule') || params.get('appointment')
    if (appointmentId) {
      loadAppointmentForReschedule(appointmentId)
    }
  }, [])

  useEffect(() => {
    if (step === 2 && (selectedStylist || stylists[0])) {
      fetchAvailability()
    }
  }, [selectedDate, selectedStylist, selectedService, stylists.length, step])

  const refreshData = async () => {
    try {
      const [sRes, svcRes] = await Promise.all([
        api.get('/stylists'),
        api.get('/services'),
      ])
      setStylists(sRes.data.filter(s => s.active))
      setSelectedStylist(sRes.data[0]?.id || '')
      // Show ALL services from all stylists
      setServices(svcRes.data)
      setSelectedService(svcRes.data[0]?.id || '')
    } catch (e) {
      console.error('API Error:', e)
      toast.error(`Failed to load data: ${e.message || 'Check console for details'}`)
    }
  }

  const loadAppointmentForReschedule = async (id) => {
    try {
      const res = await api.get(`/appointments/${id}`)
      const appt = res.data
      setRescheduling(appt)
      setSelectedDate(appt.start_datetime.slice(0,10))
      setSelectedStylist(appt.stylist_id)
      setSelectedService(appt.service_id)
      setBooking({
        name: appt.customer_name,
        email: appt.customer_email || '',
        phone: appt.customer_phone || '',
        address: '',
      })
      setStep(2)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load appointment')
    }
  }

  const fetchAvailability = async () => {
    try {
      const stylistId = selectedStylist || stylists[0]?.id
      if (!stylistId) return
      const res = await api.get(`/stylists/${stylistId}/availability`, {
        params: { date: selectedDate, service_id: selectedService },
      })
      setAvailability(res.data || [])
    } catch (e) {
      console.error(e)
      setAvailability([])
    }
  }

  const handleNextStep = () => {
    if (!booking.name.trim()) {
      toast.warn('Please enter your name')
      return
    }
    if (!booking.email.trim() && !booking.phone.trim()) {
      toast.warn('Please enter at least email or phone number')
      return
    }
    setStep(2)
  }

  const handleBook = async () => {
    if (!selectedSlot) {
      toast.warn('Please select a time slot')
      return
    }
    if (!selectedService) {
      toast.warn('Please select a service')
      return
    }
    if (!selectedStylist) {
      toast.warn('Please select a stylist')
      return
    }
    
    try {
      const res = await api.post('/appointments', {
        customer_name: booking.name,
        customer_email: booking.email || null,
        customer_phone: booking.phone || null,
        service_id: selectedService,
        stylist_id: selectedStylist,
        date: selectedDate,
        preferred_time: new Date(selectedSlot.start).toISOString().slice(11,16),
      })
      
      toast.success('Appointment booked successfully!')
      
      // The response should already have stylist and service loaded
      // But let's fetch it again to be sure
      try {
        const receiptRes = await api.get(`/appointments/${res.data.id}`)
        if (receiptRes.data && receiptRes.data.service && receiptRes.data.stylist) {
          setReceipt(receiptRes.data)
        } else {
          // If relationships not loaded, use response data
          setReceipt(res.data)
        }
      } catch (e) {
        console.error('Failed to fetch receipt:', e)
        // Use response data as fallback
        setReceipt(res.data)
      }
      
      // Save customer info to localStorage
      if (booking.email) localStorage.setItem('customer_email', booking.email)
      if (booking.phone) localStorage.setItem('customer_phone', booking.phone)
      
    } catch (e) {
      toast.error(e.response?.data?.message || 'Booking failed. Please try again.')
      console.error('Booking error:', e)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduling || !selectedSlot) {
      toast.warn('Please select a time slot')
      return
    }
    try {
      await api.patch(`/appointments/${rescheduling.id}`, {
        date: selectedDate,
        preferred_time: new Date(selectedSlot.start).toISOString().slice(11,16),
      })
      toast.success('Appointment rescheduled successfully!')
      navigate('/customer')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reschedule failed')
    }
  }

  const currency = cents => `₱${(cents / 100).toFixed(2)}`
  const selectedServiceData = services.find(s => s.id === parseInt(selectedService))
  const selectedStylistData = stylists.find(s => s.id === parseInt(selectedStylist))

  const now = new Date()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Book Appointment</h1>
      
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
        </div>
      </div>

      {/* Step 1: Customer Information */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold mb-4">Customer Information</h2>
          <p className="text-gray-600 mb-6">Please provide your information to proceed with booking</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                placeholder="Enter your full name"
                value={booking.name}
                onChange={e => setBooking({ ...booking, name: e.target.value })}
              />
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  className="w-full border rounded px-3 py-2"
                  placeholder="your@email.com"
                  value={booking.email}
                  onChange={e => setBooking({ ...booking, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full border rounded px-3 py-2"
                  placeholder="+63 9XX XXX XXXX"
                  value={booking.phone}
                  onChange={e => setBooking({ ...booking, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Address (Optional)</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Your address"
                value={booking.address}
                onChange={e => setBooking({ ...booking, address: e.target.value })}
              />
            </div>
            
            <div className="text-xs text-gray-500">
              * At least email or phone number is required
            </div>
            
            <button
              onClick={handleNextStep}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mt-4"
            >
              Continue to Booking
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Booking Details */}
      {step === 2 && (
        <>
          <div className="bg-white rounded-xl shadow p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600 font-medium">Stylist *</label>
                <select
                  className="w-full mt-1 border rounded px-3 py-2"
                  value={selectedStylist}
                  onChange={e => setSelectedStylist(e.target.value)}
                >
                  <option value="">Select Stylist</option>
                  {stylists.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">Service *</label>
                <select
                  className="w-full mt-1 border rounded px-3 py-2"
                  value={selectedService}
                  onChange={e => setSelectedService(e.target.value)}
                >
                  <option value="">Select Service</option>
                  {services.map(s => {
                    const formatDuration = (minutes) => {
                      if (!minutes) return 'N/A'
                      const hours = Math.floor(minutes / 60)
                      const mins = minutes % 60
                      if (hours > 0 && mins > 0) {
                        return `${hours}h ${mins}m`
                      } else if (hours > 0) {
                        return `${hours}h`
                      } else {
                        return `${mins}m`
                      }
                    }
                    return (
                      <option key={s.id} value={s.id}>
                        {s.name} - {currency(s.price_cents)} ({formatDuration(s.duration_minutes)})
                      </option>
                    )
                  })}
                </select>
                {selectedServiceData && (() => {
                  const formatDuration = (minutes) => {
                    if (!minutes) return 'N/A'
                    const hours = Math.floor(minutes / 60)
                    const mins = minutes % 60
                    if (hours > 0 && mins > 0) {
                      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`
                    } else if (hours > 0) {
                      return `${hours} hour${hours > 1 ? 's' : ''}`
                    } else {
                      return `${mins} minute${mins > 1 ? 's' : ''}`
                    }
                  }
                  return (
                    <div className="text-xs text-gray-500 mt-1">
                      Price: {currency(selectedServiceData.price_cents)} | Duration: {formatDuration(selectedServiceData.duration_minutes)}
                    </div>
                  )
                })()}
              </div>
              <div>
                <label className="text-sm text-gray-600 font-medium">Customer</label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{booking.name}</div>
                  {booking.email && <div className="text-xs text-gray-600">{booking.email}</div>}
                  {booking.phone && <div className="text-xs text-gray-600">{booking.phone}</div>}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Edit Information
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Calendar
              month={now.getMonth()}
              year={now.getFullYear()}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
            <SlotList slots={availability} selected={selectedSlot} onSelect={setSelectedSlot} />
          </div>

          {selectedServiceData && selectedStylistData && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Booking Summary</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Service:</span> {selectedServiceData.name}</div>
                <div><span className="font-medium">Stylist:</span> {selectedStylistData.name}</div>
                <div><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                {selectedSlot && (
                  <div><span className="font-medium">Time:</span> {new Date(selectedSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                )}
                <div className="pt-2 border-t mt-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg text-green-600">{currency(selectedServiceData.price_cents)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back
            </button>
            {rescheduling ? (
              <button
                onClick={handleReschedule}
                disabled={!selectedSlot}
                className="bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 disabled:opacity-50"
              >
                Confirm Reschedule
              </button>
            ) : (
              <button
                onClick={handleBook}
                disabled={!selectedSlot || !selectedService || !selectedStylist}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm Booking
              </button>
            )}
          </div>
        </>
      )}

      {receipt && receipt.id && (
        <ReceiptModal 
          appointment={receipt} 
          onClose={() => {
            setReceipt(null)
            setStep(1)
            setSelectedSlot(null)
            setBooking({ name: '', email: '', phone: '', address: '' })
            navigate('/customer')
          }} 
        />
      )}
    </div>
  )
}

export default BookAppointment
