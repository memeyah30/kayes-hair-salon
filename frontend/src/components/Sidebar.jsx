import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'

const SIDEBAR_STATE_KEY = 'dashboard_sidebar_open'
const DESKTOP_SIDEBAR_QUERY = '(min-width: 1024px)'

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return false

  const storedState = window.sessionStorage.getItem(SIDEBAR_STATE_KEY)
  if (storedState !== 'true') return false

  return window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches
}

const isDesktopViewport = () => (
  typeof window !== 'undefined' && window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches
)

const Sidebar = ({ userType = 'customer', onLogout }) => {
  const [isOpen, setIsOpen] = useState(getInitialSidebarState)

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/customers', label: 'Customers', icon: 'customers' },
    { to: '/admin/manage/services', label: 'Services', icon: 'services' },
    { to: '/admin/manage/managers', label: 'Manager Profiles', icon: 'staff' },
    { to: '/admin/appointments', label: 'Appointments', icon: 'appointments' },
    { to: '/admin/ratings', label: 'Reviews', icon: 'reviews' },
    { to: '/admin/holidays', label: 'Holidays', icon: 'calendar' },
    { to: '/admin/payment-accounts', label: 'Payments', icon: 'payments' },
    { to: '/admin/sales', label: 'Reports', icon: 'reports' },
  ]

  const managerLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/appointments', label: 'Appointments', icon: 'appointments' },
    { to: '/admin/customers', label: 'Customers', icon: 'customers' },
    { to: '/admin/ratings', label: 'Reviews', icon: 'reviews' },
    { to: '/admin/holidays', label: 'Holidays', icon: 'calendar' },
  ]

  const customerLinks = [
    { to: '/customer', label: 'Dashboard', icon: 'dashboard' },
    { to: '/book?fresh=1&source=customer-dashboard', label: 'Book Appointment', icon: 'appointments' },
    { to: '/manage-booking/start', label: 'Manage Booking', icon: 'calendar' },
    { to: '/services', label: 'Services', icon: 'services' },
  ]

  const links = userType === 'admin'
    ? adminLinks
    : userType === 'manager'
      ? managerLinks
      : customerLinks

  const isAdminTheme = true

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
      case 'staff-add':
        return (
          <svg className={base} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="10" r="2.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 18c0-2.2 1.8-4 4-4h1c2.2 0 4 1.8 4 4" />
            <circle cx="18.25" cy="5.75" r="4" fill="white" stroke="currentColor" strokeWidth="1.1" />
            <path strokeLinecap="round" strokeLinejoin="round" stroke="#5f3eb4" strokeWidth="2.2" d="M18.25 3.7v4.1M16.2 5.75h4.1" />
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
    if (typeof window === 'undefined') return undefined

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.sessionStorage.setItem(SIDEBAR_STATE_KEY, String(isOpen))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isDesktopViewport()) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(DESKTOP_SIDEBAR_QUERY)
    const handleViewportChange = (event) => {
      if (!event.matches) {
        setIsOpen(false)
      }
    }

    mediaQuery.addEventListener('change', handleViewportChange)
    return () => mediaQuery.addEventListener('change', handleViewportChange)
  }, [])

  const handleSidebarLinkClick = (event, link, shouldCloseMenu = false) => {
    const shouldCloseSidebar = shouldCloseMenu && !isDesktopViewport()

    if (shouldCloseSidebar) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* On desktop the layout keeps space for either the full drawer or the icon-only rail. */}
      <div
        aria-hidden="true"
        className={`hidden lg:block shrink-0 transition-[width] duration-300 ease-out ${
          isOpen ? 'w-[var(--dashboard-sidebar-width)]' : 'w-[var(--dashboard-sidebar-collapsed-width)]'
        }`}
      />


      {/* Closed desktop state keeps a slim rail so feature icons stay visible without covering content. */}
      <aside
        aria-hidden={isOpen ? 'true' : undefined}
        className={`hidden lg:flex fixed left-0 top-[var(--dashboard-navbar-height)] z-20 h-[calc(100dvh-var(--dashboard-navbar-height))] pb-[env(safe-area-inset-bottom)] w-[var(--dashboard-sidebar-collapsed-width)] flex-col items-center overflow-hidden overscroll-contain px-2 py-4 transition-[opacity,transform] duration-300 ease-out xl:py-5 ${
          isOpen ? 'pointer-events-none -translate-x-3 opacity-0' : 'translate-x-0 opacity-100'
        } ${
          isAdminTheme
            ? 'bg-gradient-to-b from-[#5f3eb4] via-[#5635aa] to-[#472a90] text-white border-r border-white/10 shadow-[18px_0_38px_rgba(28,10,72,0.18)]'
            : 'bg-slate-900 text-white shadow-[18px_0_38px_rgba(15,23,42,0.18)]'
        }`}
      >
        <nav className="flex w-full flex-1 overflow-y-auto flex-col items-center gap-2 pt-1 xl:gap-2.5 no-scrollbar">
          {links.map((link) => (
            <NavLink
              key={`${link.to}-collapsed`}
              to={link.to}
              title={link.label}
              aria-label={link.label}
              aria-disabled={link.comingSoon ? 'true' : undefined}
              className={({ isActive }) => (
                `flex h-10 w-10 items-center justify-center rounded-2xl transition xl:h-11 xl:w-11 ${
                  link.comingSoon
                    ? 'text-white/70 hover:bg-white/10 hover:text-white/85 opacity-65'
                    : isActive
                      ? 'bg-white text-[#5437a9] shadow-[0_14px_30px_rgba(26,9,67,0.24)]'
                      : 'text-white hover:bg-white/16 hover:text-white'
                }`
              )}
              onClick={(event) => handleSidebarLinkClick(event, link)}
            >
              {renderIcon(link.icon)}
            </NavLink>
          ))}
        </nav>

        {(userType === 'admin' || userType === 'manager' || userType === 'owner') && onLogout && (
          <div className="pb-2 pt-3 xl:pb-4">
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d96c82] text-white transition hover:bg-[#c85f74] shadow-[0_12px_24px_rgba(44,12,80,0.18)] xl:h-11 xl:w-11"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17l5-5-5-5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5" />
              </svg>
            </button>
          </div>
        )}
      </aside>

      <div className={`fixed inset-x-0 bottom-0 top-[var(--dashboard-navbar-height)] z-20 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <div
          className={`absolute inset-0 ${
            isAdminTheme ? 'bg-[#120628]/52' : 'bg-black/40'
          }`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      </div>

      <aside
        id="dashboard-sidebar"
        className={`fixed left-0 top-[var(--dashboard-navbar-height)] z-20 h-[calc(100dvh-var(--dashboard-navbar-height))] pb-[env(safe-area-inset-bottom)] w-[var(--dashboard-sidebar-width)] max-w-[calc(100vw-1.25rem)] flex flex-col overflow-hidden transform transition-[transform,box-shadow] duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isAdminTheme
            ? 'bg-gradient-to-b from-[#5f3eb4] via-[#5635aa] to-[#472a90] text-white border-r border-white/10 shadow-[18px_0_38px_rgba(28,10,72,0.28)]'
            : 'bg-slate-900 text-white shadow-[18px_0_38px_rgba(15,23,42,0.28)]'
        }`}
        role="dialog"
        aria-modal={!isDesktopViewport()}
      >
        <nav className="flex-1 overflow-y-auto space-y-1.5 px-3 py-4 text-sm md:px-4 md:py-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              aria-disabled={link.comingSoon ? 'true' : undefined}
              className={({ isActive }) => (
                `flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                  link.comingSoon
                    ? 'text-white/70 hover:bg-white/10 hover:text-white/85 opacity-65'
                    : isActive
                      ? 'bg-white text-[#5437a9] shadow-[0_14px_30px_rgba(26,9,67,0.24)]'
                      : 'text-white hover:bg-white/16 hover:text-white'
                }`
              )}
              onClick={(event) => handleSidebarLinkClick(event, link, true)}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                  isAdminTheme
                    ? 'bg-white/12 border border-white/20'
                    : 'bg-slate-800 text-white'
                }`}
              >
                {renderIcon(link.icon)}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-medium">{link.label}</span>
                {link.comingSoon && (
                  <span className="rounded-full border border-white/35 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90">
                    Coming Soon
                  </span>
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        {(userType === 'admin' || userType === 'manager' || userType === 'owner') && onLogout && (
          <div className={`border-t px-4 py-3 md:px-5 md:py-3 ${isAdminTheme ? 'border-white/10' : 'border-slate-800'}`}>
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
    </>
  )
}

export default Sidebar
