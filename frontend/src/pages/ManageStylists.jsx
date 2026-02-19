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

const WEEKLY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const getWeekRangeForOffset = (offset) => {
  const now = new Date()
  const today = now.getDay()
  const diffToMonday = today === 0 ? -6 : 1 - today
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() + diffToMonday + (offset * 7))
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const formatWeekRangeLabel = (start, end) => {
  const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startLabel} - ${endLabel}`
}

const getShiftHoursLabel = (workingHour) => {
  if (!workingHour?.enabled) {
    return '--'
  }

  const [startHour, startMinute] = (workingHour.start_time || '00:00').split(':').map(Number)
  const [endHour, endMinute] = (workingHour.end_time || '00:00').split(':').map(Number)
  const durationMinutes = ((endHour * 60) + endMinute) - ((startHour * 60) + startMinute)

  if (durationMinutes <= 0) {
    return '--'
  }

  const hours = durationMinutes / 60
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`
}

// Time picker component with dropdowns
const TimePicker = ({ value, onChange, disabled = false }) => {
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

const buildDefaultWorkingHours = () => [
  { weekday: 0, enabled: false, start_time: '09:00', end_time: '17:00' },
  { weekday: 1, enabled: false, start_time: '09:00', end_time: '17:00' },
  { weekday: 2, enabled: false, start_time: '09:00', end_time: '17:00' },
  { weekday: 3, enabled: false, start_time: '09:00', end_time: '17:00' },
  { weekday: 4, enabled: false, start_time: '09:00', end_time: '17:00' },
  { weekday: 5, enabled: false, start_time: '09:00', end_time: '17:00' },
  { weekday: 6, enabled: false, start_time: '09:00', end_time: '17:00' },
]

const getInitialStylistFormData = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  active: true,
  image: null,
  working_hours: buildDefaultWorkingHours(),
})

const getInitialManagerFormData = () => ({
  name: '',
  username: '',
  password: '',
  active: true,
})

