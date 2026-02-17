import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Staff',
  customer: 'Customer',
}

const LOGOUT_PATHS = {
  admin: '/login/admin',
  manager: '/login/manager',
  stylist: '/login/stylist',
}

const getInitials = (name) => {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

const Navbar = ({ title = 'Dashboard', onLogout }) => {
  const navigate = useNavigate()
  const isAdminTheme = true
  const userType = localStorage.getItem('userType') || 'customer'
  const parsedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])

  const roleLabel = ROLE_LABELS[userType] || 'User'
  const displayName = parsedUser?.name || roleLabel
  const initials = getInitials(displayName)
  const canLogout = userType === 'admin' || userType === 'manager' || userType === 'stylist'

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('sidebar:toggle'))
  }

  const handleLogout = () => {
    if (!canLogout) return
    if (onLogout) {
      onLogout()
      return
    }
    const loginPath = LOGOUT_PATHS[userType] || '/login/admin'
    api.post('/logout').finally(() => {
      localStorage.clear()
      navigate(loginPath)
    })
  }

  return (
    <header
      className={`px-3 md:px-6 py-3 flex items-center justify-between border-b ${
        isAdminTheme
          ? 'bg-[#f6eee8] border-[#eadfd5] shadow-[0_4px_16px_rgba(92,64,51,0.06)]'
          : 'bg-white shadow'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className={`p-2 rounded ${
            isAdminTheme ? 'hover:bg-white/70 text-[#6b574c]' : 'hover:bg-[#f7f1ec] text-gray-700'
          }`}
          aria-label="Toggle side panel"
          title="Toggle side panel"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col leading-tight min-w-0">
          <div className={`font-semibold text-sm md:text-lg ${isAdminTheme ? 'text-[#4a3a2f]' : 'text-gray-900'}`}>
            Kaye&apos;s Hair Salon and Spa
          </div>
          <div className={`text-xs md:text-sm ${isAdminTheme ? 'text-[#9b857a]' : 'text-[#9b857a]'}`}>{title}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div
          className={`hidden md:flex items-center gap-2 rounded-full px-3 py-2 text-sm border ${
            isAdminTheme ? 'bg-white/80 border-[#e5d6cc] text-[#7b675b]' : 'bg-white border-gray-200'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className={`bg-transparent outline-none w-32 ${isAdminTheme ? 'placeholder:text-[#b09a8f]' : 'placeholder:text-gray-400'}`}
          />
        </div>
        {canLogout && (
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 rounded-full text-xs md:text-sm font-medium bg-[#c97c5d] hover:bg-[#b86f54] text-white"
          >
            Logout
          </button>
        )}
        <button
          type="button"
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            isAdminTheme ? 'bg-white/80 text-[#7b675b] border border-[#e5d6cc]' : 'bg-blue-100 text-blue-700'
          }`}
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18a3 3 0 0 0 6 0" />
          </svg>
        </button>
        <div className={`flex items-center gap-2 rounded-full px-2 py-1 ${isAdminTheme ? 'bg-white/80 border border-[#e5d6cc]' : ''}`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${
            isAdminTheme ? 'bg-[#eadfd5] text-[#7b675b]' : 'bg-blue-100 text-blue-700'
          }`}>
            {initials}
          </div>
          <div className={`hidden sm:block text-sm ${isAdminTheme ? 'text-[#6b574c]' : 'text-gray-700'}`}>{roleLabel}</div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
