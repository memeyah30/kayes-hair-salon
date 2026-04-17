import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/AdminLayout'
import api from '../../utils/api'
import { createStaff } from '../../api/staff'

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'stylist',
  specialization_ids: [],
  photo: null,
}

const AddStaff = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const glassPanelClass = 'rounded-[28px] border border-white/32 bg-white/78 p-4 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md sm:p-5'
  const inputClass = 'tap-safe w-full rounded-xl border border-[#ddccff] bg-white/88 px-3 py-2 text-[#2d1f4f] outline-none focus:border-[#8c72df] focus:ring-2 focus:ring-[#d8cbff]'

  useEffect(() => {
    const loadServices = async () => {
      try {
        setServicesLoading(true)
        const { data } = await api.get('/services')
        setServices(Array.isArray(data) ? data : [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load services.')
        setServices([])
      } finally {
        setServicesLoading(false)
      }
    }

    loadServices()
  }, [])

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      navigate('/login/manager')
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.warn('First name, last name, and email are required.')
      return
    }

    try {
      setSubmitting(true)
      const payload = new FormData()
      payload.append('first_name', form.first_name.trim())
      payload.append('last_name', form.last_name.trim())
      payload.append('role', form.role || 'stylist')
      payload.append('email', form.email.trim())
      if (form.phone.trim()) payload.append('phone', form.phone.trim())
      if (form.role === 'stylist' && form.specialization_ids.length > 0) {
        payload.append('specialization_ids', JSON.stringify(form.specialization_ids))
      }
      if (form.photo) payload.append('photo', form.photo)

      await createStaff(payload)
      toast.success('Submitted for approval.')
      setForm(initialForm)
      navigate('/manager/staff/requests')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit staff request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      userType="manager"
      onLogout={handleLogout}
      title="Add Staff Request"
    >
      <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="tap-safe w-fit rounded-2xl border border-white/36 bg-white/82 px-3 py-2 text-lg font-bold text-[#654abf] shadow-[0_14px_28px_rgba(43,20,97,0.12)] hover:bg-white"
              title="Back to dashboard"
            >
              &larr;
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#24173f]">Add Staff Request</h1>
              <p className="mt-1 text-sm text-[#7b67a9]">
                New staff requests are sent to admin for approval.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className={`${glassPanelClass} grid gap-4 md:grid-cols-2`}
          >
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                className={inputClass}
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                className={inputClass}
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                maxLength={150}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role *</label>
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  specialization_ids: e.target.value === 'stylist' ? prev.specialization_ids : [],
                }))}
                required
              >
                <option value="stylist">Stylist</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Photo</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className={inputClass}
                onChange={(e) => setForm((prev) => ({ ...prev, photo: e.target.files?.[0] || null }))}
              />
              <div className="mt-1 text-xs text-[#7b67a9]">Max 2MB</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Specialization {form.role === 'stylist' ? '(Services)' : ''}
              </label>
              {form.role === 'stylist' ? (
                <div className="rounded-2xl border border-[#ddccff] bg-white/72 p-4">
                  {servicesLoading ? (
                    <div className="text-sm text-[#7b67a9]">Loading services...</div>
                  ) : services.length === 0 ? (
                    <div className="text-sm text-[#7b67a9]">No services available right now.</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {services.map((service) => {
                        const serviceId = String(service.id)
                        const isChecked = form.specialization_ids.includes(serviceId)

                        return (
                          <label
                            key={service.id}
                            className={`flex items-start gap-3 rounded-2xl border px-3 py-3 text-sm transition ${
                              isChecked
                                ? 'border-[#7b5cf5] bg-[#f3efff] text-[#2d1f4f]'
                                : 'border-[#e4d7ff] bg-white/90 text-[#6d5a98] hover:border-[#cdbaff]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-[#b9a4ef] text-[#7b5cf5] focus:ring-[#d8cbff]"
                              checked={isChecked}
                              onChange={(e) => {
                                setForm((prev) => {
                                  const current = Array.isArray(prev.specialization_ids) ? prev.specialization_ids : []
                                  const next = e.target.checked
                                    ? Array.from(new Set([...current, serviceId]))
                                    : current.filter((value) => value !== serviceId)

                                  return {
                                    ...prev,
                                    specialization_ids: next,
                                  }
                                })
                              }}
                            />
                            <span className="leading-5">{service.name}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-[#7b67a9]">
                    Choose the services this stylist can perform.
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#ddccff] bg-white/62 px-4 py-3 text-sm text-[#7b67a9]">
                  Managers do not need service specialization.
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/manager/staff/requests')}
                className="tap-safe w-full sm:w-auto rounded-2xl border border-[#ddccff] bg-white/88 px-4 py-2 text-[#6046b7] hover:bg-white"
              >
                View Requests
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="tap-safe w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#6f4ed0] to-[#8867df] px-4 py-2 text-white shadow-[0_14px_28px_rgba(43,20,97,0.24)] hover:from-[#6546c4] hover:to-[#7b5cd2] disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
      </div>
    </AdminLayout>
  )
}

export default AddStaff
