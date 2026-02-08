import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const ManageManagers = () => {
  const [managers, setManagers] = useState([])
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    active: true,
  })
  const navigate = useNavigate()

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      const res = await api.get('/managers')
      setManagers(res.data)
    } catch (e) {
      toast.error('Failed to load managers')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.username) {
      toast.error('Name and username are required')
      return
    }

    if (!editing && !formData.password) {
      toast.error('Password is required for new manager')
      return
    }

    try {
      const payload = {
        name: formData.name,
        username: formData.username,
        active: formData.active ? '1' : '0',
      }
      if (formData.password) {
        payload.password = formData.password
      }

      if (editing) {
        await api.patch(`/managers/${editing.id}`, payload)
        toast.success('Manager updated successfully')
      } else {
        await api.post('/managers', payload)
        toast.success('Manager created successfully')
      }

      setEditing(null)
      setFormData({
        name: '',
        username: '',
        password: '',
        active: true,
      })
      refreshData()
    } catch (e) {
      const message = e.response?.data?.message || 'Failed to save manager'
      toast.error(message)
    }
  }

  const handleEdit = (manager) => {
    setEditing(manager)
    setFormData({
      name: manager.name || '',
      username: manager.username || '',
      password: '',
      active: manager.active,
    })
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate('/login/admin')
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row text-gray-800">
      <Sidebar userType="admin" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">Manage Managers</h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ← Return to Dashboard
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold mb-4">{editing ? 'Edit' : 'Add'} Manager</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password {!editing && '*'} {editing && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    value={formData.password}
                    placeholder={editing ? '••••••••' : 'Enter password (min 6 characters)'}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={formData.active ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editing ? 'Update' : 'Create'} Manager
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null)
                      setFormData({
                        name: '',
                        username: '',
                        password: '',
                        active: true,
                      })
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-xl font-semibold mb-4">All Managers ({managers.length})</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {managers.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-400">
                  No managers yet. Create your first manager above.
                </div>
              ) : (
                managers.map((m) => (
                  <div key={m.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{m.name}</div>
                      {!m.active && (
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">@{m.username}</div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleEdit(m)}
                        className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      >
                        Edit
                      </button>
                      {m.active ? (
                        <button
                          onClick={async () => {
                            try {
                              await api.patch(`/managers/${m.id}`, { active: '0' })
                              toast.success('Manager deactivated')
                              refreshData()
                            } catch (e) {
                              toast.error('Failed to deactivate manager')
                            }
                          }}
                          className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              await api.patch(`/managers/${m.id}`, { active: '1' })
                              toast.success('Manager activated')
                              refreshData()
                            } catch (e) {
                              toast.error('Failed to activate manager')
                            }
                          }}
                          className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete ${m.name}?`)) {
                            return
                          }
                          try {
                            await api.delete(`/managers/${m.id}`)
                            toast.success('Manager deleted')
                            refreshData()
                          } catch (e) {
                            toast.error('Failed to delete manager')
                          }
                        }}
                        className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ManageManagers

