import api from './api'

const base = (slug) => `/api/workspaces/${slug}/notes/`

export const getNotes = (slug, q = '') =>
  api.get(base(slug), { params: q ? { q } : {} }).then(r => r.data)

export const createNote = (slug, data) =>
  api.post(base(slug), data).then(r => r.data)

export const updateNote = (slug, id, data) =>
  api.patch(`${base(slug)}${id}/`, data).then(r => r.data)

export const deleteNote = (slug, id) =>
  api.delete(`${base(slug)}${id}/`)
