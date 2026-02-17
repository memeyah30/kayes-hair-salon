import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../utils/api'
import Sidebar from '../../components/Sidebar'
import Navbar from '../../components/Navbar'

const ManageInventory = () => {
  const [inventory, setInventory] = useState([])
  const [editing, setEditing] = useState(null)
  const [stats, setStats] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sku: '',
    quantity: 0,
    min_stock_level: 0,
    unit_price_cents: 0,
    selling_price_cents: 0,
    unit: 'piece',
    supplier: '',
    expiry_date: '',
    is_active: true,
  })
  const [filter, setFilter] = useState('all') // all, active, low_stock

  useEffect(() => {
    refreshData()
    loadStats()
  }, [])

  const refreshData = async () => {
    try {
      const res = await api.get('/inventory')
      setInventory(res.data)
    } catch (e) {
      toast.error('Failed to load inventory')
      console.error(e)
    }
  }

  const loadStats = async () => {
    try {
      const res = await api.get('/inventory/stats')
      setStats(res.data)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const data = {
        ...formData,
        unit_price_cents: Math.round(formData.unit_price_cents * 100),
        selling_price_cents: Math.round(formData.selling_price_cents * 100),
        expiry_date: formData.expiry_date || null,
      }

      if (editing) {
        await api.patch(`/inventory/${editing.id}`, data)
        toast.success('Inventory item updated')
      } else {
        await api.post('/inventory', data)
        toast.success('Inventory item added')
      }

      setEditing(null)
      setFormData({
        name: '',
        description: '',
        category: '',
        sku: '',
        quantity: 0,
        min_stock_level: 0,
        unit_price_cents: 0,
        selling_price_cents: 0,
        unit: 'piece',
        supplier: '',
        expiry_date: '',
        is_active: true,
      })
      refreshData()
      loadStats()
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save inventory item')
    }
  }

  const handleEdit = (item) => {
    setEditing(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      sku: item.sku || '',
      quantity: item.quantity,
      min_stock_level: item.min_stock_level,
      unit_price_cents: item.unit_price_cents / 100,
      selling_price_cents: item.selling_price_cents / 100,
      unit: item.unit || 'piece',
      supplier: item.supplier || '',
      expiry_date: item.expiry_date || '',
      is_active: item.is_active,
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this inventory item?')) {
      return
    }
    try {
      await api.delete(`/inventory/${id}`)
      toast.success('Inventory item deleted')
      refreshData()
      loadStats()
    } catch (e) {
      toast.error('Failed to delete inventory item')
    }
  }

  const currency = (cents) => `PHP ${(cents / 100).toFixed(2)}`

  const filteredInventory = inventory.filter(item => {
    if (filter === 'active') return item.is_active
    if (filter === 'low_stock') return item.is_active && item.quantity <= item.min_stock_level
    return true
  })

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f7f1ec] flex flex-col md:flex-row text-[#3b2f2a]">
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
              <h1 className="text-2xl font-bold">Inventory Management</h1>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Total Items</div>
                <div className="text-2xl font-bold">{stats.total_items}</div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Active Items</div>
                <div className="text-2xl font-bold">{stats.active_items}</div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Low Stock Items</div>
                <div className="text-2xl font-bold text-red-600">{stats.low_stock_items}</div>
              </div>
              <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
                <div className="text-sm text-[#8f7a6f]">Total Inventory Value</div>
                <div className="text-2xl font-bold">{currency(stats.total_inventory_value_cents)}</div>
              </div>
            </div>
          )}

          {/* Add/Edit Form */}
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-6">
            <h2 className="text-xl font-semibold mb-4">{editing ? 'Edit' : 'Add'} Inventory Item</h2>
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
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., hair_products, tools, supplies"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="piece">Piece</option>
                    <option value="bottle">Bottle</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="set">Set</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full border rounded px-3 py-2"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Min Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded px-3 py-2"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit Price (PHP) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border rounded px-3 py-2"
                    value={formData.unit_price_cents}
                    onChange={(e) => setFormData({ ...formData, unit_price_cents: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price (PHP) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full border rounded px-3 py-2"
                    value={formData.selling_price_cents}
                    onChange={(e) => setFormData({ ...formData, selling_price_cents: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Supplier</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input
                    type="date"
                    className="w-full border rounded px-3 py-2"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="w-full border rounded px-3 py-2"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <span className="text-sm">Active</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  {editing ? 'Update' : 'Add'} Item
                </button>
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null)
                      setFormData({
                        name: '',
                        description: '',
                        category: '',
                        sku: '',
                        quantity: 0,
                        min_stock_level: 0,
                        unit_price_cents: 0,
                        selling_price_cents: 0,
                        unit: 'piece',
                        supplier: '',
                        expiry_date: '',
                        is_active: true,
                      })
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Inventory List */}
          <div className="bg-white/80 rounded-2xl border border-[#eadfd5] shadow-[0_8px_24px_rgba(92,64,51,0.08)] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold">Inventory Items</h2>
              <select
                className="w-full sm:w-auto border rounded px-3 py-2"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Items</option>
                <option value="active">Active Only</option>
                <option value="low_stock">Low Stock</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Category</th>
                    <th className="text-left p-2">SKU</th>
                    <th className="text-right p-2">Quantity</th>
                    <th className="text-right p-2">Min Level</th>
                    <th className="text-right p-2">Unit Price</th>
                    <th className="text-right p-2">Selling Price</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map(item => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.category || '-'}</td>
                      <td className="p-2">{item.sku || '-'}</td>
                      <td className="p-2 text-right">
                        <span className={item.quantity <= item.min_stock_level ? 'text-red-600 font-bold' : ''}>
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="p-2 text-right">{item.min_stock_level}</td>
                      <td className="p-2 text-right">{currency(item.unit_price_cents)}</td>
                      <td className="p-2 text-right">{currency(item.selling_price_cents)}</td>
                      <td className="p-2">
                        {item.is_active ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInventory.length === 0 && (
                <div className="text-center py-8 text-[#9b857a]">No inventory items found</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ManageInventory




