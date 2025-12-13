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
    specialization_tag: '',
    image: null,
  })
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    refreshData()
  }, [])

  const refreshData = async () => {
    try {
      const res = await api.get('/services')
      setServices(res.data)
    } catch (e) {
      toast.error('Failed to load services')
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
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('duration_minutes', formData.duration_minutes)
      data.append('price_cents', Math.round(formData.price_cents * 100)) // Convert to cents
      data.append('specialization_tag', formData.specialization_tag)
      if (formData.image) {
        data.append('image', formData.image)
      }

      if (editing) {
        await api.patch(`/services/${editing.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Service updated')
      } else {
        await api.post('/services', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Service created')
      }

      setEditing(null)
      setFormData({ name: '', duration_minutes: 30, price_cents: 0, specialization_tag: '', image: null })
      setImagePreview(null)
      refreshData()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save service')
    }
  }

  const handleEdit = (service) => {
    setEditing(service)
    setFormData({
      name: service.name,
      duration_minutes: service.duration_minutes,
      price_cents: service.price_cents / 100, // Convert from cents
      specialization_tag: service.specialization_tag || '',
      image: null,
    })
    setImagePreview(service.image ? `http://localhost:8000/${service.image}` : null)
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
              <label className="block text-sm font-medium mb-1">Duration (minutes) *</label>
              <input
                type="number"
                required
                min="5"
                className="w-full border rounded px-3 py-2"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              />
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
            <div>
              <label className="block text-sm font-medium mb-1">Specialization Tag</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                value={formData.specialization_tag}
                onChange={(e) => setFormData({ ...formData, specialization_tag: e.target.value })}
                placeholder="e.g., hair-color, nails"
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
                  setFormData({ name: '', duration_minutes: 30, price_cents: 0, specialization_tag: '', image: null })
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
              {s.image && (
                <img
                  src={`http://localhost:8000/${s.image}`}
                  alt={s.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <div className="p-4">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-gray-600">{s.duration_minutes} min • ₱{(s.price_cents / 100).toFixed(2)}</div>
                <button
                  onClick={() => handleEdit(s)}
                  className="mt-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
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

export default ManageServices

