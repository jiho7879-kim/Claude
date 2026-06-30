import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import KanbanBoard from '../components/KanbanBoard'
import TaskDrawer from '../components/TaskDrawer'
import TaskFilters from '../components/TaskFilters'
import SavedViewBar from '../components/SavedViewBar'
import ResearchNotePanel from '../components/ResearchNotePanel'
import { StatusBadge } from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/Spinner'
import useToastStore from '../store/toastStore'
import { getTasks, createTask, updateTask, deleteTask, getProject, updateProject, getWorkspaceMembers } from '../lib/workspaceApi'
import { getDatasets, createDataset, patchDataset, deleteDataset, getRefs, createRef, deleteRef, lookupDoi } from '../lib/researchApi'

const PUB_STATUSES = [
  { value: '', label: '없음' },
  { value: 'writing', label: '✍️ 작성 중' },
  { value: 'submitted', label: '📤 제출됨' },
  { value: 'under_review', label: '🔍 심사 중' },
  { value: 'revision', label: '🔄 수정 요청' },
  { value: 'accepted', label: '✅ 승인됨' },
  { value: 'published', label: '📰 게재됨' },
]

function DatasetPanel({ slug, projectId }) {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', version: '', source_url: '', size_mb: '', data_status: 'raw', description: '' })
  const toast = useToastStore(s => s.add)
  const STATUS_LABELS = { raw: '원본', processed: '처리됨', archived: '보관됨' }
  const STATUS_COLORS = { raw: '#f59e0b', processed: '#10b981', archived: '#64748b' }

  useEffect(() => {
    setLoading(true)
    getDatasets(slug, projectId).then(setDatasets).catch(() => toast('불러오기 실패', 'error')).finally(() => setLoading(false))
  }, [slug, projectId])

  const handleAdd = async e => {
    e.preventDefault()
    try {
      const ds = await createDataset(slug, projectId, { ...form, size_mb: form.size_mb ? parseFloat(form.size_mb) : null })
      setDatasets(p => [ds, ...p])
      setForm({ name: '', version: '', source_url: '', size_mb: '', data_status: 'raw', description: '' })
      setShowForm(false)
    } catch { toast('추가 실패', 'error') }
  }

  const handleStatusChange = async (ds, newStatus) => {
    try {
      const updated = await patchDataset(slug, projectId, ds.id, { data_status: newStatus })
      setDatasets(p => p.map(d => d.id === ds.id ? updated : d))
    } catch { toast('변경 실패', 'error') }
  }

  const handleDelete = async id => {
    if (!confirm('삭제할까요?')) return
    try {
      await deleteDataset(slug, projectId, id)
      setDatasets(p => p.filter(d => d.id !== id))
    } catch { toast('삭제 실패', 'error') }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>로딩 중...</div>

  const inp = { width: '100%', boxSizing: 'border-box', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' } as React.CSSProperties

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📊 데이터셋</h2>
        <button onClick={() => setShowForm(f => !f)} style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ 추가</button>
      </div>
      {showForm && (
        <form onSubmit={handleAdd} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>이름 *</label><input required style={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="데이터셋 이름" /></div>
          <div><label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>버전</label><input style={inp} value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="v1.0" /></div>
          <div><label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>크기 (MB)</label><input type="number" style={inp} value={form.size_mb} onChange={e => setForm(f => ({ ...f, size_mb: e.target.value }))} placeholder="예: 250" /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>출처 URL</label><input style={inp} value={form.source_url} onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))} placeholder="https://..." /></div>
          <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>상태</label><select style={inp} value={form.data_status} onChange={e => setForm(f => ({ ...f, data_status: e.target.value }))}><option value="raw">원본</option><option value="processed">처리됨</option><option value="archived">보관됨</option></select></div>
          <div style={{ gridColumn: '1/-1' }}><label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>설명</label><textarea style={{ ...inp, resize: 'vertical', minHeight: 60 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="데이터셋 설명..." /></div>
          <div style={{ gridColumn: '1/-1', display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>추가</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>취소</button>
          </div>
        </form>
      )}
      {datasets.length === 0 && !showForm && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}><div style={{ fontSize: 36, marginBottom: 12 }}>📊</div><div style={{ fontSize: 14 }}>아직 데이터셋이 없습니다</div></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {datasets.map(ds => (
          <div key={ds.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{ds.name}</span>
                {ds.version && <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>{ds.version}</span>}
                {ds.size_mb && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ds.size_mb} MB</span>}
              </div>
              {ds.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{ds.description}</div>}
              {ds.source_url && <a href={ds.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>{ds.source_url}</a>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <select value={ds.data_status} onChange={e => handleStatusChange(ds, e.target.value)} style={{ fontSize: 11, padding: '3px 6px', background: 'transparent', border: `1px solid ${STATUS_COLORS[ds.data_status]}`, borderRadius: 4, color: STATUS_COLORS[ds.data_status], cursor: 'pointer' }}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => handleDelete(ds.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReferencePanel({ slug, projectId }) {
  const [refs, setRefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [doiInput, setDoiInput] = useState('')
  const [looking, setLooking] = useState(false)
  const [manualForm, setManualForm] = useState(null)
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    setLoading(true)
    getRefs(slug, projectId).then(setRefs).catch(() => toast('불러오기 실패', 'error')).finally(() => setLoading(false))
  }, [slug, projectId])

  const handleDoi = async e => {
    e.preventDefault()
    if (!doiInput.trim()) return
    setLooking(true)
    try {
      const meta = await lookupDoi(slug, projectId, doiInput.trim())
      const ref = await createRef(slug, projectId, meta)
      setRefs(p => [ref, ...p])
      setDoiInput('')
      toast('레퍼런스 추가됨', 'success')
    } catch { toast('DOI 조회 실패. 수동으로 추가하세요.', 'error') }
    finally { setLooking(false) }
  }

  const handleManual = async e => {
    e.preventDefault()
    try {
      const ref = await createRef(slug, projectId, manualForm)
      setRefs(p => [ref, ...p])
      setManualForm(null)
      toast('추가됨', 'success')
    } catch { toast('추가 실패', 'error') }
  }

  const handleDelete = async id => {
    if (!confirm('삭제할까요?')) return
    try { await deleteRef(slug, projectId, id); setRefs(p => p.filter(r => r.id !== id)) }
    catch { toast('삭제 실패', 'error') }
  }

  const inp = { width: '100%', boxSizing: 'border-box', padding: '7px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' } as React.CSSProperties

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>로딩 중...</div>

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📚 레퍼런스</h2>
        <button onClick={() => setManualForm({ title: '', authors: [], year: '', journal: '', doi: '', url: '', abstract: '' })} style={{ padding: '6px 14px', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12 }}>수동 추가</button>
      </div>
      <form onSubmit={handleDoi} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={doiInput} onChange={e => setDoiInput(e.target.value)} placeholder="DOI 입력 (예: 10.1038/nature12373)" style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
        <button type="submit" disabled={looking} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: looking ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{looking ? '조회 중...' : 'DOI 조회'}</button>
      </form>
      {manualForm && (
        <form onSubmit={handleManual} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input required style={inp} placeholder="제목 *" value={manualForm.title} onChange={e => setManualForm(f => ({ ...f, title: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 1 }} placeholder="저자 (쉼표 구분)" value={Array.isArray(manualForm.authors) ? manualForm.authors.join(', ') : manualForm.authors} onChange={e => setManualForm(f => ({ ...f, authors: e.target.value.split(',').map(a => a.trim()).filter(Boolean) }))} />
            <input type="number" style={{ ...inp, width: 100 }} placeholder="연도" value={manualForm.year} onChange={e => setManualForm(f => ({ ...f, year: e.target.value }))} />
          </div>
          <input style={inp} placeholder="저널명" value={manualForm.journal} onChange={e => setManualForm(f => ({ ...f, journal: e.target.value }))} />
          <input style={inp} placeholder="URL" value={manualForm.url} onChange={e => setManualForm(f => ({ ...f, url: e.target.value }))} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>추가</button>
            <button type="button" onClick={() => setManualForm(null)} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>취소</button>
          </div>
        </form>
      )}
      {refs.length === 0 && !manualForm && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}><div style={{ fontSize: 36, marginBottom: 12 }}>📚</div><div style={{ fontSize: 14 }}>아직 레퍼런스가 없습니다</div></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {refs.map(r => (
          <div key={r.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{r.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {r.authors?.length > 0 && <span>{r.authors.slice(0, 3).join(', ')}{r.authors.length > 3 ? ' et al.' : ''}</span>}
                {r.year && <span> · {r.year}</span>}
                {r.journal && <span> · {r.journal}</span>}
              </div>
              {r.doi && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>DOI: {r.doi}</div>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, padding: '3px 8px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--accent)', textDecoration: 'none' }}>열기</a>}
              <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14 }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PublicationPanel({ project, slug, projectId, onProjectUpdate }) {
  const [form, setForm] = useState({
    publication_status: project?.publication_status || '',
    target_journal: project?.target_journal || '',
  })
  const [saving, setSaving] = useState(false)
  const toast = useToastStore(s => s.add)
  const inp = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' } as React.CSSProperties

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateProject(slug, projectId, form)
      onProjectUpdate(updated)
      toast('논문 정보 저장됨', 'success')
    } catch { toast('저장 실패', 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ padding: '20px 0', maxWidth: 520 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>📄 논문 추적</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>논문 상태</label>
          <select style={inp} value={form.publication_status} onChange={e => setForm(f => ({ ...f, publication_status: e.target.value }))}>
            {PUB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>목표 저널</label>
          <input style={inp} value={form.target_journal} onChange={e => setForm(f => ({ ...f, target_journal: e.target.value }))} placeholder="예: Nature, Science, NEJM..." />
        </div>
        <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
      {project?.publication_status && (
        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>현재 상태</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{PUB_STATUSES.find(s => s.value === project.publication_status)?.label}</div>
          {project.target_journal && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>목표: {project.target_journal}</div>}
        </div>
      )}
    </div>
  )
}

const PRIORITY_ICON  = { urgent:'⚡', high:'↑', medium:'→', low:'↓' }
const PRIORITY_COLOR = { urgent:'#ef4444', high:'#f59e0b', medium:'#6366f1', low:'#64748b' }
const STATUS_OPTIONS  = ['todo','in_progress','done','cancelled']
const STATUS_LABEL    = { todo:'Todo', in_progress:'진행 중', done:'완료', cancelled:'취소' }
const PRIORITY_OPTIONS = ['urgent','high','medium','low']
const PRIORITY_LABEL   = { urgent:'⚡ 긴급', high:'↑ 높음', medium:'→ 보통', low:'↓ 낮음' }

// ─── Inline Dropdown ──────────────────────────────────────────────────────────
function InlineDropdown({ options, labelMap, colorMap, current, onSelect, onClose }) {
  return (
    <div style={{ position:'absolute', zIndex:200, top:'calc(100% + 4px)', left:0, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', minWidth:130, overflow:'hidden' }}>
      {options.map(opt => (
        <div key={opt} onClick={e=>{e.stopPropagation();onSelect(opt);onClose()}}
          style={{ padding:'7px 12px', fontSize:12, cursor:'pointer', background: opt===current ? 'var(--accent-muted)' : 'transparent', color: colorMap?.[opt] || 'var(--text-primary)' }}
          onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'}
          onMouseLeave={e=>e.currentTarget.style.background=opt===current?'var(--accent-muted)':'transparent'}
        >{labelMap?.[opt] || opt}</div>
      ))}
    </div>
  )
}

// ─── Bulk Toolbar ─────────────────────────────────────────────────────────────
function BulkToolbar({ count, members, onStatus, onPriority, onAssign, onDelete, onClear }) {
  const [showStatus, setShowStatus] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  return (
    <div style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', zIndex:300, background:'var(--bg-surface)', border:'1px solid var(--border-focus)', borderRadius:12, padding:'10px 16px', display:'flex', alignItems:'center', gap:10, boxShadow:'var(--shadow-lg)', animation:'fadeSlideIn 0.2s ease' }}>
      <span style={{ fontSize:12, color:'var(--accent)', fontWeight:700, marginRight:4 }}>{count}개 선택됨</span>
      <div style={{ width:1, height:20, background:'var(--border)' }} />
      <div style={{ position:'relative' }}>
        <button onClick={()=>{setShowStatus(v=>!v);setShowPriority(false);setShowAssign(false)}} style={{ padding:'5px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', fontSize:12, cursor:'pointer', fontWeight:500 }}>상태 변경</button>
        {showStatus && <InlineDropdown options={STATUS_OPTIONS} labelMap={STATUS_LABEL} colorMap={undefined} current={null} onSelect={onStatus} onClose={()=>setShowStatus(false)} />}
      </div>
      <div style={{ position:'relative' }}>
        <button onClick={()=>{setShowPriority(v=>!v);setShowStatus(false);setShowAssign(false)}} style={{ padding:'5px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', fontSize:12, cursor:'pointer', fontWeight:500 }}>우선순위</button>
        {showPriority && <InlineDropdown options={PRIORITY_OPTIONS} labelMap={PRIORITY_LABEL} colorMap={PRIORITY_COLOR} current={null} onSelect={onPriority} onClose={()=>setShowPriority(false)} />}
      </div>
      {members?.length > 0 && (
        <div style={{ position:'relative' }}>
          <button onClick={()=>{setShowAssign(v=>!v);setShowStatus(false);setShowPriority(false)}} style={{ padding:'5px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-secondary)', fontSize:12, cursor:'pointer', fontWeight:500 }}>담당자</button>
          {showAssign && (
            <div style={{ position:'absolute', zIndex:200, top:'calc(100% + 4px)', left:0, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', minWidth:150, overflow:'hidden' }}>
              {members.map(m => (
                <div key={m.id} onClick={e=>{e.stopPropagation();onAssign(m.id);setShowAssign(false)}} style={{ padding:'7px 12px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-elevated)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <span>{m.username || m.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ width:1, height:20, background:'var(--border)' }} />
      <button onClick={onDelete} style={{ padding:'5px 12px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, color:'#ef4444', fontSize:12, cursor:'pointer', fontWeight:500 }}>🗑 삭제</button>
      <button onClick={onClear} style={{ padding:'5px 10px', background:'transparent', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', lineHeight:1 }}>×</button>
    </div>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────
function TaskRow({ task, depth, onTaskClick, onChildCreated, onTaskUpdate, slug, projectId, animIndex, isSelected, onSelect, anySelected }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [showStatusDrop, setShowStatusDrop] = useState(false)
  const toast = useToastStore(s => s.add)
  const LEVEL = ['Epic','Task','Subtask']

  const handleAddChild = async e => {
    e.preventDefault()
    if (!addTitle.trim()) return
    try {
      const child = await createTask(slug, projectId, { title: addTitle.trim(), parent: task.id, status:'todo', priority:'medium' })
      onChildCreated({ ...child, children: [] })
      setAddTitle(''); setShowAdd(false)
    } catch { toast('추가 실패','error') }
  }

  const commitTitle = async () => {
    setEditing(false)
    if (editTitle.trim() === task.title || !editTitle.trim()) { setEditTitle(task.title); return }
    try {
      const updated = await updateTask(slug, projectId, task.id, { title: editTitle.trim() })
      onTaskUpdate?.(updated)
    } catch { toast('저장 실패','error'); setEditTitle(task.title) }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      const updated = await updateTask(slug, projectId, task.id, { status: newStatus })
      onTaskUpdate?.(updated)
    } catch { toast('변경 실패','error') }
  }

  return (
    <div style={{ animation: depth===0 && animIndex!=null ? `fadeSlideIn 0.18s ease ${animIndex*28}ms both` : 'none' }}>
      <div
        onClick={() => { if (!editing) onTaskClick(task) }}
        style={{ display:'flex', alignItems:'center', gap:'8px', padding:`8px 16px 8px ${16+depth*20}px`, borderBottom:'1px solid var(--border)', cursor:'pointer', minHeight:40, transition:'background var(--duration) var(--ease)', background: isSelected ? 'var(--accent-muted)' : 'transparent' }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='var(--bg-elevated)' }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent' }}
      >
        {/* Checkbox */}
        <div onClick={e=>{e.stopPropagation();onSelect?.(task.id)}} style={{ width:16, height:16, border:`2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, borderRadius:4, background: isSelected ? 'var(--accent)' : 'transparent', flexShrink:0, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: anySelected ? 1 : 0.3, transition:'all 0.15s' }}>
          {isSelected && <span style={{ color:'#fff', fontSize:9, lineHeight:1 }}>✓</span>}
        </div>
        <button onClick={e=>{e.stopPropagation();setCollapsed(c=>!c)}} style={{ background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',width:16,fontSize:'10px',padding:0,flexShrink:0 }}>
          {task.children?.length ? (collapsed?'▶':'▼') : '·'}
        </button>
        <span style={{ color:PRIORITY_COLOR[task.priority], fontSize:'13px', width:14, textAlign:'center', flexShrink:0 }}>{PRIORITY_ICON[task.priority]}</span>
        {task.is_milestone && <span title="마일스톤" style={{ color:'#f59e0b', fontSize:'13px', flexShrink:0 }}>◆</span>}

        {/* Inline title editing */}
        {editing ? (
          <input
            autoFocus value={editTitle}
            onChange={e=>setEditTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={e=>{if(e.key==='Enter')commitTitle();if(e.key==='Escape'){setEditing(false);setEditTitle(task.title)}}}
            onClick={e=>e.stopPropagation()}
            style={{ flex:1, padding:'2px 6px', borderRadius:4, fontSize:13, border:'1px solid var(--border-focus)', background:'var(--bg-elevated)', color:'var(--text-primary)', outline:'none' }}
          />
        ) : (
          <span onDoubleClick={e=>{e.stopPropagation();setEditing(true)}} style={{ flex:1, fontSize:'13px', color:'var(--text-primary)', fontWeight:task.depth===0?600:400 }}>{task.title}</span>
        )}

        {task.sprint_name && <span style={{ fontSize:'11px', color:'var(--accent)', background:'var(--accent-muted)', padding:'1px 7px', borderRadius:'var(--r-full)' }}>{task.sprint_name}</span>}

        {/* Inline status dropdown */}
        <div style={{ position:'relative' }} onClick={e=>e.stopPropagation()}>
          <div onClick={()=>setShowStatusDrop(v=>!v)} style={{ cursor:'pointer' }}>
            <StatusBadge status={task.status} onChange={undefined} />
          </div>
          {showStatusDrop && (
            <InlineDropdown options={STATUS_OPTIONS} labelMap={STATUS_LABEL} colorMap={undefined} current={task.status}
              onSelect={handleStatusChange} onClose={()=>setShowStatusDrop(false)} />
          )}
        </div>

        {task.due_date && <span style={{ fontSize:'11px', color:'var(--text-muted)', minWidth:50, textAlign:'right' }}>{new Date(task.due_date).toLocaleDateString('ko-KR',{month:'short',day:'numeric'})}</span>}
        {task.assignee ? <Avatar user={task.assignee} size={22}/> : <div style={{width:22}}/>}
        <div style={{ display:'flex', gap:4, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
          {depth<2 && <button onClick={e=>{e.stopPropagation();setShowAdd(v=>!v)}} style={{ background:'none',border:'1px solid var(--border)',color:'var(--text-muted)',cursor:'pointer',padding:'1px 8px',borderRadius:'var(--r-sm)',fontSize:'11px' }}>+ 하위</button>}
        </div>
      </div>
      {showAdd && (
        <form onSubmit={handleAddChild} style={{ display:'flex',gap:'6px',padding:`6px 16px 6px ${16+depth*20+60}px`,borderBottom:'1px solid var(--border)',background:'var(--bg-elevated)' }}>
          <input autoFocus value={addTitle} onChange={e=>setAddTitle(e.target.value)} placeholder={`${LEVEL[depth+1]||'하위'} 제목`} style={{ flex:1,padding:'4px 8px',borderRadius:'var(--r-sm)',fontSize:'12px',border:'1px solid var(--border-focus)',background:'var(--bg-surface)' }} />
          <button type="submit" style={{ padding:'4px 12px',background:'var(--accent)',color:'#fff',border:'none',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:'12px' }}>추가</button>
          <button type="button" onClick={()=>setShowAdd(false)} style={{ padding:'4px 10px',background:'transparent',border:'1px solid var(--border)',color:'var(--text-muted)',borderRadius:'var(--r-sm)',cursor:'pointer',fontSize:'12px' }}>취소</button>
        </form>
      )}
      {!collapsed && task.children?.map(child=><TaskRow key={child.id} task={child} depth={depth+1} animIndex={undefined} onTaskClick={onTaskClick} onChildCreated={onChildCreated} onTaskUpdate={onTaskUpdate} slug={slug} projectId={projectId} isSelected={isSelected} onSelect={onSelect} anySelected={anySelected}/>)}
    </div>
  )
}

export default function ProjectPage() {
  const { slug, projectId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToastStore(s => s.add)
  const [tasks, setTasks]         = useState([])
  const [flatTasks, setFlatTasks] = useState([])
  const [loading, setLoading]     = useState(true)
  const [project, setProject]     = useState(null)
  const [members, setMembers]     = useState([])
  const isResearch = project?.project_type === 'research'
  const [view, setView]           = useState('list')
  const [selectedTask, setSelectedTask] = useState(null)
  const [showAddEpic, setShowAddEpic]   = useState(false)
  const [epicTitle, setEpicTitle]       = useState('')
  const [filters, setFilters]           = useState({ search:'', status:[], priority:[], assignee:'' })
  const [selectedIds, setSelectedIds]   = useState(new Set())

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const clearSelect = () => setSelectedIds(new Set())

  const handleBulkStatus = async (status) => {
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => {
      const t = flatTasks.find(x => x.id === id)
      if (!t) return
      return updateTask(slug, t.projectId || projectId, id, { status }).then(u => handleTaskUpdate(u)).catch(() => {})
    }))
    clearSelect()
    toast(`${ids.length}개 상태 변경됨`, 'success')
  }

  const handleBulkPriority = async (priority) => {
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => {
      const t = flatTasks.find(x => x.id === id)
      if (!t) return
      return updateTask(slug, t.projectId || projectId, id, { priority }).then(u => handleTaskUpdate(u)).catch(() => {})
    }))
    clearSelect()
    toast(`${ids.length}개 우선순위 변경됨`, 'success')
  }

  const handleBulkAssign = async (userId) => {
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => {
      const t = flatTasks.find(x => x.id === id)
      if (!t) return
      return updateTask(slug, t.projectId || projectId, id, { assignee_id: userId }).then(u => handleTaskUpdate(u)).catch(() => {})
    }))
    clearSelect()
    toast(`${ids.length}개 담당자 변경됨`, 'success')
  }

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size}개 태스크를 삭제할까요?`)) return
    const ids = [...selectedIds]
    await Promise.all(ids.map(id => {
      const t = flatTasks.find(x => x.id === id)
      if (!t) return
      return deleteTask(slug, t.projectId || projectId, id).then(() => handleTaskDelete(id)).catch(() => {})
    }))
    clearSelect()
    toast(`${ids.length}개 삭제됨`, 'success')
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getTasks(slug, projectId, { tree:true }),
      getTasks(slug, projectId, { tree:false }),
      getProject(slug, projectId),
      getWorkspaceMembers(slug),
    ]).then(([tree,flat,proj,mem]) => {
      setTasks(tree); setFlatTasks(flat); setProject(proj); setMembers(mem)
      // Open drawer from URL ?task=<id>
      const taskId = searchParams.get('task')
      if (taskId) {
        const t = flat.find(x => x.id === taskId)
        if (t) setSelectedTask(t)
      }
    }).catch(()=>toast('불러오기 실패','error')).finally(()=>setLoading(false))
  }, [slug, projectId])

  const openTask = useCallback(task => {
    setSelectedTask(task)
    setSearchParams(p => { const n = new URLSearchParams(p); n.set('task', task.id); return n })
  }, [setSearchParams])

  const closeTask = useCallback(() => {
    setSelectedTask(null)
    setSearchParams(p => { const n = new URLSearchParams(p); n.delete('task'); return n })
  }, [setSearchParams])

  const filteredFlat = useMemo(() => {
    let list = flatTasks
    if (filters.search)         list = list.filter(t => t.title.toLowerCase().includes(filters.search.toLowerCase()))
    if (filters.status?.length)   list = list.filter(t => filters.status.includes(t.status))
    if (filters.priority?.length) list = list.filter(t => filters.priority.includes(t.priority))
    if (filters.assignee)         list = list.filter(t => String(t.assignee?.id) === String(filters.assignee))
    return list
  }, [flatTasks, filters])

  const filteredTree = useMemo(() => {
    if (!filters.search && !filters.status?.length && !filters.priority?.length && !filters.assignee) return tasks
    const matchIds = new Set(filteredFlat.map(t=>t.id))
    const filterTree = nodes => nodes.filter(n => matchIds.has(n.id) || filterTree(n.children||[]).length > 0).map(n => ({ ...n, children: filterTree(n.children||[]) }))
    return filterTree(tasks)
  }, [tasks, filteredFlat, filters])

  const handleAddEpic = async e => {
    e.preventDefault()
    if (!epicTitle.trim()) return
    try {
      const t = await createTask(slug, projectId, { title:epicTitle.trim(), status:'todo', priority:'medium' })
      setTasks(p=>[...p, {...t,children:[]}]); setFlatTasks(p=>[...p,t])
      setEpicTitle(''); setShowAddEpic(false); toast('Epic 추가됨','success')
    } catch { toast('추가 실패','error') }
  }

  const handleChildCreated = newTask => {
    setFlatTasks(p=>[...p,newTask])
    const add = nodes => nodes.map(n => n.id===newTask.parent ? {...n,children:[...(n.children||[]),{...newTask,children:[]}]} : {...n,children:add(n.children||[])})
    setTasks(p=>add(p))
  }

  const handleTaskUpdate = useCallback(updated => {
    setFlatTasks(p=>p.map(t=>t.id===updated.id?updated:t))
    const upd = nodes => nodes.map(n=>n.id===updated.id?{...n,...updated}:{...n,children:upd(n.children||[])})
    setTasks(p=>upd(p))
    if (selectedTask?.id===updated.id) setSelectedTask(updated)
  },[selectedTask])

  const handleTaskDelete = useCallback(id => {
    setFlatTasks(p=>p.filter(t=>t.id!==id))
    const rm = nodes => nodes.filter(n=>n.id!==id).map(n=>({...n,children:rm(n.children||[])}))
    setTasks(p=>rm(p))
    closeTask()
  },[closeTask])

  if (loading) return <div className="app-content"><PageLoader /></div>

  const doneCount = flatTasks.filter(t=>t.status==='done').length
  const progress  = flatTasks.length>0 ? Math.round(doneCount/flatTasks.length*100) : 0

  return (
    <div className="app-content">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', gap:'16px' }}>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>{project?.name||'프로젝트'}</h1>
          {project?.description && <p style={{ fontSize:'13px', color:'var(--text-muted)', margin:0 }}>{project.description}</p>}
          {flatTasks.length>0 && (
            <div style={{ marginTop:'10px', display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ flex:1, maxWidth:200, height:4, background:'var(--border)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'var(--success)', borderRadius:'var(--r-full)', transition:'width 0.4s var(--ease)' }}/>
              </div>
              <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{doneCount}/{flatTasks.length} 완료 ({progress}%)</span>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          <div style={{ display:'flex', background:'var(--bg-surface)', borderRadius:'var(--r-md)', border:'1px solid var(--border)', overflow:'hidden' }}>
            {[
              ['list','📋 리스트'],
              ['board','🗂️ 보드'],
              ...(isResearch ? [['notes','📝 노트'],['datasets','📊 데이터셋'],['refs','📚 레퍼런스'],['publication','📄 논문']] : []),
            ].map(([v,label])=>(
              <button key={v} onClick={()=>setView(v)} style={{ padding:'6px 14px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:500, background:view===v?'var(--bg-elevated)':'transparent', color:view===v?'var(--text-primary)':'var(--text-muted)' }}>{label}</button>
            ))}
          </div>
          <button onClick={()=>setShowAddEpic(true)} style={{ padding:'7px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>+ Epic</button>
        </div>
      </div>

      <TaskFilters filters={filters} onChange={setFilters} members={members} />
      <SavedViewBar
        slug={slug}
        projectId={projectId}
        currentFilters={filters}
        viewType={view}
        onApply={(savedFilters, savedViewType) => {
          setFilters(savedFilters)
          if (savedViewType) setView(savedViewType)
        }}
      />

      {showAddEpic && (
        <div style={{ margin:'12px 0', padding:'12px 14px', background:'var(--bg-surface)', borderRadius:'var(--r-md)', border:'1px solid var(--border-focus)' }}>
          <form onSubmit={handleAddEpic} style={{ display:'flex', gap:'8px' }}>
            <input autoFocus value={epicTitle} onChange={e=>setEpicTitle(e.target.value)} placeholder="새 Epic 제목" style={{ flex:1, padding:'6px 10px', borderRadius:'var(--r-md)', fontSize:'13px', border:'1px solid var(--border)', background:'var(--bg-elevated)', color:'var(--text-primary)', outline:'none' }} />
            <button type="submit" style={{ padding:'6px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>추가</button>
            <button type="button" onClick={()=>setShowAddEpic(false)} style={{ padding:'6px 12px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px' }}>취소</button>
          </form>
        </div>
      )}

      {view==='list' && (
        <div style={{ background:'var(--bg-surface)', borderRadius:'var(--r-lg)', border:'1px solid var(--border)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 16px 8px 60px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)' }}>
            <span style={{ flex:1, fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>제목</span>
            <span style={{ fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', width:80 }}>상태</span>
            <span style={{ fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', width:50 }}>마감</span>
            <span style={{ fontSize:'11px', fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', width:22 }}>담당</span>
            <span style={{ width:48 }}/>
          </div>
          <style>{`@keyframes fadeSlideIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
          {filteredTree.length===0 ? (
            <EmptyState icon="🗂️" title={flatTasks.length===0?"Epic이 없습니다":"검색 결과 없음"} description={flatTasks.length===0?"Epic을 추가해서 시작하세요.":"다른 검색어나 필터를 시도해보세요."} action={flatTasks.length===0?"+ Epic 추가":undefined} onAction={flatTasks.length===0?()=>setShowAddEpic(true):undefined}/>
          ) : filteredTree.map((t,i)=><TaskRow key={t.id} task={t} depth={0} animIndex={i} onTaskClick={openTask} onChildCreated={handleChildCreated} onTaskUpdate={handleTaskUpdate} slug={slug} projectId={projectId} isSelected={selectedIds.has(t.id)} onSelect={toggleSelect} anySelected={selectedIds.size > 0}/>)}
        </div>
      )}

      {view==='board' && (
        filteredFlat.length===0 ? (
          <EmptyState icon="🗂️" title="태스크가 없습니다" description="Epic을 먼저 추가해서 태스크를 만들어 보세요." action="+ Epic 추가" onAction={()=>setShowAddEpic(true)}/>
        ) : (
          <KanbanBoard tasks={filteredFlat} onTaskClick={openTask} onTaskUpdate={handleTaskUpdate}/>
        )
      )}

      {view==='notes'       && <ResearchNotePanel slug={slug} projectId={projectId} />}
      {view==='datasets'    && <DatasetPanel slug={slug} projectId={projectId} />}
      {view==='refs'        && <ReferencePanel slug={slug} projectId={projectId} />}
      {view==='publication' && <PublicationPanel project={project} slug={slug} projectId={projectId} onProjectUpdate={setProject} />}

      {selectedTask && <TaskDrawer task={selectedTask} onClose={closeTask} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} members={members}/>}

      {selectedIds.size > 0 && (
        <BulkToolbar
          count={selectedIds.size}
          members={members}
          onStatus={handleBulkStatus}
          onPriority={handleBulkPriority}
          onAssign={handleBulkAssign}
          onDelete={handleBulkDelete}
          onClear={clearSelect}
        />
      )}
    </div>
  )
}
