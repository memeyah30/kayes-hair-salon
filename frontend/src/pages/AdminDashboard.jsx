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

const formatCompactNumber = (value) => new Intl.NumberFormat('en-PH', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(Math.max(0, Number(value) || 0))

const formatCurrencyCompact = (cents) => {
  const pesos = (Number(cents) || 0) / 100
  return `PHP ${formatCompactNumber(pesos)}`
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

const getAppointmentServices = (appointment) => (
  appointment.services && appointment.services.length > 0
    ? appointment.services
    : (appointment.service ? [appointment.service] : [])
)

const getAppointmentTotalCents = (appointment) => {
  if (Number.isFinite(appointment.total_amount_cents)) {
    return appointment.total_amount_cents
  }
  return getAppointmentServices(appointment).reduce((sum, service) => sum + (service?.price_cents || 0), 0)
}

const GradientMetricCard = ({ title, value, note, icon, start, end, onClick }) => {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-white/60 p-4 text-left text-white shadow-[0_14px_28px_rgba(92,64,51,0.18)] transition ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(92,64,51,0.2)]' : ''
      }`}
      style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-white/85">{title}</div>
          <div className="mt-2 text-3xl font-semibold leading-none">{value}</div>
          {note && <div className="mt-2 text-xs text-white/80">{note}</div>}
        </div>
        <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center text-white">{icon}</div>
      </div>
      <div className="pointer-events-none absolute -right-8 -bottom-10 h-24 w-24 rounded-full bg-white/20" />
      <div className="pointer-events-none absolute right-8 -bottom-16 h-28 w-28 rounded-full bg-white/10" />
    </Wrapper>
  )
}

const StatusSummaryCard = ({ title, value, accent, icon, total, onClick }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[#eadfd5] bg-white/85 p-4 text-left shadow-[0_8px_24px_rgba(92,64,51,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(92,64,51,0.12)]"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: toRgba(accent, 0.16), color: accent }}
        >
          {icon}
        </div>
        <div className="text-base font-semibold text-[#4a3a2f]">{title}</div>
        <div className="ml-auto text-3xl font-semibold text-[#3b2f2a] leading-none">{value}</div>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-[#eee2d7]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: accent }} />
      </div>
      <div className="mt-2 text-xs text-[#9b857a]">{percent}% of total</div>
    </button>
  )
}

const LineChart = ({ data, stroke = '#b88a65', fill = '#f3e6db', yTickFormatter = (value) => value }) => {
  const width = 380
  const height = 170
  const left = 48
  const right = 14
  const top = 12
  const bottom = 28
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(...data.map((point) => point.value), 1)
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(maxValue * ratio))

  const points = data.map((point, idx) => {
    const x = left + idx * step
    const y = top + chartHeight - (point.value / maxValue) * chartHeight
    return { x, y }
  })

  const path = points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = `${path} L ${left + chartWidth} ${top + chartHeight} L ${left} ${top + chartHeight} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <defs>
        <linearGradient id="adminLineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.95" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, idx) => {
        const y = top + (chartHeight * idx) / (yTicks.length - 1)
        return (
          <g key={`${tick}-${idx}`}>
            <line
              x1={left}
              x2={left + chartWidth}
              y1={y}
              y2={y}
              stroke="#ecdfd3"
              strokeDasharray="4 6"
            />
            <text
              x={left - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-[#9b857a]"
              style={{ fontSize: '10px' }}
            >
              {yTickFormatter(tick)}
            </text>
          </g>
        )
      })}
      <path d={areaPath} fill="url(#adminLineFill)" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, idx) => (
        <g key={idx}>
          <circle cx={point.x} cy={point.y} r="4" fill="#fff" stroke={stroke} strokeWidth="2" />
          <text
            x={point.x}
            y={point.y - 8}
            textAnchor="middle"
            className="fill-[#7a6458]"
            style={{ fontSize: '10px' }}
          >
            {points.length <= 7 ? data[idx].value : ''}
          </text>
          <text
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            className="fill-[#9b857a]"
            style={{ fontSize: '10px' }}
          >
            {data[idx].label}
          </text>
        </g>
      ))}
    </svg>
  )
}

