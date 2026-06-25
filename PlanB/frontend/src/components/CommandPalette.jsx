import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Fuse from 'fuse.js'
import { motion, AnimatePresence } from 'framer-motion'
import { useCommandPaletteStore } from '../hooks/useCommandPalette'
import { getTasks, getProjects, getWorkspaces, createTask } from '../lib/workspaceApi'
import useAuthStore from '../store/authStore'

// ─── Shortcut Overlay ─────────────────────────────────────────────────────────
const SHORTCUTS = [
  { category: '전역', items: [
    { key: '⌘K', desc: '커맨드 팔레트 열기' },
    { key: '?', desc: '단축키 도움말' },
    { key: 'G → D', desc: '대시보드' },
    { key: 'G → C', desc: '캘린더' },
    { key: 'G → P', desc: '플래너' },
  ]},
  { category: '태스크', items: [
    { key: 'N', desc: '새 태스크 (프로젝트 내)' },
    { key: 'Space', desc: '완료 토글' },
    { key: 'E', desc: '인라인 편집' },
    { key: '↑↓', desc: '목록 이동' },
  ]},
  { category: '뷰', items: [
    { key: 'L', desc: '리스트 뷰' },
    { key: 'B', desc: '보드 뷰' },
    { key: '←→', desc: '칸반 컬럼 이동' },
  ]},
]

