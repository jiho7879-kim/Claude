import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationCenter from './NotificationCenter'
import ToastContainer from './ui/Toast'
import { getProjects, getTasks } from '../lib/workspaceApi'
import useProjectStore from '../store/projectStore'
import useNotificationStore from '../store/notificationStore'

export default function Layout({ children }) {
  const { slug } = useParams()
  const { projects, setProjects } = useProjectStore()
  const addNotif = useNotificationStore(s => s.add)
  const clearNotif = useNotificationStore(s => s.clear)
  const seededSlug = useRef(null)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (!slug) return
    getProjects(slug).then(projs => {
      setProjects(projs)
      if (seededSlug.current === slug) return
      seededSlug.current = slug
      clearNotif()
      const today = new Date(); today.setHours(0,0,0,0)
      const soon = new Date(today); soon.setDate(soon.getDate() + 2)
      projs.forEach(p => {
        getTasks(slug, p.id, { tree: false }).then(tasks => {
          tasks.forEach(t => {
            if (!t.due_date || t.status === 'done') return
            const due = new Date(t.due_date)
            if (due < today) {
              addNotif({ type:'due_soon', message:`"${t.title}" 마감일이 지났습니다`, sub:`${p.name} · ${t.due_date}` })
            } else if (due <= soon) {
              addNotif({ type:'due_soon', message:`"${t.title}" 마감이 2일 이내입니다`, sub:`${p.name} · ${t.due_date}` })
            }
          })
        }).catch(() => {})
      })
    }).catch(() => {})
  }, [slug])

  const toggleCollapsed = () => {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  const sidebarW = collapsed ? 56 : 240

  return (
    <div className="app-layout">
      <Sidebar projects={projects} collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="app-main" style={{ marginLeft: sidebarW, transition: 'margin-left 0.2s var(--ease)' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '10px 32px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
          <NotificationCenter />
        </div>
        {children}
      </div>
      <ToastContainer />
    </div>
  )
}
