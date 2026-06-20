import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Language } from '@/lib/translations'

interface Admin {
  id: string
  name: string
  email: string
  preferredLanguage: Language
  preferredTheme: 'light' | 'dark'
}

interface Notification {
  id: string
  message: string
  bookingId: string
  customerName: string
  serviceName: string
  time: string   // stored as ISO string (Date not serializable in JSON)
  read: boolean
}

interface AppStore {
  // Auth
  admin: Admin | null
  token: string | null
  setAuth: (admin: Admin, token: string) => void
  clearAuth: () => void

  // Language
  language: Language
  setLanguage: (lang: Language) => void

  // Theme
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  toggleTheme: () => void

  // Notifications
  notifications: Notification[]
  addNotification: (n: Omit<Notification, 'id' | 'time' | 'read'>) => void
  markAllRead: () => void
  unreadCount: () => number

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      admin: null,
      token: null,
      setAuth: (admin, token) => {
        set({ admin, token })
        // Apply saved theme preference
        if (admin.preferredTheme) {
          document.documentElement.classList.toggle('dark', admin.preferredTheme === 'dark')
        }
      },
      clearAuth: () => set({ admin: null, token: null }),

      // ── Language ──────────────────────────────────────────────────────────
      language: 'english',
      setLanguage: (lang) => set({ language: lang }),

      // ── Theme ─────────────────────────────────────────────────────────────
      theme: 'light',
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        set({ theme })
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.classList.toggle('dark', next === 'dark')
        set({ theme: next })
      },

      // ── Notifications ─────────────────────────────────────────────────────
      notifications: [],
      addNotification: (n) =>
        set((state) => ({
          notifications: [
            { ...n, id: Date.now().toString(), time: new Date().toISOString(), read: false },
            ...state.notifications.slice(0, 49),
          ],
        })),
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      // ── Sidebar ───────────────────────────────────────────────────────────
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    {
      name: 'electrofix-admin-v2',        // new key = clears old broken persisted state
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        admin:         state.admin,        // ✅ persist admin
        token:         state.token,        // ✅ persist token
        language:      state.language,
        theme:         state.theme,
        notifications: state.notifications,
        sidebarOpen:   state.sidebarOpen,
      }),
    }
  )
)

// ── Theme init on app start ───────────────────────────────────────────────────
// Called once from App.tsx useEffect — applies persisted theme to <html>
export function initTheme() {
  const stored = localStorage.getItem('electrofix-admin-v2')
  if (stored) {
    try {
      const { state } = JSON.parse(stored)
      if (state?.theme === 'dark') document.documentElement.classList.add('dark')
    } catch {}
  }
}

// ── Translation hook ──────────────────────────────────────────────────────────
import { translations } from '@/lib/translations'
export const useT = () => {
  const language = useAppStore((s) => s.language)
  return (key: keyof typeof translations.english): string =>
    (translations[language] as any)[key] || translations.english[key] || key
}
