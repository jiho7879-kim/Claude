import { create } from 'zustand'
import {
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/notificationApi'

export interface NotificationItem {
  id: string
  type: string
  message: string
  sub: string
  link: string
  read: boolean
  createdAt: string
  title?: string
  related_object_type?: string
  related_object_id?: string
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  slug: string | null
  initWorkspace: (slug: string) => Promise<void>
  add: (slug: string, data: Partial<NotificationItem>) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  clear: () => void
}

function fromApi(n: Record<string, unknown>): NotificationItem {
  return {
    id: n.id as string,
    type: n.notification_type as string,
    message: (n.message as string) || '',
    sub: (n.sub as string) || '',
    link: (n.link as string) || '',
    read: n.is_read as boolean,
    createdAt: n.created_at as string,
    title: n.title as string | undefined,
    related_object_type: n.related_object_type as string | undefined,
    related_object_id: n.related_object_id as string | undefined,
  }
}

function toApi(data: Partial<NotificationItem>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  if (data.type) result.notification_type = data.type
  if (data.title) result.title = data.title
  if (data.message) result.message = data.message
  if (data.sub) result.sub = data.sub
  if (data.link) result.link = data.link
  if (data.related_object_type) result.related_object_type = data.related_object_type
  if (data.related_object_id) result.related_object_id = data.related_object_id
  return result
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  slug: null,

  initWorkspace: async (slug) => {
    try {
      const data = await getNotifications(slug)
      const items = (data as Record<string, unknown>[]).map(fromApi)
      set({
        slug,
        notifications: items,
        unreadCount: items.filter(n => !n.read).length,
      })
    } catch {
      set({ slug, notifications: [], unreadCount: 0 })
    }
  },

  add: async (slug, data) => {
    try {
      const created = await createNotification(slug, toApi(data))
      const item = fromApi(created as Record<string, unknown>)
      set(s => ({
        notifications: [item, ...s.notifications].slice(0, 50),
        unreadCount: s.unreadCount + (item.read ? 0 : 1),
      }))
    } catch {
      // fallback: add locally
      const item: NotificationItem = {
        id: String(Date.now()),
        type: data.type || 'info',
        message: data.message || '',
        sub: data.sub || '',
        link: data.link || '',
        read: false,
        createdAt: new Date().toISOString(),
        ...data,
      }
      set(s => ({
        notifications: [item, ...s.notifications].slice(0, 50),
        unreadCount: s.unreadCount + 1,
      }))
    }
  },

  markRead: async (id) => {
    const { slug } = get()
    if (!slug) {
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
      return
    }
    try {
      await markNotificationRead(slug, id)
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    } catch {
      // optimistic: still update locally
      set(s => ({
        notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }))
    }
  },

  markAllRead: async () => {
    const { slug } = get()
    if (!slug) {
      set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })), unreadCount: 0 }))
      return
    }
    try {
      await markAllNotificationsRead(slug)
      set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })), unreadCount: 0 }))
    } catch {
      set(s => ({ notifications: s.notifications.map(n => ({ ...n, read: true })), unreadCount: 0 }))
    }
  },

  clear: () => set({ notifications: [], unreadCount: 0 }),
}))

export default useNotificationStore