const BarChart = ({ data, fill = '#b7a08f', yTickFormatter = (value) => value }) => {
  const width = 380
  const height = 170
  const left = 48
  const right = 14
  const top = 12
  const bottom = 28
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const maxValue = Math.max(...data.map((bar) => bar.value), 1)
  const step = chartWidth / data.length
  const barWidth = step * 0.58
  const yTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(maxValue * ratio))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {yTicks.map((tick, idx) => {
        const y = top + (chartHeight * idx) / (yTicks.length - 1)
        return (
          <g key={`${tick}-${idx}`}>
            <line
              x1={left}
              x2={left + chartWidth}
              y1={y}
              y2={y}
              stroke="#ecdfd3"
              strokeDasharray="4 6"
            />
            <text
              x={left - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-[#9b857a]"
              style={{ fontSize: '10px' }}
            >
              {yTickFormatter(tick)}
            </text>
          </g>
        )
      })}
      {data.map((bar, idx) => {
        const barHeight = (bar.value / maxValue) * chartHeight
        const x = left + idx * step + (step - barWidth) / 2
        const y = top + chartHeight - barHeight
        return (
          <g key={bar.label}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 4)}
              rx="7"
              fill={fill}
              opacity={bar.value === 0 ? 0.28 : 0.9}
            />
            <text
              x={x + barWidth / 2}
              y={y - 6}
              textAnchor="middle"
              className="fill-[#7a6458]"
              style={{ fontSize: '10px' }}
            >
              {bar.value > 0 ? formatCompactNumber(bar.value / 100) : ''}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-[#9b857a]"
              style={{ fontSize: '10px' }}
            >
              {bar.label}
            </text>
          </g>
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
  const [appointments, setAppointments] = useState([])
  const [recentAppointments, setRecentAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const storedUserType = localStorage.getItem('userType') || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'
  const canAccessSales = storedUserType === 'admin'
  const canAccessServiceManagement = storedUserType === 'admin'

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
      setRecentAppointments(sorted.slice(0, 6))
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.clear()
        navigate(loginPath)
        toast.error('Session expired. Please log in again.')
      } else {
        toast.error(error.response?.data?.message || 'Failed to load dashboard data')
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

  const statusTotal = useMemo(() => (
    stats.status_summary.booked + stats.status_summary.completed + stats.status_summary.cancelled
  ), [stats.status_summary])

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

    appointments.forEach((appointment) => {
      const date = new Date(appointment.start_datetime_pht || appointment.start_datetime)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const found = months.find((month) => month.key === key)
      if (found) {
        found.value += 1
      }
    })

    return months
  }, [appointments])

  const revenueThisWeek = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const values = Array(7).fill(0)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))

    appointments.forEach((appointment) => {
      if (appointment.status !== 'completed') return
      const appointmentDate = new Date(appointment.start_datetime_pht || appointment.start_datetime)
      if (appointmentDate < weekStart || appointmentDate > now) return
      const dayIndex = (appointmentDate.getDay() + 6) % 7
      values[dayIndex] += getAppointmentTotalCents(appointment)
    })

    return labels.map((label, idx) => ({ label, value: values[idx] }))
  }, [appointments])

  const stylistPerformance = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()
    const byStylist = {}

    appointments.forEach((appointment) => {
      const date = new Date(appointment.start_datetime_pht || appointment.start_datetime)
      if (date.getMonth() !== month || date.getFullYear() !== year) return
      const stylistName = appointment.stylist?.name || 'Unassigned'
      if (!byStylist[stylistName]) {
        byStylist[stylistName] = { name: stylistName, completed: 0, revenue: 0 }
      }
      if (appointment.status === 'completed') {
        byStylist[stylistName].completed += 1
        byStylist[stylistName].revenue += getAppointmentTotalCents(appointment)
      }
    })

    return Object.values(byStylist)
      .sort((a, b) => b.completed - a.completed || b.revenue - a.revenue)
      .slice(0, 4)
  }, [appointments])

  const topStylist = stylistPerformance[0] || null
  const peakMonth = useMemo(() => (
    monthlyAppointments.reduce((best, month) => (month.value > best.value ? month : best), { label: '-', value: 0 })
  ), [monthlyAppointments])
  const peakRevenueDay = useMemo(() => (
    revenueThisWeek.reduce((best, day) => (day.value > best.value ? day : best), { label: '-', value: 0 })
  ), [revenueThisWeek])

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
        <div className="p-5 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-[#9b857a]">
              Monitor performance here. Use the side panel for all management pages.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <GradientMetricCard
              title="Total Revenue"
              value={formatCurrency(stats.revenue.month)}
              note="This month"
              start="#b38a6d"
              end="#cca88e"
              onClick={canAccessSales ? () => navigate('/admin/sales') : undefined}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
                </svg>
              }
            />
            <GradientMetricCard
              title="Pending Appointments"
              value={stats.status_summary.booked}
              note="Awaiting service"
              start="#d49787"
              end="#e5b2a2"
              onClick={() => navigate('/admin/appointments?status=booked')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
                </svg>
              }
            />
            <GradientMetricCard
              title="Completed Appointments"
              value={stats.status_summary.completed}
              note="Completed"
              start="#7ea69d"
              end="#9ec2b8"
              onClick={() => navigate('/admin/appointments?status=completed')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4 10-10" />
                </svg>
              }
            />
            <GradientMetricCard
              title="Total Services"
              value={stats.services}
              note="Active service menu"
              start="#ca9a54"
              end="#e2bd81"
              onClick={canAccessServiceManagement ? () => navigate('/admin/manage/services') : undefined}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h8M8 16h5" />
                  <rect x="4" y="5" width="16" height="14" rx="2" />
                </svg>
              }
            />
            <GradientMetricCard
              title="Total Customers"
              value={stats.customers}
              note="Returning and new"
              start="#7086aa"
              end="#92a4c3"
              onClick={() => navigate('/admin/customers')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="8" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                </svg>
              }
            />
          </div>

          <section className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_10px_24px_rgba(92,64,51,0.08)]">
            <h2 className="text-xl font-semibold text-[#4a3a2f]">Appointment Status Summary</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <StatusSummaryCard
                title="Booked"
                value={stats.status_summary.booked}
                total={statusTotal}
                accent="#b4846d"
                onClick={() => navigate('/admin/appointments?status=booked')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2 4-4" />
                    <rect x="4" y="5" width="16" height="15" rx="2" />
                  </svg>
                }
              />
              <StatusSummaryCard
                title="Completed"
                value={stats.status_summary.completed}
                total={statusTotal}
                accent="#6c9c86"
                onClick={() => navigate('/admin/appointments?status=completed')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4 10-10" />
                  </svg>
                }
              />
              <StatusSummaryCard
                title="Cancelled"
                value={stats.status_summary.cancelled}
                total={statusTotal}
                accent="#c06f5d"
                onClick={() => navigate('/admin/appointments?status=cancelled')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6l-12 12" />
                  </svg>
                }
              />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_8px_20px_rgba(92,64,51,0.08)]">
                  <div className="text-sm text-[#8f7a6f]">Daily Revenue</div>
                  <div className="mt-1 text-3xl font-semibold">{formatCurrency(stats.revenue.today)}</div>
                  <div className="mt-3 text-sm text-[#8f7a6f]">Today&apos;s bookings: {stats.appointments.today}</div>
                </div>
                <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_8px_20px_rgba(92,64,51,0.08)]">
                  <div className="text-sm text-[#8f7a6f]">Week Appointments</div>
                  <div className="mt-1 text-3xl font-semibold">{stats.appointments.week}</div>
                  <div className="mt-3 text-sm text-[#8f7a6f]">Total services: {stats.services}</div>
                </div>
                <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_8px_20px_rgba(92,64,51,0.08)]">
                  <div className="text-sm text-[#8f7a6f]">Top Stylist</div>
                  <div className="mt-1 text-2xl font-semibold">{topStylist?.name || 'No data yet'}</div>
                  <div className="mt-3 text-sm text-[#8f7a6f]">
                    {topStylist ? `${topStylist.completed} completed` : 'Track completed services this month'}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_10px_24px_rgba(92,64,51,0.08)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#4a3a2f]">Monthly Appointments</h3>
                  <span className="text-xs text-[#9b857a]">Last 6 months</span>
                </div>
                <div className="mt-4 h-44 rounded-xl border border-[#efe2d8] bg-gradient-to-br from-[#fbf5ef] to-[#f2e8df] p-2">
                  <LineChart
                    data={monthlyAppointments}
                    yTickFormatter={(value) => formatCompactNumber(value)}
                  />
                </div>
                <div className="mt-3 rounded-lg bg-[#f8f1ea] px-3 py-2 text-sm text-[#6f5b50]">
                  Highest month: <span className="font-semibold">{peakMonth.label}</span> ({peakMonth.value} appointments)
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_10px_24px_rgba(92,64,51,0.08)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#4a3a2f]">Stylist Performance</h3>
                  <span className="text-xs text-[#9b857a]">This month</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {stylistPerformance.length === 0 && (
                    <div className="col-span-full rounded-xl border border-dashed border-[#e4d5c9] bg-[#faf5f0] p-6 text-center text-sm text-[#9b857a]">
                      No completed appointments yet.
                    </div>
                  )}
                  {stylistPerformance.map((stylist) => (
                    <div
                      key={stylist.name}
                      className="rounded-xl border border-[#efe2d8] bg-[#fbf7f2] px-4 py-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-[#4a3a2f]">{stylist.name}</div>
                        <div className="text-xs text-[#9b857a]">{stylist.completed} completed appointments</div>
                      </div>
                      <div className="text-sm font-semibold text-[#6f5b50]">{formatCurrency(stylist.revenue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_10px_24px_rgba(92,64,51,0.08)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#4a3a2f]">Revenue This Week</h3>
                  <span className="text-xs text-[#9b857a]">Mon-Sun</span>
                </div>
                <div className="mt-4 h-44 rounded-xl border border-[#efe2d8] bg-gradient-to-br from-[#fbf5ef] to-[#f2e8df] p-2">
                  <BarChart
                    data={revenueThisWeek}
                    yTickFormatter={(value) => formatCurrencyCompact(value)}
                  />
                </div>
                <div className="mt-3 rounded-lg bg-[#f8f1ea] px-3 py-2 text-sm text-[#6f5b50]">
                  Highest day: <span className="font-semibold">{peakRevenueDay.label}</span> ({formatCurrency(peakRevenueDay.value)})
                </div>
              </div>

              <div className="rounded-2xl border border-[#eadfd5] bg-white/82 p-4 shadow-[0_10px_24px_rgba(92,64,51,0.08)]">
                <h3 className="text-xl font-semibold text-[#4a3a2f]">Recent Appointments</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-[#9b857a]">
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
                      {recentAppointments.map((appointment) => (
                        <tr key={appointment.id} className="border-t border-[#efe2d8]">
                          <td className="py-3 font-medium">{appointment.customer_name}</td>
                          <td className="py-3">{getAppointmentServices(appointment)[0]?.name || '-'}</td>
                          <td className="py-3">{appointment.stylist?.name || '-'}</td>
                          <td className="py-3">{formatDateTime(appointment.start_datetime_pht || appointment.start_datetime)}</td>
                          <td className="py-3">
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-medium"
                              style={{
                                backgroundColor:
                                  appointment.status === 'completed'
                                    ? toRgba('#6c9c86', 0.2)
                                    : appointment.status === 'cancelled'
                                      ? toRgba('#c06f5d', 0.2)
                                      : toRgba('#b4846d', 0.2),
                                color:
                                  appointment.status === 'completed'
                                    ? '#4f7b67'
                                    : appointment.status === 'cancelled'
                                      ? '#9a5549'
                                      : '#8e6552',
                              }}
                            >
                              {appointment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
