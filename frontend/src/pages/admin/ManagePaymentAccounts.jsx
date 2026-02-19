import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const ManagePaymentAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({
    account_name: '',
    account_number: '',
    account_type: 'gcash',
    bank_name: '',
    qr_code_url: '',
    qr_code_file: null,
    instructions: '',
    is_active: true,
  })
  const [qrPreview, setQrPreview] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const res = await api.get('/payment-accounts/all')
      setAccounts(res.data)
    } catch (e) {
      toast.error('Failed to load payment accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = new FormData()
      payload.append('account_name', formData.account_name)
      payload.append('account_number', formData.account_number)
      payload.append('account_type', formData.account_type)
      payload.append('bank_name', formData.bank_name)
      payload.append('instructions', formData.instructions)
      payload.append('is_active', formData.is_active ? '1' : '0')
      if (formData.qr_code_file) {
        payload.append('qr_code_file', formData.qr_code_file)
      } else {
        payload.append('qr_code_url', formData.qr_code_url)
      }

      if (editing) {
        payload.append('_method', 'PATCH')
        await api.post(`/payment-accounts/${editing.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Payment account updated successfully')
      } else {
        await api.post('/payment-accounts', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        toast.success('Payment account created successfully')
      }
      setShowModal(false)
      setEditing(null)
      setFormData({
        account_name: '',
        account_number: '',
        account_type: 'gcash',
        bank_name: '',
        qr_code_url: '',
        qr_code_file: null,
        instructions: '',
        is_active: true,
      })
      setQrPreview('')
      loadAccounts()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save payment account')
    }
  }

  const handleEdit = (account) => {
    setEditing(account)
    setFormData({
      account_name: account.account_name,
      account_number: account.account_number,
      account_type: account.account_type,
      bank_name: account.bank_name || '',
      qr_code_url: account.qr_code_full_url || account.qr_code_url || '',
      qr_code_file: null,
      instructions: account.instructions || '',
      is_active: account.is_active,
    })
    setQrPreview(account.qr_code_full_url || account.qr_code_url || '')
    setShowModal(true)
  }

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this payment account? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/payment-accounts/${accountId}`)
      toast.success('Payment account deleted successfully')
      loadAccounts()
    } catch (e) {
      toast.error('Failed to delete payment account')
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear(); sessionStorage.clear()
      navigate('/login/admin')
    })
  }

  const getAccountTypeLabel = (type) => {
    const labels = {
      gcash: 'GCash',
      paymaya: 'PayMaya',
      bank: 'Bank Account',
      other: 'Other',
    }
    return labels[type] || type
  }

  const getAccountTypeColor = (type) => {
    const colors = {
      gcash: 'bg-green-100 text-green-800',
      paymaya: 'bg-blue-100 text-blue-800',
      bank: 'bg-purple-100 text-purple-800',
      other: 'bg-[#f7f1ec] text-[#3b2f2a]',
    }
    return colors[type] || colors.other
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4edff] flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f4edff] flex flex-col md:flex-row text-[#3b2f2a]">
      <Sidebar userType="admin" onLogout={handleLogout} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Navbar />
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/dashboard')}
                className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-lg font-bold"
                aria-label="Return to Dashboard"
                title="Return to Dashboard"
              >&larr;</button>
              <h1 className="text-2xl font-bold">Manage Payment Accounts</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setEditing(null)
                  setFormData({
                    account_name: '',
                    account_number: '',
                    account_type: 'gcash',
                    bank_name: '',
                    qr_code_url: '',
                    qr_code_file: null,
                    instructions: '',
                    is_active: true,
                  })
                  setQrPreview('')
                  setShowModal(true)
                }}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                + Add Payment Account
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Payment accounts are displayed to customers during booking. 
              Only active accounts will be shown to customers. You can add GCash, PayMaya, bank accounts, or other payment methods.
            </p>
          </div>

          {/* Accounts List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <div
                key={account.id}
                className={`bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4 border-l-4 ${
                  account.is_active ? 'border-green-500' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{account.account_name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${getAccountTypeColor(account.account_type)}`}>
                      {getAccountTypeLabel(account.account_type)}
                    </span>
                  </div>
                  {account.is_active ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-[#f7f1ec] text-[#3b2f2a]">Inactive</span>
                  )}
                </div>
                <div className="space-y-2 mt-3">
                  <div>
                    <span className="text-xs text-[#9b857a]">Account Number:</span>
                    <p className="font-mono text-sm">{account.account_number}</p>
                  </div>
                  {account.bank_name && (
                    <div>
                      <span className="text-xs text-[#9b857a]">Bank:</span>
                      <p className="text-sm">{account.bank_name}</p>
                    </div>
                  )}
                  {account.qr_code_url && (
                    <div>
                      <span className="text-xs text-[#9b857a]">QR Code:</span>
                      <div className="mt-1">
                        <img
                          src={account.qr_code_full_url || account.qr_code_url}
                          alt="QR Code"
                          className="w-24 h-24 object-contain border rounded"
                        />
                      </div>
                    </div>
                  )}
                  {account.instructions && (
                    <div>
                      <span className="text-xs text-[#9b857a]">Instructions:</span>
                      <p className="text-sm text-gray-700 mt-1">{account.instructions}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(account)}
                    className="flex-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="flex-1 text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {accounts.length === 0 && (
            <div className="text-center py-8 text-[#9b857a] bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)]">
              No payment accounts found. Click "Add Payment Account" to create one.
            </div>
          )}

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white/90 rounded-2xl border border-[#eadfd5] shadow-[0_16px_32px_rgba(92,64,51,0.12)] p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Payment Account</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full border rounded px-3 py-2"
                      value={formData.account_name}
                      onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                      placeholder="e.g., GCash - Main Account"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      className="w-full border rounded px-3 py-2"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      placeholder="e.g., 09171234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Type *</label>
                    <select
                      required
                      className="w-full border rounded px-3 py-2"
                      value={formData.account_type}
                      onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    >
                      <option value="gcash">GCash</option>
                      <option value="paymaya">PayMaya</option>
                      <option value="bank">Bank Account</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  {formData.account_type === 'bank' && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Bank Name</label>
                      <input
                        type="text"
                        className="w-full border rounded px-3 py-2"
                        value={formData.bank_name}
                        onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                        placeholder="e.g., BDO, BPI, Metrobank"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">QR Code URL (Optional)</label>
                    <input
                      type="url"
                      className="w-full border rounded px-3 py-2"
                      value={formData.qr_code_url}
                      onChange={(e) => {
                        const value = e.target.value
                        setFormData({ ...formData, qr_code_url: value, qr_code_file: null })
                        setQrPreview(value)
                      }}
                      placeholder="https://example.com/qr-code.png"
                    />
                    <p className="text-xs text-[#9b857a] mt-1">
                      Paste an existing QR URL, or upload an image below. If you upload a file, it overrides this URL.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Upload QR Code Image (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full border rounded px-3 py-2"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setFormData({ ...formData, qr_code_file: file, qr_code_url: file ? '' : formData.qr_code_url })
                        setQrPreview(file ? URL.createObjectURL(file) : formData.qr_code_url)
                      }}
                    />
                    {qrPreview && (
                      <div className="mt-2">
                        <span className="text-xs text-[#9b857a] block mb-1">Preview</span>
                        <img src={qrPreview} alt="QR preview" className="w-24 h-24 object-contain border rounded" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Instructions (Optional)</label>
                    <textarea
                      className="w-full border rounded px-3 py-2"
                      rows="3"
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="e.g., Send payment to this number and include appointment reference"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">Active (visible to customers)</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      {editing ? 'Update' : 'Create'} Account
                    </button>
                    <button
                      type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditing(null)
                      setFormData({
                        account_name: '',
                        account_number: '',
                        account_type: 'gcash',
                        bank_name: '',
                        qr_code_url: '',
                        qr_code_file: null,
                        instructions: '',
                        is_active: true,
                      })
                      setQrPreview('')
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default ManagePaymentAccounts




