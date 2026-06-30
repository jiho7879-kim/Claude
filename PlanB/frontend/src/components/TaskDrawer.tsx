import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Avatar from './ui/Avatar'
import { StatusBadge, PriorityBadge } from './ui/Badge'
import { Spinner } from './ui/Spinner'
import useToastStore from '../store/toastStore'
import {
  updateTask, deleteTask,
  getTaskComments, createTaskComment,
  getTaskActivity,
  getChecklist, createChecklistItem, updateChecklistItem, deleteChecklistItem,
  getTimeEntries, createTimeEntry, deleteTimeEntry,
} from '../lib/workspaceApi'
import { uploadFile, deleteFile, getFileDownloadUrl } from '../lib/filesApi'

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ width: 90, fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}

function CommentItem({ comment }) {
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '10px 0' }}>
      <Avatar user={comment.author} size={28} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {comment.author?.display_name || comment.author?.username}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(comment.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {comment.content}
        </div>
      </div>
    </div>
  )
}

function ActivityItem({ log }) {
  const ACTION_LABELS = {
    created: '태스크를 생성했습니다',
    status_changed: (d) => `상태를 "${d.from}" → "${d.to}"로 변경했습니다`,
    comment_added: '댓글을 추가했습니다',
  }
  const label = typeof ACTION_LABELS[log.action] === 'function'
    ? ACTION_LABELS[log.action](log.detail)
    : ACTION_LABELS[log.action] || log.action
  return (
    <div style={{ display: 'flex', gap: '8px', padding: '5px 0', fontSize: '12px', color: 'var(--text-muted)', alignItems: 'flex-start' }}>
      <Avatar user={log.actor} size={18} />
      <span>
        <strong style={{ color: 'var(--text-secondary)' }}>{log.actor?.display_name || log.actor?.username}</strong>
        {' '}{label}
        <span style={{ marginLeft: 8, opacity: 0.7 }}>
          {new Date(log.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      </span>
    </div>
  )
}

function ChecklistTab({ slug, projectId, taskId }) {
  const toast = useToastStore(s => s.add)
  const [items, setItems] = useState([])
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getChecklist(slug, projectId, taskId)
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [taskId])

  const done = items.filter(i => i.is_done).length
  const pct  = items.length > 0 ? Math.round(done / items.length * 100) : 0

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newText.trim()) return
    try {
      const item = await createChecklistItem(slug, projectId, taskId, { text: newText.trim(), order: items.length })
      setItems(prev => [...prev, item])
      setNewText('')
    } catch { toast('추가 실패', 'error') }
  }

  const handleToggle = async (item) => {
    try {
      const updated = await updateChecklistItem(slug, projectId, taskId, item.id, { is_done: !item.is_done })
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    } catch { toast('저장 실패', 'error') }
  }

  const handleDelete = async (itemId) => {
    try {
      await deleteChecklistItem(slug, projectId, taskId, itemId)
      setItems(prev => prev.filter(i => i.id !== itemId))
    } catch { toast('삭제 실패', 'error') }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:'24px' }}><Spinner /></div>

  return (
    <div>
      {items.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>{done}/{items.length} 완료</span>
            <span style={{ fontSize:11, color:'var(--accent)', fontWeight:600 }}>{pct}%</span>
          </div>
          <div style={{ height:4, background:'var(--border)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--success)', borderRadius:'var(--r-full)', transition:'width 0.3s ease' }} />
          </div>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
          <input
            type="checkbox"
            checked={item.is_done}
            onChange={() => handleToggle(item)}
            style={{ cursor:'pointer', accentColor:'var(--accent)', width:14, height:14, flexShrink:0 }}
          />
          <span style={{ flex:1, fontSize:13, color: item.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.is_done ? 'line-through' : 'none', lineHeight:1.4 }}>
            {item.text}
          </span>
          <button
            onClick={() => handleDelete(item.id)}
            style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, padding:'0 2px', opacity:0.5, lineHeight:1 }}
            title="삭제"
          >✕</button>
        </div>
      ))}

      <form onSubmit={handleAdd} style={{ display:'flex', gap:6, marginTop:10 }}>
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="항목 추가..."
          style={{ flex:1, padding:'6px 10px', borderRadius:'var(--r-md)', fontSize:'12px', border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)' }}
        />
        <button
          type="submit"
          disabled={!newText.trim()}
          style={{ padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'12px', fontWeight:500 }}
        >추가</button>
      </form>
    </div>
  )
}

