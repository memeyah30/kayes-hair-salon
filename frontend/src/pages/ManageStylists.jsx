import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import AdminLayout from '../components/AdminLayout'
import { resolveAssetUrl } from '../utils/runtime'

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
        className="tap-safe w-20 rounded-xl border border-[#DDD6FE] bg-white px-2 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
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
      <span className="text-[#6B6B6B]">:</span>
      <select
        value={minute}
        onChange={handleMinuteChange}
        disabled={disabled}
        className="tap-safe w-20 rounded-xl border border-[#DDD6FE] bg-white px-2 py-2 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
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

const normalizeStylistSpecializationIds = (stylist) => {
  const rawIds = Array.isArray(stylist?.specialization_ids)
    ? stylist.specialization_ids
    : Array.isArray(stylist?.specialized_services)
      ? stylist.specialized_services.map((service) => service?.id)
      : []

  return rawIds
    .map((id) => String(id || '').trim())
    .filter(Boolean)
}

const normalizeStylistSpecializationNames = (stylist) => {
  if (Array.isArray(stylist?.specialization_names)) {
    return stylist.specialization_names.filter(Boolean)
  }
  if (Array.isArray(stylist?.specialized_services)) {
    return stylist.specialized_services
      .map((service) => service?.name)
      .filter(Boolean)
  }
  return []
}

