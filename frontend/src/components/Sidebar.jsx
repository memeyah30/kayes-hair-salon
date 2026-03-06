import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'

const Sidebar = ({ userType = 'customer', onLogout }) => {
  const [isOpen, setIsOpen] = useState(false)

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/customers', label: 'Customers', icon: 'customers' },
    { to: '/admin/manage/services', label: 'Services', icon: 'services' },
    { to: '/admin/manage/stylists', label: 'Staff', icon: 'staff' },
    { to: '/admin/staff/pending', label: 'Approvals', icon: 'reviews' },
    { to: '/admin/appointments', label: 'Appointments', icon: 'appointments' },
    { to: '/admin/ratings', label: 'Reviews', icon: 'reviews' },
    { to: '/admin/holidays', label: 'Holidays', icon: 'calendar' },
    { to: '/admin/payment-accounts', label: 'Payments', icon: 'payments' },
    { to: '/admin/inventory', label: 'Inventory', icon: 'inventory' },
    { to: '/admin/sales', label: 'Reports', icon: 'reports' },
  ]

  const managerLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/manager/staff/add', label: 'Add Staff', icon: 'staff' },
    { to: '/manager/staff/requests', label: 'Staff Requests', icon: 'reviews' },
    { to: '/admin/appointments', label: 'Appointments', icon: 'appointments' },
    { to: '/admin/customers', label: 'Customers', icon: 'customers' },
    { to: '/admin/ratings', label: 'Reviews', icon: 'reviews' },
    { to: '/admin/holidays', label: 'Holidays', icon: 'calendar' },
  ]

  const stylistLinks = [
    { to: '/stylist/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/stylist/appointments', label: 'My Appointments', icon: 'appointments' },
    { to: '/stylist/schedule', label: 'My Schedule', icon: 'calendar' },
  ]

  const customerLinks = [
    { to: '/customer', label: 'Dashboard', icon: 'dashboard' },
    { to: '/book', label: 'Book Appointment', icon: 'appointments' },
    { to: '/manage-booking/start', label: 'Manage Booking', icon: 'calendar' },
    { to: '/stylists', label: 'Stylists', icon: 'staff' },
    { to: '/services', label: 'Services', icon: 'services' },
  ]

  const links = userType === 'admin'
    ? adminLinks
    : userType === 'manager'
      ? managerLinks
      : userType === 'stylist'
        ? stylistLinks
        : customerLinks

  const isAdminTheme = userType !== 'customer'

  const renderIcon = (name) => {
    const base = 'h-5 w-5'
    switch (name) {
      case 'dashboard':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h7V4H4v8Zm9 8h7V4h-7v16Zm-9 0h7v-6H4v6Z" />
          </svg>
        )
      case 'customers':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 14a4 4 0 1 0-8 0v1a5 5 0 0 0 5 5h6" />
            <circle cx="10" cy="8" r="3" />
          </svg>
        )
      case 'services':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10v10H7z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h4M17 7h4M3 17h4M17 17h4" />
          </svg>
        )
      case 'staff':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="10" r="2.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 18c0-2.2 1.8-4 4-4h1c2.2 0 4 1.8 4 4" />
          </svg>
        )
      case 'appointments':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="4" y="5" width="16" height="15" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v4M16 3v4M7 11h10M7 15h6" />
          </svg>
        )
      case 'reviews':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4l2.2 4.5 5 .7-3.6 3.4.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.2l5-.7L12 4Z" />
          </svg>
        )
      case 'calendar':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3 9h18" />
          </svg>
        )
      case 'payments':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 14h4" />
          </svg>
        )
      case 'inventory':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
          </svg>
        )
      case 'reports':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5M9 19V9M14 19V12M19 19V7" />
          </svg>
        )
      case 'managers':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="7" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
          </svg>
        )
      default:
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="4" />
          </svg>
        )
    }
  }

  useEffect(() => {
    const toggle = () => setIsOpen((prev) => !prev)
    const open = () => setIsOpen(true)
    const close = () => setIsOpen(false)

    window.addEventListener('sidebar:toggle', toggle)
    window.addEventListener('sidebar:open', open)
    window.addEventListener('sidebar:close', close)

    return () => {
      window.removeEventListener('sidebar:toggle', toggle)
      window.removeEventListener('sidebar:open', open)
      window.removeEventListener('sidebar:close', close)
    }
  }, [])

  return (
    <>
      <aside
        className={`hidden md:flex w-20 shrink-0 flex-col border-r ${
          isAdminTheme
            ? 'bg-gradient-to-b from-[#5e3eb3] via-[#5635aa] to-[#472a90] border-white/10 text-white shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className={`h-[74px] flex items-center justify-center border-b ${isAdminTheme ? 'border-white/10' : 'border-slate-800'}`}>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              isAdminTheme
                ? 'border border-white/40 bg-white/95 text-[#5d41b7] shadow-[0_12px_28px_rgba(33,10,86,0.22)] hover:bg-white'
                : 'bg-slate-800 text-white'
            }`}
            aria-label="Open full side panel"
            title="Open full side panel"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              title={link.label}
              className={({ isActive }) => (
                `h-12 w-12 mx-auto rounded-xl flex items-center justify-center transition ${
                  isActive
                    ? 'bg-white text-[#5437a9] shadow-[0_14px_30px_rgba(26,9,67,0.28)]'
                    : 'text-white hover:bg-white/16 hover:text-white'
                }`
              )}
            >
              {renderIcon(link.icon)}
            </NavLink>
          ))}
        </nav>

        {(userType === 'admin' || userType === 'manager' || userType === 'stylist') && onLogout && (
          <div className={`px-2 pb-3 border-t ${isAdminTheme ? 'border-white/10' : 'border-slate-800'}`}>
            <button
              type="button"
              onClick={onLogout}
              className={`h-12 w-12 mt-3 mx-auto rounded-xl flex items-center justify-center ${
                isAdminTheme ? 'bg-[#d96c82] text-white hover:bg-[#c85f74]' : 'bg-red-600 text-white'
              }`}
              title="Logout"
              aria-label="Logout"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 19V5a2 2 0 0 0-2-2h-4" />
              </svg>
            </button>
          </div>
        )}
      </aside>

      <div className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'} ${
            isAdminTheme ? 'bg-[#120628]/52' : 'bg-black/40'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />

        <aside
          className={`absolute left-0 top-0 h-full w-72 flex flex-col transform transition-transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            isAdminTheme
              ? 'bg-gradient-to-b from-[#5f3eb4] via-[#5635aa] to-[#472a90] text-white border-r border-white/10'
              : 'bg-slate-900 text-white'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={`px-5 py-4 text-base font-semibold flex items-center justify-between ${
              isAdminTheme ? 'border-b border-white/10' : 'border-b border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-white/22 border border-white/16 flex items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="Kaye's Hair Salon logo"
                  className="h-10 w-10 object-contain"
                />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Kaye&apos;s Hair Salon</div>
                <div className={`text-xs ${isAdminTheme ? 'text-white/68' : 'text-slate-300'}`}>and Spa</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`text-sm ${isAdminTheme ? 'text-white/68 hover:text-white' : 'text-slate-300 hover:text-white'}`}
              aria-label="Close menu"
            >
              Close
            </button>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2 text-sm">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => (
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                    isActive
                      ? 'bg-white text-[#5437a9] shadow-[0_14px_30px_rgba(26,9,67,0.24)]'
                      : 'text-white hover:bg-white/16 hover:text-white'
                  }`
                )}
                onClick={() => setIsOpen(false)}
              >
                <span
                  className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                    isAdminTheme
                      ? 'bg-white/12 border border-white/20'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {renderIcon(link.icon)}
                </span>
                <span className="font-medium">{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {(userType === 'admin' || userType === 'manager' || userType === 'stylist') && onLogout && (
            <div className={`px-5 py-4 border-t ${isAdminTheme ? 'border-white/10' : 'border-slate-800'}`}>
              <button
                onClick={() => {
                  setIsOpen(false)
                  onLogout()
                }}
                className={`w-full px-3 py-2 rounded text-sm ${
                  isAdminTheme
                    ? 'bg-[#d96c82] hover:bg-[#c85f74] text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                Logout
              </button>
            </div>
          )}
        </aside>
      </div>
    </>
  )
}

export default Sidebar
