import api from './api'

const base = (slug) => `/api/workspaces/${slug}/notes/`
const folderBase = (slug) => `/api/workspaces/${slug}/notes/folders/`

export const getNotes = (slug, q = '', folder = null) => {
  const params: Record<string, string> = {}
  if (q) params.q = q
  else if (folder) params.folder = folder
  return api.get(base(slug), { params }).then(r => r.data)
}

export const createNote = (slug, data) =>
  api.post(base(slug), data).then(r => r.data)

export const updateNote = (slug, id, data) =>
  api.patch(`${base(slug)}${id}/`, data).then(r => r.data)

export const deleteNote = (slug, id) =>
  api.delete(`${base(slug)}${id}/`)

export const getNoteBacklinks = (slug, id) =>
  api.get(`${base(slug)}${id}/backlinks/`).then(r => r.data)

export const getFolders = (slug) =>
  api.get(folderBase(slug)).then(r => r.data)

export const createFolder = (slug, data) =>
  api.post(folderBase(slug), data).then(r => r.data)

export const updateFolder = (slug, id, data) =>
  api.patch(`${folderBase(slug)}${id}/`, data).then(r => r.data)

export const deleteFolder = (slug, id) =>
  api.delete(`${folderBase(slug)}${id}/`)
