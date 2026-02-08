import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const AdminRatings = () => {
  const [ratings, setRatings] = useState([])
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStylist, setFilterStylist] = useState('all')
  const [filterRating, setFilterRating] = useState('all')
  const navigate = useNavigate()
  const storedUserType = localStorage.getItem('userType') || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  const getStart = (appointment) => appointment?.start_datetime_pht || appointment?.start_datetime

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ratingsRes, stylistsRes] = await Promise.all([
        api.get('/ratings'),
        api.get('/stylists'),
      ])
      
      // Load appointment and stylist data for each rating
      const ratingsWithData = await Promise.all(
        ratingsRes.data.map(async (rating) => {
          try {
            const appointmentRes = await api.get(`/appointments/${rating.appointment_id}`)
            return {
              ...rating,
              appointment: appointmentRes.data,
              stylist: appointmentRes.data.stylist,
            }
          } catch (e) {
            return {
              ...rating,
              appointment: null,
              stylist: null,
            }
          }
        })
      )
      
      setRatings(ratingsWithData)
      setStylists(stylistsRes.data)
    } catch (e) {
      toast.error('Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (ratingId) => {
    if (!window.confirm('Are you sure you want to delete this rating? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/ratings/${ratingId}`)
      toast.success('Rating deleted successfully')
      loadData()
    } catch (e) {
      toast.error('Failed to delete rating')
    }
  }

  const filteredRatings = ratings.filter(rating => {
    if (filterStylist !== 'all' && rating.stylist?.id !== parseInt(filterStylist)) {
      return false
    }
    if (filterRating !== 'all' && rating.rating !== parseInt(filterRating)) {
      return false
    }
    return true
  })

  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : '0.0'

  const ratingDistribution = {
    5: ratings.filter(r => r.rating === 5).length,
    4: ratings.filter(r => r.rating === 4).length,
    3: ratings.filter(r => r.rating === 3).length,
    2: ratings.filter(r => r.rating === 2).length,
    1: ratings.filter(r => r.rating === 1).length,
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate(loginPath)
    })
  }

  const renderStars = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row text-gray-800">
      <Sidebar userType={storedUserType} onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Customer Ratings</h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ← Return to Dashboard
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm font-semibold">Average Rating</div>
              <div className="text-3xl font-bold mt-2 text-yellow-500">{averageRating}</div>
              <div className="text-xs text-gray-500 mt-1">Out of 5.0</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm font-semibold">Total Ratings</div>
              <div className="text-3xl font-bold mt-2">{ratings.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm font-semibold">5-Star Ratings</div>
              <div className="text-3xl font-bold mt-2 text-green-600">{ratingDistribution[5]}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-gray-500 text-sm font-semibold">1-Star Ratings</div>
              <div className="text-3xl font-bold mt-2 text-red-600">{ratingDistribution[1]}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Stylist</label>
                <select
                  value={filterStylist}
                  onChange={(e) => setFilterStylist(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Stylists</option>
                  {stylists.map(stylist => (
                    <option key={stylist.id} value={stylist.id}>{stylist.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Rating</label>
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ratings List */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stylist</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appointment Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRatings.map(rating => (
                    <tr key={rating.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{rating.customer_name || rating.appointment?.customer_name || 'N/A'}</div>
                        {rating.customer_email && (
                          <div className="text-xs text-gray-500">{rating.customer_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rating.stylist?.name || rating.appointment?.stylist?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500 text-lg">{renderStars(rating.rating)}</span>
                          <span className="text-sm font-medium">({rating.rating}/5)</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          {rating.comment ? (
                            <p className="text-sm text-gray-700">{rating.comment}</p>
                          ) : (
                            <span className="text-gray-400 text-sm">No comment</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStart(rating.appointment) ? (
                          <div className="text-sm">
                            {new Date(getStart(rating.appointment)).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}
                            <div className="text-xs text-gray-500">
                              {new Date(getStart(rating.appointment)).toLocaleTimeString('en-US', {
                                timeZone: 'Asia/Manila',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(rating.id)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          title="Delete rating"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRatings.length === 0 && (
                <div className="text-center py-8 text-gray-500">No ratings found</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminRatings
