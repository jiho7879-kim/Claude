import api from './api'

const base = (slug, projectId) => `/api/workspaces/${slug}/projects/${projectId}`

export const getRules = (slug, projectId) =>
  api.get(`${base(slug, projectId)}/rules/`).then(r => r.data)

export const createRule = (slug, projectId, data) =>
  api.post(`${base(slug, projectId)}/rules/`, data).then(r => r.data)

export const updateRule = (slug, projectId, ruleId, data) =>
  api.patch(`${base(slug, projectId)}/rules/${ruleId}/`, data).then(r => r.data)

export const deleteRule = (slug, projectId, ruleId) =>
  api.delete(`${base(slug, projectId)}/rules/${ruleId}/`)

export const getRuleLogs = (slug, projectId, ruleId) =>
  api.get(`${base(slug, projectId)}/rules/${ruleId}/logs/`).then(r => r.data)
