import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
})

const Stylists = () => {
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      setLoading(true)
      const res = await api.get('/stylists')
      setStylists(res.data)
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
      <h1 className="text-2xl font-bold">Stylists</h1>
      
      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.map(s => (
            <div key={s.id} className="border rounded-lg p-4 hover:shadow-md transition">
              {s.image ? (
                <img
                  src={`http://localhost:8000/${s.image}`}
                  alt={s.name}
                  className="w-full h-48 object-cover rounded-lg mb-3"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-3 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="font-semibold text-lg mb-2">{s.name}</div>
              <div className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Email:</span> {s.email}
              </div>
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Phone:</span> {s.phone}
              </div>
              <div className={`inline-block px-2 py-1 rounded text-xs ${s.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {s.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
        {stylists.length === 0 && (
          <div className="text-center py-8 text-gray-500">No stylists yet.</div>
        )}
      </div>
    </div>
  )
}

export default Stylists

