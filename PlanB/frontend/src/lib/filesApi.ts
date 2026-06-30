import api from './api'

const base = (slug: string) => `/api/workspaces/${slug}/files`

export const uploadFile = (
  slug: string,
  file: File,
  task_id?: string,
  note_id?: string,
) => {
  const fd = new FormData()
  fd.append('file', file)
  if (task_id) fd.append('task_id', task_id)
  if (note_id) fd.append('note_id', note_id)
  return api.post(`${base(slug)}/upload/`, fd).then(r => r.data)
}

export const getFiles = (slug: string) =>
  api.get(`${base(slug)}/files/`).then(r => r.data)

export const getFileDownloadUrl = (slug: string, fileId: string) =>
  `${base(slug)}/files/${fileId}/`

export const deleteFile = (slug: string, fileId: string) =>
  api.delete(`${base(slug)}/files/${fileId}/`)
