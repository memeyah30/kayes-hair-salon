import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'
import Pagination from '../../components/Pagination'

const getManilaDateInput = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

const isDateInput = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))

const getDateRangeFromSearch = (search, todayKey) => {
  const monthStart = `${todayKey.slice(0, 7)}-01`
  const params = new URLSearchParams(search)
  const startParam = params.get('start_date')
  const endParam = params.get('end_date')
  const rangeParam = params.get('range')

  if (isDateInput(startParam) && isDateInput(endParam)) {
    return { start_date: startParam, end_date: endParam }
  }
  if (isDateInput(startParam) && !endParam) {
    return { start_date: startParam, end_date: startParam }
  }
  if (!startParam && isDateInput(endParam)) {
    return { start_date: endParam, end_date: endParam }
  }
  if (rangeParam === 'today') {
    return { start_date: todayKey, end_date: todayKey }
  }

  return { start_date: monthStart, end_date: todayKey }
}

const SalesMonitoring = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const manilaToday = getManilaDateInput()
  const [sales, setSales] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  })
  const [dateRange, setDateRange] = useState(() => getDateRangeFromSearch(location.search, manilaToday))
  const [filters, setFilters] = useState({
    payment_method: '',
    payment_status: '',
    appointment_status: '',
    q: '',
  })

  useEffect(() => {
    const nextRange = getDateRangeFromSearch(location.search, manilaToday)
    setDateRange((prev) => (
      prev.start_date === nextRange.start_date && prev.end_date === nextRange.end_date
        ? prev
        : nextRange
    ))
  }, [location.search, manilaToday])

  useEffect(() => {
    loadStats()
  }, [dateRange, filters])

  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, filters])

  useEffect(() => {
    loadSales(currentPage)
  }, [currentPage, dateRange, filters])

  const loadSales = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      if (filters.payment_method) params.append('payment_method', filters.payment_method)
      if (filters.payment_status) params.append('payment_status', filters.payment_status)
      if (filters.appointment_status) params.append('appointment_status', filters.appointment_status)
      if (filters.q) params.append('q', filters.q)
      params.append('paginate', '1')
      params.append('per_page', '10')
      params.append('page', String(page))

      const res = await api.get(`/sales?${params.toString()}`)
      setSales(res.data?.data || [])
      setPagination({
        current_page: res.data?.current_page || 1,
        last_page: res.data?.last_page || 1,
        per_page: res.data?.per_page || 10,
        total: res.data?.total || 0,
        from: res.data?.from || 0,
        to: res.data?.to || 0,
      })
    } catch (e) {
      toast.error('Failed to load sales')
      console.error(e)
      setSales([])
      setPagination({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const params = new URLSearchParams()
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)

      const res = await api.get(`/sales/stats?${params.toString()}`)
      setStats(res.data)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  const currency = (cents) => `₱${(cents / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const [selectedSale, setSelectedSale] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const groupSalesByAppointment = (salesList) => {
    const grouped = {}
    salesList.forEach((sale) => {
      const key = sale.appointment_id ? `apt-${sale.appointment_id}` : `sale-${sale.id}`
      if (!grouped[key]) {
        grouped[key] = {
          ...sale,
          items: [sale],
          computed_total_cents: sale.total_amount_cents,
        }
      } else {
        grouped[key].items.push(sale)
        grouped[key].computed_total_cents += sale.total_amount_cents
      }
    })
    return Object.values(grouped)
  }

  const groupedSales = groupSalesByAppointment(sales)

  const [exporting, setExporting] = useState(false)

  const handleExportPdf = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      if (filters.payment_method) params.append('payment_method', filters.payment_method)
      if (filters.payment_status) params.append('payment_status', filters.payment_status)
      if (filters.appointment_status) params.append('appointment_status', filters.appointment_status)
      if (filters.q) params.append('q', filters.q)
      const baseUrl = api.defaults.baseURL || ''
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const url = `${baseUrl}/sales/export-pdf?${params.toString()}${token ? `&token=${token}` : ''}`
      
      // Since it's a file download, we can use window.open or a hidden anchor
      // But we need to handle auth. Laravel Sanctum usually uses cookies or headers.
      // If using Bearer token, we might need a different approach for direct links.
      // For simplicity, if the API is on the same domain or uses cookies, a simple window.location.href works.
      // However, if we need the token, we can pass it as a query param (if the backend supports it) or use a blob.
      
      const response = await api.get(`/sales/export-pdf?${params.toString()}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `sales_report_${dateRange.start_date}_to_${dateRange.end_date}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
      
      toast.success('PDF report generated successfully')
    } catch (e) {
      toast.error('Failed to export PDF')
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AdminLayout userType="admin" title="Sales Reports">
      <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="tap-safe flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-xl font-bold text-[#7B5CF5] shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition hover:bg-[#F6F2FF] hover:text-[#6846E8]"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <h1 className="text-2xl font-bold text-[#2D2D2D]">Sales Monitoring</h1>
            </div>
            
            <button
              onClick={handleExportPdf}
              disabled={exporting || loading}
              className="tap-safe flex items-center justify-center gap-2 rounded-xl bg-[#7B5CF5] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(123,92,245,0.24)] transition hover:bg-[#6846E8] disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          </div>

          {/* Filters */}
          <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
            <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Start Date</label>
                <input
                  type="date"
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">End Date</label>
                <input
                  type="date"
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Payment Method</label>
                <select
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={filters.payment_method}
                  onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                >
                  <option value="">All Methods</option>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                  <option value="paymaya">PayMaya</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Payment Status</label>
                <select
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={filters.payment_status}
                  onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Appt. Status</label>
                <select
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={filters.appointment_status}
                  onChange={(e) => setFilters({ ...filters, appointment_status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="booked">Booked</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Search</label>
                <input
                  type="text"
                  placeholder="ID or Customer..."
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Total Sales</div>
                <div className="text-xl font-bold text-[#7B5CF5]">{currency(stats.total_sales_cents)}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Total Collected</div>
                <div className="text-xl font-bold text-[#22C55E]">{currency(stats.appointments_summary?.total_collected_cents || 0)}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Remaining Balance</div>
                <div className="text-xl font-bold text-[#F59E0B]">{currency(stats.appointments_summary?.total_remaining_balance_cents || 0)}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Completed</div>
                <div className="text-xl font-bold text-[#10B981]">{stats.appointments_summary?.count_completed || 0}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Downpayments</div>
                <div className="text-xl font-bold text-[#6366F1]">{currency(stats.appointments_summary?.total_downpayment_cents || 0)}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Full Payments</div>
                <div className="text-xl font-bold text-[#8B5CF6]">{currency(stats.appointments_summary?.total_full_payment_cents || 0)}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Cancelled</div>
                <div className="text-xl font-bold text-[#EF4444]">{stats.appointments_summary?.count_cancelled || 0}</div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-[10px] uppercase tracking-wider text-[#6B6B6B]">Missed</div>
                <div className="text-xl font-bold text-[#6B7280]">{stats.appointments_summary?.count_missed || 0}</div>
              </div>
            </div>
          )}

          {/* Top Selling Items */}
          {stats?.top_selling_items && stats.top_selling_items.length > 0 && (
            <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
              <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">Top Services</h2>
              <div className="md:hidden space-y-2">
                {stats.top_selling_items.map((item, idx) => (
                  <div key={idx} className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                    <div className="font-medium text-[#2D2D2D]">{item.item_name}</div>
                    <div className="mt-2 flex items-center justify-between text-sm text-[#6B6B6B]">
                      <span>Qty: {item.total_quantity}</span>
                      <span className="font-semibold text-[#7B5CF5]">{currency(item.total_revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-[#F2EDFF]">
                    <tr className="border-b border-[#DDD6FE]">
                      <th className="p-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Service</th>
                      <th className="p-3 text-right text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Quantity Sold</th>
                      <th className="p-3 text-right text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD6FE]">
                    {stats.top_selling_items.map((item, idx) => (
                      <tr key={idx} className="transition hover:bg-[#F6F2FF]">
                        <td className="p-3 text-[#2D2D2D]">{item.item_name}</td>
                        <td className="p-3 text-right text-[#2D2D2D]">{item.total_quantity}</td>
                        <td className="p-3 text-right font-bold text-[#7B5CF5]">{currency(item.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales List */}
          <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
            <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">Sales Transactions</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <>
                <div className="md:hidden space-y-4">
                  {groupedSales.map((sale) => {
                    const apt = sale.appointment
                    const total = apt ? apt.total_amount_cents : sale.computed_total_cents
                    const paid = apt ? apt.amount_paid_cents : sale.computed_total_cents
                    const balance = apt ? apt.remaining_balance_cents : 0
                    const dp = apt ? (apt.downpayment_amount_cents || 0) : 0
                    const servicesLabel = sale.items.length > 1 
                      ? `${sale.items[0].item_name} + ${sale.items.length - 1} more`
                      : (sale.items[0]?.item_name || 'Service')

                    return (
                      <div key={sale.id} className="rounded-2xl border border-[#DDD6FE] bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-[#F0EDFF] pb-3 mb-3">
                          <div>
                            <div className="text-[10px] font-bold text-[#7B5CF5] uppercase">Booking #{sale.appointment_id || 'N/A'}</div>
                            <div className="text-sm font-bold text-[#2D2D2D]">{sale.customer_name}</div>
                          </div>
                          <button 
                            onClick={() => { setSelectedSale(sale); setShowModal(true); }}
                            className="text-xs font-semibold text-[#7B5CF5] hover:underline"
                          >
                            Details
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#6B6B6B]">Services:</span>
                            <span className="font-medium text-right max-w-[180px]">{servicesLabel}</span>
                          </div>
                          
                          <div className="rounded-xl bg-[#F9F8FF] p-3 space-y-1.5">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6B6B6B]">Total:</span>
                              <span className="font-bold">{currency(total)}</span>
                            </div>
                            {dp > 0 && (
                              <div className="flex justify-between text-xs">
                                <span className="text-[#6B6B6B]">Deposit:</span>
                                <span>{currency(dp)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-xs text-green-600">
                              <span className="font-medium">Paid:</span>
                              <span className="font-bold">{currency(paid)}</span>
                            </div>
                            {balance > 0 && (
                              <div className="flex justify-between text-xs text-orange-600 border-t border-[#EEEBFF] pt-1.5">
                                <span className="font-medium">Balance:</span>
                                <span className="font-bold">{currency(balance)}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                                (apt?.status === 'completed' || sale.payment_status === 'paid') ? 'bg-[#DCFCE7] text-[#15803D]' :
                                (balance > 0 || sale.payment_status === 'downpayment') ? 'bg-[#FEF3C7] text-[#B45309]' :
                                'bg-[#F3F4F6] text-[#6B6B6B]'
                              }`}>
                                {apt?.status === 'completed' || sale.payment_status === 'paid' ? 'Paid' : (balance > 0 || sale.payment_status === 'downpayment') ? 'Partially Paid' : sale.payment_status}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                                apt?.status === 'completed' ? 'bg-[#DCFCE7] text-[#15803D]' :
                                (apt?.status === 'booked' || apt?.status === 'confirmed') ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                                apt?.status === 'cancelled' ? 'bg-[#FDE8E8] text-[#9B1C1C]' :
                                'bg-[#F3F4F6] text-[#6B6B6B]'
                              }`}>
                                {apt?.status || 'Completed'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#6B6B6B]">{formatDate(sale.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-[#F2EDFF]">
                      <tr className="border-b border-[#DDD6FE]">
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Sales ID</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Booking ID</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Customer</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Services</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Date</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Payment Summary</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">P. Status</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">A. Status</th>
                        <th className="p-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD6FE]">
                      {groupedSales.map(sale => {
                        const apt = sale.appointment
                        const total = apt ? apt.total_amount_cents : sale.computed_total_cents
                        const paid = apt ? apt.amount_paid_cents : sale.computed_total_cents
                        const balance = apt ? apt.remaining_balance_cents : 0
                        const dp = apt ? (apt.downpayment_amount_cents || 0) : 0
                        const servicesLabel = sale.items.length > 1 
                          ? `${sale.items[0].item_name} + ${sale.items.length - 1} more`
                          : (sale.items[0]?.item_name || 'Service')

                        return (
                          <tr key={sale.id} className="transition hover:bg-[#F6F2FF] text-xs">
                            <td className="p-3 text-[#7B5CF5] font-bold">#{sale.id}</td>
                            <td className="p-3 font-medium">#{sale.appointment_id || 'N/A'}</td>
                            <td className="p-3 font-semibold text-[#2D2D2D]">{sale.customer_name}</td>
                            <td className="p-3">
                              <div className="max-w-[150px] truncate" title={sale.items.map(i => i.item_name).join(', ')}>
                                {servicesLabel}
                              </div>
                            </td>
                            <td className="p-3 text-[#6B6B6B]">
                              {formatDate(sale.created_at)}
                            </td>
                            <td className="p-3">
                              <div className="text-[10px] space-y-0.5 min-w-[120px]">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Total:</span>
                                  <span className="font-bold">{currency(total)}</span>
                                </div>
                                {dp > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Deposit:</span>
                                    <span>{currency(dp)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-green-600">
                                  <span className="font-medium">Paid:</span>
                                  <span className="font-bold">{currency(paid)}</span>
                                </div>
                                {balance > 0 && (
                                  <div className="flex justify-between text-orange-600 border-t border-gray-100 mt-0.5 pt-0.5">
                                    <span className="font-medium">Balance:</span>
                                    <span className="font-bold">{currency(balance)}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                               <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                                (apt?.status === 'completed' || sale.payment_status === 'paid') ? 'bg-[#DCFCE7] text-[#15803D]' :
                                (balance > 0 || sale.payment_status === 'downpayment') ? 'bg-[#FEF3C7] text-[#B45309]' :
                                'bg-[#F3F4F6] text-[#6B6B6B]'
                              }`}>
                                {apt?.status === 'completed' || sale.payment_status === 'paid' ? 'Paid' : (balance > 0 || sale.payment_status === 'downpayment') ? 'Partially Paid' : sale.payment_status}
                              </span>
                            </td>
                            <td className="p-3">
                              {apt && (
                                <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                                  apt.status === 'completed' ? 'bg-[#DCFCE7] text-[#15803D]' :
                                  (apt.status === 'booked' || apt.status === 'confirmed') ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                                  apt.status === 'cancelled' ? 'bg-[#FDE8E8] text-[#9B1C1C]' :
                                  'bg-[#F3F4F6] text-[#6B6B6B]'
                                }`}>
                                  {apt.status}
                                </span>
                              )}
                            </td>
>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => { setSelectedSale(sale); setShowModal(true); }}
                                className="tap-safe inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f2efff] text-[#7B5CF5] transition hover:bg-[#e6e0ff] shadow-sm"
                                title="View Details"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                  <circle cx="12" cy="7" r="3" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {sales.length === 0 && (
                  <div className="py-8 text-center text-[#6B6B6B]">No sales found for the selected period</div>
                )}
                {sales.length > 0 && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={setCurrentPage}
                    loading={loading}
                  />
                )}
              </>
            )}
          </div>
      </div>

      {showModal && selectedSale && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1B1237]/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg rounded-[24px] border border-[#DDD6FE] bg-white p-6 shadow-2xl animate-fadeInUp">
            <div className="mb-6 flex items-center justify-between border-b border-[#F0EDFF] pb-4">
              <h3 className="text-xl font-bold text-[#2D2D2D]">Transaction Details</h3>
              <button onClick={() => setShowModal(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[#7B5CF5] uppercase">Booking ID</div>
                  <div className="text-sm font-semibold">#{selectedSale.appointment_id || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#7B5CF5] uppercase">Transaction Date</div>
                  <div className="text-sm font-semibold">{formatDate(selectedSale.created_at)}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-[#7B5CF5] uppercase mb-2">Customer Information</div>
                <div className="rounded-xl border border-[#F0EDFF] bg-[#F9F8FF] p-3">
                  <div className="font-bold text-[#2D2D2D]">{selectedSale.customer_name}</div>
                  {selectedSale.customer_phone && <div className="text-xs text-[#6B6B6B]">{selectedSale.customer_phone}</div>}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-[#7B5CF5] uppercase mb-2">Services Availed</div>
                <div className="space-y-2">
                  {selectedSale.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-[#2D2D2D]">{item.item_name}</span>
                      <span className="font-semibold">{currency(item.total_amount_cents)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#F0EDFF] pt-4">
                <div className="text-[10px] font-bold text-[#7B5CF5] uppercase mb-2">Payment Breakdown</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B6B6B]">Total Amount</span>
                    <span className="font-bold">{currency(selectedSale.appointment?.total_amount_cents || selectedSale.computed_total_cents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B6B6B]">Downpayment / Deposit</span>
                    <span>{currency(selectedSale.appointment?.downpayment_amount_cents || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span className="font-medium">Total Paid</span>
                    <span className="font-bold">{currency(selectedSale.appointment?.amount_paid_cents || selectedSale.computed_total_cents)}</span>
                  </div>
                  {selectedSale.appointment?.remaining_balance_cents > 0 && (
                    <div className="flex justify-between text-sm text-orange-600 font-bold border-t border-[#F0EDFF] pt-2">
                      <span>Remaining Balance</span>
                      <span>{currency(selectedSale.appointment.remaining_balance_cents)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="text-[10px] font-bold text-[#7B5CF5] uppercase">Payment Method</div>
                  <div className="text-xs font-bold uppercase text-[#7B5CF5]">{selectedSale.payment_method}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#7B5CF5] uppercase">Payment Status</div>
                  <div className="text-xs font-bold uppercase">{selectedSale.payment_status}</div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button onClick={() => setShowModal(false)} className="w-full rounded-xl bg-[#7B5CF5] py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#6846E8]">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default SalesMonitoring




