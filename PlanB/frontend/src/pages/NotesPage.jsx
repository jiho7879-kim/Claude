import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { getNotes, createNote, updateNote, deleteNote, getFolders, createFolder, updateFolder, deleteFolder } from '../lib/notesApi'
import { noteAiAction } from '../lib/aiApi'

const SAVE_DELAY = 800

marked.setOptions({ breaks: true, gfm: true })

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

function renderMarkdown(content, allNotes, onNoteClick) {
  if (!content) return ''
  // WikiLink [[노트명]] 변환 → 클릭 가능한 링크
  const withLinks = content.replace(/\[\[([^\]]+)\]\]/g, (_, title) => {
    const note = allNotes.find(n => n.title === title || n.title?.toLowerCase() === title.toLowerCase())
    if (note) {
      return `<a class="wiki-link" data-note-id="${note.id}" href="#">${title}</a>`
    }
    return `<span class="wiki-link-missing">[[${title}]]</span>`
  })
  const html = marked.parse(withLinks)
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-note-id'] })
}

// ─── AI 패널 ─────────────────────────────────────────────────────────────────
const AI_ACTIONS = [
  { key: 'organize', label: '✨ 구조화', desc: '마크다운 형식으로 정리' },
  { key: 'expand', label: '📝 이어서 작성', desc: '내용 확장 및 보완' },
  { key: 'suggest_tags', label: '🏷️ 태그 추천', desc: '관련 태그 자동 추천' },
]

