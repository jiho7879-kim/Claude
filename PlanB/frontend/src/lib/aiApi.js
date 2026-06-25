import api from './api'

export const nlTask = (slug, text) =>
  api.post(`/api/workspaces/${slug}/ai/nl-task/`, { text }).then(r => r.data)

export const epicBreakdown = (slug, projectId, title, description = '') =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/ai/breakdown/`, { title, description }).then(r => r.data)

export const weeklySummary = (slug) =>
  api.get(`/api/workspaces/${slug}/ai/weekly-summary/`).then(r => r.data)
