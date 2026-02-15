import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const toRgba = (hex, alpha) => {
  if (!hex) return `rgba(0,0,0,${alpha})`
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return hex
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const formatCurrency = (cents) => {
  const amount = Number.isFinite(cents) ? cents : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

const formatDateTime = (value) => {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Manila',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

const StatCard = ({ title, value, note, icon, accent, onClick }) => {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white/80 border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 text-left w-full transition ${
        onClick
          ? 'cursor-pointer hover:shadow-[0_12px_28px_rgba(92,64,51,0.14)] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7c3b6]'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-[#b08f7c]">{title}</div>
          <div className="mt-2 text-3xl font-semibold text-[#3b2f2a]">{value}</div>
          {note && <div className="mt-2 text-xs text-[#8f7a6f]">{note}</div>}
        </div>
        {icon && (
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: toRgba(accent, 0.16), color: accent }}
          >
            {icon}
          </div>
        )}
      </div>
      <div
        className="absolute -right-10 -bottom-10 h-24 w-24 rounded-full"
        style={{ backgroundColor: toRgba(accent, 0.12) }}
      />
    </Wrapper>
  )
}

const StatusCard = ({ title, value, total, accent, icon, onClick }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-white/80 border border-[#eadfd5] shadow-[0_6px_20px_rgba(92,64,51,0.08)] p-4 text-left w-full transition cursor-pointer hover:shadow-[0_12px_28px_rgba(92,64,51,0.14)] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7c3b6]"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: toRgba(accent, 0.16), color: accent }}
        >
          {icon}
        </div>
        <div className="text-sm font-medium text-[#4a3a2f]">{title}</div>
        <div className="ml-auto text-lg font-semibold text-[#3b2f2a]">{value}</div>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[#f0e6de] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: accent }} />
      </div>
      <div className="mt-2 text-xs text-[#9b857a]">{percent}% of total</div>
    </button>
  )
}

const ActionCard = ({ title, description, accent, actions = [] }) => (
  <div className="rounded-2xl bg-white/80 border border-[#eadfd5] shadow-[0_6px_20px_rgba(92,64,51,0.08)] p-4 space-y-3">
    <div className="text-sm font-semibold text-[#4a3a2f]">{title}</div>
    <div className="space-y-2">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className="w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{ backgroundColor: toRgba(accent, 0.14), color: '#4a3a2f' }}
        >
          {action.label}
        </button>
      ))}
    </div>
    {description && <div className="text-xs text-[#9b857a]">{description}</div>}
  </div>
)

const LineChart = ({ data, stroke = '#c98f6b', fill = '#f3e7df' }) => {
  const width = 320
  const height = 140
  const padding = 18
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth

  const points = data.map((d, i) => {
    const x = padding + i * step
    const y = padding + chartHeight - (d.value / maxValue) * chartHeight
    return { x, y }
  })

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${path} L ${padding + chartWidth} ${padding + chartHeight} L ${padding} ${padding + chartHeight} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id="lineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.9" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          x2={padding + chartWidth}
          y1={padding + chartHeight * ratio}
          y2={padding + chartHeight * ratio}
          stroke="#f0e6de"
          strokeDasharray="4 6"
        />
      ))}
      <path d={areaPath} fill="url(#lineFill)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, idx) => (
        <circle key={idx} cx={point.x} cy={point.y} r="4" fill="#fff" stroke={stroke} strokeWidth="2" />
      ))}
    </svg>
  )
}

