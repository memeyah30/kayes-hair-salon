import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../utils/api'

const Sidebar = ({ userType = 'admin', onLogout }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [showInventoryModal, setShowInventoryModal] = useState(false)

  const menuItems = {
    admin: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
      { path: '/admin/appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { path: '/admin/customers', label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { path: '/admin/sales', label: 'Sales Monitoring', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
      { path: '/admin/staff', label: 'Staff Management', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { path: '/admin/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { path: '/admin/holidays', label: 'Holidays', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { path: '/admin/payment-accounts', label: 'Payment Accounts', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
      { path: '/admin/ratings', label: 'Ratings', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    ],
    manager: [
      { path: '/manager/dashboard', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
      { path: '/manager/appointments', label: 'Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { path: '/manager/customers', label: 'Customers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { path: '/manager/staff', label: 'Staff Management', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
      { path: '/manager/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { path: '/manager/holidays', label: 'Holidays', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ],
    stylist: [
      { path: '/stylist/dashboard', label: 'Dashboard', icon: 'M4 6h16M4 12h16M4 18h16' },
      { path: '/stylist/appointments', label: 'Assigned Appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { path: '/stylist/ratings', label: 'My Ratings', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
    ]
  }

  const items = menuItems[userType] || []

  const handleLogout = async () => {
    try {
      await api.post('/logout')
      localStorage.clear()
      sessionStorage.clear()
      navigate('/login')
    } catch (e) {
      console.error('Logout failed:', e)
      localStorage.clear()
      sessionStorage.clear()
      navigate('/login')
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 h-full w-64 border-r border-[#DDD6FE] bg-white pt-20 hidden lg:block">
        <nav className="space-y-1 px-4">
          {items.map((item) => {
            const isActive = location.pathname === item.path
            if (item.label === 'Inventory') {
              return (
                <button
                  key={item.path}
                  onClick={() => setShowInventoryModal(true)}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#6B6B6B] transition hover:bg-[#F2EDFF] hover:text-[#7B5CF5]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              )
            }
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-[#7B5CF5] text-white shadow-[0_8px_20px_rgba(123,92,245,0.24)]'
                    : 'text-[#6B6B6B] hover:bg-[#F2EDFF] hover:text-[#7B5CF5]'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-8 w-full px-4">
          <button
            onClick={onLogout || handleLogout}
            className="flex w-full items-center gap-3 rounded-xl bg-[#F6F2FF] px-4 py-3 text-sm font-semibold text-[#7B5CF5] transition hover:bg-[#EF4444] hover:text-white"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {showInventoryModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#120628]/55"
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-coming-soon-title"
            className="relative w-full max-w-md rounded-[22px] border border-[#DDD6FE] bg-white p-5 shadow-[0_22px_44px_rgba(27,18,55,0.22)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="inventory-coming-soon-title" className="text-xl font-semibold text-[#24173f]">
                  Feature Not Available
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#6B6B6B]">
                  The Inventory module is reserved for future enhancements and is not included in the current system scope.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                className="rounded-full border border-[#DDD6FE] px-3 py-1 text-sm text-[#6F4ED0] transition hover:bg-[#F6F2FF]"
              >
                Close
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInventoryModal(false)}
                className="rounded-xl bg-gradient-to-r from-[#6f4ed0] to-[#8867df] px-4 py-2 text-sm font-medium text-white shadow-[0_14px_28px_rgba(43,20,97,0.24)] transition hover:from-[#6546c4] hover:to-[#7b5cd2]"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
