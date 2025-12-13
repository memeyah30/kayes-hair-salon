import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

const StatCard = ({ title, value, accent }) => (
  <div className="bg-white rounded-xl shadow p-4 border-l-4" style={{ borderColor: accent }}>
    <div className="text-gray-500 text-sm font-semibold">{title}</div>
    <div className="text-3xl font-bold mt-2">{value}</div>
  </div>
)

const AppointmentList = ({ appointments, onCancel, onStartReschedule }) => (
  <div className="bg-white rounded-xl shadow p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold">Upcoming appointments</h3>
      <span className="text-xs text-gray-500">{appointments.length} total</span>
    </div>
    <div className="divide-y">
      {appointments.map(appt => (
        <div key={appt.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="font-semibold">{appt.customer_name}</div>
            <div className="text-sm text-gray-600">
              {new Date(appt.start_datetime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              {' • '}
              {appt.service?.name} with {appt.stylist?.name}
            </div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{appt.status}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onStartReschedule(appt)} className="px-3 py-1 border rounded text-sm hover:border-blue-400">Reschedule</button>
            <button onClick={() => onCancel(appt.id)} className="px-3 py-1 border rounded text-sm text-red-600 border-red-200 hover:border-red-400">Cancel</button>
          </div>
        </div>
      ))}
      {appointments.length === 0 && <div className="py-3 text-sm text-gray-500">No appointments yet.</div>}
    </div>
  </div>
)

const currency = cents => `₱${(cents / 100).toFixed(2)}`

const Dashboard = () => {
  const [appointments, setAppointments] = useState([])

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      const aRes = await api.get('/appointments')
      setAppointments(aRes.data)
    } catch (e) {
      console.error('API Error:', e)
      toast.error(`Failed to load data from API: ${e.message || 'Check console for details'}`)
    }
  }

  const handleCancel = async (id) => {
    await api.post(`/appointments/${id}/cancel`)
    toast.info('Appointment cancelled')
    refreshData()
  }

  const handleStartReschedule = (appt) => {
    // Navigate to book appointment page with pre-filled data
    window.location.href = `/book?appointment=${appt.id}`
  }

  const stats = useMemo(() => {
    const booked = appointments.filter(a => a.status === 'booked')
    const cancelled = appointments.filter(a => a.status === 'cancelled')
    const today = new Date().toISOString().slice(0,10)
    const todaySales = booked
      .filter(a => a.start_datetime.slice(0,10) === today)
      .reduce((sum, a) => sum + (a.service?.price_cents || 0), 0)
    return {
      customers: new Set(appointments.map(a => a.customer_email || a.customer_phone)).size || appointments.length,
      totalAppointments: appointments.length,
      booked: booked.length,
      cancelled: cancelled.length,
      todaySales,
    }
  }, [appointments])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Customers" value={stats.customers} accent="#0ea5e9" />
        <StatCard title="Total Appointments" value={stats.totalAppointments} accent="#22c55e" />
        <StatCard title="Booked" value={stats.booked} accent="#2563eb" />
        <StatCard title="Cancelled" value={stats.cancelled} accent="#ef4444" />
        <StatCard title="Today Sales" value={currency(stats.todaySales)} accent="#2563eb" />
      </div>

      <AppointmentList
        appointments={appointments}
        onCancel={handleCancel}
        onStartReschedule={handleStartReschedule}
      />
    </div>
  )
}

export default Dashboard





