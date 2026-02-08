import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const Sidebar = ({ userType = 'customer', onLogout }) => {
  const [isOpen, setIsOpen] = useState(false)

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/manage/stylists', label: 'Manage Stylists' },
    { to: '/admin/manage/managers', label: 'Manage Managers' },
    { to: '/admin/manage/services', label: 'Manage Services' },
    { to: '/admin/appointments', label: 'All Appointments' },
    { to: '/admin/ratings', label: 'Customer Ratings' },
    { to: '/admin/holidays', label: 'Manage Holidays' },
    { to: '/admin/payment-accounts', label: 'Payment Accounts' },
    { to: '/admin/inventory', label: 'Inventory' },
    { to: '/admin/sales', label: 'Sales Monitoring' },
  ]

  const managerLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/appointments', label: 'All Appointments' },
    { to: '/admin/customers', label: 'Customers' },
    { to: '/admin/ratings', label: 'Customer Ratings' },
    { to: '/admin/holidays', label: 'Manage Holidays' },
  ]

  const stylistLinks = [
    { to: '/stylist/dashboard', label: 'Dashboard' },
    { to: '/stylist/appointments', label: 'My Appointments' },
    { to: '/stylist/schedule', label: 'My Schedule' },
  ]

  const customerLinks = [
    { to: '/', label: 'Dashboard' },
    { to: '/book', label: 'Book Appointment' },
    { to: '/stylists', label: 'Stylists' },
    { to: '/services', label: 'Services' },
  ]

  const links = userType === 'admin'
    ? adminLinks
    : userType === 'manager'
      ? managerLinks
      : userType === 'stylist'
        ? stylistLinks
        : customerLinks

  const NavLinks = (
    <nav className="flex-1 px-3 py-4 space-y-2 text-sm">
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `px-3 py-2 rounded block ${isActive ? 'bg-slate-800/60 font-semibold' : 'hover:bg-slate-800/60'}`
          }
          onClick={() => setIsOpen(false)}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )

  const Footer = (
    <>
      {(userType === 'admin' || userType === 'manager' || userType === 'stylist') && onLogout && (
        <div className="px-5 py-4 border-t border-slate-800">
          <button
            onClick={() => {
              setIsOpen(false)
              onLogout()
            }}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Logout
          </button>
        </div>
      )}
      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-300">
        {userType === 'admin' && 'Admin Panel'}
        {userType === 'manager' && 'Manager Panel'}
        {userType === 'stylist' && 'Stylist Portal'}
        {userType === 'customer' && 'Customer Portal'}
      </div>
    </>
  )

  return (
    <>
      <div className="md:hidden w-full bg-slate-900 text-white flex items-center justify-between px-4 py-3">
        <div className="font-semibold text-sm">Kaye's Hair Salon and Spa</div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-sm"
          aria-label="Open menu"
        >
          Menu
        </button>
      </div>

      <div className={`fixed inset-0 z-40 md:hidden ${isOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 bg-slate-900 text-white flex flex-col transform transition-transform ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="px-5 py-4 text-xl font-bold border-b border-slate-800 flex items-center justify-between">
            <span>Menu</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-sm text-slate-300 hover:text-white"
              aria-label="Close menu"
            >
              Close
            </button>
          </div>
          {NavLinks}
          {Footer}
        </aside>
      </div>

      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="px-5 py-4 text-xl font-bold border-b border-slate-800">Kaye's Hair Salon and Spa</div>
        {NavLinks}
        {Footer}
      </aside>
    </>
  )
}

export default Sidebar
