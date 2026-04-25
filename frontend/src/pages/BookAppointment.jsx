import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { toPng } from 'html-to-image'
import imageCompression from 'browser-image-compression'
import api from '../utils/api'
import LandingFooter from '../components/LandingFooter'
import manageBookingApi, {
  CUSTOMER_BOOKING_EMAIL_KEY,
  CUSTOMER_BOOKING_PENDING_EMAIL_KEY,
  CUSTOMER_BOOKING_TOKEN_KEY,
} from '../utils/manageBookingApi'
import returningBookingApi, {
  RETURNING_BOOKING_EMAIL_KEY,
  RETURNING_BOOKING_TOKEN_KEY,
} from '../utils/returningBookingApi'
import {
  clearReturningBookingVerification,
  getManageBookingVerifiedEmail,
  getReturningBookingPendingEmail,
  getReturningBookingVerifiedEmail,
  isManageBookingVerified,
  persistManageBookingVerification,
  persistReturningBookingVerification,
  setReturningBookingPendingEmail,
} from '../utils/customerVerification'
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
    return { valid: false, message: 'Phone must be valid PH number (09XXXXXXXXX)' }
  }
  return { valid: true, message: '' }
}

const normalizeEmailValue = (email) => String(email || '').trim().toLowerCase()

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
const BOOK_APPOINTMENT_RESTORE_KEY = 'book_appointment_restore_once'
const AUTO_STYLIST_VALUE = 'AUTO'