function fmtSec(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}시간 ${String(m).padStart(2,'0')}분`
    : `${m}분 ${String(sec).padStart(2,'0')}초`
}

function TimeTrackingTab({ slug, projectId, taskId }) {
  const toast = useToastStore(s => s.add)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [note, setNote] = useState('')
  const startedAt = useRef(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    getTimeEntries(slug, projectId, taskId)
      .then(setEntries).catch(() => {}).finally(() => setLoading(false))
  }, [taskId])

  useEffect(() => {
    if (running) {
      startedAt.current = new Date()
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt.current.getTime()) / 1000))
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const handleStop = async () => {
    setRunning(false)
    const endedAt = new Date()
    const dur = Math.floor((endedAt.getTime() - startedAt.current.getTime()) / 1000)
    if (dur < 1) return
    try {
      const entry = await createTimeEntry(slug, projectId, taskId, {
        started_at: startedAt.current.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_seconds: dur,
        note: note.trim(),
      })
      setEntries(prev => [entry, ...prev])
      setElapsed(0)
      setNote('')
      toast('시간 기록됨', 'success')
    } catch { toast('저장 실패', 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTimeEntry(slug, projectId, taskId, id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch { toast('삭제 실패', 'error') }
  }

  const totalSec = entries.reduce((a, e) => a + e.duration_seconds, 0)

  if (loading) return <div style={{ padding:16, color:'var(--text-muted)', fontSize:13 }}>불러오는 중…</div>

  return (
    <div>
      {/* Timer */}
      <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'16px', marginBottom:16 }}>
        <div style={{ fontSize:28, fontWeight:700, color: running ? 'var(--accent)' : 'var(--text)', textAlign:'center', marginBottom:12, fontVariantNumeric:'tabular-nums' }}>
          {fmtSec(elapsed)}
        </div>
        {running && (
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="메모 (선택)"
            style={{ width:'100%', boxSizing:'border-box', padding:'6px 10px', borderRadius:'var(--r-sm)', fontSize:12, border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text)', marginBottom:10 }}
          />
        )}
        <button
          onClick={() => running ? handleStop() : setRunning(true)}
          style={{ width:'100%', padding:'8px', borderRadius:'var(--r-md)', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: running ? '#ef4444' : 'var(--accent)', color:'#fff' }}
        >
          {running ? '⏹ 중지' : '▶ 타이머 시작'}
        </button>
      </div>

      {/* Total */}
      {entries.length > 0 && (
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>
          총 기록: <strong style={{ color:'var(--text)' }}>{fmtSec(totalSec)}</strong> ({entries.length}건)
        </div>
      )}

      {/* Entries */}
      {entries.length === 0
        ? <div style={{ fontSize:13, color:'var(--text-muted)' }}>기록된 시간이 없습니다.</div>
        : entries.map(e => (
          <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
            <div style={{ flex:1 }}>
              <span style={{ fontWeight:600, color:'var(--text)' }}>{fmtSec(e.duration_seconds)}</span>
              {e.note && <span style={{ color:'var(--text-muted)', marginLeft:8 }}>{e.note}</span>}
              <div style={{ color:'var(--text-muted)', fontSize:11, marginTop:2 }}>
                {new Date(e.started_at).toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
            <button onClick={() => handleDelete(e.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:13, opacity:0.6 }}>✕</button>
          </div>
        ))
      }
    </div>
  )
}

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function AttachmentsTab({ slug, projectId, task, onUpdate }) {
  const toast = useToastStore(s => s.add)
  const [attachments, setAttachments] = useState(task?.attachments || [])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    setAttachments(task?.attachments || [])
  }, [task?.id, task?.attachments])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const created = await uploadFile(slug, file, task.id)
      const attached = Array.isArray(created) ? created : [created]
      setAttachments(prev => [...attached, ...prev])
      toast('파일 업로드 완료', 'success')
      onUpdate?.({ ...task, attachments: [...attached, ...attachments] })
    } catch {
      toast('업로드 실패', 'error')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (fileId) => {
    if (!confirm('파일을 삭제하시겠습니까?')) return
    try {
      await deleteFile(slug, fileId)
      setAttachments(prev => prev.filter(a => a.id !== fileId))
      toast('파일 삭제됨', 'success')
    } catch {
      toast('삭제 실패', 'error')
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <input
          ref={inputRef}
          type="file"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: '100%', padding: '10px', borderRadius: 'var(--r-md)',
            border: '2px dashed var(--border)', background: 'var(--bg-elevated)',
            color: uploading ? 'var(--text-muted)' : 'var(--accent)',
            cursor: 'pointer', fontSize: '13px', fontWeight: 500,
          }}
        >
          {uploading ? '업로드 중…' : '+ 파일 첨부'}
        </button>
      </div>

      {attachments.length === 0 && (
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>
          첨부된 파일이 없습니다.
        </div>
      )}

      {attachments.map(a => (
        <div
          key={a.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 0', borderBottom: '1px solid var(--border)',
            fontSize: '13px',
          }}
        >
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.original_name}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }}>
            {fmtSize(a.size_bytes)}
          </span>
          <a
            href={getFileDownloadUrl(slug, a.id)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none', flexShrink: 0 }}
            title="다운로드"
          >⬇</a>
          <button
            onClick={() => handleDelete(a.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', padding: 0, opacity: 0.5, flexShrink: 0 }}
            title="삭제"
          >✕</button>
        </div>
      ))}
    </div>
  )
}

export default function TaskDrawer({ task, onClose, onUpdate, onDelete, members = [] }) {
  const { slug, projectId } = useParams()
  const toast = useToastStore((s) => s.add)
  const [localTask, setLocalTask] = useState(task)
  const [comments, setComments] = useState([])
  const [activity, setActivity] = useState([])
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('comments')
  const overlayRef = useRef(null)

  useEffect(() => { setLocalTask(task) }, [task])

  useEffect(() => {
    if (!task) return
    setLoading(true)
    Promise.all([
      getTaskComments(slug, projectId, task.id),
      getTaskActivity(slug, projectId, task.id),
    ]).then(([c, a]) => {
      setComments(c)
      setActivity(a)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [task?.id, slug, projectId])

  const handleFieldUpdate = async (field, value) => {
    try {
      const updated = await updateTask(slug, projectId, localTask.id, { [field]: value })
      setLocalTask(updated)
      onUpdate?.(updated)
    } catch {
      toast('저장 실패', 'error')
    }
  }

  const handleCommentSubmit = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSubmittingComment(true)
    try {
      const c = await createTaskComment(slug, projectId, localTask.id, { content: commentText.trim() })
      setComments((prev) => [...prev, c])
      setCommentText('')
    } catch {
      toast('댓글 전송 실패', 'error')
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`"${localTask.title}" 태스크를 삭제하시겠습니까?`)) return
    try {
      await deleteTask(slug, projectId, localTask.id)
      toast('태스크 삭제됨', 'success')
      onDelete?.(localTask.id)
      onClose()
    } catch {
      toast('삭제 실패', 'error')
    }
  }

  if (!task) return null

  return (
    <>
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
        style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 100 }}
      />
      <div className="slide-in-right" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)',
        background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)',
        zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '2px 6px', borderRadius: 'var(--r-sm)' }}>←</button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 'var(--r-sm)' }}>{localTask.level_name}</span>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { navigator.clipboard?.writeText(window.location.href); toast('링크 복사됨', 'success') }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--r-sm)' }}
            title="링크 복사"
          >🔗</button>
          <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px', padding: '4px 8px', borderRadius: 'var(--r-sm)' }}>삭제</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Title */}
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const v = e.currentTarget.textContent.trim()
              if (v && v !== localTask.title) handleFieldUpdate('title', v)
            }}
            style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', outline: 'none', marginBottom: '16px', lineHeight: 1.4, padding: '4px 0', borderBottom: '2px solid transparent' }}
            onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--border-focus)'}
            onBlurCapture={(e) => e.currentTarget.style.borderBottomColor = 'transparent'}
          >
            {localTask.title}
          </div>

          {/* Fields */}
          <div style={{ marginBottom: '20px', fontSize: '13px' }}>
            <Field label="상태">
              <StatusBadge status={localTask.status} onChange={(v) => { setLocalTask(t => ({ ...t, status: v })); handleFieldUpdate('status', v) }} />
            </Field>
            <Field label="우선순위">
              <PriorityBadge priority={localTask.priority} onChange={(v) => { setLocalTask(t => ({ ...t, priority: v })); handleFieldUpdate('priority', v) }} />
            </Field>
            <Field label="시작일">
              <input
                type="date"
                defaultValue={localTask.start_date || ''}
                onBlur={(e) => handleFieldUpdate('start_date', e.target.value || null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', padding: '2px 0' }}
              />
            </Field>
            <Field label="마감일">
              <input
                type="date"
                defaultValue={localTask.due_date || ''}
                onBlur={(e) => handleFieldUpdate('due_date', e.target.value || null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', padding: '2px 0' }}
              />
            </Field>
            <Field label="담당자">
              <select
                value={localTask.assignee?.id ?? ''}
                onChange={e => {
                  const val = e.target.value ? Number(e.target.value) : null
                  handleFieldUpdate('assignee_id', val)
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '12px', cursor: 'pointer', padding: '2px 0', width: '100%' }}
              >
                <option value="">없음</option>
                {members.map(m => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.display_name || m.user.username}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="마일스톤">
              <input
                type="checkbox"
                checked={localTask.is_milestone || false}
                onChange={e => { setLocalTask(t => ({ ...t, is_milestone: e.target.checked })); handleFieldUpdate('is_milestone', e.target.checked) }}
                style={{ cursor: 'pointer', accentColor: '#f59e0b', width: 14, height: 14 }}
              />
            </Field>
            <Field label="생성일">
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {localTask.created_at ? new Date(localTask.created_at).toLocaleDateString('ko-KR', { year:'numeric', month:'short', day:'numeric' }) : '—'}
              </span>
            </Field>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>설명</div>
            <textarea
              defaultValue={localTask.description}
              onBlur={(e) => { if (e.target.value !== localTask.description) handleFieldUpdate('description', e.target.value) }}
              placeholder="태스크 설명 추가..."
              rows={4}
              style={{ width: '100%', resize: 'vertical', padding: '10px', borderRadius: 'var(--r-md)', fontSize: '13px', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
          </div>

          {/* Tabs */}
          <div style={{ borderBottom: '1px solid var(--border)', marginBottom: '16px', display: 'flex', gap: '4px' }}>
            {[
              ['comments', `💬 댓글 (${comments.length})`],
              ['checklist', '✅ 체크리스트'],
              ['attachments', `📎 첨부파일 (${(localTask.attachments || []).length})`],
              ['time', '⏱ 시간'],
              ['activity', '📋 활동'],
            ].map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                background: 'none', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                color: tab === k ? 'var(--accent)' : 'var(--text-muted)',
                borderBottom: tab === k ? '2px solid var(--accent)' : '2px solid transparent',
                marginBottom: '-1px',
              }}>{label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}><Spinner /></div>
          ) : tab === 'comments' ? (
            <div>
              {comments.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>아직 댓글이 없습니다.</div>}
              {comments.map((c) => <CommentItem key={c.id} comment={c} />)}
              <form onSubmit={handleCommentSubmit} style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="댓글 작성..."
                  rows={2}
                  style={{ flex: 1, resize: 'none', padding: '8px 10px', borderRadius: 'var(--r-md)', fontSize: '13px', boxSizing: 'border-box' }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommentSubmit(e) }}
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  style={{ padding: '8px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}
                >
                  {submittingComment ? '...' : '전송'}
                </button>
              </form>
            </div>
          ) : tab === 'checklist' ? (
            <ChecklistTab slug={slug} projectId={projectId} taskId={localTask.id} />
          ) : tab === 'attachments' ? (
            <AttachmentsTab slug={slug} projectId={projectId} task={localTask} onUpdate={setLocalTask} />
          ) : tab === 'time' ? (
            <TimeTrackingTab slug={slug} projectId={projectId} taskId={localTask.id} />
          ) : (
            <div>
              {activity.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '8px 0' }}>활동 내역이 없습니다.</div>}
              {activity.map((log) => <ActivityItem key={log.id} log={log} />)}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
