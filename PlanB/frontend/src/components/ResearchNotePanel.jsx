import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getNotes, createNote, patchNote, deleteNote } from '../lib/researchApi'
import useToastStore from '../store/toastStore'

const today = () => new Date().toISOString().slice(0, 10)

function NoteCard({ note, slug, projectId, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [saving, setSaving] = useState(false)
  const toast = useToastStore(s => s.add)
  const timerRef = useRef(null)

  const handleChange = val => {
    setContent(val)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const updated = await patchNote(slug, projectId, note.id, { content: val })
        onUpdated(updated)
      } catch { toast('저장 실패', 'error') }
      finally { setSaving(false) }
    }, 800)
  }

  const handleDelete = async () => {
    if (!confirm('이 노트를 삭제할까요?')) return
    try {
      await deleteNote(slug, projectId, note.id)
      onDeleted(note.id)
    } catch { toast('삭제 실패', 'error') }
  }

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>{note.date}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note.author?.display_name || note.author?.username}</span>
          {saving && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>● 저장 중</span>}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setEditing(e => !e)}
            style={{ fontSize: '11px', padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            {editing ? '미리보기' : '편집'}
          </button>
          <button
            onClick={handleDelete}
            style={{ fontSize: '11px', padding: '3px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--danger)' }}
          >
            삭제
          </button>
        </div>
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={e => handleChange(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 160, padding: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'ui-monospace, monospace', resize: 'vertical', outline: 'none' }}
        />
      ) : (
        <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {content ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown> : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>내용 없음. 편집 버튼을 눌러 작성하세요.</span>}
        </div>
      )}
      {note.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
          {note.tags.map(t => (
            <span key={t} style={{ fontSize: '10px', padding: '2px 7px', background: 'var(--accent-muted)', color: 'var(--accent)', borderRadius: 'var(--r-full)', border: '1px solid var(--border)' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResearchNotePanel({ slug, projectId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [newDate, setNewDate] = useState(today())
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    setLoading(true)
    getNotes(slug, projectId)
      .then(setNotes)
      .catch(() => toast('노트 불러오기 실패', 'error'))
      .finally(() => setLoading(false))
  }, [slug, projectId])

  const handleAdd = async e => {
    e.preventDefault()
    if (!newDate) return
    setAdding(true)
    try {
      const note = await createNote(slug, projectId, { date: newDate, content: newContent })
      setNotes(prev => [note, ...prev])
      setNewContent('')
      setShowForm(false)
    } catch { toast('노트 추가 실패', 'error') }
    finally { setAdding(false) }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>로딩 중...</div>

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📝 연구 노트</h2>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
        >
          + 새 노트
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>날짜</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{ padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: 13 }}
            />
          </div>
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Markdown 형식으로 실험 내용, 관찰, 결과를 기록하세요..."
            rows={6}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'ui-monospace, monospace', resize: 'vertical', outline: 'none', marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={adding} style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: adding ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600 }}>
              {adding ? '추가 중...' : '추가'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>
              취소
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📓</div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>아직 연구 노트가 없습니다</div>
          <div style={{ fontSize: 12 }}>+ 새 노트 버튼으로 실험 일지를 시작하세요</div>
        </div>
      )}

      {notes.map(note => (
        <NoteCard
          key={note.id}
          note={note}
          slug={slug}
          projectId={projectId}
          onUpdated={updated => setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))}
          onDeleted={id => setNotes(prev => prev.filter(n => n.id !== id))}
        />
      ))}
    </div>
  )
}