function NoteAIPanel({ note, slug, onApply }) {
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const run = async (action) => {
    setLoading(action)
    setResult(null)
    setError(null)
    try {
      const data = await noteAiAction(slug, note.id, action)
      setResult({ action, data })
    } catch (e) {
      setError(e?.response?.data?.error || 'AI 오류')
    } finally {
      setLoading(null)
    }
  }

  const apply = () => {
    if (!result) return
    if (result.action === 'suggest_tags') onApply({ tags: result.data.tags })
    else onApply({ content: result.data.content })
    setResult(null)
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        🤖 AI 도우미
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {AI_ACTIONS.map(a => (
          <button key={a.key} onClick={() => run(a.key)} disabled={!!loading}
            style={{ padding: '4px 9px', background: loading === a.key ? 'var(--accent-muted)' : 'var(--bg-elevated)', border: `1px solid ${loading === a.key ? 'var(--border-focus)' : 'var(--border)'}`, borderRadius: 6, fontSize: 11, cursor: loading ? 'default' : 'pointer', color: 'var(--text-secondary)', opacity: loading && loading !== a.key ? 0.5 : 1 }}>
            {loading === a.key ? '⏳' : a.label}
          </button>
        ))}
      </div>
      {error && <div style={{ marginTop: 6, fontSize: 11, color: '#ef4444' }}>{error}</div>}
      {result && (
        <div style={{ marginTop: 8 }}>
          <div style={{ padding: '6px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, color: 'var(--text-secondary)', maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {result.action === 'suggest_tags'
              ? (result.data.tags || []).map(t => `#${t}`).join('  ')
              : (result.data.content || '').slice(0, 300) + ((result.data.content || '').length > 300 ? '...' : '')}
          </div>
          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
            <button onClick={apply} style={{ flex: 1, padding: '5px 0', background: 'var(--accent)', border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>적용</button>
            <button onClick={() => setResult(null)} style={{ padding: '5px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>취소</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 폴더 트리 아이템 ─────────────────────────────────────────────────────────
function FolderItem({ folder, depth = 0, children, notes, selectedFolder, onSelect, onRename, onDelete, onNewNote, onNewSubfolder }) {
  const [open, setOpen] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState(folder.name)
  const menuRef = useRef(null)
  const noteCount = notes.filter(n => n.folder === folder.id).length

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleRename = () => {
    if (renameVal.trim() && renameVal !== folder.name) onRename(folder.id, renameVal.trim())
    setRenaming(false)
    setMenuOpen(false)
  }

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: `5px 8px 5px ${12 + depth * 14}px`,
          cursor: 'pointer', borderLeft: '3px solid',
          borderLeftColor: selectedFolder === folder.id ? 'var(--accent)' : 'transparent',
          background: selectedFolder === folder.id ? 'var(--bg-elevated)' : 'transparent',
          borderRadius: '0 6px 6px 0',
        }}
        onMouseEnter={e => { if (selectedFolder !== folder.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
        onMouseLeave={e => { if (selectedFolder !== folder.id) e.currentTarget.style.background = 'transparent' }}
      >
        <span onClick={() => setOpen(v => !v)} style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, width: 12 }}>
          {open ? '▾' : '▸'}
        </span>
        <span onClick={() => setOpen(v => !v)} style={{ fontSize: 13, flexShrink: 0 }}>
          {open ? '📂' : '📁'}
        </span>
        {renaming ? (
          <input
            autoFocus
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, fontSize: 12, background: 'var(--bg-elevated)', border: '1px solid var(--accent)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-primary)', outline: 'none' }}
          />
        ) : (
          <span onClick={() => onSelect(folder.id)} style={{ flex: 1, fontSize: 12, fontWeight: selectedFolder === folder.id ? 600 : 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder.name}
          </span>
        )}
        {noteCount > 0 && !renaming && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{noteCount}</span>
        )}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={menuRef}>
          <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: '0 2px', opacity: menuOpen ? 1 : 0 }}
            className="folder-menu-btn">
            ⋯
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, minWidth: 140, padding: 4 }}>
              {[
                { label: '📝 새 노트', action: () => { onNewNote(folder.id); setMenuOpen(false) } },
                { label: '📁 하위 폴더', action: () => { onNewSubfolder(folder.id); setMenuOpen(false) } },
                { label: '✏️ 이름 변경', action: () => { setRenaming(true); setRenameVal(folder.name); setMenuOpen(false) } },
                { label: '🗑 삭제', action: () => { onDelete(folder.id); setMenuOpen(false) }, danger: true },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{ display: 'block', width: '100%', padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: item.danger ? '#ef4444' : 'var(--text-primary)', textAlign: 'left', borderRadius: 5 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {open && children}
    </div>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function NotesPage() {
  const { slug } = useParams()
  const [notes, setNotes] = useState([])
  const [folders, setFolders] = useState([])
  const [active, setActive] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null) // null = 전체, 'root' = 미분류, uuid = 폴더
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const saveTimer = useRef(null)
  const editorRef = useRef(null)
  const previewRef = useRef(null)

  const loadAll = useCallback(() => {
    getFolders(slug).then(setFolders).catch(() => {})
    getNotes(slug).then(setNotes).catch(() => {})
  }, [slug])

  useEffect(() => { loadAll() }, [loadAll])

  // 폴더/검색 필터링된 노트 목록
  const filteredNotes = useMemo(() => {
    if (search) return notes.filter(n => n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.toLowerCase().includes(search.toLowerCase()))
    if (selectedFolder === 'root') return notes.filter(n => !n.folder)
    if (selectedFolder) return notes.filter(n => n.folder === selectedFolder)
    return notes
  }, [notes, selectedFolder, search])

  // 폴더 트리 빌드 (parent=null인 루트 폴더들)
  const rootFolders = useMemo(() => folders.filter(f => !f.parent), [folders])
  const childFolders = useMemo(() => {
    const map = {}
    folders.forEach(f => { if (f.parent) { if (!map[f.parent]) map[f.parent] = []; map[f.parent].push(f) } })
    return map
  }, [folders])

  const handleNew = async (folderId = null) => {
    const note = await createNote(slug, { title: '', content: '', tags: [], folder: folderId || null })
    setNotes(prev => [note, ...prev])
    setActive(note)
    if (folderId) setSelectedFolder(folderId)
    setSearch('')
    setPreview(false)
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
        setActive(prev => prev?.id === saved.id ? { ...prev, ...saved } : prev)
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

  const handleMoveToFolder = async (folderId) => {
    if (!active) return
    const updated = await updateNote(slug, active.id, { folder: folderId || null })
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n))
    setActive(updated)
  }

  const handleAIApply = useCallback(async ({ content, tags }) => {
    if (!active) return
    const patch = {}
    if (content !== undefined) { patch.content = content; patch.title = extractTitle(content) }
    if (tags !== undefined) patch.tags = tags
    const updated = { ...active, ...patch }
    setActive(updated)
    setSaving(true)
    try {
      const saved = await updateNote(slug, active.id, patch)
      setNotes(prev => prev.map(n => n.id === saved.id ? saved : n))
      setActive(saved)
    } finally { setSaving(false) }
  }, [active, slug])

  // 폴더 CRUD
  const handleNewFolder = async (parentId = null) => {
    const name = prompt('폴더 이름을 입력하세요:')
    if (!name?.trim()) return
    const folder = await createFolder(slug, { name: name.trim(), parent: parentId })
    setFolders(prev => [...prev, folder])
  }

  const handleRenameFolder = async (id, name) => {
    const updated = await updateFolder(slug, id, { name })
    setFolders(prev => prev.map(f => f.id === id ? updated : f))
  }

  const handleDeleteFolder = async (id) => {
    if (!confirm('폴더를 삭제하면 안의 노트는 미분류로 이동됩니다. 계속할까요?')) return
    await deleteFolder(slug, id)
    setFolders(prev => prev.filter(f => f.id !== id))
    setNotes(prev => prev.map(n => n.folder === id ? { ...n, folder: null, folder_name: null } : n))
    if (selectedFolder === id) setSelectedFolder(null)
  }

  // WikiLink 클릭 핸들러
  const handlePreviewClick = (e) => {
    const link = e.target.closest('.wiki-link')
    if (link) {
      e.preventDefault()
      const noteId = link.dataset.noteId
      const target = notes.find(n => n.id === noteId)
      if (target) { setActive(target); setPreview(false) }
    }
  }

  const wordCount = active?.content ? active.content.trim().split(/\s+/).filter(Boolean).length : 0

  const renderFolderTree = (parentFolders, depth = 0) =>
    parentFolders.map(folder => (
      <FolderItem key={folder.id} folder={folder} depth={depth}
        notes={notes} selectedFolder={selectedFolder}
        onSelect={id => { setSelectedFolder(id); setSearch('') }}
        onRename={handleRenameFolder}
        onDelete={handleDeleteFolder}
        onNewNote={handleNew}
        onNewSubfolder={handleNewFolder}
      >
        {(childFolders[folder.id] || []).length > 0 && renderFolderTree(childFolders[folder.id] || [], depth + 1)}
      </FolderItem>
    ))

  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <style>{`
        .folder-menu-btn { opacity: 0 !important; }
        div:hover > div > .folder-menu-btn { opacity: 1 !important; }
        .wiki-link { color: var(--accent); text-decoration: none; border-bottom: 1px dashed var(--accent); cursor: pointer; }
        .wiki-link:hover { background: var(--accent-muted); }
        .wiki-link-missing { color: var(--text-muted); border-bottom: 1px dashed var(--text-muted); }
        .md-preview h1,.md-preview h2,.md-preview h3 { font-weight: 700; margin: 1em 0 0.4em; color: var(--text-primary); }
        .md-preview h1 { font-size: 1.6em; } .md-preview h2 { font-size: 1.3em; } .md-preview h3 { font-size: 1.1em; }
        .md-preview p { margin: 0.6em 0; color: var(--text-secondary); }
        .md-preview ul,.md-preview ol { padding-left: 1.5em; margin: 0.5em 0; color: var(--text-secondary); }
        .md-preview li { margin: 0.2em 0; }
        .md-preview code { background: var(--bg-elevated); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 0.88em; }
        .md-preview pre { background: var(--bg-elevated); border: 1px solid var(--border); padding: 12px; border-radius: 8px; overflow-x: auto; }
        .md-preview pre code { background: none; padding: 0; }
        .md-preview blockquote { border-left: 3px solid var(--accent); padding-left: 12px; margin: 0.5em 0; color: var(--text-muted); }
        .md-preview strong { font-weight: 700; color: var(--text-primary); }
        .md-preview a { color: var(--accent); }
        .md-preview hr { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
      `}</style>

      {/* ─── 사이드바 ─── */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', overflow: 'hidden' }}>

        {/* 상단: 검색 + 새 노트 버튼 */}
        <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>📝 노트</span>
            <button onClick={() => handleNewFolder(null)} title="새 폴더" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-muted)', fontSize: 13, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📁</button>
            <button onClick={() => handleNew(selectedFolder && selectedFolder !== 'root' ? selectedFolder : null)} title="새 노트" style={{ background: 'var(--accent)', border: 'none', borderRadius: 5, color: '#fff', fontSize: 16, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          </div>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedFolder(null) }}
            placeholder="노트 검색..."
            style={{ width: '100%', padding: '5px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* 폴더 트리 + 노트 목록 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>

          {/* 전체 보기 */}
          {!search && (
            <>
              <div
                onClick={() => { setSelectedFolder(null); setSearch('') }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', cursor: 'pointer', borderLeft: '3px solid', borderLeftColor: selectedFolder === null ? 'var(--accent)' : 'transparent', background: selectedFolder === null ? 'var(--bg-elevated)' : 'transparent', fontSize: 12, color: 'var(--text-secondary)', borderRadius: '0 6px 6px 0' }}
                onMouseEnter={e => { if (selectedFolder !== null) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (selectedFolder !== null) e.currentTarget.style.background = 'transparent' }}
              >
                <span>🗂️</span> <span style={{ flex: 1 }}>전체 노트</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{notes.length}</span>
              </div>

              {/* 폴더 트리 */}
              {renderFolderTree(rootFolders)}

              {/* 미분류 */}
              <div
                onClick={() => setSelectedFolder('root')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', cursor: 'pointer', borderLeft: '3px solid', borderLeftColor: selectedFolder === 'root' ? 'var(--accent)' : 'transparent', background: selectedFolder === 'root' ? 'var(--bg-elevated)' : 'transparent', fontSize: 12, color: 'var(--text-muted)', borderRadius: '0 6px 6px 0', marginTop: 2 }}
                onMouseEnter={e => { if (selectedFolder !== 'root') e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (selectedFolder !== 'root') e.currentTarget.style.background = 'transparent' }}
              >
                <span>📄</span> <span style={{ flex: 1 }}>미분류</span>
                <span style={{ fontSize: 10 }}>{notes.filter(n => !n.folder).length}</span>
              </div>

              {selectedFolder !== null && <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px' }} />}
            </>
          )}

          {/* 노트 목록 */}
          {filteredNotes.length === 0 ? (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              {search ? '검색 결과 없음' : '노트가 없습니다'}
            </div>
          ) : filteredNotes.map(note => (
            <div key={note.id} onClick={() => { setActive(note); setPreview(false) }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderLeft: '3px solid', borderLeftColor: active?.id === note.id ? 'var(--accent)' : 'transparent', background: active?.id === note.id ? 'var(--bg-elevated)' : 'transparent', transition: 'all 0.1s' }}
              onMouseEnter={e => { if (active?.id !== note.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (active?.id !== note.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                {note.is_pinned && <span style={{ fontSize: 10 }}>📌</span>}
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {note.title || '제목 없음'}
                </span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                  {note.content.slice(0, 45).replace(/\n/g, ' ') || '내용 없음'}
                </span>
                <span style={{ flexShrink: 0, marginLeft: 4 }}>{formatDate(note.updated_at)}</span>
              </div>
              {note.folder_name && !search && selectedFolder === null && (
                <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2, opacity: 0.7 }}>📁 {note.folder_name}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── 에디터 영역 ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {active ? (
          <>
            {/* 툴바 */}
            <div style={{ padding: '7px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg-surface)', flexShrink: 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, minWidth: 60 }}>
                {saving ? '저장 중...' : `저장됨 · ${wordCount}단어`}
              </span>

              {/* 폴더 이동 드롭다운 */}
              <select
                value={active.folder || ''}
                onChange={e => handleMoveToFolder(e.target.value || null)}
                style={{ fontSize: 11, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 6px', color: 'var(--text-secondary)', cursor: 'pointer', maxWidth: 110 }}
              >
                <option value="">📄 미분류</option>
                {folders.map(f => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
              </select>

              <button onClick={() => setPreview(v => !v)} style={{ padding: '3px 9px', background: preview ? 'var(--accent)' : 'var(--bg-elevated)', border: `1px solid ${preview ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 5, fontSize: 11, cursor: 'pointer', color: preview ? '#fff' : 'var(--text-secondary)', fontWeight: preview ? 600 : 400 }}>
                {preview ? '✏️ 편집' : '👁 미리보기'}
              </button>
              <button onClick={() => setShowAI(v => !v)} style={{ padding: '3px 9px', background: showAI ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)', border: `1px solid ${showAI ? 'var(--border-focus)' : 'var(--border)'}`, borderRadius: 5, fontSize: 11, cursor: 'pointer', color: showAI ? 'var(--accent)' : 'var(--text-secondary)' }}>
                🤖 AI
              </button>
              <button onClick={() => handlePin(active)} style={{ padding: '3px 8px', background: active.is_pinned ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: active.is_pinned ? 'var(--accent)' : 'var(--text-muted)' }}>
                {active.is_pinned ? '📌' : '📌'}
              </button>
              <button onClick={() => setDeleteConfirm(active)} style={{ padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}>🗑</button>
            </div>

            {/* 태그 표시 */}
            {active.tags?.length > 0 && (
              <div style={{ padding: '5px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, flexWrap: 'wrap', background: 'var(--bg-surface)', flexShrink: 0 }}>
                {active.tags.map(t => (
                  <span key={t} style={{ padding: '1px 7px', background: 'var(--accent-muted)', border: '1px solid var(--border-focus)', borderRadius: 10, fontSize: 11, color: 'var(--accent)' }}>#{t}</span>
                ))}
              </div>
            )}

            {/* 편집 or 미리보기 */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {preview ? (
                <div
                  ref={previewRef}
                  onClick={handlePreviewClick}
                  className="md-preview"
                  style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', fontSize: 15, lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content, notes, setActive) }}
                />
              ) : (
                <textarea
                  ref={editorRef}
                  value={active.content}
                  onChange={handleContentChange}
                  placeholder={'# 제목\n\n자유롭게 작성하세요...\n\n[[다른 노트 제목]] 으로 노트를 연결하세요\n\n태그: #업무 #아이디어'}
                  style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', padding: '28px 40px', fontSize: 15, lineHeight: 1.8, fontFamily: '"Pretendard", "Apple SD Gothic Neo", monospace', background: 'var(--bg-base)', color: 'var(--text-primary)' }}
                />
              )}
            </div>

            {/* AI 패널 */}
            {showAI && <NoteAIPanel note={active} slug={slug} onApply={handleAIApply} />}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48 }}>📝</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>노트를 선택하거나 새로 만드세요</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
              📁 폴더로 노트를 정리하고<br />
              [[노트명]] 으로 노트끼리 연결하세요
            </div>
            <button onClick={() => handleNew()} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>+ 새 노트</button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }} onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 32px', width: 'min(360px, 90vw)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>노트를 삭제할까요?</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>"{deleteConfirm.title || '제목 없음'}" — 이 작업은 되돌릴 수 없습니다</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: '8px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>취소</button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ padding: '8px 20px', background: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#fff', fontWeight: 600 }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
