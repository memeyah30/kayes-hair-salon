import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const SPECIALIZATION_OPTIONS = [
  'Haircuts',
  'Hair Color',
  'Manicure',
  'Pedicure',
  'Nail Extension',
  'Rebonding'
]

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const ManageStylists = () => {
  const [stylists, setStylists] = useState([])
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    specializations: [],
    active: true,
    image: null,
    working_hours: [
      { weekday: 0, enabled: false, start_time: '09:00', end_time: '17:00' }, // Sunday
      { weekday: 1, enabled: false, start_time: '09:00', end_time: '17:00' }, // Monday
      { weekday: 2, enabled: false, start_time: '09:00', end_time: '17:00' }, // Tuesday
      { weekday: 3, enabled: false, start_time: '09:00', end_time: '17:00' }, // Wednesday
      { weekday: 4, enabled: false, start_time: '09:00', end_time: '17:00' }, // Thursday
      { weekday: 5, enabled: false, start_time: '09:00', end_time: '17:00' }, // Friday
      { weekday: 6, enabled: false, start_time: '09:00', end_time: '17:00' }, // Saturday
    ],
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [timeOffs, setTimeOffs] = useState([])
  const [newTimeOff, setNewTimeOff] = useState({ start_datetime: '', end_datetime: '' })

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    if (editing) {
      loadTimeOffs(editing.id)
    }
  }, [editing])

  const refreshData = async () => {
    try {
      const res = await api.get('/stylists')
      setStylists(res.data)
    } catch (e) {
      toast.error('Failed to load stylists')
    }
  }

  const loadTimeOffs = async (stylistId) => {
    try {
      const res = await api.get(`/stylists/${stylistId}`)
      setTimeOffs(res.data.time_offs || res.data.timeOffs || [])
    } catch (e) {
      console.error('Failed to load time offs', e)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSpecializationToggle = (spec) => {
    const current = formData.specializations
    if (current.includes(spec)) {
      setFormData({ ...formData, specializations: current.filter(s => s !== spec) })
    } else {
      setFormData({ ...formData, specializations: [...current, spec] })
    }
  }

  const toggleDayEnabled = (weekday) => {
    const updated = formData.working_hours.map(wh => 
      wh.weekday === weekday ? { ...wh, enabled: !wh.enabled } : wh
    )
    setFormData({ ...formData, working_hours: updated })
  }

  const updateDaySchedule = (weekday, field, value) => {
    const updated = formData.working_hours.map(wh => 
      wh.weekday === weekday ? { ...wh, [field]: value } : wh
    )
    setFormData({ ...formData, working_hours: updated })
  }

  const setAllDaysSameTime = (startTime, endTime) => {
    const updated = formData.working_hours.map(wh => ({
      ...wh,
      start_time: startTime,
      end_time: endTime
    }))
    setFormData({ ...formData, working_hours: updated })
  }

  const addTimeOff = async () => {
    if (!editing || !newTimeOff.start_datetime || !newTimeOff.end_datetime) {
      toast.warn('Please fill in both start and end dates')
      return
    }
    try {
      await api.post(`/stylists/${editing.id}/time-offs`, newTimeOff)
      toast.success('Time off added')
      setNewTimeOff({ start_datetime: '', end_datetime: '' })
      loadTimeOffs(editing.id)
    } catch (e) {
      toast.error('Failed to add time off')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('email', formData.email)
      data.append('phone', formData.phone)
      if (formData.password) {
        data.append('password', formData.password)
      }
      data.append('specializations', JSON.stringify(formData.specializations))
      data.append('active', formData.active ? '1' : '0') // Convert boolean to string for FormData
      // Only send enabled working hours
      const enabledHours = formData.working_hours
        .filter(wh => wh.enabled)
        .map(wh => ({ weekday: wh.weekday, start_time: wh.start_time, end_time: wh.end_time }))
      data.append('working_hours', JSON.stringify(enabledHours))
      if (formData.image) {
        data.append('image', formData.image)
      }

      if (editing) {
        await api.patch(`/stylists/${editing.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Stylist updated')
      } else {
        await api.post('/stylists', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Stylist created')
      }

      setEditing(null)
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        password: '',
        specializations: [], 
        active: true, 
        image: null, 
        working_hours: [
          { weekday: 0, enabled: false, start_time: '09:00', end_time: '17:00' },
          { weekday: 1, enabled: false, start_time: '09:00', end_time: '17:00' },
          { weekday: 2, enabled: false, start_time: '09:00', end_time: '17:00' },
          { weekday: 3, enabled: false, start_time: '09:00', end_time: '17:00' },
          { weekday: 4, enabled: false, start_time: '09:00', end_time: '17:00' },
          { weekday: 5, enabled: false, start_time: '09:00', end_time: '17:00' },
          { weekday: 6, enabled: false, start_time: '09:00', end_time: '17:00' },
        ]
      })
      setImagePreview(null)
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save stylist')
    }
  }

  const handleEdit = (stylist) => {
    setEditing(stylist)
    
    // Convert existing working hours to new format
    const defaultHours = [
      { weekday: 0, enabled: false, start_time: '09:00', end_time: '17:00' },
      { weekday: 1, enabled: false, start_time: '09:00', end_time: '17:00' },
      { weekday: 2, enabled: false, start_time: '09:00', end_time: '17:00' },
      { weekday: 3, enabled: false, start_time: '09:00', end_time: '17:00' },
      { weekday: 4, enabled: false, start_time: '09:00', end_time: '17:00' },
      { weekday: 5, enabled: false, start_time: '09:00', end_time: '17:00' },
      { weekday: 6, enabled: false, start_time: '09:00', end_time: '17:00' },
    ]
    
    if (stylist.working_hours && stylist.working_hours.length > 0) {
      stylist.working_hours.forEach(wh => {
        const day = defaultHours.find(d => d.weekday === wh.weekday)
        if (day) {
          day.enabled = true
          day.start_time = wh.start_time
          day.end_time = wh.end_time
        }
      })
    }
    
    setFormData({
      name: stylist.name,
      email: stylist.email || '',
      phone: stylist.phone || '',
      password: '', // Don't populate password when editing
      specializations: stylist.specializations || [],
      active: stylist.active,
      image: null,
      working_hours: defaultHours,
    })
    setImagePreview(stylist.image ? `http://localhost:8000/${stylist.image}` : null)
  }

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-100 flex text-gray-800">
      <Sidebar userType="admin" />
      <main className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Manage Stylists</h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ← Return to Dashboard
            </button>
          </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{editing ? 'Edit' : 'Add'} Stylist</h2>
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
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded px-3 py-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Image</label>
              <input
                type="file"
                accept="image/*"
                className="w-full border rounded px-3 py-2"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 h-32 object-cover rounded" />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Specializations *</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {SPECIALIZATION_OPTIONS.map(spec => (
                  <label key={spec} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.specializations.includes(spec)}
                      onChange={() => handleSpecializationToggle(spec)}
                      className="rounded"
                    />
                    <span className="text-sm">{spec}</span>
                  </label>
                ))}
              </div>
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

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Weekly Schedule</h3>
              <div className="flex gap-2">
                <input
                  type="time"
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Start"
                  onChange={(e) => {
                    const start = e.target.value
                    const end = formData.working_hours.find(wh => wh.enabled)?.end_time || '17:00'
                    setAllDaysSameTime(start, end)
                  }}
                />
                <span className="self-center">to</span>
                <input
                  type="time"
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="End"
                  onChange={(e) => {
                    const end = e.target.value
                    const start = formData.working_hours.find(wh => wh.enabled)?.start_time || '09:00'
                    setAllDaysSameTime(start, end)
                  }}
                />
                <span className="text-xs text-gray-500 self-center">(Apply to all enabled days)</span>
              </div>
            </div>
            <div className="space-y-2">
              {WEEKDAYS.map(day => {
                const daySchedule = formData.working_hours.find(wh => wh.weekday === day.value)
                return (
                  <div key={day.value} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-2 w-32">
                      <input
                        type="checkbox"
                        checked={daySchedule?.enabled || false}
                        onChange={() => toggleDayEnabled(day.value)}
                        className="w-4 h-4 rounded"
                      />
                      <label className="font-medium cursor-pointer" onClick={() => toggleDayEnabled(day.value)}>
                        {day.label}
                      </label>
                    </div>
                    {daySchedule?.enabled && (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          className="border rounded px-3 py-2"
                          value={daySchedule.start_time}
                          onChange={(e) => updateDaySchedule(day.value, 'start_time', e.target.value)}
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          className="border rounded px-3 py-2"
                          value={daySchedule.end_time}
                          onChange={(e) => updateDaySchedule(day.value, 'end_time', e.target.value)}
                        />
                      </div>
                    )}
                    {!daySchedule?.enabled && (
                      <span className="text-sm text-gray-400 italic">Day off</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              {editing ? 'Update' : 'Create'} Stylist
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setFormData({ 
                    name: '', 
                    email: '', 
                    phone: '', 
                    password: '',
                    specializations: [], 
                    active: true, 
                    image: null, 
                    working_hours: [
                      { weekday: 0, enabled: false, start_time: '09:00', end_time: '17:00' },
                      { weekday: 1, enabled: false, start_time: '09:00', end_time: '17:00' },
                      { weekday: 2, enabled: false, start_time: '09:00', end_time: '17:00' },
                      { weekday: 3, enabled: false, start_time: '09:00', end_time: '17:00' },
                      { weekday: 4, enabled: false, start_time: '09:00', end_time: '17:00' },
                      { weekday: 5, enabled: false, start_time: '09:00', end_time: '17:00' },
                      { weekday: 6, enabled: false, start_time: '09:00', end_time: '17:00' },
                    ]
                  })
                  setImagePreview(null)
                  setTimeOffs([])
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {editing && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Days Off / Time Off</h2>
          <p className="text-sm text-gray-600 mb-4">Add specific dates when this stylist will be unavailable</p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                value={newTimeOff.start_datetime}
                onChange={(e) => setNewTimeOff({ ...newTimeOff, start_datetime: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                className="w-full border rounded px-3 py-2"
                value={newTimeOff.end_datetime}
                onChange={(e) => setNewTimeOff({ ...newTimeOff, end_datetime: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={addTimeOff}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
          >
            Add Day Off
          </button>
          <div className="space-y-2">
            {timeOffs.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">No days off scheduled</div>
            ) : (
              timeOffs.map((to, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">
                      {new Date(to.start_datetime).toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {new Date(to.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(to.end_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await api.delete(`/stylists/${editing.id}/time-offs/${to.id}`)
                        toast.success('Day off removed')
                        loadTimeOffs(editing.id)
                      } catch (e) {
                        toast.error('Failed to remove day off')
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-xl font-semibold mb-4">All Stylists</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.map(s => (
            <div key={s.id} className="border rounded-lg p-4">
              {s.image && (
                <img
                  src={`http://localhost:8000/${s.image}`}
                  alt={s.name}
                  className="w-full h-32 object-cover rounded mb-2"
                />
              )}
              <div className="font-semibold">{s.name}</div>
              <div className="text-sm text-gray-600">{s.email}</div>
              <div className="text-xs text-gray-500 mt-1">
                {s.specializations?.join(', ') || 'No specializations'}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(s)}
                  className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
      </main>
    </div>
  )
}

export default ManageStylists
