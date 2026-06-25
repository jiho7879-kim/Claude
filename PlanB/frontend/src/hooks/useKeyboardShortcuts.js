import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const { slug, projectId } = useParams()
  const logout = useAuthStore(s => s.logout)

  useEffect(() => {
    let gMode = false
    let gTimer = null

    const handler = e => {
      // Ignore when typing in inputs
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        if (e.key === 'Escape') { e.target.blur(); return }
        return
      }

      // G + key sequences (Linear-style navigation)
      if (gMode) {
        gMode = false
        clearTimeout(gTimer)
        if (e.key === 'w') navigate('/')
        if (e.key === 'p' && slug) navigate(`/workspaces/${slug}`)
        if (e.key === 'c' && slug) navigate(`/workspaces/${slug}/calendar`)
        if (e.key === 'm' && slug) navigate(`/workspaces/${slug}/members`)
        if (e.key === 's' && slug && projectId) navigate(`/workspaces/${slug}/projects/${projectId}/sprints`)
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') return // handled by CommandPalette

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        gMode = true
        gTimer = setTimeout(() => { gMode = false }, 1000)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => { window.removeEventListener('keydown', handler); clearTimeout(gTimer) }
  }, [navigate, slug, projectId, logout])
}