const getInitialStylistFormData = () => ({
  name: '',
  email: '',
  phone: '',
  password: '',
  active: true,
  image: null,
  specialization_ids: [],
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
  const [services, setServices] = useState([])
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
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [isDeleteDialogLoading, setIsDeleteDialogLoading] = useState(false)

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
      const [stylistsRes, managersRes, servicesRes] = await Promise.all([
        api.get('/stylists'),
        api.get('/managers'),
        api.get('/services'),
      ])
      console.log('Refreshed stylists:', stylistsRes.data) // Debug log
      setStylists(stylistsRes.data || [])
      setManagers(managersRes.data || [])
      setServices(servicesRes.data || [])
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
    
    // Keep email required for staff profile records.
    if (!editing && !formData.email) {
      toast.error('Email is required to create a stylist profile')
      setFormErrors(prev => ({ ...prev, email: 'Email is required for stylist profiles' }))
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
      data.append('specialization_ids', JSON.stringify(formData.specialization_ids || []))
      // Only send enabled working hours
      const enabledHours = formData.working_hours
        .filter(wh => wh.enabled)
        .map(wh => ({ weekday: wh.weekday, start_time: wh.start_time, end_time: wh.end_time }))
      const fallbackHours = !editing && enabledHours.length === 0
        ? buildHoursFromPreset(SCHEDULE_PRESETS[0])
          .filter(wh => wh.enabled)
          .map(wh => ({ weekday: wh.weekday, start_time: wh.start_time, end_time: wh.end_time }))
        : enabledHours
      data.append('working_hours', JSON.stringify(fallbackHours))
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
      specialization_ids: normalizeStylistSpecializationIds(stylist),
      working_hours: defaultHours,
    })
    setSchedulePreset(getMatchingSchedulePreset(defaultHours))
    setWeekOffset(0)
    setImagePreview(stylist.image_url || stylist.image ? resolveAssetUrl(stylist.image_url || stylist.image) : null)
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
      if (viewingStaff?.type === 'manager' && viewingStaff.staff.id === manager.id) {
        setViewingStaff(null)
      }
      refreshData()
      return true
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete manager')
      return false
    }
  }

  const handleDeactivateStylist = async (stylist) => {
    try {
      const data = new FormData()
      data.append('active', '0')
      data.append('_method', 'PATCH')
      const response = await api.post(`/stylists/${stylist.id}`, data, {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      toast.success('Stylist deactivated successfully')
      if (response?.data) {
        setStylists((prevStylists) =>
          prevStylists.map((st) => (st.id === stylist.id ? { ...st, ...response.data } : st))
        )
      }
      if (viewingStaff?.type === 'stylist' && viewingStaff.staff.id === stylist.id) {
        setViewingStaff(null)
      }
      setTimeout(() => refreshData(), 500)
      return true
    } catch {
      toast.error('Failed to deactivate stylist')
      return false
    }
  }

  const handleDeleteStylist = async (stylist) => {
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
      return { success: true }
    } catch (e) {
      const errorData = e.response?.data
      const message = errorData?.message || 'Failed to delete stylist'
      const appointmentCount = errorData?.appointment_count

      if (appointmentCount) {
        return {
          success: false,
          escalation: 'deactivate',
          message,
          appointmentCount,
        }
      } else {
        toast.error(message)
        return { success: false }
      }
    }
  }

  const confirmDeleteDialog = async () => {
    if (!deleteDialog || isDeleteDialogLoading) return

    const { type, staff, mode } = deleteDialog
    setIsDeleteDialogLoading(true)

    try {
      if (mode === 'deactivate' && type === 'stylist') {
        const deactivated = await handleDeactivateStylist(staff)
        if (deactivated) {
          setDeleteDialog(null)
        }
        return
      }

      if (type === 'manager') {
        const deleted = await handleDeleteManager(staff)
        if (deleted) {
          setDeleteDialog(null)
        }
        return
      }

      const result = await handleDeleteStylist(staff)
      if (result?.success) {
        setDeleteDialog(null)
        return
      }

      if (result?.escalation === 'deactivate') {
        setDeleteDialog({
          type: 'stylist',
          staff,
          mode: 'deactivate',
          message: result.message,
          appointmentCount: result.appointmentCount,
        })
        return
      }
      setDeleteDialog(null)
    } finally {
      setIsDeleteDialogLoading(false)
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
    <AdminLayout userType="admin" title="Staff Profiles">
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
                <h1 className="text-2xl font-bold text-[#2D2D2D]">Staff Profiles</h1>
                
              </div>
            </div>
          </div>

      <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">
          {selectedStaffType === 'stylist'
            ? `${editing ? 'Edit' : 'Add'} Stylist`
            : selectedStaffType === 'manager'
              ? `${editingManager ? 'Edit' : 'Add'} Manager`
              : 'Add Staff'}
        </h2>
        <form onSubmit={handleStaffFormSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Staff Type *</label>
              <select
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
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
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Name *</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Email * (must be @gmail.com)</label>
              <input
                type="email"
                className={`w-full rounded-xl border px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] ${formErrors.email ? 'border-red-500' : 'border-[#DDD6FE]'}`}
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
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Phone (Philippine format)</label>
              <input
                type="text"
                className={`w-full rounded-xl border px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] ${formErrors.phone ? 'border-red-500' : 'border-[#DDD6FE]'}`}
                value={formData.phone}
                placeholder="+63XXXXXXXXXX"
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value })
                  const validation = validatePhone(e.target.value)
                  setFormErrors(prev => ({ ...prev, phone: validation.message }))
                }}
              />
              {formErrors.phone && <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Image</label>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F2EDFF] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#7B5CF5] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img src={imagePreview} alt="Preview" className="mt-2 h-44 w-full rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] object-contain" />
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Status</label>
              <select
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                value={formData.active ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-[#7B5CF5] px-4 py-2 text-white transition hover:bg-[#6846E8]">
              {editing ? 'Update' : 'Create'} Stylist
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetStylistForm}
                className="rounded-lg border border-[#7B5CF5] bg-transparent px-4 py-2 text-[#7B5CF5] transition hover:bg-[#F2EDFF]"
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
                    Password {!editingManager && '*'} {editingManager && '(leave blank to keep current)'}
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
            </>
          ) : (
            <div className="rounded-xl border border-[#DDD6FE] bg-[#F6F2FF] p-4 text-sm text-[#6B6B6B]">
              Select a staff type first to continue.
            </div>
          )}
        </form>
      </div>

      <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">All Stylists ({stylists.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[#6B6B6B]">
              No stylists yet. Create your first stylist above.
            </div>
          ) : (
            stylists.map((s) => {
              return (
              <div
                key={s.id}
                className="cursor-pointer rounded-[14px] border border-[#DDD6FE] bg-white p-4 transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(123,92,245,0.14)]"
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
                {(s.image_url || s.image) ? (
                <img
                    key={`${s.id}-${s.image_url || s.image}`}
                    src={`${resolveAssetUrl(s.image_url || s.image)}?v=${Date.now()}`}
                  alt={s.name}
                  className="mb-2 h-52 w-full rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none'
                    }}
                />
                ) : (
                  <div className="mb-2 flex h-52 w-full items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F6F2FF] text-sm text-[#7B5CF5]">
                    No Image
                  </div>
              )}
                <div className="flex items-center gap-2">
              <div className="font-semibold text-[#2D2D2D]">{s.name}</div>
                  {!s.active && (
                    <span className="rounded-full bg-[#F2EDFF] px-2 py-0.5 text-xs text-[#6846E8]">
                      Inactive
                    </span>
                  )}
                </div>
              <div className="text-sm text-[#6B6B6B]">{s.email}</div>
              <div className="mt-1 text-xs text-[#6B6B6B]">Click this profile card to view details.</div>
            </div>
              )
            })
          )}
        </div>
      </div>

      <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">All Managers ({managers.length})</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {managers.length === 0 ? (
            <div className="col-span-full py-8 text-center text-[#6B6B6B]">
              No managers yet. Create your first manager above.
            </div>
          ) : (
            managers.map((m) => (
              <div
                key={m.id}
                className="cursor-pointer rounded-[14px] border border-[#DDD6FE] bg-white p-4 transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(123,92,245,0.14)]"
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
                  <div className="font-semibold text-[#2D2D2D]">{m.name}</div>
                  {!m.active && (
                    <span className="rounded-full bg-[#F2EDFF] px-2 py-0.5 text-xs text-[#6846E8]">
                      Inactive
                    </span>
                  )}
                </div>
                <div className="text-sm text-[#6B6B6B]">@{m.username}</div>
                <div className="mt-1 text-xs text-[#6B6B6B]">Click this profile card to view details.</div>
              </div>
            ))
          )}
        </div>
      </div>

      {viewingStaff && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-[#1B1237]/45"
            onClick={closeStaffProfile}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 top-8 mx-auto w-[92%] max-w-2xl rounded-[14px] border border-[#DDD6FE] bg-white shadow-[0_16px_32px_rgba(0,0,0,0.12)]">
            <div className="p-5 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold">
                    {viewingStaff.type === 'stylist' ? 'Stylist Profile' : 'Manager Profile'}
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">Review staff information before taking action.</p>
                </div>
                <button
                  type="button"
                  onClick={closeStaffProfile}
                  className="text-[#7B5CF5] transition hover:text-[#6846E8]"
                >
                  Close
                </button>
              </div>

              {viewingStaff.type === 'stylist' ? (
                <div className="space-y-4">
                  {(viewingStaff.staff.image_url || viewingStaff.staff.image) ? (
                    <img
                      src={`${resolveAssetUrl(viewingStaff.staff.image_url || viewingStaff.staff.image)}?v=${Date.now()}`}
                      alt={viewingStaff.staff.name}
                      className="h-64 w-full rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] object-contain"
                    />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center rounded-xl border border-[#DDD6FE] bg-[#F6F2FF] text-[#7B5CF5]">
                      No Profile Image
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[#6B6B6B]">Name:</span> <span className="font-medium">{viewingStaff.staff.name}</span></div>
                    <div><span className="text-[#6B6B6B]">Status:</span> <span className="font-medium">{viewingStaff.staff.active ? 'Active' : 'Inactive'}</span></div>
                    <div><span className="text-[#6B6B6B]">Email:</span> <span className="font-medium">{viewingStaff.staff.email || 'N/A'}</span></div>
                    <div><span className="text-[#6B6B6B]">Phone:</span> <span className="font-medium">{viewingStaff.staff.phone || 'N/A'}</span></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div><span className="text-[#6B6B6B]">Name:</span> <span className="font-medium">{viewingStaff.staff.name}</span></div>
                  <div><span className="text-[#6B6B6B]">Username:</span> <span className="font-medium">@{viewingStaff.staff.username}</span></div>
                  <div><span className="text-[#6B6B6B]">Status:</span> <span className="font-medium">{viewingStaff.staff.active ? 'Active' : 'Inactive'}</span></div>
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
                  className="rounded-lg bg-[#7B5CF5] px-4 py-2 text-white transition hover:bg-[#6846E8]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const staff = viewingStaff.staff
                    const type = viewingStaff.type
                    closeStaffProfile()
                    openDeleteDialog(type, staff)
                  }}
                  className="rounded-lg bg-[#EF4444] px-4 py-2 text-white transition hover:bg-[#DC2626]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
                {deleteDialog.mode === 'deactivate'
                  ? 'Cannot Delete Stylist'
                  : `Delete ${deleteDialog.type === 'stylist' ? 'Stylist' : 'Manager'}?`}
              </h3>
              <p className="mt-2 text-sm text-[#6B6B6B]">
                {deleteDialog.mode === 'deactivate'
                  ? (deleteDialog.message || 'This stylist cannot be deleted.')
                  : `Are you sure you want to delete ${deleteDialog.staff?.name || 'this staff'}?${deleteDialog.type === 'stylist' ? ' This action cannot be undone.' : ''}`}
              </p>
              {deleteDialog.mode === 'deactivate' && (
                <p className="mt-2 text-xs text-[#6B6B6B]">
                  This stylist has {deleteDialog.appointmentCount || 0} appointment(s). You can deactivate instead to keep appointment history.
                </p>
              )}
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
                  className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-60 ${
                    deleteDialog.mode === 'deactivate'
                      ? 'bg-[#F59E0B] hover:bg-[#D97706]'
                      : 'bg-[#EF4444] hover:bg-[#DC2626]'
                  }`}
                >
                  {isDeleteDialogLoading
                    ? 'Processing...'
                    : deleteDialog.mode === 'deactivate'
                      ? 'Deactivate Instead'
                      : 'Delete'}
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




