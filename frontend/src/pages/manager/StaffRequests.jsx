import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/AdminLayout'
import api from '../../utils/api'
import { getManagerStaff } from '../../api/staff'

const statusClass = {
  pending: 'bg-[#fff1e2] text-[#a86a2f]',
  approved: 'bg-[#e9f5ef] text-[#4f8177]',
  rejected: 'bg-[#fae8ee] text-[#9a4963]',
}

const StaffRequests = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const glassPanelClass = 'rounded-[28px] border border-white/32 bg-white/78 shadow-[0_18px_40px_rgba(59,31,114,0.14)] backdrop-blur-md'

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      navigate('/login/manager')
    })
  }

  const loadRequests = async () => {
    try {
      setLoading(true)
      const { data } = await getManagerStaff()
      setRequests(data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load staff requests.')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  return (
    <AdminLayout
      userType="manager"
      onLogout={handleLogout}
      title="Staff Requests"
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
              <h1 className="text-2xl font-bold text-[#24173f]">My Staff Requests</h1>
             
            </div>
            <div className="sm:ml-auto">
              <button
                onClick={() => navigate('/manager/staff/add')}
                className="tap-safe w-full sm:w-auto rounded-2xl bg-gradient-to-r from-[#6f4ed0] to-[#8867df] px-4 py-2 text-white shadow-[0_14px_28px_rgba(43,20,97,0.24)] hover:from-[#6546c4] hover:to-[#7b5cd2]"
              >
                Add Staff
              </button>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {loading && (
              <div className="rounded-2xl border border-white/32 bg-white/78 p-4 text-sm text-[#7b67a9] shadow-[0_12px_28px_rgba(59,31,114,0.1)] backdrop-blur-md">
                Loading requests...
              </div>
            )}
            {!loading && requests.length === 0 && (
              <div className="rounded-2xl border border-white/32 bg-white/78 p-4 text-sm text-[#7b67a9] shadow-[0_12px_28px_rgba(59,31,114,0.1)] backdrop-blur-md">
                No staff requests yet.
              </div>
            )}
            {!loading && requests.map((staff) => (
              <div key={staff.id} className="rounded-2xl border border-white/32 bg-white/82 p-4 shadow-[0_14px_32px_rgba(59,31,114,0.12)] backdrop-blur-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold text-[#2f2252]">{staff.first_name} {staff.last_name}</div>
                    <div className="mt-1 text-xs capitalize text-[#7b67a9]">Role: {staff.role}</div>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[staff.status] || 'bg-gray-100 text-gray-700'}`}>
                    {staff.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-[#7b67a9]">
                  <div><span className="font-medium text-[#5f4f8f]">Rejected Reason:</span> {staff.rejected_reason || '-'}</div>
                  <div><span className="font-medium text-[#5f4f8f]">Created:</span> {staff.created_at ? new Date(staff.created_at).toLocaleString() : '-'}</div>
                </div>
              </div>
            ))}
          </div>

          <div className={`hidden overflow-x-auto ${glassPanelClass} md:block`}>
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3ebff] text-[#745fa5] uppercase tracking-wide text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Rejected Reason</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#7b67a9]" colSpan={5}>
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#7b67a9]" colSpan={5}>
                      No staff requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((staff) => (
                    <tr key={staff.id} className="border-t border-[#ece2ff]">
                      <td className="px-4 py-3 font-medium">
                        {staff.first_name} {staff.last_name}
                      </td>
                      <td className="px-4 py-3 capitalize">{staff.role}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[staff.status] || 'bg-gray-100 text-gray-700'}`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#7b67a9]">{staff.rejected_reason || '-'}</td>
                      <td className="px-4 py-3 text-[#7b67a9]">
                        {staff.created_at ? new Date(staff.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>
    </AdminLayout>
  )
}

export default StaffRequests