function ShortcutOverlay({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', width: 560, boxShadow: 'var(--shadow-lg)', maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>키보드 단축키</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {SHORTCUTS.map(section => (
            <div key={section.category}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{section.category}</div>
              {section.items.map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.desc}</span>
                  <kbd style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{item.key}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Create Task Flow ──────────────────────────────────────────────────────────
function CreateFlow({ slug, projects, onClose }) {
  const [step, setStep] = useState('title')
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [priority, setPriority] = useState('medium')
  const inputRef = useRef(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [step])

  const handleSubmit = async () => {
    if (!title.trim() || !projectId) return
    try {
      await createTask(slug, projectId, { title: title.trim(), priority, status: 'todo' })
      onClose()
    } catch {}
  }

  const STEPS = { title: '태스크 제목', project: '프로젝트', priority: '우선순위' }
  const PRIO = [['urgent','⚡ 긴급'], ['high','↑ 높음'], ['medium','→ 보통'], ['low','↓ 낮음']]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid var(--border)' }}>
        {Object.entries(STEPS).map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: step === k ? 'var(--accent)' : 'var(--bg-elevated)', color: step === k ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setStep(k)}>{v}</span>
        ))}
      </div>

      {step === 'title' && (
        <div style={{ padding: '12px 16px' }}>
          <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && title.trim()) setStep('project'); if (e.key === 'Escape') onClose() }}
            placeholder="태스크 제목을 입력하세요..."
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)', padding: '8px 0' }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Enter → 다음 단계</div>
        </div>
      )}
      {step === 'project' && (
        <div style={{ padding: '8px 0', maxHeight: 200, overflowY: 'auto' }}>
          {projects.map(p => (
            <div key={p.id} onClick={() => { setProjectId(p.id); setStep('priority') }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer', background: projectId === p.id ? 'var(--accent-muted)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = projectId === p.id ? 'var(--accent-muted)' : 'transparent'}
            >
              <span style={{ fontSize: 14 }}>📁</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}
      {step === 'priority' && (
        <div style={{ padding: '8px 0' }}>
          {PRIO.map(([v, l]) => (
            <div key={v} onClick={() => { setPriority(v) }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer', background: priority === v ? 'var(--accent-muted)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = priority === v ? 'var(--accent-muted)' : 'transparent'}
            >
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{l}</span>
            </div>
          ))}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <button onClick={handleSubmit} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              태스크 생성
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Palette ──────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
}

function PaletteItem({ item, active, onSelect }) {
  return (
    <div onClick={() => onSelect(item)}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', cursor: 'pointer', background: active ? 'var(--accent-muted)' : 'transparent', borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}` }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
      onMouseLeave={e => e.currentTarget.style.background = active ? 'var(--accent-muted)' : 'transparent'}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
        {item.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sub}</div>}
      </div>
      {item.shortcut && <kbd style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px' }}>{item.shortcut}</kbd>}
      {item.category && <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>{item.category}</span>}
    </div>
  )
}

export default function CommandPalette() {
  const { open, hide } = useCommandPaletteStore()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { logout } = useAuthStore()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('search') // 'search' | 'create'
  const [groups, setGroups] = useState([])
  const [flatResults, setFlatResults] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [cachedWorkspaces, setCachedWorkspaces] = useState([])
  const [cachedProjects, setCachedProjects] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [fuseTask, setFuseTask] = useState(null)
  const [fuseProject, setFuseProject] = useState(null)

  // Load data on open
  useEffect(() => {
    if (!open) return
    setQuery(''); setActiveIdx(0); setMode('search')
    setTimeout(() => inputRef.current?.focus(), 50)
    getWorkspaces().then(ws => { setCachedWorkspaces(ws) }).catch(() => {})
    if (slug) {
      getProjects(slug).then(ps => {
        setCachedProjects(ps)
        setFuseProject(new Fuse(ps, { keys: ['name', 'description'], threshold: 0.4 }))
        Promise.all(ps.map(p => getTasks(slug, p.id, { tree: false }).then(ts => ts.map(t => ({ ...t, projectName: p.name, projectId: p.id }))).catch(() => []))).then(results => {
          const flat = results.flat()
          setAllTasks(flat)
          setFuseTask(new Fuse(flat, { keys: ['title', 'projectName'], threshold: 0.35, includeScore: true }))
        })
      }).catch(() => {})
    }
  }, [open, slug])

  // Keyboard: global ? shortcut
  useEffect(() => {
    const handler = e => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setShowShortcuts(s => !s)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const buildGroups = useCallback((q) => {
    const q_trimmed = q.trim()
    if (!q_trimmed) {
      // Default: recent + actions
      const actions = [
        { id: 'act-task', icon: '➕', label: '새 태스크 만들기', shortcut: 'N', action: () => setMode('create'), category: '액션' },
        { id: 'act-dash', icon: '🏠', label: '대시보드', action: () => { navigate(`/workspaces/${slug}/dashboard`); hide() }, category: '이동' },
        { id: 'act-cal',  icon: '📅', label: '캘린더',   action: () => { navigate(`/workspaces/${slug}/calendar`);  hide() }, category: '이동' },
        { id: 'act-plan', icon: '📓', label: '플래너',   action: () => { navigate(`/workspaces/${slug}/planner`);   hide() }, category: '이동' },
        { id: 'act-tl',   icon: '📊', label: '타임라인', action: () => { navigate(`/workspaces/${slug}/timeline`);  hide() }, category: '이동' },
        { id: 'act-short',icon: '⌨️', label: '단축키 보기', shortcut: '?', action: () => { setShowShortcuts(true) }, category: '도움말' },
        { id: 'act-logout',icon:'🔓', label: '로그아웃',  action: () => { logout(); hide() }, category: '계정' },
      ]
      const g = [{ label: '액션', items: actions.filter(a => a.category === '액션') }, { label: '이동', items: actions.filter(a => a.category === '이동') }, { label: '기타', items: actions.filter(a => !['액션','이동'].includes(a.category)) }]
      setGroups(g)
      setFlatResults(actions)
      setActiveIdx(0)
      return
    }

    const results = []

    // Fuzzy task search
    if (fuseTask) {
      const taskHits = fuseTask.search(q_trimmed).slice(0, 6)
      if (taskHits.length > 0) results.push({ label: `태스크 (${taskHits.length})`, items: taskHits.map(h => ({ id: `t-${h.item.id}`, icon: '📋', label: h.item.title, sub: h.item.projectName, action: () => { navigate(`/workspaces/${slug}/projects/${h.item.projectId}?task=${h.item.id}`); hide() }, category: '태스크' })) })
    }

    // Fuzzy project search
    if (fuseProject) {
      const projHits = fuseProject.search(q_trimmed).slice(0, 4)
      if (projHits.length > 0) results.push({ label: `프로젝트 (${projHits.length})`, items: projHits.map(h => ({ id: `p-${h.item.id}`, icon: '📁', label: h.item.name, sub: h.item.description, action: () => { navigate(`/workspaces/${slug}/projects/${h.item.id}`); hide() }, category: '프로젝트' })) })
    }

    // Create suggestion at bottom
    results.push({ label: '액션', items: [{ id: 'create-now', icon: '➕', label: `"${q_trimmed}" 태스크 생성`, action: () => setMode('create'), category: '액션' }] })

    setGroups(results)
    setFlatResults(results.flatMap(g => g.items))
    setActiveIdx(0)
  }, [fuseTask, fuseProject, slug, navigate, hide, logout])

  useEffect(() => { if (open && mode === 'search') buildGroups(query) }, [query, open, mode, buildGroups])

  const handleKey = e => {
    if (e.key === 'Escape') { if (mode === 'create') setMode('search'); else hide() }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, flatResults.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); flatResults[activeIdx]?.action?.() }
  }

  if (!open) return (
    <AnimatePresence>
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}
    </AnimatePresence>
  )

  return (
    <>
      <AnimatePresence>{showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}</AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={hide}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 400, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
      >
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 580, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.6)', overflow: 'hidden', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 16, color: 'var(--text-muted)', flexShrink: 0 }}>{mode === 'create' ? '➕' : '🔍'}</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder={mode === 'search' ? '검색하거나 이동하세요... (? 로 단축키 도움말)' : '태스크 제목...'}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-primary)' }}
            />
            <kbd style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>Esc</kbd>
          </div>

          {/* Content */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {mode === 'create' ? (
              <CreateFlow slug={slug} projects={cachedProjects} onClose={hide} />
            ) : groups.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>결과 없음</div>
            ) : (
              groups.map(group => (
                <div key={group.label}>
                  <SectionLabel label={group.label} />
                  {group.items.map(item => {
                    const globalIdx = flatResults.indexOf(item)
                    return <PaletteItem key={item.id} item={item} active={globalIdx === activeIdx} onSelect={i => i.action?.()} />
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '7px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
            {[['↑↓', '이동'], ['Enter', '선택'], ['Esc', '닫기'], ['?', '단축키']].map(([k, l]) => (
              <span key={k} style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 4px', fontSize: 10 }}>{k}</kbd>{l}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
