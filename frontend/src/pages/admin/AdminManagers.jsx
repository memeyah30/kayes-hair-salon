import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'

const AdminManagers = () => {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionLoadingId, setActionLoadingId] = useState(null)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('add') // 'add' or 'edit'
  const [currentManager, setCurrentManager] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSaving, setIsSaving] = useState(false)

  // Reset password state
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const [resetManager, setResetManager] = useState(null)
  const [isResetting, setIsResetting] = useState(false)

  const navigate = useNavigate()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  const loadManagers = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/managers')
      setManagers(Array.isArray(data) ? data : [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load managers.')
      setManagers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadManagers()
  }, [])

  const filteredManagers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return managers
    return managers.filter((manager) => {
      const name = String(manager?.name || '').toLowerCase()
      const email = String(manager?.email || '').toLowerCase()
      const username = String(manager?.username || '').toLowerCase()
      return name.includes(query) || email.includes(query) || username.includes(query)
    })
  }, [managers, searchTerm])

  const openAddModal = () => {
    setModalMode('add')
    setCurrentManager(null)
    setFormData({ name: '', email: '', phone: '', address: '', password: '' })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const openEditModal = (manager) => {
    setModalMode('edit')
    setCurrentManager(manager)
    setFormData({
      name: manager.name || '',
      email: manager.email || '',
      phone: manager.phone || '',
      address: manager.address || '',
      password: '', // Blank for edit unless changing
    })
    setFormErrors({})
    setIsModalOpen(true)
  }

  const validateForm = () => {
    const errors = {}
    if (!formData.name) errors.name = 'Full Name is required'
    if (!formData.email) errors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid'
    if (!formData.phone) errors.phone = 'Contact Number is required'
    
    if (modalMode === 'add' && !formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const payload = { ...formData }
      if (modalMode === 'edit' && !payload.password) {
        delete payload.password // Don't send empty password if not changing
      }

      if (modalMode === 'add') {
        await api.post('/managers', payload)
        toast.success('Manager account created successfully!')
      } else {
        await api.patch(`/managers/${currentManager.id}`, payload)
        toast.success('Manager profile updated successfully!')
      }
      
      setIsModalOpen(false)
      loadManagers()
    } catch (error) {
      if (error.response?.data?.errors) {
        const backendErrors = {}
        Object.entries(error.response.data.errors).forEach(([key, messages]) => {
          backendErrors[key] = messages[0]
        })
        setFormErrors(backendErrors)
      } else {
        toast.error(error.response?.data?.message || 'Failed to save manager profile.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (manager) => {
    try {
      setActionLoadingId(manager.id)
      await api.patch(`/managers/${manager.id}`, { active: !manager.active })
      toast.success(`Manager ${manager.active ? 'deactivated' : 'activated'}.`)
      loadManagers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update manager status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (manager) => {
    const confirmed = window.confirm(`Are you sure you want to completely delete "${manager.name}"? This action cannot be undone.`)
    if (!confirmed) return

    try {
      setActionLoadingId(manager.id)
      await api.delete(`/managers/${manager.id}`)
      toast.success('Manager profile deleted.')
      loadManagers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete manager.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetPassword = async (manager) => {
    const confirmed = window.confirm(`Are you sure you want to reset the password for "${manager.name}"? A temporary password will be generated.`)
    if (!confirmed) return

    try {
      setIsResetting(true)
      const { data } = await api.post(`/managers/${manager.id}/reset-password`)
      setTempPassword(data.temporary_password)
      setResetManager(manager)
      setResetModalOpen(true)
      toast.success('Password reset successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password.')
    } finally {
      setIsResetting(false)
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      navigate(loginPath)
    })
  }

  return (
    <AdminLayout
      title="Manager Profiles"
      subtitle="Create and manage manager accounts and credentials."
      userType={storedUserType}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        {/* Header Section */}
        <div className="rounded-[24px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_40px_rgba(59,31,114,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#2d1b4a]">Manager Accounts</h2>
              <p className="text-sm text-[#7a6794]">Add new managers or update their access credentials.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search managers..."
                  className="w-full sm:w-64 rounded-xl border border-[#DDD6FE] bg-white px-4 py-3 pl-11 text-sm text-[#2d1b4a] outline-none transition focus:border-[#8b5cf6]"
                />
                <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b6fc1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3.5-3.5" />
                </svg>
              </div>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#6d4de6] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#5b3cc4]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Manager
              </button>
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="overflow-hidden rounded-[24px] border border-white/40 bg-white/80 shadow-[0_18px_40px_rgba(59,31,114,0.12)] backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#57476e]">
              <thead className="bg-[#F8F5FF] text-xs uppercase tracking-wider text-[#7a6794]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Manager Details</th>
                  <th className="px-6 py-4 font-semibold">Contact Info</th>
                  <th className="px-6 py-4 font-semibold">Address</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEE7FF]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-[#7a6794]">Loading managers...</td>
                  </tr>
                ) : filteredManagers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-[#7a6794]">No managers found.</td>
                  </tr>
                ) : (
                  filteredManagers.map((manager) => (
                    <tr key={manager.id} className="transition hover:bg-[#FDFBFF]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EEE7FF] font-semibold text-[#6d4de6]">
                            {manager.image_url ? (
                              <img src={manager.image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              String(manager.name || 'M')[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-[#2d1b4a]">{manager.name}</div>
                            <div className="text-xs text-[#7a6794]">@{manager.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[#2d1b4a]">{manager.email || '—'}</div>
                        <div className="text-xs text-[#7a6794]">{manager.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate">
                        {manager.address || <span className="text-gray-400 italic">No address</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleActive(manager)}
                          disabled={actionLoadingId === manager.id}
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                            manager.active 
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          }`}
                        >
                          {actionLoadingId === manager.id ? 'Updating...' : manager.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(manager)}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2efff] text-[#6d4de6] transition hover:bg-[#e6e0ff] shadow-sm"
                            title="Edit Manager"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleResetPassword(manager)}
                            disabled={isResetting || actionLoadingId === manager.id}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f9ff] text-sky-600 transition hover:bg-[#e0f2fe] shadow-sm disabled:opacity-50"
                            title="Reset Password"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(manager)}
                            disabled={actionLoadingId === manager.id}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0f3] text-rose-600 transition hover:bg-[#ffe4e9] shadow-sm disabled:opacity-50"
                            title="Delete Manager"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2d1b4a]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-[#EEE7FF] bg-[#F8F5FF] px-6 py-4">
              <h3 className="text-xl font-bold text-[#2d1b4a]">
                {modalMode === 'add' ? 'Create Manager Profile' : 'Edit Manager Profile'}
              </h3>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#57476e]">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#6d4de6] focus:ring-2 focus:ring-[#6d4de6]/20 ${formErrors.name ? 'border-rose-300 bg-rose-50' : 'border-[#DDD6FE]'}`}
                    placeholder="e.g. John Doe"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-rose-500">{formErrors.name}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#57476e]">Email Address *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#6d4de6] focus:ring-2 focus:ring-[#6d4de6]/20 ${formErrors.email ? 'border-rose-300 bg-rose-50' : 'border-[#DDD6FE]'}`}
                      placeholder="manager@example.com"
                    />
                    {formErrors.email && <p className="mt-1 text-xs text-rose-500">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#57476e]">Contact Number *</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#6d4de6] focus:ring-2 focus:ring-[#6d4de6]/20 ${formErrors.phone ? 'border-rose-300 bg-rose-50' : 'border-[#DDD6FE]'}`}
                      placeholder="09XXXXXXXXX"
                    />
                    {formErrors.phone && <p className="mt-1 text-xs text-rose-500">{formErrors.phone}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#57476e]">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD6FE] px-4 py-3 text-sm outline-none transition focus:border-[#6d4de6] focus:ring-2 focus:ring-[#6d4de6]/20"
                    placeholder="Full residential address"
                  />
                </div>

                <div className="rounded-xl border border-[#EEE7FF] bg-[#F8F5FF] p-4">
                  <label className="mb-1 block text-sm font-medium text-[#57476e]">
                    Password {modalMode === 'add' ? '*' : '(Leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#6d4de6] focus:ring-2 focus:ring-[#6d4de6]/20 ${formErrors.password ? 'border-rose-300 bg-rose-50' : 'border-white'}`}
                    placeholder={modalMode === 'add' ? 'Set a secure password' : 'Enter new password...'}
                  />
                  {formErrors.password && <p className="mt-1 text-xs text-rose-500">{formErrors.password}</p>}
                  {modalMode === 'add' && !formErrors.password && (
                    <p className="mt-1 text-xs text-[#7a6794]">Minimum 6 characters. They will use their email to login.</p>
                  )}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="rounded-xl border border-[#DDD6FE] px-5 py-2.5 text-sm font-semibold text-[#57476e] transition hover:bg-[#F8F5FF] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-[#6d4de6] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b3cc4] disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : modalMode === 'add' ? 'Create Profile' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Result Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2d1b4a]/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-md overflow-hidden rounded-[32px] bg-white p-8 shadow-2xl">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#2d1b4a]">Password Reset!</h3>
              <p className="mt-2 text-[#7a6794]">
                A temporary password has been generated for <span className="font-semibold text-[#6d4de6]">{resetManager?.name}</span>.
              </p>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-[#DDD6FE] bg-[#F8F5FF] p-6 text-center">
              <p className="text-xs uppercase tracking-widest text-[#7a6794]">Temporary Password</p>
              <div className="mt-2 flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-bold tracking-wider text-[#6d4de6]">{tempPassword}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword)
                    toast.info('Password copied to clipboard!')
                  }}
                  className="rounded-lg bg-white p-2 text-[#6d4de6] shadow-sm hover:bg-[#F0EBFF]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-8 space-y-4 text-center text-sm text-[#7a6794]">
              <p>Please share this temporary password with the manager. They should change it after logging in.</p>
              <button
                onClick={() => setResetModalOpen(false)}
                className="w-full rounded-2xl bg-[#6d4de6] py-4 font-bold text-white shadow-lg shadow-[#6d4de6]/20 transition hover:bg-[#5b3cc4] hover:shadow-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminManagers
