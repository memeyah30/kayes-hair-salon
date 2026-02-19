import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import api from '../utils/api'

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  stylist: 'Staff',
  customer: 'Customer',
}

const getStoredUserType = () => (
  sessionStorage.getItem('userType') || 'customer'
)

const parseStoredUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
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

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return null
  if (/^https?:\/\//i.test(imagePath)) return imagePath

  const normalized = String(imagePath).replace(/^\/+/, '')
  const currentOrigin = window.location.origin

  if (currentOrigin.includes(':5173')) {
    const backendHost = currentOrigin.includes('127.0.0.1')
      ? 'http://127.0.0.1:8000'
      : 'http://localhost:8000'
    return `${backendHost}/${normalized}`
  }

  return `/${normalized}`
}

const Navbar = ({ title = 'Dashboard', hideUserBadge = false }) => {
  const isAdminTheme = true
  const [userType, setUserType] = useState(getStoredUserType)
  const [user, setUser] = useState(parseStoredUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const syncUserState = () => {
      setUserType(getStoredUserType())
      setUser(parseStoredUser())
    }

    window.addEventListener('user:updated', syncUserState)

    return () => {
      window.removeEventListener('user:updated', syncUserState)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return

    const handleOutsideClick = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return
      setMenuOpen(false)
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  const roleLabel = ROLE_LABELS[userType] || 'User'
  const displayName = user?.name || roleLabel
  const initials = getInitials(displayName)
  const profileImageUrl = resolveImageUrl(user?.image)
  const canManagePhoto = userType === 'manager' || userType === 'stylist'

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('sidebar:toggle'))
  }

  const syncStoredUser = (nextUser, nextType) => {
    if (nextUser) {
      const serializedUser = JSON.stringify(nextUser)
      sessionStorage.setItem('user', serializedUser)
      localStorage.removeItem('user')
      setUser(nextUser)
    }
    if (nextType) {
      sessionStorage.setItem('userType', nextType)
      localStorage.removeItem('userType')
      setUserType(nextType)
    }
    window.dispatchEvent(new Event('user:updated'))
  }

  const handlePhotoSelected = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be 2MB or less.')
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    try {
      setUploading(true)
      const res = await api.post('/me/profile-photo', formData)
      syncStoredUser(res.data?.user, res.data?.type)
      toast.success('Profile photo updated.')
      setMenuOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile photo.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    try {
      setUploading(true)
      const res = await api.delete('/me/profile-photo')
      syncStoredUser(res.data?.user, res.data?.type)
      toast.success('Profile photo removed.')
      setMenuOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove profile photo.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <header
      className={`px-3 md:px-6 py-3 flex items-center justify-between border-b ${
        isAdminTheme
          ? 'bg-[#ece4ff] border-[#d9cbff] shadow-[0_4px_16px_rgba(79,57,145,0.08)]'
          : 'bg-white shadow'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className={`p-2 rounded md:hidden ${
            isAdminTheme ? 'hover:bg-white/70 text-[#5f4f8f]' : 'hover:bg-[#f4edff] text-gray-700'
          }`}
          aria-label="Toggle side panel"
          title="Toggle side panel"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col leading-tight min-w-0">
          <div className={`font-semibold text-sm md:text-lg ${isAdminTheme ? 'text-[#453676]' : 'text-gray-900'}`}>
            Kaye&apos;s Hair Salon and Spa
          </div>
          <div className={`text-xs md:text-sm ${isAdminTheme ? 'text-[#7f6aa8]' : 'text-[#7f6aa8]'}`}>{title}</div>
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div
          className={`hidden md:flex items-center gap-2 rounded-full px-3 py-2 text-sm border ${
            isAdminTheme ? 'bg-white/85 border-[#d9cbff] text-[#5f4f8f]' : 'bg-white border-gray-200'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className={`bg-transparent outline-none w-32 ${isAdminTheme ? 'placeholder:text-[#9a89c7]' : 'placeholder:text-gray-400'}`}
          />
        </div>
        <button
          type="button"
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            isAdminTheme ? 'bg-white/85 text-[#5f4f8f] border border-[#d9cbff]' : 'bg-blue-100 text-blue-700'
          }`}
          aria-label="Notifications"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18a3 3 0 0 0 6 0" />
          </svg>
        </button>
        {!hideUserBadge && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                if (!canManagePhoto || uploading) return
                setMenuOpen((prev) => !prev)
              }}
              className={`flex items-center gap-2 rounded-full px-2 py-1 ${
                isAdminTheme ? 'bg-white/80 border border-[#d9cbff]' : ''
              } ${canManagePhoto ? 'hover:bg-white' : ''}`}
              title={canManagePhoto ? 'Edit profile photo' : undefined}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold overflow-hidden ${
                isAdminTheme ? 'bg-[#e5dbff] text-[#5f4f8f]' : 'bg-blue-100 text-blue-700'
              }`}>
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className={`hidden sm:block text-sm ${isAdminTheme ? 'text-[#5f4f8f]' : 'text-gray-700'}`}>{roleLabel}</div>
            </button>

            {canManagePhoto && menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#d9cbff] bg-white p-3 shadow-[0_12px_28px_rgba(92,64,51,0.16)] z-50">
                <div className="flex items-center gap-3 pb-3 border-b border-[#e8dcff]">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-[#e5dbff] flex items-center justify-center text-[#5f4f8f] font-semibold">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#453676] truncate">{displayName}</div>
                    <div className="text-xs text-[#7f6aa8]">{roleLabel}</div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelected}
                />

                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full rounded-lg bg-[#6d84db] px-3 py-2 text-sm font-medium text-white hover:bg-[#5f75cb] disabled:opacity-60"
                  >
                    {uploading ? 'Uploading...' : (profileImageUrl ? 'Change Photo' : 'Upload Photo')}
                  </button>
                  {profileImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploading}
                      className="w-full rounded-lg border border-[#d9cbff] px-3 py-2 text-sm text-[#5f4f8f] hover:bg-[#f4edff] disabled:opacity-60"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-[#7f6aa8]">JPG, PNG, GIF up to 2MB.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
