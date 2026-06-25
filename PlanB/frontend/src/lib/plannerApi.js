import api from './api'

const base = (slug) => `/api/workspaces/${slug}/planner`

export const getEntries     = (slug, params)         => api.get(`${base(slug)}/entries/`, { params }).then(r => r.data)
export const getEntry       = (slug, date)           => api.get(`${base(slug)}/entries/${date}/`).then(r => r.data)
export const upsertEntry    = (slug, data)           => api.post(`${base(slug)}/entries/`, data).then(r => r.data)
export const patchEntry     = (slug, date, data)     => api.patch(`${base(slug)}/entries/${date}/`, data).then(r => r.data)

export const getBlocks      = (slug, date)           => api.get(`${base(slug)}/entries/${date}/blocks/`).then(r => r.data)
export const createBlock    = (slug, date, data)     => api.post(`${base(slug)}/entries/${date}/blocks/`, data).then(r => r.data)
export const patchBlock     = (slug, date, id, data) => api.patch(`${base(slug)}/entries/${date}/blocks/${id}/`, data).then(r => r.data)
export const deleteBlock    = (slug, date, id)       => api.delete(`${base(slug)}/entries/${date}/blocks/${id}/`)

export const getHabits      = (slug)                => api.get(`${base(slug)}/habits/`).then(r => r.data)
export const createHabit    = (slug, data)           => api.post(`${base(slug)}/habits/`, data).then(r => r.data)
export const patchHabit     = (slug, id, data)       => api.patch(`${base(slug)}/habits/${id}/`, data).then(r => r.data)
export const deleteHabit    = (slug, id)             => api.delete(`${base(slug)}/habits/${id}/`)
export const toggleHabitLog = (slug, id, date)       => api.post(`${base(slug)}/habits/${id}/log/`, { date }).then(r => r.data)

export const getHabitLogs    = (slug, id, start, end) => api.get(`${base(slug)}/habits/${id}/logs/`, { params: { start, end } }).then(r => r.data)

export const getWeekEntries  = (slug, year, week)    => api.get(`${base(slug)}/weeks/${year}/${week}/entries/`).then(r => r.data)
export const getWeekReview   = (slug, year, week)    => api.get(`${base(slug)}/weeks/${year}/${week}/review/`).then(r => r.data)
export const patchWeekReview = (slug, year, week, data) => api.patch(`${base(slug)}/weeks/${year}/${week}/review/`, data).then(r => r.data)
