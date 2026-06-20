import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarCheck, Wrench,
  Bell, Sun, Moon, Languages, LogOut, Menu, X,
  Zap, ChevronDown, Settings, CheckCheck
} from 'lucide-react'
import { useAppStore, useT } from '@/store/appStore'
import { io } from 'socket.io-client'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import type { Language } from '@/lib/translations'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard'  as const },
  { to: '/bookings',  icon: CalendarCheck,   key: 'bookings'   as const },
  { to: '/services',  icon: Wrench,          key: 'services'   as const },
  { to: '/customers', icon: Users,           key: 'customers'  as const },
  { to: '/settings',  icon: Settings,        key: 'settings'   as const },
]

const LANGS: { value: Language; label: string; flag: string }[] = [
  { value: 'english',  label: 'English',  flag: '🇬🇧' },
  { value: 'hindi',    label: 'हिंदी',    flag: '🇮🇳' },
  { value: 'hinglish', label: 'Hinglish', flag: '🔤' },
]

// ─── Floating popup that auto-dismisses ───────────────────────────────────────
interface PopupData {
  id: string
  bookingId: string
  customerName: string
  serviceName: string
}

function BookingPopup({ popup, onClose, onView }: {
  popup: PopupData
  onClose: (id: string) => void
  onView: (id: string) => void
}) {
  const [progress, setProgress] = useState(100)
  const DURATION = 7000

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100)
      setProgress(remaining)
      if (remaining === 0) { clearInterval(timer); onClose(popup.id) }
    }, 50)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-80 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--border)]">
        <div
          className="h-full bg-primary-500 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 animate-bounce-sm">
          <Bell size={18} className="text-primary-500" />
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[var(--text)]">🔔 New Booking!</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            <span className="font-medium text-[var(--text)]">{popup.customerName}</span>
            {' '}booked{' '}
            <span className="font-medium text-[var(--text)]">{popup.serviceName}</span>
          </p>
          <p className="text-xs font-mono text-primary-500 mt-0.5">#{popup.bookingId}</p>
          <button
            onClick={() => onView(popup.id)}
            className="mt-2 text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline transition-colors"
          >
            View Booking →
          </button>
        </div>
        {/* Close */}
        <button
          onClick={() => onClose(popup.id)}
          className="p-1 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
export default function Layout() {
  const {
    admin, clearAuth, theme, toggleTheme, language, setLanguage,
    notifications, addNotification, markAllRead, unreadCount,
    sidebarOpen, setSidebarOpen,
  } = useAppStore()
  const t = useT()
  const navigate = useNavigate()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const [popups, setPopups] = useState<PopupData[]>([])
  const notifRef = useRef<HTMLDivElement>(null)
  const langRef  = useRef<HTMLDivElement>(null)

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')
    const socket = io(url, { reconnectionAttempts: 5, transports: ['websocket', 'polling'] })

    socket.on('new_booking', (data: any) => {
      const id = Date.now().toString()

      // 1. Add to persistent notification list
      addNotification({
        message: 'New booking received!',
        bookingId: data.bookingId || id,
        customerName: data.customerName || 'Customer',
        serviceName:  data.serviceName  || 'Service',
      })

      // 2. Show floating popup
      setPopups(prev => [...prev, {
        id,
        bookingId:    data.bookingId    || id,
        customerName: data.customerName || 'Customer',
        serviceName:  data.serviceName  || 'Service',
      }])

      // 3. Audio beep
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(); osc.stop(ctx.currentTime + 0.5)
      } catch {}
    })

    return () => { socket.disconnect() }
  }, [])

  // ── Outside click closes dropdowns ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (langRef.current  && !langRef.current.contains(e.target as Node))  setShowLang(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const closePopup = (id: string) => setPopups(prev => prev.filter(p => p.id !== id))
  const viewPopup  = (id: string) => { navigate('/bookings'); closePopup(id) }
  const unread = unreadCount()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-[var(--surface)] border-r border-[var(--border)] transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-60' : 'w-0 overflow-hidden',
        'lg:relative lg:translate-x-0',
        !sidebarOpen && 'lg:w-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)] flex-shrink-0">
          <img src="/logo-navbar.png" alt="ElectroFix" className="h-9 w-auto" />
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, key }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => clsx('sidebar-link', isActive && 'active')}>
              <Icon size={17} />
              <span className="whitespace-nowrap">{t(key as any)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Admin info */}
        <div className="px-3 py-4 border-t border-[var(--border)] space-y-1">
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-bold text-sm flex items-center justify-center flex-shrink-0">
              {admin?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text)] truncate">{admin?.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{admin?.email}</p>
            </div>
          </div>
          <button onClick={() => { clearAuth(); navigate('/login') }}
            className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={17} />
            <span className="whitespace-nowrap">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top navbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 bg-[var(--surface)] border-b border-[var(--border)] flex-shrink-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <div className="flex items-center gap-1">
            {/* Language */}
            <div ref={langRef} className="relative">
              <button onClick={() => setShowLang(!showLang)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] text-sm transition-colors">
                <Languages size={16} />
                <span className="hidden sm:inline text-xs">{LANGS.find(l => l.value === language)?.flag}</span>
                <ChevronDown size={12} />
              </button>
              {showLang && (
                <div className="absolute right-0 top-full mt-1 w-40 card py-1 shadow-xl z-50 animate-fade-in">
                  {LANGS.map(lang => (
                    <button key={lang.value}
                      onClick={() => { setLanguage(lang.value); setShowLang(false) }}
                      className={clsx('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg)] transition-colors',
                        language === lang.value ? 'text-primary-500 font-semibold' : 'text-[var(--text)]')}>
                      <span>{lang.flag}</span><span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme */}
            <button onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead() }}
                className="relative p-2 rounded-lg hover:bg-[var(--border)] text-[var(--text-muted)] transition-colors"
              >
                <Bell size={17} className={unread > 0 ? 'text-primary-500' : ''} />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse-dot">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 card overflow-hidden shadow-xl z-50 animate-fade-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <p className="font-semibold text-sm text-[var(--text)]">{t('notifications')}</p>
                    {notifications.length > 0 && (
                      <button onClick={markAllRead}
                        className="flex items-center gap-1 text-xs text-primary-500 hover:underline">
                        <CheckCheck size={13} /> All read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-[var(--text-muted)]">
                        <Bell size={30} className="opacity-20 mb-2" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <button key={n.id}
                          onClick={() => { navigate('/bookings'); setShowNotifs(false) }}
                          className={clsx(
                            'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--border)] last:border-0',
                            'hover:bg-[var(--bg)]',
                            !n.read && 'bg-primary-50/60 dark:bg-primary-900/10'
                          )}>
                          <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                            n.read ? 'bg-[var(--border)]' : 'bg-primary-500')} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text)] truncate">
                              {n.customerName} — {n.serviceName}
                            </p>
                            <p className="text-xs font-mono text-primary-500 mt-0.5">#{n.bookingId}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                              {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* ── Floating notification popups (stacked) ───────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 items-end">
        {popups.map(popup => (
          <BookingPopup key={popup.id} popup={popup} onClose={closePopup} onView={viewPopup} />
        ))}
      </div>
    </div>
  )
}
