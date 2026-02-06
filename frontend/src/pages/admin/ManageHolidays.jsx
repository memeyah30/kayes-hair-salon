import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const ManageHolidays = () => {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'holiday',
    is_closed: true,
    description: '',
    recurring_yearly: false,
  })
  const navigate = useNavigate()

  useEffect(() => {
    loadHolidays()
  }, [])

  const loadHolidays = async () => {
    try {
      setLoading(true)
      const res = await api.get('/holidays')
      setHolidays(res.data)
    } catch (e) {
      toast.error('Failed to load holidays')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        await api.patch(`/holidays/${editing.id}`, formData)
        toast.success('Holiday updated successfully')
      } else {
        await api.post('/holidays', formData)
        toast.success('Holiday created successfully')
      }
      setShowModal(false)
      setEditing(null)
      setFormData({
        name: '',
        date: '',
        type: 'holiday',
        is_closed: true,
        description: '',
        recurring_yearly: false,
      })
      loadHolidays()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save holiday')
    }
  }

  const handleEdit = (holiday) => {
    setEditing(holiday)
    setFormData({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      is_closed: holiday.is_closed,
      description: holiday.description || '',
      recurring_yearly: holiday.recurring_yearly || false,
    })
    setShowModal(true)
  }

  const handleDelete = async (holidayId) => {
    if (!window.confirm('Are you sure you want to delete this holiday? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/holidays/${holidayId}`)
      toast.success('Holiday deleted successfully')
      loadHolidays()
    } catch (e) {
      toast.error('Failed to delete holiday')
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate('/login/admin')
    })
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'holiday':
        return 'bg-blue-100 text-blue-800'
      case 'occasion':
        return 'bg-purple-100 text-purple-800'
      case 'closed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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
      <Sidebar userType="admin" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Manage Holidays & Special Occasions</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
              >
                ← Return to Dashboard
              </button>
              <button
                onClick={() => {
                  setEditing(null)
                  setFormData({
                    name: '',
                    date: '',
                    type: 'holiday',
                    is_closed: true,
                    description: '',
                    recurring_yearly: false,
                  })
                  setShowModal(true)
                }}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                + Add Holiday
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> When a holiday is marked as "Closed", customers will not be able to book appointments on that date. 
              The system will automatically show a warning message when customers try to select a closed date.
            </p>
          </div>

          {/* Holidays List */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recurring</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {holidays.map(holiday => (
                    <tr key={holiday.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{holiday.name}</td>
                      <td className="px-4 py-3">
                        {new Date(holiday.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs capitalize ${getTypeColor(holiday.type)}`}>
                          {holiday.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {holiday.is_closed ? (
                          <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Closed</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Open</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {holiday.recurring_yearly ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md text-sm text-gray-600">
                          {holiday.description || <span className="text-gray-400">No description</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(holiday)}
                            className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(holiday.id)}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {holidays.length === 0 && (
                <div className="text-center py-8 text-gray-500">No holidays found. Click "Add Holiday" to create one.</div>
              )}
            </div>
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Holiday</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full border rounded px-3 py-2"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., New Year's Day"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      className="w-full border rounded px-3 py-2"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      required
                      className="w-full border rounded px-3 py-2"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      <option value="holiday">Holiday</option>
                      <option value="occasion">Special Occasion</option>
                      <option value="closed">Closed Day</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_closed}
                        onChange={(e) => setFormData({ ...formData, is_closed: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Salon is closed on this date</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.recurring_yearly}
                        onChange={(e) => setFormData({ ...formData, recurring_yearly: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Recurring yearly</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      className="w-full border rounded px-3 py-2"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description or notes"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {editing ? 'Update' : 'Create'} Holiday
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditing(null)
                        setFormData({
                          name: '',
                          date: '',
                          type: 'holiday',
                          is_closed: true,
                          description: '',
                          recurring_yearly: false,
                        })
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ManageHolidays
