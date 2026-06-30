import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjects, getSprints, getTasks, getEvents } from '../lib/workspaceApi'
import { getEntries } from '../lib/plannerApi'

const LABEL_W  = 220
const ROW_H    = 32
const HEADER_H = 52
const VIEW_BEFORE = 14
const VIEW_AFTER  = 76

const ZOOM_LEVELS = {
  day:     { label: '일',   px: 60 },
  week:    { label: '주',   px: 20 },
  month:   { label: '월',   px: 8  },
  quarter: { label: '분기', px: 3  },
}

const CATEGORY_COLORS = {
  work:     '#6366f1',
  personal: '#10b981',
  health:   '#ef4444',
  learning: '#f59e0b',
  other:    '#8b5cf6',
}

function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function diffDays(a, b) {
  return Math.round((Number(new Date(b)) - Number(new Date(a))) / 86400000)
}
function fmtDate(d) {
  return `${d.getMonth()+1}/${d.getDate()}`
}

export default function TimelineView({ slug }) {
  const navigate = useNavigate()
  const scrollRef = useRef(null)
  const [rows, setRows] = useState([])
  const [sprintMeta, setSprintMeta] = useState([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState('week')

  const DAY_PX = ZOOM_LEVELS[zoom]?.px ?? 20

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d }, [])
  const viewStart = useMemo(() => addDays(today, -VIEW_BEFORE), [today])
  const viewEnd   = useMemo(() => addDays(today,  VIEW_AFTER),  [today])
  const totalDays = diffDays(viewStart, viewEnd) + 1
  const totalW    = totalDays * DAY_PX

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, VIEW_BEFORE * DAY_PX - 80)
    }
  }, [loading])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    const PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16']

    Promise.all([
      getProjects(slug).catch(() => []),
      getEvents(slug).catch(() => []),
      getEntries(slug, {}).catch(() => []),
    ]).then(async ([projects, calEvents, plannerEntries]) => {
      const flatRows = []
      const meta = []

      // 프로젝트 / 스프린트 / 태스크
      for (let pi = 0; pi < projects.length; pi++) {
        const p = projects[pi]
        const color = p.color || PALETTE[pi % PALETTE.length]
        flatRows.push({ type: 'project', label: p.name, color, projectId: p.id })

        const [sprints, tasks] = await Promise.all([
          getSprints(slug, p.id).catch(() => []),
          getTasks(slug, p.id, { tree: true }).catch(() => []),
        ])

        sprints.filter(s => s.start_date || s.end_date).forEach(s => meta.push({ sprint: s, color }))
        tasks.filter(t => t.start_date || t.due_date).forEach(t => {
          flatRows.push({ type: 'task', label: t.title, color, task: t, projectId: p.id })
        })
      }

      // 캘린더 이벤트 섹션
      const calRows = calEvents
        .filter(e => e.start_at)
        .map(e => ({ type: 'cal_event', label: e.title, color: e.color || '#6366f1', event: e }))
      if (calRows.length > 0) {
        flatRows.push({ type: 'section', label: '📅 캘린더 이벤트' })
        flatRows.push(...calRows)
      }

      // 플래너 할 일 섹션 (날짜 기준 정렬)
      const plannerRows = []
      plannerEntries.forEach(entry => {
        (entry.time_blocks || []).forEach(block => {
          plannerRows.push({
            type: 'planner_block',
            label: block.title,
            color: CATEGORY_COLORS[block.category] || '#8b5cf6',
            date: entry.date,
            isDone: block.is_done,
          })
        })
      })
      if (plannerRows.length > 0) {
        flatRows.push({ type: 'section', label: '📓 플래너 할 일' })
        flatRows.push(...plannerRows)
      }

      setRows(flatRows)
      setSprintMeta(meta)
    }).finally(() => setLoading(false))
  }, [slug])

  const monthTicks = useMemo(() => {
    const ticks = []
    const d = new Date(viewStart)
    while (d <= viewEnd) {
      if (d.getDate() === 1) ticks.push({ x: diffDays(viewStart, d) * DAY_PX, label: `${d.getFullYear()}년 ${d.getMonth()+1}월` })
      d.setDate(d.getDate() + 1)
    }
    return ticks
  }, [viewStart, viewEnd])

  const weekTicks = useMemo(() => {
    const ticks = []
    const d = new Date(viewStart)
    while (d <= viewEnd) {
      if (d.getDay() === 1) ticks.push({ x: diffDays(viewStart, d) * DAY_PX, label: fmtDate(d) })
      d.setDate(d.getDate() + 1)
    }
    return ticks
  }, [viewStart, viewEnd])

  const todayX = diffDays(viewStart, today) * DAY_PX

  const taskRowIndex = useMemo(() => {
    const map = {}
    rows.forEach((row, i) => {
      if (row.type === 'task' && row.task?.id) map[row.task.id] = i
    })
    return map
  }, [rows])

  const arrows = useMemo(() => {
    const result = []
    rows.forEach((row) => {
      if (row.type !== 'task') return
      const t = row.task
      const deps = t.blocked_by || t.dependencies || []
      deps.forEach(depId => {
        const fromIdx = taskRowIndex[depId]
        const toIdx = taskRowIndex[t.id]
        if (fromIdx == null || toIdx == null) return
        const fromRow = rows[fromIdx]
        const fromT = fromRow.task
        const fromEndIso = fromT.due_date || fromT.start_date
        const toStartIso = t.start_date || t.due_date
        if (!fromEndIso || !toStartIso) return
        const x1 = diffDays(viewStart, new Date(fromEndIso)) * DAY_PX + DAY_PX
        const y1 = HEADER_H + fromIdx * ROW_H + ROW_H / 2
        const x2 = diffDays(viewStart, new Date(toStartIso)) * DAY_PX
        const y2 = HEADER_H + toIdx * ROW_H + ROW_H / 2
        result.push({ x1, y1, x2, y2, color: fromRow.color })
      })
    })
    return result
  }, [rows, taskRowIndex, viewStart, DAY_PX])

  const barFor = (startIso, endIso) => {
    if (!startIso && !endIso) return null
    const left = startIso ? diffDays(viewStart, new Date(startIso)) * DAY_PX : todayX
    const right = endIso ? diffDays(viewStart, new Date(endIso)) * DAY_PX + DAY_PX : left + DAY_PX
    const w = Math.max(right - left, DAY_PX)
    if (left > totalW || right < 0) return null
    return { left: Math.max(left, 0), width: Math.min(w, totalW - Math.max(left, 0)) }
  }

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:14 }}>타임라인 로딩 중...</div>
  )

  if (rows.length === 0) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:14 }}>날짜가 지정된 태스크가 없습니다</div>
  )

  const contentH = rows.length * ROW_H + HEADER_H

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative' }}>
      {/* Sticky left label column */}
      <div style={{ width:LABEL_W, flexShrink:0, background:'var(--bg-base)', borderRight:'1px solid var(--border)', zIndex:10, display:'flex', flexDirection:'column' }}>
        <div style={{ height:HEADER_H, flexShrink:0, background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight:8, gap:2 }}>
          {Object.entries(ZOOM_LEVELS).map(([key, { label }]) => (
            <button key={key} onClick={() => setZoom(key)} style={{ padding:'3px 7px', fontSize:10, fontWeight: zoom===key ? 700 : 400, background: zoom===key ? 'var(--accent)' : 'var(--bg-surface)', color: zoom===key ? '#fff' : 'var(--text-muted)', border:'1px solid var(--border)', borderRadius:4, cursor:'pointer' }}>{label}</button>
          ))}
        </div>
        <div style={{ overflowY:'hidden', flex:1 }}>
          {rows.map((row, i) => (
            <div
              key={i}
              style={{ height:ROW_H, display:'flex', alignItems:'center', paddingLeft: (row.type === 'project' || row.type === 'section') ? 12 : 28, paddingRight:8, borderBottom:'1px solid var(--border)', background: (row.type === 'project' || row.type === 'section') ? 'var(--bg-elevated)' : 'transparent', cursor: row.type === 'task' ? 'pointer' : 'default' }}
              onClick={() => row.type === 'task' && navigate(`/workspaces/${slug}/projects/${row.projectId}?task=${row.task.id}`)}
            >
              {row.type === 'project' && <span style={{ width:8, height:8, borderRadius:'50%', background:row.color, marginRight:6, flexShrink:0 }} />}
              {row.type === 'task'    && <span style={{ fontSize:10, marginRight:4, color:'var(--text-muted)' }}>▸</span>}
              {row.type === 'cal_event' && <span style={{ width:8, height:8, borderRadius:2, background:row.color, marginRight:6, flexShrink:0 }} />}
              {row.type === 'planner_block' && <span style={{ fontSize:10, marginRight:4, color: row.isDone ? '#10b981' : 'var(--text-muted)' }}>{row.isDone ? '✓' : '○'}</span>}
              <span style={{ fontSize: (row.type === 'project' || row.type === 'section') ? 12 : 11, fontWeight: (row.type === 'project' || row.type === 'section') ? 700 : 400, color: (row.type === 'project' || row.type === 'section') ? 'var(--text-primary)' : 'var(--text-secondary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration: row.type === 'planner_block' && row.isDone ? 'line-through' : 'none' }}>{row.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} style={{ flex:1, overflowX:'auto', overflowY:'auto' }}>
        <div style={{ width:totalW, height:contentH, position:'relative' }}>

          {/* Date ruler */}
          <div style={{ position:'sticky', top:0, height:HEADER_H, background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)', zIndex:5 }}>
            {monthTicks.map((t, i) => (
              <div key={i} style={{ position:'absolute', left:t.x+4, top:4, fontSize:11, fontWeight:700, color:'var(--text-primary)', whiteSpace:'nowrap' }}>{t.label}</div>
            ))}
            {weekTicks.map((t, i) => (
              <div key={i} style={{ position:'absolute', left:t.x, top:22, height:HEADER_H-22, borderLeft:'1px solid var(--border)' }}>
                <span style={{ position:'absolute', left:3, top:2, fontSize:10, color:'var(--text-muted)', whiteSpace:'nowrap' }}>{t.label}</span>
              </div>
            ))}
            <div style={{ position:'absolute', left:todayX, top:0, bottom:0, borderLeft:'2px solid var(--accent)', opacity:0.9 }} />
          </div>

          {/* Sprint background bands */}
          {sprintMeta.map(({ sprint, color }, i) => {
            const bar = barFor(sprint.start_date, sprint.end_date)
            if (!bar) return null
            return (
              <div key={i} style={{ position:'absolute', left:bar.left, width:bar.width, top:HEADER_H, bottom:0, background:`${color}0d`, borderLeft:`1px solid ${color}33`, borderRight:`1px solid ${color}33`, pointerEvents:'none' }} />
            )
          })}

          {/* Today vertical dashed line */}
          <div style={{ position:'absolute', left:todayX, top:HEADER_H, bottom:0, borderLeft:'2px dashed var(--accent)', opacity:0.5, pointerEvents:'none' }} />

          {/* Dependency arrows SVG overlay */}
          {arrows.length > 0 && (
            <svg style={{ position:'absolute', top:0, left:0, width:totalW, height:contentH, pointerEvents:'none', zIndex:4 }}>
              <defs>
                {[...new Set(arrows.map(a => a.color))].map(color => (
                  <marker key={color} id={`arrow-${color.replace('#','')}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill={color} opacity="0.7" />
                  </marker>
                ))}
              </defs>
              {arrows.map((a, i) => {
                const mx = (a.x1 + a.x2) / 2
                return (
                  <path
                    key={i}
                    d={`M${a.x1},${a.y1} C${mx},${a.y1} ${mx},${a.y2} ${a.x2},${a.y2}`}
                    fill="none"
                    stroke={a.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                    strokeDasharray="4 2"
                    markerEnd={`url(#arrow-${a.color.replace('#','')})`}
                  />
                )
              })}
            </svg>
          )}

          {/* Row backgrounds + task/event/planner bars */}
          {rows.map((row, i) => {
            const top = HEADER_H + i * ROW_H
            const isSectionOrProject = row.type === 'project' || row.type === 'section'
            return (
              <div key={i} style={{ position:'absolute', top, left:0, width:totalW, height:ROW_H, borderBottom:'1px solid var(--border)', background: isSectionOrProject ? 'var(--bg-elevated)' : 'transparent' }}>
                {row.type === 'task' && (() => {
                  const t = row.task
                  const bar = barFor(t.start_date, t.due_date)
                  if (!bar) return null
                  const isPoint = !t.start_date
                  return (
                    <div
                      style={{ position:'absolute', left:bar.left, width: isPoint ? ROW_H-14 : bar.width, top:6, height:ROW_H-14, background: isPoint ? 'transparent' : `${row.color}bb`, border:`2px solid ${row.color}`, borderRadius: isPoint ? '50%' : 'var(--r-sm)', cursor:'pointer', boxSizing:'border-box', display:'flex', alignItems:'center', overflow:'hidden' }}
                      onClick={() => navigate(`/workspaces/${slug}/projects/${row.projectId}?task=${t.id}`)}
                      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setTooltip({ text: t.title, x: r.left, y: r.top - 32 }) }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {!isPoint && bar.width > 44 && <span style={{ fontSize:10, color:'#fff', paddingLeft:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</span>}
                    </div>
                  )
                })()}
                {row.type === 'cal_event' && (() => {
                  const e = row.event
                  const startDate = e.start_at ? e.start_at.slice(0, 10) : null
                  const endDate = e.end_at ? e.end_at.slice(0, 10) : null
                  const bar = barFor(startDate, endDate || startDate)
                  if (!bar) return null
                  const isPoint = startDate === endDate || !endDate
                  return (
                    <div
                      style={{ position:'absolute', left:bar.left, width: isPoint ? ROW_H-14 : bar.width, top:6, height:ROW_H-14, background: isPoint ? 'transparent' : `${row.color}99`, border:`2px solid ${row.color}`, borderRadius: isPoint ? '50%' : 'var(--r-sm)', boxSizing:'border-box', display:'flex', alignItems:'center', overflow:'hidden' }}
                      onMouseEnter={ev => { const r = ev.currentTarget.getBoundingClientRect(); setTooltip({ text: e.title, x: r.left, y: r.top - 32 }) }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {!isPoint && bar.width > 44 && <span style={{ fontSize:10, color:'#fff', paddingLeft:5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</span>}
                    </div>
                  )
                })()}
                {row.type === 'planner_block' && (() => {
                  const bar = barFor(row.date, row.date)
                  if (!bar) return null
                  return (
                    <div
                      style={{ position:'absolute', left:bar.left + 2, width:ROW_H-16, top:7, height:ROW_H-16, background: row.isDone ? `${row.color}55` : `${row.color}cc`, border:`2px solid ${row.color}`, borderRadius:'50%', boxSizing:'border-box', opacity: row.isDone ? 0.6 : 1 }}
                      onMouseEnter={ev => { const r = ev.currentTarget.getBoundingClientRect(); setTooltip({ text: `${row.isDone ? '✓ ' : ''}${row.label}`, x: r.left, y: r.top - 32 }) }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>

      {tooltip && (
        <div style={{ position:'fixed', left:tooltip.x, top:tooltip.y, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'4px 10px', fontSize:12, color:'var(--text-primary)', pointerEvents:'none', zIndex:999, maxWidth:260, boxShadow:'var(--shadow-md)', whiteSpace:'nowrap' }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
