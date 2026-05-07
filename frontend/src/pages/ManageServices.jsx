import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../utils/api'
import AdminLayout from '../components/AdminLayout'
import { resolveAssetUrl } from '../utils/runtime'

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
  const [serviceSearch, setServiceSearch] = useState('')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const formSectionRef = useRef(null)
  const imageInputRef = useRef(null)

  const clearImageInput = () => {
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

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
      if (editing && (editing.image_url || editing.image)) {
        setImagePreview(resolveAssetUrl(editing.image_url || editing.image))
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
      clearImageInput()
      
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
    // Jump to the edit form so admins do not need to scroll manually.
    window.requestAnimationFrame(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    clearImageInput()
    
    setFormData({
      name: service.name,
      price_cents: (service.price_cents / 100).toString(), // Convert from cents to string
      image: null, // Reset to null - user must select new image to update
    })
    // Show existing image as preview when editing
    setImagePreview((service.image_url || service.image) ? `${resolveAssetUrl(service.image_url || service.image)}?t=${Date.now()}` : null)
    
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

  const formatPrice = (cents) =>
    `PHP ${(Number(cents || 0) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const getVariantPriceRange = (service) => {
    const variantPrices = Array.isArray(service?.variants)
      ? service.variants
        .map((variant) => Number(variant?.price_cents))
        .filter((price) => Number.isFinite(price))
      : []

    if (variantPrices.length === 0) {
      return null
    }

    const min = Math.min(...variantPrices)
    const max = Math.max(...variantPrices)

    if (min === max) {
      return formatPrice(min)
    }

    return `${formatPrice(min)} - ${formatPrice(max)}`
  }

  const visibleServices = useMemo(() => {
    const keyword = serviceSearch.trim().toLowerCase()

    return services.filter((service) => {
      const hasVariants = Array.isArray(service?.variants) && service.variants.length > 0

      const matchesType =
        serviceTypeFilter === 'all' ||
        (serviceTypeFilter === 'with_variants' && hasVariants) ||
        (serviceTypeFilter === 'single_price' && !hasVariants)

      if (!matchesType) return false

      if (!keyword) return true

      const serviceName = String(service?.name || '').toLowerCase()
      const variantNames = hasVariants
        ? service.variants.map((variant) => String(variant?.name || '').toLowerCase()).join(' ')
        : ''

      return serviceName.includes(keyword) || variantNames.includes(keyword)
    })
  }, [serviceSearch, serviceTypeFilter, services])

  return (
    <AdminLayout userType="admin" title="Services">
      <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="tap-safe flex h-11 w-11 items-center justify-center rounded-full border border-[#DDD6FE] bg-white text-xl font-bold text-[#7B5CF5] shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition hover:bg-[#F6F2FF] hover:text-[#6846E8]"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <h1 className="text-2xl font-bold text-[#2D2D2D]">Manage Services</h1>
            </div>
          </div>

      <div
        ref={formSectionRef}
        className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)] sm:p-6"
      >
        <h2 className="mb-4 text-xl font-semibold text-[#2D2D2D]">{editing ? 'Edit' : 'Add'} Service</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Name *</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] placeholder-[#8E84B7] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {/* Service has categories/variants toggle */}
            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-4 transition hover:bg-[#F6F2FF]">
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
                  className="h-5 w-5 rounded border-[#C4B5FD] text-[#7B5CF5] focus:ring-[#C4B5FD]"
                />
                <div>
                  <div className="font-medium text-[#2D2D2D]">This service has categories/variants</div>
                  <div className="mt-1 text-xs text-[#6B6B6B]">
                    Check this if the service has different options (e.g., Premium Rebonding with different brands, Hair Curl for Women/Men)
                  </div>
                </div>
              </label>
            </div>

            {/* Base Price - only show if no categories */}
            {!hasCategories && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Price (PHP) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] placeholder-[#8E84B7] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: e.target.value })}
                  placeholder="Enter price"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Image</label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] file:mr-3 file:rounded-lg file:border-0 file:bg-[#F2EDFF] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[#7B5CF5] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="mt-2 h-44 w-full rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-2 object-contain"
                />
              )}
            </div>
          </div>

          {/* Service Variants/Categories Section */}
          {hasCategories && (
            <div className="mt-4 border-t border-[#DDD6FE] pt-4">
              <h3 className="mb-3 text-lg font-semibold text-[#2D2D2D]">Service Categories/Variants</h3>
              <p className="mb-4 text-sm text-[#6B6B6B]">
                Add different categories, brands, or types for this service with different prices.
                <br />
                <span className="font-medium">Examples:</span> Premium Rebonding - LOREAL (PHP 3,500), SCHWARZKOPF (PHP 2,500) | Hair Curl - For Women (PHP 1,000), For Men (PHP 600)
              </p>
              
              {/* Variants List */}
              {variants.length > 0 && (
                <div className="mb-4 space-y-2">
                  {variants.map((variant, idx) => (
                    <div key={variant.id || idx} className="flex items-center justify-between rounded-xl border border-[#DDD6FE] bg-[#FCFBFF] p-3">
                      <div className="flex-1">
                        <div className="font-medium text-[#2D2D2D]">{variant.name}</div>
                        <div className="mt-1 text-sm text-[#6B6B6B]">
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
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2efff] text-[#7B5CF5] transition hover:bg-[#e6e0ff] shadow-sm"
                          title="Edit Category"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(variant.id, variant.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0f3] text-[#B91C1C] transition hover:bg-[#ffe4e9] shadow-sm"
                          title="Delete Category"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit Variant Form */}
              <div className="rounded-xl border-2 border-dashed border-[#C4B5FD] bg-[#F6F2FF] p-4">
                <h4 className="mb-3 font-medium text-[#2D2D2D]">{editingVariant ? 'Edit' : 'Add'} Category/Variant</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Category/Variant Name *</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] placeholder-[#8E84B7] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                      value={variantForm.name}
                      onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                      placeholder="e.g., LOREAL, For Women, SCHWARZKOPF, For Men"
                    />
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Enter the category name (brand, type, gender, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#2D2D2D]">Price (PHP) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3 py-2 text-[#2D2D2D] placeholder-[#8E84B7] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
                      value={variantForm.price_cents}
                      onChange={(e) => setVariantForm({ ...variantForm, price_cents: e.target.value })}
                      placeholder="e.g., 3500, 1000, 600"
                    />
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Enter the price for this specific category/variant
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="rounded-lg bg-[#7B5CF5] px-4 py-2 text-sm text-white transition hover:bg-[#6846E8]"
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
                      className="rounded-lg border border-[#7B5CF5] bg-transparent px-4 py-2 text-sm text-[#7B5CF5] transition hover:bg-[#F2EDFF]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-[#7B5CF5] px-4 py-2 text-white transition hover:bg-[#6846E8]">
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
      clearImageInput()
                }}
                className="rounded-lg border border-[#7B5CF5] bg-transparent px-4 py-2 text-[#7B5CF5] transition hover:bg-[#F2EDFF]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="rounded-[14px] border border-[#DDD6FE] bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.08)] sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl font-semibold text-[#2D2D2D]">All Services</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              {visibleServices.length} service{visibleServices.length === 1 ? '' : 's'} displayed
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              placeholder="Search services or variants..."
              className="w-full rounded-xl border border-[#DDD6FE] bg-white px-3.5 py-2.5 text-sm text-[#2D2D2D] placeholder-[#8E84B7] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] sm:w-72"
            />
            <select
              value={serviceTypeFilter}
              onChange={(e) => setServiceTypeFilter(e.target.value)}
              className="rounded-xl border border-[#DDD6FE] bg-white px-3.5 py-2.5 text-sm text-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-[#C4B5FD]"
            >
              <option value="all">All</option>
              <option value="with_variants">With Variants</option>
              <option value="single_price">Single Price</option>
            </select>
          </div>
        </div>

        {visibleServices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DDD6FE] bg-[#F6F2FF] px-4 py-8 text-center text-sm text-[#6B6B6B]">
            No services found for this filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {visibleServices.map((s) => {
              const hasVariants = Array.isArray(s?.variants) && s.variants.length > 0
              const variantRange = getVariantPriceRange(s)

              return (
                <article
                  key={s.id}
                  className="group h-full overflow-hidden rounded-[14px] border border-[#DDD6FE] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(123,92,245,0.16)]"
                >
                  <div className="relative h-44 overflow-hidden bg-[#F2EDFF]">
                    {(s.image_url || s.image) ? (
                      <img
                        key={`${s.id}-${s.image_url || s.image}`}
                        src={`${resolveAssetUrl(s.image_url || s.image)}?v=${Date.now()}`}
                        alt={s.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          const fallback = e.target.nextSibling
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-[#7B5CF5]">
                        No Image
                      </div>
                    )}
                    {(s.image_url || s.image) ? (
                      <div className="hidden h-full w-full items-center justify-center text-sm font-medium text-[#7B5CF5]">
                        No Image
                      </div>
                    ) : null}
                  </div>

                  <div className="flex min-h-[210px] flex-col justify-between p-4">
                    <div>
                      <h3 className="truncate text-xl font-semibold leading-tight text-[#2D2D2D]">{s.name}</h3>

                      <div className="mt-2 min-h-[54px]">
                        {hasVariants ? (
                          <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#7B5CF5]">
                              {s.variants.length} variant{s.variants.length > 1 ? 's' : ''} available
                            </p>
                            <p className="max-h-8 overflow-hidden text-xs text-[#6B6B6B]">
                              {s.variants.map((v) => v.name).join(', ')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-[#6B6B6B]">Single-price service</p>
                        )}
                      </div>

                      <p className="mt-2 text-2xl font-bold text-[#7B5CF5]">
                        {hasVariants ? variantRange || formatPrice(s.price_cents) : formatPrice(s.price_cents)}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(s)}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2efff] text-[#7B5CF5] transition hover:bg-[#e6e0ff] shadow-sm"
                        title="Edit Service"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
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
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff0f3] text-[#B91C1C] transition hover:bg-[#ffe4e9] shadow-sm"
                        title="Delete Service"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </AdminLayout>
  )
}

export default ManageServices




