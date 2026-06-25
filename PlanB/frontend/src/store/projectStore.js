import { create } from 'zustand'

const useProjectStore = create((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter(p => p.id !== id) })),
  updateProject: (updated) => set((s) => ({ projects: s.projects.map(p => p.id === updated.id ? updated : p) })),
}))

export default useProjectStore
