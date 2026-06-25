import api from './api'

// Workspaces
export const getWorkspaces = () => api.get('/api/workspaces/').then(r => r.data)
export const createWorkspace = (data) => api.post('/api/workspaces/', data).then(r => r.data)
export const getWorkspace = (slug) => api.get(`/api/workspaces/${slug}/`).then(r => r.data)
export const updateWorkspace = (slug, data) => api.patch(`/api/workspaces/${slug}/`, data).then(r => r.data)
export const deleteWorkspace = (slug) => api.delete(`/api/workspaces/${slug}/`)
export const getWorkspaceMembers = (slug) => api.get(`/api/workspaces/${slug}/members/`).then(r => r.data)

// Projects
export const getProjects = (slug) => api.get(`/api/workspaces/${slug}/projects/`).then(r => r.data)
export const createProject = (slug, data) => api.post(`/api/workspaces/${slug}/projects/`, data).then(r => r.data)
export const getProject = (slug, id) => api.get(`/api/workspaces/${slug}/projects/${id}/`).then(r => r.data)
export const updateProject = (slug, id, data) =>
  api.patch(`/api/workspaces/${slug}/projects/${id}/`, data).then(r => r.data)
export const deleteProject = (slug, id) =>
  api.delete(`/api/workspaces/${slug}/projects/${id}/`)

// Tasks
export const getTasks = (slug, projectId, params = {}) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/`, { params }).then(r => r.data)
export const createTask = (slug, projectId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/tasks/`, data).then(r => r.data)
export const updateTask = (slug, projectId, taskId, data) =>
  api.patch(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/`, data).then(r => r.data)
export const deleteTask = (slug, projectId, taskId) =>
  api.delete(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/`)

// Task Comments
export const getTaskComments = (slug, projectId, taskId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/comments/`).then(r => r.data)
export const createTaskComment = (slug, projectId, taskId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/comments/`, data).then(r => r.data)

// Task Activity
export const getTaskActivity = (slug, projectId, taskId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/activity/`).then(r => r.data)

// Task Checklist
export const getChecklist = (slug, projectId, taskId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/checklist/`).then(r => r.data)
export const createChecklistItem = (slug, projectId, taskId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/checklist/`, data).then(r => r.data)
export const updateChecklistItem = (slug, projectId, taskId, itemId, data) =>
  api.patch(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}/`, data).then(r => r.data)
export const deleteChecklistItem = (slug, projectId, taskId, itemId) =>
  api.delete(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/checklist/${itemId}/`)

// Task Relations (kept for backward compat, UI removed)
export const getTaskRelations = (slug, projectId, taskId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/relations/`).then(r => r.data)
export const createTaskRelation = (slug, projectId, taskId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/relations/`, data).then(r => r.data)
export const deleteTaskRelation = (slug, projectId, taskId, relationId) =>
  api.delete(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/relations/${relationId}/`)

// Calendar Events
export const getEvents = (slug) => api.get(`/api/workspaces/${slug}/events/`).then(r => r.data)
export const createEvent = (slug, data) => api.post(`/api/workspaces/${slug}/events/`, data).then(r => r.data)
export const updateEvent = (slug, id, data) => api.patch(`/api/workspaces/${slug}/events/${id}/`, data).then(r => r.data)
export const deleteEvent = (slug, id) => api.delete(`/api/workspaces/${slug}/events/${id}/`)

// Members
export const removeWorkspaceMember = (slug, userId) => api.delete(`/api/workspaces/${slug}/members/${userId}/`)

// Presentation (no auth)
export const getPresentationEvents = (slug) => api.get(`/api/present/${slug}/events/`).then(r => r.data)

// Sprints
export const getSprints = (slug, projectId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/sprints/`).then(r => r.data)
export const createSprint = (slug, projectId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/sprints/`, data).then(r => r.data)
export const updateSprint = (slug, projectId, sprintId, data) =>
  api.patch(`/api/workspaces/${slug}/projects/${projectId}/sprints/${sprintId}/`, data).then(r => r.data)
export const deleteSprint = (slug, projectId, sprintId) =>
  api.delete(`/api/workspaces/${slug}/projects/${projectId}/sprints/${sprintId}/`)
export const getSprintStats = (slug, projectId, sprintId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/sprints/${sprintId}/stats/`).then(r => r.data)

// Saved Views
export const getSavedViews = (slug, projectId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/saved-views/`).then(r => r.data)
export const createSavedView = (slug, projectId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/saved-views/`, data).then(r => r.data)
export const deleteSavedView = (slug, projectId, viewId) =>
  api.delete(`/api/workspaces/${slug}/projects/${projectId}/saved-views/${viewId}/`)

// Analytics
export const getAnalytics = (slug, projectId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/analytics/`).then(r => r.data)

// Templates
export const getTemplates = (slug) =>
  api.get(`/api/workspaces/${slug}/templates/`).then(r => r.data)
export const createProjectFromTemplate = (slug, templateId, data) =>
  api.post(`/api/workspaces/${slug}/templates/${templateId}/apply/`, data).then(r => r.data)

// Time Entries
export const getTimeEntries = (slug, projectId, taskId) =>
  api.get(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/time-entries/`).then(r => r.data)
export const createTimeEntry = (slug, projectId, taskId, data) =>
  api.post(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/time-entries/`, data).then(r => r.data)
export const deleteTimeEntry = (slug, projectId, taskId, entryId) =>
  api.delete(`/api/workspaces/${slug}/projects/${projectId}/tasks/${taskId}/time-entries/${entryId}/`)
