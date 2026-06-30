import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useToastStore from '../store/toastStore'
import { getHabits, getWeekEntries, getWeekReview, patchWeekReview } from '../lib/plannerApi'
import { getProjects, getTasks } from '../lib/workspaceApi'

const MOODS = { great:'😄', good:'🙂', neutral:'😐', bad:'😕', awful:'😣' }
const DAY_LABELS = ['월','화','수','목','금','토','일']
const MIT_COLORS = ['#6366f1', '#10b981', '#f59e0b']

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
  const [prevReview, setPrevReview] = useState(null)

  const weekDates = getWeekDates(year, week)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const prevWeek = week === 1 ? 52 : week - 1
      const prevYear = week === 1 ? year - 1 : year

      const [e, r, h, pr] = await Promise.all([
        getWeekEntries(slug, year, week).catch(() => []),
        getWeekReview(slug, year, week).catch(() => ({})),
        getHabits(slug).catch(() => []),
        getWeekReview(slug, prevYear, prevWeek).catch(() => null),
      ])
      setEntries(e)
      setReview(r)
      setHabits(h)
      setPrevReview(pr)

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

  // ── 파생값 ──────────────────────────────────────────────────────────────────
  const entryByDate = Object.fromEntries(entries.map(e => [e.date, e]))
  const isCurrentWeek = (() => { const c = getISOWeek(today); return c.year === year && c.week === week })()
  const totalBlocks = entries.reduce((s, e) => s + (e.time_blocks?.length || 0), 0)
  const doneBlocks  = entries.reduce((s, e) => s + (e.time_blocks?.filter(b => b.is_done).length || 0), 0)
  const weekProgress = totalBlocks ? Math.round((doneBlocks / totalBlocks) * 100) : 0

  const moodCounts = entries.reduce((acc, e) => { if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1; return acc }, {})
  const journalCount = entries.filter(e => e.journal?.trim()).length
  const energyEntries = entries.filter(e => e.energy != null)
  const energyAvg = energyEntries.length ? (energyEntries.reduce((s, e) => s + e.energy, 0) / energyEntries.length).toFixed(1) : null

  const topEmotionTags = (() => {
    const counts = entries.reduce((acc, e) => {
      (e.emotion_tags || []).forEach(tag => { acc[tag] = (acc[tag] || 0) + 1 })
      return acc
    }, {})
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
  })()

  const weekOneLiners = weekDates
    .map(d => entryByDate[d]?.one_liner?.trim() ? { date: d, text: entryByDate[d].one_liner, dayIdx: weekDates.indexOf(d) } : null)
    .filter(Boolean)

  const bestDay = weekDates.reduce((best, d) => {
    const e = entryByDate[d]
    if (!e) return best
    const blocks = e.time_blocks || []
    const pct = blocks.length ? (blocks.filter(b => b.is_done).length / blocks.length) * 100 : 0
    const score = pct * 0.6 + (e.energy || 0) * 8
    return (!best || score > best.score) ? { date: d, score, mood: e.mood, pct: Math.round(pct) } : best
  }, null)

  const mitSetCount = [review.mit1, review.mit2, review.mit3].filter(Boolean).length

  const completedTasks = entries.flatMap(e =>
    (e.time_blocks || []).filter(b => b.is_done).map(b => b.title)
  )

  // ── 렌더 ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-base)', overflow:'hidden' }}>

      {/* 헤더 */}
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
              const isBestDay = bestDay?.date === dateStr && !isToday && (bestDay?.score || 0) > 10
              const isWeekend = i >= 5
              const blocks = entry?.time_blocks || []
              const done = blocks.filter(b => b.is_done).length
              const pct = blocks.length ? Math.round((done/blocks.length)*100) : null

              return (
                <div key={dateStr}
                  onClick={() => navigate(`/workspaces/${slug}/planner?date=${dateStr}`)}
                  style={{
                    background: isToday
                      ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-elevated))'
                      : isBestDay ? 'color-mix(in srgb, #10b981 7%, var(--bg-elevated))'
                      : 'var(--bg-elevated)',
                    padding:'12px 14px', minHeight:160, cursor:'pointer', transition:'background .15s',
                    boxShadow: isBestDay ? 'inset 0 0 0 2px rgba(16,185,129,0.22)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isToday && !isBestDay) e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 3%, var(--bg-elevated))' }}
                  onMouseLeave={e => {
                    if (!isToday && !isBestDay) e.currentTarget.style.background = 'var(--bg-elevated)'
                    else if (isBestDay) e.currentTarget.style.background = 'color-mix(in srgb, #10b981 7%, var(--bg-elevated))'
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color: isToday ? 'var(--accent)' : isBestDay ? '#10b981' : isWeekend ? '#8b5cf6' : 'var(--text-secondary)' }}>
                      {DAY_LABELS[i]}{isBestDay && <span style={{ fontSize:9, marginLeft:2 }}>★</span>}
                    </span>
                    <span style={{ fontSize:12, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>{fmtShort(dateStr)}</span>
                  </div>

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

                  {entry?.emotion_tags?.length > 0 && (
                    <div style={{ marginBottom:6, fontSize:10, color:'var(--accent)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {entry.emotion_tags.slice(0,3).join(' · ')}
                    </div>
                  )}

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

                  {entry?.one_liner && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:'Georgia, serif' }}>
                      "{entry.one_liner}"
                    </div>
                  )}

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

          {/* 주간 요약 스트립 (완료 태스크 / 프로젝트 마감) */}
          {(doneBlocks > 0 || weekTasks.length > 0) && (
            <div style={{ flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', padding:'10px 20px', display:'flex', gap:24, overflowX:'auto' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase', lineHeight:'28px', flexShrink:0 }}>주간 요약</div>
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

          {/* 이번 주 데이터 배너 */}
          {entries.length > 0 && (
            <div style={{ flexShrink:0, borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', padding:'8px 20px', display:'flex', gap:14, alignItems:'center', flexWrap:'wrap' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase', flexShrink:0 }}>이번 주 데이터</div>

              {Object.entries(moodCounts).length > 0 && (
                <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                  {['great','good','neutral','bad','awful'].filter(m => moodCounts[m]).map(mood => (
                    <span key={mood} style={{ fontSize:12 }}>
                      {MOODS[mood]}<sup style={{ fontSize:9, color:'var(--text-muted)' }}>×{moodCounts[mood]}</sup>
                    </span>
                  ))}
                </div>
              )}

              {totalBlocks > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>달성</span>
                  <span style={{ fontSize:15, fontWeight:700, color: weekProgress>=80 ? '#10b981' : weekProgress>=50 ? '#f59e0b' : 'var(--accent)' }}>{weekProgress}%</span>
                </div>
              )}

              {journalCount > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>📓 일기</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>{journalCount}일</span>
                </div>
              )}

              {energyAvg && (
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>⚡ 에너지</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>{energyAvg}/5</span>
                </div>
              )}

              {topEmotionTags.length > 0 && (
                <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                  {topEmotionTags.map(([tag, count]) => (
                    <span key={tag} style={{ fontSize:10, padding:'1px 7px', background:'color-mix(in srgb, var(--accent) 10%, var(--bg-base))', borderRadius:10, color:'var(--accent)', fontWeight:500 }}>
                      {tag}{count > 1 ? <sup style={{ fontSize:8 }}>×{count}</sup> : ''}
                    </span>
                  ))}
                </div>
              )}

              {bestDay && bestDay.score > 10 && (
                <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>🌟 최고</span>
                  <span style={{ fontSize:12, fontWeight:600, color:'#10b981' }}>
                    {DAY_LABELS[weekDates.indexOf(bestDay.date)]}({fmtShort(bestDay.date)})
                    {bestDay.mood && ` ${MOODS[bestDay.mood]}`}
                  </span>
                </div>
              )}

              <div style={{ marginLeft:'auto', flexShrink:0 }}>
                <button onClick={() => navigate(`/workspaces/${slug}/planner?date=${weekDates[0]}`)}
                  style={{ padding:'3px 10px', background:'none', border:'1px solid var(--border)', borderRadius:6, fontSize:11, cursor:'pointer', color:'var(--text-secondary)' }}>
                  일간 플래너 →
                </button>
              </div>
            </div>
          )}

          {/* 회고 + 목표 2분할 */}
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>

            {/* ── 왼쪽: 주간 회고 ── */}
            <div style={{ borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'10px 20px 8px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>주간 회고</div>
                {(review.went_well || review.to_improve) && <span style={{ fontSize:10, color:'#10b981' }}>✓ 저장됨</span>}
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:12 }}>

                {/* 지난 주 개선 포인트 참고 카드 */}
                {prevReview?.to_improve && (
                  <div style={{ padding:'10px 14px', background:'color-mix(in srgb, #f59e0b 5%, var(--bg-base))', border:'1px solid color-mix(in srgb, #f59e0b 25%, var(--border))', borderRadius:8, borderLeft:'3px solid #f59e0b' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#f59e0b', letterSpacing:1, marginBottom:5 }}>📎 지난 주 개선 포인트 참고</div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>
                      {prevReview.to_improve.length > 130 ? prevReview.to_improve.slice(0, 130) + '...' : prevReview.to_improve}
                    </div>
                  </div>
                )}

                {/* 완료 태스크 힌트 (went_well 비어있을 때만 표시) */}
                {completedTasks.length > 0 && !review.went_well && (
                  <div style={{ padding:'8px 12px', background:'color-mix(in srgb, #10b981 5%, var(--bg-base))', border:'1px solid color-mix(in srgb, #10b981 20%, var(--border))', borderRadius:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#10b981', marginBottom:5 }}>✅ 이번 주 완료한 것들</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                      {completedTasks.slice(0, 8).map((title, i) => (
                        <span key={i} style={{ fontSize:11, color:'var(--text-muted)', padding:'1px 6px', background:'var(--bg-elevated)', borderRadius:4 }}>{title}</span>
                      ))}
                      {completedTasks.length > 8 && <span style={{ fontSize:11, color:'var(--text-muted)' }}>+{completedTasks.length - 8}개</span>}
                    </div>
                  </div>
                )}

                <ReviewField
                  label="✅ 잘 된 것"
                  value={review.went_well || ''}
                  onChange={v => handleReviewField('went_well', v)}
                  placeholder={weekProgress >= 70
                    ? `이번 주 ${weekProgress}% 달성! 어떤 점이 도움됐나요?`
                    : '이번 주 잘 해낸 것, 자랑스러운 순간...'
                  }
                />

                <ReviewField
                  label="🔧 아쉬운 것 / 개선점"
                  value={review.to_improve || ''}
                  onChange={v => handleReviewField('to_improve', v)}
                  placeholder="다음 주에는 다르게 해보고 싶은 것, 개선할 점..."
                />
              </div>
            </div>

            {/* ── 오른쪽: 이번 주 목표 ── */}
            <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ padding:'10px 20px 8px', borderBottom:'1px solid var(--border)', background:'var(--bg-elevated)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>이번 주 목표</div>
                {mitSetCount > 0 && (
                  <span style={{ fontSize:10, padding:'1px 7px', background: mitSetCount === 3 ? '#10b981' : 'var(--accent)', color:'#fff', borderRadius:10, fontWeight:600 }}>
                    MIT {mitSetCount}/3
                  </span>
                )}
              </div>

              <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:14 }}>

                <ReviewField
                  label="🎯 이번 주 집중할 것"
                  value={review.next_focus || ''}
                  onChange={v => handleReviewField('next_focus', v)}
                  placeholder="이번 주 가장 중요하게 집중할 영역이나 테마..."
                />

                <div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>⚡ MIT — 이번 주 핵심 3가지</div>
                    {isCurrentWeek && (
                      <span style={{ fontSize:10, color:'var(--accent)', background:'color-mix(in srgb, var(--accent) 10%, var(--bg-base))', padding:'1px 7px', borderRadius:10 }}>
                        일간 플래너 연동 ✓
                      </span>
                    )}
                  </div>

                  {[1,2,3].map(n => (
                    <div key={n} style={{
                      display:'flex', alignItems:'center', gap:10, marginBottom:10,
                      padding:'10px 14px',
                      background: review[`mit${n}`] ? `color-mix(in srgb, ${MIT_COLORS[n-1]} 6%, var(--bg-elevated))` : 'var(--bg-elevated)',
                      border: `1px solid ${review[`mit${n}`] ? `color-mix(in srgb, ${MIT_COLORS[n-1]} 35%, var(--border))` : 'var(--border)'}`,
                      borderRadius:8, borderLeft:`4px solid ${MIT_COLORS[n-1]}`, transition:'all .2s',
                    }}>
                      <span style={{ fontSize:15, fontWeight:700, color:MIT_COLORS[n-1], width:20, flexShrink:0 }}>{n}</span>
                      <input
                        value={review[`mit${n}`] || ''}
                        onChange={e => handleReviewField(`mit${n}`, e.target.value)}
                        placeholder={['가장 중요한 핵심 목표...', '두 번째 핵심 목표...', '세 번째 핵심 목표...'][n-1]}
                        style={{ flex:1, background:'transparent', border:'none', color:'var(--text-primary)', fontSize:14, outline:'none', fontWeight: review[`mit${n}`] ? 600 : 400 }}
                      />
                    </div>
                  ))}

                  {mitSetCount === 0 && (
                    <div style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', padding:'6px 10px', background:'color-mix(in srgb, var(--accent) 4%, var(--bg-base))', borderRadius:6 }}>
                      💡 이번 주 핵심 3가지를 정하면 일간 플래너에 자동으로 표시돼요
                    </div>
                  )}
                </div>

                {/* 이번 주 한 줄 모음 */}
                {weekOneLiners.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>💬 이번 주 한 줄 모음</div>
                    {weekOneLiners.map(({ date, text, dayIdx }) => (
                      <div key={date} style={{ marginBottom:8, padding:'7px 12px', background:'var(--bg-elevated)', borderRadius:7, borderLeft:'3px solid var(--accent)', cursor:'pointer' }}
                        onClick={() => navigate(`/workspaces/${slug}/planner?date=${date}`)}>
                        <div style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{DAY_LABELS[dayIdx]} {fmtShort(date)}</div>
                        <div style={{ fontSize:12, color:'var(--text-secondary)', fontStyle:'italic', fontFamily:'Georgia, serif', lineHeight:1.5 }}>"{text}"</div>
                      </div>
                    ))}
                  </div>
                )}
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