const getTodayDateKey = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDateKey = (value) => {
  if (typeof value === 'string') {
    const directDateMatch = value.trim().match(/^(\d{4}-\d{2}-\d{2})/)
    if (directDateMatch) {
      return directDateMatch[1]
    }
  }

  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  date.setHours(0, 0, 0, 0)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
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

const shouldRestoreBookingDraft = () => {
  if (typeof window === 'undefined') return false
  try {
    const searchParams = new URLSearchParams(window.location.search)
    const hasDirectedBookingEntry = searchParams.get('fresh') === '1'
      || searchParams.has('services')
      || searchParams.has('stylist')
      || searchParams.has('variant')
      || searchParams.has('variant_id')
      || searchParams.has('reschedule')
      || searchParams.has('appointment')

    if (hasDirectedBookingEntry) {
      return false
    }

    const draft = readBookingDraft()
    if (!draft) {
      return false
    }

    // Keep the email-first step clean on refresh, but restore later booking steps.
    if (normalizeStepValue(draft.step) <= 1) {
      return false
    }

    const navigationEntry = typeof window.performance?.getEntriesByType === 'function'
      ? window.performance.getEntriesByType('navigation')[0]
      : null
    const isReload = navigationEntry?.type === 'reload'
      || window.performance?.navigation?.type === 1

    return Boolean(isReload)
  } catch {
    return false
  }
}

const normalizeStepValue = (value) => {
  const num = Number(value)
  if (num === 2 || num === 3 || num === 4) return num
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

const mergeAvailabilitySlots = (availabilityGroups = []) => {
  const slotMap = new Map()

  availabilityGroups.forEach(({ stylistId, slots }) => {
    ;(slots || []).forEach((slot) => {
      const key = `${slot.start}|${slot.end}`
      const isAvailable = slot.available !== false
      const existing = slotMap.get(key)

      if (!existing) {
        slotMap.set(key, {
          ...slot,
          available: isAvailable,
          stylistIds: isAvailable ? [stylistId] : [],
        })
        return
      }

      if (isAvailable) {
        existing.available = true
        existing.stylistIds = Array.from(new Set([...(existing.stylistIds || []), stylistId]))
      }
    })
  })

  return Array.from(slotMap.values()).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )
}

const pickAutoAssignedStylistId = (slot, preferredStylistId = '') => {
  const candidateIds = Array.isArray(slot?.stylistIds)
    ? slot.stylistIds.map((id) => String(id || '').trim()).filter(Boolean)
    : []

  if (candidateIds.length === 0) {
    return ''
  }

  const normalizedPreferred = String(preferredStylistId || '').trim()
  if (normalizedPreferred && candidateIds.includes(normalizedPreferred)) {
    return normalizedPreferred
  }

  return candidateIds[Math.floor(Math.random() * candidateIds.length)]
}

const getRescheduleOriginalSlot = (appointment) => {
  const start = appointment?.start_datetime_pht || appointment?.start_datetime
  const end = appointment?.end_datetime_pht || appointment?.end_datetime

  if (!start || !end) {
    return null
  }

  return {
    start,
    end,
    dateKey: formatDateKey(start),
  }
}

const applyRescheduleSlotOccupancy = (slots = [], appointment, selectedDate) => {
  const originalSlot = getRescheduleOriginalSlot(appointment)

  if (!originalSlot || originalSlot.dateKey !== selectedDate) {
    return slots
  }

  const originalStartTime = new Date(originalSlot.start).getTime()

  return slots.map((slot) => {
    if (new Date(slot.start).getTime() !== originalStartTime) {
      return slot
    }

    const capacity = Math.max(1, Number(slot.capacity || 5))
    const bookedCount = Math.min(capacity, Math.max(0, Number(slot.booked_count || 0)) + 1)

    return {
      ...slot,
      available: true,
      booked_count: bookedCount,
      remaining_slots: Math.max(0, capacity - bookedCount),
      capacity,
    }
  })
}

const Calendar = ({
  month,
  year,
  selectedDate,
  closedDateMap = {},
  onSelect,
  onClosedDateSelect,
  onMonthChange,
}) => {
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
          const closedDateInfo = closedDateMap[iso]
          const isClosed = Boolean(closedDateInfo)
          const isDisabled = isPast || isClosed

          const handleDateClick = () => {
            if (isPast) {
              return
            }

            if (isClosed) {
              onClosedDateSelect?.(iso, closedDateInfo)
              return
            }

            onSelect(iso)
          }
          
          return (
            <button
              key={iso}
              onClick={handleDateClick}
              disabled={isPast}
              aria-disabled={isDisabled}
              title={isClosed ? closedDateInfo.message : isPast ? 'Cannot book past dates' : undefined}
              className={`h-10 rounded flex items-center justify-center border ${
                isPast 
                  ? 'bg-[#f7f1ec] text-gray-400 cursor-not-allowed' 
                  : isClosed
                    ? 'border-red-200 bg-red-50 text-red-600 cursor-not-allowed'
                  : isSelected 
                    ? 'bg-[#6d4de6] text-white border-[#6d4de6]' 
                    : 'hover:border-[#c9bcf1] hover:bg-[#f3efff]'
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
        <div className="text-sm text-[#7c688f]">Select a service to load time slots.</div>
      )}
      {!loading && ready && !hasSlots && (
        <div className="text-sm text-red-500">No available slots for this date. Please choose another date or time.</div>
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
              const capacity = Number(slot.capacity || 5)
              const bookedCount = Math.max(0, Number(slot.booked_count || 0))
              const remainingSlots = Math.max(
                0,
                Number.isFinite(Number(slot.remaining_slots))
                  ? Number(slot.remaining_slots)
                  : capacity - bookedCount
              )
              
              // Use the pre-calculated flags from filteredSlots
              const isPast = slot.isPast || false
              const isTooSoon = slot.isTooSoon || false
              const isDisabled = !isAvailable || isPast || isTooSoon
              const slotAvailabilityLabel = !isAvailable || remainingSlots === 0
                ? 'FULL'
                : remainingSlots === 1
                  ? '1 slot left'
                  : `${bookedCount}/${capacity} slots booked`
              
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
                tooltipMessage = 'This time slot is already fully booked. Please select another time.'
              } else {
                tooltipMessage = `Book at ${label} (${slotAvailabilityLabel})`
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => isAvailable && !isPast && !isTooSoon && onSelect(slot)}
                  disabled={isDisabled}
                  className={`border rounded px-3 py-2 text-sm text-left transition ${
                    isDisabled
                      ? 'bg-[#f7f1ec] text-gray-400 border-gray-300 cursor-not-allowed line-through'
                      : isSelected
                        ? 'bg-[#6d4de6] text-white border-[#6d4de6]'
                        : 'hover:border-[#c9bcf1] hover:bg-[#f3efff]'
                  }`}
                  title={tooltipMessage}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-[11px] opacity-80">
                    {slotAvailabilityLabel}
                  </span>
                </button>
              )
            })}
          </div>
          {availableSlots.length === 0 && (
            <div className="text-sm text-red-500 text-center py-2">
              No available slots for this date. Please choose another date or time.
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

const ReceiptModal = ({ appointment, onClose, isRescheduleReceipt = false }) => {
  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const renderModal = (content) => createPortal(content, document.body)
  
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
    return renderModal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
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
  
  if (appointmentServices.length === 0) {
    return renderModal(
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
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
  const totalPrice = Number.isFinite(Number(appointment.total_amount_cents))
    ? Number(appointment.total_amount_cents)
    : appointmentServices.reduce((sum, s) => sum + getServicePrice(s), 0)
  const amountPaid = Number.isFinite(Number(appointment.amount_paid_cents))
    ? Number(appointment.amount_paid_cents)
    : Math.max(0, Number(appointment.downpayment_amount_cents || 0))
  const remainingBalance = Number.isFinite(Number(appointment.remaining_balance_cents))
    ? Number(appointment.remaining_balance_cents)
    : Math.max(0, totalPrice - amountPaid)
  const paymentMode = typeof appointment.mode_of_payment === 'string' && appointment.mode_of_payment
    ? appointment.mode_of_payment
    : (amountPaid >= totalPrice && totalPrice > 0 ? 'full' : 'downpayment')
  const paymentMethodLabel = appointment.payment_method === 'online'
    ? 'GCash'
    : appointment.payment_method === 'on_hand'
      ? 'Pay at Salon'
      : 'N/A'
  const hasAmountPaid = amountPaid > 0
  const modalTitle = isRescheduleReceipt ? 'Reschedule Confirmation' : 'Appointment Receipt'
  const documentTitle = isRescheduleReceipt ? 'Reschedule Confirmation' : 'Appointment Receipt'
  const receiptHeading = isRescheduleReceipt ? 'Appointment Details' : 'Appointment Receipt'
  const showFinancialDetails = !isRescheduleReceipt

  const handlePrint = () => {
    const printContent = document.getElementById('receipt') || document.getElementById('receipt-content')
    if (printContent) {
      const printWindow = window.open('', '_blank')
      printWindow.document.write(`
        <html>
          <head>
            <title>${documentTitle} - ${appointment.id}</title>
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

  const handleDownload = async () => {
    const receiptNode = document.getElementById('receipt')

    if (!receiptNode) {
      toast.error('Receipt preview is not ready yet. Please try again.')
      return
    }

    try {
      const dataUrl = await toPng(receiptNode, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `receipt-${appointment.id}.png`
      link.click()
    } catch (error) {
      console.error('Failed to download receipt as PNG:', error)
      toast.error('Unable to download receipt image right now. Please try again.')
    }
  }

  return renderModal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[1px]">
      <div className="bg-white/90 rounded-2xl border border-[#eadfd5] shadow-[0_16px_32px_rgba(92,64,51,0.12)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{modalTitle}</h2>
            <button onClick={onClose} className="text-[#9b857a] hover:text-gray-700">&times;</button>
          </div>
          
          <div id="receipt" className="bg-white">
            <div className="border-2 border-gray-300 p-6 space-y-4" id="receipt-content">
              <div className="text-center border-b pb-4">
                <h1 className="text-3xl font-bold">KAYE'S HAIR SALON AND SPA</h1>
                <p className="text-[#8f7a6f]">{receiptHeading}</p>
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
                        <li key={idx}>
                          {getServiceName(s)}
                          {!isRescheduleReceipt && <> - {currency(getServicePrice(s))}</>}
                        </li>
                      ))}
                    </ul>
                  </div>
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

              {showFinancialDetails ? (
                <>
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

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Payment Details</h3>
                    <div className="space-y-2 rounded-lg border border-[#e8e0f4] bg-[#faf8fd] p-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="font-medium">Mode of Payment:</span>
                        <span>{paymentMethodLabel}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium">Amount Paid:</span>
                        <span>{hasAmountPaid ? currency(amountPaid) : 'N/A'}</span>
                      </div>
                      {paymentMode === 'downpayment' && (
                        <div className="flex justify-between gap-4 border-t border-[#e8e0f4] pt-2">
                          <span className="font-medium">Remaining Balance:</span>
                          <span>{currency(remainingBalance)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="border-t pt-4">
                  <span className={`px-3 py-1 rounded text-sm ${
                    appointment.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-[#f7f1ec] text-[#3b2f2a]'
                  }`}>
                    Status: {appointment.status.toUpperCase()}
                  </span>
                </div>
              )}

              <div className="border-t pt-4 text-center text-sm text-[#8f7a6f]">
                Thank you for choosing Kaye's Hair Salon and Spa!
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
  const bookingFlowRef = useRef(null)
  const previousStepRef = useRef(null)
  const bookingSubmitLockRef = useRef(false)
  const bookingRequestIdRef = useRef(null)
  const shouldRestoreDraft = shouldRestoreBookingDraft()
  const draft = shouldRestoreDraft ? readBookingDraft() : null
  const initialSearchParams = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams()
  const entrySource = initialSearchParams.get('source') || ''
  const initialEntryAppointmentId = initialSearchParams.get('reschedule') || initialSearchParams.get('appointment')
  const initialManageBookingVerifiedEmail = entrySource === 'customer-dashboard' && isManageBookingVerified()
    ? getManageBookingVerifiedEmail()
    : ''
  const canFastTrackCustomerDashboardBooking = Boolean(initialManageBookingVerifiedEmail)
    && entrySource === 'customer-dashboard'
    && !initialEntryAppointmentId
  const shouldForceFreshVerificationEntry = !canFastTrackCustomerDashboardBooking && !initialEntryAppointmentId && !shouldRestoreDraft && (
    initialSearchParams.get('fresh') === '1'
    || initialSearchParams.has('services')
    || initialSearchParams.has('stylist')
    || initialSearchParams.has('variant')
    || initialSearchParams.has('variant_id')
  )
  const initialPendingReturningEmail = getReturningBookingPendingEmail()
  const initialVerifiedReturningEmail = getReturningBookingVerifiedEmail()
  const initialAutoloadReturningEmail = canFastTrackCustomerDashboardBooking
    ? initialManageBookingVerifiedEmail
    : (initialVerifiedReturningEmail || initialManageBookingVerifiedEmail)
  const draftBookingEmail = normalizeEmailValue(draft?.booking?.email)
  const hasDraftCustomerFields = Boolean(draft?.booking?.name || draft?.booking?.phone || draft?.booking?.address)
  const [step, setStep] = useState(() => normalizeStepValue(draft?.step)) // 1: Customer Info, 2: Select Service, 3: Date & Time, 4: Confirm Booking
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
  const [closedDateMap, setClosedDateMap] = useState({})
  const [holidayStatusMessage, setHolidayStatusMessage] = useState('')
  const [selectedStylist, setSelectedStylist] = useState(() => (draft?.selectedStylist ? String(draft.selectedStylist) : ''))
  const [stylistSearch, setStylistSearch] = useState('')
  const [stylistFilter, setStylistFilter] = useState('all')
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
        stylistIds: Array.isArray(draft.selectedSlot.stylistIds)
          ? draft.selectedSlot.stylistIds.map((id) => String(id || '').trim()).filter(Boolean)
          : [],
        assignedStylistId: typeof draft.selectedSlot.assignedStylistId === 'string'
          ? draft.selectedSlot.assignedStylistId
          : '',
      }
    }
    return null
  })
  const [booking, setBooking] = useState(() => ({
    name: typeof draft?.booking?.name === 'string' ? draft.booking.name : '',
    email: typeof draft?.booking?.email === 'string'
      ? draft.booking.email
      : (shouldForceFreshVerificationEntry ? '' : initialPendingReturningEmail || initialAutoloadReturningEmail || ''),
    phone: typeof draft?.booking?.phone === 'string' ? draft.booking.phone : '',
    address: typeof draft?.booking?.address === 'string' ? draft.booking.address : '',
    privacyConsent: draft?.booking?.privacyConsent === true,
  }))
  const [payment, setPayment] = useState(() => ({
    method: draft?.payment?.method === 'online' ? 'online' : 'on_hand', // 'on_hand' or 'online'
    paymentType: draft?.payment?.paymentType === 'full' ? 'full' : 'downpayment', // on_hand: downpayment only, online: downpayment or full
    selectedAccount: typeof draft?.payment?.selectedAccount === 'string' ? draft.payment.selectedAccount : '',
    amount: typeof draft?.payment?.amount === 'string' ? draft.payment.amount : '',
    proofFile: null,
    proofPreview: null,
  }))
  const [formErrors, setFormErrors] = useState({ email: '', phone: '', payment: '', privacy: '' })
  // Returning customers must verify their email before we reuse any saved profile data.
  const [customerLookupState, setCustomerLookupState] = useState(() => {
    if (canFastTrackCustomerDashboardBooking && (!draftBookingEmail || draftBookingEmail === initialManageBookingVerifiedEmail)) {
      return 'loading_profile'
    }

    if (shouldForceFreshVerificationEntry) {
      return 'idle'
    }

    if (initialVerifiedReturningEmail && (!draftBookingEmail || draftBookingEmail === initialVerifiedReturningEmail)) {
      return 'loading_profile'
    }

    if (initialPendingReturningEmail && (!draftBookingEmail || draftBookingEmail === initialPendingReturningEmail)) {
      return 'verification_required'
    }

    if (hasDraftCustomerFields) {
      return 'new_customer'
    }

    return 'idle'
  })
  const [customerLookupMessage, setCustomerLookupMessage] = useState('')
  const [returningOtp, setReturningOtp] = useState('')
  const [returningCustomerProfile, setReturningCustomerProfile] = useState(null)
  const [returningCustomerMissingFields, setReturningCustomerMissingFields] = useState([])
  const [returningCustomerEditMode, setReturningCustomerEditMode] = useState(false)
  const [customerProfileSaving, setCustomerProfileSaving] = useState(false)
  const [rescheduling, setRescheduling] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const freshBookingRoute = isManageBookingVerified()
    ? '/book?fresh=1&source=customer-dashboard'
    : '/book?fresh=1'
  const [prefillServiceIds, setPrefillServiceIds] = useState([])
  const [prefillStylistId, setPrefillStylistId] = useState('')
  const [prefillVariantId, setPrefillVariantId] = useState('')
  const [hasAppliedServicePrefill, setHasAppliedServicePrefill] = useState(false)
  const [bookingInProgress, setBookingInProgress] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const activeStylists = stylists.filter((stylist) => stylist?.active !== false)
  const activeStylistKey = activeStylists.map((stylist) => String(stylist.id)).join(',')
  const isReturningCustomerVerified = customerLookupState === 'verified'
  const isReturningCustomerPendingVerification = [
    'checking_email',
    'sending_otp',
    'verification_required',
    'verifying_otp',
    'loading_profile',
  ].includes(customerLookupState)
  const hasIncompleteReturningProfile = isReturningCustomerVerified && returningCustomerMissingFields.length > 0
  const shouldShowCustomerProfileInputs =
    customerLookupState === 'new_customer'
    || (isReturningCustomerVerified && (hasIncompleteReturningProfile || returningCustomerEditMode))
  const isEmailLocked = customerLookupState !== 'idle' && customerLookupState !== 'checking_email'
  const shouldShowLookupBanner = Boolean(customerLookupMessage) && ![
    'verification_required',
    'sending_otp',
    'verifying_otp',
  ].includes(customerLookupState)
  const showNameField =
    customerLookupState === 'new_customer'
    || returningCustomerEditMode
    || returningCustomerMissingFields.includes('name')
  const showPhoneField =
    customerLookupState === 'new_customer'
    || returningCustomerEditMode
    || returningCustomerMissingFields.includes('phone')
  const showAddressField = customerLookupState === 'new_customer' || returningCustomerEditMode
  const shouldShowPrivacyConsent = customerLookupState === 'new_customer'
  const stepOneHeading = customerLookupState === 'new_customer'
    ? 'Customer Information'
    : isReturningCustomerVerified
      ? (shouldShowCustomerProfileInputs ? 'Complete Your Information' : 'Email Verified')
      : 'Verify Your Email'
  const stepOneDescription = customerLookupState === 'new_customer'
    ? 'No existing record was found. Please fill out your information to continue booking.'
    : isReturningCustomerVerified
      ? (shouldShowCustomerProfileInputs
        ? 'Please complete or update your saved information before continuing to services.'
        : 'Your email has been verified. You can continue booking with your saved information.')
      : 'Enter your email first so we can securely check for an existing customer record before booking.'

  const clearReturningBookingSession = () => {
    clearReturningBookingVerification()
  }

  const resetReturningCustomerState = ({ preserveEmail = '', keepLookupMessage = false } = {}) => {
    clearReturningBookingSession()
    setReturningOtp('')
    setReturningCustomerProfile(null)
    setReturningCustomerMissingFields([])
    setReturningCustomerEditMode(false)
    setCustomerLookupState('idle')
    if (!keepLookupMessage) {
      setCustomerLookupMessage('')
    }
    setBooking((previousBooking) => ({
      ...previousBooking,
      name: '',
      email: preserveEmail,
      phone: '',
      address: '',
      privacyConsent: false,
    }))
  }

  const applyReturningCustomerProfile = (profile, options = {}) => {
    const normalizedEmail = normalizeEmailValue(profile?.email || booking.email)
    const nextMissingFields = Array.isArray(options.missingFields) ? options.missingFields : []

    setReturningCustomerProfile(profile)
    setReturningCustomerMissingFields(nextMissingFields)
    setReturningCustomerEditMode(false)
    setCustomerLookupState('verified')
    setReturningOtp('')
    setBooking((previousBooking) => ({
      ...previousBooking,
      name: profile?.name || '',
      email: normalizedEmail,
      phone: profile?.phone || '',
      address: profile?.address || '',
      privacyConsent: true,
    }))
    persistReturningBookingVerification({ email: normalizedEmail })
  }

  const clearBookingDraft = () => {
    try {
      window.sessionStorage.removeItem(BOOK_APPOINTMENT_DRAFT_KEY)
    } catch {
      // Ignore session storage errors
    }
  }

  const loadReturningCustomerProfile = async ({ silent = false, advanceOnComplete = false } = {}) => {
    const sessionToken = (
      (canFastTrackCustomerDashboardBooking ? localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY) : '')
      || localStorage.getItem(RETURNING_BOOKING_TOKEN_KEY)
      || localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY)
      || ''
    ).trim()
    const sessionEmail = normalizeEmailValue(
      (canFastTrackCustomerDashboardBooking ? localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY) : '')
      || localStorage.getItem(RETURNING_BOOKING_EMAIL_KEY)
      || localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY)
    )

    if (!sessionToken || !sessionEmail || rescheduling) {
      return false
    }

    try {
      setCustomerLookupState('loading_profile')
      setBooking((previousBooking) => ({
        ...previousBooking,
        email: sessionEmail,
      }))

      const { data } = await returningBookingApi.get('/returning-booking/profile')

      applyReturningCustomerProfile(data.customer, {
        missingFields: data.missing_fields || [],
      })

      const successMessage = data.is_complete
        ? 'Verification successful. You may now continue booking.'
        : 'Verification successful. Please complete the missing information to continue.'

      setCustomerLookupMessage(successMessage)

      if (!silent) {
        toast.success(successMessage)
      }

      if (data.is_complete && (advanceOnComplete || step === 1)) {
        setStep(2)
      }

      return true
    } catch (error) {
      clearReturningBookingSession()
      setReturningOtp('')
      setReturningCustomerProfile(null)
      setReturningCustomerMissingFields([])
      setReturningCustomerEditMode(false)
      setCustomerLookupState(sessionEmail ? 'verification_required' : 'idle')
      setCustomerLookupMessage('Invalid or expired verification code.')
      setBooking((previousBooking) => ({
        ...previousBooking,
        email: sessionEmail || previousBooking.email,
      }))

      if (!silent) {
        toast.error(error.response?.data?.message || 'Invalid or expired verification code.')
      }

      return false
    }
  }

  useEffect(() => {
    try {
      window.sessionStorage.removeItem(BOOK_APPOINTMENT_RESTORE_KEY)
      if (!shouldRestoreDraft) {
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
          window.sessionStorage.setItem(BOOK_APPOINTMENT_RESTORE_KEY, JSON.stringify({
            path: currentPath,
            ts: Date.now(),
          }))
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
    if (!shouldForceFreshVerificationEntry || rescheduling) {
      return
    }

    clearReturningBookingSession()
  }, [shouldForceFreshVerificationEntry, rescheduling])

  useEffect(() => {
    if (shouldForceFreshVerificationEntry || !initialAutoloadReturningEmail || rescheduling || customerLookupState !== 'loading_profile') {
      return
    }

    void loadReturningCustomerProfile({
      silent: true,
      advanceOnComplete: normalizeStepValue(draft?.step) > 1,
    })
  }, [customerLookupState, draft?.step, initialAutoloadReturningEmail, rescheduling, shouldForceFreshVerificationEntry]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rescheduling) {
      return
    }
  }, [rescheduling])


  useEffect(() => {
    refreshData()
    const params = new URLSearchParams(location.search)
    const appointmentId = params.get('reschedule') || params.get('appointment')
    const servicesParam = params.get('services')
    const stylistParam = params.get('stylist')
    const variantParam = params.get('variant_id') || params.get('variant')
    const isFreshEntry = params.get('fresh') === '1'
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
    if ((isServiceEntry || isFreshEntry) && !shouldRestoreDraft) {
      setStep(1)
      setSelectedStylist('')
      setSelectedService('')
      setSelectedServices([])
      setSelectedVariants({})
      setSelectedSlot(null)
      setAvailability([])
      setAvailabilityLoading(false)
      setReceipt(null)
      setRescheduling(null)
      const today = new Date()
      setSelectedDate(getTodayDateKey())
      setCalendarMonth(today.getMonth())
      setCalendarYear(today.getFullYear())
      if (canFastTrackCustomerDashboardBooking) {
        setCustomerLookupState('loading_profile')
        setCustomerLookupMessage('')
        setReturningOtp('')
        setReturningCustomerProfile(null)
        setReturningCustomerMissingFields([])
        setReturningCustomerEditMode(false)
        setBooking({
          name: '',
          email: initialManageBookingVerifiedEmail,
          phone: '',
          address: '',
          privacyConsent: true,
        })
      } else {
        setBooking({
          name: '',
          email: '',
          phone: '',
          address: '',
          privacyConsent: false,
        })
      }
      setFormErrors({ email: '', phone: '', payment: '', privacy: '' })
      setPayment({
        method: 'on_hand',
        paymentType: 'downpayment',
        selectedAccount: '',
        amount: '',
        proofFile: null,
        proofPreview: null,
      })
    }

    if (isFreshEntry) {
      params.delete('fresh')
      const cleanedSearch = params.toString()
      navigate(
        {
          pathname: location.pathname,
          search: cleanedSearch ? `?${cleanedSearch}` : '',
        },
        { replace: true }
      )
    }
  }, [canFastTrackCustomerDashboardBooking, initialManageBookingVerifiedEmail, location.pathname, location.search, navigate, shouldRestoreDraft])

  useEffect(() => {
    let isCancelled = false

    const loadClosedDates = async () => {
      const monthStart = formatDateKey(new Date(calendarYear, calendarMonth, 1))
      const monthEnd = formatDateKey(new Date(calendarYear, calendarMonth + 1, 0))

      if (!monthStart || !monthEnd) {
        setClosedDateMap({})
        return
      }

      try {
        const response = await api.get('/api/holidays/calendar', {
          params: {
            start: monthStart,
            end: monthEnd,
          },
        })

        if (isCancelled) {
          return
        }

        const nextClosedDateMap = Array.isArray(response.data?.closed_dates)
          ? response.data.closed_dates.reduce((accumulator, entry) => {
            if (entry?.date) {
              accumulator[String(entry.date)] = entry
            }
            return accumulator
          }, {})
          : {}

        setClosedDateMap(nextClosedDateMap)
      } catch (e) {
        if (isCancelled) {
          return
        }

        console.error('Failed to load closed holiday dates', e)
        setClosedDateMap({})
      }
    }

    loadClosedDates()

    return () => {
      isCancelled = true
    }
  }, [calendarMonth, calendarYear])

  useEffect(() => {
    if (!selectedDate || closedDateMap[selectedDate]) {
      return
    }

    const [selectedYear, selectedMonth] = String(selectedDate).split('-').map(Number)
    const isSelectedDateInVisibleMonth =
      Number.isFinite(selectedYear) &&
      Number.isFinite(selectedMonth) &&
      selectedYear === calendarYear &&
      selectedMonth - 1 === calendarMonth

    if (isSelectedDateInVisibleMonth) {
      return
    }

    let isCancelled = false

    const checkSelectedDate = async () => {
      try {
        const response = await api.get('/api/holidays/check', {
          params: { date: selectedDate },
        })

        if (isCancelled || !response.data?.is_holiday) {
          return
        }

        setClosedDateMap((previousMap) => {
          if (previousMap[selectedDate]) {
            return previousMap
          }

          return {
            ...previousMap,
            [selectedDate]: {
              date: selectedDate,
              name: response.data?.holiday?.name || 'Closed date',
              message: response.data?.message || 'The salon is closed on this date. Please choose another date.',
              holiday: response.data?.holiday || null,
            },
          }
        })
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('Failed to check holiday status for selected date.', e)
        }
      }
    }

    checkSelectedDate()

    return () => {
      isCancelled = true
    }
  }, [selectedDate, closedDateMap, calendarMonth, calendarYear])

  useEffect(() => {
    const closedDateInfo = selectedDate ? closedDateMap[selectedDate] : null

    if (!closedDateInfo) {
      if (holidayStatusMessage) {
        setHolidayStatusMessage('')
      }
      return
    }

    setAvailabilityLoading(false)
    setAvailability([])
    setSelectedSlot(null)
    setHolidayStatusMessage(closedDateInfo.message)

    if (step > 2) {
      setStep(3)
    }
  }, [closedDateMap, selectedDate, step, holidayStatusMessage])

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
    const params = new URLSearchParams(location.search)
    const servicesParam = params.get('services')
    const stylistParam = params.get('stylist')
    const variantParam = params.get('variant_id') || params.get('variant')

    const hasPrefillParams = Boolean(servicesParam || stylistParam || variantParam)
    if (!hasPrefillParams) {
      return
    }

    if (servicesParam && !hasAppliedServicePrefill) {
      return
    }

    params.delete('services')
    params.delete('stylist')
    params.delete('variant')
    params.delete('variant_id')
    const cleanedSearch = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: cleanedSearch ? `?${cleanedSearch}` : '',
      },
      { replace: true }
    )
  }, [hasAppliedServicePrefill, location.pathname, location.search, navigate])

  useEffect(() => {
    if (step === 3) {
      const closedDateInfo = selectedDate ? closedDateMap[selectedDate] : null
      // Only fetch if we have at least one service selected
      const hasServices = selectedServices.length > 0 || selectedService
      if (closedDateInfo) {
        setAvailabilityLoading(false)
        setAvailability([])
        setSelectedSlot(null)
      } else if (hasServices) {
        fetchAvailability()
      } else {
        setAvailabilityLoading(false)
        setAvailability([])
        setSelectedSlot(null)
      }
    }
  }, [selectedDate, selectedService, selectedServices, step, closedDateMap])

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
          stylistIds: Array.isArray(selectedSlot.stylistIds)
            ? selectedSlot.stylistIds.map((id) => String(id || '').trim()).filter(Boolean)
            : [],
          assignedStylistId: typeof selectedSlot.assignedStylistId === 'string'
            ? selectedSlot.assignedStylistId
            : '',
        }
        : null,
      booking: {
        name: booking.name || '',
        email: booking.email || '',
        phone: booking.phone || '',
        address: booking.address || '',
        privacyConsent: booking.privacyConsent === true,
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

  const scrollBookingFlowToTop = (behavior = 'smooth') => {
    const bookingFlowNode = bookingFlowRef.current
    if (!bookingFlowNode || typeof window === 'undefined') {
      return
    }

    const targetTop = Math.max(
      0,
      bookingFlowNode.getBoundingClientRect().top + window.scrollY - 12
    )

    window.scrollTo({
      top: targetTop,
      left: 0,
      behavior,
    })
  }

  useEffect(() => {
    if (previousStepRef.current === null) {
      previousStepRef.current = step
      return undefined
    }

    if (previousStepRef.current === step) {
      return undefined
    }

    previousStepRef.current = step
    const animationFrameId = window.requestAnimationFrame(() => {
      scrollBookingFlowToTop('smooth')
    })

    return () => window.cancelAnimationFrame(animationFrameId)
  }, [step])

  const refreshData = async () => {
    try {
      const [svcRes, paymentRes] = await Promise.all([
        api.get('/api/services'),
        api.get('/payment-accounts').catch(() => ({ data: [] })), // Don't fail if payment accounts fail
      ])
      setStylists([])
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
      const appointmentServices = Array.isArray(appt.services) && appt.services.length > 0
        ? appt.services
        : (appt.service ? [appt.service] : [])
      const nextSelectedServices = appointmentServices
        .map(service => String(service.id))
        .filter(Boolean)
      const nextSelectedVariants = appointmentServices.reduce((accumulator, service) => {
        if (service?.pivot?.service_variant_id) {
          accumulator[service.id] = service.pivot.service_variant_id
        }
        return accumulator
      }, {})

      setRescheduling(appt)
      const startSource = appt.start_datetime_pht || appt.start_datetime
      const endSource = appt.end_datetime_pht || appt.end_datetime
      setSelectedDate(startSource.slice(0, 10))
      setSelectedStylist(appt.stylist_id ? String(appt.stylist_id) : '')
      setSelectedService(appt.service_id ? String(appt.service_id) : (nextSelectedServices[0] || ''))
      setSelectedServices(nextSelectedServices)
      setSelectedVariants(nextSelectedVariants)
      setSelectedSlot({
        start: startSource,
        end: endSource,
        available: true,
        booked_count: 1,
        remaining_slots: 4,
        capacity: 5,
        stylistIds: appt.stylist_id ? [String(appt.stylist_id)] : [],
        assignedStylistId: appt.stylist_id ? String(appt.stylist_id) : '',
      })
      setBooking({
        name: appt.customer_name,
        email: appt.customer_email || '',
        phone: appt.customer_phone || '',
        address: appt.customer_address || '',
        privacyConsent: true,
      })
      setStep(3)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load appointment')
    }
  }

  const fetchAvailability = async () => {
    const closedDateInfo = selectedDate ? closedDateMap[selectedDate] : null
    const serviceIds = selectedServices.length > 0 ? selectedServices : (selectedService ? [selectedService] : [])
    const requestedDuration = Math.max(serviceIds.length, 1) * 30

    if (serviceIds.length === 0) {
      setAvailabilityLoading(false)
      setAvailability([])
      return
    }

    if (closedDateInfo) {
      setAvailabilityLoading(false)
      setAvailability([])
      setSelectedSlot(null)
      return
    }

    try {
      setAvailabilityLoading(true)
      const availabilityParams = {
        params: {
          date: selectedDate,
          service_duration: requestedDuration,
          ...(rescheduling?.id ? { exclude_appointment_id: rescheduling.id } : {}),
        },
        timeout: 15000,
      }

      const response = await api.get('/api/appointments/availability', availabilityParams)
      const nextAvailability = applyRescheduleSlotOccupancy(
        response.data || [],
        rescheduling,
        selectedDate
      )

      setAvailability(nextAvailability)

      if (selectedSlot) {
        const matchingSlot = nextAvailability.find(slot =>
          new Date(slot.start).getTime() === new Date(selectedSlot.start).getTime() &&
          slot.available !== false
        )
        if (!matchingSlot) {
          const currentRescheduleStart = rescheduling
            ? new Date(rescheduling.start_datetime_pht || rescheduling.start_datetime).getTime()
            : null
          const selectedStart = new Date(selectedSlot.start).getTime()
          const isCurrentAppointmentSlot = Boolean(currentRescheduleStart) && selectedStart === currentRescheduleStart

          if (!isCurrentAppointmentSlot) {
            setSelectedSlot(null)
            toast.warn('The selected time slot is no longer available. Please choose another time.')
          }
        } else {
          setSelectedSlot((previousSlot) => {
            if (!previousSlot) return previousSlot

            const isSameSlotState =
              previousSlot.start === matchingSlot.start &&
              previousSlot.end === matchingSlot.end &&
              previousSlot.available === (matchingSlot.available !== false) &&
              Number(previousSlot.booked_count || 0) === Number(matchingSlot.booked_count || 0) &&
              Number(previousSlot.remaining_slots || 0) === Number(matchingSlot.remaining_slots || 0) &&
              Number(previousSlot.capacity || 0) === Number(matchingSlot.capacity || 0)

            if (isSameSlotState) {
              return previousSlot
            }

            return matchingSlot
          })
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

  const handleClosedDateSelect = (_date, closedDateInfo) => {
    const message = closedDateInfo?.message || 'The salon is closed on this date. Please choose another date.'

    setAvailabilityLoading(false)
    setAvailability([])
    setSelectedSlot(null)
    setHolidayStatusMessage(message)
    toast.warn(message)
  }

  const handleCheckCustomerEmail = async () => {
    const normalizedEmail = normalizeEmailValue(booking.email)

    if (!normalizedEmail) {
      toast.warn('Please enter your email')
      setFormErrors((previousErrors) => ({ ...previousErrors, email: 'Email is required' }))
      return
    }

    const emailValidation = validateEmail(normalizedEmail)
    setFormErrors((previousErrors) => ({
      ...previousErrors,
      email: emailValidation.message,
    }))

    if (!emailValidation.valid) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      setCustomerLookupState('checking_email')
      setCustomerLookupMessage('Checking email...')

      const { data } = await returningBookingApi.post('/returning-booking/check-email', {
        email: normalizedEmail,
      })

      if (data.exists) {
        clearReturningBookingSession()
        setReturningBookingPendingEmail(normalizedEmail)
        setReturningOtp('')
        setReturningCustomerProfile(null)
        setReturningCustomerMissingFields([])
        setReturningCustomerEditMode(false)
        setCustomerLookupState('verification_required')
        setCustomerLookupMessage(data.message || 'Existing record found. Verification code sent to your email.')
        setBooking((previousBooking) => ({
          ...previousBooking,
          name: '',
          email: normalizedEmail,
          phone: '',
          address: '',
          privacyConsent: true,
        }))
        toast.success('Existing record found. Verification code sent to your email.')
        return
      }

      clearReturningBookingSession()
      setReturningOtp('')
      setReturningCustomerProfile(null)
      setReturningCustomerMissingFields([])
      setReturningCustomerEditMode(false)
      setCustomerLookupState('new_customer')
      setCustomerLookupMessage(data.message || 'No existing record found. Please fill out your information.')
      setBooking((previousBooking) => ({
        ...previousBooking,
        email: normalizedEmail,
        privacyConsent: false,
      }))
      toast.info('No existing record found. Please fill out your information.')
    } catch (error) {
      setCustomerLookupState('idle')
      setCustomerLookupMessage('')
      toast.error(error.response?.data?.message || 'Failed to check your email. Please try again.')
    }
  }

  const handleResendReturningOtp = async () => {
    const normalizedEmail = normalizeEmailValue(booking.email)

    if (!normalizedEmail) {
      toast.warn('Please enter your email first.')
      return
    }

    try {
      setCustomerLookupState('sending_otp')
      await returningBookingApi.post('/returning-booking/send-otp', {
        email: normalizedEmail,
      })
      setReturningBookingPendingEmail(normalizedEmail)
      setCustomerLookupState('verification_required')
      setCustomerLookupMessage('Existing record found. Verification code sent to your email.')
      toast.success('Verification code sent to your email.')
    } catch (error) {
      setCustomerLookupState('verification_required')
      toast.error(error.response?.data?.message || 'Failed to send verification code.')
    }
  }

  const handleVerifyReturningOtp = async () => {
    const normalizedEmail = normalizeEmailValue(booking.email)
    const code = returningOtp.replace(/\D/g, '').slice(0, 6)

    if (!normalizedEmail) {
      toast.warn('Please enter your email first.')
      return
    }

    if (code.length !== 6) {
      toast.warn('Enter the 6-digit verification code.')
      return
    }

    try {
      setCustomerLookupState('verifying_otp')
      const { data } = await returningBookingApi.post('/returning-booking/verify-otp', {
        email: normalizedEmail,
        otp: code,
      })

      persistReturningBookingVerification({
        email: data.email,
        token: data.token,
      })

      await loadReturningCustomerProfile({ silent: true, advanceOnComplete: true })
    } catch (error) {
      setCustomerLookupState('verification_required')
      setCustomerLookupMessage(error.response?.data?.message || 'Invalid or expired verification code.')
      toast.error(error.response?.data?.message || 'Invalid or expired verification code.')
    }
  }

  const handleUseDifferentEmail = () => {
    resetReturningCustomerState()
    setFormErrors({ email: '', phone: '', payment: '', privacy: '' })
  }

  const saveReturningCustomerProfile = async () => {
    if (!isReturningCustomerVerified || !shouldShowCustomerProfileInputs) {
      return true
    }

    try {
      setCustomerProfileSaving(true)
      const { data } = await returningBookingApi.patch('/returning-booking/profile', {
        name: booking.name.trim(),
        phone: booking.phone,
        address: booking.address,
      })

      applyReturningCustomerProfile(data.customer, {
        missingFields: data.missing_fields || [],
      })
      setCustomerLookupMessage('Verification successful. You may now continue booking.')
      setStep(2)
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update your saved customer information.')
      return false
    } finally {
      setCustomerProfileSaving(false)
    }
  }

  const handleNextStep = () => {
    const privacyErrorMessage = 'You must agree to the Data Privacy Policy before continuing.'

    if (customerLookupState === 'idle' || customerLookupState === 'checking_email') {
      void handleCheckCustomerEmail()
      return
    }

    if (isReturningCustomerPendingVerification) {
      void handleVerifyReturningOtp()
      return
    }

    const emailValidation = validateEmail(booking.email)
    const phoneValidation = validatePhone(booking.phone)

    setFormErrors({
      email: emailValidation.message,
      phone: phoneValidation.message,
      payment: '',
      privacy: booking.privacyConsent ? '' : privacyErrorMessage,
    })

    if (!booking.name.trim()) {
      toast.warn('Please enter your name')
      return
    }

    if (!booking.email.trim()) {
      toast.warn('Please enter your email')
      return
    }

    if (!booking.phone.trim()) {
      toast.warn('Please enter your contact number')
      return
    }

    if (!emailValidation.valid) {
      toast.error('Please enter a valid email address')
      return
    }

    if (!phoneValidation.valid) {
      toast.error('Please enter valid customer information')
      return
    }

    if (shouldShowPrivacyConsent && !booking.privacyConsent) {
      toast.warn(privacyErrorMessage)
      return
    }

    if (isReturningCustomerVerified && shouldShowCustomerProfileInputs) {
      void saveReturningCustomerProfile()
      return
    }

    setStep(2)
  }

  const handleBook = async () => {
    if (!booking.privacyConsent) {
      const privacyErrorMessage = 'You must agree to the Data Privacy Policy before continuing.'
      setFormErrors((prev) => ({ ...prev, privacy: privacyErrorMessage }))
      setStep(1)
      return
    }

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
    
    // Double-check slot is still available before booking
    if (!selectedSlot) {
      toast.error('Please select a valid time slot')
      return
    }

    if (bookingSubmitLockRef.current) {
      return
    }
    
    try {
      bookingSubmitLockRef.current = true
      setBookingInProgress(true)
      bookingRequestIdRef.current = bookingRequestIdRef.current || (
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `booking-${Date.now()}-${Math.random().toString(16).slice(2)}`
      )

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
      formData.append('privacy_consent', booking.privacyConsent ? '1' : '0')
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
      const res = await api.post('/appointments', formData, {
        headers: {
          'X-Booking-Request-Id': bookingRequestIdRef.current,
        },
      })

      const manageBookingSession = res.data?.customer_manage_booking
      if (manageBookingSession?.email && manageBookingSession?.token) {
        persistManageBookingVerification({
          email: manageBookingSession.email,
          token: manageBookingSession.token,
        })
      }
      
      toast.success('Appointment booked successfully!')

      // Keep the booking email handy for the OTP flow without exposing history publicly.
      if (booking.email && !manageBookingSession?.token) {
        localStorage.setItem(CUSTOMER_BOOKING_PENDING_EMAIL_KEY, booking.email.trim().toLowerCase())
      }
      
      // The response should already have stylist and service loaded
      // But let's fetch it again to be sure
      try {
        const receiptRes = await api.get(`/appointments/${res.data.id}`)
        if (receiptRes.data && (receiptRes.data.service || receiptRes.data.services?.length)) {
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
    } finally {
      bookingSubmitLockRef.current = false
      bookingRequestIdRef.current = null
      setBookingInProgress(false)
    }
  }

  const handleReschedule = async () => {
    if (!rescheduling || !selectedSlot) {
      toast.warn('Please select a time slot')
      return
    }

    const currentUserType = (
      sessionStorage.getItem('userType')
      || localStorage.getItem('userType')
      || ''
    ).trim().toLowerCase()
    const hasDashboardSession = ['admin', 'manager', 'stylist'].includes(currentUserType)
    const manageBookingToken = (localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY) || '').trim()
    const manageBookingEmail = (localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY) || '').trim()
    const isManageBookingSession = !hasDashboardSession && Boolean(manageBookingToken && manageBookingEmail)

    try {
      const preferredTime = toManilaHHmm(selectedSlot.start)
      let updatedAppointment = null

      if (isManageBookingSession) {
        await manageBookingApi.post(`/manage-booking/appointments/${rescheduling.id}/reschedule`, {
          appointment_date: selectedDate,
          appointment_time: preferredTime,
        })

        const appointmentResponse = await api.get(`/appointments/${rescheduling.id}`)
        updatedAppointment = appointmentResponse?.data || null
      } else {
        const res = await api.patch(`/appointments/${rescheduling.id}`, {
          date: selectedDate,
          preferred_time: preferredTime,
        })
        updatedAppointment = res?.data?.appointment || res?.data || null

        if (!updatedAppointment?.id) {
          const appointmentResponse = await api.get(`/appointments/${rescheduling.id}`)
          updatedAppointment = appointmentResponse?.data || null
        }
      }

      if (updatedAppointment?.id) {
        setRescheduling(updatedAppointment)
        setReceipt(updatedAppointment)
      }
      toast.success('Appointment rescheduled successfully!')
    } catch (e) {
      if (isManageBookingSession && e.response?.status === 401) {
        toast.error('Session expired. Please verify OTP again.')
        navigate('/manage-booking/start')
        return
      }

      toast.error(e.response?.data?.message || 'Reschedule failed')
    }
  }

  const currency = cents => `PHP ${(cents / 100).toFixed(2)}`
  const isRescheduleFlow = Boolean(rescheduling)
  const selectedServiceData = services.find(s => s.id === parseInt(selectedService)) // For backward compatibility
  const selectedClosedDateInfo = selectedDate ? closedDateMap[selectedDate] || null : null
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
  const selectedServicesSummaryItems = selectedServicesForSummary.map((service) => {
    if (service.variants && service.variants.length > 0 && selectedVariants[service.id]) {
      const variant = service.variants.find(v => v.id === selectedVariants[service.id])
      if (variant) {
        return {
          id: `${service.id}-${variant.id}`,
          label: `${service.name} - ${variant.name}`,
          priceCents: variant.price_cents,
        }
      }
    }

    return {
      id: String(service.id),
      label: service.name,
      priceCents: service.price_cents,
    }
  })
  const totalPriceForSummary = selectedServicesForSummary.reduce((sum, service) => {
    if (service.variants && service.variants.length > 0 && selectedVariants[service.id]) {
      const variant = service.variants.find(v => v.id === selectedVariants[service.id])
      return sum + (variant ? variant.price_cents : service.price_cents)
    }
    return sum + service.price_cents
  }, 0)
  const canContinueStepTwo = Boolean(selectedServiceIdsForSummary.length > 0)
  const canContinueStepThree = Boolean(selectedSlot && selectedServiceIdsForSummary.length > 0)

  const handleContinueFromStepTwo = () => {
    if (!canContinueStepTwo) {
      toast.warn('Please select at least one service')
      return
    }

    setStep(3)
  }

  const handleContinueFromStepThree = () => {
    if (!canContinueStepThree) {
      toast.warn('Please select a date and time')
      return
    }

    setStep(4)
  }

  const hasManageBookingSession = !['admin', 'manager', 'stylist'].includes(
    (sessionStorage.getItem('userType') || localStorage.getItem('userType') || '').trim().toLowerCase()
  ) && Boolean((localStorage.getItem(CUSTOMER_BOOKING_TOKEN_KEY) || '').trim() && (localStorage.getItem(CUSTOMER_BOOKING_EMAIL_KEY) || '').trim())

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
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {!hasManageBookingSession && (
            <button
              onClick={() => navigate('/customer')}
              className="tap-safe booking-outline-btn"
            >
              Manage My Booking
            </button>
            )}
            <button
              onClick={() => navigate(freshBookingRoute)}
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
            Choose your services, date, and time for your salon visit
          </p>
        </div>
      </section>

      <div ref={bookingFlowRef} className="app-mobile-shell space-y-6 max-w-[1700px] mx-auto w-full">
      
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-4">
        <div className="booking-stepper flex items-start">
          <div className="booking-step-item">
            <div className={`booking-step-circle ${step >= 1 ? 'active' : ''}`}>
              1
            </div>
            <div className="booking-step-label">Verify Email</div>
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
            <div className="booking-step-label">Select Date &amp; Time</div>
          </div>
          <div className={`booking-step-line ${step >= 4 ? 'active' : ''}`}></div>
          <div className="booking-step-item">
            <div className={`booking-step-circle ${step >= 4 ? 'active' : ''}`}>
              4
            </div>
            <div className="booking-step-label">Confirm Booking</div>
          </div>
        </div>
      </div>

      {/* Step 1: Email-first customer identification for new and returning bookings */}
      {step === 1 && (
        <div className="booking-step-card bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_18px_36px_rgba(94,64,102,0.12)] p-5 sm:p-8 md:p-10 max-w-5xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">{stepOneHeading}</h2>
          <p className="text-base md:text-lg text-gray-700 mb-7">
            {stepOneDescription}
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-base font-medium mb-2 text-gray-900">Email *</label>
              <div className="booking-input-wrap">
                <input
                  type="email"
                  required
                  disabled={isEmailLocked}
                  className={`booking-input w-full border rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-500 disabled:bg-[#f7f3fb] disabled:text-[#6f5b7e] ${formErrors.email ? 'border-red-500' : ''}`}
                  placeholder="your@email.com"
                  value={booking.email}
                  onChange={e => {
                    setBooking({ ...booking, email: e.target.value })
                    const validation = validateEmail(e.target.value)
                    setFormErrors(prev => ({ ...prev, email: validation.message }))
                    if (!isEmailLocked && customerLookupMessage) {
                      setCustomerLookupMessage('')
                    }
                  }}
                />
              </div>
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>

            {shouldShowLookupBanner && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  isReturningCustomerVerified
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : isReturningCustomerPendingVerification
                      ? 'border-[#d8ccff] bg-[#f6f1ff] text-[#4c1d95]'
                      : customerLookupState === 'new_customer'
                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                        : 'border-[#ece6f4] bg-[#faf8fd] text-[#4e3b5b]'
                }`}
              >
                {customerLookupMessage}
              </div>
            )}

            {['verification_required', 'sending_otp', 'verifying_otp'].includes(customerLookupState) && (
              <div className="rounded-2xl border border-[#d8ccff] bg-[#faf7ff] p-4 text-sm text-[#4c1d95] space-y-3">
                <p>
                  Enter the 6-digit verification code sent to{' '}
                  <span className="font-semibold">{booking.email}</span>.
                </p>
                <div>
                  <label className="block text-base font-medium mb-2 text-gray-900">Verification Code *</label>
                  <div className="booking-input-wrap">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="booking-input w-full border rounded-xl px-4 py-3.5 text-base tracking-[0.25em] text-gray-900 placeholder-gray-500"
                      placeholder="000000"
                      value={returningOtp}
                      onChange={e => setReturningOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleVerifyReturningOtp}
                    disabled={customerLookupState === 'sending_otp' || customerLookupState === 'verifying_otp'}
                    className="booking-primary-btn flex-1 text-sm font-semibold px-5 py-3 rounded-xl disabled:opacity-60"
                  >
                    {customerLookupState === 'verifying_otp' ? 'Verifying...' : 'Verify Code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResendReturningOtp}
                    disabled={customerLookupState === 'sending_otp' || customerLookupState === 'verifying_otp'}
                    className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3 text-sm font-semibold text-[#6d4de6] hover:bg-[#faf7ff] disabled:opacity-60"
                  >
                    {customerLookupState === 'sending_otp' ? 'Sending Code...' : 'Resend Code'}
                  </button>
                  <button
                    type="button"
                    onClick={handleUseDifferentEmail}
                    className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3 text-sm font-semibold text-[#6d4de6] hover:bg-[#faf7ff]"
                  >
                    Use a Different Email
                  </button>
                </div>
              </div>
            )}

            {isReturningCustomerVerified && !shouldShowCustomerProfileInputs && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-emerald-800">Verified Returning Customer</div>
                  <div className="text-sm text-emerald-700">
                    Your saved information is ready. You can continue directly to services or update it first.
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-sm text-[#2C1338]">
                  <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#7c688f]">Name</div>
                    <div className="mt-1 font-semibold">{booking.name || 'Not provided'}</div>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#7c688f]">Phone</div>
                    <div className="mt-1 font-semibold">{booking.phone || 'Not provided'}</div>
                  </div>
                  <div className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 sm:col-span-2">
                    <div className="text-xs uppercase tracking-[0.12em] text-[#7c688f]">Address</div>
                    <div className="mt-1 font-semibold">{booking.address || 'Not provided'}</div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setReturningCustomerEditMode(true)}
                    className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3 text-sm font-semibold text-[#6d4de6] hover:bg-[#faf7ff]"
                  >
                    Update My Information
                  </button>
                  <button
                    type="button"
                    onClick={handleUseDifferentEmail}
                    className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3 text-sm font-semibold text-[#6d4de6] hover:bg-[#faf7ff]"
                  >
                    Use a Different Email
                  </button>
                </div>
              </div>
            )}

            {shouldShowCustomerProfileInputs && showNameField && (
              <div>
                <label className="block text-base font-medium mb-2 text-gray-900">Full Name *</label>
                <div className="booking-input-wrap">
                  <input
                    type="text"
                    required
                    className="booking-input w-full border rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-500"
                    placeholder="Enter your full name"
                    value={booking.name}
                    onChange={e => setBooking({ ...booking, name: e.target.value })}
                  />
                </div>
              </div>
            )}

            {shouldShowCustomerProfileInputs && showPhoneField && (
              <div>
                <label className="block text-base font-medium mb-2 text-gray-900">Contact Number *</label>
                <div className="booking-input-wrap">
                  <input
                    type="tel"
                    required
                    className={`booking-input w-full border rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-500 ${formErrors.phone ? 'border-red-500' : ''}`}
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
            )}

            {shouldShowCustomerProfileInputs && showAddressField && (
              <div>
                <label className="block text-base font-medium mb-2 text-gray-900">Address</label>
                <div className="booking-input-wrap">
                  <input
                    type="text"
                    className="booking-input w-full border rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-500"
                    placeholder="Your address"
                    value={booking.address}
                    onChange={e => setBooking({ ...booking, address: e.target.value })}
                  />
                </div>
              </div>
            )}

            {isReturningCustomerVerified && shouldShowCustomerProfileInputs && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReturningCustomerEditMode(false)
                    if (returningCustomerProfile) {
                      setBooking((previousBooking) => ({
                        ...previousBooking,
                        name: returningCustomerProfile.name || '',
                        phone: returningCustomerProfile.phone || '',
                        address: returningCustomerProfile.address || '',
                      }))
                    }
                  }}
                  className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3 text-sm font-semibold text-[#6d4de6] hover:bg-[#faf7ff]"
                >
                  Use Saved Information
                </button>
                <button
                  type="button"
                  onClick={handleUseDifferentEmail}
                  className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3 text-sm font-semibold text-[#6d4de6] hover:bg-[#faf7ff]"
                >
                  Use a Different Email
                </button>
              </div>
            )}

            {shouldShowPrivacyConsent && (
              <div>
                <div className={`rounded-2xl border p-4 ${formErrors.privacy ? 'border-red-300 bg-red-50' : 'border-[#ece6f4] bg-[#faf8fd]'}`}>
                  <label className="flex items-start gap-3 text-sm leading-6 text-[#4e3b5b]">
                    <input
                      type="checkbox"
                      name="privacy_consent"
                      required
                      checked={booking.privacyConsent}
                      onChange={(e) => {
                        setBooking({ ...booking, privacyConsent: e.target.checked })
                        setFormErrors((prev) => ({
                          ...prev,
                          privacy: e.target.checked ? '' : prev.privacy,
                        }))
                      }}
                      className="mt-1 h-4 w-4 rounded border-[#c9bcf1] text-[#6d4de6] focus:ring-[#c9bcf1]"
                    />
                    <span>
                      I agree to the{' '}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-[#6d4de6] underline decoration-[#6d4de6]/60 underline-offset-2"
                      >
                        Data Privacy Policy
                      </a>{' '}
                      and consent to the collection and processing of my personal information for appointment booking purposes.
                    </span>
                  </label>
                </div>
                {formErrors.privacy && <p className="text-red-500 text-xs mt-1">{formErrors.privacy}</p>}
              </div>
            )}

            {!isReturningCustomerPendingVerification && (
              <div className="flex flex-col sm:flex-row gap-2">
                {isEmailLocked && (
                  <button
                    type="button"
                    onClick={handleUseDifferentEmail}
                    className="tap-safe flex-1 rounded-xl border border-[#d8ccff] bg-white px-5 py-3.5 text-base font-semibold text-[#6d4de6] hover:bg-[#faf7ff]"
                  >
                    Use a Different Email
                  </button>
                )}
                <button
                  onClick={handleNextStep}
                  disabled={customerProfileSaving || customerLookupState === 'checking_email'}
                  className="booking-primary-btn flex-1 mt-0 text-base font-semibold px-5 py-3.5 rounded-xl disabled:opacity-60"
                >
                  {customerLookupState === 'idle' || customerLookupState === 'checking_email'
                    ? 'Continue'
                    : customerLookupState === 'new_customer'
                      ? 'Continue to Services'
                      : shouldShowCustomerProfileInputs
                        ? (customerProfileSaving ? 'Saving...' : 'Save and Continue')
                        : 'Continue to Services'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Customer Information */}
      {false && step === 1 && (
        <div className="booking-step-card bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_18px_36px_rgba(94,64,102,0.12)] p-5 sm:p-8 md:p-10 max-w-5xl mx-auto w-full">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">Customer Information</h2>
          <p className="text-base md:text-lg text-gray-700 mb-7">
            Please provide your information to proceed with booking
          </p>
          
          <div className="space-y-5">
            <div>
              <label className="block text-base font-medium mb-2 text-gray-900">Full Name *</label>
              <div className="booking-input-wrap">
                <span className="booking-input-icon" aria-hidden="true">Ã°Å¸â€˜Â¤</span>
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
                <span className="booking-input-icon" aria-hidden="true">Ã¢Å“â€°</span>
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
                <span className="booking-input-icon" aria-hidden="true">Ã°Å¸â€œÅ¾</span>
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
                <span className="booking-input-icon" aria-hidden="true">Ã°Å¸â€œÂ</span>
                <input
                  type="text"
                  className="booking-input w-full border rounded-xl pl-11 pr-4 py-3.5 text-base text-gray-900 placeholder-gray-500"
                  placeholder="Your address"
                  value={booking.address}
                  onChange={e => setBooking({ ...booking, address: e.target.value })}
                />
              </div>
            </div>

            <div>
              <div className={`rounded-2xl border p-4 ${formErrors.privacy ? 'border-red-300 bg-red-50' : 'border-[#ece6f4] bg-[#faf8fd]'}`}>
                <label className="flex items-start gap-3 text-sm leading-6 text-[#4e3b5b]">
                  <input
                    type="checkbox"
                    name="privacy_consent"
                    required
                    checked={booking.privacyConsent}
                    onChange={(e) => {
                      setBooking({ ...booking, privacyConsent: e.target.checked })
                      setFormErrors((prev) => ({
                        ...prev,
                        privacy: e.target.checked ? '' : prev.privacy,
                      }))
                    }}
                    className="mt-1 h-4 w-4 rounded border-[#c9bcf1] text-[#6d4de6] focus:ring-[#c9bcf1]"
                  />
                  <span>
                    I agree to the{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#6d4de6] underline decoration-[#6d4de6]/60 underline-offset-2"
                    >
                      Data Privacy Policy
                    </a>{' '}
                    and consent to the collection and processing of my personal information for appointment booking purposes.
                  </span>
                </label>
              </div>
              {formErrors.privacy && <p className="text-red-500 text-xs mt-1">{formErrors.privacy}</p>}
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

      {/* Step 2: Select Service */}
      {step === 2 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] items-start">
          <div className="booking-step-card booking-step2-shell bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_14px_30px_rgba(94,64,102,0.1)] p-5 md:p-6">
            <h2 className="text-2xl font-bold text-[#2C1338]">Select Service</h2>
            <p className="mt-2 text-sm text-[#6f5b7e]">Choose one or more services before you pick an appointment schedule.</p>

            <div className="booking-panel mt-5 max-h-[620px] overflow-y-auto border border-[#ece6f4] rounded-2xl p-4 space-y-3 bg-white shadow-[0_8px_20px_rgba(44,19,56,0.06)]">
              {services.map(s => {
                const serviceIdStr = s.id.toString()
                const isSelected = selectedServices.includes(serviceIdStr) || selectedService === serviceIdStr

                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                      isSelected ? 'bg-[#f3efff] border-[#6d4de6]' : 'border-[#ece6f4] hover:border-[#d8ccff] hover:bg-[#faf7ff]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newServices = [...selectedServices, serviceIdStr]
                          setSelectedServices(newServices)
                          if (newServices.length === 1) {
                            setSelectedService(serviceIdStr)
                          }
                        } else {
                          const newServices = selectedServices.filter(id => id !== serviceIdStr)
                          setSelectedServices(newServices)
                          if (selectedService === serviceIdStr) {
                            setSelectedService(newServices[0] || '')
                          }
                        }
                        setSelectedSlot(null)
                      }}
                      className="w-5 h-5 text-[#6d4de6] rounded"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-[#2C1338] text-lg leading-tight">{s.name}</div>
                      {s.variants && s.variants.length > 0 ? (
                        <div className="text-sm text-[#5a4767] mt-1">
                          <div className="font-medium text-[#6d4de6] mb-1.5">
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
                                        [s.id]: variant.id,
                                      })
                                      setSelectedSlot(null)
                                    }}
                                    className="w-3 h-3 text-[#6d4de6]"
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

            {selectedServices.length > 0 && (
              <div className="text-sm font-semibold text-[#6d4de6] mt-3">
                {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected | Total: {currency(totalPriceForSummary)}
              </div>
            )}
          </div>

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
                <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Services</div>
                {selectedServicesSummaryItems.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {selectedServicesSummaryItems.slice(0, 3).map((serviceItem) => (
                      <li key={serviceItem.id} className="text-xs text-[#4e3b5b]">
                        <span className="font-medium text-[#2C1338]">{serviceItem.label}</span>
                        {' - '}
                        <span className="font-semibold text-[#2C1338]">{currency(serviceItem.priceCents)}</span>
                      </li>
                    ))}
                    {selectedServicesSummaryItems.length > 3 && (
                      <li className="text-xs text-[#7c688f]">+{selectedServicesSummaryItems.length - 3} more</li>
                    )}
                  </ul>
                ) : (
                  <div className="text-xs text-[#7c688f] mt-1">No services selected</div>
                )}
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
                <button
                  onClick={handleContinueFromStepTwo}
                  disabled={!canContinueStepTwo}
                  className="tap-safe booking-primary-btn px-4 py-2.5 rounded-xl disabled:opacity-50"
                >
                  Continue to Date & Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Select Date & Time */}
      {step === 3 && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] items-start">
          <div className="space-y-4">
            <div className="booking-step-card booking-step2-shell bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_14px_30px_rgba(94,64,102,0.1)] p-5 md:p-6">
              <h2 className="text-2xl font-bold text-[#2C1338]">
                {isRescheduleFlow ? 'Select New Date & Time' : 'Select Date & Time'}
              </h2>
              <p className="mt-2 text-sm text-[#6f5b7e]">
                {isRescheduleFlow
                  ? 'Your service details are locked for this reschedule. Choose a new date and time only.'
                  : 'Pick a schedule with available slot capacity for your selected services.'}
              </p>

              <div className="booking-step2-schedule-grid grid xl:grid-cols-2 gap-4 mt-5">
                <div className="space-y-3">
                  <Calendar
                    month={calendarMonth}
                    year={calendarYear}
                    selectedDate={selectedDate}
                    closedDateMap={closedDateMap}
                    onSelect={(date) => {
                      const selected = new Date(date + 'T00:00:00')
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      if (selected >= today) {
                        setHolidayStatusMessage('')
                        setSelectedDate(date)
                        setSelectedSlot(null)
                      }
                    }}
                    onClosedDateSelect={handleClosedDateSelect}
                    onMonthChange={(month, year) => {
                      setCalendarMonth(month)
                      setCalendarYear(year)
                    }}
                  />
                  {(holidayStatusMessage || selectedClosedDateInfo?.message) && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {holidayStatusMessage || selectedClosedDateInfo?.message}
                    </div>
                  )}
                </div>

                <SlotList
                  slots={availability}
                  selected={selectedSlot}
                  loading={availabilityLoading}
                  ready={Boolean((selectedService || selectedServices.length > 0) && !selectedClosedDateInfo)}
                  onSelect={(slot) => {
                    if (slot.available === false) {
                      toast.error('This time slot is already fully booked. Please choose another time.')
                      return
                    }

                    const now = new Date()
                    const slotTime = new Date(slot.start)
                    const minAdvanceTime = new Date(now.getTime() + 30 * 60000)

                    if (slotTime < now) {
                      toast.error('Cannot book appointments in the past. Please select a future time slot.')
                      return
                    }

                    if (slotTime < minAdvanceTime) {
                      const minutesUntilSlot = Math.ceil((slotTime.getTime() - now.getTime()) / 60000)
                      toast.error(`Appointments must be booked at least 30 minutes in advance. This slot is only ${minutesUntilSlot} minute${minutesUntilSlot !== 1 ? 's' : ''} away.`)
                      return
                    }

                    const matchingSlot = availability.find(availSlot =>
                      new Date(availSlot.start).getTime() === new Date(slot.start).getTime() &&
                      availSlot.available !== false
                    )

                    if (matchingSlot) {
                      setSelectedSlot(matchingSlot)
                    } else {
                      toast.error('This time slot is no longer available. Please refresh and choose another time.')
                      fetchAvailability()
                    }
                  }}
                />
              </div>
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
          </div>

          <div className="booking-panel booking-summary-panel rounded-2xl border border-[#ece6f4] bg-white p-4 shadow-[0_8px_20px_rgba(44,19,56,0.07)]">
            <label className="text-sm text-[#2C1338] font-semibold tracking-wide">
              {isRescheduleFlow ? 'Appointment Summary' : 'Booking Summary'}
            </label>
            <div className="mt-3 space-y-3 text-sm">
              <div className="rounded-xl border border-[#efe8f5] bg-[#faf8fd] px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Customer</div>
                <div className="font-semibold text-[#2C1338]">{booking.name || 'Not provided'}</div>
                {booking.email && <div className="text-xs text-[#645272]">{booking.email}</div>}
                {booking.phone && <div className="text-xs text-[#645272]">{booking.phone}</div>}
              </div>

              <div className="rounded-xl border border-[#efe8f5] bg-white px-3 py-2.5">
                <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Services</div>
                {selectedServicesSummaryItems.length > 0 ? (
                  <ul className="mt-1 space-y-1">
                    {selectedServicesSummaryItems.slice(0, 3).map((serviceItem) => (
                      <li key={serviceItem.id} className="text-xs text-[#4e3b5b]">
                        <span className="font-medium text-[#2C1338]">{serviceItem.label}</span>
                        {!isRescheduleFlow && (
                          <>
                            {' - '}
                            <span className="font-semibold text-[#2C1338]">{currency(serviceItem.priceCents)}</span>
                          </>
                        )}
                      </li>
                    ))}
                    {selectedServicesSummaryItems.length > 3 && (
                      <li className="text-xs text-[#7c688f]">+{selectedServicesSummaryItems.length - 3} more</li>
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

              {!isRescheduleFlow && (
                <div className="rounded-xl border border-[#f5d6e4] bg-[#fff6fa] px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-wide text-[#8f5170]">Total Price</div>
                  <div className="text-lg font-semibold text-[#2C1338]">{currency(totalPriceForSummary)}</div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {isRescheduleFlow ? (
                  <button
                    onClick={() => navigate('/customer')}
                    className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl text-sm"
                  >
                    Cancel Reschedule
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl text-sm"
                  >
                    Back to Services
                  </button>
                )}
                <button
                  onClick={handleContinueFromStepThree}
                  disabled={!canContinueStepThree}
                  className="tap-safe booking-primary-btn px-4 py-2.5 rounded-xl disabled:opacity-50"
                >
                  Continue to Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy combined booking step kept disabled to preserve old markup during transition */}
      {false && step === 2 && (
        <>
          <div className="booking-step-card booking-step2-shell bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_14px_30px_rgba(94,64,102,0.1)] p-5 md:p-6">
            <div className="booking-step2-layout">
              <div className="booking-step2-column">
                <div>
                  <label className="text-sm text-[#2C1338] font-semibold tracking-wide">Stylist Selection *</label>
                  <div className="mt-1 text-xs font-medium text-[#6d4de6]">{stylistListHeading}</div>
                </div>
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
                  {activeStylists.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                <div className="booking-panel mt-3 rounded-2xl border border-[#ece6f4] bg-white p-4 shadow-[0_8px_20px_rgba(44,19,56,0.06)]">
                  <input
                    type="text"
                    value={stylistSearch}
                    onChange={(e) => setStylistSearch(e.target.value)}
                    placeholder="Search stylist, role, specialty..."
                    className="w-full border border-[#e7e1ef] rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#d9ceff] focus:border-[#6d4de6]"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {stylistFilterOptions.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setStylistFilter(option.key)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition ${
                          stylistFilter === option.key
                            ? 'bg-gradient-to-r from-[#6d4de6] to-[#7b5cf5] text-white border-[#6d4de6] shadow-[0_8px_18px_rgba(109,77,230,0.18)]'
                            : 'bg-[#faf8fd] text-[#5f4a70] border-[#e9e2f2] hover:bg-[#f3edf9]'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 max-h-[560px] overflow-y-auto space-y-3 pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedStylist(AUTO_STYLIST_VALUE)}
                      className={`w-full rounded-lg border px-4 py-4 text-left transition ${
                        isAutoStylistSelected
                          ? 'border-[#6d4de6] bg-[#f3efff]'
                          : 'border-[#e9e2f2] bg-white hover:bg-[#faf8fd]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#ede7ff] text-[#5b3cc4] flex items-center justify-center text-lg">
                          Ã¢Â­Â
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base text-[#2C1338]">No Preference (Auto-Assign Best Available)</div>
                          <div className="text-sm text-[#6f5b7e] mt-1">The system will choose an available stylist for your selected schedule.</div>
                        </div>
                        <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          isAutoStylistSelected ? 'border-[#6d4de6] bg-[#6d4de6]' : 'border-[#c9bcf1]'
                        }`}>
                          {isAutoStylistSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                      </div>
                    </button>

                    {visibleStylists.length === 0 && (
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
                      const specializationNames = Array.isArray(stylist?.specialization_names)
                        ? stylist.specialization_names.filter(Boolean)
                        : []
                      const metaLabel = specialty || specializationNames.join(', ') || stylist?.role || 'Stylist'
                      const stylistImage = stylist?.image_url || stylist?.image
                      const imageSrc = stylistImage
                        ? (String(stylistImage).startsWith('http')
                          ? stylistImage
                          : `/${String(stylistImage).replace(/^\/+/, '')}`)
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
                                ? 'border-[#6d4de6] bg-[#f3efff]'
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
                                  className="absolute inset-0 h-full w-full object-contain bg-[#fff1f7] p-0.5"
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
                              </div>
                            </div>
                            <div className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#6d4de6] bg-[#6d4de6]' : 'border-[#c9bcf1]'
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
                          isSelected ? 'bg-[#f3efff] border-[#6d4de6]' : 'border-[#ece6f4] hover:border-[#d8ccff] hover:bg-[#faf7ff]'
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
                          className="w-5 h-5 text-[#6d4de6] rounded"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-[#2C1338] text-lg leading-tight">{s.name}</div>
                          {s.variants && s.variants.length > 0 ? (
                            <div className="text-sm text-[#5a4767] mt-1">
                              <div className="font-medium text-[#6d4de6] mb-1.5">
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
                                        className="w-3 h-3 text-[#6d4de6]"
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
                    <div className="text-sm font-semibold text-[#6d4de6] mt-3">
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
                      <div className="font-medium text-[#2C1338]">{stylistSummaryLabel}</div>
                    </div>

                    <div className="rounded-xl border border-[#efe8f5] bg-white px-3 py-2.5">
                      <div className="text-[11px] uppercase tracking-wide text-[#7e6b90]">Services</div>
                      {selectedServicesSummaryItems.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {selectedServicesSummaryItems.slice(0, 3).map((serviceItem) => (
                            <li key={serviceItem.id} className="text-xs text-[#4e3b5b]">
                              <span className="font-medium text-[#2C1338]">{serviceItem.label}</span>
                              {' - '}
                              <span className="font-semibold text-[#2C1338]">{currency(serviceItem.priceCents)}</span>
                            </li>
                          ))}
                          {selectedServicesSummaryItems.length > 3 && (
                            <li className="text-xs text-[#7c688f]">+{selectedServicesSummaryItems.length - 3} more</li>
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
            <div className="space-y-3">
              <Calendar
                month={calendarMonth}
                year={calendarYear}
                selectedDate={selectedDate}
                closedDateMap={closedDateMap}
                onSelect={(date) => {
                  // date is already in YYYY-MM-DD format from Calendar component
                  const selected = new Date(date + 'T00:00:00')
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  if (selected >= today) {
                    setHolidayStatusMessage('')
                    setSelectedDate(date)
                    setSelectedSlot(null) // Reset slot when date changes
                  }
                }}
                onClosedDateSelect={handleClosedDateSelect}
                onMonthChange={(month, year) => {
                  setCalendarMonth(month)
                  setCalendarYear(year)
                }}
              />
              {(holidayStatusMessage || selectedClosedDateInfo?.message) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {holidayStatusMessage || selectedClosedDateInfo?.message}
                </div>
              )}
            </div>
            <SlotList 
              slots={availability} 
              selected={selectedSlot}
              loading={availabilityLoading}
              ready={Boolean(hasStylistSelectionContext && (selectedService || selectedServices.length > 0) && !selectedClosedDateInfo)}
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
                  if (isAutoStylistSelected) {
                    const assignedStylistId = pickAutoAssignedStylistId(slot, selectedSlot?.assignedStylistId)
                    if (!assignedStylistId) {
                      toast.error('No stylist is available for that slot right now. Please choose another time.')
                      return
                    }

                    setSelectedSlot({
                      ...slot,
                      assignedStylistId,
                    })
                    return
                  }

                  setSelectedSlot({
                    ...slot,
                    assignedStylistId: '',
                  })
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

      {step === 4 && rescheduling && (
        <div className="booking-step-card bg-white rounded-3xl border border-[#f0dbe8] shadow-[0_16px_34px_rgba(94,64,102,0.12)] p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Confirm Reschedule</h2>
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2 text-gray-900">Appointment Details</h3>
            <div className="text-sm space-y-1 text-gray-700">
              <div><strong>Customer:</strong> {booking.name || 'Not provided'}</div>
              {booking.email && <div><strong>Email:</strong> {booking.email}</div>}
              {booking.phone && <div><strong>Phone:</strong> {booking.phone}</div>}
              <div><strong>Services:</strong> {selectedServicesSummaryItems.map(item => item.label).join(', ') || 'Not selected'}</div>
              <div><strong>Date:</strong> {selectedDateLabel}</div>
              <div><strong>Time:</strong> {selectedTimeLabel}</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setStep(3)}
              className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl"
            >
              Back
            </button>
            <button
              onClick={handleReschedule}
              disabled={!selectedSlot}
              className="tap-safe booking-primary-btn flex-1 px-4 py-2.5 rounded-xl disabled:opacity-50"
            >
              Confirm Reschedule
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm Booking */}
      {step === 4 && !rescheduling && (payment.method === 'online' || payment.method === 'on_hand') && (() => {
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
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Booking</h2>

            {/* Payment Method Selection (moved from Step 2) */}
            <div className="booking-panel bg-white rounded-2xl border border-[#ece6f4] shadow-[0_10px_24px_rgba(44,19,56,0.07)] p-4 mb-4">
              <h3 className="font-semibold mb-3 text-[#2C1338]">Payment Method</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  payment.method === 'on_hand' ? 'border-[#6d4de6] bg-[#f3efff]' : 'border-[#e4dced] hover:border-[#c9bcf1]'
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
                  payment.method === 'online' ? 'border-[#6d4de6] bg-[#f3efff]' : 'border-[#e4dced] hover:border-[#c9bcf1]'
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
                <div><strong>Services:</strong> {selectedServicesSummaryItems.map(item => item.label).join(', ')}</div>
                <div><strong>Date:</strong> {selectedDateLabel}</div>
                {selectedSlot && (
                  <div><strong>Time:</strong> {selectedTimeLabel}</div>
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
                onChange={async (e) => {
                    const file = e.target.files[0]
                    if (file) {
                      if (file.size > 15 * 1024 * 1024) {
                        toast.error('File size must be less than 15MB before compression')
                        return
                      }
                      
                      try {
                        toast.info('Processing image...', { autoClose: 1500, toastId: 'compressing-img' })
                        const options = {
                          maxSizeMB: 1, // Compress to max 1MB
                          maxWidthOrHeight: 1200,
                          useWebWorker: true,
                          initialQuality: 0.8
                        }
                        const compressedFile = await imageCompression(file, options)
                        
                        setPayment({ 
                          ...payment, 
                          proofFile: compressedFile,
                          proofPreview: URL.createObjectURL(compressedFile)
                        })
                      } catch (error) {
                        console.error('Image compression error:', error)
                        toast.error('Failed to process image. Please try another one.')
                      }
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
                onClick={() => setStep(3)}
                className="tap-safe booking-neutral-btn px-4 py-2.5 rounded-xl"
              >
                Back
              </button>
              <button
                onClick={handleBook}
                disabled={(
                  bookingInProgress ||
                  !payment.proofFile ||
                  (payment.method === 'online' && paymentAccounts.length > 0 && !payment.selectedAccount) ||
                  (selectedPaymentType !== 'full' && payment.amount && parseFloat(payment.amount) < totalAmount * 0.5)
                )}
                className="tap-safe booking-primary-btn flex-1 px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {bookingInProgress
                  ? 'Processing Booking...'
                  : (payment.method === 'online' ? 'Confirm Booking & Pay' : 'Confirm Booking')}
              </button>
            </div>
          </div>
        )
      })()}

      {receipt && receipt.id && (
        <ReceiptModal 
          appointment={receipt}
          isRescheduleReceipt={isRescheduleFlow}
          onClose={() => {
            clearBookingDraft()
            localStorage.removeItem('customer_email')
            localStorage.removeItem('customer_phone')
            setReceipt(null)
            setRescheduling(null)
            setStep(1)
            setSelectedSlot(null)
            // Keep email/phone in form for easy re-booking, but clear other fields
            setBooking({ name: '', email: booking.email, phone: booking.phone, address: '', privacyConsent: false })
            setFormErrors({ email: '', phone: '', payment: '', privacy: '' })
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
            navigate('/customer', { replace: true })
          }} 
        />
      )}
      </div>
      <LandingFooter />
    </div>
  )
}

export default BookAppointment
