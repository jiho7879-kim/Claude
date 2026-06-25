import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useToastStore from '../store/toastStore'
import { getHabits, getWeekEntries, getWeekReview, patchWeekReview } from '../lib/plannerApi'
import { getProjects, getTasks } from '../lib/workspaceApi'

const MOODS = { great:'😄', good:'🙂', neutral:'😐', bad:'😕', awful:'😣' }
const DAY_LABELS = ['월','화','수','목','금','토','일']

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return { year: d.getUTCFullYear(), week: Math.ceil((((d - yearStart) / 86400000) + 1) / 7) }
}

function getWeekDates(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

function fmtShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth()+1}/${d.getDate()}`
}

export default function WeeklyPlannerPage() {
  const { slug } = useParams()
  const toast = useToastStore(s => s.add)

  const navigate = useNavigate()
  const today = new Date()
  const [{ year, week }, setYW] = useState(getISOWeek(today))
  const [entries, setEntries] = useState([])
  const [review, setReview] = useState({})
  const [habits, setHabits] = useState([])
  const [weekTasks, setWeekTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef(null)
  const [saving, setSaving] = useState(false)

  const weekDates = getWeekDates(year, week)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [e, r, h] = await Promise.all([
        getWeekEntries(slug, year, week).catch(() => []),
        getWeekReview(slug, year, week).catch(() => ({})),
        getHabits(slug).catch(() => []),
      ])
      setEntries(e)
      setReview(r)
      setHabits(h)

      // 이번 주 마감 프로젝트 태스크 로딩
      const projects = await getProjects(slug).catch(() => [])
      const taskArrays = await Promise.all(
        projects.map(p => getTasks(slug, p.id, { tree: false }).catch(() => []))
      )
      const dateSet = new Set(weekDates)
      const wt = taskArrays.flat().filter(t => t.due_date && dateSet.has(t.due_date))
      setWeekTasks(wt)
    } finally {
      setLoading(false)
    }
  }, [slug, year, week])

  useEffect(() => { load() }, [load])

  const shiftWeek = (n) => {
    const d = new Date(weekDates[0] + 'T00:00:00')
    d.setDate(d.getDate() + n * 7)
    setYW(getISOWeek(d))
  }

  const handleReviewField = (field, val) => {
    setReview(prev => ({ ...prev, [field]: val }))
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await patchWeekReview(slug, year, week, { [field]: val })
      } catch {
        toast('저장 실패', 'error')
      } finally {
        setSaving(false)
      }
    }, 700)
  }

  const entryByDate = Object.fromEntries(entries.map(e => [e.date, e]))
  const isCurrentWeek = (() => { const c = getISOWeek(today); return c.year === year && c.week === week })()
  const totalBlocks = entries.reduce((s, e) => s + (e.time_blocks?.length || 0), 0)
  const doneBlocks  = entries.reduce((s, e) => s + (e.time_blocks?.filter(b => b.is_done).length || 0), 0)
  const weekProgress = totalBlocks ? Math.round((doneBlocks / totalBlocks) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-base)', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 24px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', flexShrink:0 }}>
        <button onClick={() => shiftWeek(-1)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', width:30, height:30, cursor:'pointer', color:'var(--text-secondary)', fontSize:16 }}>‹</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
            {year}년 {week}주차
            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:400 }}>({fmtShort(weekDates[0])} ~ {fmtShort(weekDates[6])})</span>
            {isCurrentWeek && <span style={{ fontSize:11, background:'var(--accent)', color:'#fff', borderRadius:4, padding:'2px 7px', fontWeight:600 }}>이번 주</span>}
          </div>
          {totalBlocks > 0 && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>주간 달성률 {doneBlocks}/{totalBlocks} ({weekProgress}%)</div>}
        </div>
        <button onClick={() => shiftWeek(1)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', width:30, height:30, cursor:'pointer', color:'var(--text-secondary)', fontSize:16 }}>›</button>
        <button onClick={() => setYW(getISOWeek(new Date()))} style={{ background:'none', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'4px 12px', cursor:'pointer', color:'var(--text-secondary)', fontSize:12 }}>이번 주</button>
        <div style={{ display:'flex', background:'var(--bg-base)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', overflow:'hidden' }}>
          <button onClick={() => navigate(`/workspaces/${slug}/planner`)} style={{ padding:'4px 12px', fontSize:12, background:'none', color:'var(--text-secondary)', border:'none', cursor:'pointer' }}>일간</button>
          <button style={{ padding:'4px 12px', fontSize:12, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer', fontWeight:600 }}>주간</button>
        </div>
        {saving && <span style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic' }}>저장 중...</span>}
      </div>

      {loading ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:14 }}>로딩 중...</div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* 7-Day Grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:1, background:'var(--border)', borderBottom:'2px solid var(--border)', flexShrink:0 }}>
            {weekDates.map((dateStr, i) => {
              const entry = entryByDate[dateStr]
              const isToday = dateStr === today.toISOString().slice(0,10)
              const isWeekend = i >= 5
              const blocks = entry?.time_blocks || []
              const done = blocks.filter(b => b.is_done).length
              const pct = blocks.length ? Math.round((done/blocks.length)*100) : null

              return (
                <div key={dateStr}
                  onClick={() => navigate(`/workspaces/${slug}/planner?date=${dateStr}`)}
                  style={{ background: isToday ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-elevated))' : 'var(--bg-elevated)', padding:'12px 14px', minHeight:160, cursor:'pointer', transition:'background .15s' }}
                  onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 3%, var(--bg-elevated))' }}
                  onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = 'var(--bg-elevated)' }}
                >
                  {/* 날짜 헤더 */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color: isToday ? 'var(--accent)' : isWeekend ? '#8b5cf6' : 'var(--text-secondary)' }}>{DAY_LABELS[i]}</span>
                    <span style={{ fontSize:12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>{fmtShort(dateStr)}</span>
                  </div>

                  {/* 기분 + 에너지 */}
                  {entry?.mood && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:24 }}>{MOODS[entry.mood]}</span>
                      {entry?.energy != null && (
                        <div style={{ display:'flex', gap:3 }}>
                          {[1,2,3,4,5].map(n => (
                            <div key={n} style={{ width:8, height:8, borderRadius:2, background: n <= entry.energy ? 'var(--accent)' : 'var(--border)' }} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {!entry?.mood && entry?.energy != null && (
                    <div style={{ display:'flex', gap:3, marginBottom:6 }}>
                      {[1,2,3,4,5].map(n => (
                        <div key={n} style={{ width:8, height:8, borderRadius:2, background: n <= entry.energy ? 'var(--accent)' : 'var(--border)' }} />
                      ))}
                    </div>
                  )}

                  {/* 감정 태그 미리보기 */}
                  {entry?.emotion_tags?.length > 0 && (
                    <div style={{ marginBottom:6, fontSize:10, color:'var(--accent)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {entry.emotion_tags.slice(0,3).join(' · ')}
                    </div>
                  )}

                  {/* 계획 진행률 */}
                  {pct !== null && (
                    <div style={{ marginBottom:6 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                        <span style={{ fontSize:10, color:'var(--text-muted)' }}>계획</span>
                        <span style={{ fontSize:10, color: pct===100 ? '#10b981' : 'var(--text-muted)', fontWeight: pct===100 ? 700 : 400 }}>{done}/{blocks.length}</span>
                      </div>
                      <div style={{ height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background: pct===100 ? '#10b981' : pct>=60 ? '#f59e0b' : 'var(--accent)', borderRadius:3, transition:'width .3s' }} />
                      </div>
                    </div>
                  )}

                  {/* 한 줄 메모 */}
                  {entry?.one_liner && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'Georgia, serif' }}>
                      "{entry.one_liner}"
                    </div>
                  )}

                  {/* 습관 닷 */}
                  {habits.length > 0 && (
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                      {habits.slice(0,8).map(h => (
                        <div key={h.id} title={h.name}
                          style={{ width:10, height:10, borderRadius:'50%', background:'var(--border)', border:`2px solid ${h.color}`, flexShrink:0 }} />
                      ))}
                    </div>
                  )}

                  {!entry && <div style={{ fontSize:11, color:'var(--border)', marginTop:16, fontStyle:'italic', textAlign:'center' }}>·</div>}
                </div>
              )
            })}
          </div>

          {/* Weekly Summary Strip */}
          {(doneBlocks > 0 || weekTasks.length > 0) && (
            <div style={{ flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', padding:'10px 20px', display:'flex', gap:24, overflowX:'auto' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase', lineHeight:'28px', flexShrink:0 }}>주간 요약</div>
              {/* 일별 완료 할 일 */}
              {weekDates.map(dateStr => {
                const entry = entryByDate[dateStr]
                const done = (entry?.time_blocks || []).filter(b => b.is_done)
                if (!done.length) return null
                const d = new Date(dateStr + 'T00:00:00')
                return (
                  <div key={dateStr} style={{ flexShrink:0 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{DAY_LABELS[weekDates.indexOf(dateStr)]} ({d.getMonth()+1}/{d.getDate()})</div>
                    {done.map(b => (
                      <div key={b.id} style={{ fontSize:11, color:'#10b981', display:'flex', alignItems:'center', gap:4 }}>
                        <span>✓</span><span style={{ color:'var(--text-secondary)', textDecoration:'line-through' }}>{b.title}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
              {/* 이번 주 프로젝트 태스크 */}
              {weekTasks.length > 0 && (
                <div style={{ flexShrink:0, borderLeft:'1px solid var(--border)', paddingLeft:16 }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>프로젝트 마감 ({weekTasks.length})</div>
                  {weekTasks.slice(0, 8).map(t => (
                    <div key={t.id} style={{ fontSize:11, display:'flex', alignItems:'center', gap:4 }}>
                      <span style={{ color: t.status === 'done' ? '#10b981' : '#f59e0b' }}>{t.status === 'done' ? '✓' : '◆'}</span>
                      <span style={{ color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                    </div>
                  ))}
                  {weekTasks.length > 8 && <div style={{ fontSize:10, color:'var(--text-muted)' }}>+{weekTasks.length-8}개 더...</div>}
                </div>
              )}
            </div>
          )}

          {/* Weekly Review Form */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>

            {/* Left: Retrospective */}
            <div style={{ borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'12px 20px 8px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', flexShrink:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>주간 회고</div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
                <ReviewField label="✅ 잘 된 것" value={review.went_well || ''} onChange={v => handleReviewField('went_well', v)} placeholder="이번 주 잘 해낸 것, 자랑스러운 순간..." />
                <ReviewField label="🔧 아쉬운 것 / 개선점" value={review.to_improve || ''} onChange={v => handleReviewField('to_improve', v)} placeholder="다음에는 다르게 해보고 싶은 것..." />
              </div>
            </div>

            {/* Right: Next Week */}
            <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'12px 20px 8px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', flexShrink:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>다음 주 의도</div>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>
                <ReviewField label="🎯 다음 주 집중할 것" value={review.next_focus || ''} onChange={v => handleReviewField('next_focus', v)} placeholder="다음 주에 가장 중요하게 집중할 영역..." />
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:10 }}>⚡ MIT — 다음 주 핵심 3가지</div>
                  {[1,2,3].map(n => (
                    <div key={n} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--accent)', width:18, flexShrink:0 }}>{n}.</span>
                      <input
                        value={review[`mit${n}`] || ''}
                        onChange={e => handleReviewField(`mit${n}`, e.target.value)}
                        placeholder={`MIT ${n}번째...`}
                        style={{ flex:1, padding:'8px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', color:'var(--text-primary)', fontSize:13, outline:'none' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewField({ label, value, onChange, placeholder }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>{label}</div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'10px 12px', color:'var(--text-primary)', fontSize:13, lineHeight:1.7, resize:'vertical', outline:'none', fontFamily:'inherit' }}
      />
    </div>
  )
}
