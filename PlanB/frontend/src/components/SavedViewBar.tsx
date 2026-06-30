import { useEffect, useState } from 'react'
import { createSavedView, deleteSavedView, getSavedViews } from '../lib/workspaceApi'
import useToastStore from '../store/toastStore'

export default function SavedViewBar({ slug, projectId, currentFilters, viewType, onApply }) {
  const [views, setViews] = useState([])
  const [saving, setSaving] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [activeViewId, setActiveViewId] = useState(null)
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    if (!slug || !projectId) return
    getSavedViews(slug, projectId).then(setViews).catch(() => {})
  }, [slug, projectId])

  const handleSave = async () => {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      const created = await createSavedView(slug, projectId, {
        name: nameInput.trim(),
        filters: currentFilters,
        view_type: viewType,
        is_shared: false,
      })
      setViews(prev => [...prev, created])
      setNameInput('')
      setShowForm(false)
      toast('뷰가 저장되었습니다', 'success')
    } catch {
      toast('저장 실패', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleApply = (view) => {
    setActiveViewId(view.id)
    onApply(view.filters, view.view_type)
  }

  const handleDelete = async (e, view) => {
    e.stopPropagation()
    try {
      await deleteSavedView(slug, projectId, view.id)
      setViews(prev => prev.filter(v => v.id !== view.id))
      if (activeViewId === view.id) setActiveViewId(null)
      toast('뷰 삭제됨', 'info')
    } catch {
      toast('삭제 실패', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 0' }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        저장된 뷰
      </span>

      {views.map(view => (
        <button
          key={view.id}
          onClick={() => handleApply(view)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: '1px solid', transition: 'all var(--duration) var(--ease)',
            background: activeViewId === view.id ? 'var(--accent-muted)' : 'var(--bg-elevated)',
            borderColor: activeViewId === view.id ? 'var(--border-focus)' : 'var(--border)',
            color: activeViewId === view.id ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {view.name}
          <span
            onClick={(e) => handleDelete(e, view)}
            style={{ marginLeft: 2, opacity: 0.5, fontSize: 10, cursor: 'pointer' }}
            title="삭제"
          >✕</span>
        </button>
      ))}

      {showForm ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowForm(false) }}
            placeholder="뷰 이름..."
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-focus)', borderRadius: 'var(--r-sm)',
              color: 'var(--text)', padding: '3px 8px', fontSize: 12, outline: 'none', width: 120
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !nameInput.trim()}
            style={{
              padding: '3px 10px', borderRadius: 'var(--r-sm)', fontSize: 12,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? '…' : '저장'}
          </button>
          <button
            onClick={() => setShowForm(false)}
            style={{ padding: '3px 8px', borderRadius: 'var(--r-sm)', fontSize: 12, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}
          >
            취소
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: '1px dashed var(--border)', background: 'transparent',
            color: 'var(--text-muted)', transition: 'all var(--duration) var(--ease)',
          }}
          title="현재 필터를 뷰로 저장"
        >
          + 뷰 저장
        </button>
      )}
    </div>
  )
}