const BarChart = ({ data, fill = '#c9b0a2' }) => {
  const width = 320
  const height = 140
  const padding = 18
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const step = chartWidth / data.length
  const barWidth = step * 0.6

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1={padding}
          x2={padding + chartWidth}
          y1={padding + chartHeight * ratio}
          y2={padding + chartHeight * ratio}
          stroke="#f0e6de"
          strokeDasharray="4 6"
        />
      ))}
      {data.map((bar, idx) => {
        const barHeight = (bar.value / maxValue) * chartHeight
        const x = padding + idx * step + (step - barWidth) / 2
        const y = padding + chartHeight - barHeight
        return (
          <rect
            key={bar.label}
            x={x}
            y={y}
            width={barWidth}
            height={Math.max(barHeight, 4)}
            rx="6"
            fill={fill}
            opacity={bar.value === 0 ? 0.3 : 0.9}
          />
        )
      })}
    </svg>
  )
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    appointments: { today: 0, week: 0, month: 0, total: 0 },
    revenue: { today: 0, week: 0, month: 0 },
    stylists: { active: 0, total: 0 },
    customers: 0,
    services: 0,
    status_summary: { booked: 0, completed: 0, cancelled: 0 },
  })
  const [recentAppointments, setRecentAppointments] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const storedUserType = localStorage.getItem('userType') || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const [statsRes, appointmentsRes] = await Promise.all([
        api.get('/dashboard/admin/stats'),
        api.get('/appointments'),
      ])
      setStats(statsRes.data)

      const allAppointments = appointmentsRes.data || []
      setAppointments(allAppointments)
      const sorted = [...allAppointments].sort((a, b) => {
        const aDate = new Date(a.start_datetime_pht || a.start_datetime)
        const bDate = new Date(b.start_datetime_pht || b.start_datetime)
        return bDate - aDate
      })
      setRecentAppointments(sorted.slice(0, 5))
    } catch (e) {
      console.error('Dashboard load error:', e)
      console.error('Response status:', e.response?.status)
      console.error('Response data:', e.response?.data)

      if (e.response?.status === 401) {
        localStorage.clear()
        navigate(loginPath)
        toast.error('Session expired. Please log in again.')
      } else if (e.response?.status === 403) {
        toast.error('You do not have permission to access this page')
      } else {
        toast.error(`Failed to load dashboard data: ${e.response?.data?.message || e.message || 'Unknown error'}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate(loginPath)
    })
  }

  const statusTotal = useMemo(() => {
    return stats.status_summary.booked + stats.status_summary.completed + stats.status_summary.cancelled
  }, [stats.status_summary])

  const monthlyAppointments = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }).map((_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('en-US', { month: 'short' }),
        value: 0,
      }
    })

    appointments.forEach((apt) => {
      const date = new Date(apt.start_datetime_pht || apt.start_datetime)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const month = months.find(m => m.key === key)
      if (month) {
        month.value += 1
      }
    })

    return months
  }, [appointments])

  const revenueByDay = useMemo(() => {
    const now = new Date()
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const values = Array(7).fill(0)

    appointments.forEach((apt) => {
      if (apt.status !== 'completed') return
      const date = new Date(apt.start_datetime_pht || apt.start_datetime)
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return

      const amount = apt.total_amount_cents ?? apt.service?.price_cents ?? apt.services?.[0]?.price_cents ?? 0
      const dayIndex = (date.getDay() + 6) % 7
      values[dayIndex] += amount
    })

    return labels.map((label, idx) => ({ label, value: values[idx] }))
  }, [appointments])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f1ec] flex items-center justify-center text-[#4a3a2f]">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f1ec] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar title="Dashboard" />
        <div className="p-5 md:p-8 space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-[#9b857a] mt-1">A quick view of today's performance and bookings.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <StatCard
              title="Today Appointments"
              value={stats.appointments.today}
              note="Today"
              accent="#c98f6b"
              onClick={() => navigate('/admin/appointments?range=today')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
                </svg>
              }
            />
            <StatCard
              title="Monthly Appointments"
              value={stats.appointments.month}
              note="This month"
              accent="#b78d7a"
              onClick={() => navigate('/admin/appointments?range=month')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M6 13h4M6 17h6" />
                </svg>
              }
            />
            <StatCard
              title="Active Stylists"
              value={stats.stylists.active}
              note={`Total stylists: ${stats.stylists.total}`}
              accent="#6f8b7b"
              onClick={() => navigate('/admin/manage/stylists')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="8" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                </svg>
              }
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats.revenue?.month)}
              note="This month"
              accent="#c07d68"
              onClick={() => navigate('/admin/sales')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
                </svg>
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Week Appointments"
              value={stats.appointments.week}
              note="This week"
              accent="#b18a78"
              onClick={() => navigate('/admin/appointments?range=week')}
            />
            <StatCard
              title="Total Appointments"
              value={stats.appointments.total}
              note="All time"
              accent="#a77d6a"
              onClick={() => navigate('/admin/appointments')}
            />
            <StatCard
              title="Total Customers"
              value={stats.customers}
              note="Returning & new"
              accent="#9d7f6d"
              onClick={() => navigate('/admin/customers')}
            />
            <StatCard
              title="Total Services"
              value={stats.services}
              note="Active menu"
              accent="#b69b8d"
              onClick={() => navigate('/admin/manage/services')}
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-3">Appointment Status Summary</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <StatusCard
                title="Booked"
                value={stats.status_summary.booked}
                total={statusTotal}
                accent="#b18a78"
                onClick={() => navigate('/admin/appointments?status=booked')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2 4-4" />
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                  </svg>
                }
              />
              <StatusCard
                title="Completed"
                value={stats.status_summary.completed}
                total={statusTotal}
                accent="#7da08c"
                onClick={() => navigate('/admin/appointments?status=completed')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4 10-10" />
                  </svg>
                }
              />
              <StatusCard
                title="Cancelled"
                value={stats.status_summary.cancelled}
                total={statusTotal}
                accent="#c07d68"
                onClick={() => navigate('/admin/appointments?status=cancelled')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
                  </svg>
                }
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ActionCard
              title="Appointment Management"
              accent="#c9a08b"
              actions={[
                { label: 'View All Appointments', onClick: () => navigate('/admin/appointments') },
                { label: 'Create New Appointment', onClick: () => navigate('/book') },
              ]}
              description="Quick access to bookings and scheduling."
            />
            <ActionCard
              title="Stylist Management"
              accent="#a3b5aa"
              actions={[{ label: 'Manage Stylists', onClick: () => navigate('/admin/manage/stylists') }]}
              description={`Active: ${stats.stylists.active} / Total: ${stats.stylists.total}`}
            />
            <ActionCard
              title="Service Management"
              accent="#b7a799"
              actions={[{ label: 'Manage Services', onClick: () => navigate('/admin/manage/services') }]}
              description={`Total Services: ${stats.services}`}
            />
            <ActionCard
              title="Customer Management"
              accent="#b9b1a9"
              actions={[{ label: 'View Customers', onClick: () => navigate('/admin/customers') }]}
              description={`Total Customers: ${stats.customers}`}
            />
            <ActionCard
              title="Customer Ratings"
              accent="#d3b98a"
              actions={[{ label: 'View Customer Ratings', onClick: () => navigate('/admin/ratings') }]}
              description="Review and manage feedback."
            />
            <ActionCard
              title="Holidays & Occasions"
              accent="#d0a98a"
              actions={[{ label: 'Manage Holidays', onClick: () => navigate('/admin/holidays') }]}
              description="Set salon closure dates."
            />
            <ActionCard
              title="Payment Accounts"
              accent="#b9c4c1"
              actions={[{ label: 'Manage Payment Accounts', onClick: () => navigate('/admin/payment-accounts') }]}
              description="Add/edit GCash, PayMaya, and banks."
            />
            <ActionCard
              title="Inventory & Sales"
              accent="#c9b0a2"
              actions={[
                { label: 'Manage Inventory', onClick: () => navigate('/admin/inventory') },
                { label: 'Sales Monitoring', onClick: () => navigate('/admin/sales') },
              ]}
              description="Track inventory levels and sales."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-white/80 border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#4a3a2f]">Monthly Appointments</h3>
                <span className="text-xs text-[#9b857a]">Last 6 months</span>
              </div>
              <div className="h-40 rounded-xl bg-gradient-to-br from-[#f9f2ec] to-[#f0e5dd] border border-[#efe2d8] p-2">
                <LineChart data={monthlyAppointments} stroke="#b78d7a" fill="#f1e3da" />
              </div>
              <div className="mt-3 grid grid-cols-6 text-[0.65rem] text-[#9b857a]">
                {monthlyAppointments.map((month) => (
                  <div key={month.key} className="text-center">{month.label}</div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white/80 border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#4a3a2f]">Revenue This Month</h3>
                <span className="text-xs text-[#9b857a]">Weekly view</span>
              </div>
              <div className="h-40 rounded-xl bg-gradient-to-br from-[#f9f2ec] to-[#f0e5dd] border border-[#efe2d8] p-2">
                <BarChart data={revenueByDay} fill="#c9b0a2" />
              </div>
              <div className="mt-3 grid grid-cols-7 text-[0.65rem] text-[#9b857a]">
                {revenueByDay.map((day) => (
                  <div key={day.label} className="text-center">{day.label}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#4a3a2f]">Recent Appointments</h3>
              <button
                className="text-xs font-medium text-[#9b857a] hover:text-[#6b574c]"
                onClick={() => navigate('/admin/appointments')}
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#9b857a]">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Service</th>
                    <th className="pb-2">Stylist</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-xs text-[#b09a8f]">
                        No recent appointments yet.
                      </td>
                    </tr>
                  )}
                  {recentAppointments.map((apt) => (
                    <tr key={apt.id} className="border-t border-[#f0e6de] text-[#4a3a2f]">
                      <td className="py-3 font-medium">{apt.customer_name}</td>
                      <td className="py-3">{apt.service?.name || apt.services?.[0]?.name || '—'}</td>
                      <td className="py-3">{apt.stylist?.name || '—'}</td>
                      <td className="py-3">{formatDateTime(apt.start_datetime_pht || apt.start_datetime)}</td>
                      <td className="py-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor:
                              apt.status === 'completed'
                                ? toRgba('#7da08c', 0.2)
                                : apt.status === 'cancelled'
                                  ? toRgba('#c07d68', 0.2)
                                  : toRgba('#b18a78', 0.2),
                            color:
                              apt.status === 'completed'
                                ? '#5b7f6b'
                                : apt.status === 'cancelled'
                                  ? '#a55b4d'
                                  : '#8c6957',
                          }}
                        >
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
