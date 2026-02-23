import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'
import { createStaff } from '../../api/staff'

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'stylist',
  specialization: '',
  photo: null,
}

const AddStaff = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      navigate('/login/manager')
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.warn('First name and last name are required.')
      return
    }

    try {
      setSubmitting(true)
      const payload = new FormData()
      payload.append('first_name', form.first_name.trim())
      payload.append('last_name', form.last_name.trim())
      payload.append('role', form.role || 'stylist')
      if (form.email.trim()) payload.append('email', form.email.trim())
      if (form.phone.trim()) payload.append('phone', form.phone.trim())
      if (form.specialization.trim()) payload.append('specialization', form.specialization.trim())
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
    <div className="min-h-screen bg-[#f4edff] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="manager" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="app-mobile-shell space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="tap-safe w-fit px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg font-bold"
              title="Back to dashboard"
            >
              &larr;
            </button>
            <div>
              <h1 className="text-2xl font-bold">Add Staff Request</h1>
              <p className="text-sm text-[#8f7a6f] mt-1">
                New staff requests are sent to admin for approval.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 sm:p-5 grid md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                className="tap-safe w-full border rounded px-3 py-2"
                value={form.first_name}
                onChange={(e) => setForm((prev) => ({ ...prev, first_name: e.target.value }))}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                className="tap-safe w-full border rounded px-3 py-2"
                value={form.last_name}
                onChange={(e) => setForm((prev) => ({ ...prev, last_name: e.target.value }))}
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="tap-safe w-full border rounded px-3 py-2"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                maxLength={150}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                className="tap-safe w-full border rounded px-3 py-2"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                className="tap-safe w-full border rounded px-3 py-2"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                <option value="stylist">Stylist</option>
                <option value="therapist">Therapist</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Photo</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="tap-safe w-full border rounded px-3 py-2"
                onChange={(e) => setForm((prev) => ({ ...prev, photo: e.target.files?.[0] || null }))}
              />
              <div className="text-xs text-[#8f7a6f] mt-1">Max 2MB</div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Specialization</label>
              <input
                className="tap-safe w-full border rounded px-3 py-2"
                value={form.specialization}
                onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))}
                placeholder="hair color, nail art, treatment"
              />
              <div className="text-xs text-[#8f7a6f] mt-1">Use comma-separated values.</div>
            </div>
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => navigate('/manager/staff/requests')}
                className="tap-safe w-full sm:w-auto px-4 py-2 border rounded hover:bg-gray-50"
              >
                View Requests
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="tap-safe w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default AddStaff
