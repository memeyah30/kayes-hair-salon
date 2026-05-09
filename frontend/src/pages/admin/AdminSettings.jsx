import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import AdminLayout from '../../components/AdminLayout'
import api from '../../utils/api'
import { useNavigate } from 'react-router-dom'

const AdminSettings = () => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const navigate = useNavigate()
  const storedUserType = (sessionStorage.getItem('userType') || localStorage.getItem('userType')) || 'admin'
  const loginPath = storedUserType === 'manager' ? '/login/manager' : '/login/admin'

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/settings')
      setSettings(response.data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      if (error.response?.status === 401) {
        navigate(loginPath)
      } else {
        toast.error('Failed to load settings')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (group, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: value,
      },
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const settingsArray = []
      
      Object.keys(settings).forEach((group) => {
        Object.keys(settings[group]).forEach((key) => {
          settingsArray.push({
            key,
            value: settings[group][key],
          })
        })
      })

      await api.post('/settings', { settings: settingsArray })
      toast.success('Settings updated successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error(error.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    api.post('/logout').finally(() => {
      localStorage.clear()
      sessionStorage.clear()
      navigate(loginPath)
    })
  }

  if (loading) {
    return (
      <AdminLayout userType={storedUserType} onLogout={handleLogout} title="Salon Settings">
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5f3eb4]"></div>
        </div>
      </AdminLayout>
    )
  }

  const tabs = [
    { id: 'general', label: 'Salon Information', icon: 'salon' },
    { id: 'appointment', label: 'Appointment Logic', icon: 'calendar' },
    { id: 'payment', label: 'Payments', icon: 'payments' },
    { id: 'notification', label: 'Notifications', icon: 'notifications' },
  ]

  if (!settings) {
    return (
      <AdminLayout userType={storedUserType} onLogout={handleLogout} title="Salon Settings">
        <div className="p-8 text-center">
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 max-w-md mx-auto">
            <h3 className="font-bold text-lg mb-2">Configuration Error</h3>
            <p className="text-sm opacity-90">
              The settings could not be loaded. This usually happens if the database tables are not yet updated on the server.
            </p>
            <button 
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userType={storedUserType} onLogout={handleLogout} title="Salon Settings">
      <div className="app-mobile-shell max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Tabs Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-3xl border border-[#efe9ff] shadow-[0_12px_34px_rgba(70,45,130,0.06)] overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-6 py-4 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-[#5f3eb4] text-white'
                      : 'text-[#6b5b95] hover:bg-[#f8f4ff] hover:text-[#5f3eb4]'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 space-y-6">
            <div className="bg-white rounded-3xl border border-[#efe9ff] shadow-[0_14px_40px_rgba(70,45,130,0.08)] p-6 sm:p-8">
              <h2 className="text-xl font-bold text-[#2d1f4f] mb-6">
                {tabs.find((t) => t.id === activeTab).label}
              </h2>

              {activeTab === 'general' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Salon Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                      value={settings?.general?.salon_name || ''}
                      onChange={(e) => handleInputChange('general', 'salon_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Address</label>
                    <textarea
                      rows="3"
                      className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                      value={settings?.general?.salon_address || ''}
                      onChange={(e) => handleInputChange('general', 'salon_address', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Contact Number</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                        value={settings?.general?.salon_contact || ''}
                        onChange={(e) => handleInputChange('general', 'salon_contact', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                        value={settings?.general?.salon_email || ''}
                        onChange={(e) => handleInputChange('general', 'salon_email', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appointment' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Opening Time</label>
                      <input
                        type="time"
                        className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                        value={settings?.appointment?.open_time || ''}
                        onChange={(e) => handleInputChange('appointment', 'open_time', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Closing Time</label>
                      <input
                        type="time"
                        className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                        value={settings?.appointment?.close_time || ''}
                        onChange={(e) => handleInputChange('appointment', 'close_time', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#f0eaff]">
                    <div>
                      <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Time Slot Interval (Minutes)</label>
                      <select
                        className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                        value={settings?.appointment?.slot_interval || 30}
                        onChange={(e) => handleInputChange('appointment', 'slot_interval', parseInt(e.target.value))}
                      >
                        <option value={15}>15 Minutes</option>
                        <option value={30}>30 Minutes</option>
                        <option value={45}>45 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={120}>2 Hours</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Capacity Per Slot</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                        value={settings?.appointment?.slot_capacity || 1}
                        onChange={(e) => handleInputChange('appointment', 'slot_capacity', parseInt(e.target.value))}
                      />
                      <p className="mt-2 text-xs text-[#8b77bc]">Maximum number of appointments allowed at the same time.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#f0eaff]">
                    <label className="block text-sm font-semibold text-[#543b8d] mb-3">Holiday Management</label>
                    <div className="p-4 rounded-2xl bg-[#f8f4ff] border border-[#e2d7ff] flex items-center justify-between">
                      <div className="text-sm text-[#543b8d]">
                        Manage specific dates when the salon is closed.
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/holidays')}
                        className="px-4 py-2 rounded-xl bg-white border border-[#5f3eb4] text-[#5f3eb4] text-sm font-medium hover:bg-[#5f3eb4] hover:text-white transition shadow-sm"
                      >
                        Open Holiday Manager
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f4ff] border border-[#e2d7ff]">
                    <div>
                      <h3 className="font-bold text-[#2d1f4f]">Require Downpayment</h3>
                      <p className="text-sm text-[#8b77bc]">Force customers to pay a deposit before booking.</p>
                    </div>
                    <button
                      onClick={() => handleInputChange('payment', 'require_downpayment', !settings?.payment?.require_downpayment)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        settings?.payment?.require_downpayment ? 'bg-[#5f3eb4]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings?.payment?.require_downpayment ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {settings?.payment?.require_downpayment && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fadeIn">
                      <div>
                        <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Downpayment Type</label>
                        <select
                          className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                          value={settings?.payment?.downpayment_type || 'percentage'}
                          onChange={(e) => handleInputChange('payment', 'downpayment_type', e.target.value)}
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (PHP)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">
                          {settings?.payment?.downpayment_type === 'percentage' ? 'Percentage' : 'Amount'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                            value={settings?.payment?.downpayment_value || 0}
                            onChange={(e) => handleInputChange('payment', 'downpayment_value', parseFloat(e.target.value))}
                          />
                          <span className="absolute right-4 top-3.5 text-[#8b77bc] font-medium">
                            {settings?.payment?.downpayment_type === 'percentage' ? '%' : 'PHP'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[#f0eaff]">
                    <label className="block text-sm font-semibold text-[#543b8d] mb-3">Accepted Payment Methods</label>
                    <div className="flex flex-wrap gap-3">
                      {['cash', 'gcash', 'paymaya', 'bank_transfer'].map((method) => {
                        const isSelected = settings?.payment?.payment_methods?.includes(method)
                        return (
                          <button
                            key={method}
                            onClick={() => {
                              const current = settings?.payment?.payment_methods || []
                              const updated = isSelected
                                ? current.filter((m) => m !== method)
                                : [...current, method]
                              handleInputChange('payment', 'payment_methods', updated)
                            }}
                            className={`px-5 py-2.5 rounded-full border text-sm font-medium transition ${
                              isSelected
                                ? 'bg-[#efe9ff] border-[#5f3eb4] text-[#5f3eb4]'
                                : 'bg-white border-[#e2d7ff] text-[#6b5b95] hover:border-[#5f3eb4]'
                            }`}
                          >
                            {method.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notification' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f4ff] border border-[#e2d7ff]">
                    <div>
                      <h3 className="font-bold text-[#2d1f4f]">Email Alerts</h3>
                      <p className="text-sm text-[#8b77bc]">Send email notifications for new bookings and status changes.</p>
                    </div>
                    <button
                      onClick={() => handleInputChange('notification', 'email_notifications_enabled', !settings?.notification?.email_notifications_enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        settings?.notification?.email_notifications_enabled ? 'bg-[#5f3eb4]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          settings?.notification?.email_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#543b8d] mb-1.5">Admin Notification Email</label>
                    <input
                      type="email"
                      className="w-full px-4 py-3 rounded-2xl border border-[#e2d7ff] focus:border-[#5f3eb4] focus:ring-2 focus:ring-[#5f3eb4]/10 transition outline-none text-[#2d1f4f]"
                      value={settings?.notification?.admin_notification_email || ''}
                      onChange={(e) => handleInputChange('notification', 'admin_notification_email', e.target.value)}
                      placeholder="admin@example.com"
                    />
                    <p className="mt-2 text-xs text-[#8b77bc]">New booking alerts will be sent to this address.</p>
                  </div>
                </div>
              )}

              <div className="mt-10 flex justify-end">
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#5f3eb4] text-white font-bold transition shadow-lg ${
                    saving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#4d32a0] hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save All Settings</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings
