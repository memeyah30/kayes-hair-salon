import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'
import ActionButton, { ActionGroup } from '../../components/ActionButton'

const LOCKED_HOLIDAY_TYPE = 'closed'
const LOCKED_HOLIDAY_TYPE_LABEL = 'Closed Day'

const DEFAULT_HOLIDAY_FORM = {
  name: '',
  date: '',
  type: LOCKED_HOLIDAY_TYPE,
  is_closed: true,
  description: '',
  recurring_yearly: false,
}

const ManageHolidays = () => {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(DEFAULT_HOLIDAY_FORM)
  const navigate = useNavigate()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

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
    const payload = {
      ...formData,
      type: LOCKED_HOLIDAY_TYPE,
      is_closed: true,
    }

    try {
      if (editing) {
        await api.patch(`/holidays/${editing.id}`, payload)
        toast.success('Holiday updated successfully')
      } else {
        await api.post('/holidays', payload)
        toast.success('Holiday created successfully')
      }
      setShowModal(false)
      setEditing(null)
      setFormData(DEFAULT_HOLIDAY_FORM)
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
      type: LOCKED_HOLIDAY_TYPE,
      is_closed: true,
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
      localStorage.clear(); sessionStorage.clear()
      navigate(loginPath)
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
        return 'bg-[#f7f1ec] text-[#3b2f2a]'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'occasion':
        return 'Special Occasion'
      case 'closed':
        return 'Closed Day'
      case 'holiday':
        return 'Holiday'
      default:
        return type
    }
  }

  const holidayModal = showModal && typeof document !== 'undefined'
    ? createPortal(
      <div className="fixed inset-0 z-[90]">
        <div
          className="absolute inset-0 bg-[#1B1237]/55 backdrop-blur-[1px]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#eadfd5] bg-white/95 p-6 shadow-[0_20px_44px_rgba(27,18,55,0.24)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="holiday-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="holiday-modal-title" className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Holiday</h2>
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
                <input
                  type="text"
                  readOnly
                  value={LOCKED_HOLIDAY_TYPE_LABEL}
                  className="w-full border rounded px-3 py-2 bg-gray-50 text-[#3b2f2a]"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked
                    disabled
                    className="rounded cursor-not-allowed"
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
                    setFormData(DEFAULT_HOLIDAY_FORM)
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null

  if (loading) {
    return (
      <div className="min-h-screen app-admin-bg flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <>
      <AdminLayout
        userType={storedUserType}
        onLogout={handleLogout}
        title="Holidays"
      >
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-lg font-bold"
                  aria-label="Return to Dashboard"
                  title="Return to Dashboard"
                >&larr;</button>
                <h1 className="text-2xl font-bold">Manage Holidays & Special Occasions</h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setEditing(null)
                    setFormData(DEFAULT_HOLIDAY_FORM)
                    setShowModal(true)
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  + Add Holiday
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> When a holiday is marked as "Closed", customers will not be able to book appointments on that date.
                The system will automatically show a warning message when customers try to select a closed date.
              </p>
            </div>

            <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Recurring</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#9b857a] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {holidays.map((holiday) => (
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
                          <span className={`px-2 py-1 rounded text-xs ${getTypeColor(holiday.type)}`}>
                            {getTypeLabel(holiday.type)}
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
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="max-w-md text-sm text-[#8f7a6f]">
                            {holiday.description || <span className="text-gray-400">No description</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ActionGroup className="min-w-[11rem]">
                            <ActionButton
                              onClick={() => handleEdit(holiday)}
                              tone="primary"
                              size="compact"
                            >
                              Edit
                            </ActionButton>
                            <ActionButton
                              onClick={() => handleDelete(holiday.id)}
                              tone="danger"
                              size="compact"
                            >
                              Delete
                            </ActionButton>
                          </ActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {holidays.length === 0 && (
                  <div className="text-center py-8 text-[#9b857a]">No holidays found. Click "Add Holiday" to create one.</div>
                )}
              </div>
            </div>
        </div>
      </AdminLayout>
      {holidayModal}
    </>
  )
}

export default ManageHolidays




