import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getNotes, createNote, updateNote, deleteNote } from '../lib/notesApi'

const SAVE_DELAY = 800

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function extractTitle(content) {
  const first = content.trim().split('\n')[0] || ''
  return first.replace(/^#+\s*/, '').slice(0, 60) || '제목 없음'
}

export default function NotesPage() {
  const { slug } = useParams()
  const [notes, setNotes] = useState([])
  const [active, setActive] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const saveTimer = useRef(null)
  const editorRef = useRef(null)

  useEffect(() => {
    getNotes(slug).then(setNotes).catch(() => {})
  }, [slug])

  useEffect(() => {
    if (search === '') {
      getNotes(slug).then(setNotes).catch(() => {})
    } else {
      const t = setTimeout(() => {
        getNotes(slug, search).then(setNotes).catch(() => {})
      }, 300)
      return () => clearTimeout(t)
    }
  }, [search, slug])

  const handleNew = async () => {
    const note = await createNote(slug, { title: '', content: '', tags: [] })
    setNotes(prev => [note, ...prev])
    setActive(note)
    setTimeout(() => editorRef.current?.focus(), 50)
  }

  const scheduleSave = useCallback((updated) => {
    clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try {
        const title = extractTitle(updated.content)
        const saved = await updateNote(slug, updated.id, { title, content: updated.content })
        setNotes(prev => prev.map(n => n.id === saved.id ? saved : n))
        setActive(saved)
      } finally {
        setSaving(false)
      }
    }, SAVE_DELAY)
  }, [slug])

  const handleContentChange = (e) => {
    const content = e.target.value
    const draft = { ...active, content, title: extractTitle(content) }
    setActive(draft)
    scheduleSave(draft)
  }

  const handleDelete = async (note) => {
    await deleteNote(slug, note.id)
    setNotes(prev => prev.filter(n => n.id !== note.id))
    if (active?.id === note.id) setActive(null)
    setDeleteConfirm(null)
  }

  const handlePin = async (note) => {
    const updated = await updateNote(slug, note.id, { is_pinned: !note.is_pinned })
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n).sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return b.is_pinned - a.is_pinned
      return new Date(b.updated_at) - new Date(a.updated_at)
    }))
    if (active?.id === updated.id) setActive(updated)
  }

  const wordCount = active?.content
    ? active.content.trim().split(/\s+/).filter(Boolean).length
    : 0

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-base)', overflow: 'hidden' }}>
      {/* 사이드 패널 */}
      <div className="notes-sidebar" style={{
        width: 260, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)',
      }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>📝 노트</span>
            <button onClick={handleNew} title="새 노트" style={{
              background: 'var(--accent)', border: 'none', borderRadius: 6,
              color: '#fff', fontSize: 18, width: 28, height: 28,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>+</button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="노트 검색..."
            style={{
              width: '100%', padding: '6px 10px', borderRadius: 7,
              border: '1px solid var(--border)', background: 'var(--bg-elevated)',
              color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {notes.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              {search ? '검색 결과 없음' : '노트가 없습니다'}
            </div>
          )}
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => setActive(note)}
              style={{
                padding: '9px 12px', cursor: 'pointer', borderLeft: '3px solid',
                borderLeftColor: active?.id === note.id ? 'var(--accent)' : 'transparent',
                background: active?.id === note.id ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { if (active?.id !== note.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (active?.id !== note.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                {note.is_pinned && <span style={{ fontSize: 10 }}>📌</span>}
                <span style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {note.title || '제목 없음'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                  {note.content.slice(0, 50).replace(/\n/g, ' ') || '내용 없음'}
                </span>
                <span style={{ flexShrink: 0, marginLeft: 4 }}>{formatDate(note.updated_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 에디터 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {active ? (
          <>
            <div style={{
              padding: '8px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-surface)', flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                {saving ? '저장 중...' : `저장됨 · ${wordCount}단어`}
              </span>
              <button onClick={() => handlePin(active)} title={active.is_pinned ? '고정 해제' : '고정'} style={{
                background: active.is_pinned ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 6,
                padding: '4px 8px', cursor: 'pointer', fontSize: 12,
                color: active.is_pinned ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
                {active.is_pinned ? '📌 고정됨' : '📌 고정'}
              </button>
              <button onClick={() => setDeleteConfirm(active)} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                fontSize: 12, color: 'var(--text-muted)',
              }}>🗑</button>
            </div>
            <textarea
              ref={editorRef}
              value={active.content}
              onChange={handleContentChange}
              placeholder={'# 제목\n\n자유롭게 작성하세요...\n\n태그: #업무 #아이디어'}
              style={{
                flex: 1, border: 'none', outline: 'none', resize: 'none',
                padding: '28px 40px', fontSize: 15, lineHeight: 1.8,
                fontFamily: '"Pretendard", "Apple SD Gothic Neo", monospace',
                background: 'var(--bg-base)', color: 'var(--text-primary)',
              }}
            />
          </>
        ) : (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 16,
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 48 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>노트를 선택하거나 새로 만드세요</div>
            <div style={{ fontSize: 13 }}>작성한 노트는 AI 비서 검색에 활용됩니다</div>
            <button onClick={handleNew} style={{
              marginTop: 8, padding: '9px 22px', background: 'var(--accent)',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 14, cursor: 'pointer', fontWeight: 600,
            }}>+ 새 노트</button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
        }} onClick={() => setDeleteConfirm(null)}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '28px 32px', width: 'min(360px, 90vw)', textAlign: 'center',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>노트를 삭제할까요?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              "{deleteConfirm.title || '제목 없음'}" — 이 작업은 되돌릴 수 없습니다
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{
                padding: '8px 20px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              }}>취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{
                padding: '8px 20px', background: '#ef4444',
                border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, color: '#fff', fontWeight: 600,
              }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
