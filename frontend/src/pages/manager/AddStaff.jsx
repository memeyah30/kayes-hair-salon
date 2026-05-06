import { useState } from 'react'
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
  role: 'manager',
  photo: null,
}

const AddStaff = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const glassPanelClass = 'rounded-[28px] border border-white/32 bg-white/78 p-4 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md sm:p-5'
  const inputClass = 'tap-safe w-full rounded-xl border border-[#ddccff] bg-white/88 px-3 py-2 text-[#2d1f4f] outline-none focus:border-[#8c72df] focus:ring-2 focus:ring-[#d8cbff]'

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
      payload.append('role', 'manager')
      payload.append('email', form.email.trim())
      if (form.phone.trim()) payload.append('phone', form.phone.trim())
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
              <label className="block text-sm font-medium mb-1">Role</label>
              <input className={inputClass} value="Manager" readOnly />
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
            <div className="md:col-span-2 rounded-2xl border border-dashed border-[#ddccff] bg-white/62 px-4 py-3 text-sm text-[#7b67a9]">
              Managers do not need service specialization.
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
