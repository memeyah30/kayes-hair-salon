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
                <div className="md:hidden space-y-3">
                  {sales.map((sale) => (
                    <div key={sale.id} className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-4 shadow-sm">
                      <div className="flex items-start justify-between border-b border-[#F0EDFF] pb-2 mb-2">
                        <div>
                          <div className="text-[10px] font-bold text-[#7B5CF5] uppercase">Sales ID: #{sale.id}</div>
                          <div className="text-sm font-bold text-[#2D2D2D]">{sale.customer_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-[#6B6B6B]">Booking ID</div>
                          <div className="text-xs font-bold text-[#2D2D2D]">#{sale.appointment_id}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#6B6B6B]">Date:</span>
                          <span className="font-medium">{formatDate(sale.created_at)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#6B6B6B]">Services:</span>
                          <span className="font-medium text-right ml-4">{sale.item_name}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#6B6B6B]">Payment Method:</span>
                          <span className="uppercase font-bold text-[#7B5CF5]">{sale.payment_method}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-1 border-t border-[#F0EDFF]">
                          <span className="font-bold">Total:</span>
                          <span className="font-bold text-[#7B5CF5]">{currency(sale.total_amount_cents)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Type</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Method</th>
                        <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Total</th>
                        <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Paid</th>
                        <th className="p-3 text-right text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">Balance</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">P. Status</th>
                        <th className="p-3 text-left text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]">A. Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD6FE]">
                      {sales.map(sale => (
                        <tr key={sale.id} className="transition hover:bg-[#F6F2FF] text-xs">
                          <td className="p-3 text-[#7B5CF5] font-bold">#{sale.id}</td>
                          <td className="p-3 font-medium">#{sale.appointment_id}</td>
                          <td className="p-3 font-semibold text-[#2D2D2D]">{sale.customer_name}</td>
                          <td className="p-3">
                            <div className="max-w-[150px] truncate" title={sale.item_name}>
                              {sale.item_name}
                            </div>
                          </td>
                          <td className="p-3 text-[#6B6B6B]">
                            {sale.appointment ? formatDate(sale.appointment.start_datetime_pht || sale.appointment.start_datetime) : formatDate(sale.created_at)}
                          </td>
                          <td className="p-3">
                            <span className="uppercase text-[10px] font-bold text-[#6B6B6B]">
                              {sale.appointment?.mode_of_payment || 'Full'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="uppercase text-[10px] font-bold text-[#7B5CF5]">
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-right font-bold text-[#2D2D2D]">{currency(sale.total_amount_cents)}</td>
                          <td className="p-3 text-right text-[#10B981] font-bold">
                            {sale.appointment ? currency(sale.appointment.amount_paid_cents) : currency(sale.total_amount_cents)}
                          </td>
                          <td className="p-3 text-right text-[#F59E0B] font-bold">
                            {sale.appointment ? currency(sale.appointment.remaining_balance_cents) : '₱0.00'}
                          </td>
                          <td className="p-3">
                             <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                              sale.payment_status === 'paid' ? 'bg-[#DCFCE7] text-[#15803D]' :
                              sale.payment_status === 'pending' ? 'bg-[#FEF3C7] text-[#B45309]' :
                              'bg-[#F3F4F6] text-[#6B6B6B]'
                            }`}>
                              {sale.payment_status || 'Paid'}
                            </span>
                          </td>
                          <td className="p-3">
                            {sale.appointment && (
                              <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase ${
                                sale.appointment.status === 'completed' ? 'bg-[#DCFCE7] text-[#15803D]' :
                                sale.appointment.status === 'booked' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                                sale.appointment.status === 'cancelled' ? 'bg-[#FDE8E8] text-[#9B1C1C]' :
                                'bg-[#F3F4F6] text-[#6B6B6B]'
                              }`}>
                                {sale.appointment.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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
    </AdminLayout>
  )
}

export default SalesMonitoring




