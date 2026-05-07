import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import AdminLayout from '../components/AdminLayout'

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

const pause = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms)
})

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

const normalizeAppointmentsPayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  return []
}

const getAppointmentServiceVariant = (service) => {
  const variantId = service?.pivot?.service_variant_id
  if (!variantId || !Array.isArray(service?.variants)) return null
  return service.variants.find((variant) => String(variant.id) === String(variantId)) || null
}

const getAppointmentServicePriceCents = (service) => {
  const variant = getAppointmentServiceVariant(service)
  const price = variant?.price_cents ?? service?.price_cents ?? 0
  const parsed = Number(price)
  return Number.isFinite(parsed) ? parsed : 0
}

const getAppointmentTotalCents = (appointment) => {
  const storedTotal = Number(appointment?.total_amount_cents)
  if (Number.isFinite(storedTotal)) {
    return storedTotal
  }
  return getAppointmentServices(appointment).reduce((sum, service) => sum + getAppointmentServicePriceCents(service), 0)
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

const GradientMetricCard = ({ title, value, note, trend, icon, start, end, onClick, delay = 0, isHero = false }) => {
  const Wrapper = onClick ? 'button' : 'div'
  const delayClass = {
    0: '',
    100: 'animation-delay-100',
    200: 'animation-delay-200',
    300: 'animation-delay-300',
    400: 'animation-delay-400',
    500: 'animation-delay-500',
    600: 'animation-delay-600',
  }[delay] || ''
  
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-[24px] border border-white/18 p-5 text-left text-white shadow-[0_12px_28px_rgba(39,19,88,0.2)] transition duration-200 animate-fadeInUp ${delayClass} ${
        isHero ? 'col-span-full py-8' : ''
      } ${
        onClick ? 'hover:-translate-y-1 hover:shadow-[0_20px_36px_rgba(39,19,88,0.24)]' : ''
      }`}
      style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
    >
      {/* Background patterns */}
      {isHero && (
        <svg className="absolute inset-0 h-full w-full opacity-10" viewBox="0 0 400 150" preserveAspectRatio="none">
          <path d="M0 100 C 100 120, 200 80, 400 110 L 400 150 L 0 150 Z" fill="white" />
          <path d="M0 80 C 150 110, 250 60, 400 90" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5 5" />
        </svg>
      )}
      
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className={`${isHero ? 'text-sm' : 'text-[10px]'} font-medium uppercase tracking-[0.12em] text-white/85`}>{title}</div>
            <div className={`mt-2 ${isHero ? 'text-4xl' : 'text-2xl'} font-bold leading-none`}>{value}</div>
            {note && <div className={`mt-2 ${isHero ? 'text-sm' : 'text-[10px]'} opacity-75`}>{note}</div>}
          </div>
          {isHero && (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16 text-white shadow-sm">
              {icon}
            </div>
          )}
        </div>
        <div className={`mt-4 flex items-end justify-between ${isHero ? '' : 'min-h-[1.5rem]'}`}>
          {isHero ? (
             <div className="text-xs font-medium text-white/90">
               {trend && <span>{trend}</span>}
             </div>
          ) : (
            <div className="ml-auto opacity-50">
              {icon}
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  )
}

const StatusSummaryCard = ({ title, value, accent, icon, total, onClick, delay = 0 }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  const delayClass = {
    0: '',
    100: 'animation-delay-100',
    200: 'animation-delay-200',
    300: 'animation-delay-300',
    400: 'animation-delay-400',
    500: 'animation-delay-500',
    600: 'animation-delay-600',
  }[delay] || ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left transition animate-fadeInUp ${delayClass} hover:opacity-80`}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: toRgba(accent, 0.12), color: accent }}
        >
          {icon}
        </div>
        <div className="text-[11px] font-bold text-[#322253] truncate">{title}</div>
      </div>
      <div className="mt-2 text-2xl font-bold text-[#24173f] leading-none">{value}</div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-[#eadfff]/40">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: accent }} />
      </div>
      <div className="mt-1.5 text-[10px] font-medium text-[#856fb4]">{percent}% of total</div>
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
    revenue: { today: 0, week: 0, month: 0, week_series: [] },
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
  const glassPanelClass = 'rounded-[30px] border border-white/32 bg-white/76 p-4 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md animate-fadeInUp'
  const statCardClass = 'rounded-[24px] border border-white/32 bg-white/76 p-4 shadow-[0_16px_34px_rgba(59,31,114,0.12)] backdrop-blur-md animate-fadeInUp'
  const lightChartShellClass = 'mt-4 h-44 rounded-[24px] border border-white/36 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,236,255,0.82))] p-2'
  const darkChartShellClass = 'mt-4 h-44 rounded-[24px] border border-white/12 bg-gradient-to-br from-[#7050d3] via-[#5d3fbd] to-[#43257f] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]'
  const accentNoteClass = 'mt-3 rounded-full bg-[#f2e9ff]/90 px-4 py-2 text-sm text-[#644fa0]'
  const emptyStateClass = 'rounded-xl border border-dashed border-[#dccdff] bg-[#f7f1ff] p-6 text-center text-sm text-[#8b77bc]'

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const requestUserType = sessionStorage.getItem('userType') || storedUserType || 'admin'
    const roleRequestConfig = {
      params: { type: requestUserType },
      headers: { 'X-User-Type': requestUserType },
    }

    try {
      setLoading(true)
      let payload = null

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const [statsRes, appointmentsRes] = await Promise.all([
            api.get('/dashboard/admin/stats', roleRequestConfig),
            api.get('/appointments', roleRequestConfig),
          ])

          payload = {
            stats: statsRes.data || {},
            appointments: normalizeAppointmentsPayload(appointmentsRes.data),
          }
          break
        } catch (error) {
          const status = error.response?.status
          const shouldRetry = attempt === 0 && (!status || status === 401 || status === 419)

          if (!shouldRetry) {
            throw error
          }

          await pause(350)
        }
      }

      if (!payload) {
        throw new Error('Dashboard request did not return data.')
      }

      setStats({ ...payload.stats })
      const allAppointments = payload.appointments
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
    if (Array.isArray(stats.revenue?.week_series) && stats.revenue.week_series.length > 0) {
      return stats.revenue.week_series.map((day, idx) => ({
        label: day?.label || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx] || '-',
        value: Number(day?.value) || 0,
      }))
    }

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
  }, [appointments, stats.revenue?.week_series])

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
    <AdminLayout
      userType={storedUserType}
      onLogout={handleLogout}
      title={canAccessSales ? 'Dashboard Overview' : 'Manager Overview'}
    >
      <div className="app-mobile-shell space-y-7">
          <div className="animate-slideUpStagger">
            <h1 className="text-2xl font-bold tracking-tight text-[#24173f]">
              {canAccessSales ? 'Admin Dashboard' : 'Manager Dashboard'}
            </h1>
          </div>

          <div className={`grid gap-4 grid-cols-2 lg:grid-cols-3 ${canAccessSales ? 'xl:grid-cols-6' : 'xl:grid-cols-4'} animate-slideUpStagger animation-delay-100`}>
            {canAccessSales ? (
              <>
                <GradientMetricCard
                  isHero
                  title="Total Revenue"
                  value={formatCurrency(stats.revenue.month)}
                  trend="↑ 12% vs last month"
                  note="This month"
                  start="#7f63e8"
                  end="#5a3dbd"
                  delay={0}
                  onClick={() => navigate('/admin/sales')}
                  icon={
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2h11M21 12v4a1 1 0 01-1 1h-2a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1zM11 10a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                  }
                />
                <GradientMetricCard
                  title="Daily Revenue"
                  value={formatCurrency(stats.revenue.today)}
                  note="Today"
                  start="#6f62e0"
                  end="#5349c8"
                  delay={100}
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
                  delay={200}
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
                  isHero
                  title="Total Appointments"
                  value={stats.appointments.month}
                  note="This month"
                  start="#7f63e8"
                  end="#5a3dbd"
                  delay={0}
                  onClick={() => navigate('/admin/appointments?range=month')}
                  icon={
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
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
              delay={canAccessSales ? 300 : 100}
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
              note="This month"
              start="#74a0ae"
              end="#547f91"
              delay={canAccessSales ? 400 : 200}
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
              delay={canAccessSales ? 500 : 300}
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
              delay={canAccessSales ? 600 : 400}
              onClick={() => navigate('/admin/customers')}
              icon={
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <circle cx="12" cy="8" r="3" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                </svg>
              }
            />
          </div>

          <section className={`${glassPanelClass} space-y-5 animate-slideUpStagger animation-delay-200`}>
            <div>
              <h2 className="text-lg font-bold text-[#2f2252]">Appointment Status Summary</h2>
            </div>
            <div className="grid gap-4 grid-cols-3">
              <StatusSummaryCard
                title="Pending"
                value={stats.status_summary.booked}
                total={statusTotal}
                accent="#df9a57"
                delay={0}
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
                delay={100}
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
                delay={200}
                onClick={() => navigate('/admin/appointments?status=cancelled')}
                icon={
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6l-12 12" />
                  </svg>
                }
              />
            </div>
          </section>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 animate-slideUpStagger animation-delay-300">
            {canAccessSales ? (
              <div className={`${glassPanelClass} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#2f2252]">Weekly Revenue</h3>
                    <p className="text-[10px] text-[#806caf] uppercase tracking-wider">Performance by day</p>
                  </div>
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
              <div className={`${glassPanelClass} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#2f2252]">Weekly Appointments</h3>
                    <p className="text-[10px] text-[#806caf] uppercase tracking-wider">Booking frequency</p>
                  </div>
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

            <div className={`${glassPanelClass} space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#2f2252]">Monthly Appointments</h3>
                  <p className="text-[10px] text-[#806caf] uppercase tracking-wider">Activity over 6 months</p>
                </div>
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
          </div>

          <div className={`${glassPanelClass} space-y-5 animate-slideUpStagger animation-delay-400`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#2f2252]">Recent Appointments</h3>
              <button type="button" onClick={() => navigate('/admin/appointments')} className="text-xs font-semibold text-[#6143c5] hover:underline">View all</button>
            </div>
            <div className="md:hidden space-y-1">
              {recentAppointments.length === 0 && (
                <div className={emptyStateClass}>
                  No recent appointments yet.
                </div>
              )}
              {recentAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="group flex items-center justify-between py-3 border-b border-[#ece2ff] last:border-0"
                >
                  <div className="flex flex-1 min-w-0 items-center gap-1.5 sm:gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-[#f2e9ff] flex items-center justify-center text-[#6143c5] font-bold text-sm">
                      {appointment.customer_name ? appointment.customer_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#2f2252] truncate">{appointment.customer_name}</div>
                      <div className="text-[10px] text-[#856fb4] mt-0.5">
                        {new Date(appointment.start_datetime_pht || appointment.start_datetime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} • {getAppointmentServices(appointment)[0]?.name || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        appointment.status === 'completed' ? 'bg-[#e8f5f3] text-[#4f8177]' : 
                        appointment.status === 'booked' ? 'bg-[#fff5eb] text-[#9d6a2d]' :
                        'bg-[#fff0f3] text-[#9a4963]'
                      }`}
                    >
                      {appointment.status}
                    </span>
                    <svg className="w-4 h-4 text-[#bfb1e4]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
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
                    <th className="pb-2">Team</th>
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
                      <td className="py-3">{appointment.team_name || 'Salon Team'}</td>
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
    </AdminLayout>
  )
}

export default AdminDashboard
