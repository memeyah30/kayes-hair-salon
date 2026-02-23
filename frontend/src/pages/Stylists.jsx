import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'

const Stylists = () => {
  const navigate = useNavigate()
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-1 bg-transparent text-slate-700 hover:text-slate-900 text-4xl leading-none transition-all duration-300 ease-out hover:-translate-y-1 hover:drop-shadow"
        >
          {'<'}
        </button>
        <h1 className="text-2xl font-bold">Stylists</h1>
      </div>
      
      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.map(s => (
            <div key={s.id} className="border rounded-lg p-4 transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl hover:ring-2 hover:ring-blue-200">
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
              <div className="text-sm text-[#8f7a6f] mb-1">
                <span className="font-medium">Email:</span> {s.email}
              </div>
              <div className="text-sm text-[#8f7a6f] mb-2">
                <span className="font-medium">Phone:</span> {s.phone}
              </div>
              <div className={`inline-block px-2 py-1 rounded text-xs ${s.active ? 'bg-green-100 text-green-800' : 'bg-[#f7f1ec] text-[#3b2f2a]'}`}>
                {s.active ? 'Active' : 'Inactive'}
              </div>
              {s.active && (
                <button
                  onClick={() => navigate(`/book?stylist=${s.id}`)}
                  className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition"
                >
                  Book with {s.name.split(' ')[0]}
                </button>
              )}
            </div>
          ))}
        </div>
        {stylists.length === 0 && (
          <div className="text-center py-8 text-[#9b857a]">No stylists yet.</div>
        )}
      </div>
    </div>
  )
}

export default Stylists

