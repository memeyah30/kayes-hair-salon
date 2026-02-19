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
    price_cents: '',
    image: null,
  })
  const [imagePreview, setImagePreview] = useState(null)
  const [hasCategories, setHasCategories] = useState(false) // Toggle for whether service has categories/variants
  const [variants, setVariants] = useState([])
  const [editingVariant, setEditingVariant] = useState(null)
  const [variantForm, setVariantForm] = useState({
    name: '',
    price_cents: '',
  })

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
      // Validate required fields before submitting
      if (!formData.name || !formData.name.trim()) {
        toast.error('Name is required')
        return
      }
      
      // If service has categories, must have at least one variant
      if (hasCategories && variants.length === 0) {
        toast.error('Please add at least one category/variant for this service')
        return
      }
      
      // Price is only required if no categories/variants exist
      const priceValue = parseFloat(formData.price_cents) || 0
      if (!hasCategories && (!formData.price_cents || priceValue <= 0)) {
        toast.error('Price must be greater than 0')
        return
      }

      const data = new FormData()
      const wasEditing = editing // Store before clearing
      const editingId = editing?.id // Store ID before clearing
      
      // Always append all required fields with proper values
      data.append('name', formData.name.trim())
      // Only add price if provided (variants may have their own prices)
      if (priceValue > 0) {
        data.append('price_cents', Math.round(priceValue * 100).toString())
      } else {
        // Set a default price if no variants (for backward compatibility)
        data.append('price_cents', '0')
      }
      // Only append image if it's a File object (new upload)
      if (formData.image && formData.image instanceof File) {
        data.append('image', formData.image)
      }
      
      // Debug: Log what we're sending
      console.log('Sending FormData:', {
        name: formData.name.trim(),
        price_cents: Math.round(priceValue * 100),
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
        const response = await api.post('/services', data)
        toast.success('Service created')
        // After creating service, save variants if any
        if (variants.length > 0 && response.data?.id) {
          await saveVariants(response.data.id)
        }
      }
      
      // After updating service, save variants
      if (wasEditing && variants.length > 0) {
        await saveVariants(editingId)
      }

      setEditing(null)
      setFormData({ name: '', price_cents: 0, image: null })
      setImagePreview(null)
      setVariants([])
      setEditingVariant(null)
      setVariantForm({ name: '', price_cents: '' })
      
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

  const handleEdit = async (service) => {
    setEditing(service)
    
    setFormData({
      name: service.name,
      price_cents: (service.price_cents / 100).toString(), // Convert from cents to string
      image: null, // Reset to null - user must select new image to update
    })
    // Show existing image as preview when editing
    setImagePreview(service.image ? `http://localhost:8000/${service.image}?t=${Date.now()}` : null)
    
    // Load variants for this service
    try {
      const variantsRes = await api.get(`/services/${service.id}/variants`)
      const loadedVariants = (variantsRes.data || []).map(v => ({
        ...v,
        price_cents: v.price_cents / 100 // Convert from cents (database) to pesos (local state)
      }))
      
      
      
      
      
      
      
      setVariants(loadedVariants)
      setHasCategories(loadedVariants.length > 0) // Set hasCategories based on existing variants
    } catch (e) {
      console.error('Failed to load variants:', e)
      setVariants([])
      setHasCategories(false)
    }
  }

  const saveVariants = async (serviceId) => {
    // Save all variants
    for (const variant of variants) {
      try {
        if (variant.id) {
          // Update existing variant
          // If variant was edited, price_cents might be in pesos (from form), convert to cents
          // If variant wasn't edited, price_cents is already in cents (from database)
          const priceInPesos = typeof variant.price_cents === 'number' && variant.price_cents < 10000
            ? variant.price_cents  // Likely in pesos if less than 10000
            : (variant.price_cents / 100)  // Already in cents, convert to pesos first
          await api.patch(`/service-variants/${variant.id}`, {
            name: variant.name,
            price_cents: Math.round(priceInPesos * 100),
          })
        } else {
          // Create new variant
          await api.post(`/services/${serviceId}/variants`, {
            name: variant.name,
            price_cents: Math.round(variant.price_cents * 100),
          })
        }
      } catch (e) {
        console.error('Failed to save variant:', e)
        toast.error(`Failed to save variant: ${variant.name}`)
      }
    }
  }

  const handleAddVariant = () => {
    const priceValue = parseFloat(variantForm.price_cents) || 0
    if (!variantForm.name || !variantForm.price_cents || priceValue <= 0) {
      toast.error('Please enter variant name and price')
      return
    }
    
    const newVariant = {
      id: editingVariant?.id || null,
      name: variantForm.name,
      price_cents: priceValue, // Store as peso value (will convert to cents when saving)
    }
    
    if (editingVariant) {
      // When editing, update the variant in the list
      setVariants(variants.map(v => {
        if (v.id === editingVariant.id) {
          // Keep the ID from the existing variant
          return { ...newVariant, id: editingVariant.id }
        }
        return v
      }))
      setEditingVariant(null)
    } else {
      setVariants([...variants, newVariant])
    }
    
    setVariantForm({ name: '', price_cents: '' })
  }

  const handleEditVariant = (variant) => {
    setEditingVariant(variant)
    setVariantForm({
      name: variant.name,
      price_cents: (variant.price_cents / 100).toString(),
    })
  }

  const handleDeleteVariant = async (variantId, variantName) => {
    if (!window.confirm(`Are you sure you want to delete variant "${variantName}"?`)) {
      return
    }
    
    if (variantId) {
      // Delete from backend
      try {
        await api.delete(`/service-variants/${variantId}`)
        toast.success('Variant deleted')
      } catch (e) {
        toast.error('Failed to delete variant')
        return
      }
    }
    
    // Remove from local state
    setVariants(variants.filter(v => v.id !== variantId))
    if (editingVariant?.id === variantId) {
      setEditingVariant(null)
      setVariantForm({ name: '', price_cents: '' })
    }
  }

  const navigate = useNavigate()

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
              <h1 className="text-2xl font-bold">Manage Services</h1>
            </div>
          </div>

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-6">
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
            {/* Service has categories/variants toggle */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="checkbox"
                  checked={hasCategories}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setHasCategories(checked)
                    if (!checked) {
                      // Clear variants if unchecking
                      setVariants([])
                      setEditingVariant(null)
                      setVariantForm({ name: '', price_cents: '' })
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium text-gray-900">This service has categories/variants</div>
                  <div className="text-xs text-[#8f7a6f] mt-1">
                    Check this if the service has different options (e.g., Premium Rebonding with different brands, Hair Curl for Women/Men)
                  </div>
                </div>
              </label>
            </div>

            {/* Base Price - only show if no categories */}
            {!hasCategories && (
              <div>
                <label className="block text-sm font-medium mb-1">Price (PHP) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full border rounded px-3 py-2"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Image</label>
              <input
                type="file"
                accept="image/*"
                className="w-full border rounded px-3 py-2"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-2 h-44 w-full rounded border border-[#eadfd5] bg-[#f7f1ec] p-2 object-contain"
                />
              )}
            </div>
          </div>

          {/* Service Variants/Categories Section */}
          {hasCategories && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3">Service Categories/Variants</h3>
              <p className="text-sm text-[#8f7a6f] mb-4">
                Add different categories, brands, or types for this service with different prices.
                <br />
                <span className="font-medium">Examples:</span> Premium Rebonding - LOREAL (PHP 3,500), SCHWARZKOPF (PHP 2,500) | Hair Curl - For Women (PHP 1,000), For Men (PHP 600)
              </p>
              
              {/* Variants List */}
              {variants.length > 0 && (
                <div className="mb-4 space-y-2">
                  {variants.map((variant, idx) => (
                    <div key={variant.id || idx} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{variant.name}</div>
                        <div className="text-sm text-[#8f7a6f] mt-1">
                          <span className="font-semibold">Price:</span> PHP {
                            // All variants in local state are stored in pesos (converted when loading from DB)
                            (() => {
                              const price = typeof variant.price_cents === 'number' 
                                ? variant.price_cents 
                                : parseFloat(variant.price_cents || 0)
                              return price > 0 ? price.toFixed(2) : '0.00'
                            })()
                          }
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditVariant(variant)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(variant.id, variant.name)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Variant Form */}
              <div className="bg-gray-50 rounded p-4 border-2 border-dashed border-gray-300">
                <h4 className="font-medium mb-3 text-gray-900">{editingVariant ? 'Edit' : 'Add'} Category/Variant</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category/Variant Name *</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                      placeholder="e.g., LOREAL, For Women, SCHWARZKOPF, For Men"
                    />
                    <p className="text-xs text-[#9b857a] mt-1">
                      Enter the category name (brand, type, gender, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Price (PHP) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border rounded px-3 py-2"
                      value={variantForm.price_cents}
                      onChange={(e) => setVariantForm({ ...variantForm, price_cents: e.target.value })}
                      placeholder="e.g., 3500, 1000, 600"
                    />
                    <p className="text-xs text-[#9b857a] mt-1">
                      Enter the price for this specific category/variant
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                  >
                    {editingVariant ? 'Update' : 'Add'} Category
                  </button>
                  {editingVariant && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVariant(null)
                        setVariantForm({ name: '', price_cents: '' })
                      }}
                      className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              {editing ? 'Update' : 'Create'} Service
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
      setEditing(null)
      setFormData({ name: '', price_cents: '', image: null })
      setImagePreview(null)
      setHasCategories(false)
      setVariants([])
      setEditingVariant(null)
      setVariantForm({ name: '', price_cents: '' })
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
        <h2 className="text-xl font-semibold mb-4">All Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="border rounded-lg overflow-hidden">
              {s.image ? (
                <img
                  key={`${s.id}-${s.image}`}
                  src={`http://localhost:8000/${s.image}?v=${Date.now()}`}
                  alt={s.name}
                  className="w-full h-52 bg-[#f7f1ec] p-2 object-contain"
                  loading="lazy"
                  onError={(e) => {
                    // Hide broken images
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-52 bg-[#f7f1ec] flex items-center justify-center text-[#9b857a] text-sm">
                  No Image
                </div>
              )}
              <div className="p-4">
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-[#8f7a6f]">
                  {s.variants && s.variants.length > 0 ? (
                    <div>
                      <span className="text-xs text-blue-600 font-medium">
                        {s.variants.length} variant{s.variants.length > 1 ? 's' : ''} available
                      </span>
                      <div className="text-xs text-[#9b857a] mt-1">
                        {s.variants.map(v => v.name).join(', ')}
                      </div>
                    </div>
                  ) : (
                    <span>PHP {(s.price_cents / 100).toFixed(2)}</span>
                  )}
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




