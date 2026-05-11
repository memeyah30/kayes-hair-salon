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
  const [isDirty, setIsDirty] = useState(false)
  
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
      setIsDirty(false)
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
    setIsDirty(true)
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
      setIsDirty(false)
      toast.success('Settings saved successfully')
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

  const tabs = [
    { 
      id: 'general', 
      label: 'Salon Info', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    { 
      id: 'appointment', 
      label: 'Booking Logic', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      id: 'payment', 
      label: 'Payments', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    { 
      id: 'notification', 
      label: 'Alerts', 
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
  ]

  const Toggle = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-4 group">
      <div className="flex-1 pr-4">
        <h4 className="text-sm font-bold text-[#2d1f4f] group-hover:text-[#5f3eb4] transition-colors">{label}</h4>
        {description && <p className="text-xs text-[#8b77bc] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#5f3eb4] focus:ring-offset-2 ${
          enabled ? 'bg-[#5f3eb4]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )

  if (loading) {
    return (
      <AdminLayout userType={storedUserType} onLogout={handleLogout} title="Settings">
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#efe9ff] border-t-[#5f3eb4]"></div>
            <p className="text-sm font-medium text-[#7a6794] animate-pulse">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!settings) {
    return (
      <AdminLayout userType={storedUserType} onLogout={handleLogout} title="Settings">
        <div className="app-mobile-shell flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md w-full rounded-[32px] border border-red-100 bg-white p-8 text-center shadow-xl shadow-red-900/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500 mb-6">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Configuration Error</h3>
            <p className="text-sm text-red-700/80 mb-8 leading-relaxed">
              We couldn't retrieve your salon settings. This might be due to a temporary connection issue or unapplied database migrations.
            </p>
            <button 
              onClick={fetchSettings}
              className="w-full rounded-2xl bg-red-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 hover:-translate-y-0.5 active:translate-y-0"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout userType={storedUserType} onLogout={handleLogout} title="Settings">
      <div className="app-mobile-shell max-w-6xl mx-auto py-6 sm:py-10 px-4">
        {/* Header Section */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6 animate-pageEnter">
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#5f3eb4] shadow-sm border border-[#efe9ff] transition hover:bg-[#5f3eb4] hover:text-white"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-black text-[#2d1b4a] tracking-tight">System Settings</h1>
              <p className="mt-1 text-sm font-medium text-[#7a6794]">Manage your salon rules, payments, and preferences</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {isDirty && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-bold uppercase tracking-wider border border-amber-100 animate-pulse">
                 <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                 Unsaved Changes
               </div>
             )}
             {!isDirty && settings && (
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold uppercase tracking-wider border border-emerald-100">
                 <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
                 All Saved
               </div>
             )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Enhanced Navigation Sidebar */}
          <nav className="w-full lg:w-72 shrink-0 flex lg:flex-col overflow-x-auto lg:overflow-visible no-scrollbar gap-2 p-1 bg-white/40 backdrop-blur-sm rounded-[28px] border border-white/60 sticky top-4 z-20">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap lg:w-full ${
                  activeTab === tab.id
                    ? 'bg-[#5f3eb4] text-white shadow-lg shadow-[#5f3eb4]/25 translate-x-1'
                    : 'text-[#6b5b95] hover:bg-[#efe9ff] hover:text-[#5f3eb4]'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-white' : 'text-[#8b77bc]'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Main Settings Card */}
          <main className="flex-1 w-full animate-slideInRight">
            <div className="rounded-[36px] bg-white border border-white shadow-[0_20px_50px_rgba(70,45,130,0.08)] overflow-hidden">
              <div className="bg-[#fcfaff] border-b border-[#f3efff] px-8 py-6">
                <h2 className="text-xl font-black text-[#2d1f4f]">
                  {tabs.find((t) => t.id === activeTab).label} Settings
                </h2>
              </div>
              
              <div className="p-8 sm:p-10">
                {/* General Settings */}
                {activeTab === 'general' && (
                  <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Salon Name</label>
                        <input
                          type="text"
                          className="w-full px-5 py-4 rounded-[20px] border-2 border-[#f0eaff] bg-[#fbf9ff] focus:bg-white focus:border-[#5f3eb4] focus:ring-4 focus:ring-[#5f3eb4]/5 transition-all outline-none text-[#2d1f4f] font-semibold"
                          placeholder="e.g. Kaye's Hair Salon"
                          value={settings?.general?.salon_name || ''}
                          onChange={(e) => handleInputChange('general', 'salon_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Email Address</label>
                        <input
                          type="email"
                          className="w-full px-5 py-4 rounded-[20px] border-2 border-[#f0eaff] bg-[#fbf9ff] focus:bg-white focus:border-[#5f3eb4] focus:ring-4 focus:ring-[#5f3eb4]/5 transition-all outline-none text-[#2d1f4f] font-semibold"
                          placeholder="contact@salon.com"
                          value={settings?.general?.salon_email || ''}
                          onChange={(e) => handleInputChange('general', 'salon_email', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Business Address</label>
                      <textarea
                        rows="3"
                        className="w-full px-5 py-4 rounded-[20px] border-2 border-[#f0eaff] bg-[#fbf9ff] focus:bg-white focus:border-[#5f3eb4] focus:ring-4 focus:ring-[#5f3eb4]/5 transition-all outline-none text-[#2d1f4f] font-semibold resize-none"
                        placeholder="Street, City, Province"
                        value={settings?.general?.salon_address || ''}
                        onChange={(e) => handleInputChange('general', 'salon_address', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Contact Hotline</label>
                      <input
                        type="text"
                        className="w-full md:w-1/2 px-5 py-4 rounded-[20px] border-2 border-[#f0eaff] bg-[#fbf9ff] focus:bg-white focus:border-[#5f3eb4] focus:ring-4 focus:ring-[#5f3eb4]/5 transition-all outline-none text-[#2d1f4f] font-semibold"
                        placeholder="+63 900 000 0000"
                        value={settings?.general?.salon_contact || ''}
                        onChange={(e) => handleInputChange('general', 'salon_contact', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Appointment Logic Settings */}
                {activeTab === 'appointment' && (
                  <div className="space-y-10 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-[#5f3eb4] border-b border-[#f3efff] pb-2">Business Hours</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#8b77bc] ml-1">Opens at</label>
                            <input
                              type="time"
                              className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#f0eaff] focus:border-[#5f3eb4] outline-none text-sm font-bold text-[#2d1f4f]"
                              value={settings?.appointment?.open_time || ''}
                              onChange={(e) => handleInputChange('appointment', 'open_time', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#8b77bc] ml-1">Closes at</label>
                            <input
                              type="time"
                              className="w-full px-4 py-3.5 rounded-2xl border-2 border-[#f0eaff] focus:border-[#5f3eb4] outline-none text-sm font-bold text-[#2d1f4f]"
                              value={settings?.appointment?.close_time || ''}
                              onChange={(e) => handleInputChange('appointment', 'close_time', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h4 className="text-sm font-black text-[#5f3eb4] border-b border-[#f3efff] pb-2">Resource Capacity</h4>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-[#8b77bc] ml-1">Max Customers Per Slot</label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="1"
                              max="30"
                              className="flex-1 h-2 bg-[#f0eaff] rounded-lg appearance-none cursor-pointer accent-[#5f3eb4]"
                              value={settings?.appointment?.slot_capacity || 1}
                              onChange={(e) => handleInputChange('appointment', 'slot_capacity', parseInt(e.target.value))}
                            />
                            <div className="h-12 w-16 flex items-center justify-center rounded-2xl bg-[#efe9ff] text-[#5f3eb4] font-black text-lg shadow-sm border border-[#ddd6fe]">
                              {settings?.appointment?.slot_capacity || 1}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-[#f3efff]">
                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Booking Interval</label>
                        <select
                          className="w-full px-5 py-4 rounded-[20px] border-2 border-[#f0eaff] bg-[#fbf9ff] focus:bg-white focus:border-[#5f3eb4] outline-none text-[#2d1f4f] font-bold appearance-none cursor-pointer"
                          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%235f3eb4\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2.5\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25rem' }}
                          value={settings?.appointment?.slot_interval || 30}
                          onChange={(e) => handleInputChange('appointment', 'slot_interval', parseInt(e.target.value))}
                        >
                          <option value={15}>Every 15 Minutes</option>
                          <option value={30}>Every 30 Minutes</option>
                          <option value={45}>Every 45 Minutes</option>
                          <option value={60}>Every 1 Hour</option>
                          <option value={120}>Every 2 Hours</option>
                        </select>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Holiday Management</label>
                        <button
                          type="button"
                          onClick={() => navigate('/admin/holidays')}
                          className="w-full flex items-center justify-between px-6 py-4 rounded-[20px] border-2 border-[#f0eaff] bg-white text-[#5f3eb4] font-bold transition hover:bg-[#5f3eb4] hover:text-white hover:border-[#5f3eb4] group shadow-sm"
                        >
                          <span>Manage Closed Dates</span>
                          <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payments Settings */}
                {activeTab === 'payment' && (
                  <div className="space-y-10 animate-fadeIn">
                    <div className="rounded-3xl bg-[#fbf9ff] border border-[#f0eaff] p-2 divide-y divide-[#f0eaff]">
                      <Toggle 
                        enabled={settings?.payment?.require_downpayment}
                        onChange={(v) => handleInputChange('payment', 'require_downpayment', v)}
                        label="Require Downpayment"
                        description="Customers must provide a deposit to secure their booking"
                      />
                    </div>

                    <div className="rounded-[32px] bg-gradient-to-br from-[#fdfbff] to-[#f7f2ff] border border-[#efe9ff] p-6 sm:p-8">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-black text-[#5f3eb4]">Manage Payment Accounts</h4>
                          <p className="mt-1 text-xs text-[#8b77bc]">
                            Open the payment accounts page to update GCash, PayMaya, bank transfer, and other payment methods.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/admin/payment-accounts')}
                          className="inline-flex items-center justify-center rounded-2xl bg-[#5f3eb4] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#5f3eb4]/20 transition hover:bg-[#4d32a0]"
                        >
                          Open Payment Accounts
                        </button>
                      </div>
                    </div>

                    {settings?.payment?.require_downpayment && (
                      <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#fdfbff] to-[#f7f2ff] border border-[#efe9ff] space-y-8 animate-fadeIn">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <label className="text-[11px] font-black uppercase tracking-wider text-[#5f3eb4]">Downpayment Type</label>
                              <div className="flex gap-2 p-1.5 bg-white border-2 border-[#f0eaff] rounded-2xl">
                                {['percentage', 'fixed'].map(t => (
                                  <button
                                    key={t}
                                    onClick={() => handleInputChange('payment', 'downpayment_type', t)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                                      settings?.payment?.downpayment_type === t 
                                        ? 'bg-[#5f3eb4] text-white shadow-md' 
                                        : 'text-[#8b77bc] hover:bg-[#fcfaff]'
                                    }`}
                                  >
                                    {t.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[11px] font-black uppercase tracking-wider text-[#5f3eb4]">
                                {settings?.payment?.downpayment_type === 'percentage' ? 'Percentage Value' : 'Fixed Amount (PHP)'}
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  className="w-full px-5 py-4 rounded-[20px] border-2 border-[#f0eaff] focus:border-[#5f3eb4] outline-none text-[#2d1f4f] font-black"
                                  value={settings?.payment?.downpayment_value || 0}
                                  onChange={(e) => handleInputChange('payment', 'downpayment_value', parseFloat(e.target.value))}
                                />
                                <div className="absolute right-4 top-3.5 px-3 py-1 rounded-lg bg-[#efe9ff] text-[#5f3eb4] text-[10px] font-black">
                                  {settings?.payment?.downpayment_type === 'percentage' ? '%' : 'PHP'}
                                </div>
                              </div>
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      <h4 className="text-sm font-black text-[#5f3eb4] border-b border-[#f3efff] pb-2">Available Channels</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {['cash', 'gcash', 'paymaya', 'bank_transfer'].map((method) => {
                          const isSelected = settings?.payment?.payment_methods?.includes(method)
                          return (
                            <button
                              key={method}
                              onClick={() => {
                                const current = settings?.payment?.payment_methods || []
                                const updated = isSelected ? current.filter(m => m !== method) : [...current, method]
                                handleInputChange('payment', 'payment_methods', updated)
                              }}
                              className={`group relative flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] border-2 transition-all duration-300 ${
                                isSelected
                                  ? 'bg-[#5f3eb4] border-[#5f3eb4] shadow-lg shadow-[#5f3eb4]/20'
                                  : 'bg-white border-[#f0eaff] hover:border-[#5f3eb4]/30'
                              }`}
                            >
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-[#fcfaff]'}`}>
                                {method === 'cash' && <svg className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#8b77bc]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                {method === 'gcash' && <span className={`text-[10px] font-black ${isSelected ? 'text-white' : 'text-[#8b77bc]'}`}>GC</span>}
                                {method === 'paymaya' && <span className={`text-[10px] font-black ${isSelected ? 'text-white' : 'text-[#8b77bc]'}`}>PM</span>}
                                {method === 'bank_transfer' && <svg className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-[#8b77bc]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>}
                              </div>
                              <span className={`text-[11px] font-bold uppercase tracking-widest ${isSelected ? 'text-white' : 'text-[#6b5b95]'}`}>
                                {method.replace('_', ' ')}
                              </span>
                              {isSelected && (
                                <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                                  <svg className="w-2.5 h-2.5 text-[#5f3eb4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts Settings */}
                {activeTab === 'notification' && (
                  <div className="space-y-10 animate-fadeIn">
                    <div className="rounded-3xl bg-[#fbf9ff] border border-[#f0eaff] p-2 divide-y divide-[#f0eaff]">
                      <Toggle 
                        enabled={settings?.notification?.email_notifications_enabled}
                        onChange={(v) => handleInputChange('notification', 'email_notifications_enabled', v)}
                        label="Master Email Switch"
                        description="Enable or disable all automated email alerts across the system"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-[#543b8d] ml-1">Admin Notification Inbox</label>
                      <div className="relative">
                         <div className="absolute left-5 top-4 text-[#8b77bc]">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                             <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                           </svg>
                         </div>
                        <input
                          type="email"
                          className="w-full pl-14 pr-5 py-5 rounded-[24px] border-2 border-[#f0eaff] bg-[#fbf9ff] focus:bg-white focus:border-[#5f3eb4] outline-none text-[#2d1f4f] font-bold"
                          placeholder="admin@tholits.local"
                          value={settings?.notification?.admin_notification_email || ''}
                          onChange={(e) => handleInputChange('notification', 'admin_notification_email', e.target.value)}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#8b77bc] ml-2">All administrative alerts will be routed to this secure inbox.</p>
                    </div>
                  </div>
                )}

                {/* Animated Footer */}
                <div className="mt-16 pt-8 border-t border-[#f3efff] flex items-center justify-between gap-4">
                   <div className="hidden sm:block">
                     <p className="text-xs font-bold text-[#8b77bc] uppercase tracking-widest italic opacity-60">System Configuration v2.0</p>
                   </div>
                  <button
                    disabled={saving}
                    onClick={handleSave}
                    className={`group relative flex items-center gap-3 px-10 py-5 rounded-[24px] bg-[#5f3eb4] text-white font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-xl shadow-[#5f3eb4]/30 overflow-hidden ${
                      saving ? 'opacity-80 cursor-not-allowed' : 'hover:bg-[#4d32a0] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98]'
                    }`}
                  >
                    {saving && (
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <svg className={`h-5 w-5 transition-transform ${saving ? 'opacity-0' : 'group-hover:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={saving ? 'opacity-0' : ''}>Apply Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminSettings
