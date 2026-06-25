import { create } from 'zustand'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  add: (notification) => {
    const item = { id: Date.now(), read: false, createdAt: new Date().toISOString(), ...notification }
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
