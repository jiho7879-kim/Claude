import api from './api'

const base = (slug, projectId) => `/api/workspaces/${slug}/projects/${projectId}`

export const getNotes = (slug, projectId) =>
  api.get(`${base(slug, projectId)}/notes/`).then(r => r.data)

export const createNote = (slug, projectId, data) =>
  api.post(`${base(slug, projectId)}/notes/`, data).then(r => r.data)

export const patchNote = (slug, projectId, noteId, data) =>
  api.patch(`${base(slug, projectId)}/notes/${noteId}/`, data).then(r => r.data)

export const deleteNote = (slug, projectId, noteId) =>
  api.delete(`${base(slug, projectId)}/notes/${noteId}/`)

export const getDatasets = (slug, projectId) =>
  api.get(`${base(slug, projectId)}/datasets/`).then(r => r.data)

export const createDataset = (slug, projectId, data) =>
  api.post(`${base(slug, projectId)}/datasets/`, data).then(r => r.data)

export const patchDataset = (slug, projectId, datasetId, data) =>
  api.patch(`${base(slug, projectId)}/datasets/${datasetId}/`, data).then(r => r.data)

export const deleteDataset = (slug, projectId, datasetId) =>
  api.delete(`${base(slug, projectId)}/datasets/${datasetId}/`)

export const getRefs = (slug, projectId) =>
  api.get(`${base(slug, projectId)}/refs/`).then(r => r.data)

export const createRef = (slug, projectId, data) =>
  api.post(`${base(slug, projectId)}/refs/`, data).then(r => r.data)

export const deleteRef = (slug, projectId, refId) =>
  api.delete(`${base(slug, projectId)}/refs/${refId}/`)

export const lookupDoi = (slug, projectId, doi) =>
  api.get(`${base(slug, projectId)}/refs/doi-lookup/`, { params: { doi } }).then(r => r.data)
