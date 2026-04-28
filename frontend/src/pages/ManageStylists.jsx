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

const validateEmail = (email) => {
  if (!email) return { valid: true, message: '' }
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
  if (!phone) return { valid: true, message: '' }
  const phoneRegex = /^(\+639|09)\d{9}$/
  const cleanPhone = phone.replace(/[\s-]/g, '')
  if (!phoneRegex.test(cleanPhone)) {
    return { valid: false, message: 'Phone must be valid PH number (e.g., 09171234567 or +639171234567)' }
  }
  return { valid: true, message: '' }
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
  const [viewingStaff, setViewingStaff] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [deleteDialog, setDeleteDialog] = useState(null)
  const [isDeleteDialogLoading, setIsDeleteDialogLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    refreshData()
  }, [])

  const resetStylistForm = () => {
    setEditing(null)
    setFormData(getInitialStylistFormData())
    setSchedulePreset('')
    setWeekOffset(0)
    setFormErrors({ email: '', phone: '' })
    setImagePreview(null)
    setTimeOffs([])
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
      setStylists(stylistsRes.data || [])
      setManagers(managersRes.data || [])
      setServices(servicesRes.data || [])
    } catch (e) {
      toast.error('Failed to load staff records')
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const emailValidation = validateEmail(formData.email)
    const phoneValidation = validatePhone(formData.phone)
    setFormErrors({ email: emailValidation.message, phone: phoneValidation.message })
    if (!emailValidation.valid || !phoneValidation.valid) {
      toast.error('Please fix the validation errors before submitting')
      return
    }
    if (!editing && !formData.email) {
      toast.error('Email is required to create a stylist profile')
      return
    }

    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('email', formData.email)
      data.append('phone', formData.phone.replace(/[\s-]/g, ''))
      if (formData.password) data.append('password', formData.password)
      data.append('active', formData.active ? '1' : '0')
      data.append('specialization_ids', JSON.stringify(formData.specialization_ids || []))
      const enabledHours = formData.working_hours
        .filter(wh => wh.enabled)
        .map(wh => ({ weekday: wh.weekday, start_time: wh.start_time, end_time: wh.end_time }))
      data.append('working_hours', JSON.stringify(enabledHours))
      if (formData.image) data.append('image', formData.image)

      const wasEditing = editing
      if (editing) {
        data.append('_method', 'PATCH')
        await api.post(`/stylists/${editing.id}`, data)
        toast.success('Stylist updated successfully')
      } else {
        await api.post('/stylists', data)
        toast.success('Stylist created')
      }
      resetStylistForm()
      if (!wasEditing) setSelectedStaffType('')
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save stylist')
    }
  }

  const handleEdit = (stylist) => {
    setSelectedStaffType('stylist')
    setEditingManager(null)
    setEditing(stylist)
    setFormErrors({ email: '', phone: '' })
    const defaultHours = buildDefaultWorkingHours()
    if (stylist.working_hours) {
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
      password: '',
      active: stylist.active,
      image: null,
      specialization_ids: normalizeStylistSpecializationIds(stylist),
      working_hours: defaultHours,
    })
    setSchedulePreset(getMatchingSchedulePreset(defaultHours))
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
    try {
      const payload = {
        name: managerFormData.name,
        username: managerFormData.username,
        active: managerFormData.active ? '1' : '0',
      }
      if (managerFormData.password) payload.password = managerFormData.password
      if (editingManager) {
        await api.patch(`/managers/${editingManager.id}`, payload)
        toast.success('Manager updated successfully')
      } else {
        await api.post('/managers', payload)
        toast.success('Manager created successfully')
      }
      resetManagerForm()
      setSelectedStaffType('')
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save manager')
    }
  }

  const handleEditManager = (manager) => {
    setSelectedStaffType('manager')
    setEditing(null)
    setEditingManager(manager)
    setManagerFormData({
      name: manager.name || '',
      username: manager.username || '',
      password: '',
      active: Boolean(manager.active),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openDeleteDialog = (type, staff, mode = 'delete') => {
    setDeleteDialog({ type, staff, mode })
  }

  const closeDeleteDialog = () => {
    if (isDeleteDialogLoading) return
    setDeleteDialog(null)
  }

  const confirmDeleteDialog = async () => {
    if (!deleteDialog || isDeleteDialogLoading) return
    const { type, staff } = deleteDialog
    setIsDeleteDialogLoading(true)
    try {
      if (type === 'manager') {
        await api.delete(`/managers/${staff.id}`)
        toast.success('Manager deleted')
      } else {
        await api.delete(`/stylists/${staff.id}`)
        toast.success('Stylist deleted')
      }
      setDeleteDialog(null)
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete staff')
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

  return (
    <AdminLayout userType="admin" title="Staff Profiles">
      <div className="app-mobile-shell space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="tap-safe flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-xl font-bold text-[#7B5CF5] shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition hover:bg-[#F6F2FF] hover:text-[#6846E8]"
            >&larr;</button>
            <h1 className="text-2xl font-bold text-[#2D2D2D]">Staff Profiles</h1>
          </div>
        </div>

        <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)]">
          <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">
            {selectedStaffType === 'stylist' ? `${editing ? 'Edit' : 'Add'} Stylist` : selectedStaffType === 'manager' ? `${editingManager ? 'Edit' : 'Add'} Manager` : 'Add Staff'}
          </h2>
          <form onSubmit={selectedStaffType === 'stylist' ? handleSubmit : handleManagerSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Staff Type *</label>
              <select
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2"
                value={selectedStaffType}
                onChange={(e) => handleStaffTypeChange(e.target.value)}
              >
                <option value="">Select staff type</option>
                <option value="stylist">Stylist</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {selectedStaffType === 'stylist' && (
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="Name" className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                <input type="email" placeholder="Email" className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                <input type="text" placeholder="Phone" className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
            )}

            {selectedStaffType === 'manager' && (
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" placeholder="Name" className="w-full border p-2 rounded" value={managerFormData.name} onChange={e => setManagerFormData({...managerFormData, name: e.target.value})} required />
                <input type="text" placeholder="Username" className="w-full border p-2 rounded" value={managerFormData.username} onChange={e => setManagerFormData({...managerFormData, username: e.target.value})} required />
              </div>
            )}

            {selectedStaffType && (
              <button type="submit" className="bg-[#7B5CF5] text-white px-4 py-2 rounded">
                Save {selectedStaffType === 'stylist' ? 'Stylist' : 'Manager'}
              </button>
            )}
          </form>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.map(s => (
            <div key={s.id} onClick={() => openStaffProfile('stylist', s)} className="border p-4 rounded-xl cursor-pointer hover:shadow-lg">
              <div className="font-bold">{s.name}</div>
              <div className="text-sm text-gray-500">{s.email}</div>
            </div>
          ))}
          {managers.map(m => (
            <div key={m.id} onClick={() => openStaffProfile('manager', m)} className="border p-4 rounded-xl cursor-pointer hover:shadow-lg">
              <div className="font-bold">{m.name}</div>
              <div className="text-sm text-gray-500">@{m.username}</div>
            </div>
          ))}
        </div>
      </div>

      {viewingStaff && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">{viewingStaff.staff.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => {
                  const s = viewingStaff.staff;
                  const t = viewingStaff.type;
                  closeStaffProfile();
                  t === 'stylist' ? handleEdit(s) : handleEditManager(s);
                }} className="bg-blue-600 text-white px-4 py-2 rounded">Edit</button>
                <button onClick={() => {
                  const s = viewingStaff.staff;
                  const t = viewingStaff.type;
                  closeStaffProfile();
                  openDeleteDialog(t, s);
                }} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
                <button onClick={closeStaffProfile} className="border px-4 py-2 rounded">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteDialog && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
              <h2 className="text-lg font-bold mb-2">Delete {deleteDialog.type}?</h2>
              <p className="mb-4">Are you sure you want to delete {deleteDialog.staff.name}?</p>
              <div className="flex gap-2 justify-end">
                <button onClick={closeDeleteDialog} className="px-4 py-2 rounded">Cancel</button>
                <button onClick={confirmDeleteDialog} className="bg-red-600 text-white px-4 py-2 rounded">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default ManageStylists
