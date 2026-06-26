import { useState, useEffect, useRef } from 'react'
import { useParams, NavLink } from 'react-router-dom'
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
  const [mobileOpen, setMobileOpen] = useState(false)

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => { setMobileOpen(false) }, [slug])

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
      <div
        className={`mobile-overlay${mobileOpen ? ' open' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <Sidebar
        projects={projects}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="app-main" style={{ marginLeft: sidebarW, transition: 'margin-left 0.2s var(--ease)' }}>
        <div className="desktop-top-bar" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '10px 32px', background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
          <NotificationCenter />
        </div>

        <div className="mobile-top-bar">
          <button
            onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '22px', padding: '4px', lineHeight: 1, WebkitTapHighlightColor: 'transparent' }}
          >
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>P</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>PlanB</span>
          </div>
          <NotificationCenter />
        </div>

        {children}
      </div>

      {slug && (
        <nav className="mobile-bottom-nav">
          <NavLink to={`/workspaces/${slug}/home`} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">🏠</span>홈
          </NavLink>
          <NavLink to={`/workspaces/${slug}`} end className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">⊞</span>프로젝트
          </NavLink>
          <NavLink to={`/workspaces/${slug}/calendar`} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📅</span>캘린더
          </NavLink>
          <NavLink to={`/workspaces/${slug}/planner`} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">📓</span>플래너
          </NavLink>
          <button onClick={() => setMobileOpen(true)}>
            <span className="nav-icon">☰</span>더보기
          </button>
        </nav>
      )}

      <ToastContainer />
    </div>
  )
}
