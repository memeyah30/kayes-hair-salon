import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

const POLL_INTERVAL_MS = 5000

const formatNotificationTimestamp = (value) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }

    const now = ctx.currentTime
    playTone(880, now, 0.2)             // First ding (A5)
    playTone(1108.73, now + 0.15, 0.4)  // Second higher ding (C#6)
  } catch (err) {
    console.error('Audio play failed:', err)
  }
}

const NotificationsBell = ({ userType, isAdminTheme = true }) => {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const previousUnreadCountRef = useRef(0)

  const isManagementUser = userType === 'admin' || userType === 'manager'

  useEffect(() => {
    if (!isManagementUser) {
      setNotifications([])
      setUnreadCount(0)
      setOpen(false)
      return undefined
    }

    let isMounted = true
    let hasLoadedOnce = false

    const loadNotifications = async () => {
      try {
        if (isMounted && !hasLoadedOnce) {
          setLoading(true)
        }

        const response = await api.get('/admin/notifications')
        if (!isMounted) return

        const newUnreadCount = Number(response.data?.unread_count || 0)

        // Play sound if there are new unread notifications and it's not the first load
        if (hasLoadedOnce && newUnreadCount > previousUnreadCountRef.current) {
          playNotificationSound()
        }

        previousUnreadCountRef.current = newUnreadCount
        setNotifications(response.data?.notifications || [])
        setUnreadCount(newUnreadCount)
        hasLoadedOnce = true
      } catch (error) {
        if (!isMounted) return
        console.error('Failed to fetch notifications:', error)
      } finally {
        hasLoadedOnce = true
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadNotifications()
    const intervalId = window.setInterval(loadNotifications, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [isManagementUser, userType])

  useEffect(() => {
    if (!open) return undefined

    const handleOutsideClick = (event) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target)) return
      setOpen(false)
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  if (!isManagementUser) {
    return null
  }

  const handleNotificationClick = async (notification) => {
    const wasUnread = !notification.is_read

    setNotifications((prev) => prev.map((item) => (
      item.id === notification.id
        ? { ...item, is_read: true }
        : item
    )))

    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    try {
      if (wasUnread) {
        await api.patch(`/admin/notifications/${notification.id}/read`)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    } finally {
      setOpen(false)
      navigate('/admin/appointments')
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`tap-safe relative flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
          isAdminTheme
            ? 'border-white/14 bg-white/18 text-white shadow-[0_10px_24px_rgba(33,10,86,0.14)] hover:bg-white/24'
            : 'border-[#e6dcff] bg-white text-[#5d41b7] hover:bg-[#f8f3ff]'
        }`}
        aria-label="Open notifications"
        title="Notifications"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.42V11a6 6 0 1 0-12 0v3.18a2 2 0 0 1-.59 1.41L4 17h5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5f7a] px-1.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(255,95,122,0.32)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[22rem] overflow-hidden rounded-[24px] border border-[#dbcfff] bg-[linear-gradient(180deg,#fdfbff_0%,#f4edff_100%)] shadow-[0_18px_36px_rgba(41,21,93,0.2)]">
          <div className="flex items-center justify-between border-b border-[#ebe1ff] px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[#3a2868]">Notifications</div>
              <div className="text-xs text-[#8068b6]">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </div>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-sm text-[#8068b6]">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[#8068b6]">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleNotificationClick(notification)}
                  className={`block w-full border-b border-[#ebe1ff] px-4 py-3 text-left transition last:border-b-0 ${
                    notification.is_read
                      ? 'bg-transparent hover:bg-white/70'
                      : 'bg-[#efe7ff] hover:bg-[#e8dcff]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[#3a2868]">
                          {notification.title}
                        </span>
                        {!notification.is_read && (
                          <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#7f5fd1]" />
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-[#6d5a9c]">
                        {notification.message}
                      </p>
                    </div>
                    <span className="shrink-0 pt-0.5 text-[11px] text-[#8d7ab8]">
                      {formatNotificationTimestamp(notification.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
