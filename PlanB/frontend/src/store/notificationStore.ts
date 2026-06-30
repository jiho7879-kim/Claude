import { create } from 'zustand'

interface NotificationItem {
  id: number | string
  read: boolean
  createdAt: string
  title?: string
  message?: string
  [key: string]: unknown
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  add: (notification: Partial<NotificationItem>) => void
  markRead: (id: number | string) => void
  markAllRead: () => void
  clear: () => void
}

const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  add: (notification) => {
    const item: NotificationItem = { id: Date.now(), read: false, createdAt: new Date().toISOString(), ...notification }
    set(s => ({ notifications: [item, ...s.notifications].slice(0, 50), unreadCount: s.unreadCount + 1 }))
  },
  markRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === id)?.read ? 0 : 1)),
  })),
  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  clear: () => set({ notifications: [], unreadCount: 0 }),
}))

export default useNotificationStore
