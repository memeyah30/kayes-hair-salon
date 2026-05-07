import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import api from '../utils/api'
import NotificationsBell from './NotificationsBell'
import { resolveAssetUrl } from '../utils/runtime'
import imageCompression from 'browser-image-compression'

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  customer: 'Customer',
}

const getStoredUserType = () => (
  sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'customer'
)

const parseStoredUser = () => {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user')
    return JSON.parse(raw || '{}')
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
  return resolveAssetUrl(imagePath)
}

const Navbar = ({
  userType: propUserType,
  title = 'Dashboard',
  hideUserBadge = false,
  onMenuClick,
  userBadgeName = '',
  userBadgeSubtitle = '',
}) => {
  const [userType, setUserType] = useState(propUserType || getStoredUserType)

  useEffect(() => {
    if (propUserType) {
      setUserType(propUserType)
    }
  }, [propUserType])
  const [user, setUser] = useState(parseStoredUser)
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const headerRef = useRef(null)
  const fileInputRef = useRef(null)
  const menuRef = useRef(null)
  const isAdminTheme = true
  const roleLabel = ROLE_LABELS[userType] || 'User'
  const resolvedBadgeName = String(userBadgeName || '').trim()
  const resolvedBadgeSubtitle = String(userBadgeSubtitle || '').trim()
  const displayName = resolvedBadgeName || user?.name || roleLabel
  const badgeSubtitle = resolvedBadgeSubtitle || roleLabel
  const initials = getInitials(displayName)
  const profileImageUrl = resolveImageUrl(user?.image_url || user?.image)
  const salonLogoUrl = resolveAssetUrl('logo.png')
  const canManagePhoto = userType === 'manager'

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

  useEffect(() => {
    if (typeof window === 'undefined' || !headerRef.current) return undefined

    const root = document.documentElement
    const syncNavbarHeight = () => {
      const nextHeight = headerRef.current?.offsetHeight
      if (nextHeight) {
        root.style.setProperty('--dashboard-navbar-height', `${nextHeight}px`)
      }
    }

    syncNavbarHeight()

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(syncNavbarHeight)
      : null

    if (resizeObserver && headerRef.current) {
      resizeObserver.observe(headerRef.current)
    }

    window.addEventListener('resize', syncNavbarHeight)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', syncNavbarHeight)
    }
  }, [title, badgeSubtitle, displayName, roleLabel, profileImageUrl, hideUserBadge, menuOpen, uploading, userType])

  const handleToggleSidebar = () => {
    if (typeof onMenuClick === 'function') {
      onMenuClick()
      return
    }

    window.dispatchEvent(new CustomEvent('sidebar:toggle'))
  }

  const syncStoredUser = (nextUser, nextType) => {
    if (nextUser) {
      const serializedUser = JSON.stringify(nextUser)
      sessionStorage.setItem('user', serializedUser)
      localStorage.setItem('user', serializedUser)
      setUser(nextUser)
    }
    if (nextType) {
      sessionStorage.setItem('userType', nextType)
      localStorage.setItem('userType', nextType)
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

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Image size must be less than 15MB before compression.')
      return
    }

    let fileToUpload = file
    try {
      toast.info('Processing image...', { autoClose: 1500, toastId: 'compressing-img' })
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        initialQuality: 0.8
      }
      fileToUpload = await imageCompression(file, options)
    } catch (error) {
      console.error('Image compression error:', error)
      toast.error('Failed to process image.')
      return
    }

    const formData = new FormData()
    formData.append('image', fileToUpload)

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
      ref={headerRef}
      className={`sticky top-0 z-30 flex w-full items-center justify-between border-b px-3 py-3 transition-[padding,transform] duration-300 ease-out sm:px-4 lg:px-6 ${
        isAdminTheme
          ? 'bg-gradient-to-r from-[#5f3eb4] via-[#6c49c4] to-[#7f5fd1] border-white/10 shadow-[0_14px_34px_rgba(35,12,88,0.18)] supports-[backdrop-filter]:backdrop-blur-md'
          : 'bg-white/95 shadow supports-[backdrop-filter]:backdrop-blur-md'
      }`}
    >
      <div className="flex flex-1 min-w-0 items-center gap-1 sm:gap-3">
        <button
          type="button"
          onClick={handleToggleSidebar}
          className={`tap-safe shrink-0 rounded-xl p-2 transition ${
            isAdminTheme ? 'hover:bg-white/16 text-white' : 'hover:bg-[#f4edff] text-gray-700'
          }`}
          aria-label="Toggle side panel"
          title="Toggle side panel"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-1 min-w-0 items-center gap-1 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border sm:h-10 sm:w-10 ${
              isAdminTheme
                ? 'border-white/16 bg-white/18 shadow-[0_10px_24px_rgba(33,10,86,0.14)]'
                : 'border-[#e6dcff] bg-white'
            }`}>
              <img
                src={salonLogoUrl}
                alt="Kaye's Hair Salon logo"
                className="h-7 w-7 object-contain sm:h-8 sm:w-8"
              />
            </span>
            <div className={`flex-1 min-w-0 truncate font-bold text-[10px] sm:text-sm lg:text-lg ${isAdminTheme ? 'text-white' : 'text-gray-900'}`}>
              Kaye&apos;s Hair Salon and Spa
            </div>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
        <div
          className={`hidden lg:flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
            isAdminTheme
              ? 'bg-white/18 border-white/16 text-white shadow-[0_10px_24px_rgba(33,10,86,0.16)]'
              : 'bg-white border-gray-200'
          }`}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
          </svg>
          <input
            type="text"
            placeholder="Search"
            className={`bg-transparent outline-none w-32 ${isAdminTheme ? 'placeholder:text-white/72' : 'placeholder:text-gray-400'}`}
          />
        </div>
        <NotificationsBell userType={userType} isAdminTheme={isAdminTheme} />
        {!hideUserBadge && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                if (!canManagePhoto || uploading) return
                setMenuOpen((prev) => !prev)
              }}
              className={`flex items-center gap-2 rounded-full px-2 py-1 ${
                isAdminTheme ? 'bg-white/18 border border-white/14 shadow-[0_10px_24px_rgba(33,10,86,0.14)]' : ''
              } ${canManagePhoto ? (isAdminTheme ? 'hover:bg-white/24' : 'hover:bg-white') : ''}`}
              title={canManagePhoto ? 'Edit profile photo' : undefined}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold overflow-hidden ${
                isAdminTheme ? 'bg-white text-[#5d41b7]' : 'bg-blue-100 text-blue-700'
              }`}>
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className={`hidden sm:flex min-w-0 flex-col leading-tight ${isAdminTheme ? 'text-white' : 'text-gray-700'}`}>
                <span className="max-w-[12rem] truncate text-sm font-semibold">{displayName}</span>
                <span className={`max-w-[12rem] truncate text-[11px] ${isAdminTheme ? 'text-white/74' : 'text-[#7f6aa8]'}`}>
                  {badgeSubtitle}
                </span>
              </div>
            </button>

            {canManagePhoto && menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-[22px] border border-[#dbcfff] bg-[linear-gradient(180deg,#fdfbff_0%,#f4edff_100%)] p-3 shadow-[0_18px_36px_rgba(41,21,93,0.2)] z-50">
                <div className="flex items-center gap-3 pb-3 border-b border-[#ebe1ff]">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-[#e8ddff] flex items-center justify-center text-[#5b3bb0] font-semibold">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt={`${displayName} profile`} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#3a2868] truncate">{displayName}</div>
                    <div className="text-xs text-[#8068b6]">{roleLabel}</div>
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
                    className="w-full rounded-xl bg-gradient-to-r from-[#6f4ed0] to-[#8867df] px-3 py-2 text-sm font-medium text-white hover:from-[#6546c4] hover:to-[#7f5ed4] disabled:opacity-60"
                  >
                    {uploading ? 'Uploading...' : (profileImageUrl ? 'Change Photo' : 'Upload Photo')}
                  </button>
                  {profileImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={uploading}
                      className="w-full rounded-xl border border-[#dbcfff] px-3 py-2 text-sm text-[#5c3fb1] hover:bg-[#f3ecff] disabled:opacity-60"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-[#8068b6]">JPG, PNG, GIF up to 2MB.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

export default Navbar
