import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getProjects, getTasks, getEvents, getSprints, getSprintStats, updateTask } from '../lib/workspaceApi'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import { useCountUp } from '../hooks/useCountUp'
import { Skeleton } from '../components/ui/Skeleton'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

const todayMidnight = () => { const d = new Date(); d.setHours(0,0,0,0); return d }
const endOfDay = (d) => { const e = new Date(d); e.setHours(23,59,59,999); return e }
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

function groupTasksByDue(tasks) {
  const now = todayMidnight()
  const eod = endOfDay(now)
  const eow = new Date(now); eow.setDate(eow.getDate() + 7)
  const overdue = [], today = [], thisWeek = [], later = [], noDue = []
  for (const t of tasks) {
    if (t.status === 'done' || t.status === 'cancelled') continue
    if (!t.due_date) { noDue.push(t); continue }
    const d = new Date(t.due_date)
    if (d < now) overdue.push(t)
    else if (d <= eod) today.push(t)
    else if (d <= eow) thisWeek.push(t)
    else later.push(t)
  }
  return { overdue, today, thisWeek, later, noDue }
}

function dueBadge(due_date) {
  if (!due_date) return null
  const d = new Date(due_date)
  const now = todayMidnight()
  const diff = Math.round((d - now) / 86400000)
  if (diff < 0) return { label: `${Math.abs(diff)}일 지남`, color: '#ef4444' }
  if (diff === 0) return { label: '오늘', color: 'var(--accent)' }
  if (diff === 1) return { label: '내일', color: '#f59e0b' }
  return { label: `${MONTHS[d.getMonth()]} ${d.getDate()}일`, color: 'var(--text-muted)' }
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
function HeroCard({ myTasks, events, user, slug }) {
  const navigate = useNavigate()
  const groups = useMemo(() => groupTasksByDue(myTasks), [myTasks])
  const urgentCount = groups.overdue.length + groups.today.length
  const doneToday = myTasks.filter(t => {
    if (t.status !== 'done') return false
    const d = new Date(t.updated_at)
    return d.toDateString() === new Date().toDateString()
  }).length
  const todayEvents = events.filter(e => {
    const s = new Date(e.start_at || e.start)
    return s.toDateString() === new Date().toDateString()
  })
  const now = new Date()
  const greeting = now.getHours() < 12 ? '좋은 아침이에요' : now.getHours() < 18 ? '좋은 오후예요' : '좋은 저녁이에요'
  const dateLabel = `${now.getFullYear()}년 ${MONTHS[now.getMonth()]} ${now.getDate()}일 (${DAYS[now.getDay()]})`
  const urgentNum = useCountUp(urgentCount)
  const doneNum = useCountUp(doneToday)

  return (
    <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(16,185,129,0.08) 100%)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 16, padding: '24px 28px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 32 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{dateLabel}</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {greeting}{user?.username ? `, ${user.username}` : ''}! 👋
        </h1>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: urgentCount > 0 ? '#ef4444' : 'var(--success)', lineHeight: 1 }}>{urgentNum}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>긴급 · 오늘</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{doneNum}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>오늘 완료</div>
          </div>
          <div style={{ width: 1, background: 'var(--border)', alignSelf: 'stretch' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: todayEvents.length > 0 ? 'var(--accent)' : 'var(--text-muted)', lineHeight: 1 }}>{todayEvents.length}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>오늘 일정</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {urgentCount > 0 && (
          <button onClick={() => {}} style={{ padding: '7px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            🚨 긴급 {urgentCount}개 처리
          </button>
        )}
        <button onClick={() => navigate(`/workspaces/${slug}/calendar`)} style={{ padding: '7px 14px', background: 'var(--accent-muted)', border: '1px solid var(--border-focus)', borderRadius: 8, color: 'var(--accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          📅 캘린더 보기
        </button>
      </div>
    </div>
  )
}

// ─── Project Health RAG ───────────────────────────────────────────────────────
function ragStatus(project, allTasks) {
  const tasks = allTasks.filter(t => t.projectId === project.id && t.status !== 'cancelled')
  const done = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && new Date(t.due_date) < todayMidnight()).length
  const total = tasks.length
  const pct = total > 0 ? done / total : 0
  const overduePct = total > 0 ? overdue / total : 0
  if (overduePct > 0.25 || pct < 0.2) return 'red'
  if (overduePct > 0.1 || pct < 0.5) return 'amber'
  return 'green'
}

const RAG_META = {
  green: { color: 'var(--rag-green)', label: '정상' },
  amber: { color: 'var(--rag-amber)', label: '주의' },
  red:   { color: 'var(--rag-red)',   label: '위험' },
}

function ProjectHealthPanel({ projects, allTasks, slug }) {
  const navigate = useNavigate()
  const items = useMemo(() =>
    projects.map(p => ({ ...p, rag: ragStatus(p, allTasks) }))
      .sort((a, b) => ['red','amber','green'].indexOf(a.rag) - ['red','amber','green'].indexOf(b.rag))
  , [projects, allTasks])

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>프로젝트 건강도</h3>
      {items.length === 0
        ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>프로젝트 없음</div>
        : items.map(p => {
          const meta = RAG_META[p.rag]
          const tasks = allTasks.filter(t => t.projectId === p.id && t.status !== 'cancelled')
          const done = tasks.filter(t => t.status === 'done').length
          const pct = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0
          return (
            <div key={p.id} onClick={() => navigate(`/workspaces/${slug}/projects/${p.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            >
              <span style={{ color: meta.color, fontSize: 9 }}>●</span>
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <div style={{ width: 50, height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: meta.color, borderRadius: 99 }} />
              </div>
              <span style={{ fontSize: 10, color: meta.color, minWidth: 26, textAlign: 'right', fontWeight: 600 }}>{pct}%</span>
            </div>
          )
        })
      }
    </div>
  )
}

// ─── Activity Heatmap ─────────────────────────────────────────────────────────
function buildHeatmap(allTasks) {
  const counts = {}
  for (const t of allTasks) {
    if (t.status !== 'done' || !t.updated_at) continue
    const d = new Date(t.updated_at)
    const key = isoDate(d)
    counts[key] = (counts[key] || 0) + 1
  }
  const today = new Date(); today.setHours(0,0,0,0)
  const cells = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    cells.push({ date: isoDate(d), count: counts[isoDate(d)] || 0 })
  }
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i+7))
  return weeks
}

function heatLevel(count) {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

function ActivityHeatmap({ allTasks }) {
  const weeks = useMemo(() => buildHeatmap(allTasks), [allTasks])
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>활동 히트맵 (최근 1년)</h3>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>적음</span>
          {[0,1,2,3,4].map(l => <div key={l} style={{ width: 9, height: 9, borderRadius: 2, background: `var(--heatmap-${l})` }} />)}
          <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>많음</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 2 }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {week.map((cell, di) => (
              <div key={di} title={`${cell.date}: ${cell.count}개 완료`}
                style={{ width: 10, height: 10, borderRadius: 2, background: `var(--heatmap-${heatLevel(cell.count)})`, cursor: cell.count > 0 ? 'pointer' : 'default', transition: 'transform 0.1s' }}
                onMouseEnter={e => { if (cell.count > 0) e.currentTarget.style.transform = 'scale(1.4)' }}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Team Workload ────────────────────────────────────────────────────────────
function TeamWorkloadPanel({ allTasks }) {
  const workload = useMemo(() => {
    const map = {}
    for (const t of allTasks) {
      if (t.status === 'done' || t.status === 'cancelled' || !t.assignee) continue
      const a = t.assignee
      const key = a.id
      if (!map[key]) map[key] = { name: a.username || a.email || 'Unknown', count: 0 }
      map[key].count++
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [allTasks])

  const max = Math.max(...workload.map(w => w.count), 1)

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>팀 워크로드</h3>
      {workload.length === 0
        ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>할당된 태스크 없음</div>
        : workload.map((w, i) => {
          const pct = Math.round(w.count / max * 100)
          const color = pct > 80 ? 'var(--rag-red)' : pct > 50 ? 'var(--rag-amber)' : 'var(--rag-green)'
          return (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{w.name}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color }}>{w.count}개</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s' }} />
              </div>
            </div>
          )
        })
      }
    </div>
  )
}

// ─── Sprint Velocity ──────────────────────────────────────────────────────────
function VelocityPanel({ activeSprints }) {
  const data = useMemo(() =>
    activeSprints.slice(0, 6).map(({ sprint, project }) => {
      const total = sprint.stats?.tasks_count ?? 0
      const done  = sprint.stats?.completed_count ?? 0
      return { name: sprint.name.length > 7 ? sprint.name.slice(0,6)+'…' : sprint.name, pct: total > 0 ? Math.round(done/total*100) : 0, project: project.name }
    })
  , [activeSprints])
  if (data.length === 0) return null
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>스프린트 진행률</h3>
      <ResponsiveContainer width="100%" height={90}>
        <BarChart data={data} barSize={18}>
          <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} formatter={v => [`${v}%`, '완료율']} labelFormatter={(l, p) => p?.[0]?.payload?.project || l} />
          <Bar dataKey="pct" radius={[3,3,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={d.pct >= 70 ? 'var(--rag-green)' : d.pct >= 40 ? 'var(--rag-amber)' : 'var(--rag-red)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── My Tasks Panel ───────────────────────────────────────────────────────────
function TaskRow({ task, slug, onToggleDone }) {
  const navigate = useNavigate()
  const badge = dueBadge(task.due_date)
  const isDone = task.status === 'done'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
      <button onClick={() => onToggleDone(task)}
        style={{ width:15, height:15, borderRadius:'50%', border:`2px solid ${isDone ? 'var(--success)' : 'var(--border)'}`, background: isDone ? 'var(--success)' : 'transparent', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff', transition:'all 0.15s' }}
      >{isDone ? '✓' : ''}</button>
      <div onClick={() => navigate(`/workspaces/${slug}/projects/${task.projectId}?task=${task.id}`)} style={{ flex:1, minWidth:0, cursor:'pointer' }}>
        <div style={{ fontSize:12, color: isDone ? 'var(--text-muted)' : 'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</div>
        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{task.projectName}</div>
      </div>
      {badge && <span style={{ fontSize:10, color: badge.color, flexShrink:0 }}>{badge.label}</span>}
    </div>
  )
}

function SectionHead({ label, count, accent }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:10, marginBottom:2 }}>
      <span style={{ fontSize:10, fontWeight:700, color: accent || 'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</span>
      {count > 0 && <span style={{ fontSize:9, background: accent ? `${accent}22` : 'var(--bg-elevated)', color: accent || 'var(--text-muted)', borderRadius:'var(--r-full)', padding:'1px 5px', fontWeight:600 }}>{count}</span>}
    </div>
  )
}

function MyTasksPanel({ tasks, slug, onToggleDone }) {
  const groups = useMemo(() => groupTasksByDue(tasks), [tasks])
  const activeCount = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <h3 style={{ fontSize:13, fontWeight:600, margin:0 }}>나의 태스크</h3>
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{doneCount}/{doneCount + activeCount}</span>
      </div>
      {activeCount === 0 && doneCount === 0 && <div style={{ textAlign:'center', padding:'16px 0', fontSize:12, color:'var(--text-muted)' }}>할당 태스크 없음 🎉</div>}
      {groups.overdue.length > 0 && <><SectionHead label="기한 초과" count={groups.overdue.length} accent="#ef4444" />{groups.overdue.map(t => <TaskRow key={t.id} task={t} slug={slug} onToggleDone={onToggleDone} />)}</>}
      {groups.today.length > 0 && <><SectionHead label="오늘" count={groups.today.length} accent="var(--accent)" />{groups.today.map(t => <TaskRow key={t.id} task={t} slug={slug} onToggleDone={onToggleDone} />)}</>}
      {groups.thisWeek.length > 0 && <><SectionHead label="이번 주" count={groups.thisWeek.length} />{groups.thisWeek.map(t => <TaskRow key={t.id} task={t} slug={slug} onToggleDone={onToggleDone} />)}</>}
      {groups.later.length > 0 && <><SectionHead label="나중에" count={groups.later.length} />{groups.later.slice(0,3).map(t => <TaskRow key={t.id} task={t} slug={slug} onToggleDone={onToggleDone} />)}{groups.later.length > 3 && <div style={{ fontSize:11, color:'var(--text-muted)', padding:'4px 0' }}>+{groups.later.length - 3}개 더</div>}</>}
    </div>
  )
}

function TodayEventsPanel({ events, slug }) {
  const navigate = useNavigate()
  const todayEvents = useMemo(() =>
    events.filter(e => { const s = new Date(e.start_at || e.start); return s.toDateString() === new Date().toDateString() })
      .sort((a,b) => new Date(a.start_at||a.start) - new Date(b.start_at||b.start))
  , [events])
  const fmtTime = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <h3 style={{ fontSize:13, fontWeight:600, margin:0 }}>오늘 일정</h3>
        <button onClick={() => navigate(`/workspaces/${slug}/calendar`)} style={{ fontSize:10, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', padding:0 }}>캘린더 →</button>
      </div>
      {todayEvents.length === 0
        ? <div style={{ fontSize:12, color:'var(--text-muted)', padding:'6px 0' }}>오늘 일정 없음</div>
        : todayEvents.map(e => (
          <div key={e.id} onClick={() => navigate(`/workspaces/${slug}/calendar`)} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'6px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
            <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background: e.color || 'var(--accent)', flexShrink:0, marginTop:2 }} />
            <div>
              <div style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500 }}>{e.title}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>{!e.is_all_day ? `${fmtTime(e.start_at)} – ${fmtTime(e.end_at)}` : '하루 종일'}</div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

function SprintCard({ sprint, project, slug }) {
  const navigate = useNavigate()
  const total = sprint.stats?.tasks_count ?? 0
  const done  = sprint.stats?.completed_count ?? 0
  const pct   = total > 0 ? Math.round(done/total*100) : 0
  const dday = (() => {
    if (!sprint.end_date) return null
    const diff = Math.round((new Date(sprint.end_date) - todayMidnight()) / 86400000)
    if (diff < 0) return { label: '마감 초과', color: '#ef4444' }
    if (diff === 0) return { label: '오늘 마감', color: '#f59e0b' }
    return { label: `D-${diff}`, color: 'var(--text-muted)' }
  })()
  return (
    <div onClick={() => navigate(`/workspaces/${slug}/projects/${project.id}/sprints`)}
      style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', cursor:'pointer', marginBottom:6, transition:'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <div><div style={{ fontSize:9, color:'var(--text-muted)', marginBottom:1 }}>{project.name}</div><div style={{ fontSize:12, fontWeight:600 }}>{sprint.name}</div></div>
        {dday && <span style={{ fontSize:10, fontWeight:600, color: dday.color }}>{dday.label}</span>}
      </div>
      <div style={{ height:3, background:'var(--border)', borderRadius:99, overflow:'hidden', marginBottom:3 }}>
        <div style={{ height:'100%', width:`${pct}%`, background:'var(--success)', borderRadius:99, transition:'width 0.4s' }} />
      </div>
      <div style={{ fontSize:10, color:'var(--text-muted)' }}>{done}/{total} 완료 ({pct}%)</div>
    </div>
  )
}

function SprintStatusPanel({ activeSprints, slug }) {
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
      <h3 style={{ fontSize:13, fontWeight:600, margin:'0 0 8px' }}>진행 중인 스프린트</h3>
      {activeSprints.length === 0
        ? <div style={{ fontSize:12, color:'var(--text-muted)' }}>활성 스프린트 없음</div>
        : activeSprints.map(({ sprint, project }) => <SprintCard key={sprint.id} sprint={sprint} project={project} slug={slug} />)
      }
    </div>
  )
}

function ActivityFeedPanel({ recentTasks, slug }) {
  const navigate = useNavigate()
  const fmtRelative = (iso) => {
    const diff = Math.round((Date.now() - new Date(iso)) / 60000)
    if (diff < 1) return '방금 전'
    if (diff < 60) return `${diff}분 전`
    if (diff < 1440) return `${Math.floor(diff/60)}시간 전`
    return `${Math.floor(diff/1440)}일 전`
  }
  const STATUS_ICON  = { todo:'○', in_progress:'◑', done:'●', cancelled:'✕' }
  const STATUS_COLOR = { todo:'var(--text-muted)', in_progress:'var(--accent)', done:'var(--success)', cancelled:'var(--text-muted)' }
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 16px' }}>
      <h3 style={{ fontSize:13, fontWeight:600, margin:'0 0 8px' }}>최근 활동</h3>
      {recentTasks.length === 0
        ? <div style={{ fontSize:12, color:'var(--text-muted)' }}>최근 활동 없음</div>
        : recentTasks.map(t => (
          <div key={t.id} onClick={() => navigate(`/workspaces/${slug}/projects/${t.projectId}?task=${t.id}`)} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'6px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
            <span style={{ fontSize:12, color: STATUS_COLOR[t.status] || 'var(--text-muted)', flexShrink:0, marginTop:1 }}>{STATUS_ICON[t.status] || '○'}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t.projectName}</div>
            </div>
            <span style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>{fmtRelative(t.updated_at)}</span>
          </div>
        ))
      }
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="app-content">
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
        <Skeleton height={12} width="30%" style={{ marginBottom: 8 }} />
        <Skeleton height={24} width="50%" style={{ marginBottom: 18 }} />
        <div style={{ display: 'flex', gap: 24 }}>
          {[0,1,2].map(i => <Skeleton key={i} height={46} width={80} />)}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 240px', gap: 16, marginBottom: 16 }}>
        <Skeleton height={300} style={{ borderRadius: 12 }} />
        <Skeleton height={300} style={{ borderRadius: 12 }} />
        <Skeleton height={300} style={{ borderRadius: 12 }} />
      </div>
      <Skeleton height={100} style={{ borderRadius: 12 }} />
    </div>
  )
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { slug } = useParams()
  const { user } = useAuthStore()
  const toast = useToastStore(s => s.add)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [allTasks, setAllTasks] = useState([])
  const [events, setEvents] = useState([])
  const [activeSprints, setActiveSprints] = useState([])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    Promise.all([getProjects(slug).catch(() => []), getEvents(slug).catch(() => [])]).then(async ([projs, evs]) => {
      setEvents(evs)
      setProjects(projs)
      const taskResults = await Promise.all(projs.map(p => getTasks(slug, p.id, { tree: false }).then(ts => ts.map(t => ({ ...t, projectId: p.id, projectName: p.name }))).catch(() => [])))
      setAllTasks(taskResults.flat())
      const sprintResults = await Promise.all(projs.map(async p => {
        const sprints = await getSprints(slug, p.id).catch(() => [])
        return Promise.all(sprints.filter(s => s.status === 'active').map(async s => {
          const stats = await getSprintStats(slug, p.id, s.id).catch(() => null)
          return { sprint: { ...s, stats }, project: p }
        }))
      }))
      setActiveSprints(sprintResults.flat())
    }).catch(() => toast('데이터 로드 실패', 'error')).finally(() => setLoading(false))
  }, [slug])

  const myTasks = useMemo(() => {
    if (!user) return []
    return allTasks.filter(t => { const aid = t.assignee?.id ?? t.assignee; return aid === user.id })
  }, [allTasks, user])

  const recentTasks = useMemo(() =>
    [...allTasks].filter(t => t.updated_at).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 8)
  , [allTasks])

  const handleToggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
    try {
      await updateTask(slug, task.projectId, task.id, { status: newStatus })
    } catch {
      setAllTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
      toast('상태 변경 실패', 'error')
    }
  }

  if (loading) return <DashboardSkeleton />

  return (
    <div className="app-content">
      <HeroCard myTasks={myTasks} events={events} user={user} slug={slug} />

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 240px', gap: 16, marginBottom: 16 }}>
        <div>
          <MyTasksPanel tasks={myTasks} slug={slug} onToggleDone={handleToggleDone} />
          <TodayEventsPanel events={events} slug={slug} />
        </div>
        <div>
          <SprintStatusPanel activeSprints={activeSprints} slug={slug} />
          {activeSprints.length > 0 && <VelocityPanel activeSprints={activeSprints} />}
          <ActivityFeedPanel recentTasks={recentTasks} slug={slug} />
        </div>
        <div>
          <ProjectHealthPanel projects={projects} allTasks={allTasks} slug={slug} />
          <TeamWorkloadPanel allTasks={allTasks} />
        </div>
      </div>

      <ActivityHeatmap allTasks={allTasks} />
    </div>
  )
}
