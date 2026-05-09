import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'
import Pagination from '../../components/Pagination'

const AdminRatings = () => {
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
    from: 0,
    to: 0,
  })
  const [summary, setSummary] = useState({
    average_rating: 0,
    total_ratings: 0,
    rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  })
  const navigate = useNavigate()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  const getStart = (appointment) => appointment?.start_datetime_pht || appointment?.start_datetime

  useEffect(() => {
    setCurrentPage(1)
  }, [filterRating])

  useEffect(() => {
    loadData(currentPage)
  }, [currentPage, filterRating])

  const loadData = async (page = 1) => {
    try {
      setLoading(true)
      const requestUserType = sessionStorage.getItem('userType') || storedUserType || 'admin'
      const params = {
        type: requestUserType,
        paginate: 1,
        per_page: 10,
        page,
      }
      if (filterRating !== 'all') params.rating = filterRating
      const roleRequestConfig = {
        params,
        headers: { 'X-User-Type': requestUserType },
      }
      const ratingsRes = await api.get('/ratings', roleRequestConfig)

      setRatings(ratingsRes.data?.data || [])
      setPagination({
        current_page: ratingsRes.data?.current_page || 1,
        last_page: ratingsRes.data?.last_page || 1,
        per_page: ratingsRes.data?.per_page || 10,
        total: ratingsRes.data?.total || 0,
        from: ratingsRes.data?.from || 0,
        to: ratingsRes.data?.to || 0,
      })
      setSummary(ratingsRes.data?.summary || {
        average_rating: 0,
        total_ratings: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      })
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load ratings')
      setRatings([])
      setPagination({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
        from: 0,
        to: 0,
      })
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
      const nextPage = ratings.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage)
      } else {
        loadData(nextPage)
      }
    } catch (e) {
      toast.error('Failed to delete rating')
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear(); sessionStorage.clear()
      navigate(loginPath)
    })
  }

  const renderStars = (rating) => {
    return '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating)
  }

  if (loading) {
    return (
      <div className="min-h-screen app-admin-bg flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <AdminLayout
      userType={storedUserType}
      onLogout={handleLogout}
      title="Customer Reviews"
    >
      <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="group flex h-10 w-10 items-center justify-center rounded-full bg-[#f2efff] text-[#7B5CF5] transition hover:bg-[#7B5CF5] hover:text-white shadow-sm"
                title="Back to Dashboard"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold">Customer Ratings</h1>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <div className="text-[#9b857a] text-sm font-semibold">Average Rating</div>
              <div className="text-3xl font-bold mt-2 text-yellow-500">{Number(summary.average_rating || 0).toFixed(1)}</div>
              <div className="text-xs text-[#9b857a] mt-1">Out of 5.0</div>
            </div>
            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <div className="text-[#9b857a] text-sm font-semibold">Total Ratings</div>
              <div className="text-3xl font-bold mt-2">{summary.total_ratings || 0}</div>
            </div>
            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <div className="text-[#9b857a] text-sm font-semibold">5-Star Ratings</div>
              <div className="text-3xl font-bold mt-2 text-green-600">{summary.rating_distribution?.[5] || 0}</div>
            </div>
            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
              <div className="text-[#9b857a] text-sm font-semibold">1-Star Ratings</div>
              <div className="text-3xl font-bold mt-2 text-red-600">{summary.rating_distribution?.[1] || 0}</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <div className="flex gap-4 flex-wrap">
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
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-hidden">
            <div className="table-mobile-scroll">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Rating</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Comment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Appointment Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ratings.map(rating => (
                    <tr key={rating.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{rating.customer_name || rating.appointment?.customer_name || 'N/A'}</div>
                        {rating.customer_email && (
                          <div className="text-xs text-[#9b857a]">{rating.customer_email}</div>
                        )}
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
                            <div className="text-xs text-[#9b857a]">
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
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() => handleDelete(rating.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0f3] text-[#cc6b84] transition hover:bg-[#ffe4e9] shadow-sm"
                            title="Delete rating"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ratings.length === 0 && (
                <div className="text-center py-8 text-[#9b857a]">No ratings found</div>
              )}
            </div>
            {ratings.length > 0 && (
              <Pagination
                pagination={pagination}
                onPageChange={setCurrentPage}
                loading={loading}
              />
            )}
          </div>
      </div>
    </AdminLayout>
  )
}

export default AdminRatings




