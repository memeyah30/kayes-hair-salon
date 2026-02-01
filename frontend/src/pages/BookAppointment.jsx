import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

// Validation helpers
const validateEmail = (email) => {
  if (!email) return { valid: true, message: '' } // Optional
  if (!email.endsWith('@gmail.com')) {
    return { valid: false, message: 'Email must end with @gmail.com' }
  }
  const emailRegex = /^[^\s@]+@gmail\.com$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid Gmail address' }
  }
  return { valid: true, message: '' }
}

const validatePhone = (phone) => {
  if (!phone) return { valid: true, message: '' } // Optional
  // Philippine phone number format: starts with 09 or +639, followed by 9 digits
  const phoneRegex = /^(\+639|09)\d{9}$/
  const cleanPhone = phone.replace(/[\s-]/g, '')
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, message: 'Phone must be valid PH number (e.g., 09171234567 or +639171234567)' }
  }
  return { valid: true, message: '' }
}

const Calendar = ({ month, year, selectedDate, onSelect, onMonthChange }) => {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const startDay = start.getDay()
  const days = []
  for (let i = 0; i < startDay; i++) days.push(null)
  for (let d = 1; d <= end.getDate(); d++) days.push(new Date(year, month, d))

  const label = start.toLocaleString('default', { month: 'long', year: 'numeric' })
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 1, 1)
    onMonthChange(newDate.getMonth(), newDate.getFullYear())
  }

  const handleNextMonth = () => {
    const newDate = new Date(year, month + 1, 1)
    onMonthChange(newDate.getMonth(), newDate.getFullYear())
  }

  // Check if previous month button should be disabled (can't go before today)
  const todayMonth = today.getMonth()
  const todayYear = today.getFullYear()
  const canGoPrev = year > todayYear || (year === todayYear && month > todayMonth)

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className={`px-3 py-1 rounded ${canGoPrev ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
          title={canGoPrev ? 'Previous month' : 'Cannot go before current month'}
        >
          ←
        </button>
        <h3 className="font-semibold">{label}</h3>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1 rounded hover:bg-gray-100 text-gray-700"
          title="Next month"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 text-xs text-gray-500 mb-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-sm">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />
          // Get date string in YYYY-MM-DD format (local, not UTC)
          const year = day.getFullYear()
          const month = String(day.getMonth() + 1).padStart(2, '0')
          const dayNum = String(day.getDate()).padStart(2, '0')
          const iso = `${year}-${month}-${dayNum}`
          
          const isSelected = selectedDate === iso
          const dayDate = new Date(day)
          dayDate.setHours(0, 0, 0, 0)
          const isPast = dayDate < today
          const isDisabled = isPast
          
          return (
            <button
              key={iso}
              onClick={() => !isDisabled && onSelect(iso)}
              disabled={isDisabled}
              className={`h-10 rounded flex items-center justify-center border ${
                isDisabled 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'hover:border-blue-300'
              }`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SlotList = ({ slots, selected, onSelect, selectedDate }) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const isToday = selectedDate && new Date(selectedDate).getTime() === today.getTime()
  
  // Minimum advance booking time: 30 minutes
  const minAdvanceMinutes = 30
  const minAdvanceTime = new Date(now.getTime() + minAdvanceMinutes * 60000)
  
  // Filter out past slots and slots less than 30 minutes away if booking for today
  const filteredSlots = slots.map(slot => {
    if (!isToday) return slot
    const slotTime = new Date(slot.start)
    // Check if slot is in the past OR less than 30 minutes from now
    const isPast = slotTime < now
    const isTooSoon = slotTime < minAdvanceTime
    const isUnavailable = isPast || isTooSoon
    
    return {
      ...slot,
      available: slot.available !== false && !isUnavailable ? slot.available : false,
      isTooSoon: isTooSoon && !isPast // Track if it's too soon (for tooltip)
    }
  })
  
  const availableSlots = filteredSlots.filter(s => s.available)
  const hasSlots = slots.length > 0
  
  return (
    <div className="bg-white rounded-xl shadow p-4 h-full">
      <div className="font-semibold mb-3">Time slots (8 AM - 8 PM)</div>
      {!hasSlots && <div className="text-sm text-gray-500">Loading slots...</div>}
      {hasSlots && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
            {filteredSlots.map((slot, idx) => {
              // Parse the date string - treat as local time
              const slotDate = new Date(slot.start)
              // Extract hours and minutes from the date
              let hours = slotDate.getHours()
              const minutes = slotDate.getMinutes()
              
              // Format as 12-hour time with AM/PM
              const displayHour = hours % 12 || 12
              const ampm = hours >= 12 ? 'PM' : 'AM'
              const label = `${String(displayHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`
              
              const selectedKey = selected?.start
              const isSelected = selectedKey && new Date(selectedKey).getTime() === slotDate.getTime()
              const isAvailable = slot.available !== false
              const isPast = isToday && slotDate < now
              const isTooSoon = slot.isTooSoon || (isToday && slotDate < minAdvanceTime)
              const isDisabled = !isAvailable || isPast || isTooSoon
              
              // Generate appropriate tooltip message
              let tooltipMessage = 'This time slot is not available'
              if (isTooSoon && !isPast) {
                const minutesUntilSlot = Math.ceil((slotDate.getTime() - now.getTime()) / 60000)
                tooltipMessage = `Appointments must be booked at least 30 minutes in advance. This slot is only ${minutesUntilSlot} minute${minutesUntilSlot !== 1 ? 's' : ''} away.`
              } else if (isPast) {
                tooltipMessage = 'This time slot has already passed'
              } else if (!isAvailable) {
                tooltipMessage = 'This time slot is not available'
              } else {
                tooltipMessage = `Book at ${label}`
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => isAvailable && !isPast && !isTooSoon && onSelect(slot)}
                  disabled={isDisabled}
                  className={`border rounded px-3 py-2 text-sm transition ${
                    isDisabled
                      ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  title={tooltipMessage}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {availableSlots.length === 0 && (
            <div className="text-sm text-red-500 text-center py-2">
              No available slots for this date. Please choose another date or stylist.
            </div>
          )}
          {availableSlots.length > 0 && (
            <div className="text-xs text-gray-500 text-center">
              {availableSlots.length} of {slots.length} slots available
            </div>
          )}
        </>
      )}
    </div>
  )
}

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
  const appointmentServices = appointment.services && appointment.services.length > 0 
    ? appointment.services 
    : (appointment.service ? [appointment.service] : [])
  
  if (appointmentServices.length === 0 || !appointment.stylist) {
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
  
  // Calculate totals
  const totalPrice = appointmentServices.reduce((sum, s) => sum + (s.price_cents || 0), 0)
  const totalDuration = appointmentServices.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  
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
    const servicesList = appointmentServices.map(s => 
      `  - ${s.name}: ${currency(s.price_cents || 0)} (${formatDuration(s.duration_minutes)})`
    ).join('\n')
    
    const receiptContent = `
KAYE'S HAIR SALON AND SPA - APPOINTMENT RECEIPT
====================================
Receipt #: ${'APT-' + String(appointment.id).padStart(6, '0')}
Date: ${new Date(appointment.created_at).toLocaleString()}

CUSTOMER INFORMATION:
--------------------
Name: ${appointment.customer_name}
Phone: ${appointment.customer_phone || 'N/A'}
Address: ${appointment.customer_address || 'N/A'}

APPOINTMENT DETAILS:
--------------------
Service${appointmentServices.length > 1 ? 's' : ''}:
${servicesList}
Stylist: ${appointment.stylist?.name}
Date: ${new Date(appointment.start_datetime).toLocaleDateString()}
Time: ${new Date(appointment.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(appointment.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
Total Duration: ${formatDuration(totalDuration)}

PRICING:
--------
${appointmentServices.length > 1 ? servicesList + '\n' : ''}Total Price: ${currency(totalPrice)}
Status: ${appointment.status.toUpperCase()}

====================================
Thank you for choosing Kaye's Hair Salon and Spa!
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
              <h1 className="text-3xl font-bold">KAYE'S HAIR SALON AND SPA</h1>
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
                <div><span className="font-medium">Phone:</span> {appointment.customer_phone || 'N/A'}</div>
                <div><span className="font-medium">Address:</span> {appointment.customer_address || 'N/A'}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Appointment Details</h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Service{appointmentServices.length > 1 ? 's' : ''}:</span>
                  <ul className="list-disc list-inside ml-2 mt-1">
                    {appointmentServices.map((s, idx) => (
                      <li key={idx}>{s.name} - {currency(s.price_cents || 0)} ({formatDuration(s.duration_minutes)})</li>
                    ))}
                  </ul>
                </div>
                <div><span className="font-medium">Stylist:</span> {appointment.stylist?.name}</div>
                <div><span className="font-medium">Date:</span> {new Date(appointment.start_datetime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                <div><span className="font-medium">Time:</span> {new Date(appointment.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(appointment.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div><span className="font-medium">Total Duration:</span> {formatDuration(totalDuration)}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Pricing</h3>
              {appointmentServices.length > 1 ? (
                <div className="space-y-2">
                  {appointmentServices.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span>{s.name}:</span>
                      <span className="font-medium">{currency(s.price_cents || 0)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg text-green-600">{currency(totalPrice)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>Service Price:</span>
                  <span className="font-bold text-lg text-green-600">{currency(totalPrice)}</span>
                </div>
              )}
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
              Thank you for choosing Kaye's Hair Salon and Spa!
            </div>
          </div>

          {/* QR Code and Shareable Link Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3 text-center">Share Your Booking</h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex flex-col items-center">
                <QRCodeSVG 
                  value={`${window.location.origin}/book`}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#1e40af"
                  level="M"
                  includeMargin={true}
                />
                <p className="text-xs text-gray-500 mt-1">Scan to book an appointment</p>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-gray-600">Share this link to book an appointment:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/book`}
                    className="flex-1 border rounded px-3 py-2 text-sm bg-white"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/book`)
                      toast.success('Link copied to clipboard!')
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Your receipt number: {'APT-' + String(appointment.id).padStart(6, '0')}
                </p>
              </div>
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
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Get local date string (YYYY-MM-DD) without timezone conversion
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  })
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [selectedStylist, setSelectedStylist] = useState('')
  const [selectedService, setSelectedService] = useState('') // Keep for backward compatibility
  const [selectedServices, setSelectedServices] = useState([]) // New: array of selected service IDs
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [booking, setBooking] = useState({ 
    name: '', 
    phone: '',
    address: ''
  })
  const [formErrors, setFormErrors] = useState({ phone: '' })
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
      // Only fetch if we have at least one service selected
      const hasServices = selectedServices.length > 0 || selectedService
      if (hasServices) {
        fetchAvailability()
      } else {
        setAvailability([])
        setSelectedSlot(null)
      }
    }
  }, [selectedDate, selectedStylist, selectedService, selectedServices, stylists.length, step])

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
      // Initialize selectedServices with first service for backward compatibility
      if (svcRes.data[0]?.id) {
        setSelectedServices([svcRes.data[0].id.toString()])
      }
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
        phone: appt.customer_phone || '',
        address: appt.customer_address || '',
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
      if (!stylistId || !selectedService) return
      const res = await api.get(`/stylists/${stylistId}/availability`, {
        params: { date: selectedDate, service_id: selectedService },
      })
      setAvailability(res.data || [])
      // Clear selected slot if it's no longer available
      if (selectedSlot) {
        const slotStillAvailable = res.data?.some(slot => 
          new Date(slot.start).getTime() === new Date(selectedSlot.start).getTime() &&
          slot.available !== false
        )
        if (!slotStillAvailable) {
          setSelectedSlot(null)
          toast.warn('The selected time slot is no longer available. Please choose another time.')
        }
      }
    } catch (e) {
      console.error(e)
      setAvailability([])
      setSelectedSlot(null)
    }
  }

  const handleNextStep = () => {
    if (!booking.name.trim()) {
      toast.warn('Please enter your name')
      return
    }
    if (!booking.phone.trim()) {
      toast.warn('Please enter your contact number')
      return
    }
    
    // Validate phone
    const phoneValidation = validatePhone(booking.phone)
    
    setFormErrors({
      phone: phoneValidation.message
    })
    
    if (!phoneValidation.valid) {
      toast.error('Please enter a valid phone number')
      return
    }
    
    setStep(2)
  }

  const handleBook = async () => {
    if (!selectedSlot) {
      toast.warn('Please select a time slot')
      return
    }
    
    // Use selectedServices if available, otherwise fall back to selectedService
    const serviceIds = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
    if (serviceIds.length === 0) {
      toast.warn('Please select at least one service')
      return
    }
    if (!selectedStylist) {
      toast.warn('Please select a stylist')
      return
    }
    
    // Double-check slot is still available before booking
    if (!selectedSlot) {
      toast.error('Please select a valid time slot')
      return
    }
    
    try {
      // Extract time from slot start (HH:MM format) - use local time, not UTC
      const slotDate = new Date(selectedSlot.start)
      // Get local hours and minutes to avoid timezone conversion issues
      const hours = String(slotDate.getHours()).padStart(2, '0')
      const minutes = String(slotDate.getMinutes()).padStart(2, '0')
      const preferredTime = `${hours}:${minutes}`
      
      // Ensure date is in YYYY-MM-DD format (local date, not UTC)
      let bookingDate
      if (selectedDate instanceof Date) {
        // Get local date string (YYYY-MM-DD) without timezone conversion
        const year = selectedDate.getFullYear()
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
        const day = String(selectedDate.getDate()).padStart(2, '0')
        bookingDate = `${year}-${month}-${day}`
      } else if (typeof selectedDate === 'string') {
        // If it's already a string, ensure it's in YYYY-MM-DD format
        bookingDate = selectedDate.split('T')[0] // Remove time part if present
      } else {
        // Fallback: try to parse it
        const dateObj = new Date(selectedDate)
        const year = dateObj.getFullYear()
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        bookingDate = `${year}-${month}-${day}`
      }

      const res = await api.post('/appointments', {
        customer_name: booking.name,
        customer_phone: booking.phone ? booking.phone.replace(/[\s-]/g, '') : null,
        customer_address: booking.address || null,
        service_id: serviceIds[0], // Keep for backward compatibility
        service_ids: serviceIds, // New: array of service IDs
        stylist_id: selectedStylist,
        date: bookingDate,
        preferred_time: preferredTime,
        payment_method: 'on_hand', // Default payment method
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
      if (booking.phone) localStorage.setItem('customer_phone', booking.phone)
      
    } catch (e) {
      // Handle validation errors
      let errorMessage = 'Booking failed. Please try again.'
      
      if (e.response?.data) {
        // Check for validation errors object
        if (e.response.data.errors) {
          const errors = Object.values(e.response.data.errors).flat()
          errorMessage = errors.length > 0 ? errors.join('. ') : e.response.data.message || errorMessage
        } else if (e.response.data.message) {
          errorMessage = e.response.data.message
        }
      }
      
      toast.error(errorMessage, {
        autoClose: 6000, // Show longer for important errors
      })
      
      // If there's an overlap, refresh availability to show updated slots
      if (e.response?.status === 409) {
        fetchAvailability()
        setSelectedSlot(null) // Clear selected slot
      }
      
      console.error('Booking error:', e.response?.data || e)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduling || !selectedSlot) {
      toast.warn('Please select a time slot')
      return
    }
    try {
      // Extract time from slot start (HH:MM format) - use local time, not UTC
      const slotDate = new Date(selectedSlot.start)
      const hours = String(slotDate.getHours()).padStart(2, '0')
      const minutes = String(slotDate.getMinutes()).padStart(2, '0')
      const preferredTime = `${hours}:${minutes}`
      
      await api.patch(`/appointments/${rescheduling.id}`, {
        date: selectedDate,
        preferred_time: preferredTime,
      })
      toast.success('Appointment rescheduled successfully!')
      navigate('/customer')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reschedule failed')
    }
  }

  const currency = cents => `₱${(cents / 100).toFixed(2)}`
  const selectedServiceData = services.find(s => s.id === parseInt(selectedService)) // For backward compatibility
  const selectedStylistData = stylists.find(s => s.id === parseInt(selectedStylist))

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-slate-900 text-white py-4 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-gray-300 hover:text-white transition"
            >
              ← Home
            </button>
            <h1 className="text-xl font-bold">✨ Kaye's Hair Salon and Spa</h1>
          </div>
          <button
            onClick={() => navigate('/my-appointments')}
            className="px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-sm transition"
          >
            My Appointments
          </button>
        </div>
      </div>
      
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
      
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
          <h2 className="text-xl font-bold mb-4 text-gray-900">Customer Information</h2>
          <p className="text-gray-700 mb-6">Please provide your information to proceed with booking</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Full Name *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                placeholder="Enter your full name"
                value={booking.name}
                onChange={e => setBooking({ ...booking, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Contact Number *</label>
              <input
                type="tel"
                required
                className={`w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500 ${formErrors.phone ? 'border-red-500' : ''}`}
                placeholder="09171234567 or +639171234567"
                value={booking.phone}
                onChange={e => {
                  setBooking({ ...booking, phone: e.target.value })
                  const validation = validatePhone(e.target.value)
                  setFormErrors(prev => ({ ...prev, phone: validation.message }))
                }}
              />
              {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900">Address</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 text-gray-900 placeholder-gray-500"
                placeholder="Your address"
                value={booking.address}
                onChange={e => setBooking({ ...booking, address: e.target.value })}
              />
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
                <label className="text-sm text-gray-900 font-medium">Stylist *</label>
                <select
                  className="w-full mt-1 border rounded px-3 py-2 text-gray-900"
                  value={selectedStylist}
                  onChange={e => setSelectedStylist(e.target.value)}
                >
                  <option value="">Select Stylist</option>
                  {stylists.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-900 font-medium">Services * (Select one or more)</label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded p-2 space-y-2">
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
                    const serviceIdStr = s.id.toString()
                    const isSelected = selectedServices.includes(serviceIdStr) || selectedService === serviceIdStr
                    
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-gray-50 transition ${
                          isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Add to selected services
                              const newServices = [...selectedServices, serviceIdStr]
                              setSelectedServices(newServices)
                              // Also update selectedService for backward compatibility
                              if (newServices.length === 1) {
                                setSelectedService(serviceIdStr)
                              }
                            } else {
                              // Remove from selected services
                              const newServices = selectedServices.filter(id => id !== serviceIdStr)
                              setSelectedServices(newServices)
                              // Update selectedService if it was the removed one
                              if (selectedService === serviceIdStr) {
                                setSelectedService(newServices[0] || '')
                              }
                            }
                            setSelectedSlot(null) // Reset slot when services change
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{s.name}</div>
                          <div className="text-xs text-gray-700">
                            {currency(s.price_cents)} • {formatDuration(s.duration_minutes)}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                {selectedServices.length > 0 && (() => {
                  const selectedServicesData = services.filter(s => selectedServices.includes(s.id.toString()))
                  const totalPrice = selectedServicesData.reduce((sum, s) => sum + s.price_cents, 0)
                  const totalDuration = selectedServicesData.reduce((sum, s) => sum + s.duration_minutes, 0)
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
                    <div className="text-sm font-semibold text-blue-600 mt-2">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected • 
                      Total: {currency(totalPrice)} • Duration: {formatDuration(totalDuration)}
                    </div>
                  )
                })()}
              </div>
              <div>
                <label className="text-sm text-gray-900 font-medium">Customer</label>
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium text-gray-900">{booking.name}</div>
                  {booking.phone && <div className="text-xs text-gray-700">{booking.phone}</div>}
                  {booking.address && <div className="text-xs text-gray-700">{booking.address}</div>}
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
              month={calendarMonth}
              year={calendarYear}
              selectedDate={selectedDate}
              onSelect={(date) => {
                // date is already in YYYY-MM-DD format from Calendar component
                const selected = new Date(date + 'T00:00:00')
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                if (selected >= today) {
                  setSelectedDate(date)
                  setSelectedSlot(null) // Reset slot when date changes
                }
              }}
              onMonthChange={(month, year) => {
                setCalendarMonth(month)
                setCalendarYear(year)
              }}
            />
            <SlotList 
              slots={availability} 
              selected={selectedSlot}
              selectedDate={selectedDate}
              onSelect={(slot) => {
                // Verify slot is available
                if (slot.available === false) {
                  toast.error('This time slot is not available. Please choose another time.')
                  return
                }
                // Double-check against availability list
                const isAvailable = availability.some(availSlot =>
                  new Date(availSlot.start).getTime() === new Date(slot.start).getTime() &&
                  availSlot.available !== false
                )
                if (isAvailable) {
                  setSelectedSlot(slot)
                } else {
                  toast.error('This time slot is no longer available. Please refresh and choose another time.')
                  fetchAvailability()
                }
              }} 
            />
          </div>

          {/* Booking Summary - Show all selected services */}
          {((selectedServices.length > 0 || selectedService) && selectedStylistData) && (() => {
            const serviceIds = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
            const selectedServicesData = services.filter(s => serviceIds.includes(s.id.toString()))
            const totalPrice = selectedServicesData.reduce((sum, s) => sum + s.price_cents, 0)
            const totalDuration = selectedServicesData.reduce((sum, s) => sum + s.duration_minutes, 0)
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
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-gray-900">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Service{selectedServicesData.length > 1 ? 's' : ''}:</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      {selectedServicesData.map(s => (
                        <li key={s.id} className="text-gray-800">
                          <span className="font-medium text-gray-900">{s.name}</span> - {currency(s.price_cents)} ({formatDuration(s.duration_minutes)})
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-300">
                    <div>
                      <span className="font-medium text-gray-900">Total Price:</span>
                      <div className="font-bold text-lg text-green-700">{currency(totalPrice)}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Total Duration:</span>
                      <div className="font-semibold text-gray-900">{formatDuration(totalDuration)}</div>
                    </div>
                  </div>
                  <div className="text-gray-900"><span className="font-medium">Stylist:</span> {selectedStylistData.name}</div>
                  <div className="text-gray-900"><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  {selectedSlot && (
                    <div className="text-gray-900"><span className="font-medium">Time:</span> {new Date(selectedSlot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedSlot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  )}
                </div>
              </div>
            )
          })()}

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
                disabled={!selectedSlot || (selectedServices.length === 0 && !selectedService) || !selectedStylist}
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
            // Keep email/phone in form for easy re-booking, but clear other fields
            setBooking({ name: '', phone: booking.phone, address: '' })
            setFormErrors({ phone: '' })
            // Navigate to customer dashboard to see the new appointment
            navigate('/my-appointments')
          }} 
        />
      )}
      </div>
    </div>
  )
}

export default BookAppointment
