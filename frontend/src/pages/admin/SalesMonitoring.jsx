import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'
import Pagination from '../../components/Pagination'
import DataTable from 'datatables.net-react'
import DT from 'datatables.net-dt'
import 'datatables.net-responsive-dt'

DataTable.use(DT)

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
    transaction_type: '',
    stylist_id: '',
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
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type)
      if (filters.stylist_id) params.append('stylist_id', filters.stylist_id)
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
          </div>

          {/* Filters */}
          <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
            <div className="grid md:grid-cols-4 gap-4">
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
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Transaction Type</label>
                <select
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={filters.transaction_type}
                  onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
                >
                  <option value="">All Types</option>
                  <option value="service">Service</option>
                  <option value="product">Product</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Stylist</label>
                <select
                  className="tap-safe w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={filters.stylist_id}
                  onChange={(e) => setFilters({ ...filters, stylist_id: e.target.value })}
                >
                  <option value="">All Stylists</option>
                  {/* You can load stylists here if needed */}
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                <div className="text-sm text-[#6B6B6B]">Product Sales</div>
                <div className="text-2xl font-bold text-[#3B82F6]">
                  {currency(stats.sales_by_type?.product || 0)}
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
              <div className="hidden md:block overflow-x-auto datatable-container">
                <DataTable
                  data={stats.top_selling_items}
                  columns={[
                    { title: 'Service', data: 'item_name' },
                    { title: 'Quantity Sold', data: 'total_quantity', className: 'text-right' },
                    { title: 'Total Revenue', data: 'total_revenue', className: 'text-right font-bold text-[#7B5CF5]', render: (data) => currency(data) },
                  ]}
                  options={{
                    responsive: true,
                    autoWidth: false,
                    paging: false,
                    info: false,
                    searching: false,
                    order: [[2, 'desc']],
                  }}
                  className="w-full"
                />
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
                        <span className={`rounded-full px-2.5 py-1 text-xs ${
                          sale.transaction_type === 'service' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                          sale.transaction_type === 'product' ? 'bg-[#DCFCE7] text-[#15803D]' :
                          'bg-[#EDE9FE] text-[#6D4DE6]'
                        }`}>
                          {sale.transaction_type}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[#6B6B6B]">
                        <div>Qty: {sale.quantity}</div>
                        <div className="text-right">Unit: {currency(sale.unit_price_cents)}</div>
                        <div>Customer: {sale.customer_name || '-'}</div>
                        <div className="text-right">Stylist: {sale.stylist?.name || '-'}</div>
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

                <div className="hidden md:block overflow-x-auto datatable-container">
                  <DataTable
                    data={sales}
                    columns={[
                      { 
                        title: 'Date', 
                        data: 'created_at', 
                        render: (data) => formatDate(data) 
                      },
                      { 
                        title: 'Services', 
                        data: 'item_name' 
                      },
                      { 
                        title: 'Type', 
                        data: 'transaction_type',
                        render: (data) => {
                          const typeClass = data === 'service' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                                           data === 'product' ? 'bg-[#DCFCE7] text-[#15803D]' :
                                           'bg-[#EDE9FE] text-[#6D4DE6]'
                          return `<span class="rounded-full px-2.5 py-1 text-xs ${typeClass}">${data}</span>`
                        }
                      },
                      { 
                        title: 'Qty', 
                        data: 'quantity', 
                        className: 'text-right' 
                      },
                      { 
                        title: 'Unit Price', 
                        data: 'unit_price_cents', 
                        className: 'text-right', 
                        render: (data) => currency(data) 
                      },
                      { 
                        title: 'Total', 
                        data: 'total_amount_cents', 
                        className: 'text-right font-bold text-[#7B5CF5]', 
                        render: (data) => currency(data) 
                      },
                      { 
                        title: 'Payment', 
                        data: 'payment_method',
                        render: (data) => {
                          const methodClass = data === 'cash' ? 'bg-[#FEF3C7] text-[#B45309]' :
                                             data === 'gcash' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                                             'bg-[#DCFCE7] text-[#15803D]'
                          return `<span class="rounded-full px-2.5 py-1 text-xs ${methodClass}">${data}</span>`
                        }
                      },
                      { 
                        title: 'Customer', 
                        data: 'customer_name', 
                        render: (data) => data || '-' 
                      },
                      { 
                        title: 'Stylist', 
                        data: 'stylist.name', 
                        defaultContent: '-',
                        render: (data, type, row) => row.stylist?.name || '-'
                      },
                    ]}
                    options={{
                      responsive: true,
                      autoWidth: false,
                      paging: false,
                      info: false,
                      searching: false,
                      order: [[0, 'desc']],
                    }}
                    className="w-full"
                  />
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




