import { useEffect, useState } from 'react'
import { getHabitLogs } from '../lib/plannerApi'

const WEEKS = 15
const DAYS  = 7

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function toIso(d) {
  return d.toISOString().slice(0, 10)
}

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return toIso(d)
}

export default function HabitHeatmap({ slug, habit, selectedDate, version = 0 }) {
  const [logSet, setLogSet] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const todayStr = toIso(new Date())
  const monday = getMondayOf(todayStr)
  const startDate = addDays(monday, -(WEEKS - 1) * 7)

  useEffect(() => {
    if (!habit) return
    setLoading(true)
    getHabitLogs(slug, habit.id, startDate, todayStr)
      .then(dates => setLogSet(new Set(dates.map(d => String(d)))))
      .catch(() => setLogSet(new Set()))
      .finally(() => setLoading(false))
  }, [slug, habit?.id, selectedDate, version])

  if (!habit) return null
  if (loading) return <div style={{ fontSize:11, color:'var(--text-muted)', padding:'8px 0' }}>로딩 중...</div>

  const grid = []
  for (let w = 0; w < WEEKS; w++) {
    const col = []
    for (let d = 0; d < DAYS; d++) {
      col.push(addDays(startDate, w * 7 + d))
    }
    grid.push(col)
  }

  const streak = (() => {
    let s = 0, d = todayStr
    while (logSet.has(d)) { s++; d = addDays(d, -1) }
    return s
  })()

  return (
    <div style={{ padding:'10px 0 4px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'var(--text-muted)', letterSpacing:1, textTransform:'uppercase' }}>{habit.name}</div>
        <div style={{ display:'flex', gap:8, fontSize:11 }}>
          {streak > 0 && <span style={{ color: habit.color, fontWeight:700 }}>🔥 {streak}일</span>}
          <span style={{ color:'var(--text-muted)' }}>{logSet.size}회</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:2 }}>
        {grid.map((col, wi) => (
          <div key={wi} style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {col.map((dateStr, di) => {
              const logged  = logSet.has(dateStr)
              const isFuture = dateStr > todayStr
              const isSelected = dateStr === selectedDate
              return (
                <div
                  key={di}
                  title={`${dateStr}${logged ? ' ✓' : ''}`}
                  style={{
                    width:9, height:9, borderRadius:2,
                    background: isFuture ? 'transparent' : logged ? habit.color : 'var(--border)',
                    border: isSelected ? `1px solid ${habit.color}` : 'none',
                    opacity: isFuture ? 0 : 1,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:10, color:'var(--text-muted)' }}>
        <span>{startDate.slice(5)}</span>
        <span>{todayStr.slice(5)}</span>
      </div>
    </div>
  )
}
