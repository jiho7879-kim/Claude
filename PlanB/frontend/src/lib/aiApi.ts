import api from './api'

export const nlTask = (slug, text) =>
  api.post(`/api/workspaces/${slug}/ai/nl-task/`, { text }).then(r => r.data)

export const epicBreakdown = (slug, projectId, title, description = '') =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/ai/breakdown/`, { title, description }).then(r => r.data)

export const weeklySummary = (slug) =>
  api.get(`/api/workspaces/${slug}/ai/weekly-summary/`).then(r => r.data)

export const aiChat = (slug, message, history = []) =>
  api.post(`/api/workspaces/${slug}/ai/chat/`, { message, history }).then(r => r.data)

export const noteAiAction = (slug, noteId, action) =>
  api.post(`/api/workspaces/${slug}/ai/notes/${noteId}/action/`, { action }).then(r => r.data)

export const dailyInsight = (slug) =>
  api.get(`/api/workspaces/${slug}/ai/daily-insight/`).then(r => r.data)
