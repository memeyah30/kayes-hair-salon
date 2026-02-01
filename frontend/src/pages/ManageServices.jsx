import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

const ManageServices = () => {
  const [services, setServices] = useState([])
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 30,
    price_cents: 0,
    image: null,
  })
  const [durationUnit, setDurationUnit] = useState('minutes') // 'minutes' or 'hours'
  const [durationValue, setDurationValue] = useState(30)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      const res = await api.get('/services')
      console.log('Refreshed services:', res.data) // Debug log
      setServices(res.data)
    } catch (e) {
      toast.error('Failed to load services')
      console.error('Refresh error:', e)
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
    } else {
      // If no file selected, keep existing image if editing
      if (editing && editing.image) {
        setImagePreview(`http://localhost:8000/${editing.image}`)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Convert duration to minutes based on selected unit
      const durationInMinutes = durationUnit === 'hours' 
        ? durationValue * 60 
        : durationValue

      // Validate required fields before submitting
      if (!formData.name || !formData.name.trim()) {
        toast.error('Name is required')
        return
      }
      if (!durationValue || durationValue <= 0) {
        toast.error('Duration must be greater than 0')
        return
      }
      if (!formData.price_cents || formData.price_cents <= 0) {
        toast.error('Price must be greater than 0')
        return
      }

      const data = new FormData()
      const wasEditing = editing // Store before clearing
      const editingId = editing?.id // Store ID before clearing
      
      // Always append all required fields with proper values
      data.append('name', formData.name.trim())
      data.append('duration_minutes', durationInMinutes.toString())
      data.append('price_cents', Math.round(formData.price_cents * 100).toString())
      // Only append image if it's a File object (new upload)
      if (formData.image && formData.image instanceof File) {
        data.append('image', formData.image)
      }
      
      // Debug: Log what we're sending
      console.log('Sending FormData:', {
        name: formData.name.trim(),
        duration_minutes: durationInMinutes,
        price_cents: Math.round(formData.price_cents * 100),
        hasImage: formData.image instanceof File
      })
      
      // Debug: Log FormData entries
      console.log('FormData entries:')
      for (let pair of data.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]))
      }
      
      if (editing) {
        // Use POST with _method=PATCH for FormData compatibility with Laravel
        data.append('_method', 'PATCH')
        const response = await api.post(`/services/${editing.id}`, data, {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          }
        })
        
        console.log('Update response:', response.data) // Debug log
        
        toast.success('Service updated successfully')
        
        // Immediately update the service in the list with the response data
        setServices(prevServices => {
          const updated = prevServices.map(s => {
            if (s.id === editingId) {
              return { ...s, ...response.data }
            }
            return s
          })
          console.log('Updated services list:', updated) // Debug log
          return updated
        })
      } else {
        // Don't set Content-Type header - let axios handle it for FormData
        await api.post('/services', data)
        toast.success('Service created')
      }

      setEditing(null)
      setFormData({ name: '', duration_minutes: 30, price_cents: 0, image: null })
      setDurationUnit('minutes')
      setDurationValue(30)
      setImagePreview(null)
      
      // Always refresh data to ensure everything is up to date
      // Use a longer delay for updates to ensure backend has fully processed
      setTimeout(() => {
        refreshData()
      }, wasEditing ? 1000 : 100)
    } catch (e) {
      console.error('Service save error:', e)
      const errorMessage = e.response?.data?.message || 
                          (e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : null) ||
                          'Failed to save service'
      toast.error(errorMessage)
      
      // Log validation errors for debugging
      if (e.response?.data?.errors) {
        console.error('Validation errors:', e.response.data.errors)
      }
    }
  }

  const handleEdit = (service) => {
    setEditing(service)
    const duration = service.duration_minutes || 30
    
    // Determine if duration is better shown in hours or minutes
    const showAsHours = duration >= 60 && duration % 60 === 0
    
    setFormData({
      name: service.name,
      duration_minutes: duration,
      price_cents: service.price_cents / 100, // Convert from cents
      image: null, // Reset to null - user must select new image to update
    })
    setDurationUnit(showAsHours ? 'hours' : 'minutes')
    setDurationValue(showAsHours ? duration / 60 : duration)
    // Show existing image as preview when editing
    setImagePreview(service.image ? `http://localhost:8000/${service.image}?t=${Date.now()}` : null)
  }

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-100 flex text-gray-800">
      <Sidebar userType="admin" />
      <main className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Manage Services</h1>
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              ← Return to Dashboard
            </button>
          </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold mb-4">{editing ? 'Edit' : 'Add'} Service</h2>
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
              <label className="block text-sm font-medium mb-1">Duration *</label>
              <div className="flex gap-2">
                <select
                  className="border rounded px-3 py-2"
                  value={durationUnit}
                  onChange={(e) => {
                    setDurationUnit(e.target.value)
                    // Reset value when switching units
                    if (e.target.value === 'hours') {
                      setDurationValue(1)
                    } else {
                      setDurationValue(30)
                    }
                  }}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
                <input
                  type="number"
                  required
                  min={durationUnit === 'hours' ? 1 : 5}
                  step={durationUnit === 'hours' ? 0.5 : 5}
                  className="flex-1 border rounded px-3 py-2"
                  value={durationValue}
                  onChange={(e) => setDurationValue(parseFloat(e.target.value) || 0)}
                  placeholder={durationUnit === 'hours' ? 'e.g., 1.5' : 'e.g., 30'}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {durationUnit === 'hours' 
                  ? `= ${(durationValue * 60).toFixed(0)} minutes`
                  : `= ${(durationValue / 60).toFixed(2)} hours`}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price (₱) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2"
                value={formData.price_cents}
                onChange={(e) => setFormData({ ...formData, price_cents: parseFloat(e.target.value) })}
              />
            </div>
            <div className="md:col-span-2">
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
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              {editing ? 'Update' : 'Create'} Service
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setFormData({ name: '', duration_minutes: 30, price_cents: 0, image: null })
                  setDurationUnit('minutes')
                  setDurationValue(30)
                  setImagePreview(null)
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
        <h2 className="text-xl font-semibold mb-4">All Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="border rounded-lg overflow-hidden">
              {s.image ? (
                <img
                  key={`${s.id}-${s.image}`}
                  src={`http://localhost:8000/${s.image}?v=${Date.now()}`}
                  alt={s.name}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    // Hide broken images
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-32 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                  No Image
                </div>
              )}
              <div className="p-4">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-600">
                  {(() => {
                    const hours = Math.floor(s.duration_minutes / 60)
                    const minutes = s.duration_minutes % 60
                    if (hours > 0 && minutes > 0) {
                      return `${hours}h ${minutes}m`
                    } else if (hours > 0) {
                      return `${hours} hour${hours > 1 ? 's' : ''}`
                    } else {
                      return `${minutes} minute${minutes > 1 ? 's' : ''}`
                    }
                  })()} • ₱{(s.price_cents / 100).toFixed(2)}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(s)}
                    className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to delete "${s.name}"? This action cannot be undone.`)) {
                        return
                      }
                      try {
                        await api.delete(`/services/${s.id}`)
                        toast.success('Service deleted successfully')
                        refreshData()
                      } catch (e) {
                        const errorData = e.response?.data
                        const message = errorData?.message || 'Failed to delete service'
                        const appointmentCount = errorData?.appointment_count
                        
                        if (appointmentCount) {
                          toast.error(message)
                        } else {
                          toast.error(message)
                        }
                      }
                    }}
                    className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
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

export default ManageServices

