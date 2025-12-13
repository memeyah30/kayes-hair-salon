import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

const currency = cents => `₱${(cents / 100).toFixed(2)}`

const Services = () => {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/services')
      setServices(res.data)
    } catch (e) {
      console.error('API Error:', e)
      toast.error(`Failed to load data from API: ${e.message || 'Check console for details'}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Services</h1>
      
      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="border rounded-lg overflow-hidden hover:shadow-md transition">
              {s.image ? (
                <img
                  src={`http://localhost:8000/${s.image}`}
                  alt={s.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="p-4">
                <div className="font-semibold text-lg mb-1">{s.name}</div>
                <div className="text-sm text-gray-600 mb-2">
                  Duration: {s.duration_minutes} minutes
                  {s.specialization_tag && ` • ${s.specialization_tag}`}
                </div>
                <div className="font-bold text-xl text-blue-600">
                  {currency(s.price_cents)}
                </div>
              </div>
            </div>
          ))}
        </div>
        {services.length === 0 && (
          <div className="text-center py-8 text-gray-500">No services yet.</div>
        )}
      </div>
    </div>
  )
}

export default Services

