import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'react-toastify'
import { toPng } from 'html-to-image'

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
        <div className="bg-white rounded-xl p-6 max-w-md text-center">
          <h3 className="font-bold text-lg mb-2">Receipt Data Incomplete</h3>
          <p className="text-[#8f7a6f] mb-4">Some appointment details are missing. Your booking was successful, but we couldn't load the full receipt.</p>
          <button onClick={onClose} className="w-full bg-[#7b5cf5] text-white px-4 py-2.5 rounded-xl hover:bg-[#6846e8] transition">
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
  const paymentMethodLabel = appointment.payment_method === 'online' || appointment.payment_method === 'gcash'
    ? 'GCash'
    : appointment.payment_method === 'on_hand' || appointment.payment_method === 'cash'
      ? 'Pay at Salon'
      : 'N/A'
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
              body { font-family: Arial, sans-serif; padding: 20px; color: #2c1338; }
              .header { text-align: center; border-bottom: 2px solid #2c1338; padding-bottom: 20px; margin-bottom: 20px; }
              h1 { color: #2c1338; font-size: 24px; margin-bottom: 5px; }
              .section { margin: 15px 0; }
              .label { color: #8b5cf6; font-weight: bold; font-size: 12px; text-transform: uppercase; }
              .value { font-weight: bold; font-size: 16px; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { text-align: left; padding: 10px; background: #f3f0ff; color: #6d28d9; border-bottom: 1px solid #ddd6fe; }
              td { padding: 10px; border-bottom: 1px solid #f3f0ff; }
              .total-row { background: #fdf2f8; font-weight: bold; }
              .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
                <h1>KAYE'S HAIR SALON AND SPA</h1>
                <p>${receiptHeading}</p>
            </div>
            <div class="section">
                <div class="label">Receipt #</div>
                <div class="value">APT-${String(appointment.id).padStart(6, '0')}</div>
            </div>
            <div class="section">
                <div class="label">Customer</div>
                <div class="value">${appointment.customer_name}</div>
                <div>${appointment.customer_email || ''}</div>
                <div>${appointment.customer_phone || ''}</div>
            </div>
            <div class="section">
                <div class="label">Appointment Schedule</div>
                <div class="value">${new Date(appointment.start_datetime_pht || appointment.start_datetime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' })}</div>
                <div>${new Date(appointment.start_datetime_pht || appointment.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} - ${new Date(appointment.end_datetime_pht || appointment.end_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} PHT</div>
            </div>
            ${showFinancialDetails ? `
            <table>
                <thead>
                    <tr>
                        <th>Service</th>
                        <th style="text-align: right">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointmentServices.map(s => `
                        <tr>
                            <td>${getServiceName(s)}</td>
                            <td style="text-align: right">${currency(getServicePrice(s))}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td>Total Amount</td>
                        <td style="text-align: right">${currency(totalPrice)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="section" style="margin-top: 30px">
                <div class="label">Payment Summary</div>
                <div>Method: ${paymentMethodLabel}</div>
                <div>Amount Paid: ${currency(amountPaid)}</div>
                ${paymentMode === 'downpayment' ? `<div>Remaining Balance: ${currency(remainingBalance)}</div>` : ''}
            </div>
            ` : ''}
            <div class="footer">
                <p>Thank you for choosing Kaye's Hair Salon and Spa!</p>
                <p>Note: All payments are non-refundable reservation fees.</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      // Wait for content to load then print
      setTimeout(() => {
        printWindow.print()
      }, 500)
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
      <div className="bg-white rounded-3xl border border-[#eadfd5] shadow-[0_24px_48px_rgba(44,19,56,0.2)] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#2c1338]">{modalTitle}</h2>
            <button 
              onClick={onClose} 
              className="h-10 w-10 flex items-center justify-center rounded-full bg-[#f8f5fe] text-[#7b5cf5] hover:bg-[#efebf9] transition"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div id="receipt" className="bg-white rounded-2xl overflow-hidden border-2 border-[#f3f0ff]">
            <div className="p-6 md:p-8 space-y-6" id="receipt-content">
              <div className="text-center border-b border-[#f3f0ff] pb-6">
                <h1 className="text-3xl font-black text-[#2c1338] tracking-tight">KAYE'S HAIR SALON AND SPA</h1>
                <p className="text-[#8b5cf6] font-bold uppercase tracking-widest text-sm mt-2">{receiptHeading}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] font-bold text-[#8b5cf6] uppercase tracking-wider">Receipt #</div>
                  <div className="font-black text-2xl text-[#2c1338]">{'APT-' + String(appointment.id).padStart(6, '0')}</div>
                  <div className="text-xs text-[#6b7280] mt-1">Booked on {new Date(appointment.created_at).toLocaleString('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' })} PHT</div>
                </div>
                <div className="sm:text-right">
                    <div className="text-[11px] font-bold text-[#8b5cf6] uppercase tracking-wider">Status</div>
                    <div className="mt-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                            appointment.status === 'booked' || appointment.status === 'confirmed' ? 'bg-pink-100 text-pink-700' :
                            appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {appointment.status.toUpperCase()}
                        </span>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-[#f3f0ff] pt-6">
                <div>
                  <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-3">Customer</h3>
                  <div className="space-y-1 text-sm font-medium text-[#2c1338]">
                    <div className="text-base font-bold">{appointment.customer_name}</div>
                    <div className="text-[#6b7280]">{appointment.customer_email || 'N/A'}</div>
                    <div className="text-[#6b7280]">{appointment.customer_phone || 'N/A'}</div>
                    {appointment.customer_address && <div className="text-[#6b7280]">{appointment.customer_address}</div>}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-3">Schedule</h3>
                  <div className="space-y-1 text-sm font-medium text-[#2c1338]">
                    <div className="text-base font-bold">
                        {(() => {
                            const startSource = appointment.start_datetime_pht || appointment.start_datetime
                            const startDate = new Date(startSource)
                            return startDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'Asia/Manila'
                            })
                        })()}
                    </div>
                    <div className="text-[#6b7280]">
                        {(() => {
                            const startSource = appointment.start_datetime_pht || appointment.start_datetime
                            const endSource = appointment.end_datetime_pht || appointment.end_datetime
                            const startDate = new Date(startSource)
                            const endDate = new Date(endSource)
                            const startTime = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })
                            const endTime = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })
                            return `${startTime} - ${endTime} PHT`
                        })()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#f3f0ff] pt-6">
                <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-4">Services</h3>
                <div className="space-y-3">
                    {appointmentServices.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-[#2c1338]">{getServiceName(s)}</span>
                            {showFinancialDetails && <span className="font-medium text-[#6b7280]">{currency(getServicePrice(s))}</span>}
                        </div>
                    ))}
                    {showFinancialDetails && (
                        <div className="flex justify-between items-center pt-3 border-t border-dashed border-[#f3f0ff]">
                            <span className="font-bold text-[#2c1338] text-lg">Total Amount</span>
                            <span className="font-black text-xl text-[#10b981]">{currency(totalPrice)}</span>
                        </div>
                    )}
                </div>
              </div>

              {showFinancialDetails && (
                <div className="border-t border-[#f3f0ff] pt-6">
                    <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-wider mb-4">Payment Summary</h3>
                    <div className="rounded-2xl bg-[#faf9ff] p-5 space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#6b7280] font-medium">Method</span>
                            <span className="font-bold text-[#2c1338]">{paymentMethodLabel}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#6b7280] font-medium">Amount Paid</span>
                            <span className="font-bold text-[#2c1338]">{currency(amountPaid)}</span>
                        </div>
                        {paymentMode === 'downpayment' && (
                            <div className="flex justify-between pt-2 border-t border-[#efebf9]">
                                <span className="text-[#6b7280] font-medium">Remaining Balance</span>
                                <span className="font-black text-[#f59e0b]">{currency(remainingBalance)}</span>
                            </div>
                        )}
                    </div>
                </div>
              )}

              <div className="pt-6 text-center">
                <p className="text-[10px] text-[#9ca3af] leading-relaxed italic">
                  Note: All payments are non-refundable reservation fees. Downpayments may only be transferred to a rescheduled appointment if approved by the salon.
                </p>
                <p className="mt-4 text-sm font-bold text-[#7b5cf5]">Thank you for choosing Kaye's Hair Salon and Spa!</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handlePrint}
              className="tap-safe flex items-center justify-center gap-2 bg-[#7b5cf5] text-white px-4 py-3 rounded-2xl font-bold hover:bg-[#6846e8] transition shadow-lg shadow-[#7b5cf5]/20"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={handleDownload}
              className="tap-safe flex items-center justify-center gap-2 bg-[#10b981] text-white px-4 py-3 rounded-2xl font-bold hover:bg-[#059669] transition shadow-lg shadow-[#10b981]/20"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="tap-safe flex items-center justify-center bg-[#f3f0ff] text-[#7b5cf5] px-4 py-3 rounded-2xl font-bold hover:bg-[#efebf9] transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ReceiptModal
