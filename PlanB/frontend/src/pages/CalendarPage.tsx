import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import TimelineView from '../components/TimelineView'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import useToastStore from '../store/toastStore'
import { getEvents, createEvent, updateEvent, deleteEvent, getProjects, getTasks, createTask } from '../lib/workspaceApi'

const EVENT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
]
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAYS   = ['일','월','화','수','목','금','토']

// 로컬 날짜를 YYYY-MM-DD로 변환 (toISOString은 UTC 기준이라 날짜 오차 발생)
function toLocalDateStr(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function fmtTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────

function MiniCalendar({ events, currentDate, onDateSelect }) {
  const [view, setView] = useState(() => { const d = new Date(currentDate); d.setDate(1); return d })
  const yr = view.getFullYear()
  const mo = view.getMonth()
  const startDay = new Date(yr, mo, 1).getDay()
  const daysInMo = new Date(yr, mo + 1, 0).getDate()
  const eventDays = new Set()
  events.forEach(e => {
    const s = new Date(e.start)
    if (s.getFullYear() === yr && s.getMonth() === mo) eventDays.add(s.getDate())
  })
  const today = new Date()
  const isSame = (a, b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
  const cells = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMo; d++) cells.push(d)

  return (
    <div className="calendar-mini" style={{ width:220, flexShrink:0, borderRight:'1px solid var(--border)', padding:'16px 10px', display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={() => setView(new Date(yr, mo-1, 1))} style={iconBtn}>‹</button>
        <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{yr}년 {MONTHS[mo]}</span>
        <button onClick={() => setView(new Date(yr, mo+1, 1))} style={iconBtn}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {DAYS.map((d,i) => (
          <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600, padding:'2px 0', color:i===0?'#f87171':'var(--text-muted)' }}>{d}</div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'2px 0' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />
          const d = new Date(yr, mo, day)
          const isTod = isSame(d, today)
          const isSel = isSame(d, currentDate)
          const hasDot = eventDays.has(day)
          const isSun = (startDay + day - 1) % 7 === 0
          return (
            <button key={day} onClick={() => onDateSelect(d)} style={{
              background: isSel?'var(--accent)':isTod?'var(--accent-muted)':'transparent',
              color: isSel?'#fff':isTod?'var(--accent)':isSun?'#f87171':'var(--text-primary)',
              border:'none', borderRadius:5, cursor:'pointer', padding:'4px 0',
              fontSize:11, fontWeight:(isTod||isSel)?700:400,
              display:'flex', flexDirection:'column', alignItems:'center',
            }}>
              {day}
              {hasDot && <span style={{ width:3, height:3, borderRadius:'50%', background:isSel?'#fff':'var(--accent)', marginTop:1 }} />}
            </button>
          )
        })}
      </div>
      <div style={{ paddingTop:8, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:4 }}>
        <button onClick={() => onDateSelect(new Date())} style={quickBtn}>오늘로 이동</button>
        <button onClick={() => {
          const d = new Date(); const dow = d.getDay()
          d.setDate(d.getDate() - (dow===0?6:dow-1))
          onDateSelect(d)
        }} style={quickBtn}>이번 주</button>
      </div>

      {/* Agenda: next 7 days */}
      {events.length > 0 && (() => {
        const now = new Date(); now.setHours(0,0,0,0)
        const end7 = new Date(now); end7.setDate(end7.getDate() + 7)
        const upcoming = events
          .filter(e => { const s = new Date(e.start); return s >= now && s <= end7 && !e.extendedProps?.isTask })
          .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        if (!upcoming.length) return null
        const byDay: Record<string, { label: string; events: any[] }> = {}
        upcoming.forEach(e => {
          const d = new Date(e.start); d.setHours(0,0,0,0)
          const k = d.toDateString()
          if (!byDay[k]) byDay[k] = { label: d.getDate()===now.getDate() ? '오늘' : d.getDate()===now.getDate()+1 ? '내일' : `${d.getMonth()+1}/${d.getDate()}`, events:[] }
          byDay[k].events.push(e)
        })
        return (
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>다가오는 일정</div>
            {Object.values(byDay).map((group, gi) => (
              <div key={gi} style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:600, color:'var(--text-muted)', marginBottom:3 }}>{group.label}</div>
                {group.events.map(e => (
                  <div key={e.id} style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2 }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background: e.backgroundColor || 'var(--accent)', flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

const iconBtn  = { background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:'2px 6px', borderRadius:4, display:'flex', alignItems:'center', lineHeight:1 }
const quickBtn = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, padding:'6px', fontSize:11, color:'var(--text-secondary)', cursor:'pointer', width:'100%' }

// ─── Event View Popover ────────────────────────────────────────────────────

function EventViewPopover({ event, pos, onClose, onDelete, onEdit, onTitleChange, slug }) {
  const raw = event?.extendedProps?.raw
  const isTask = event?.extendedProps?.isTask
  const [title, setTitle] = useState(raw?.title || '')
  const [saving, setSaving] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState('')
  const [converting, setConverting] = useState(false)
  const toast = useToastStore(s => s.add)
  const popW = 280
  const left = Math.min(pos.x, window.innerWidth - popW - 16)
  const top  = Math.min(pos.y + 8, window.innerHeight - 280)

  const handleOpenConvert = async () => {
    setShowConvert(true)
    if (projects.length === 0) {
      try {
        const list = await getProjects(slug)
        setProjects(list)
        if (list.length > 0) setSelectedProject(list[0].id)
      } catch { toast('프로젝트 불러오기 실패', 'error') }
    }
  }

  const handleConvert = async () => {
    if (!selectedProject) return
    setConverting(true)
    try {
      const dueDate = raw?.start_at ? raw.start_at.slice(0, 10) : null
      await createTask(slug, selectedProject, { title: raw?.title || '', due_date: dueDate, status: 'todo' })
      toast('태스크로 변환됨', 'success')
      setShowConvert(false)
      onClose()
    } catch { toast('변환 실패', 'error') }
    setConverting(false)
  }

  const handleBlur = async () => {
    if (title.trim() && title.trim() !== raw?.title) {
      setSaving(true)
      await onTitleChange(event.id, title.trim())
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:299 }} />
      <div style={{ position:'fixed', left, top, width:popW, zIndex:300, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', boxShadow:'var(--shadow-lg)', padding:'14px 16px', animation:'fadeIn 0.12s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:isTask?'#f59e0b':'var(--accent)', display:'inline-block' }} />
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, padding:'0 0 0 8px' }}>×</button>
        </div>
        {isTask ? (
          <>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:8, padding:'2px 4px' }}>
              {raw?.title}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
              마감일: {raw?.due_date}
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 10px', background:'var(--bg-elevated)', borderRadius:6, border:'1px solid var(--border)' }}>
              태스크 마감일 (편집은 프로젝트에서)
            </div>
          </>
        ) : (
          <>
            <div
              contentEditable suppressContentEditableWarning
              onBlur={handleBlur}
              onInput={e => setTitle(e.currentTarget.textContent)}
              style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', outline:'none', marginBottom:8, padding:'2px 4px', borderRadius:4, cursor:'text', minHeight:20 }}
            >{raw?.title}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom: raw?.description ? 8 : 14 }}>
              {fmtTime(raw?.start_at)} → {fmtTime(raw?.end_at)}
            </div>
            {raw?.description && (
              <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:12, padding:'6px 8px', background:'var(--bg-elevated)', borderRadius:6, lineHeight:1.5, borderLeft:'2px solid var(--border)' }}>
                {raw.description}
              </div>
            )}
            <div style={{ display:'flex', gap:6 }}>
              <button onClick={() => { onEdit(event); onClose() }} style={{ flex:1, padding:'6px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', fontSize:12, color:'var(--text-primary)' }}>편집</button>
              <button onClick={() => { onDelete(event.id); onClose() }} style={{ flex:1, padding:'6px', background:'transparent', border:'1px solid var(--danger)', borderRadius:6, cursor:'pointer', fontSize:12, color:'var(--danger)' }}>삭제</button>
            </div>
            <button onClick={handleOpenConvert} style={{ width:'100%', marginTop:6, padding:'6px', background:'transparent', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', fontSize:12, color:'var(--text-secondary)', textAlign:'left' }}>
              📋 태스크로 변환
            </button>
            {showConvert && (
              <div style={{ marginTop:8, padding:'10px', background:'var(--bg-elevated)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:6 }}>프로젝트 선택</div>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  style={{ width:'100%', padding:'5px 8px', borderRadius:5, border:'1px solid var(--border)', background:'var(--bg-surface)', color:'var(--text-primary)', fontSize:12, marginBottom:8, outline:'none' }}
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={handleConvert} disabled={converting || !selectedProject} style={{ flex:1, padding:'5px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:5, cursor:'pointer', fontSize:11, fontWeight:500, opacity: converting ? 0.7 : 1 }}>
                    {converting ? '변환 중…' : '변환'}
                  </button>
                  <button onClick={() => setShowConvert(false)} style={{ flex:1, padding:'5px', background:'transparent', border:'1px solid var(--border)', borderRadius:5, cursor:'pointer', fontSize:11, color:'var(--text-muted)' }}>취소</button>
                </div>
              </div>
            )}
            {saving && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>저장 중…</div>}
          </>
        )}
      </div>
    </>
  )
}

// ─── Quick Create Popover ──────────────────────────────────────────────────

function QuickCreatePopover({ date, pos, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  const popW   = 240
  const left   = Math.min(pos.x, window.innerWidth - popW - 16)
  const top    = Math.min(pos.y + 8, window.innerHeight - 140)
  const dateStr = toLocalDateStr(date)

  const submit = e => {
    e.preventDefault()
    if (!title.trim()) return
    onCreate({ title:title.trim(), start_at:`${dateStr}T09:00:00`, end_at:`${dateStr}T10:00:00`, is_all_day:false, visibility:'public', color:'#6366f1' })
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:299 }} />
      <div style={{ position:'fixed', left, top, width:popW, zIndex:300, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', boxShadow:'var(--shadow-lg)', padding:'14px', animation:'fadeIn 0.12s ease' }}>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:8 }}>
          {date.getMonth()+1}월 {date.getDate()}일 이벤트 추가
        </div>
        <form onSubmit={submit}>
          <input
            ref={ref} value={title} onChange={e=>setTitle(e.target.value)} placeholder="이벤트 제목"
            style={{ width:'100%', boxSizing:'border-box', padding:'7px 10px', borderRadius:6, border:'1px solid var(--border-focus)', background:'var(--bg-elevated)', color:'var(--text-primary)', fontSize:13, marginBottom:8, outline:'none' }}
            onKeyDown={e => e.key==='Escape' && onClose()}
          />
          <div style={{ display:'flex', gap:6 }}>
            <button type="submit" style={{ flex:1, padding:'6px', background:'var(--accent)', border:'none', borderRadius:6, cursor:'pointer', fontSize:12, color:'#fff', fontWeight:500 }}>추가</button>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'6px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', fontSize:12, color:'var(--text-muted)' }}>취소</button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Event Form Panel ──────────────────────────────────────────────────────

function EventFormPanel({ form, setForm, onSubmit, onClose, isEditing }) {
  const inp = { width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:'var(--r-md)', fontSize:13, background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-primary)', outline:'none' } as React.CSSProperties
  const lbl = { display:'block', fontSize:12, color:'var(--text-muted)', marginBottom:6, fontWeight:500 }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(380px, 100vw)', zIndex:201, background:'var(--bg-surface)', borderLeft:'1px solid var(--border)', boxShadow:'var(--shadow-lg)', padding:'24px', display:'flex', flexDirection:'column', gap:14, animation:'slideInRight 0.2s ease' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:16, fontWeight:700, margin:0 }}>{isEditing?'이벤트 편집':'새 이벤트'}</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>
        <form onSubmit={onSubmit} style={{ display:'flex', flexDirection:'column', gap:14, flex:1 }}>
          <div>
            <label style={lbl}>제목</label>
            <input style={inp} value={form.title} required onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="이벤트 제목" autoFocus />
          </div>
          <div>
            <label style={lbl}>시작</label>
            <input type="datetime-local" style={inp} value={form.start_at.slice(0,16)} required onChange={e=>setForm(f=>({...f,start_at:e.target.value+':00'}))} />
          </div>
          <div>
            <label style={lbl}>종료</label>
            <input type="datetime-local" style={inp} value={form.end_at.slice(0,16)} required onChange={e=>setForm(f=>({...f,end_at:e.target.value+':00'}))} />
          </div>
          <div>
            <label style={lbl}>색상</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={()=>setForm(f=>({...f,color:c}))} style={{ width:24, height:24, borderRadius:'50%', background:c, border:'none', outline:form.color===c?`3px solid ${c}`:'3px solid transparent', outlineOffset:2, cursor:'pointer', boxShadow:form.color===c?`0 0 0 2px var(--bg-surface)`:'none' }} />
              ))}
            </div>
          </div>
          <div>
            <label style={lbl}>설명 (선택)</label>
            <textarea style={{ ...inp, resize:'vertical', minHeight:64, lineHeight:1.5 }} value={form.description || ''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="이벤트 설명 추가..." />
          </div>
          <div>
            <label style={lbl}>공개 여부</label>
            <select style={inp} value={form.visibility} onChange={e=>setForm(f=>({...f,visibility:e.target.value}))}>
              <option value="public">🌍 공개</option>
              <option value="private">🔒 비공개</option>
            </select>
          </div>
          <div style={{ marginTop:'auto', display:'flex', gap:8 }}>
            <button type="submit" style={{ flex:1, padding:'9px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
              {isEditing?'저장':'추가'}
            </button>
            <button type="button" onClick={onClose} style={{ flex:1, padding:'9px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:13 }}>
              취소
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { slug } = useParams()
  const toast = useToastStore(s => s.add)
  const calRef = useRef(null)

  const [calMode, setCalMode]         = useState('calendar')
  const [events, setEvents]           = useState([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventPopover, setEventPopover] = useState(null)
  const [quickCreate, setQuickCreate]   = useState(null)
  const [showForm, setShowForm]         = useState(false)
  const [editingId, setEditingId]       = useState(null)
  const [form, setForm] = useState({ title:'', start_at:'', end_at:'', is_all_day:false, visibility:'public', color:'#6366f1', description:'' })

  const toFcEvent = e => ({
    id:e.id, title:e.title, start:e.start_at, end:e.end_at, allDay:e.is_all_day,
    backgroundColor:e.color||'#6366f1', borderColor:e.color||'#6366f1', textColor:'#fff',
    extendedProps:{ raw:e },
  })

  useEffect(() => {
    const loadAll = async () => {
      try {
        const calEvents = await getEvents(slug)
        const mapped = calEvents.map(toFcEvent)

        // Load task due dates from all projects
        const projects = await getProjects(slug).catch(() => [])
        const taskArrays = await Promise.all(
          projects.map(p => getTasks(slug, p.id, { tree: false }).catch(() => []))
        )
        const taskEvents = taskArrays.flat()
          .filter(t => t.due_date)
          .map(t => ({
            id: `task-${t.id}`,
            title: `◆ ${t.title}`,
            start: t.due_date,
            allDay: true,
            backgroundColor: '#f59e0b',
            borderColor: '#f59e0b',
            textColor: '#fff',
            extendedProps: { isTask: true, raw: t },
          }))

        setEvents([...mapped, ...taskEvents])
      } catch {
        toast('불러오기 실패', 'error')
      }
    }
    loadAll()
  }, [slug])

  useEffect(() => {
    const onKey = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      const api = calRef.current?.getApi()
      if (!api) return
      if (e.key === 'j' || e.key === 'J') api.next()
      if (e.key === 'k' || e.key === 'K') api.prev()
      if (e.key === 't' || e.key === 'T') api.today()
      if (e.key === 'm' || e.key === 'M') { setCalMode('calendar'); api.changeView('dayGridMonth') }
      if (e.key === 'w' || e.key === 'W') { setCalMode('calendar'); api.changeView('timeGridWeek') }
      if (e.key === 'd' || e.key === 'D') { setCalMode('calendar'); api.changeView('timeGridDay') }
      if (e.key === 'n' || e.key === 'N') openNewForm(toLocalDateStr(new Date()))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [calMode])

  const handleDateSelect = date => {
    setCurrentDate(date)
    calRef.current?.getApi()?.gotoDate(date)
  }

  const openNewForm = dateStr => {
    setEditingId(null)
    setForm({ title:'', start_at:`${dateStr}T09:00:00`, end_at:`${dateStr}T10:00:00`, is_all_day:false, visibility:'public', color:'#6366f1', description:'' })
    setShowForm(true)
  }

  const openEditForm = fcEvent => {
    const raw = fcEvent.extendedProps.raw
    setEditingId(fcEvent.id)
    setForm({ title:raw.title, start_at:raw.start_at, end_at:raw.end_at, is_all_day:raw.is_all_day, visibility:raw.visibility, color:raw.color||'#6366f1', description:raw.description||'' })
    setShowForm(true)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      if (editingId) {
        const updated = await updateEvent(slug, editingId, form)
        setEvents(prev => prev.map(ev => ev.id===editingId ? toFcEvent(updated) : ev))
        toast('이벤트 수정됨','success')
      } else {
        const ev = await createEvent(slug, form)
        setEvents(prev => [...prev, toFcEvent(ev)])
        toast('이벤트 추가됨','success')
      }
      setShowForm(false)
    } catch { toast('저장 실패','error') }
  }

  const handleDelete = async eventId => {
    try {
      await deleteEvent(slug, eventId)
      setEvents(prev => prev.filter(e => e.id!==eventId))
      toast('이벤트 삭제됨','success')
    } catch { toast('삭제 실패','error') }
  }

  const handleTitleChange = async (eventId, newTitle) => {
    try {
      const raw = events.find(e => e.id===eventId)?.extendedProps?.raw
      if (!raw) return
      const updated = await updateEvent(slug, eventId, { ...raw, title:newTitle })
      setEvents(prev => prev.map(ev => ev.id===eventId ? toFcEvent(updated) : ev))
    } catch { toast('저장 실패','error') }
  }

  return (
    <div className="app-content" style={{ padding:0, display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>캘린더</h1>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', overflow:'hidden' }}>
            {[['calendar','📅 캘린더'],['timeline','📊 타임라인']].map(([mode, label]) => (
              <button key={mode} onClick={() => setCalMode(mode)} style={{ padding:'6px 14px', background: calMode===mode ? 'var(--accent)' : 'transparent', color: calMode===mode ? '#fff' : 'var(--text-muted)', border:'none', cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.15s' }}>{label}</button>
            ))}
          </div>
          {calMode === 'calendar' && (
            <button onClick={() => openNewForm(toLocalDateStr(new Date()))} style={{ padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              + 이벤트 추가
            </button>
          )}
        </div>
      </div>

      {calMode === 'timeline' && (
        <div style={{ height:'calc(100vh - 120px)', display:'flex', overflow:'hidden' }}>
          <TimelineView slug={slug} />
        </div>
      )}

      <div className="calendar-main" style={{ display: calMode === 'timeline' ? 'none' : 'flex', flex:1, overflow:'hidden', minHeight:0 }}>
        <MiniCalendar events={events} currentDate={currentDate} onDateSelect={handleDateSelect} />

        <div className="calendar-fc-wrap" style={{ flex:1, padding:'16px 20px', overflowY:'auto', '--fc-border-color':'var(--border)', '--fc-today-bg-color':'var(--accent-muted)', '--fc-page-bg-color':'transparent' } as React.CSSProperties}>
          <style>{`
            .fc{color:var(--text-primary);font-family:'Inter',sans-serif}
            .fc .fc-toolbar-title{font-size:15px;font-weight:700}
            .fc .fc-button{background:var(--bg-elevated);border-color:var(--border);color:var(--text-primary);font-size:12px;padding:4px 10px}
            .fc .fc-button:hover{background:var(--bg-hover);border-color:var(--border)}
            .fc .fc-button-primary:not(:disabled).fc-button-active{background:var(--accent);border-color:var(--accent);color:#fff}
            .fc .fc-col-header-cell-cushion,.fc .fc-daygrid-day-number{color:var(--text-secondary);font-size:12px}
            .fc .fc-day-today .fc-daygrid-day-number{color:var(--accent);font-weight:700}
            .fc .fc-event{border-radius:5px;font-size:11px;padding:1px 5px;cursor:pointer}
            .fc .fc-daygrid-event{margin:1px 2px}
          `}</style>
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            events={events}
            editable
            eventResizableFromStart
            selectable
            select={info => {
              setEventPopover(null)
              setQuickCreate({ date:info.start, endDate:info.end, pos:{ x:info.jsEvent?.clientX || 400, y:info.jsEvent?.clientY || 300 } })
              calRef.current?.getApi()?.unselect()
            }}
            dateClick={info => {
              setEventPopover(null)
              setQuickCreate({ date:info.date, pos:{ x:info.jsEvent.clientX, y:info.jsEvent.clientY } })
            }}
            eventClick={info => {
              info.jsEvent.stopPropagation()
              setQuickCreate(null)
              setEventPopover({ event:info.event, pos:{ x:info.jsEvent.clientX, y:info.jsEvent.clientY } })
            }}
            eventDrop={async info => {
              if (info.event.extendedProps?.isTask) { info.revert(); return; }
              try {
                const raw = info.event.extendedProps.raw
                await updateEvent(slug, info.event.id, { ...raw, start_at:info.event.startStr, end_at:info.event.endStr||info.event.startStr })
                setEvents(prev => prev.map(ev => ev.id!==info.event.id ? ev : { ...ev, start:info.event.startStr, end:info.event.endStr||info.event.startStr }))
                toast('이벤트 이동됨','success')
              } catch { info.revert(); toast('이동 실패','error') }
            }}
            eventResize={async info => {
              if (info.event.extendedProps?.isTask) { info.revert(); return; }
              try {
                const raw = info.event.extendedProps.raw
                await updateEvent(slug, info.event.id, { ...raw, start_at:info.event.startStr, end_at:info.event.endStr })
                toast('이벤트 조정됨','success')
              } catch { info.revert(); toast('조정 실패','error') }
            }}
            datesSet={info => setCurrentDate(info.start)}
            height="auto"
            headerToolbar={{ left:'prev,next today', center:'title', right:'dayGridMonth,timeGridWeek,timeGridDay' }}
          />
        </div>
      </div>

      {eventPopover && (
        <EventViewPopover
          event={eventPopover.event} pos={eventPopover.pos}
          onClose={() => setEventPopover(null)}
          onDelete={handleDelete} onEdit={openEditForm} onTitleChange={handleTitleChange}
          slug={slug}
        />
      )}
      {quickCreate && (
        <QuickCreatePopover
          date={quickCreate.date} pos={quickCreate.pos}
          onClose={() => setQuickCreate(null)}
          onCreate={async data => {
            try {
              const ev = await createEvent(slug, data)
              setEvents(prev => [...prev, toFcEvent(ev)])
              toast('이벤트 추가됨','success')
            } catch { toast('저장 실패','error') }
          }}
        />
      )}
      {showForm && (
        <EventFormPanel
          form={form} setForm={setForm}
          onSubmit={handleSubmit} onClose={() => setShowForm(false)}
          isEditing={!!editingId}
        />
      )}
    </div>
  )
}