const SCHEDULE_PRESETS = [
  { value: 'mon_fri', label: 'Mon-Fri (9:00 AM - 6:00 PM)', shortLabel: 'Mon-Fri', enabledDays: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' },
  { value: 'tue_sat', label: 'Tue-Sat (9:00 AM - 6:00 PM)', shortLabel: 'Tue-Sat', enabledDays: [2, 3, 4, 5, 6], start: '09:00', end: '18:00' },
  { value: 'wed_sun', label: 'Wed-Sun (9:00 AM - 6:00 PM)', shortLabel: 'Wed-Sun', enabledDays: [0, 3, 4, 5, 6], start: '09:00', end: '18:00' },
  { value: 'all_days', label: 'All 7 Days (9:00 AM - 6:00 PM)', shortLabel: 'All 7 Days', enabledDays: [0, 1, 2, 3, 4, 5, 6], start: '09:00', end: '18:00' },
  { value: 'all_off', label: 'All Off', shortLabel: 'All Off', enabledDays: [], start: '09:00', end: '18:00' },
]

const buildHoursFromPreset = (preset) => {
  const defaults = buildDefaultWorkingHours()
  return defaults.map((day) => {
    const enabled = preset.enabledDays.includes(day.weekday)
    if (!enabled) {
      return { ...day, enabled: false }
    }

    return {
      ...day,
      enabled: true,
      start_time: preset.start,
      end_time: preset.end,
    }
  })
}

const getMatchingSchedulePreset = (workingHours) => {
  if (!Array.isArray(workingHours) || workingHours.length === 0) {
    return ''
  }

  for (const preset of SCHEDULE_PRESETS) {
    const presetHours = buildHoursFromPreset(preset)
    const isMatch = presetHours.every((day) => {
      const current = workingHours.find((item) => item.weekday === day.weekday)
      return (
        Boolean(current?.enabled) === Boolean(day.enabled) &&
        current?.start_time === day.start_time &&
        current?.end_time === day.end_time
      )
    })

    if (isMatch) {
      return preset.value
    }
  }

  return workingHours.some((day) => day.enabled) ? 'custom' : ''
}

const ManageStylists = () => {
  const [stylists, setStylists] = useState([])
  const [managers, setManagers] = useState([])
  const [selectedStaffType, setSelectedStaffType] = useState('')
  const [editing, setEditing] = useState(null)
  const [editingManager, setEditingManager] = useState(null)
  const [schedulePreset, setSchedulePreset] = useState('')
  const [formData, setFormData] = useState(getInitialStylistFormData)
  const [managerFormData, setManagerFormData] = useState(getInitialManagerFormData)
  const [formErrors, setFormErrors] = useState({ email: '', phone: '' })
  const [imagePreview, setImagePreview] = useState(null)
  const [timeOffs, setTimeOffs] = useState([])
  const [newTimeOff, setNewTimeOff] = useState({ start_datetime: '', end_datetime: '' })
  const [viewingStaff, setViewingStaff] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    refreshData()
  }, [])

  useEffect(() => {
    if (editing) {
      loadTimeOffs(editing.id)
    }
  }, [editing])

  const isStylistBaseInfoComplete = Boolean(
    formData.name.trim() &&
    formData.email.trim() &&
    (editing || formData.password.trim()) &&
    !formErrors.email &&
    !formErrors.phone
  )

  const workingDaysCount = formData.working_hours.filter((day) => day.enabled).length
  const dayOffCount = WEEKDAYS.length - workingDaysCount
  const currentWeekRange = getWeekRangeForOffset(weekOffset)
  const currentWeekAbsences = timeOffs.filter((timeOff) => {
    const start = new Date(timeOff.start_datetime)
    return start >= currentWeekRange.start && start <= currentWeekRange.end
  }).length

  const resetStylistForm = () => {
    setEditing(null)
    setFormData(getInitialStylistFormData())
    setSchedulePreset('')
    setWeekOffset(0)
    setFormErrors({ email: '', phone: '' })
    setImagePreview(null)
    setTimeOffs([])
    setNewTimeOff({ start_datetime: '', end_datetime: '' })
  }

  const resetManagerForm = () => {
    setEditingManager(null)
    setManagerFormData(getInitialManagerFormData())
  }

  const handleStaffTypeChange = (nextType) => {
    setSelectedStaffType(nextType)
    if (nextType === 'stylist') {
      resetManagerForm()
    } else if (nextType === 'manager') {
      resetStylistForm()
    } else {
      resetManagerForm()
      resetStylistForm()
    }
  }
  const refreshData = async () => {
    try {
      const [stylistsRes, managersRes] = await Promise.all([
        api.get('/stylists'),
        api.get('/managers'),
      ])
      console.log('Refreshed stylists:', stylistsRes.data) // Debug log
      setStylists(stylistsRes.data || [])
      setManagers(managersRes.data || [])
    } catch (e) {
      toast.error('Failed to load staff records')
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
  const setDayStatus = (weekday, status) => {
    const isWorking = status === 'working'
    setSchedulePreset('custom')
    setFormData((prev) => ({
      ...prev,
      working_hours: prev.working_hours.map((wh) =>
        wh.weekday === weekday ? { ...wh, enabled: isWorking } : wh
      ),
    }))
  }

  const updateDaySchedule = (weekday, field, value) => {
    setSchedulePreset('custom')
    setFormData((prev) => ({
      ...prev,
      working_hours: prev.working_hours.map((wh) =>
        wh.weekday === weekday ? { ...wh, [field]: value } : wh
      ),
    }))
  }

  const applySchedulePreset = (presetValue) => {
    const selectedPreset = SCHEDULE_PRESETS.find((preset) => preset.value === presetValue)
    if (!selectedPreset) {
      return
    }

    setSchedulePreset(selectedPreset.value)
    setFormData((prev) => ({
      ...prev,
      working_hours: buildHoursFromPreset(selectedPreset),
    }))
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

    if (!editing && !schedulePreset) {
      toast.error('Please choose a weekly schedule preset')
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

      resetStylistForm()
      if (!wasEditing) {
        setSelectedStaffType('')
      }
      
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
    setSelectedStaffType('stylist')
    setEditingManager(null)
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
    setSchedulePreset(getMatchingSchedulePreset(defaultHours))
    setWeekOffset(0)
    setImagePreview(stylist.image ? `http://localhost:8000/${stylist.image}` : null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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

    const wasEditingManager = Boolean(editingManager)

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
      if (!wasEditingManager) {
        setSelectedStaffType('')
      }
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save manager')
    }
  }

  const handleEditManager = (manager) => {
    setSelectedStaffType('manager')
    setEditing(null)
    setSchedulePreset('')
    setImagePreview(null)
    setTimeOffs([])
    setEditingManager(manager)
    setManagerFormData({
      name: manager.name || '',
      username: manager.username || '',
      password: '',
      active: Boolean(manager.active),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleToggleManagerActive = async (manager, nextActive) => {
    try {
      await api.patch(`/managers/${manager.id}`, { active: nextActive ? '1' : '0' })
      toast.success(nextActive ? 'Manager activated' : 'Manager deactivated')
      refreshData()
    } catch (e) {
      toast.error(nextActive ? 'Failed to activate manager' : 'Failed to deactivate manager')
    }
  }

  const handleDeleteManager = async (manager) => {
    if (!window.confirm(`Are you sure you want to delete ${manager.name}?`)) {
      return
    }

    try {
      await api.delete(`/managers/${manager.id}`)
      toast.success('Manager deleted')
      if (editingManager?.id === manager.id) {
        resetManagerForm()
      }
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete manager')
    }
  }

  const handleDeleteStylist = async (stylist) => {
    if (!window.confirm(`Are you sure you want to delete ${stylist.name}? This action cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/stylists/${stylist.id}`)
      toast.success('Stylist deleted successfully')
      if (editing?.id === stylist.id) {
        resetStylistForm()
      }
      if (viewingStaff?.type === 'stylist' && viewingStaff.staff.id === stylist.id) {
        setViewingStaff(null)
      }
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
            const response = await api.post(`/stylists/${stylist.id}`, data, {
              headers: {
                'X-Requested-With': 'XMLHttpRequest',
              }
            })
            toast.success('Stylist deactivated successfully')
            setStylists(prevStylists =>
              prevStylists.map(st => st.id === stylist.id ? { ...st, ...response.data } : st)
            )
            if (viewingStaff?.type === 'stylist' && viewingStaff.staff.id === stylist.id) {
              setViewingStaff(null)
            }
            setTimeout(() => refreshData(), 500)
          } catch (deactivateError) {
            toast.error('Failed to deactivate stylist')
          }
        }
      } else {
        toast.error(message)
      }
    }
  }

  const openStaffProfile = (type, staff) => {
    setViewingStaff({ type, staff })
  }

  const closeStaffProfile = () => {
    setViewingStaff(null)
  }

  const navigate = useNavigate()

  const handleStaffFormSubmit = (e) => {
    if (selectedStaffType === 'stylist') {
      handleSubmit(e)
      return
    }

    if (selectedStaffType === 'manager') {
      handleManagerSubmit(e)
      return
    }

    e.preventDefault()
    toast.warn('Please select staff type first')
  }

  return (
    <div className="min-h-screen bg-[#f4edff] flex flex-col md:flex-row text-[#3b2f2a]">
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
              <h1 className="text-2xl font-bold">Manage Staff</h1>
            </div>
          </div>

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-6">
        <h2 className="text-xl font-semibold mb-4">
          {selectedStaffType === 'stylist'
            ? `${editing ? 'Edit' : 'Add'} Stylist`
            : selectedStaffType === 'manager'
              ? `${editingManager ? 'Edit' : 'Add'} Manager`
              : 'Add Staff'}
        </h2>
        <form onSubmit={handleStaffFormSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Staff Type *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedStaffType}
                onChange={(e) => handleStaffTypeChange(e.target.value)}
              >
                <option value="">Select staff type</option>
                <option value="stylist">Stylist</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>

          {selectedStaffType === 'stylist' ? (
            <>
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
                <img src={imagePreview} alt="Preview" className="mt-2 h-44 w-full object-contain bg-[#f7f1ec] rounded" />
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

          {isStylistBaseInfoComplete ? (
          <div className="border-t pt-4 mt-4">
            <div className="rounded-2xl border border-[#d6e3d3] bg-[#f9fcf8] p-4 md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-[#314235]">Weekly Schedule</h3>
                  <p className="text-sm text-[#6f806f]">Set working days, day-offs, and manage absences for this staff member.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#6b574c]">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#659a6d]" />Working</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#c8b9a9]" />Day Off</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#dc7f7f]" />Absent</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <span className="inline-flex items-center rounded-full bg-[#dff0e1] px-3 py-1 text-[#4a8455]">{workingDaysCount} Working days</span>
                <span className="inline-flex items-center rounded-full bg-[#f0e8df] px-3 py-1 text-[#8f7a6f]">{dayOffCount} Days off</span>
                <span className="inline-flex items-center rounded-full bg-[#fbe3e3] px-3 py-1 text-[#bf5656]">{currentWeekAbsences} Absences this week</span>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="h-9 w-9 rounded-lg border border-[#e4d8ce] bg-white text-[#6b574c] hover:bg-[#f8f1ea]"
                  aria-label="Previous week"
                >
                  -
                </button>
                <div className="rounded-lg border border-[#e4d8ce] bg-white px-3 py-1.5 text-sm font-medium text-[#4b3d34]">
                  {formatWeekRangeLabel(currentWeekRange.start, currentWeekRange.end)}
                </div>
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="h-9 w-9 rounded-lg border border-[#e4d8ce] bg-white text-[#6b574c] hover:bg-[#f8f1ea]"
                  aria-label="Next week"
                >
                  +
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#efe6dc] bg-[#f7f2ec] p-3">
                <div className="text-xs font-semibold tracking-[0.14em] text-[#9b857a] uppercase">Quick Presets</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SCHEDULE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => applySchedulePreset(preset.value)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                        schedulePreset === preset.value
                          ? 'border-[#6a9d72] bg-[#e6f4e9] text-[#3f7b4d]'
                          : 'border-[#e3d8ce] bg-white text-[#6b574c] hover:bg-[#fdf9f5]'
                      }`}
                    >
                      {preset.shortLabel || preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {WEEKLY_DISPLAY_ORDER.map((weekday) => {
                  const dayLabel = WEEKDAYS.find((day) => day.value === weekday)?.label || `Day ${weekday}`
                  const daySchedule = formData.working_hours.find((wh) => wh.weekday === weekday) || {
                    weekday,
                    enabled: false,
                    start_time: '09:00',
                    end_time: '17:00',
                  }
                  const isWorking = Boolean(daySchedule.enabled)
                  const rowClasses = isWorking
                    ? 'border-[#9ac4a1] bg-[#eaf3ec]'
                    : 'border-[#ddd2c6] bg-[#f1ece6]'

                  return (
                    <div
                      key={weekday}
                      className={`flex flex-col gap-3 rounded-xl border px-3 py-3 md:flex-row md:items-center md:justify-between ${rowClasses}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-24 text-sm font-semibold text-[#3b2f2a]">{dayLabel}</span>
                        <button
                          type="button"
                          onClick={() => setDayStatus(weekday, 'working')}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            isWorking
                              ? 'border-[#6f9f75] bg-[#6f9f75] text-white'
                              : 'border-[#a6c7ab] bg-[#eaf6ec] text-[#5d8f65] hover:bg-[#dff0e2]'
                          }`}
                        >
                          Working
                        </button>
                        <button
                          type="button"
                          onClick={() => setDayStatus(weekday, 'dayoff')}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            !isWorking
                              ? 'border-[#c8b9a9] bg-[#c8b9a9] text-white'
                              : 'border-[#d9cdc0] bg-[#f3ede6] text-[#917f72] hover:bg-[#ebe1d6]'
                          }`}
                        >
                          Day Off
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editing) {
                              toast.info('Save this staff first to mark absences')
                              return
                            }

                            const targetDate = new Date(currentWeekRange.start)
                            const offsetFromMonday = weekday === 0 ? 6 : weekday - 1
                            targetDate.setDate(targetDate.getDate() + offsetFromMonday)
                            const isoDate = targetDate.toISOString().split('T')[0]
                            setNewTimeOff({
                              start_datetime: `${isoDate}T${daySchedule.start_time || '09:00'}`,
                              end_datetime: `${isoDate}T${daySchedule.end_time || '18:00'}`,
                            })
                            const absenceManager = document.getElementById('absence-manager')
                            if (absenceManager) {
                              absenceManager.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                          }}
                          className="rounded-full border border-[#e9b9b9] bg-[#fdeceb] px-3 py-1 text-xs text-[#c46262] hover:bg-[#fbe0df]"
                        >
                          Absent
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <TimePicker
                          value={daySchedule.start_time}
                          onChange={(value) => updateDaySchedule(weekday, 'start_time', value)}
                          disabled={!isWorking}
                        />
                        <span className="text-[#9b857a]">to</span>
                        <TimePicker
                          value={daySchedule.end_time}
                          onChange={(value) => updateDaySchedule(weekday, 'end_time', value)}
                          disabled={!isWorking}
                        />
                        <span className="w-10 text-right text-xs font-medium text-[#7c8f7f]">
                          {getShiftHoursLabel(daySchedule)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 rounded-xl border border-[#e8ddd2] bg-white p-4" id="absence-manager">
                <h4 className="text-lg font-semibold text-[#3b2f2a]">Absence Manager</h4>
                <p className="mt-1 text-sm text-[#8f7a6f]">Mark specific dates the staff will be absent. These override the weekly schedule.</p>

                {editing ? (
                  <>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Start Date & Time</label>
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border border-[#e3d8ce] px-3 py-2"
                          value={newTimeOff.start_datetime}
                          onChange={(e) => setNewTimeOff({ ...newTimeOff, start_datetime: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">End Date & Time</label>
                        <input
                          type="datetime-local"
                          className="w-full rounded-lg border border-[#e3d8ce] px-3 py-2"
                          value={newTimeOff.end_datetime}
                          onChange={(e) => setNewTimeOff({ ...newTimeOff, end_datetime: e.target.value })}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={addTimeOff}
                          className="w-full rounded-lg bg-[#de6666] px-4 py-2 font-medium text-white hover:bg-[#c75454]"
                        >
                          + Mark Absent
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {timeOffs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-[#eadfd5] bg-[#faf7f4] px-3 py-3 text-sm text-[#9b857a]">
                          No absences recorded.
                        </div>
                      ) : (
                        timeOffs.map((to, idx) => (
                          <div key={idx} className="flex flex-col gap-2 rounded-lg border border-[#eadfd5] bg-[#faf7f4] p-3 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm">
                              <span className="font-medium text-[#3b2f2a]">
                                {new Date(to.start_datetime).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  timeZone: 'Asia/Manila',
                                })}
                              </span>
                              <span className="ml-2 text-[#8f7a6f]">
                                {new Date(to.start_datetime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'Asia/Manila',
                                })} - {new Date(to.end_datetime).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  timeZone: 'Asia/Manila',
                                })} PHT
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.delete(`/stylists/${editing.id}/time-offs/${to.id}`)
                                  toast.success('Day off removed')
                                  loadTimeOffs(editing.id)
                                } catch (e) {
                                  toast.error('Failed to remove day off')
                                }
                              }}
                              className="rounded-lg border border-[#efc1c1] bg-white px-3 py-1.5 text-sm text-[#c25d5d] hover:bg-[#fff4f4]"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-3 rounded-lg border border-dashed border-[#eadfd5] bg-[#faf7f4] px-3 py-3 text-sm text-[#9b857a]">
                    Save this staff first to enable Absence Manager.
                  </div>
                )}
              </div>
            </div>
          </div>
          ) : (
            <div className="border-t pt-4 mt-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[#6b574c]">
                Complete name, email, and password first to unlock weekly schedule.
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              {editing ? 'Update' : 'Create'} Stylist
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetStylistForm}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
            </>
          ) : selectedStaffType === 'manager' ? (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={managerFormData.name}
                    onChange={(e) => setManagerFormData({ ...managerFormData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    className="w-full border rounded px-3 py-2"
                    value={managerFormData.username}
                    onChange={(e) => setManagerFormData({ ...managerFormData, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password {!editingManager && '*'} {editingManager && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    value={managerFormData.password}
                    placeholder={editingManager ? '********' : 'Enter password (min 6 characters)'}
                    onChange={(e) => setManagerFormData({ ...managerFormData, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={managerFormData.active ? 'true' : 'false'}
                    onChange={(e) => setManagerFormData({ ...managerFormData, active: e.target.value === 'true' })}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editingManager ? 'Update' : 'Create'} Manager
                </button>
                {editingManager && (
                  <button
                    type="button"
                    onClick={resetManagerForm}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[#eadfd5] bg-[#f7f1ec] p-4 text-sm text-[#6b574c]">
              Select a staff type first to continue.
            </div>
          )}
        </form>
      </div>

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
        <h2 className="text-xl font-semibold mb-4">All Stylists ({stylists.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              No stylists yet. Create your first stylist above.
            </div>
          ) : (
            stylists.map(s => (
              <div
                key={s.id}
                className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => openStaffProfile('stylist', s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openStaffProfile('stylist', s)
                  }
                }}
                title="Click to view stylist details"
              >
                {s.image ? (
                <img
                    key={`${s.id}-${s.image}`}
                    src={`http://localhost:8000/${s.image}?v=${Date.now()}`}
                  alt={s.name}
                  className="w-full h-52 object-contain bg-[#f7f1ec] rounded mb-2"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                />
                ) : (
                  <div className="w-full h-52 bg-gray-200 flex items-center justify-center text-gray-400 text-sm rounded mb-2">
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
              <div className="text-xs text-[#9b857a] mt-1">Click this profile card to view details.</div>
            </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
        <h2 className="text-xl font-semibold mb-4">All Managers ({managers.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managers.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-400">
              No managers yet. Create your first manager above.
            </div>
          ) : (
            managers.map((m) => (
              <div
                key={m.id}
                className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                onClick={() => openStaffProfile('manager', m)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openStaffProfile('manager', m)
                  }
                }}
                title="Click to view manager details"
              >
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{m.name}</div>
                  {!m.active && (
                    <span className="text-xs bg-gray-200 text-[#8f7a6f] px-2 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-sm text-[#8f7a6f]">@{m.username}</div>
                <div className="text-xs text-[#9b857a] mt-1">Click this profile card to view details.</div>
              </div>
            ))
          )}
        </div>
      </div>

      {viewingStaff && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeStaffProfile}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-8 mx-auto w-[92%] max-w-2xl bg-white rounded-2xl border border-[#eadfd5] shadow-[0_16px_32px_rgba(92,64,51,0.18)]">
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {viewingStaff.type === 'stylist' ? 'Stylist Profile' : 'Manager Profile'}
                  </h3>
                  <p className="text-sm text-[#8f7a6f]">Review staff information before taking action.</p>
                </div>
                <button
                  type="button"
                  onClick={closeStaffProfile}
                  className="text-[#9b857a] hover:text-[#3b2f2a]"
                >
                  Close
                </button>
              </div>

              {viewingStaff.type === 'stylist' ? (
                <div className="space-y-4">
                  {viewingStaff.staff.image ? (
                    <img
                      src={`http://localhost:8000/${viewingStaff.staff.image}?v=${Date.now()}`}
                      alt={viewingStaff.staff.name}
                      className="w-full h-64 object-contain bg-[#f7f1ec] rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-64 rounded-xl bg-[#f7f1ec] flex items-center justify-center text-[#9b857a]">
                      No Profile Image
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#8f7a6f]">Name:</span> <span className="font-medium">{viewingStaff.staff.name}</span></div>
                    <div><span className="text-[#8f7a6f]">Status:</span> <span className="font-medium">{viewingStaff.staff.active ? 'Active' : 'Inactive'}</span></div>
                    <div><span className="text-[#8f7a6f]">Email:</span> <span className="font-medium">{viewingStaff.staff.email || 'N/A'}</span></div>
                    <div><span className="text-[#8f7a6f]">Phone:</span> <span className="font-medium">{viewingStaff.staff.phone || 'N/A'}</span></div>
                  </div>
                  <div>
                    <div className="text-sm text-[#8f7a6f] mb-1">Weekly Schedule</div>
                    {Array.isArray(viewingStaff.staff.working_hours) && viewingStaff.staff.working_hours.length > 0 ? (
                      <div className="space-y-1 text-sm">
                        {viewingStaff.staff.working_hours.map((wh, idx) => (
                          <div key={`${wh.weekday}-${idx}`} className="text-[#3b2f2a]">
                            {(WEEKDAYS.find((day) => day.value === wh.weekday)?.label || `Day ${wh.weekday}`)}: {wh.start_time} - {wh.end_time}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-[#8f7a6f]">No schedule set.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div><span className="text-[#8f7a6f]">Name:</span> <span className="font-medium">{viewingStaff.staff.name}</span></div>
                  <div><span className="text-[#8f7a6f]">Username:</span> <span className="font-medium">@{viewingStaff.staff.username}</span></div>
                  <div><span className="text-[#8f7a6f]">Status:</span> <span className="font-medium">{viewingStaff.staff.active ? 'Active' : 'Inactive'}</span></div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const staff = viewingStaff.staff
                    const type = viewingStaff.type
                    closeStaffProfile()
                    if (type === 'stylist') {
                      handleEdit(staff)
                    } else {
                      handleEditManager(staff)
                    }
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const staff = viewingStaff.staff
                    const type = viewingStaff.type
                    closeStaffProfile()
                    if (type === 'stylist') {
                      await handleDeleteStylist(staff)
                    } else {
                      await handleDeleteManager(staff)
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  )
}

export default ManageStylists




