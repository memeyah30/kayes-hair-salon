import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import AdminLayout from '../../components/AdminLayout'

const ManagerProfiles = () => {
  const [managers, setManagers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedManager, setSelectedManager] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const navigate = useNavigate()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  const loadManagers = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/managers')
      const nextManagers = Array.isArray(data) ? data : []
      setManagers(nextManagers)
      setSelectedManager((prev) => {
        if (!prev) return nextManagers[0] || null
        return nextManagers.find((manager) => String(manager.id) === String(prev.id)) || nextManagers[0] || null
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load managers.')
      setManagers([])
      setSelectedManager(null)
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
      const username = String(manager?.username || '').toLowerCase()
      const active = manager?.active ? 'active' : 'inactive'
      return name.includes(query) || username.includes(query) || active.includes(query)
    })
  }, [managers, searchTerm])

  useEffect(() => {
    if (!selectedManager && filteredManagers.length > 0) {
      setSelectedManager(filteredManagers[0])
    }
  }, [filteredManagers, selectedManager])

  const handleToggleActive = async (manager) => {
    try {
      setActionLoadingId(manager.id)
      await api.patch(`/managers/${manager.id}`, { active: !manager.active })
      toast.success(`Manager ${manager.active ? 'deactivated' : 'activated'}.`)
      await loadManagers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update manager.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (manager) => {
    const confirmed = window.confirm(`Delete manager "${manager.name}"?`)
    if (!confirmed) return

    try {
      setActionLoadingId(manager.id)
      await api.delete(`/managers/${manager.id}`)
      toast.success('Manager deleted.')
      await loadManagers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete manager.')
    } finally {
      setActionLoadingId(null)
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
      subtitle="View and maintain the admin-managed manager accounts."
      userType={storedUserType}
      onLogout={handleLogout}
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_40px_rgba(59,31,114,0.12)] backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#2d1b4a]">Manager accounts</h2>
              <p className="text-sm text-[#7a6794]">Search, activate, or remove manager profiles.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search managers..."
                  className="w-full rounded-xl border border-[#DDD6FE] bg-white px-4 py-3 pl-11 text-sm text-[#2d1b4a] outline-none transition focus:border-[#8b5cf6]"
                />
                <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b6fc1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 20l-3.5-3.5" />
                </svg>
              </div>
              <button
                type="button"
                onClick={loadManagers}
                className="rounded-xl bg-[#7b5cf5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#6747e8]"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-[24px] border border-white/40 bg-white/80 shadow-[0_18px_40px_rgba(59,31,114,0.12)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[#EEE7FF] px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-[#2d1b4a]">Manager list</p>
                <p className="text-xs text-[#7a6794]">{filteredManagers.length} manager(s) shown</p>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-sm text-[#7a6794]">Loading managers...</div>
            ) : filteredManagers.length === 0 ? (
              <div className="p-8 text-sm text-[#7a6794]">No managers found.</div>
            ) : (
              <div className="divide-y divide-[#EEE7FF]">
                {filteredManagers.map((manager) => {
                  const isSelected = selectedManager?.id === manager.id
                  const isBusy = actionLoadingId === manager.id
                  return (
                    <button
                      key={manager.id}
                      type="button"
                      onClick={() => setSelectedManager(manager)}
                      className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-[#F8F5FF] ${
                        isSelected ? 'bg-[#F3EDFF]' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#EEE7FF] text-sm font-semibold text-[#6d4de6]">
                          {manager.image_url ? (
                            <img src={manager.image_url} alt={manager.name} className="h-full w-full object-cover" />
                          ) : (
                            String(manager?.name || 'M').slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-[#2d1b4a]">{manager.name}</div>
                          <div className="text-sm text-[#7a6794]">@{manager.username}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${manager.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {manager.active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-[#7a6794]">{isBusy ? 'Working...' : 'Select'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-white/40 bg-white/80 p-5 shadow-[0_18px_40px_rgba(59,31,114,0.12)] backdrop-blur-md">
            <p className="text-sm font-semibold text-[#2d1b4a]">Profile details</p>
            {selectedManager ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#EEE7FF] text-lg font-semibold text-[#6d4de6]">
                    {selectedManager.image_url ? (
                      <img src={selectedManager.image_url} alt={selectedManager.name} className="h-full w-full object-cover" />
                    ) : (
                      String(selectedManager?.name || 'M').slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#2d1b4a]">{selectedManager.name}</h3>
                    <p className="text-sm text-[#7a6794]">@{selectedManager.username}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#EEE7FF] bg-[#FCFBFF] p-4 text-sm text-[#57476e]">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#7a6794]">Status</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedManager.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {selectedManager.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#7a6794]">Name</span>
                    <span className="font-medium text-[#2d1b4a]">{selectedManager.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-[#7a6794]">Username</span>
                    <span className="font-medium text-[#2d1b4a]">{selectedManager.username}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(selectedManager)}
                    disabled={actionLoadingId === selectedManager.id}
                    className="rounded-xl bg-[#7b5cf5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#6747e8] disabled:cursor-not-allowed disabled:bg-[#b9acef]"
                  >
                    {selectedManager.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedManager)}
                    disabled={actionLoadingId === selectedManager.id}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-[#7a6794]">Select a manager to see the profile details.</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ManagerProfiles
