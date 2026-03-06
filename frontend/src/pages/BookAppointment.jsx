import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { QRCodeSVG } from 'qrcode.react'
import api from '../utils/api'
import {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_PENDING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from '../utils/manageBookingApi'
import './BookAppointment.css'

// Validation helpers
const validateEmail = (email) => {
  if (!email) return { valid: true, message: '' } // Optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: 'Please enter a valid email address' }
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

const BOOK_APPOINTMENT_DRAFT_KEY = 'book_appointment_draft_v1'
const BOOK_APPOINTMENT_RESTORE_KEY = 'book_appointment_restore_on_reload'
const AUTO_STYLIST_VALUE = 'AUTO'

const getTodayDateKey = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const readBookingDraft = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(BOOK_APPOINTMENT_DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const wasPageReloaded = () => {
  if (typeof window === 'undefined') return false
  try {
    const navEntries = window.performance?.getEntriesByType?.('navigation')
    const navType = navEntries?.[0]?.type
    if (navType === 'reload') return true

    // Legacy fallback for older browsers.
    if (window.performance?.navigation && typeof window.performance.navigation.type === 'number') {
      return window.performance.navigation.type === 1
    }
  } catch {
    // Ignore performance API errors
  }
  return false
}

const shouldRestoreBookingDraft = () => {
  if (typeof window === 'undefined') return false
  try {
    // Primary behavior: restore state on actual browser refresh.
    if (wasPageReloaded()) return true

    // Secondary fallback for environments where navigation type is unavailable.
    const restoreKey = window.sessionStorage.getItem(BOOK_APPOINTMENT_RESTORE_KEY)
    const currentPath = `${window.location.pathname}${window.location.search}`
    return restoreKey === currentPath
  } catch {
    return wasPageReloaded()
  }
}

const normalizeStepValue = (value) => {
  const num = Number(value)
  if (num === 2 || num === 3) return num
  return 1
}

const isIsoDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
const areStringArraysEqual = (a = [], b = []) =>
  a.length === b.length && a.every((value, index) => value === b[index])

const getStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'busy') return 'Busy'
  if (normalized === 'off' || normalized === 'off_duty') return 'Off Duty'
  if (normalized === 'fully_booked' || normalized === 'full') return 'Fully Booked'
  if (normalized === 'unknown') return 'Unknown'
  return 'Available'
}

const getStatusClass = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'busy') return 'bg-amber-100 text-amber-800'
  if (normalized === 'off' || normalized === 'off_duty') return 'bg-gray-200 text-gray-700'
  if (normalized === 'fully_booked' || normalized === 'full') return 'bg-red-100 text-red-700'
  if (normalized === 'unknown') return 'bg-slate-100 text-slate-700'
  return 'bg-emerald-100 text-emerald-700'
}

const normalizeStylistStatus = (stylist) => {
  const raw = String(stylist?.status || '').toLowerCase().replace(/\s+/g, '_')
  if (raw === 'busy') return 'busy'
  if (raw === 'off' || raw === 'off_duty') return 'off'
  if (raw === 'fully_booked' || raw === 'full') return 'fully_booked'
  if (raw === 'available') return 'available'
  if (stylist?.active === false) return 'off'
  return 'available'
}

const filterStylists = (list, search, filter) => {
  const keyword = String(search || '').trim().toLowerCase()
  return (list || []).filter((stylist) => {
    const status = normalizeStylistStatus(stylist)
    if (filter && filter !== 'all' && status !== filter) {
      return false
    }

    if (!keyword) {
      return true
    }

    const name = String(stylist?.name || '').toLowerCase()
    const role = String(stylist?.role || '').toLowerCase()
    const specialties = Array.isArray(stylist?.specialties)
      ? stylist.specialties.join(' ').toLowerCase()
      : String(stylist?.specialties || '').toLowerCase()

    return name.includes(keyword) || role.includes(keyword) || specialties.includes(keyword)
  })
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
    <div className="booking-panel bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.07)] p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={handlePrevMonth}
          disabled={!canGoPrev}
          className={`px-3 py-1 rounded ${canGoPrev ? 'hover:bg-[#faf8fd] text-[#5f4a70]' : 'text-gray-300 cursor-not-allowed'}`}
          title={canGoPrev ? 'Previous month' : 'Cannot go before current month'}
        >&larr;</button>
        <h3 className="font-semibold text-[#2C1338]">{label}</h3>
        <button
          onClick={handleNextMonth}
          className="px-3 py-1 rounded hover:bg-[#faf8fd] text-[#5f4a70]"
          title="Next month"
        >
          &rarr;
        </button>
      </div>
      <div className="grid grid-cols-7 text-xs text-[#7c688f] mb-2">
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
                  ? 'bg-[#f7f1ec] text-gray-400 cursor-not-allowed' 
                  : isSelected 
                    ? 'bg-[#E75480] text-white border-[#E75480]' 
                    : 'hover:border-[#e7bdd0]'
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

const SlotList = ({ slots, selected, onSelect, loading = false, ready = true }) => {
  const now = new Date()
  
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
    <div className="booking-panel bg-white rounded-2xl border border-[#ece6f4] shadow-[0_8px_24px_rgba(44,19,56,0.07)] p-4 h-full">
      <div className="font-semibold mb-3 text-[#2C1338]">Time slots (8 AM - 8 PM)</div>
      {loading && !hasSlots && <div className="text-sm text-[#7c688f]">Loading slots...</div>}
      {loading && hasSlots && <div className="text-xs text-[#7c688f] mb-2">Refreshing slots...</div>}
      {!loading && !ready && (
        <div className="text-sm text-[#7c688f]">Select a stylist and service to load time slots.</div>
      )}
      {!loading && ready && !hasSlots && (
        <div className="text-sm text-red-500">No available slots for this date. Please choose another date or stylist.</div>
      )}
      {ready && hasSlots && (
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
                      ? 'bg-[#f7f1ec] text-gray-400 border-gray-300 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-[#E75480] text-white border-[#E75480]'
                        : 'hover:border-[#e7bdd0] hover:bg-[#fff4f9]'
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
            <div className="text-xs text-[#7c688f] text-center">
              {availableSlots.length} of {slots.length} slots available
            </div>
          )}
        </>
      )}
    </div>
  )
}

const ReceiptModal = ({ appointment, onClose }) => {
  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`
  
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
          <p className="text-[#8f7a6f] mb-4">Some appointment details are missing. Your booking was successful, but we couldn't load the full receipt.</p>
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
Email: ${appointment.customer_email || 'N/A'}
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
      <div className="bg-white/90 rounded-2xl border border-[#eadfd5] shadow-[0_16px_32px_rgba(92,64,51,0.12)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Appointment Receipt</h2>
            <button onClick={onClose} className="text-[#9b857a] hover:text-gray-700">&times;</button>
          </div>
          
          <div className="border-2 border-gray-300 p-6 space-y-4" id="receipt-content">
            <div className="text-center border-b pb-4">
              <h1 className="text-3xl font-bold">KAYE'S HAIR SALON AND SPA</h1>
              <p className="text-[#8f7a6f]">Appointment Receipt</p>
            </div>
            
            <div>
              <div className="text-sm text-[#9b857a]">Receipt #</div>
              <div className="font-bold text-lg">{'APT-' + String(appointment.id).padStart(6, '0')}</div>
              <div className="text-sm text-[#9b857a] mt-1">Booking Date: {new Date(appointment.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT</div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Customer Information</h3>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Name:</span> {appointment.customer_name}</div>
                <div><span className="font-medium">Email:</span> {appointment.customer_email || 'N/A'}</div>
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
                  'bg-[#f7f1ec] text-[#3b2f2a]'
                }`}>
                  Status: {appointment.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 text-center text-sm text-[#8f7a6f]">
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
                <p className="text-xs text-[#9b857a] mt-1">Scan to book an appointment</p>
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm text-[#8f7a6f]">Share this link to book an appointment:</p>
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
                <p className="text-xs text-[#9b857a]">
                  Your receipt number: {'APT-' + String(appointment.id).padStart(6, '0')}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="tap-safe flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Print Receipt
            </button>
            <button
              onClick={handleDownload}
              className="tap-safe flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Download Receipt
            </button>
            <button
              onClick={onClose}
              className="tap-safe flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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
  const shouldRestoreDraft = shouldRestoreBookingDraft()
  const draft = shouldRestoreDraft ? readBookingDraft() : null
  const [step, setStep] = useState(() => normalizeStepValue(draft?.step)) // 1: Customer Info, 2: Booking Details, 3: Payment
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [availability, setAvailability] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => {
    return isIsoDateKey(draft?.selectedDate) ? draft.selectedDate : getTodayDateKey()
  })
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const month = Number(draft?.calendarMonth)
    return Number.isInteger(month) && month >= 0 && month <= 11 ? month : new Date().getMonth()
  })
  const [calendarYear, setCalendarYear] = useState(() => {
    const year = Number(draft?.calendarYear)
    return Number.isInteger(year) && year >= 1900 ? year : new Date().getFullYear()
  })
  const [selectedStylist, setSelectedStylist] = useState(() => (draft?.selectedStylist ? String(draft.selectedStylist) : ''))
  const [stylistSearch, setStylistSearch] = useState('')
  const [stylistFilter, setStylistFilter] = useState('all')
  const [specializedStylistIds, setSpecializedStylistIds] = useState(null)
  const [stylistSpecializationNames, setStylistSpecializationNames] = useState({})
  const [specializationFilterLoading, setSpecializationFilterLoading] = useState(false)
  const [specializationFilterError, setSpecializationFilterError] = useState('')
  const [selectedService, setSelectedService] = useState(() => (draft?.selectedService ? String(draft.selectedService) : '')) // Keep for backward compatibility
  const [selectedServices, setSelectedServices] = useState(() => (
    Array.isArray(draft?.selectedServices)
      ? draft.selectedServices.map((id) => String(id)).filter(Boolean)
      : []
  )) // New: array of selected service IDs
  const [selectedVariants, setSelectedVariants] = useState(() => (
    draft?.selectedVariants && typeof draft.selectedVariants === 'object' && !Array.isArray(draft.selectedVariants)
      ? draft.selectedVariants
      : {}
  )) // Map of serviceId -> variantId
  const [selectedSlot, setSelectedSlot] = useState(() => {
    if (
      draft?.selectedSlot &&
      typeof draft.selectedSlot === 'object' &&
      typeof draft.selectedSlot.start === 'string' &&
      typeof draft.selectedSlot.end === 'string'
    ) {
      return {
        start: draft.selectedSlot.start,
        end: draft.selectedSlot.end,
        available: draft.selectedSlot.available !== false,
      }
    }
    return null
  })
  const [booking, setBooking] = useState(() => ({
    name: typeof draft?.booking?.name === 'string' ? draft.booking.name : '',
    email: typeof draft?.booking?.email === 'string' ? draft.booking.email : '',
    phone: typeof draft?.booking?.phone === 'string' ? draft.booking.phone : '',
    address: typeof draft?.booking?.address === 'string' ? draft.booking.address : '',
  }))
  const [payment, setPayment] = useState(() => ({
    method: draft?.payment?.method === 'online' ? 'online' : 'on_hand', // 'on_hand' or 'online'
    paymentType: draft?.payment?.paymentType === 'full' ? 'full' : 'downpayment', // on_hand: downpayment only, online: downpayment or full
    selectedAccount: typeof draft?.payment?.selectedAccount === 'string' ? draft.payment.selectedAccount : '',
    amount: typeof draft?.payment?.amount === 'string' ? draft.payment.amount : '',
    proofFile: null,
    proofPreview: null,
  }))
  const [formErrors, setFormErrors] = useState({ email: '', phone: '', payment: '' })
  const [rescheduling, setRescheduling] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [prefillServiceIds, setPrefillServiceIds] = useState([])
  const [prefillStylistId, setPrefillStylistId] = useState('')
  const [prefillVariantId, setPrefillVariantId] = useState('')
  const [hasAppliedServicePrefill, setHasAppliedServicePrefill] = useState(false)
  const navigate = useNavigate()
  const selectedServiceIdsForStylistFilter = (selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : []))
    .map((id) => String(id || '').trim())
    .filter(Boolean)
  const hasSelectedServicesForStylistFilter = selectedServiceIdsForStylistFilter.length > 0
  const specializationIdSet = specializedStylistIds ? new Set(specializedStylistIds.map((id) => String(id))) : null
  const specializationScopedStylists = specializationIdSet
    ? stylists.filter((stylist) => specializationIdSet.has(String(stylist.id)))
    : stylists
  const selectedServiceFilterKey = selectedServiceIdsForStylistFilter.join(',')
  const specializationScopedStylistKey = specializationScopedStylists.map((stylist) => String(stylist.id)).join(',')

  const clearBookingDraft = () => {
    try {
      window.sessionStorage.removeItem(BOOK_APPOINTMENT_DRAFT_KEY)
    } catch {
      // Ignore session storage errors
    }
  }

  useEffect(() => {
    try {
      if (shouldRestoreDraft) {
        window.sessionStorage.removeItem(BOOK_APPOINTMENT_RESTORE_KEY)
      } else {
        clearBookingDraft()
      }
    } catch {
      if (!shouldRestoreDraft) {
        clearBookingDraft()
      }
    }
  }, [shouldRestoreDraft])

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        const currentPath = `${window.location.pathname}${window.location.search}`
        if (window.location.pathname === '/book') {
          window.sessionStorage.setItem(BOOK_APPOINTMENT_RESTORE_KEY, currentPath)
        }
      } catch {
        // Ignore session storage errors
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    refreshData()
    const params = new URLSearchParams(window.location.search)
    const appointmentId = params.get('reschedule') || params.get('appointment')
    const servicesParam = params.get('services')
    const stylistParam = params.get('stylist')
    const variantParam = params.get('variant_id') || params.get('variant')
    if (servicesParam) {
      const ids = servicesParam
        .split(',')
        .map(id => id.trim())
        .filter(Boolean)
      setPrefillServiceIds(ids)
      setHasAppliedServicePrefill(false)
    } else {
      setPrefillServiceIds([])
      setHasAppliedServicePrefill(true)
    }
    if (variantParam) {
      setPrefillVariantId(variantParam.trim())
    } else {
      setPrefillVariantId('')
    }
    if (stylistParam) {
      setPrefillStylistId(stylistParam.trim())
    } else {
      setPrefillStylistId('')
    }
    if (appointmentId) {
      loadAppointmentForReschedule(appointmentId)
      return
    }

    const isServiceEntry = Boolean(servicesParam)
    if (isServiceEntry && !shouldRestoreDraft) {
      setStep(1)
      setSelectedSlot(null)
      setBooking({
        name: '',
        email: '',
        phone: '',
        address: '',
      })
      setFormErrors({ email: '', phone: '', payment: '' })
      setPayment({
        method: 'on_hand',
        paymentType: 'downpayment',
        selectedAccount: '',
        amount: '',
        proofFile: null,
        proofPreview: null,
      })
    }
  }, [shouldRestoreDraft])

  useEffect(() => {
    if (!prefillVariantId || services.length === 0) return

    const targetServiceId = prefillServiceIds[0] || selectedService || ''
    if (!targetServiceId) return

    const service = services.find((item) => String(item.id) === String(targetServiceId))
    if (!service || !Array.isArray(service.variants) || service.variants.length === 0) return

    const parsedVariantId = Number(prefillVariantId)
    if (!Number.isFinite(parsedVariantId)) return
    const hasVariant = service.variants.some((variant) => Number(variant.id) === parsedVariantId)
    if (!hasVariant) return

    setSelectedVariants((prev) => {
      const existing = Number(prev[service.id])
      if (existing === parsedVariantId) return prev
      return {
        ...prev,
        [service.id]: parsedVariantId,
      }
    })
  }, [prefillVariantId, prefillServiceIds, selectedService, services])

  useEffect(() => {
    if (rescheduling) {
      return
    }

    if (services.length === 0) {
      return
    }

    if (prefillServiceIds.length > 0 && !hasAppliedServicePrefill) {
      const validIds = services
        .map(s => s.id.toString())
        .filter(id => prefillServiceIds.includes(id))
      const nextPrimaryService = validIds[0] || ''
      if (!areStringArraysEqual(selectedServices, validIds)) {
        setSelectedServices(validIds)
      }
      if (selectedService !== nextPrimaryService) {
        setSelectedService(nextPrimaryService)
      }
      setHasAppliedServicePrefill(true)
      return
    }

    if (selectedServices.length > 0 || selectedService) {
      const validIds = services.map(s => s.id.toString())
      const normalizedSelectedServices = selectedServices.filter(id => validIds.includes(id))
      if (normalizedSelectedServices.length !== selectedServices.length) {
        setSelectedServices(normalizedSelectedServices)
      }

      if (!selectedService && normalizedSelectedServices.length > 0) {
        setSelectedService(normalizedSelectedServices[0])
      }

      if (selectedService && !validIds.includes(selectedService)) {
        setSelectedService(normalizedSelectedServices[0] || '')
      }
      return
    }

    // No services selected from homepage, keep booking dashboard cleared
    if (selectedServices.length > 0) {
      setSelectedServices([])
    }
    if (selectedService) {
      setSelectedService('')
    }
    if (Object.keys(selectedVariants).length > 0) {
      setSelectedVariants({})
    }
    if (selectedSlot) {
      setSelectedSlot(null)
    }
  }, [services, prefillServiceIds, hasAppliedServicePrefill, rescheduling, selectedServices, selectedService, selectedVariants, selectedSlot])

  useEffect(() => {
    if (!hasSelectedServicesForStylistFilter) {
      setSpecializedStylistIds(null)
      setStylistSpecializationNames({})
      setSpecializationFilterError('')
      setSpecializationFilterLoading(false)
      return
    }

    let isCancelled = false

    const loadStylistsByServices = async () => {
      const serviceIds = selectedServiceFilterKey
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)

      try {
        setSpecializationFilterLoading(true)
        setSpecializationFilterError('')

        const response = await api.get('/api/stylists/by-services', {
          params: { services: serviceIds },
        })

        if (isCancelled) return

        const payload = Array.isArray(response?.data?.data)
          ? response.data.data
          : (Array.isArray(response?.data) ? response.data : [])

        const ids = payload
          .map((item) => String(item?.id || '').trim())
          .filter(Boolean)

        const specializationMap = {}
        payload.forEach((item) => {
          const stylistId = String(item?.id || '').trim()
          if (!stylistId) return
          specializationMap[stylistId] = Array.isArray(item?.specialization_names)
            ? item.specialization_names.filter(Boolean)
            : []
        })

        // If no stylist matches selected services, fall back to full list so booking is not blocked.
        if (ids.length === 0) {
          setSpecializedStylistIds(null)
          setStylistSpecializationNames({})
          setSpecializationFilterError('No exact specialization match found. Showing all stylists.')
          return
        }

        setSpecializedStylistIds(ids)
        setStylistSpecializationNames(specializationMap)

        if (!rescheduling) {
          setSelectedStylist((previousValue) => {
            const normalizedPrevious = String(previousValue || '')
            if (!normalizedPrevious || normalizedPrevious.toUpperCase() === AUTO_STYLIST_VALUE) {
              return previousValue
            }
            return ids.includes(normalizedPrevious) ? previousValue : AUTO_STYLIST_VALUE
          })
        }
      } catch (error) {
        if (isCancelled) return
        console.error('Failed to filter stylists by selected services:', error)
        setSpecializedStylistIds(null)
        setStylistSpecializationNames({})
        setSpecializationFilterError('Unable to load stylist specializations right now. Showing the full stylist list.')
      } finally {
        if (!isCancelled) {
          setSpecializationFilterLoading(false)
        }
      }
    }

    loadStylistsByServices()

    return () => {
      isCancelled = true
    }
  }, [hasSelectedServicesForStylistFilter, rescheduling, selectedServiceFilterKey])

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
        setSelectedStylist(String(stylistMatch.id))
      }
      return
    }

    if (String(selectedStylist || '').toUpperCase() === AUTO_STYLIST_VALUE) {
      return
    }

    if (selectedStylist) {
      const stylistMatch = stylists.find(s => s.id.toString() === String(selectedStylist))
      if (stylistMatch) {
        return
      }
    }

    // No prefill stylist provided, keep stylist selection cleared
    setSelectedStylist('')
  }, [stylists, prefillStylistId, rescheduling, selectedStylist])

  useEffect(() => {
    if (step === 2 && (selectedStylist || specializationScopedStylists[0])) {
      // Only fetch if we have at least one service selected
      const hasServices = selectedServices.length > 0 || selectedService
      if (hasServices) {
        fetchAvailability()
      } else {
        setAvailabilityLoading(false)
        setAvailability([])
        setSelectedSlot(null)
      }
    }
  }, [selectedDate, selectedStylist, selectedService, selectedServices, specializationScopedStylistKey, step])

  useEffect(() => {
    if (receipt) return

    const draftPayload = {
      step: normalizeStepValue(step),
      selectedDate,
      calendarMonth,
      calendarYear,
      selectedStylist: selectedStylist ? String(selectedStylist) : '',
      selectedService: selectedService ? String(selectedService) : '',
      selectedServices: selectedServices.map((id) => String(id)).filter(Boolean),
      selectedVariants,
      selectedSlot: selectedSlot
        ? {
          start: selectedSlot.start,
          end: selectedSlot.end,
          available: selectedSlot.available !== false,
        }
        : null,
      booking: {
        name: booking.name || '',
        email: booking.email || '',
        phone: booking.phone || '',
        address: booking.address || '',
      },
      payment: {
        method: payment.method === 'online' ? 'online' : 'on_hand',
        paymentType: payment.paymentType === 'full' ? 'full' : 'downpayment',
        selectedAccount: payment.selectedAccount || '',
        amount: payment.amount || '',
      },
    }

    try {
      window.sessionStorage.setItem(BOOK_APPOINTMENT_DRAFT_KEY, JSON.stringify(draftPayload))
    } catch {
      // Ignore session storage errors
    }
  }, [
    step,
    selectedDate,
    calendarMonth,
    calendarYear,
    selectedStylist,
    selectedService,
    selectedServices,
    selectedVariants,
    selectedSlot,
    booking,
    payment.method,
    payment.paymentType,
    payment.selectedAccount,
    payment.amount,
    receipt,
  ])

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
      const endSource = appt.end_datetime_pht || appt.end_datetime
      setSelectedDate(startSource.slice(0, 10))
      setSelectedStylist(appt.stylist_id ? String(appt.stylist_id) : '')
      setSelectedService(appt.service_id)
      setSelectedSlot({
        start: startSource,
        end: endSource,
        available: true,
      })
      setBooking({
        name: appt.customer_name,
        email: appt.customer_email || '',
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
    const selectedServiceId = selectedService || selectedServices[0] || ''
    const stylistId = effectiveStylistId || specializationScopedStylists[0]?.id
    if (!stylistId || !selectedServiceId) {
      setAvailabilityLoading(false)
      setAvailability([])
      return
    }

    try {
      setAvailabilityLoading(true)
      const availabilityParams = {
        params: { date: selectedDate, service_id: selectedServiceId },
        timeout: 15000,
      }

      let res
      try {
        // Prefer stateless API route to avoid session-lock related pending requests.
        res = await api.get(`/api/stylists/${stylistId}/availability`, availabilityParams)
      } catch (primaryError) {
        res = await api.get(`/stylists/${stylistId}/availability`, availabilityParams)
        if (import.meta.env.DEV) {
          // Keep primary error visible in development while fallback succeeds.
          console.warn('Primary availability route failed, fallback route succeeded.', primaryError)
        }
      }
      setAvailability(res.data || [])
      // Clear selected slot if it's no longer available
      if (selectedSlot) {
        const slotStillAvailable = res.data?.some(slot => 
          new Date(slot.start).getTime() === new Date(selectedSlot.start).getTime() &&
          slot.available !== false
        )
        if (!slotStillAvailable) {
          const currentRescheduleStart = rescheduling
            ? new Date(rescheduling.start_datetime_pht || rescheduling.start_datetime).getTime()
            : null
          const selectedStart = new Date(selectedSlot.start).getTime()
          const isCurrentAppointmentSlot = Boolean(currentRescheduleStart) && selectedStart === currentRescheduleStart

          if (!isCurrentAppointmentSlot) {
            setSelectedSlot(null)
            toast.warn('The selected time slot is no longer available. Please choose another time.')
          }
        }
      }
    } catch (e) {
      console.error(e)
      toast.error('Failed to load available time slots. Please try again.')
      setAvailability([])
      setSelectedSlot(null)
    } finally {
      setAvailabilityLoading(false)
    }
  }

  const handleNextStep = () => {
    if (!booking.name.trim()) {
      toast.warn('Please enter your name')
      return
    }
    if (!booking.email.trim()) {
      toast.warn('Please enter your email')
      setFormErrors(prev => ({ ...prev, email: 'Email is required' }))
      return
    }
    if (!booking.phone.trim()) {
      toast.warn('Please enter your contact number')
      return
    }
    
    // Validate email
    const emailValidation = validateEmail(booking.email)

    // Validate phone
    const phoneValidation = validatePhone(booking.phone)
    
    setFormErrors({
      email: emailValidation.message,
      phone: phoneValidation.message
    })
    
    if (!emailValidation.valid || !phoneValidation.valid) {
      toast.error('Please enter valid customer information')
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
    
    if (!effectiveStylistId) {
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
      const normalizedPaymentType = payment.method === 'online'
        ? (payment.paymentType === 'full' ? 'full' : 'downpayment')
        : 'downpayment'

      if (payment.method === 'online') {
        if (normalizedPaymentType === 'full') {
          paymentAmountCents = totalAmountCents
        } else {
          // Downpayment - use entered amount or default to 50%
          paymentAmountCents = payment.amount ? Math.round(parseFloat(payment.amount) * 100) : Math.round(totalAmountCents * 0.5)
          const minDepositCents = Math.round(totalAmountCents * 0.5)
          if (!Number.isFinite(paymentAmountCents) || paymentAmountCents < minDepositCents) {
            toast.warn(`Minimum GCash downpayment is ${currency(minDepositCents)}`)
            setLoading(false)
            return
          }
        }
      } else if (payment.method === 'on_hand') {
        if (!payment.amount) {
          // Downpayment only - default to 50%
          paymentAmountCents = Math.round(totalAmountCents * 0.5)
        } else {
          paymentAmountCents = Math.round(parseFloat(payment.amount) * 100)
        }
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
      formData.append('customer_email', booking.email ? booking.email.trim().toLowerCase() : '')
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
      
      if (effectiveStylistId) {
        formData.append('stylist_id', effectiveStylistId)
      }
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
        if (payment.proofFile) {
          formData.append('payment_proof', payment.proofFile)
        }
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

      // Keep customer identity for dashboard lookup after booking confirmation.
      if (booking.email) {
        localStorage.setItem('customer_email', booking.email.trim().toLowerCase())
      }
      if (booking.phone) {
        localStorage.setItem('customer_phone', booking.phone.replace(/[\s-]/g, ''))
      }
      
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

      
      const res = await api.patch(`/appointments/${rescheduling.id}`, {
        date: selectedDate,
        preferred_time: preferredTime,
      })
      const updatedAppointment = res?.data?.appointment || res?.data || null
      if (updatedAppointment?.id) {
        setReceipt(updatedAppointment)
      }
      toast.success('Appointment rescheduled successfully!')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Reschedule failed')
    }
  }

  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`
  const selectedServiceData = services.find(s => s.id === parseInt(selectedService)) // For backward compatibility
  const isAutoStylistSelected = String(selectedStylist || '').toUpperCase() === AUTO_STYLIST_VALUE
  const selectedStylistData = specializationScopedStylists.find((s) => s.id.toString() === String(selectedStylist))
    || stylists.find((s) => s.id.toString() === String(selectedStylist))
  const effectiveStylistData = isAutoStylistSelected ? (specializationScopedStylists[0] || null) : selectedStylistData
  const effectiveStylistId = effectiveStylistData?.id ? String(effectiveStylistData.id) : ''
  const visibleStylists = filterStylists(specializationScopedStylists, stylistSearch, stylistFilter)
  const stylistFilterOptions = [
    { key: 'all', label: 'All' },
    { key: 'available', label: 'Available' },
    { key: 'busy', label: 'Busy' },
    { key: 'off', label: 'Off' },
    { key: 'fully_booked', label: 'Fully Booked' },
  ]
  const selectedDateLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'Not selected'
  const selectedTimeLabel = selectedSlot
    ? `${new Date(selectedSlot.start).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    })} - ${new Date(selectedSlot.end).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    })}`
    : 'Select a time slot'

  const selectedServiceIdsForSummary = selectedServices.length > 0
    ? selectedServices
    : (selectedService ? [selectedService] : [])
  const selectedServicesForSummary = services.filter(s => selectedServiceIdsForSummary.includes(s.id.toString()))
  const selectedServicesLabel = selectedServicesForSummary
    .map((service) => {
      if (service.variants && service.variants.length > 0 && selectedVariants[service.id]) {
        const variant = service.variants.find(v => v.id === selectedVariants[service.id])
        if (variant) {
          return `${service.name} - ${variant.name}`
        }
      }
      return service.name
    })
  const totalPriceForSummary = selectedServicesForSummary.reduce((sum, service) => {
    if (service.variants && service.variants.length > 0 && selectedVariants[service.id]) {
      const variant = service.variants.find(v => v.id === selectedVariants[service.id])
      return sum + (variant ? variant.price_cents : service.price_cents)
    }
    return sum + service.price_cents
  }, 0)
  const canContinueStepTwo = Boolean(selectedSlot && selectedServiceIdsForSummary.length > 0 && effectiveStylistId)

  const handleContinueFromStepTwo = () => {
    if (!canContinueStepTwo) {
      toast.warn('Please complete all booking details')
      return
    }

    if (payment.method === 'online' || payment.method === 'on_hand') {
      setStep(3)
      return
    }

    handleBook()
  }

  return (
    <div className="booking-page min-h-screen app-panel-bg">
      {/* Header */}
      <header className="booking-nav px-4 md:px-6">
        <div className="max-w-[1700px] mx-auto py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="booking-brand flex items-center gap-3 min-w-0"
            >
              <span className="booking-logo-mark" aria-hidden="true">
                <img
                  src="/logo-transparent.png"
                  alt="Kaye's Hair Salon logo"
                  className="booking-logo-image"
                />
              </span>
              <span className="truncate text-base md:text-lg font-semibold text-[#2C1338]">Kaye&apos;s Hair Salon and Spa</span>
            </button>
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <button onClick={() => navigate('/')} className="booking-nav-link">Home</button>
              <button onClick={() => navigate('/services')} className="booking-nav-link">Services</button>
              <button onClick={() => navigate('/stylists')} className="booking-nav-link">Stylists</button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {step !== 1 && (
              <button
                onClick={() => navigate('/manage-booking/start')}
                className="tap-safe booking-outline-btn"
              >
                Manage My Booking
              </button>
            )}
            <button
              onClick={() => navigate('/book')}
              className="tap-safe booking-cta-pill"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-[1700px] mx-auto px-4 md:px-6 pt-6">
        <div className="booking-hero rounded-3xl px-6 md:px-10 py-8 md:py-10 text-center md:text-left">
          <h1 className="booking-hero-title fluid-title-lg font-bold">Book Your Salon Appointment</h1>
          <p className="booking-hero-subtitle mt-2 text-base md:text-lg">
            Schedule your visit with our professional stylists
          </p>
        </div>
      </section>

      <div className="app-mobile-shell space-y-6 max-w-[1700px] mx-auto w-full">
      
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="booking-stepper flex items-start">
          <div className="booking-step-item">
            <div className={`booking-step-circle ${step >= 1 ? 'active' : ''}`}>
              1
            </div>
            <div className="booking-step-label">Customer Information</div>
          </div>
          <div className={`booking-step-line ${step >= 2 ? 'active' : ''}`}></div>
          <div className="booking-step-item">
            <div className={`booking-step-circle ${step >= 2 ? 'active' : ''}`}>
              2
            </div>
            <div className="booking-step-label">Select Service</div>
          </div>
          <div className={`booking-step-line ${step >= 3 ? 'active' : ''}`}></div>
          <div className="booking-step-item">
            <div className={`booking-step-circle ${step >= 3 ? 'active' : ''}`}>
              3
            </div>
            <div className="booking-step-label">Confirm Booking</div>
          </div>
        </div>
      </div>

      {/* Step 1: Customer Information */}
      {step === 1 && (
        <div className="booking-step-card bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_18px_36px_rgba(94,64,102,0.12)] p-5 sm:p-8 md:p-10 max-w-5xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">Customer Information</h2>
          <p className="text-base md:text-lg text-gray-700 mb-7">Please provide your information to proceed with booking</p>
          
          <div className="space-y-5">
            <div>
              <label className="block text-base font-medium mb-2 text-gray-900">Full Name *</label>
              <div className="booking-input-wrap">
                <span className="booking-input-icon" aria-hidden="true">👤</span>
                <input
                  type="text"
                  required
                  className="booking-input w-full border rounded-xl pl-11 pr-4 py-3.5 text-base text-gray-900 placeholder-gray-500"
                  placeholder="Enter your full name"
                  value={booking.name}
                  onChange={e => setBooking({ ...booking, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-medium mb-2 text-gray-900">Email *</label>
              <div className="booking-input-wrap">
                <span className="booking-input-icon" aria-hidden="true">✉</span>
                <input
                  type="email"
                  required
                  className={`booking-input w-full border rounded-xl pl-11 pr-4 py-3.5 text-base text-gray-900 placeholder-gray-500 ${formErrors.email ? 'border-red-500' : ''}`}
                  placeholder="your@email.com"
                  value={booking.email}
                  onChange={e => {
                    setBooking({ ...booking, email: e.target.value })
                    const validation = validateEmail(e.target.value)
                    setFormErrors(prev => ({ ...prev, email: validation.message }))
                  }}
                />
              </div>
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>
            
            <div>
              <label className="block text-base font-medium mb-2 text-gray-900">Contact Number *</label>
              <div className="booking-input-wrap">
                <span className="booking-input-icon" aria-hidden="true">📞</span>
                <input
                  type="tel"
                  required
                  className={`booking-input w-full border rounded-xl pl-11 pr-4 py-3.5 text-base text-gray-900 placeholder-gray-500 ${formErrors.phone ? 'border-red-500' : ''}`}
                  placeholder="09XXXXXXXXX"
                  value={booking.phone}
                  onChange={e => {
                    setBooking({ ...booking, phone: e.target.value })
                    const validation = validatePhone(e.target.value)
                    setFormErrors(prev => ({ ...prev, phone: validation.message }))
                  }}
                />
              </div>
              {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            
            <div>
              <label className="block text-base font-medium mb-2 text-gray-900">Address</label>
              <div className="booking-input-wrap">
                <span className="booking-input-icon" aria-hidden="true">📍</span>
                <input
                  type="text"
                  className="booking-input w-full border rounded-xl pl-11 pr-4 py-3.5 text-base text-gray-900 placeholder-gray-500"
                  placeholder="Your address"
                  value={booking.address}
                  onChange={e => setBooking({ ...booking, address: e.target.value })}
                />
              </div>
            </div>
            
            <button
              onClick={handleNextStep}
              className="booking-primary-btn w-full mt-4 text-base font-semibold px-5 py-3.5 rounded-xl"
            >
              Continue to Booking
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Booking Details */}
      {step === 2 && (
        <>
          <div className="booking-step-card booking-step2-shell bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_14px_30px_rgba(94,64,102,0.1)] p-5 md:p-6">
            <div className="booking-step2-layout">
              <div className="booking-step2-column">
                <label className="text-sm text-[#2C1338] font-semibold tracking-wide">Stylist Selection *</label>
                {/* Keep select in DOM for compatibility with existing state shape and fallback behavior */}
                <select
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                  value={selectedStylist}
                  onChange={e => setSelectedStylist(e.target.value)}
                >
                  <option value="">Select Stylist</option>
                  <option value={AUTO_STYLIST_VALUE}>No Preference</option>
                  {specializationScopedStylists.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <div className="booking-panel mt-3 rounded-2xl border border-[#ece6f4] bg-white p-4 shadow-[0_8px_20px_rgba(44,19,56,0.06)]">
                  <input
                    type="text"
                    value={stylistSearch}
                    onChange={(e) => setStylistSearch(e.target.value)}
                    placeholder="Search stylist, role, specialty..."
                    className="w-full border border-[#e7e1ef] rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#f8c8dc] focus:border-[#E75480]"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stylistFilterOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setStylistFilter(option.key)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition ${
                          stylistFilter === option.key
                            ? 'bg-[#E75480] text-white border-[#E75480]'
                            : 'bg-[#faf8fd] text-[#5f4a70] border-[#e9e2f2] hover:bg-[#f3edf9]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  {hasSelectedServicesForStylistFilter && (
                    <div className="mt-3 space-y-2">
                      {specializationFilterLoading && (
                        <div className="rounded-lg border border-[#f3cade] bg-[#fff4f9] px-3 py-2 text-xs text-[#7e405a]">
                          Filtering stylists based on selected services...
                        </div>
                      )}
                      {!specializationFilterLoading && specializationFilterError && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          {specializationFilterError}
                        </div>
                      )}
                      {!specializationFilterLoading && !specializationFilterError && specializationScopedStylists.length === 0 && (
                        <div className="rounded-lg border border-dashed border-[#e9e2f2] bg-[#faf8fd] px-3 py-3 text-xs text-[#7c688f]">
                          No stylists match the selected services. Try removing a service or choose No Preference.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 max-h-[560px] overflow-y-auto space-y-3 pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStylist(AUTO_STYLIST_VALUE)}
                      className={`w-full rounded-lg border px-4 py-4 text-left transition ${
                        isAutoStylistSelected
                          ? 'border-[#E75480] bg-[#fff4f9]'
                          : 'border-[#e9e2f2] bg-white hover:bg-[#faf8fd]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#fff1f7] text-[#b44d71] flex items-center justify-center text-lg">
                          ⭐
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base text-[#2C1338]">No Preference (Auto-Assign Best Available)</div>
                          <div className="text-sm text-[#6f5b7e] mt-1">The system will choose an available stylist for your selected schedule.</div>
                        </div>
                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          isAutoStylistSelected ? 'border-[#E75480] bg-[#E75480]' : 'border-[#d6c7ba]'
                        }`}>
                          {isAutoStylistSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>

                    {visibleStylists.length === 0 && (!hasSelectedServicesForStylistFilter || specializationScopedStylists.length > 0) && (
                      <div className="rounded-lg border border-dashed border-[#e9e2f2] bg-[#faf8fd] px-3 py-4 text-xs text-[#7c688f] text-center">
                        No stylists found for the current search/filter.
                      </div>
                    )}

                    {visibleStylists.map((stylist) => {
                      const stylistId = String(stylist.id)
                      const status = normalizeStylistStatus(stylist)
                      const statusLabel = getStatusLabel(status)
                      const statusClass = getStatusClass(status)
                      const isDisabled = (status === 'off' || status === 'fully_booked') && selectedStylist !== stylistId
                      const isSelected = selectedStylist === stylistId
                      const name = stylist?.name || 'Unnamed stylist'
                      const initials = name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase() || '')
                        .join('') || 'ST'
                      const specialty = Array.isArray(stylist?.specialties)
                        ? stylist.specialties.filter(Boolean).join(', ')
                        : (stylist?.specialties || '')
                      const specializationNames = Array.isArray(stylistSpecializationNames[stylistId])
                        ? stylistSpecializationNames[stylistId].filter(Boolean)
                        : []
                      const metaLabel = specialty || specializationNames.join(', ') || stylist?.role || 'Stylist'
                      const nextAvailable = stylist?.next_available || stylist?.nextAvailable || ''
                      const imageSrc = stylist?.image
                        ? (String(stylist.image).startsWith('http')
                          ? stylist.image
                          : `/${String(stylist.image).replace(/^\/+/, '')}`)
                        : null

                      return (
                        <button
                          key={stylist.id}
                          type="button"
                          onClick={() => !isDisabled && setSelectedStylist(stylistId)}
                          disabled={isDisabled}
                          title={isDisabled ? 'No slots available today' : `Select ${name}`}
                          className={`w-full rounded-lg border px-4 py-4 text-left transition ${
                            isDisabled
                              ? 'opacity-60 cursor-not-allowed bg-[#f8f4ef] border-[#eadfd5]'
                              : isSelected
                                ? 'border-[#E75480] bg-[#fff4f9]'
                                : 'border-[#e9e2f2] bg-white hover:bg-[#faf8fd]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative h-12 w-12 rounded-full bg-[#fff1f7] text-[#7b4f63] flex items-center justify-center text-sm font-semibold overflow-hidden">
                              <span>{initials}</span>
                              {imageSrc && (
                                <img
                                  src={imageSrc}
                                  alt={name}
                                  className="absolute inset-0 h-full w-full object-cover"
                                  onError={(event) => {
                                    event.currentTarget.style.display = 'none'
                                  }}
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-base text-[#2C1338] truncate">{name}</div>
                              <div className="text-sm text-[#6f5b7e] truncate">{metaLabel}</div>
                              {specializationNames.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {specializationNames.slice(0, 3).map((serviceName) => (
                                    <span
                                      key={`${stylistId}-${serviceName}`}
                                      className="px-2 py-0.5 rounded-full bg-[#f4edf9] text-[10px] font-medium text-[#614175]"
                                    >
                                      {serviceName}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                  {statusLabel}
                                </span>
                                <span className="text-xs text-[#6f5b7e]">
                                  {nextAvailable
                                    ? `Next available: ${nextAvailable}`
                                    : (status === 'off' || status === 'fully_booked' ? 'No slots today' : 'Next available: -')}
                                </span>
                              </div>
                            </div>
                            <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#E75480] bg-[#E75480]' : 'border-[#d6c7ba]'
                            }`}>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="booking-step2-column">
                <label className="text-sm text-[#2C1338] font-semibold tracking-wide">Service Selection * (Select one or more)</label>
                <div className="booking-panel mt-3 max-h-[560px] overflow-y-auto border border-[#ece6f4] rounded-2xl p-4 space-y-3 bg-white shadow-[0_8px_20px_rgba(44,19,56,0.06)]">
                  {services.map(s => {
                    const serviceIdStr = s.id.toString()
                    const isSelected = selectedServices.includes(serviceIdStr) || selectedService === serviceIdStr
                    
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                          isSelected ? 'bg-[#fff4f9] border-[#E75480]' : 'border-[#ece6f4] hover:border-[#e7bdd0] hover:bg-[#fff9fc]'
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
                          className="w-5 h-5 text-[#E75480] rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-[#2C1338] text-lg leading-tight">{s.name}</div>
                          {s.variants && s.variants.length > 0 ? (
                            <div className="text-sm text-[#5a4767] mt-1">
                              <div className="font-medium text-[#E75480] mb-1.5">
                                {s.variants.length} variant{s.variants.length > 1 ? 's' : ''} available
                              </div>
                              {isSelected && (
                                <div className="mt-2 space-y-1">
                                  {s.variants.map(variant => (
                                    <label
                                      key={variant.id}
                                      className="flex items-center gap-2 p-1.5 hover:bg-[#f7f2fb] rounded-lg cursor-pointer"
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
                                        className="w-3 h-3 text-[#E75480]"
                                      />
                                      <span className="text-sm text-[#4a3756]">
                                        {variant.name} - {currency(variant.price_cents)}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-[#5a4767]">
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
                    <div className="text-sm font-semibold text-[#E75480] mt-3">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected |
                      Total: {currency(totalPrice)}
                    </div>
                  )
                })()}
              </div>
              <div className="booking-step2-column booking-summary-column">
                <div className="booking-panel booking-summary-panel rounded-2xl border border-[#ece6f4] bg-white p-4 shadow-[0_8px_20px_rgba(44,19,56,0.07)]">
                  <label className="text-sm text-[#2C1338] font-semibold tracking-wide">Booking Summary</label>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="rounded-xl border border-[#efe8f5] bg-[#faf8fd] px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Customer</div>
                      <div className="font-semibold text-[#2C1338]">{booking.name || 'Not provided'}</div>
                      {booking.email && <div className="text-xs text-[#645272]">{booking.email}</div>}
                      {booking.phone && <div className="text-xs text-[#645272]">{booking.phone}</div>}
                    </div>

                    <div className="rounded-xl border border-[#efe8f5] bg-white px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Stylist</div>
                      <div className="font-medium text-[#2C1338]">
                        {isAutoStylistSelected
                          ? (effectiveStylistData?.name
                            ? `${effectiveStylistData.name} (Auto-assigned)`
                            : 'No Preference (Auto-Assign)')
                          : (selectedStylistData?.name || 'Not selected')}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#efe8f5] bg-white px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Services</div>
                      {selectedServicesLabel.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {selectedServicesLabel.slice(0, 3).map((serviceName) => (
                            <li key={serviceName} className="text-xs text-[#4e3b5b]">{serviceName}</li>
                          ))}
                          {selectedServicesLabel.length > 3 && (
                            <li className="text-xs text-[#7c688f]">+{selectedServicesLabel.length - 3} more</li>
                          )}
                        </ul>
                      ) : (
                        <div className="text-xs text-[#7c688f] mt-1">No services selected</div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-[#efe8f5] bg-white px-3 py-2.5">
                        <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Date</div>
                        <div className="text-xs font-medium text-[#2C1338]">{selectedDateLabel}</div>
                      </div>
                      <div className="rounded-xl border border-[#efe8f5] bg-white px-3 py-2.5">
                        <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Time</div>
                        <div className="text-xs font-medium text-[#2C1338]">{selectedTimeLabel}</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#f5d6e4] bg-[#fff6fa] px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-[#8f5170]">Total Price</div>
                      <div className="text-lg font-semibold text-[#2C1338]">{currency(totalPriceForSummary)}</div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setStep(1)}
                        className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl text-sm"
                      >
                        Back to Customer Info
                      </button>
                      {rescheduling ? (
                        <button
                          onClick={handleReschedule}
                          disabled={!selectedSlot}
                          className="tap-safe bg-amber-500 text-white px-4 py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50"
                        >
                          Confirm Reschedule
                        </button>
                      ) : (
                        <button
                          onClick={handleContinueFromStepTwo}
                          disabled={!canContinueStepTwo}
                          className="tap-safe booking-primary-btn px-4 py-2.5 rounded-xl disabled:opacity-50"
                        >
                          {payment.method === 'online' || payment.method === 'on_hand' ? 'Continue to Payment ->' : 'Confirm Booking'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="booking-step2-schedule-grid grid xl:grid-cols-2 gap-4">
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
              loading={availabilityLoading}
              ready={Boolean((effectiveStylistId || stylists[0]?.id) && (selectedService || selectedServices.length > 0))}
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

          <div className="booking-panel bg-white rounded-2xl border border-[#ece6f4] shadow-[0_10px_24px_rgba(44,19,56,0.07)] p-4">
            <h3 className="font-semibold mb-2 text-[#2C1338]">Selected Schedule</h3>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-[#faf8fd] border border-[#efe8f5] px-3 py-2 text-[#4e3b5b]">
                <span className="font-medium">Date:</span> {selectedDateLabel}
              </div>
              <div className="rounded-lg bg-[#faf8fd] border border-[#efe8f5] px-3 py-2 text-[#4e3b5b]">
                <span className="font-medium">Time:</span> {selectedTimeLabel}
              </div>
            </div>
          </div>

          <div className="booking-step2-mobile-actions flex flex-col sm:flex-row gap-3 xl:hidden">
            <button
              onClick={() => setStep(1)}
              className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl"
            >
              Back
            </button>
            {rescheduling ? (
              <button
                onClick={handleReschedule}
                disabled={!selectedSlot}
                className="tap-safe bg-amber-500 text-white px-4 py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50"
              >
                Confirm Reschedule
              </button>
            ) : (
              <button
                onClick={handleContinueFromStepTwo}
                disabled={!canContinueStepTwo}
                className="tap-safe booking-primary-btn px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {payment.method === 'online' || payment.method === 'on_hand' ? 'Continue to Payment ->' : 'Confirm Booking'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (payment.method === 'online' || payment.method === 'on_hand') && (() => {
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
        
        const minDownpayment = totalAmount * 0.5
        const parsedPaymentAmount = parseFloat(payment.amount)
        const selectedPaymentType = payment.method === 'online'
          ? (payment.paymentType === 'full' ? 'full' : 'downpayment')
          : 'downpayment'

        // Calculate payment amount based on type
        const paymentAmount = selectedPaymentType === 'full'
          ? totalAmount
          : (Number.isFinite(parsedPaymentAmount) ? parsedPaymentAmount : minDownpayment)
        
        return (
          <div className="booking-step-card bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_16px_34px_rgba(94,64,102,0.12)] p-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Payment Details</h2>

            {/* Payment Method Selection (moved from Step 2) */}
            <div className="booking-panel bg-white rounded-2xl border border-[#ece6f4] shadow-[0_10px_24px_rgba(44,19,56,0.07)] p-4 mb-4">
              <h3 className="font-semibold mb-3 text-[#2C1338]">Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  payment.method === 'on_hand' ? 'border-[#E75480] bg-[#fff4f9]' : 'border-[#e4dced] hover:border-[#d4c7e2]'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="on_hand"
                    checked={payment.method === 'on_hand'}
                    onChange={(e) => setPayment({
                      ...payment,
                      method: e.target.value,
                      paymentType: 'downpayment',
                      amount: '',
                      proofFile: null,
                      proofPreview: null,
                    })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-semibold text-[#2C1338]">Pay at Salon (Cash)</div>
                    <div className="text-sm text-[#6f5b7e] mt-1">Pay in person after the service</div>
                  </div>
                </label>
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  payment.method === 'online' ? 'border-[#E75480] bg-[#fff4f9]' : 'border-[#e4dced] hover:border-[#d4c7e2]'
                }`}>
                  <input
                    type="radio"
                    name="payment_method"
                    value="online"
                    checked={payment.method === 'online'}
                    onChange={(e) => setPayment({
                      ...payment,
                      method: e.target.value,
                      paymentType: 'downpayment',
                      amount: '',
                      proofFile: null,
                      proofPreview: null,
                    })}
                    className="sr-only"
                  />
                  <div className="text-center">
                    <div className="font-semibold text-[#2C1338]">GCash (Manual)</div>
                    <div className="text-sm text-[#6f5b7e] mt-1">Scan QR, pay via GCash, then upload your receipt</div>
                  </div>
                </label>
              </div>
            </div>

            <p className="text-sm text-[#8f7a6f] mb-4">
              {payment.method === 'online'
                ? (
                  <>Payments are verified manually. Your booking will be marked as <strong>PENDING</strong> until the salon confirms the receipt.</>
                )
                : (
                  <>Cash payments are verified manually. Your booking will be marked as <strong>PENDING</strong> until the salon confirms your deposit.</>
                )}
            </p>
            
            {/* Booking Summary */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2 text-gray-900">Booking Summary</h3>
              <div className="text-sm space-y-1 text-gray-700">
                <div><strong>Total Amount:</strong> {currency(totalAmountCents)}</div>
                <div><strong>Services:</strong> {selectedServicesData.map(s => s.name).join(', ')}</div>
                <div>
                  <strong>Stylist:</strong>{' '}
                  {isAutoStylistSelected
                    ? (effectiveStylistData?.name
                      ? `${effectiveStylistData.name} (Auto-assigned from No Preference)`
                      : 'Auto-assigning stylist')
                    : (selectedStylistData?.name || 'Not selected')}
                </div>
                <div><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                {selectedSlot && (
                  <div><strong>Time:</strong> {new Date(selectedSlot.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}</div>
                )}
              </div>
            </div>

            {/* Payment Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-900">Payment Type *</label>
              <div className={`grid gap-3 ${payment.method === 'online' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  selectedPaymentType === 'downpayment' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="radio"
                    name="payment_type"
                    value="downpayment"
                    checked={selectedPaymentType === 'downpayment'}
                    onChange={() => setPayment({
                      ...payment,
                      paymentType: 'downpayment',
                      amount: '',
                    })}
                    className="sr-only"
                  />
                  <div className="font-semibold text-gray-900">Downpayment</div>
                  <div className="text-sm text-[#8f7a6f] mt-1">Minimum: {currency(Math.round(totalAmountCents * 0.5))}</div>
                </label>

                {payment.method === 'online' && (
                  <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    selectedPaymentType === 'full' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <input
                      type="radio"
                      name="payment_type"
                      value="full"
                      checked={selectedPaymentType === 'full'}
                      onChange={() => setPayment({
                        ...payment,
                        paymentType: 'full',
                        amount: totalAmount.toFixed(2),
                      })}
                      className="sr-only"
                    />
                    <div className="font-semibold text-gray-900">Full Payment</div>
                    <div className="text-sm text-[#8f7a6f] mt-1">Pay the full amount now via GCash</div>
                  </label>
                )}
              </div>
            </div>

            {/* Payment Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1 text-gray-900">
                {selectedPaymentType === 'full' ? 'Full Payment Amount (PHP) *' : 'Downpayment Amount (PHP) *'}
              </label>
              <input
                type="number"
                min={selectedPaymentType === 'full' ? totalAmount : minDownpayment}
                max={totalAmount}
                step="0.01"
                required
                className="tap-safe w-full border rounded px-3 py-2 text-gray-900"
                value={selectedPaymentType === 'full' ? totalAmount.toFixed(2) : (payment.amount || minDownpayment.toFixed(2))}
                readOnly={selectedPaymentType === 'full'}
                onChange={(e) => {
                  if (selectedPaymentType === 'full') {
                    return
                  }
                  const value = parseFloat(e.target.value) || 0
                  if (value >= minDownpayment && value <= totalAmount) {
                    setPayment({ ...payment, amount: e.target.value })
                  } else if (value < minDownpayment) {
                    toast.warn(`Minimum downpayment is ${currency(Math.round(totalAmountCents * 0.5))}`)
                  }
                }}
                placeholder={selectedPaymentType === 'full' ? currency(totalAmountCents) : `Minimum: ${currency(Math.round(totalAmountCents * 0.5))}`}
              />
              <p className="text-xs text-[#9b857a] mt-1">
                {selectedPaymentType === 'full'
                  ? <>Full payment selected | Remaining: {currency(0)}</>
                  : <>Minimum: {currency(Math.round(totalAmountCents * 0.5))} | Remaining: {currency(Math.round((totalAmount - paymentAmount) * 100))}</>}
              </p>
            </div>

            {/* Payment Account Selection */}
            {payment.method === 'online' && paymentAccounts.length > 0 && (
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
                          <div className="text-sm text-[#8f7a6f]">{account.account_number}</div>
                          {account.instructions && (
                            <div className="text-xs text-[#9b857a] mt-1">{account.instructions}</div>
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
                className="tap-safe w-full border rounded px-3 py-2 text-gray-900"
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
              <p className="text-xs text-[#9b857a] mt-1">
                {payment.method === 'online'
                  ? 'Upload a screenshot or photo of your payment transaction'
                  : 'Upload a photo or receipt of your cash deposit'}
              </p>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <span className="text-gray-700">Total Amount:</span>
                <span className="font-bold text-lg text-gray-900">{currency(totalAmountCents)}</span>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2">
                <span className="text-gray-700">{selectedPaymentType === 'full' ? 'Full Payment Amount:' : 'Downpayment Amount:'}</span>
                <span className="font-bold text-lg text-green-600">{currency(Math.round(paymentAmount * 100))}</span>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2 mt-2 pt-2 border-t border-gray-300">
                <span className="text-gray-700">Remaining Balance:</span>
                <span className="font-semibold text-gray-900">{currency(Math.round((totalAmount - paymentAmount) * 100))}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep(2)}
                className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleBook}
                disabled={(
                  !payment.proofFile ||
                  (payment.method === 'online' && !payment.selectedAccount) ||
                  (selectedPaymentType !== 'full' && payment.amount && parseFloat(payment.amount) < totalAmount * 0.5)
                )}
                className="tap-safe booking-primary-btn flex-1 px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {payment.method === 'online' ? 'Confirm Booking & Pay' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )
      })()}

      {receipt && receipt.id && (
        <ReceiptModal 
          appointment={receipt} 
          onClose={() => {
            clearBookingDraft()
            localStorage.removeItem(CUSTOMER_BOOKING_TOKEN_KEY)
            localStorage.removeItem(CUSTOMER_BOOKING_EMAIL_KEY)
            localStorage.removeItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY)
            setReceipt(null)
            setStep(1)
            setSelectedSlot(null)
            // Keep email/phone in form for easy re-booking, but clear other fields
            setBooking({ name: '', email: booking.email, phone: booking.phone, address: '' })
            setFormErrors({ email: '', phone: '', payment: '' })
            navigate('/customer', { replace: true })
          }} 
        />
      )}
      </div>
    </div>
  )
}

export default BookAppointment



