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
  const [filters, setFilters] = useState({})

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

  const currency = (cents) => `PHP ${(cents / 100).toFixed(2)}`

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
            <div className="grid md:grid-cols-2 gap-4">
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
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-sm text-[#6B6B6B]">Total Sales</div>
                <div className="text-2xl font-bold text-[#7B5CF5]">{currency(stats.total_sales_cents)}</div>
                <div className="mt-1 text-xs text-[#6B6B6B]">
                  {stats.period.start_date} to {stats.period.end_date}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-sm text-[#6B6B6B]">Service Sales</div>
                <div className="text-2xl font-bold text-[#22C55E]">
                  {currency(stats.sales_by_type?.service || 0)}
                </div>
              </div>
              <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-5 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
                <div className="text-sm text-[#6B6B6B]">Cash Payments</div>
                <div className="text-2xl font-bold text-[#F59E0B]">
                  {currency(stats.sales_by_payment_method?.cash || 0)}
                </div>
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
                    <div key={sale.id} className="rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-[#2D2D2D]">{sale.item_name}</div>
                          <div className="mt-1 text-xs text-[#6B6B6B]">{formatDate(sale.created_at)}</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[#6B6B6B]">
                        <div>Qty: {sale.quantity}</div>
                        <div className="text-right">Unit: {currency(sale.unit_price_cents)}</div>
                        <div>Customer: {sale.customer_name || '-'}</div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${
                          sale.payment_method === 'cash' ? 'bg-[#FEF3C7] text-[#B45309]' :
                          sale.payment_method === 'gcash' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                          'bg-[#DCFCE7] text-[#15803D]'
                        }`}>
                          {sale.payment_method}
                        </span>
                        <span className="text-base font-semibold text-[#7B5CF5]">{currency(sale.total_amount_cents)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-[#F2EDFF]">
                      <tr className="border-b border-[#DDD6FE]">
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Date</th>
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Services</th>
                        <th className="p-3 text-right text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Quantity</th>
                        <th className="p-3 text-right text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Unit Price</th>
                        <th className="p-3 text-right text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Total</th>
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Payment</th>
                        <th className="p-3 text-left text-xs font-medium uppercase tracking-[0.15em] text-[#6B6B6B]">Customer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DDD6FE]">
                      {sales.map(sale => (
                        <tr key={sale.id} className="transition hover:bg-[#F6F2FF]">
                          <td className="p-3 text-sm text-[#2D2D2D]">{formatDate(sale.created_at)}</td>
                          <td className="p-3 text-[#2D2D2D]">{sale.item_name}</td>
                          <td className="p-3 text-right text-[#2D2D2D]">{sale.quantity}</td>
                          <td className="p-3 text-right text-[#2D2D2D]">{currency(sale.unit_price_cents)}</td>
                          <td className="p-3 text-right font-bold text-[#7B5CF5]">{currency(sale.total_amount_cents)}</td>
                          <td className="p-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs ${
                              sale.payment_method === 'cash' ? 'bg-[#FEF3C7] text-[#B45309]' :
                              sale.payment_method === 'gcash' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                              'bg-[#DCFCE7] text-[#15803D]'
                            }`}>
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-[#2D2D2D]">{sale.customer_name || '-'}</td>
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




