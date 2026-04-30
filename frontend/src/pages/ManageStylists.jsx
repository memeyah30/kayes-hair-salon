import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import AdminLayout from '../components/AdminLayout'

const getInitialManagerFormData = () => ({
  name: '',
  username: '',
  password: '',
  active: true,
})

const ManageStylists = () => {
  const [managers, setManagers] = useState([])
  const [selectedStaffType, setSelectedStaffType] = useState('manager')
  const [editingManager, setEditingManager] = useState(null)
  const [managerFormData, setManagerFormData] = useState(getInitialManagerFormData)
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [isDeleteDialogLoading, setIsDeleteDialogLoading] = useState(false)

  useEffect(() => {
    refreshData()
  }, [])

  const resetManagerForm = () => {
    setEditingManager(null)
    setManagerFormData(getInitialManagerFormData())
  }

  const refreshData = async () => {
    try {
      const managersRes = await api.get('/managers')
      setManagers(managersRes.data || [])
    } catch (e) {
      toast.error('Failed to load manager records')
      console.error('Refresh error:', e)
    }
  }

  const handleManagerSubmit = async (e) => {
    e.preventDefault()

    if (!managerFormData.name || !managerFormData.username) {
      toast.error('Manager name and username are required')
      return
    }

    if (!editingManager && !managerFormData.password) {
      toast.error('Password is required for new manager')
      return
    }

    try {
      const payload = {
        name: managerFormData.name,
        username: managerFormData.username,
        active: managerFormData.active ? '1' : '0',
      }

      if (managerFormData.password) {
        payload.password = managerFormData.password
      }

      if (editingManager) {
        await api.patch(`/managers/${editingManager.id}`, payload)
        toast.success('Manager updated successfully')
      } else {
        await api.post('/managers', payload)
        toast.success('Manager created successfully')
      }

      resetManagerForm()
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save manager')
    }
  }

  const handleEditManager = (manager) => {
    setSelectedStaffType('manager')
    setEditingManager(manager)
    setManagerFormData({
      name: manager.name || '',
      username: manager.username || '',
      password: '',
      active: Boolean(manager.active),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDeleteDialog = (type, staff, mode = 'delete', meta = {}) => {
    setDeleteDialog({
      type,
      staff,
      mode,
      ...meta,
    })
  }

  const closeDeleteDialog = () => {
    if (isDeleteDialogLoading) return
    setDeleteDialog(null)
  }

  const handleDeleteManager = async (manager) => {
    try {
      await api.delete(`/managers/${manager.id}`)
      toast.success('Manager deleted')
      if (editingManager?.id === manager.id) {
        resetManagerForm()
      }
      refreshData()
      return true
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete manager')
      return false
    }
  }

  const confirmDeleteDialog = async () => {
    if (!deleteDialog || isDeleteDialogLoading) return

    const { staff } = deleteDialog
    setIsDeleteDialogLoading(true)

    try {
      const deleted = await handleDeleteManager(staff)
      if (deleted) {
        setDeleteDialog(null)
      }
    } finally {
      setIsDeleteDialogLoading(false)
    }
  }

  const navigate = useNavigate()

  return (
    <AdminLayout userType="admin" title="Manager Profiles">
      <div className="app-mobile-shell space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="tap-safe flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-xl font-bold text-[#7B5CF5] shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition hover:bg-[#F6F2FF] hover:text-[#6846E8]"
              aria-label="Return to Dashboard"
              title="Return to Dashboard"
            >&larr;</button>
            <div>
              <h1 className="text-2xl font-bold text-[#2D2D2D]">Manager Profiles</h1>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
          <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">
            {editingManager ? 'Edit Manager' : 'Add Manager'}
          </h2>
          <form onSubmit={handleManagerSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Name *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={managerFormData.name}
                  onChange={(e) => setManagerFormData({ ...managerFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Username *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={managerFormData.username}
                  onChange={(e) => setManagerFormData({ ...managerFormData, username: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">
                  Password {editingManager ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-[#DDD6FE] px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={managerFormData.password}
                  placeholder={editingManager ? '********' : 'Enter password (min 6 characters)'}
                  onChange={(e) => setManagerFormData({ ...managerFormData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Status</label>
                <select
                  className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={managerFormData.active ? 'true' : 'false'}
                  onChange={(e) => setManagerFormData({ ...managerFormData, active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-[#7B5CF5] px-4 py-2 text-white transition hover:bg-[#6846E8]">
                {editingManager ? 'Update' : 'Create'} Manager
              </button>
              {editingManager && (
                <button
                  type="button"
                  onClick={resetManagerForm}
                  className="rounded-lg border border-[#7B5CF5] bg-transparent px-4 py-2 text-[#7B5CF5] transition hover:bg-[#F2EDFF]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
          <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">All Managers ({managers.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#DDD6FE] text-sm font-medium text-[#6B6B6B]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EDFF]">
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-[#6B6B6B]">
                      No managers yet.
                    </td>
                  </tr>
                ) : (
                  managers.map((m) => (
                    <tr key={m.id} className="text-sm transition hover:bg-[#F6F2FF]">
                      <td className="px-4 py-3 font-medium text-[#2D2D2D]">{m.name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{m.username}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${m.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {m.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditManager(m)}
                            className="rounded-lg bg-[#F2EDFF] p-2 text-[#7B5CF5] hover:bg-[#E5DEFF]"
                            title="Edit Manager"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openDeleteDialog('manager', m)}
                            className="rounded-lg bg-red-50 p-2 text-red-500 hover:bg-red-100"
                            title="Delete Manager"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {deleteDialog && (
          <div className="fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-[#1B1237]/45"
              onClick={closeDeleteDialog}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-md rounded-[14px] border border-[#DDD6FE] bg-white p-5 shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
                <h3 className="text-lg font-semibold text-[#2D2D2D]">
                  Delete Manager?
                </h3>
                <p className="mt-2 text-sm text-[#6B6B6B]">
                  Are you sure you want to delete {deleteDialog.staff?.name || 'this manager'}? This action cannot be undone.
                </p>
                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDeleteDialog}
                    disabled={isDeleteDialogLoading}
                    className="rounded-lg border border-[#7B5CF5] bg-transparent px-4 py-2 text-sm text-[#7B5CF5] transition hover:bg-[#F6F2FF] disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteDialog}
                    disabled={isDeleteDialogLoading}
                    className="rounded-lg bg-[#EF4444] px-4 py-2 text-sm text-white hover:bg-[#DC2626] disabled:opacity-60"
                  >
                    {isDeleteDialogLoading ? 'Processing...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default ManageStylists
