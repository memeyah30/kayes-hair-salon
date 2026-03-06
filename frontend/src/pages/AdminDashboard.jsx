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

const getStatusBadgeStyle = (status) => {
  if (status === 'completed') {
    return {
      backgroundColor: toRgba('#6ea499', 0.18),
      color: '#4f8177',
    }
  }

  if (status === 'cancelled') {
    return {
      backgroundColor: toRgba('#cc6b84', 0.18),
      color: '#9a4963',
    }
  }

  return {
    backgroundColor: toRgba('#df9a57', 0.18),
    color: '#9d6a2d',
  }
}

const GradientMetricCard = ({ title, value, note, icon, start, end, onClick }) => {
  const Wrapper = onClick ? 'button' : 'div'
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[28px] border border-white/18 p-4 text-left text-white shadow-[0_18px_34px_rgba(39,19,88,0.24)] transition duration-200 ${
        onClick ? 'hover:-translate-y-0.5 hover:shadow-[0_24px_40px_rgba(39,19,88,0.28)]' : ''
      }`}
      style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.16em] text-white/76">{title}</div>
          <div className="mt-2 text-3xl font-semibold leading-none">{value}</div>
          {note && <div className="mt-2 text-xs text-white/74">{note}</div>}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/16 text-white">
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-8 -bottom-10 h-24 w-24 rounded-full bg-white/18" />
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
      className="w-full rounded-[26px] border border-white/40 bg-white/78 p-4 text-left shadow-[0_14px_32px_rgba(59,31,114,0.12)] backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(59,31,114,0.16)]"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: toRgba(accent, 0.16), color: accent }}
        >
          {icon}
        </div>
        <div className="text-base font-semibold text-[#322253]">{title}</div>
        <div className="ml-auto text-3xl font-semibold text-[#24173f] leading-none">{value}</div>
      </div>
      <div className="mt-4 h-2 w-full rounded-full bg-[#eadfff]">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: accent }} />
      </div>
      <div className="mt-2 text-xs text-[#856fb4]">{percent}% of total</div>
    </button>
  )
}

const LineChart = ({
  data,
  stroke = '#6143c5',
  fill = '#cec2ff',
  gridColor = '#e6dbff',
  tickColor = '#8a75b7',
  pointLabelColor = '#5b4490',
  axisLabelColor = '#876fb3',
  yTickFormatter = (value) => value,
}) => {
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
              stroke={gridColor}
              strokeDasharray="4 6"
            />
            <text
              x={left - 8}
              y={y + 3}
              textAnchor="end"
              fill={tickColor}
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
            fill={pointLabelColor}
            style={{ fontSize: '10px' }}
          >
            {points.length <= 7 ? data[idx].value : ''}
          </text>
          <text
            x={point.x}
            y={height - 8}
            textAnchor="middle"
            fill={axisLabelColor}
            style={{ fontSize: '10px' }}
          >
            {data[idx].label}
          </text>
        </g>
      ))}
    </svg>
  )
}

const BarChart = ({
  data,
  fill = '#d8ccff',
  gridColor = 'rgba(255, 255, 255, 0.24)',
  tickColor = '#efe8ff',
  valueColor = '#f6f0ff',
  axisLabelColor = '#efe8ff',
  yTickFormatter = (value) => value,
  barValueFormatter = (value) => (value > 0 ? formatCompactNumber(value / 100) : ''),
}) => {
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
              stroke={gridColor}
              strokeDasharray="4 6"
            />
            <text
              x={left - 8}
              y={y + 3}
              textAnchor="end"
              fill={tickColor}
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
              fill={valueColor}
              style={{ fontSize: '10px' }}
            >
              {barValueFormatter(bar.value)}
            </text>
            <text
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fill={axisLabelColor}
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
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'
  const canAccessSales = storedUserType === 'admin'
  const canAccessServiceManagement = storedUserType === 'admin'
  const glassPanelClass = 'rounded-[30px] border border-white/32 bg-white/76 p-4 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md'
  const statCardClass = 'rounded-[24px] border border-white/32 bg-white/76 p-4 shadow-[0_16px_34px_rgba(59,31,114,0.12)] backdrop-blur-md'
  const lightChartShellClass = 'mt-4 h-44 rounded-[24px] border border-white/36 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,236,255,0.82))] p-2'
  const darkChartShellClass = 'mt-4 h-44 rounded-[24px] border border-white/12 bg-gradient-to-br from-[#7050d3] via-[#5d3fbd] to-[#43257f] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
  const accentNoteClass = 'mt-3 rounded-full bg-[#f2e9ff]/90 px-4 py-2 text-sm text-[#644fa0]'
  const emptyStateClass = 'rounded-xl border border-dashed border-[#dccdff] bg-[#f7f1ff] p-6 text-center text-sm text-[#8b77bc]'
  const listCardClass = 'rounded-xl border border-white/38 bg-[#faf6ff]/82 px-4 py-3 flex items-center justify-between'

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const requestUserType = sessionStorage.getItem('userType') || storedUserType || 'admin'
      const roleRequestConfig = {
        params: { type: requestUserType },
        headers: { 'X-User-Type': requestUserType },
      }
      const requests = [
        api.get('/dashboard/admin/stats', roleRequestConfig),
        api.get('/appointments', roleRequestConfig),
      ]

      const [statsRes, appointmentsRes] = await Promise.all(requests)
      setStats({ ...statsRes.data })
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
        localStorage.clear(); sessionStorage.clear()
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
      localStorage.clear(); sessionStorage.clear()
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

  const appointmentsThisWeek = useMemo(() => {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const values = Array(7).fill(0)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))

    appointments.forEach((appointment) => {
      const appointmentDate = new Date(appointment.start_datetime_pht || appointment.start_datetime)
      if (appointmentDate < weekStart || appointmentDate > now) return
      const dayIndex = (appointmentDate.getDay() + 6) % 7
      values[dayIndex] += 1
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
  const peakAppointmentsDay = useMemo(() => (
    appointmentsThisWeek.reduce((best, day) => (day.value > best.value ? day : best), { label: '-', value: 0 })
  ), [appointmentsThisWeek])

  const goToTodaySales = () => {
    const today = getManilaDateInput()
    const params = new URLSearchParams({
      range: 'today',
      start_date: today,
      end_date: today,
    })
    navigate(`/admin/sales?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen app-admin-bg flex items-center justify-center text-[#2d1f4f]">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen app-admin-bg flex flex-col md:flex-row text-[#2d1f4f]">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar title="Dashboard" />
        <div className="app-mobile-shell space-y-6">
          <div>
            <h1 className="fluid-title-lg font-semibold text-[#24173f]">
              {canAccessSales ? 'Admin Dashboard' : 'Manager Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-[#7d69ab]">
              Monitor performance here. Use the side panel for all management pages.
            </p>
          </div>

          <div className={`grid gap-4 md:grid-cols-2 ${canAccessSales ? 'xl:grid-cols-7' : 'xl:grid-cols-5'}`}>
            {canAccessSales ? (
              <>
                <GradientMetricCard
                  title="Total Revenue"
                  value={formatCurrency(stats.revenue.month)}
                  note="This month"
                  start="#7f63e8"
                  end="#5a3dbd"
                  onClick={() => navigate('/admin/sales')}
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <rect x="3" y="6" width="18" height="12" rx="2" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12h10" />
                    </svg>
                  }
                />
                <GradientMetricCard
                  title="Daily Revenue"
                  value={formatCurrency(stats.revenue.today)}
                  note="Today"
                  start="#6f62e0"
                  end="#5349c8"
                  onClick={goToTodaySales}
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <circle cx="12" cy="12" r="8" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2M12 7v10" />
                    </svg>
                  }
                />
                <GradientMetricCard
                  title="Today's Bookings"
                  value={stats.appointments.today}
                  note="Today"
                  start="#e88fa7"
                  end="#cf6d91"
                  onClick={() => navigate('/admin/appointments?range=today')}
                  icon={
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M6 7h12a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8a1 1 0 0 1 1-1Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6M9 17h4" />
                    </svg>
                  }
                />
              </>
            ) : (
              <GradientMetricCard
                title="Total Appointments"
                value={stats.appointments.month}
                note="This month"
                start="#7f63e8"
                end="#5a3dbd"
                onClick={() => navigate('/admin/appointments?range=month')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v4M17 3v4M4 9h16M5 7h14v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
                  </svg>
                }
              />
            )}
            <GradientMetricCard
              title="Pending Appointments"
              value={stats.status_summary.booked}
              note="Awaiting service"
              start="#f0a160"
              end="#d9874d"
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
              start="#74a0ae"
              end="#547f91"
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
              start="#8c79e8"
              end="#6a57cf"
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
              start="#958bf4"
              end="#6f67d7"
              onClick={() => navigate('/admin/customers')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="8" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                </svg>
              }
            />
          </div>

          <section className={glassPanelClass}>
            <h2 className="text-xl font-semibold text-[#2f2252]">Appointment Status Summary</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <StatusSummaryCard
                title="Booked"
                value={stats.status_summary.booked}
                total={statusTotal}
                accent="#df9a57"
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
                accent="#6ea499"
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
                accent="#cc6b84"
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
                {canAccessSales ? (
                  <button
                    type="button"
                    onClick={goToTodaySales}
                    className={`${statCardClass} text-left transition hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(59,31,114,0.16)]`}
                  >
                    <div className="text-sm text-[#7b67a9]">Daily Revenue</div>
                    <div className="mt-1 text-3xl font-semibold">{formatCurrency(stats.revenue.today)}</div>
                    <div className="mt-3 text-sm text-[#7b67a9]">Today&apos;s bookings: {stats.appointments.today}</div>
                  </button>
                ) : (
                  <div className={statCardClass}>
                    <div className="text-sm text-[#7b67a9]">Today Appointments</div>
                    <div className="mt-1 text-3xl font-semibold">{stats.appointments.today}</div>
                    <div className="mt-3 text-sm text-[#7b67a9]">Week total: {stats.appointments.week}</div>
                  </div>
                )}
                <div className={statCardClass}>
                  <div className="text-sm text-[#7b67a9]">Week Appointments</div>
                  <div className="mt-1 text-3xl font-semibold">{stats.appointments.week}</div>
                  <div className="mt-3 text-sm text-[#7b67a9]">Total services: {stats.services}</div>
                </div>
                <div className={statCardClass}>
                  <div className="text-sm text-[#7b67a9]">Top Stylist</div>
                  <div className="mt-1 text-2xl font-semibold">{topStylist?.name || 'No data yet'}</div>
                  <div className="mt-3 text-sm text-[#7b67a9]">
                    {topStylist ? `${topStylist.completed} completed` : 'Track completed services this month'}
                  </div>
                </div>
              </div>

              <div className={glassPanelClass}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#2f2252]">Monthly Appointments</h3>
                  <span className="text-xs text-[#806caf]">Last 6 months</span>
                </div>
                <div className={lightChartShellClass}>
                  <LineChart
                    data={monthlyAppointments}
                    yTickFormatter={(value) => formatCompactNumber(value)}
                  />
                </div>
                <div className={accentNoteClass}>
                  Highest month: <span className="font-semibold">{peakMonth.label}</span> ({peakMonth.value} appointments)
                </div>
              </div>

              <div className={glassPanelClass}>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-[#2f2252]">Stylist Performance</h3>
                  <span className="text-xs text-[#806caf]">This month</span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {stylistPerformance.length === 0 && (
                    <div className={`col-span-full ${emptyStateClass}`}>
                      No completed appointments yet.
                    </div>
                  )}
                  {stylistPerformance.map((stylist) => (
                    <div
                      key={stylist.name}
                      className={listCardClass}
                    >
                      <div>
                        <div className="font-semibold text-[#2f2252]">{stylist.name}</div>
                        <div className="text-xs text-[#806caf]">{stylist.completed} completed appointments</div>
                      </div>
                      <div className="text-sm font-semibold text-[#5d488f]">
                        {canAccessSales ? formatCurrency(stylist.revenue) : `${stylist.completed} completed`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {canAccessSales ? (
                <div className={glassPanelClass}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-[#2f2252]">Revenue This Week</h3>
                    <span className="text-xs text-[#806caf]">Mon-Sun</span>
                  </div>
                  <div className={darkChartShellClass}>
                    <BarChart
                      data={revenueThisWeek}
                      fill="#ece3ff"
                      yTickFormatter={(value) => formatCurrencyCompact(value)}
                      barValueFormatter={(value) => (value > 0 ? formatCompactNumber(value / 100) : '')}
                    />
                  </div>
                  <div className={accentNoteClass}>
                    Highest day: <span className="font-semibold">{peakRevenueDay.label}</span> ({formatCurrency(peakRevenueDay.value)})
                  </div>
                </div>
              ) : (
                <div className={glassPanelClass}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-[#2f2252]">Appointments This Week</h3>
                    <span className="text-xs text-[#806caf]">Mon-Sun</span>
                  </div>
                  <div className={darkChartShellClass}>
                    <BarChart
                      data={appointmentsThisWeek}
                      fill="#ece3ff"
                      yTickFormatter={(value) => formatCompactNumber(value)}
                      barValueFormatter={(value) => (value > 0 ? formatCompactNumber(value) : '')}
                    />
                  </div>
                  <div className={accentNoteClass}>
                    Busiest day: <span className="font-semibold">{peakAppointmentsDay.label}</span> ({peakAppointmentsDay.value} appointments)
                  </div>
                </div>
              )}

              <div className={glassPanelClass}>
                <h3 className="text-xl font-semibold text-[#2f2252]">Recent Appointments</h3>
                <div className="mt-4 md:hidden space-y-3">
                  {recentAppointments.length === 0 && (
                    <div className={emptyStateClass}>
                      No recent appointments yet.
                    </div>
                  )}
                  {recentAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-white/38 bg-[#faf6ff]/82 p-3 shadow-[0_10px_22px_rgba(59,31,114,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[#2f2252]">{appointment.customer_name}</div>
                          <div className="mt-1 text-sm text-[#806caf]">{getAppointmentServices(appointment)[0]?.name || '-'}</div>
                          <div className="mt-1 text-xs text-[#806caf]">{appointment.stylist?.name || '-'}</div>
                          <div className="mt-1 text-xs text-[#806caf]">{formatDateTime(appointment.start_datetime_pht || appointment.start_datetime)}</div>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium"
                          style={getStatusBadgeStyle(appointment.status)}
                        >
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden md:block mt-4 overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-[#8a75b9]">
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
                          <td colSpan="5" className="py-6 text-center text-xs text-[#9a86c7]">
                            No recent appointments yet.
                          </td>
                        </tr>
                      )}
                      {recentAppointments.map((appointment) => (
                        <tr key={appointment.id} className="border-t border-[#ece2ff]">
                          <td className="py-3 font-medium">{appointment.customer_name}</td>
                          <td className="py-3">{getAppointmentServices(appointment)[0]?.name || '-'}</td>
                          <td className="py-3">{appointment.stylist?.name || '-'}</td>
                          <td className="py-3">{formatDateTime(appointment.start_datetime_pht || appointment.start_datetime)}</td>
                          <td className="py-3">
                            <span
                              className="rounded-full px-2.5 py-1 text-xs font-medium"
                              style={getStatusBadgeStyle(appointment.status)}
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




