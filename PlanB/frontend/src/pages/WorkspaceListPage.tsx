import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/Spinner'
import useToastStore from '../store/toastStore'
import { getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } from '../lib/workspaceApi'

const PALETTE = [
  '#6366f1','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16',
]

function ColorSwatch({ color, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ width: 24, height: 24, borderRadius: '50%', background: color, border: '2px solid var(--bg-surface)', cursor: 'pointer', boxShadow: '0 0 0 1px var(--border)', display: 'block' }}
        title="색상 변경"
      />
      {open && (
        <>
          <div onClick={e => { e.stopPropagation(); setOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 30, left: 0, zIndex: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 4, boxShadow: 'var(--shadow-md)' }}>
            {PALETTE.map(c => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false) }} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: c === color ? '2px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ModalShell({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', width: 420, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
  borderRadius: 'var(--r-md)', fontSize: '13px', marginBottom: '14px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)',
} as React.CSSProperties
const labelStyle = { display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }

function WorkspaceFormModal({ title, initial, onClose, onSave }) {
  const [form, setForm] = useState(initial)
  const isEdit = !!initial.slug
  const autoSlug = name => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <ModalShell title={title} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave(form) }}>
        <label style={labelStyle}>이름</label>
        <input
          style={inputStyle} value={form.name} required placeholder="My Team"
          onChange={e => {
            const n = e.target.value
            setForm(f => ({ ...f, name: n, slug: isEdit ? f.slug : autoSlug(n) }))
          }}
        />
        <label style={labelStyle}>슬러그 (URL)</label>
        <input style={inputStyle} value={form.slug} required placeholder="my-team" onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
        <label style={labelStyle}>색상</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <ColorSwatch color={form.color || PALETTE[0]} onChange={c => setForm(f => ({ ...f, color: c }))} />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{form.color || PALETTE[0]}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px' }}>취소</button>
          <button type="submit" style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>저장</button>
        </div>
      </form>
    </ModalShell>
  )
}

function DeleteConfirmModal({ name, onClose, onConfirm }) {
  return (
    <ModalShell title="워크스페이스 삭제" onClose={onClose}>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 6 }}>
        <strong style={{ color: 'var(--text-primary)' }}>{name}</strong> 워크스페이스를 삭제하시겠습니까?
      </p>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 24 }}>
        이 작업은 되돌릴 수 없으며 모든 프로젝트와 태스크가 영구 삭제됩니다.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onClose} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px' }}>취소</button>
        <button onClick={onConfirm} style={{ padding: '7px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>삭제</button>
      </div>
    </ModalShell>
  )
}

export default function WorkspaceListPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editWs, setEditWs] = useState(null)
  const [deleteWs, setDeleteWs] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    getWorkspaces().then(setWorkspaces).catch(() => toast('불러오기 실패', 'error')).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handler = () => setMenuOpen(null)
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [menuOpen])

  const handleCreate = async form => {
    try {
      const ws = await createWorkspace(form)
      setWorkspaces(prev => [...prev, ws])
      setShowCreate(false)
      toast(`"${ws.name}" 워크스페이스 생성됨`, 'success')
      navigate(`/workspaces/${ws.slug}`)
    } catch { toast('생성 실패', 'error') }
  }

  const handleEdit = async form => {
    const oldSlug = editWs.slug
    try {
      const updated = await updateWorkspace(oldSlug, form)
      setWorkspaces(prev => prev.map(w => w.id === updated.id ? updated : w))
      setEditWs(null)
      toast('수정됨', 'success')
      if (updated.slug !== oldSlug) navigate(`/workspaces/${updated.slug}`)
    } catch { toast('수정 실패', 'error') }
  }

  const handleDelete = async () => {
    try {
      await deleteWorkspace(deleteWs.slug)
      setWorkspaces(prev => prev.filter(w => w.id !== deleteWs.id))
      setDeleteWs(null)
      toast(`"${deleteWs.name}" 삭제됨`, 'success')
    } catch { toast('삭제 실패', 'error') }
  }

  if (loading) return <div className="app-content"><PageLoader /></div>

  return (
    <div className="app-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>워크스페이스</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>팀 워크스페이스를 선택하거나 새로 만드세요</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          + 새 워크스페이스
        </button>
      </div>

      {workspaces.length === 0 ? (
        <EmptyState icon="🏢" title="워크스페이스가 없습니다" description="팀을 위한 워크스페이스를 만들어 프로젝트를 시작하세요." action="+ 새 워크스페이스" onAction={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
          {workspaces.map((ws, i) => {
            const color = ws.color || PALETTE[i % PALETTE.length]
            return (
              <div
                key={ws.id}
                onClick={() => navigate(`/workspaces/${ws.slug}`)}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderTop: `3px solid ${color}`, borderRadius: 'var(--r-lg)', padding: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'transform var(--duration) var(--ease), box-shadow var(--duration) var(--ease)', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {ws.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/{ws.slug}</div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(ws.id === menuOpen ? null : ws.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '2px 6px', borderRadius: 'var(--r-sm)', flexShrink: 0 }}
                >⋮</button>
                {menuOpen === ws.id && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 56, right: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-md)', zIndex: 50, minWidth: 130, overflow: 'hidden' }}>
                    <button onClick={() => { setEditWs(ws); setMenuOpen(null) }} style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}>✏️ 편집</button>
                    <button onClick={() => { setDeleteWs(ws); setMenuOpen(null) }} style={{ width: '100%', padding: '9px 14px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '13px', textAlign: 'left' }}>🗑 삭제</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <WorkspaceFormModal
          title="새 워크스페이스"
          initial={{ name: '', slug: '', color: PALETTE[workspaces.length % PALETTE.length] }}
          onClose={() => setShowCreate(false)}
          onSave={handleCreate}
        />
      )}
      {editWs && (
        <WorkspaceFormModal
          title="워크스페이스 편집"
          initial={{ name: editWs.name, slug: editWs.slug, color: editWs.color || PALETTE[0] }}
          onClose={() => setEditWs(null)}
          onSave={handleEdit}
        />
      )}
      {deleteWs && (
        <DeleteConfirmModal
          name={deleteWs.name}
          onClose={() => setDeleteWs(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
