import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'
import { getManagerStaff } from '../../api/staff'

const statusClass = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

const StaffRequests = () => {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

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
              <h1 className="text-2xl font-bold">My Staff Requests</h1>
              <p className="text-sm text-[#8f7a6f] mt-1">
                Track approval status for staff you submitted.
              </p>
            </div>
            <div className="sm:ml-auto">
              <button
                onClick={() => navigate('/manager/staff/add')}
                className="tap-safe w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Staff
              </button>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {loading && (
              <div className="rounded-xl border border-[#eadfd5] bg-white/80 p-4 text-sm text-[#8f7a6f]">
                Loading requests...
              </div>
            )}
            {!loading && requests.length === 0 && (
              <div className="rounded-xl border border-[#eadfd5] bg-white/80 p-4 text-sm text-[#8f7a6f]">
                No staff requests yet.
              </div>
            )}
            {!loading && requests.map((staff) => (
              <div key={staff.id} className="rounded-xl border border-[#eadfd5] bg-white/85 p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base">{staff.first_name} {staff.last_name}</div>
                    <div className="text-xs text-[#8f7a6f] capitalize mt-1">Role: {staff.role}</div>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[staff.status] || 'bg-gray-100 text-gray-700'}`}>
                    {staff.status}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-[#8f7a6f]">
                  <div><span className="font-medium text-[#5f4f8f]">Rejected Reason:</span> {staff.rejected_reason || '-'}</div>
                  <div><span className="font-medium text-[#5f4f8f]">Created:</span> {staff.created_at ? new Date(staff.created_at).toLocaleString() : '-'}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f7f1ec] text-[#6f5b50] uppercase tracking-wide text-xs">
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
                    <td className="px-4 py-6 text-center text-[#8f7a6f]" colSpan={5}>
                      Loading requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#8f7a6f]" colSpan={5}>
                      No staff requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((staff) => (
                    <tr key={staff.id} className="border-t border-[#f0e6dd]">
                      <td className="px-4 py-3 font-medium">
                        {staff.first_name} {staff.last_name}
                      </td>
                      <td className="px-4 py-3 capitalize">{staff.role}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[staff.status] || 'bg-gray-100 text-gray-700'}`}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#8f7a6f]">{staff.rejected_reason || '-'}</td>
                      <td className="px-4 py-3 text-[#8f7a6f]">
                        {staff.created_at ? new Date(staff.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default StaffRequests
