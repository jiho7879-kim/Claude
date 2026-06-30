import { create } from 'zustand'

interface Project {
  id: number | string
  name: string
  color?: string
  [key: string]: unknown
}

interface ProjectState {
  projects: Project[]
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  removeProject: (id: number | string) => void
  updateProject: (updated: Project) => void
}

const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((s) => ({ projects: [...s.projects, project] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter(p => p.id !== id) })),
  updateProject: (updated) => set((s) => ({ projects: s.projects.map(p => p.id === updated.id ? updated : p) })),
}))

export default useProjectStore
