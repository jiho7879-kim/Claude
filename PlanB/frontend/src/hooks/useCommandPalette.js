import { useEffect } from 'react'
import { create } from 'zustand'

const usePaletteStore = create(set => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
  toggle: () => set(s => ({ open: !s.open })),
}))

export function useCommandPaletteStore() {
  return usePaletteStore()
}

export function useCommandPaletteShortcut() {
  const toggle = usePaletteStore(s => s.toggle)
  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape') usePaletteStore.getState().hide()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])
}
