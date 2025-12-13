import { NavLink, useNavigate } from 'react-router-dom'

const Sidebar = ({ userType = 'customer', onLogout }) => {
  const navigate = useNavigate()

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/manage/stylists', label: 'Manage Stylists' },
    { to: '/admin/manage/services', label: 'Manage Services' },
    { to: '/admin/appointments', label: 'All Appointments' },
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
  
  const staffLinks = [
    { to: '/login/admin', label: 'Admin Login', external: true },
    { to: '/login/stylist', label: 'Stylist Login', external: true },
  ]

  const links = userType === 'admin' ? adminLinks : userType === 'stylist' ? stylistLinks : customerLinks

  return (
    <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
      <div className="px-5 py-4 text-xl font-bold border-b border-slate-800">Tholits Salon</div>
      <nav className="flex-1 px-3 py-4 space-y-2 text-sm">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `px-3 py-2 rounded block ${isActive ? 'bg-slate-800/60 font-semibold' : 'hover:bg-slate-800/60'}`
            }
          >
            {link.label}
          </NavLink>
        ))}
        
        {userType === 'customer' && (
          <>
            <div className="text-xs text-slate-400 uppercase mt-4 mb-1 px-3">Staff Access</div>
            {staffLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded block ${isActive ? 'bg-slate-800/60 font-semibold' : 'hover:bg-slate-800/60'} text-yellow-300`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      {(userType === 'admin' || userType === 'stylist') && onLogout && (
        <div className="px-5 py-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
          >
            Logout
          </button>
        </div>
      )}
      <div className="px-5 py-4 border-t border-slate-800 text-xs text-slate-300">
        {userType === 'admin' && 'Admin Panel'}
        {userType === 'stylist' && 'Stylist Portal'}
        {userType === 'customer' && 'Customer Portal'}
      </div>
    </aside>
  )
}

export default Sidebar
