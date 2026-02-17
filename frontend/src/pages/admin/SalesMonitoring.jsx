import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const SalesMonitoring = () => {
  const [sales, setSales] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  })
  const [filters, setFilters] = useState({
    transaction_type: '',
    stylist_id: '',
  })

  useEffect(() => {
    loadSales()
    loadStats()
  }, [dateRange, filters])

  const loadSales = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateRange.start_date) params.append('start_date', dateRange.start_date)
      if (dateRange.end_date) params.append('end_date', dateRange.end_date)
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type)
      if (filters.stylist_id) params.append('stylist_id', filters.stylist_id)

      const res = await api.get(`/sales?${params.toString()}`)
      setSales(res.data)
    } catch (e) {
      toast.error('Failed to load sales')
      console.error(e)
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

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f7f1ec] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="admin" />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-bold"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <h1 className="text-2xl font-bold">Sales Monitoring</h1>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full border rounded px-3 py-2"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <select
                  className="w-full border rounded px-3 py-2"
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
                <label className="block text-sm font-medium mb-1">Stylist</label>
                <select
                  className="w-full border rounded px-3 py-2"
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
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Total Sales</div>
                <div className="text-2xl font-bold text-green-600">{currency(stats.total_sales_cents)}</div>
                <div className="text-xs text-[#9b857a] mt-1">
                  {stats.period.start_date} to {stats.period.end_date}
                </div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Service Sales</div>
                <div className="text-2xl font-bold">
                  {currency(stats.sales_by_type?.service || 0)}
                </div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Product Sales</div>
                <div className="text-2xl font-bold">
                  {currency(stats.sales_by_type?.product || 0)}
                </div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Cash Payments</div>
                <div className="text-2xl font-bold">
                  {currency(stats.sales_by_payment_method?.cash || 0)}
                </div>
              </div>
            </div>
          )}

          {/* Top Selling Items */}
          {stats?.top_selling_items && stats.top_selling_items.length > 0 && (
            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <h2 className="text-xl font-semibold mb-4">Top Selling Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Item Name</th>
                      <th className="text-right p-2">Quantity Sold</th>
                      <th className="text-right p-2">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_selling_items.map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="p-2">{item.item_name}</td>
                        <td className="p-2 text-right">{item.total_quantity}</td>
                        <td className="p-2 text-right font-bold">{currency(item.total_revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales List */}
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <h2 className="text-xl font-semibold mb-4">Sales Transactions</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Item</th>
                      <th className="text-left p-2">Type</th>
                      <th className="text-right p-2">Quantity</th>
                      <th className="text-right p-2">Unit Price</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-left p-2">Payment</th>
                      <th className="text-left p-2">Customer</th>
                      <th className="text-left p-2">Stylist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-sm">{formatDate(sale.created_at)}</td>
                        <td className="p-2">{sale.item_name}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.transaction_type === 'service' ? 'bg-blue-100 text-blue-700' :
                            sale.transaction_type === 'product' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {sale.transaction_type}
                          </span>
                        </td>
                        <td className="p-2 text-right">{sale.quantity}</td>
                        <td className="p-2 text-right">{currency(sale.unit_price_cents)}</td>
                        <td className="p-2 text-right font-bold">{currency(sale.total_amount_cents)}</td>
                        <td className="p-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            sale.payment_method === 'cash' ? 'bg-[#f7f1ec] text-gray-700' :
                            sale.payment_method === 'gcash' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="p-2 text-sm">{sale.customer_name || '-'}</td>
                        <td className="p-2 text-sm">{sale.stylist?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length === 0 && (
                  <div className="text-center py-8 text-[#9b857a]">No sales found for the selected period</div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default SalesMonitoring




