import { create } from 'zustand'

let nextId = 0

interface Toast {
  id: number
  message: string
  type: string
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: string, duration?: number) => void
  remove: (id: number) => void
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration = 3500) => {
    const id = ++nextId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export default useToastStore
