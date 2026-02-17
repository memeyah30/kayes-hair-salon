import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

// Time picker component with dropdowns
const TimePicker = ({ value, onChange, disabled = false, label = '' }) => {
  // Parse time value (HH:MM format)
  const [hour, minute] = value ? value.split(':').map(Number) : [8, 0]
  
  const handleHourChange = (e) => {
    const newHour = parseInt(e.target.value)
    const newTime = `${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    onChange(newTime)
  }
  
  const handleMinuteChange = (e) => {
    const newMinute = parseInt(e.target.value)
    const newTime = `${String(hour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`
    onChange(newTime)
  }
  
  // Generate hour options (8 AM to 8 PM = 8 to 20)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8) // 8 to 20
  const minutes = [0, 15, 30, 45] // Common minute intervals
  
  // Format for display (12-hour format)
  const displayTime = () => {
    if (!value) return '--:--'
    const h = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    return `${h}:${String(minute).padStart(2, '0')} ${ampm}`
  }
  
  return (
    <div className="flex items-center gap-1">
      <select
        value={hour}
        onChange={handleHourChange}
        disabled={disabled}
        className="border rounded px-2 py-1 text-sm w-16"
        style={{ 
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        {hours.map(h => (
          <option key={h} value={h}>
            {h > 12 ? h - 12 : (h === 0 ? 12 : h)} {h >= 12 ? 'PM' : 'AM'}
          </option>
        ))}
      </select>
      <span className="text-[#9b857a]">:</span>
      <select
        value={minute}
        onChange={handleMinuteChange}
        disabled={disabled}
        className="border rounded px-2 py-1 text-sm w-16"
        style={{ 
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        {minutes.map(m => (
          <option key={m} value={m}>
            {String(m).padStart(2, '0')}
          </option>
        ))}
      </select>
      {label && <span className="text-xs text-[#9b857a] ml-1">{label}</span>}
    </div>
  )
}

// Validation helpers
const validateEmail = (email) => {
  if (!email) return { valid: true, message: '' } // Optional
  if (!email.endsWith('@gmail.com')) {
    return { valid: false, message: 'Email must end with @gmail.com' }
  }
  const emailRegex = /^[^\s@]+@gmail\.com$/
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Please enter a valid Gmail address' }
  }
  return { valid: true, message: '' }
}

const validatePhone = (phone) => {
  if (!phone) return { valid: true, message: '' } // Optional
  // Philippine phone number format: starts with 09 or +639, followed by 9 digits
  const phoneRegex = /^(\+639|09)\d{9}$/
  const cleanPhone = phone.replace(/[\s-]/g, '')
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, message: 'Phone must be valid PH number (e.g., 09171234567 or +639171234567)' }
  }
  return { valid: true, message: '' }
}

const ManageStylists = () => {
  const [stylists, setStylists] = useState([])
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
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
  const [formErrors, setFormErrors] = useState({ email: '', phone: '' })
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
      console.log('Refreshed stylists:', res.data) // Debug log
      setStylists(res.data)
    } catch (e) {
      toast.error('Failed to load stylists')
      console.error('Refresh error:', e)
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
    
    // Validate email and phone before submission
    const emailValidation = validateEmail(formData.email)
    const phoneValidation = validatePhone(formData.phone)
    
    setFormErrors({
      email: emailValidation.message,
      phone: phoneValidation.message
    })
    
    if (!emailValidation.valid || !phoneValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }
    
    // For creating new stylist, require email for login
    if (!editing && !formData.email) {
      toast.error('Email is required to create a stylist account')
      setFormErrors(prev => ({ ...prev, email: 'Email is required for stylist login' }))
      return
    }
    
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('email', formData.email)
      data.append('phone', formData.phone.replace(/[\s-]/g, '')) // Clean phone number
      if (formData.password) {
        data.append('password', formData.password)
      }
      data.append('active', formData.active ? '1' : '0') // Convert boolean to string for FormData
      // Only send enabled working hours
      const enabledHours = formData.working_hours
        .filter(wh => wh.enabled)
        .map(wh => ({ weekday: wh.weekday, start_time: wh.start_time, end_time: wh.end_time }))
      data.append('working_hours', JSON.stringify(enabledHours))
      if (formData.image) {
        data.append('image', formData.image)
      }

      const wasEditing = editing
      const editingId = editing?.id

      if (editing) {
        // Use POST with _method=PATCH for FormData compatibility with Laravel
        data.append('_method', 'PATCH')
        const response = await api.post(`/stylists/${editing.id}`, data, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          }
        })
        
        console.log('Stylist update response:', response.data) // Debug log
        
        toast.success('Stylist updated successfully')
        
        // Immediately update the stylist in the list with the response data
        setStylists(prevStylists => {
          const updated = prevStylists.map(s => {
            if (s.id === editingId) {
              return { ...s, ...response.data }
            }
            return s
          })
          console.log('Updated stylists list:', updated) // Debug log
          return updated
        })
      } else {
        await api.post('/stylists', data)
        toast.success('Stylist created')
      }

      setEditing(null)
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        password: '',
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
      setFormErrors({ email: '', phone: '' })
      setImagePreview(null)
      setTimeOffs([])
      
      // Refresh data to ensure everything is up to date
      if (wasEditing) {
        // For updates, refresh after a delay to ensure backend has processed
        setTimeout(() => {
          refreshData()
        }, 1000)
      } else {
        // For creates, refresh immediately
      refreshData()
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save stylist')
    }
  }

  const handleEdit = (stylist) => {
    setEditing(stylist)
    setFormErrors({ email: '', phone: '' })
    
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
      active: stylist.active,
      image: null,
      working_hours: defaultHours,
    })
    setImagePreview(stylist.image ? `http://localhost:8000/${stylist.image}` : null)
  }

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f7f1ec] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="admin" />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-bold"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <h1 className="text-2xl font-bold">Manage Stylists</h1>
            </div>
          </div>

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-6">
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
              <label className="block text-sm font-medium mb-1">Email * (must be @gmail.com)</label>
              <input
                type="email"
                className={`w-full border rounded px-3 py-2 ${formErrors.email ? 'border-red-500' : ''}`}
                value={formData.email}
                placeholder="stylist@gmail.com"
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value })
                  const validation = validateEmail(e.target.value)
                  setFormErrors(prev => ({ ...prev, email: validation.message }))
                }}
              />
              {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone (Philippine format)</label>
              <input
                type="text"
                className={`w-full border rounded px-3 py-2 ${formErrors.phone ? 'border-red-500' : ''}`}
                value={formData.phone}
                placeholder="09171234567 or +639171234567"
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value })
                  const validation = validatePhone(e.target.value)
                  setFormErrors(prev => ({ ...prev, phone: validation.message }))
                }}
              />
              {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Password {!editing && '*'} {editing && '(leave blank to keep current)'}
              </label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2"
                value={formData.password}
                placeholder={editing ? '********' : 'Enter password (min 6 characters)'}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {!editing && <p className="text-[#9b857a] text-xs mt-1">Default: stylist123 if left blank</p>}
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
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-3">Weekly Schedule</h3>
              
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-[#8f7a6f] self-center mr-2">Quick Actions:</span>
                <button
                  type="button"
                  onClick={() => {
                    const start = '08:00'
                    const end = '20:00'
                    const updated = formData.working_hours.map(wh => ({
                      ...wh,
                      enabled: true,
                      start_time: start,
                      end_time: end
                    }))
                    setFormData({ ...formData, working_hours: updated })
                    toast.info('Set all days to 8:00 AM - 8:00 PM')
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  Set All Days (8 AM - 8 PM)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const start = '08:00'
                    const end = '20:00'
                    const updated = formData.working_hours.map(wh => ({
                      ...wh,
                      enabled: [1, 2, 3, 4, 5].includes(wh.weekday), // Mon-Fri
                      start_time: start,
                      end_time: end
                    }))
                    setFormData({ ...formData, working_hours: updated })
                    toast.info('Set weekdays (Mon-Fri) to 8:00 AM - 8:00 PM')
                  }}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                >
                  Set Weekdays Only
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = formData.working_hours.map(wh => ({
                      ...wh,
                      enabled: false
                    }))
                    setFormData({ ...formData, working_hours: updated })
                    toast.info('Disabled all days')
                  }}
                  className="px-3 py-1 bg-[#f7f1ec] text-gray-700 rounded text-sm hover:bg-gray-200"
                >
                  Clear All
                </button>
              </div>

              {/* Bulk Time Set */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">Apply to selected days:</span>
                    <TimePicker
                      value={formData.working_hours.find(wh => wh.enabled)?.start_time || '08:00'}
                      onChange={(start) => {
                        const end = formData.working_hours.find(wh => wh.enabled)?.end_time || '20:00'
                        const enabledDays = formData.working_hours.filter(wh => wh.enabled).map(wh => wh.weekday)
                        if (enabledDays.length === 0) {
                          toast.warn('Please enable at least one day first')
                          return
                        }
                        const updated = formData.working_hours.map(wh => 
                          enabledDays.includes(wh.weekday) ? { ...wh, start_time: start, end_time: end } : wh
                        )
                        setFormData({ ...formData, working_hours: updated })
                      }}
                      label="Start"
                    />
                    <span className="text-[#8f7a6f]">to</span>
                    <TimePicker
                      value={formData.working_hours.find(wh => wh.enabled)?.end_time || '20:00'}
                      onChange={(end) => {
                        const start = formData.working_hours.find(wh => wh.enabled)?.start_time || '08:00'
                        const enabledDays = formData.working_hours.filter(wh => wh.enabled).map(wh => wh.weekday)
                        if (enabledDays.length === 0) {
                          toast.warn('Please enable at least one day first')
                          return
                        }
                        const updated = formData.working_hours.map(wh => 
                          enabledDays.includes(wh.weekday) ? { ...wh, start_time: start, end_time: end } : wh
                        )
                        setFormData({ ...formData, working_hours: updated })
                      }}
                      label="End"
                />
                    <span className="text-xs text-[#9b857a]">(Updates all enabled days)</span>
                  </div>
                  
                  {/* Preset Time Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <span className="text-xs text-[#8f7a6f] self-center">Presets:</span>
                    {[
                      { label: '8 AM - 5 PM', start: '08:00', end: '17:00' },
                      { label: '8 AM - 8 PM', start: '08:00', end: '20:00' },
                      { label: '9 AM - 5 PM', start: '09:00', end: '17:00' },
                      { label: '9 AM - 6 PM', start: '09:00', end: '18:00' },
                      { label: '10 AM - 7 PM', start: '10:00', end: '19:00' },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const enabledDays = formData.working_hours.filter(wh => wh.enabled).map(wh => wh.weekday)
                          if (enabledDays.length === 0) {
                            toast.warn('Please enable at least one day first')
                            return
                          }
                          const updated = formData.working_hours.map(wh => 
                            enabledDays.includes(wh.weekday) 
                              ? { ...wh, start_time: preset.start, end_time: preset.end } 
                              : wh
                          )
                          setFormData({ ...formData, working_hours: updated })
                          toast.info(`Set to ${preset.label}`)
                        }}
                        className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="bg-[#f7f1ec]">
                    <th className="border p-2 text-left font-semibold">Day</th>
                    <th className="border p-2 text-center font-semibold">Available</th>
                    <th className="border p-2 text-center font-semibold">Start Time</th>
                    <th className="border p-2 text-center font-semibold">End Time</th>
                    <th className="border p-2 text-center font-semibold">Hours</th>
                  </tr>
                </thead>
                <tbody>
              {WEEKDAYS.map(day => {
                const daySchedule = formData.working_hours.find(wh => wh.weekday === day.value)
                    const isEnabled = daySchedule?.enabled || false
                    const startTime = daySchedule?.start_time || '08:00'
                    const endTime = daySchedule?.end_time || '20:00'
                    
                    // Calculate hours
                    const start = new Date(`2000-01-01T${startTime}`)
                    const end = new Date(`2000-01-01T${endTime}`)
                    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(1)
                    
                return (
                      <tr 
                        key={day.value} 
                        className={`hover:bg-gray-50 transition ${isEnabled ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="border p-3 font-medium">
                          <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                              checked={isEnabled}
                        onChange={() => toggleDayEnabled(day.value)}
                        className="w-4 h-4 rounded"
                      />
                            <span>{day.label}</span>
                      </label>
                        </td>
                        <td className="border p-3 text-center">
                          <span className={`px-3 py-1 rounded text-sm font-medium ${
                            isEnabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-200 text-[#8f7a6f]'
                          }`}>
                            {isEnabled ? 'Working' : 'Day Off'}
                          </span>
                        </td>
                        <td className="border p-3">
                          <TimePicker
                            value={startTime}
                            onChange={(newTime) => updateDaySchedule(day.value, 'start_time', newTime)}
                            disabled={!isEnabled}
                          />
                        </td>
                        <td className="border p-3">
                          <TimePicker
                            value={endTime}
                            onChange={(newTime) => updateDaySchedule(day.value, 'end_time', newTime)}
                            disabled={!isEnabled}
                        />
                        </td>
                        <td className="border p-3 text-center text-sm text-[#8f7a6f]">
                          {isEnabled ? `${hours} hrs` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="mt-3 text-xs text-[#9b857a]">
              Tip: Check the day box to enable it, then set the times. Use Quick Actions for common schedules.
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
                  setFormErrors({ email: '', phone: '' })
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
        <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-6">
          <h2 className="text-xl font-semibold mb-4">Days Off / Time Off</h2>
          <p className="text-sm text-[#8f7a6f] mb-4">Add specific dates when this stylist will be unavailable</p>
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
              <div className="text-center py-4 text-[#9b857a] text-sm">No days off scheduled</div>
            ) : (
              timeOffs.map((to, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="text-sm font-medium">
                      {new Date(to.start_datetime).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}
                    </span>
                    <span className="text-sm text-[#8f7a6f] ml-2">
                      {new Date(to.start_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} - {new Date(to.end_datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} PHT
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

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
        <h2 className="text-xl font-semibold mb-4">All Stylists ({stylists.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              No stylists yet. Create your first stylist above.
            </div>
          ) : (
            stylists.map(s => (
              <div key={s.id} className="border rounded-lg p-4 hover:shadow-md transition">
                {s.image ? (
                <img
                    key={`${s.id}-${s.image}`}
                    src={`http://localhost:8000/${s.image}?v=${Date.now()}`}
                  alt={s.name}
                  className="w-full h-32 object-cover rounded mb-2"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                />
                ) : (
                  <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-400 text-sm rounded mb-2">
                    No Image
                  </div>
              )}
                <div className="flex items-center gap-2">
              <div className="font-semibold">{s.name}</div>
                  {!s.active && (
                    <span className="text-xs bg-gray-200 text-[#8f7a6f] px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
              <div className="text-sm text-[#8f7a6f]">{s.email}</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleEdit(s)}
                  className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
                {s.active ? (
                  <button
                    onClick={async () => {
                      try {
                        const data = new FormData()
                        data.append('active', '0')
                        data.append('_method', 'PATCH')
                        const response = await api.post(`/stylists/${s.id}`, data, {
                          headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                          }
                        })
                        toast.success('Stylist deactivated successfully')
                        // Update immediately
                        setStylists(prevStylists => 
                          prevStylists.map(st => st.id === s.id ? { ...st, ...response.data } : st)
                        )
                        // Refresh after delay
                        setTimeout(() => refreshData(), 500)
                      } catch (e) {
                        toast.error('Failed to deactivate stylist')
                      }
                    }}
                    className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-200"
                    title="Deactivate stylist (hides from booking but keeps appointment history)"
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const data = new FormData()
                        data.append('active', '1')
                        data.append('_method', 'PATCH')
                        const response = await api.post(`/stylists/${s.id}`, data, {
                          headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                          }
                        })
                        toast.success('Stylist activated successfully')
                        // Update immediately
                        setStylists(prevStylists => 
                          prevStylists.map(st => st.id === s.id ? { ...st, ...response.data } : st)
                        )
                        // Refresh after delay
                        setTimeout(() => refreshData(), 500)
                      } catch (e) {
                        toast.error('Failed to activate stylist')
                      }
                    }}
                    className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                    title="Activate stylist"
                  >
                    Activate
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (!window.confirm(`Are you sure you want to delete ${s.name}? This action cannot be undone.`)) {
                      return
                    }
                    try {
                      await api.delete(`/stylists/${s.id}`)
                      toast.success('Stylist deleted successfully')
                      refreshData()
                    } catch (e) {
                      const errorData = e.response?.data
                      const message = errorData?.message || 'Failed to delete stylist'
                      const appointmentCount = errorData?.appointment_count
                      
                      if (appointmentCount) {
                        const shouldDeactivate = window.confirm(
                          `${message}\n\nThis stylist has ${appointmentCount} appointment(s). Would you like to deactivate them instead?`
                        )
                        if (shouldDeactivate) {
                          try {
                            const data = new FormData()
                            data.append('active', '0')
                            data.append('_method', 'PATCH')
                            const response = await api.post(`/stylists/${s.id}`, data, {
                              headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                              }
                            })
                            toast.success('Stylist deactivated successfully')
                            setStylists(prevStylists => 
                              prevStylists.map(st => st.id === s.id ? { ...st, ...response.data } : st)
                            )
                            setTimeout(() => refreshData(), 500)
                          } catch (deactivateError) {
                            toast.error('Failed to deactivate stylist')
                          }
                        }
                      } else {
                        toast.error(message)
                      }
                    }
                  }}
                  className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  title="Permanently delete stylist (only if no appointments exist)"
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

export default ManageStylists




