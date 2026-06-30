import api from './api'

export const getNotifications = (slug) =>
  api.get(`/api/workspaces/${slug}/notifications/`).then(r => r.data)

export const createNotification = (slug, data) =>
  api.post(`/api/workspaces/${slug}/notifications/`, data).then(r => r.data)

export const getUnreadCount = (slug) =>
  api.get(`/api/workspaces/${slug}/notifications/unread-count/`).then(r => r.data)

export const markAllNotificationsRead = (slug) =>
  api.post(`/api/workspaces/${slug}/notifications/read-all/`).then(r => r.data)

export const markNotificationRead = (slug, id) =>
  api.patch(`/api/workspaces/${slug}/notifications/${id}/`).then(r => r.data)
