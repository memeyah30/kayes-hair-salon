import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'
import api from '../../utils/api'
import { approveStaff, getPendingStaff, rejectStaff } from '../../api/staff'

const PendingStaffApprovals = () => {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadPending = async () => {
    try {
      setLoading(true)
      const { data } = await getPendingStaff()
      setRows(data || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pending staff.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      navigate('/login/admin')
    })
  }

  const handleApprove = async (id) => {
    try {
      setProcessingId(id)
      await approveStaff(id)
      toast.success('Staff approved.')
      setRows((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve staff.')
    } finally {
      setProcessingId(null)
    }
  }

  const submitReject = async () => {
    if (!rejecting) return
    if (!rejectReason.trim()) {
      toast.warn('Please enter a rejection reason.')
      return
    }

    try {
      setProcessingId(rejecting.id)
      await rejectStaff(rejecting.id, rejectReason.trim())
      toast.success('Staff rejected.')
      setRows((prev) => prev.filter((item) => item.id !== rejecting.id))
      setRejecting(null)
      setRejectReason('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject staff.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4edff] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="admin" onLogout={handleLogout} />
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
              <h1 className="text-2xl font-bold">Pending Staff Approvals</h1>
              <p className="text-sm text-[#8f7a6f] mt-1">
                Review manager-submitted staff requests.
              </p>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {loading && (
              <div className="rounded-xl border border-[#eadfd5] bg-white/85 p-4 text-sm text-[#8f7a6f]">
                Loading pending requests...
              </div>
            )}
            {!loading && rows.length === 0 && (
              <div className="rounded-xl border border-[#eadfd5] bg-white/85 p-4 text-sm text-[#8f7a6f]">
                No pending staff requests.
              </div>
            )}
            {!loading && rows.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#eadfd5] bg-white/85 p-4 shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{item.first_name} {item.last_name}</div>
                    <div className="text-xs text-[#8f7a6f] capitalize mt-1">Role: {item.role}</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">pending</span>
                </div>
                <div className="mt-3 space-y-1 text-sm text-[#8f7a6f]">
                  <div><span className="font-medium text-[#5f4f8f]">Submitted by:</span> {item.created_by_manager?.name || item.createdByManager?.name || '-'}</div>
                  <div><span className="font-medium text-[#5f4f8f]">Submitted at:</span> {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processingId === item.id}
                    className="tap-safe px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setRejecting(item)}
                    disabled={processingId === item.id}
                    className="tap-safe px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
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
                  <th className="px-4 py-3 text-left">Submitted By</th>
                  <th className="px-4 py-3 text-left">Submitted At</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#8f7a6f]" colSpan={5}>
                      Loading pending requests...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-[#8f7a6f]" colSpan={5}>
                      No pending staff requests.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => (
                    <tr key={item.id} className="border-t border-[#f0e6dd]">
                      <td className="px-4 py-3 font-medium">
                        {item.first_name} {item.last_name}
                      </td>
                      <td className="px-4 py-3 capitalize">{item.role}</td>
                      <td className="px-4 py-3">
                        {item.created_by_manager?.name || item.createdByManager?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#8f7a6f]">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={processingId === item.id}
                            className="tap-safe px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejecting(item)}
                            disabled={processingId === item.id}
                            className="tap-safe px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {rejecting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#eadfd5] bg-white p-5">
            <h2 className="text-lg font-semibold mb-2">Reject Staff Request</h2>
            <p className="text-sm text-[#8f7a6f] mb-3">
              Provide a reason for rejecting {rejecting.first_name} {rejecting.last_name}.
            </p>
            <textarea
              className="w-full border rounded px-3 py-2 min-h-[120px]"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              placeholder="Reason for rejection..."
            />
            <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <button
                onClick={() => {
                  setRejecting(null)
                  setRejectReason('')
                }}
                className="tap-safe px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={processingId === rejecting.id}
                className="tap-safe px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
              >
                {processingId === rejecting.id ? 'Submitting...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PendingStaffApprovals
