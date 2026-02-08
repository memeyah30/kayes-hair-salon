import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { QRCodeSVG } from 'qrcode.react'
import api from '../utils/api'

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

const resolveQrUrl = (url) => {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${window.location.origin}/${url.replace(/^\/+/, '')}`
}

// Helper function to convert ISO string to HH:MM format in Asia/Manila timezone
const toManilaHHmm = (isoString) => {
  const d = new Date(isoString)

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = fmt.formatToParts(d)
  const hh = parts.find(p => p.type === 'hour')?.value ?? '00'
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00'
  return `${hh}:${mm}`
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
  const selectedDateObj = new Date(selectedDate + 'T00:00:00')
  const isToday = selectedDateObj && selectedDateObj.getTime() === today.getTime()
  
  // Minimum advance booking time: 30 minutes
  const minAdvanceMinutes = 30
  const minAdvanceTime = new Date(now.getTime() + minAdvanceMinutes * 60000)
  
  // Filter out past slots and slots less than 30 minutes away
  const filteredSlots = slots.map(slot => {
    const slotTime = new Date(slot.start)
    
    // Check if slot is in the past (relative to current time)
    const isPast = slotTime < now
    
    // Check if slot is less than 30 minutes away (only for today or if slot is very close to now)
    const isTooSoon = slotTime < minAdvanceTime
    
    // Slot is unavailable if it's in the past OR too soon
    const isUnavailable = isPast || isTooSoon
    
    return {
      ...slot,
      available: slot.available !== false && !isUnavailable ? slot.available : false,
      isPast: isPast,
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
              // Parse the date string and convert to Asia/Manila timezone
              const slotDate = new Date(slot.start)
              
              // Extract hours and minutes in Asia/Manila timezone
              const phTimeFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Manila',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
              
              const formatted = phTimeFormatter.formatToParts(slotDate)
              const hours = parseInt(formatted.find(p => p.type === 'hour')?.value || '0')
              const minutes = formatted.find(p => p.type === 'minute')?.value.padStart(2, '0') || '00'
              const ampm = formatted.find(p => p.type === 'dayPeriod')?.value.toUpperCase() || 'AM'
              
              // Format as 12-hour time with AM/PM
              const displayHour = hours % 12 || 12
              const label = `${String(displayHour).padStart(2, '0')}:${minutes} ${ampm}`
              
              const selectedKey = selected?.start
              const isSelected = selectedKey && new Date(selectedKey).getTime() === slotDate.getTime()
              const isAvailable = slot.available !== false
              
              // Use the pre-calculated flags from filteredSlots
              const isPast = slot.isPast || false
              const isTooSoon = slot.isTooSoon || false
              const isDisabled = !isAvailable || isPast || isTooSoon
              
              // Generate appropriate tooltip message
              let tooltipMessage = 'This time slot is not available'
              if (isPast) {
                tooltipMessage = 'This time slot has already passed. Please select a future time.'
              } else if (isTooSoon) {
                const minutesUntilSlot = Math.ceil((slotDate.getTime() - now.getTime()) / 60000)
                if (minutesUntilSlot > 0) {
                  tooltipMessage = `Appointments must be booked at least 30 minutes in advance. This slot is only ${minutesUntilSlot} minute${minutesUntilSlot !== 1 ? 's' : ''} away.`
                } else {
                  tooltipMessage = 'This time slot is too soon. Please book at least 30 minutes in advance.'
                }
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
  
  // Helper function to get service name (with variant if applicable)
  const getServiceName = (service) => {
    const variantId = service.pivot?.service_variant_id
    if (variantId && service.variants) {
      const variant = service.variants.find(v => v.id === variantId)
      if (variant) {
        return `${service.name} - ${variant.name}`
      }
    }
    return service.name
  }
  
  // Helper function to get service price (variant price if applicable)
  const getServicePrice = (service) => {
    const variantId = service.pivot?.service_variant_id
    if (variantId && service.variants) {
      const variant = service.variants.find(v => v.id === variantId)
      if (variant) {
        return variant.price_cents
      }
    }
    return service.price_cents || 0
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
  
  // Calculate totals using helper function
  const totalPrice = appointmentServices.reduce((sum, s) => sum + getServicePrice(s), 0)
  
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
      `  - ${getServiceName(s)}: ${currency(getServicePrice(s))}`
    ).join('\n')

    const startSource = appointment.start_datetime_pht || appointment.start_datetime
    const endSource = appointment.end_datetime_pht || appointment.end_datetime
    
    const receiptContent = `
KAYE'S HAIR SALON AND SPA - APPOINTMENT RECEIPT
====================================
Receipt #: ${'APT-' + String(appointment.id).padStart(6, '0')}
Date: ${new Date(appointment.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT

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
Date: ${new Date(startSource).toLocaleDateString('en-US', { timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${new Date(startSource).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} - ${new Date(endSource).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} PHT

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
              <div className="text-sm text-gray-500 mt-1">Booking Date: {new Date(appointment.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT</div>
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
                      <li key={idx}>{getServiceName(s)} - {currency(getServicePrice(s))}</li>
                    ))}
                  </ul>
                </div>
                <div><span className="font-medium">Stylist:</span> {appointment.stylist?.name}</div>
                <div><span className="font-medium">Date:</span> {(() => {
                  const startSource = appointment.start_datetime_pht || appointment.start_datetime
                  const startDate = new Date(startSource)
                  return startDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    timeZone: 'Asia/Manila'
                  })
                })()}</div>
                <div><span className="font-medium">Time:</span> {(() => {
                  const startSource = appointment.start_datetime_pht || appointment.start_datetime
                  const endSource = appointment.end_datetime_pht || appointment.end_datetime
                  const startDate = new Date(startSource)
                  const endDate = new Date(endSource)
                  const startTime = startDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    timeZone: 'Asia/Manila',
                    hour12: true 
                  })
                  const endTime = endDate.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    timeZone: 'Asia/Manila',
                    hour12: true 
                  })
                  return `${startTime} - ${endTime} PHT`
                })()}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Pricing</h3>
              {appointmentServices.length > 1 ? (
                <div className="space-y-2">
                  {appointmentServices.map((s, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span>{getServiceName(s)}:</span>
                      <span className="font-medium">{currency(getServicePrice(s))}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-lg text-green-600">{currency(totalPrice)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span>{getServiceName(appointmentServices[0])}:</span>
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
  const [step, setStep] = useState(1) // 1: Customer Info, 2: Booking Details, 3: Payment
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
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
  const [selectedVariants, setSelectedVariants] = useState({}) // Map of serviceId -> variantId
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [booking, setBooking] = useState({ 
    name: '', 
    phone: '',
    address: ''
  })
  const [payment, setPayment] = useState({
    method: 'on_hand', // 'on_hand' or 'online'
    paymentType: 'full', // 'full' or 'downpayment'
    selectedAccount: '',
    amount: '',
    proofFile: null,
    proofPreview: null,
  })
  const [formErrors, setFormErrors] = useState({ phone: '', payment: '' })
  const [rescheduling, setRescheduling] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [prefillServiceIds, setPrefillServiceIds] = useState([])
  const [prefillStylistId, setPrefillStylistId] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    refreshData()
    const params = new URLSearchParams(window.location.search)
    const appointmentId = params.get('reschedule') || params.get('appointment')
    const servicesParam = params.get('services')
    const stylistParam = params.get('stylist')
    if (servicesParam) {
      const ids = servicesParam
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
      setPrefillServiceIds(ids)
    } else {
      setPrefillServiceIds([])
    }
    if (stylistParam) {
      setPrefillStylistId(stylistParam.trim())
    } else {
      setPrefillStylistId('')
    }
    if (appointmentId) {
      loadAppointmentForReschedule(appointmentId)
    }
  }, [])

  useEffect(() => {
    if (rescheduling) {
      return
    }

    if (services.length === 0) {
      return
    }

    if (prefillServiceIds.length > 0) {
      const validIds = services
        .map(s => s.id.toString())
        .filter(id => prefillServiceIds.includes(id))
      setSelectedServices(validIds)
      setSelectedService(validIds[0] || '')
      return
    }

    // No services selected from homepage, keep booking dashboard cleared
    setSelectedServices([])
    setSelectedService('')
    setSelectedVariants({})
    setSelectedSlot(null)
  }, [services, prefillServiceIds, rescheduling])

  useEffect(() => {
    if (rescheduling) {
      return
    }

    if (stylists.length === 0) {
      return
    }

    if (prefillStylistId) {
      const stylistMatch = stylists.find(s => s.id.toString() === prefillStylistId)
      if (stylistMatch) {
        setSelectedStylist(stylistMatch.id)
      }
      return
    }

    // No prefill stylist provided, keep stylist selection cleared
    setSelectedStylist('')
  }, [stylists, prefillStylistId, rescheduling])

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
      const [sRes, svcRes, paymentRes] = await Promise.all([
        api.get('/stylists'),
        api.get('/services'),
        api.get('/payment-accounts').catch(() => ({ data: [] })), // Don't fail if payment accounts fail
      ])
      setStylists(sRes.data.filter(s => s.active))
      // Show ALL services from all stylists
      setServices(svcRes.data)
      // Set payment accounts
      setPaymentAccounts(paymentRes.data || [])
      if (paymentRes.data && paymentRes.data.length > 0) {
        setPayment(prev => ({ ...prev, selectedAccount: paymentRes.data[0].id.toString() }))
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
      const startSource = appt.start_datetime_pht || appt.start_datetime
      setSelectedDate(startSource.slice(0, 10))
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
    
    // Validate that the selected slot is not in the past and is at least 30 minutes away
    const now = new Date()
    const slotTime = new Date(selectedSlot.start)
    const minAdvanceTime = new Date(now.getTime() + 30 * 60000) // 30 minutes from now
    
    if (slotTime < now) {
      toast.error('Cannot book appointments in the past. Please select a future time slot.')
      setSelectedSlot(null)
      return
    }
    
    if (slotTime < minAdvanceTime) {
      const minutesUntilSlot = Math.ceil((slotTime.getTime() - now.getTime()) / 60000)
      toast.error(`Appointments must be booked at least 30 minutes in advance. This slot is only ${minutesUntilSlot} minute${minutesUntilSlot !== 1 ? 's' : ''} away.`)
      setSelectedSlot(null)
      return
    }
    
    // Use selectedServices if available, otherwise fall back to selectedService
    const serviceIds = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
    if (serviceIds.length === 0) {
      toast.warn('Please select at least one service')
      return
    }
    
    // Check if all services with variants have a variant selected
    const selectedServicesData = services.filter(s => serviceIds.includes(s.id.toString()))
    for (const service of selectedServicesData) {
      if (service.variants && service.variants.length > 0) {
        if (!selectedVariants[service.id]) {
          toast.warn(`Please select a variant for "${service.name}"`)
          return
        }
      }
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
      // Extract time from slot start (HH:MM format) - treat as Philippine Time (Asia/Manila)
      // Use the helper function to convert to HH:MM format
      const preferredTime = toManilaHHmm(selectedSlot.start)

      
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

      // Calculate total amount
      const serviceIdsForCalc = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
      const selectedServicesData = services.filter(s => serviceIdsForCalc.includes(s.id.toString()))
      // Calculate total: use variant price if selected, otherwise service price
      const totalAmountCents = selectedServicesData.reduce((sum, s) => {
        if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
          const variant = s.variants.find(v => v.id === selectedVariants[s.id])
          return sum + (variant ? variant.price_cents : s.price_cents || 0)
        }
        return sum + (s.price_cents || 0)
      }, 0)
      
      // Calculate payment amount
      let paymentAmountCents = 0
      let paymentStatus = payment.method === 'online' ? 'pending' : 'unpaid'

      if (payment.method === 'online') {
        if (payment.paymentType === 'full') {
          paymentAmountCents = totalAmountCents
        } else {
          // Downpayment - use entered amount or default to 50%
          paymentAmountCents = payment.amount ? Math.round(parseFloat(payment.amount) * 100) : Math.round(totalAmountCents * 0.5)
        }
      } else if (payment.method === 'on_hand') {
        if (!payment.amount) {
          toast.warn('Cash deposit is required to confirm your appointment')
          setLoading(false)
          return
        }
        paymentAmountCents = Math.round(parseFloat(payment.amount) * 100)
        const minDepositCents = Math.round(totalAmountCents * 0.5)
        if (!Number.isFinite(paymentAmountCents) || paymentAmountCents < minDepositCents) {
          toast.warn(`Minimum cash deposit is ${currency(minDepositCents)}`)
          setLoading(false)
          return
        }
        paymentStatus = paymentAmountCents >= totalAmountCents ? 'paid' : 'downpayment'
      }

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('customer_name', booking.name)
      formData.append('customer_phone', booking.phone ? booking.phone.replace(/[\s-]/g, '') : '')
      formData.append('customer_address', booking.address || '')
      formData.append('service_id', serviceIds[0])
      serviceIds.forEach(id => formData.append('service_ids[]', id))
      
      // Add service variants mapping (service_id => variant_id)
      const serviceVariantsMap = {}
      selectedServicesData.forEach(s => {
        if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
          serviceVariantsMap[s.id] = selectedVariants[s.id]
        }
      })
      if (Object.keys(serviceVariantsMap).length > 0) {
        formData.append('service_variants', JSON.stringify(serviceVariantsMap))
      }
      
      formData.append('stylist_id', selectedStylist)
      formData.append('date', bookingDate)
      formData.append('preferred_time', preferredTime)
      formData.append('payment_method', payment.method)
      formData.append('payment_status', paymentStatus)
      
      if (payment.method === 'online') {
        formData.append('downpayment_amount_cents', paymentAmountCents)
        if (payment.proofFile) {
          formData.append('payment_proof', payment.proofFile)
        }
      } else if (payment.method === 'on_hand') {
        formData.append('downpayment_amount_cents', paymentAmountCents)
      }

      // Don't set Content-Type header manually - let axios handle it for FormData
      // This ensures the boundary is set correctly
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BookAppointment.jsx:870',message:'Submitting appointment booking',data:{date:bookingDate,preferred_time:preferredTime,selectedSlotStart:selectedSlot?.start,selectedSlotEnd:selectedSlot?.end,selectedServicesCount:selectedServicesData.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T4'})}).catch(()=>{});
      // #endregion
      const res = await api.post('/appointments', formData)
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BookAppointment.jsx:872',message:'Booking response received',data:{appointmentId:res.data?.id,start_datetime:res.data?.start_datetime,end_datetime:res.data?.end_datetime},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T4'})}).catch(()=>{});
      // #endregion
      
      toast.success('Appointment booked successfully!')
      
      // The response should already have stylist and service loaded
      // But let's fetch it again to be sure
      try {
        const receiptRes = await api.get(`/appointments/${res.data.id}`)
        if (receiptRes.data && receiptRes.data.service && receiptRes.data.stylist) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/7bcf3a64-27e0-4dfa-bd64-c09787aae3bc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BookAppointment.jsx:878',message:'Receipt data fetched',data:{appointmentId:receiptRes.data?.id,start_datetime:receiptRes.data?.start_datetime,end_datetime:receiptRes.data?.end_datetime,start_datetime_pht:receiptRes.data?.start_datetime_pht,end_datetime_pht:receiptRes.data?.end_datetime_pht},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'T5'})}).catch(()=>{});
          // #endregion
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
      
      // Log the full error for debugging
      console.error('Booking error:', e)
      console.error('Error response:', e.response)
      
      if (e.response?.data) {
        // Check for validation errors object
        if (e.response.data.errors) {
          const errors = Object.values(e.response.data.errors).flat()
          errorMessage = errors.length > 0 ? errors.join('. ') : e.response.data.message || errorMessage
        } else if (e.response.data.message) {
          errorMessage = e.response.data.message
        }
      } else if (e.message) {
        errorMessage = e.message
      }
      
      // Show specific error for CSRF token issues
      if (e.response?.status === 419) {
        errorMessage = 'CSRF token mismatch. Please refresh the page and try again.'
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
      // Extract time from slot start (HH:MM format) - use Asia/Manila timezone
      const preferredTime = toManilaHHmm(selectedSlot.start)

      
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
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            className="w-full sm:w-auto px-4 py-2 bg-white/10 rounded hover:bg-white/20 text-sm transition"
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
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base ${
            step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            1
          </div>
          <div className={`w-10 md:w-24 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base ${
            step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            2
          </div>
          <div className={`w-10 md:w-24 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base ${
            step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
          }`}>
            3
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
          {/* Payment Method Selection */}
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <h3 className="font-semibold mb-3 text-gray-900">Payment Method</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                payment.method === 'on_hand' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="on_hand"
                  checked={payment.method === 'on_hand'}
                  onChange={(e) => setPayment({ ...payment, method: e.target.value, amount: '', proofFile: null, proofPreview: null })}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-semibold text-gray-900">Pay at Salon (Cash)</div>
                  <div className="text-sm text-gray-600 mt-1">Pay in person after the service</div>
                </div>
              </label>
              <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                payment.method === 'online' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="online"
                  checked={payment.method === 'online'}
                  onChange={(e) => setPayment({ ...payment, method: e.target.value, amount: '', proofFile: null, proofPreview: null })}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-semibold text-gray-900">GCash (Manual)</div>
                  <div className="text-sm text-gray-600 mt-1">Scan QR, pay via GCash, then upload your receipt</div>
                </div>
              </label>
            </div>
          </div>

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
                          {s.variants && s.variants.length > 0 ? (
                            <div className="text-xs text-gray-700 mt-1">
                              <div className="font-medium text-blue-600 mb-1">
                                {s.variants.length} variant{s.variants.length > 1 ? 's' : ''} available
                              </div>
                              {isSelected && (
                                <div className="mt-2 space-y-1">
                                  {s.variants.map(variant => (
                                    <label
                                      key={variant.id}
                                      className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <input
                                        type="radio"
                                        name={`variant-${s.id}`}
                                        checked={selectedVariants[s.id] === variant.id}
                                        onChange={() => {
                                          setSelectedVariants({
                                            ...selectedVariants,
                                            [s.id]: variant.id
                                          })
                                          setSelectedSlot(null) // Reset slot when variant changes
                                        }}
                                        className="w-3 h-3"
                                      />
                                      <span className="text-xs">
                                        {variant.name} - {currency(variant.price_cents)}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-700">
                              {currency(s.price_cents)}
                            </div>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
                {selectedServices.length > 0 && (() => {
                  const selectedServicesData = services.filter(s => selectedServices.includes(s.id.toString()))
                  // Calculate price: use variant price if selected, otherwise service price
                  const totalPrice = selectedServicesData.reduce((sum, s) => {
                    if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
                      const variant = s.variants.find(v => v.id === selectedVariants[s.id])
                      return sum + (variant ? variant.price_cents : s.price_cents)
                    }
                    return sum + s.price_cents
                  }, 0)
                  return (
                    <div className="text-sm font-semibold text-blue-600 mt-2">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected • 
                      Total: {currency(totalPrice)}
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
                
                // Validate that the slot is not in the past and is at least 30 minutes away
                const now = new Date()
                const slotTime = new Date(slot.start)
                const minAdvanceTime = new Date(now.getTime() + 30 * 60000) // 30 minutes from now
                
                if (slotTime < now) {
                  toast.error('Cannot book appointments in the past. Please select a future time slot.')
                  return
                }
                
                if (slotTime < minAdvanceTime) {
                  const minutesUntilSlot = Math.ceil((slotTime.getTime() - now.getTime()) / 60000)
                  toast.error(`Appointments must be booked at least 30 minutes in advance. This slot is only ${minutesUntilSlot} minute${minutesUntilSlot !== 1 ? 's' : ''} away.`)
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
            // Calculate total price: use variant price if selected, otherwise service price
            const totalPrice = selectedServicesData.reduce((sum, s) => {
              if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
                const variant = s.variants.find(v => v.id === selectedVariants[s.id])
                return sum + (variant ? variant.price_cents : s.price_cents)
              }
              return sum + s.price_cents
            }, 0)
            
            return (
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold mb-3 text-gray-900">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Service{selectedServicesData.length > 1 ? 's' : ''}:</span>
                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                      {selectedServicesData.map(s => {
                        // Get the price for this service (variant or base)
                        let servicePrice = s.price_cents
                        let serviceName = s.name
                        if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
                          const variant = s.variants.find(v => v.id === selectedVariants[s.id])
                          if (variant) {
                            servicePrice = variant.price_cents
                            serviceName = `${s.name} - ${variant.name}`
                          }
                        }
                        return (
                          <li key={s.id} className="text-gray-800">
                            <span className="font-medium text-gray-900">{serviceName}</span> - {currency(servicePrice)}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-gray-300">
                    <span className="font-medium text-gray-900">Total Price:</span>
                    <div className="font-bold text-lg text-green-700">{currency(totalPrice)}</div>
                  </div>
                  <div className="text-gray-900"><span className="font-medium">Stylist:</span> {selectedStylistData.name}</div>
                  <div className="text-gray-900"><span className="font-medium">Date:</span> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  {selectedSlot && (
                    <div className="text-gray-900"><span className="font-medium">Time:</span> {new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} - {new Date(selectedSlot.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}</div>
                  )}
                </div>
              </div>
            )
          })()}

          {payment.method === 'on_hand' && (() => {
            const serviceIdsForCalc = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
            const selectedServicesData = services.filter(s => serviceIdsForCalc.includes(s.id.toString()))
            const totalAmountCents = selectedServicesData.reduce((sum, s) => {
              if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
                const variant = s.variants.find(v => v.id === selectedVariants[s.id])
                return sum + (variant ? variant.price_cents : s.price_cents || 0)
              }
              return sum + (s.price_cents || 0)
            }, 0)
            const minDepositCents = Math.round(totalAmountCents * 0.5)
            const minDeposit = (minDepositCents / 100).toFixed(2)
            return (
              <div className="bg-white rounded-xl shadow p-4 mb-4">
                <h3 className="font-semibold mb-2 text-gray-900">Cash Deposit</h3>
                <p className="text-sm text-gray-600 mb-3">
                  A 50% deposit is required to confirm your appointment. The admin will confirm once deposit is received.
                </p>
                <label className="block text-sm font-medium mb-1 text-gray-900">Deposit Amount (₱) *</label>
                <input
                  type="number"
                  min={minDeposit}
                  step="0.01"
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                  placeholder={`Minimum ₱${minDeposit}`}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum: {currency(minDepositCents)}</p>
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
                onClick={() => {
                  if (!selectedSlot || (selectedServices.length === 0 && !selectedService) || !selectedStylist) {
                    toast.warn('Please complete all booking details')
                    return
                  }
                  // If payment method is online, go to payment step, otherwise book directly
                  if (payment.method === 'online') {
                    setStep(3)
                  } else {
                    handleBook()
                  }
                }}
                disabled={!selectedSlot || (selectedServices.length === 0 && !selectedService) || !selectedStylist}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {payment.method === 'online' ? 'Continue to Payment' : 'Confirm Booking'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Step 3: Payment (only for online payments) */}
      {step === 3 && payment.method === 'online' && (() => {
        const serviceIdsForCalc = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
        const selectedServicesData = services.filter(s => serviceIdsForCalc.includes(s.id.toString()))
        // Calculate total: use variant price if selected, otherwise service price
        const totalAmountCents = selectedServicesData.reduce((sum, s) => {
          if (s.variants && s.variants.length > 0 && selectedVariants[s.id]) {
            const variant = s.variants.find(v => v.id === selectedVariants[s.id])
            return sum + (variant ? variant.price_cents : s.price_cents || 0)
          }
          return sum + (s.price_cents || 0)
        }, 0)
        const totalAmount = totalAmountCents / 100
        
        // Calculate payment amount based on type
        const paymentAmount = payment.paymentType === 'full' 
          ? totalAmount 
          : (payment.amount ? parseFloat(payment.amount) : totalAmount * 0.5)
        
        return (
          <div className="bg-white rounded-xl shadow p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Payment Details</h2>
            <p className="text-sm text-gray-600 mb-4">
              Payments are verified manually. Your booking will be marked as <strong>PENDING</strong> until the salon confirms the receipt.
            </p>
            
            {/* Booking Summary */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2 text-gray-900">Booking Summary</h3>
              <div className="text-sm space-y-1 text-gray-700">
                <div><strong>Total Amount:</strong> {currency(totalAmountCents)}</div>
                <div><strong>Services:</strong> {selectedServicesData.map(s => s.name).join(', ')}</div>
                <div><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                {selectedSlot && (
                  <div><strong>Time:</strong> {new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}</div>
                )}
              </div>
            </div>

            {/* Payment Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-900">Payment Type *</label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  payment.paymentType === 'full' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="payment_type"
                    value="full"
                    checked={payment.paymentType === 'full'}
                    onChange={(e) => setPayment({ ...payment, paymentType: e.target.value, amount: '' })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">Full Payment</div>
                    <div className="text-sm text-gray-600 mt-1">{currency(totalAmountCents)}</div>
                  </div>
                </label>
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  payment.paymentType === 'downpayment' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="payment_type"
                    value="downpayment"
                    checked={payment.paymentType === 'downpayment'}
                    onChange={(e) => setPayment({ ...payment, paymentType: e.target.value, amount: (totalAmount * 0.5).toFixed(2) })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-semibold text-gray-900">Downpayment</div>
                    <div className="text-sm text-gray-600 mt-1">Minimum: {currency(Math.round(totalAmountCents * 0.5))}</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Amount Input (for downpayment) */}
            {payment.paymentType === 'downpayment' && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1 text-gray-900">Downpayment Amount (₱) *</label>
                <input
                  type="number"
                  min={totalAmount * 0.5}
                  max={totalAmount}
                  step="0.01"
                  required
                  className="w-full border rounded px-3 py-2 text-gray-900"
                  value={payment.amount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    if (value >= totalAmount * 0.5 && value <= totalAmount) {
                      setPayment({ ...payment, amount: e.target.value })
                    } else if (value < totalAmount * 0.5) {
                      toast.warn(`Minimum downpayment is ${currency(Math.round(totalAmountCents * 0.5))}`)
                    }
                  }}
                  placeholder={`Minimum: ${currency(Math.round(totalAmountCents * 0.5))}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum: {currency(Math.round(totalAmountCents * 0.5))} • Remaining: {currency(Math.round((totalAmount - paymentAmount) * 100))}
                </p>
              </div>
            )}

            {/* Payment Account Selection */}
            {paymentAccounts.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-900">Select Payment Account *</label>
                <div className="space-y-3">
                  {paymentAccounts.map(account => (
                    <label
                      key={account.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition block ${
                        payment.selectedAccount === account.id.toString() ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment_account"
                        value={account.id}
                        checked={payment.selectedAccount === account.id.toString()}
                        onChange={(e) => setPayment({ ...payment, selectedAccount: e.target.value })}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{account.account_name}</div>
                          <div className="text-sm text-gray-600">{account.account_number}</div>
                          {account.instructions && (
                            <div className="text-xs text-gray-500 mt-1">{account.instructions}</div>
                          )}
                        </div>
                        {resolveQrUrl(account.qr_code_full_url || account.qr_code_url) && (
                          <img
                            src={resolveQrUrl(account.qr_code_full_url || account.qr_code_url)}
                            alt="QR Code"
                            className="w-20 h-20 object-contain"
                          />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Proof Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 text-gray-900">Payment Proof (Screenshot/Photo) *</label>
              <input
                type="file"
                accept="image/*"
                required
                className="w-full border rounded px-3 py-2 text-gray-900"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('File size must be less than 5MB')
                      return
                    }
                    setPayment({ 
                      ...payment, 
                      proofFile: file,
                      proofPreview: URL.createObjectURL(file)
                    })
                  }
                }}
              />
              {payment.proofPreview && (
                <div className="mt-3">
                  <img src={payment.proofPreview} alt="Payment proof preview" className="max-w-xs border rounded" />
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Upload a screenshot or photo of your payment transaction</p>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700">Total Amount:</span>
                <span className="font-bold text-lg text-gray-900">{currency(totalAmountCents)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">
                  {payment.paymentType === 'full' ? 'Payment Amount:' : 'Downpayment Amount:'}
                </span>
                <span className="font-bold text-lg text-green-600">{currency(Math.round(paymentAmount * 100))}</span>
              </div>
              {payment.paymentType === 'downpayment' && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-300">
                  <span className="text-gray-700">Remaining Balance:</span>
                  <span className="font-semibold text-gray-900">{currency(Math.round((totalAmount - paymentAmount) * 100))}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleBook}
                disabled={!payment.proofFile || !payment.selectedAccount || (payment.paymentType === 'downpayment' && (!payment.amount || parseFloat(payment.amount) < totalAmount * 0.5))}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Confirm Booking & Pay
              </button>
            </div>
          </div>
        )
      })()}

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
