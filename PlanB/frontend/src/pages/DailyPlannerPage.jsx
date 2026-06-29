import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import {
  createBlock, createHabit, deleteBlock, deleteHabit,
  getEntries, getEntry, getHabits, getWeekEntries, getWeekReview, patchBlock, patchEntry, toggleHabitLog,
} from '../lib/plannerApi'
import { getProjects, getTasks } from '../lib/workspaceApi'
import HabitHeatmap from '../components/HabitHeatmap'

// ─── 상수 ───────────────────────────────────────────────
const MOODS = [
  { key: 'great',   emoji: '😄', label: '최고',  color: '#f59e0b', ambient: 'rgba(245,158,11,0.06)' },
  { key: 'good',    emoji: '🙂', label: '좋음',  color: '#6366f1', ambient: 'rgba(99,102,241,0.06)' },
  { key: 'neutral', emoji: '😐', label: '보통',  color: '#94a3b8', ambient: 'rgba(148,163,184,0.05)' },
  { key: 'bad',     emoji: '😕', label: '나쁨',  color: '#8b5cf6', ambient: 'rgba(139,92,246,0.06)' },
  { key: 'awful',   emoji: '😣', label: '힘듦',  color: '#64748b', ambient: 'rgba(100,116,139,0.07)' },
]

const EMOTION_TAGS = ['설렘','보람참','뿌듯함','평온함','그리움','외로움','피곤함','긴장됨','감사함','두근거림','아쉬움','홀가분함']

const CATEGORIES = {
  work:     { label: '업무', color: '#6366f1' },
  personal: { label: '개인', color: '#10b981' },
  health:   { label: '건강', color: '#ef4444' },
  learning: { label: '학습', color: '#f59e0b' },
  other:    { label: '기타', color: '#8b5cf6' },
}

const PLANT_STAGES = [
  { min: 0,  emoji: '🌱', label: '씨앗',  desc: '작은 시작이에요' },
  { min: 7,  emoji: '🌿', label: '새싹',  desc: '싹이 트고 있어요' },
  { min: 14, emoji: '🪴', label: '화분',  desc: '무럭무럭 자라고 있어요' },
  { min: 21, emoji: '🌳', label: '나무',  desc: '어느새 이만큼 자랐어요' },
  { min: 30, emoji: '🌸', label: '만개',  desc: '꽃을 피웠어요, 대단해요!' },
]

const DAILY_PROMPTS = [
  '오늘 가장 기뻤던 순간은 언제였나요?',
  '오늘 나에게 해주고 싶은 말이 있다면?',
  '지금 이 순간 가장 소중한 것은 무엇인가요?',
  '오늘 나를 위해 한 일이 있나요?',
  '오늘 배운 것 중 기억하고 싶은 것은?',
  '오늘 고마웠던 사람이 있나요?',
  '내일의 나에게 전하고 싶은 한 마디는?',
  '오늘 가장 집중했던 순간은 언제인가요?',
  '오늘 용기 냈던 일이 있나요?',
  '지금 기분을 색으로 표현하면 어떤 색일까요?',
  '오늘 스스로 칭찬해주고 싶은 점은?',
  '오늘 하지 못했지만 내일 꼭 하고 싶은 것은?',
  '오늘 가장 편안했던 순간은 언제인가요?',
  '오늘 어떤 선택이 가장 잘 됐다고 생각하나요?',
  '오늘 새롭게 발견한 나의 모습이 있나요?',
]

const COMPLETE_MESSAGES = {
  great:   { full: '오늘 정말 빛났어요 🌟', half: '순조로운 하루예요 ✨', low: '조금씩 채워가고 있어요 🌱' },
  good:    { full: '좋은 하루를 완성했어요 😊', half: '잘 하고 있어요 🙂', low: '시작이 반이에요 💪' },
  neutral: { full: '묵묵히 해냈어요, 멋져요 👏', half: '차근차근 나아가고 있어요', low: '오늘도 수고했어요' },
  bad:     { full: '힘들어도 해냈어요, 대단해요 💜', half: '이 정도도 충분해요 🌷', low: '그냥 쉬어도 괜찮아요 ☁️' },
  awful:   { full: '최악의 날에도 해냈어요, 진심으로 👏', half: '오늘 많이 힘들었죠? 충분해요', low: '오늘은 그냥 쉬는 날이에요 🌙' },
  '':      { full: '모두 완료했어요! 🎉', half: '잘 하고 있어요', low: '오늘도 화이팅!' },
}

const MOOD_COLORS = { great: '#f59e0b', good: '#6366f1', neutral: '#94a3b8', bad: '#8b5cf6', awful: '#64748b' }
const DAY_KO = ['월', '화', '수', '목', '금', '토', '일']

// ─── 유틸 ───────────────────────────────────────────────
function toIso(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
}
function fmtShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function getDayOfYear(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000)
}
function getGreeting() {
  const h = new Date().getHours()
  if (h < 6)  return '고요한 밤이에요 🌙'
  if (h < 11) return '좋은 아침이에요 ☀️'
  if (h < 14) return '점심 시간이에요 🌤'
  if (h < 18) return '오후도 힘내요 🌈'
  if (h < 21) return '저녁 시간이에요 🌆'
  return '오늘 하루 수고했어요 🌙'
}
function calcJournalStreak(entries) {
  const today = toIso(new Date())
  const dateSet = new Set(entries.filter(e => e.journal?.trim()).map(e => e.date))
  let streak = 0
  const d = new Date()
  if (!dateSet.has(today)) d.setDate(d.getDate() - 1)
  while (dateSet.has(toIso(d))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}
function getPlantStage(streak) {
  for (let i = PLANT_STAGES.length - 1; i >= 0; i--) {
    if (streak >= PLANT_STAGES[i].min) return PLANT_STAGES[i]
  }
  return PLANT_STAGES[0]
}
function getCompletionMsg(progress, mood) {
  const msgs = COMPLETE_MESSAGES[mood] || COMPLETE_MESSAGES['']
  return progress === 100 ? msgs.full : progress >= 50 ? msgs.half : msgs.low
}
function getWeekDates() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return toIso(d)
  })
}
function launchConfetti() {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  canvas.width = window.innerWidth; canvas.height = window.innerHeight
  const COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4']
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width, y: -10, r: Math.random() * 6 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3 + 1,
    rot: Math.random() * 360, rotV: (Math.random() - 0.5) * 6,
  }))
  let frame = 0
  const go = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rotV
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * Math.PI / 180)
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, 1 - frame / 120)
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); ctx.restore()
    })
    if (++frame < 120) requestAnimationFrame(go)
    else document.body.removeChild(canvas)
  }
  go()
}

// ─── 메인 컴포넌트 ───────────────────────────────────────
export default function DailyPlannerPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  useAuthStore(s => s.user)
  const toast = useToastStore(s => s.add)

  const [selectedDate, setSelectedDate] = useState(toIso(new Date()))
  const [entry, setEntry]               = useState(null)
  const [habits, setHabits]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [newBlockTitle, setNewBlockTitle] = useState('')
  const [newBlockCat, setNewBlockCat]   = useState('work')
  const [addingBlock, setAddingBlock]   = useState(false)
  const [journal, setJournal]           = useState('')
  const [oneLiner, setOneLiner]         = useState('')
  const [gratitude, setGratitude]       = useState(['', '', ''])
  const [journalSaving, setJournalSaving] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [addingHabit, setAddingHabit]   = useState(false)
  const [expandedHabit, setExpandedHabit] = useState(null)
  const [projectTasks, setProjectTasks] = useState([])
  const [journalStreak, setJournalStreak] = useState(0)
  const [weekMoods, setWeekMoods]       = useState({})
  const [pastEntries, setPastEntries]   = useState({ month: null, year: null })
  const [showPast, setShowPast]         = useState(false)
  const [celebratedToday, setCelebratedToday] = useState(false)
  const [weekContext, setWeekContext] = useState(null)
  const [showWeekContext, setShowWeekContext] = useState(true)

  const journalTimer   = useRef(null)
  const gratitudeTimer = useRef(null)
  const oneLinerTimer  = useRef(null)

  const loadMeta = useCallback(async () => {
    try {
      const sixtyAgo = toIso(new Date(Date.now() - 60 * 86400000))
      const weekDates = getWeekDates()
      const firstDay = new Date(weekDates[0] + 'T00:00:00')
      const tmp = new Date(Date.UTC(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate()))
      tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
      const isoWeek = Math.ceil((((tmp - new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7)

      const [recentEntries, weekEntries, wr] = await Promise.all([
        getEntries(slug, { start: sixtyAgo }).catch(() => []),
        getWeekEntries(slug, firstDay.getFullYear(), isoWeek).catch(() => []),
        getWeekReview(slug, firstDay.getFullYear(), isoWeek).catch(() => null),
      ])
      setJournalStreak(calcJournalStreak(recentEntries))
      setWeekContext(wr)
      const moodMap = {}
      weekEntries.forEach(e => { moodMap[e.date] = e.mood })
      setWeekMoods(moodMap)

      const d = new Date(selectedDate + 'T00:00:00')
      const pad = n => String(n).padStart(2, '0')
      const lastMonth = `${d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear()}-${pad(d.getMonth() === 0 ? 12 : d.getMonth())}-${pad(d.getDate())}`
      const lastYear  = `${d.getFullYear() - 1}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      const [em, ey] = await Promise.all([
        getEntry(slug, lastMonth).catch(() => null),
        getEntry(slug, lastYear).catch(() => null),
      ])
      setPastEntries({
        month: em?.journal?.trim() ? em : null,
        year:  ey?.journal?.trim() ? ey : null,
      })
    } catch { /* silent */ }
  }, [slug, selectedDate])

  const loadDay = useCallback(async () => {
    setLoading(true); setShowPast(false)
    try {
      const [e, h] = await Promise.all([
        getEntry(slug, selectedDate).catch(() => ({
          date: selectedDate, journal: '', mood: '', energy: null,
          emotion_tags: [], gratitude: [], one_liner: '', time_blocks: [],
        })),
        getHabits(slug).catch(() => []),
      ])
      setEntry(e)
      setJournal(e.journal || '')
      setOneLiner(e.one_liner || '')
      setGratitude(Array.isArray(e.gratitude) && e.gratitude.length === 3 ? e.gratitude : ['', '', ''])
      setHabits(h)
      const projects = await getProjects(slug).catch(() => [])
      const taskArrays = await Promise.all(projects.map(p => getTasks(slug, p.id, { tree: false }).catch(() => [])))
      setProjectTasks(taskArrays.flat().filter(t => t.due_date === selectedDate && t.status !== 'done'))
    } finally { setLoading(false) }
  }, [slug, selectedDate])

  useEffect(() => { loadDay() }, [loadDay])
  useEffect(() => { loadMeta() }, [loadMeta])

  const blocks    = entry?.time_blocks || []
  const doneCount = blocks.filter(b => b.is_done).length
  const progress  = blocks.length ? Math.round((doneCount / blocks.length) * 100) : 0
  const isToday   = selectedDate === toIso(new Date())

  useEffect(() => {
    if (isToday && progress === 100 && blocks.length > 0 && !celebratedToday) {
      setCelebratedToday(true); launchConfetti()
    }
  }, [progress, isToday, blocks.length, celebratedToday])

  const shiftDay = (n) => {
    setCelebratedToday(false)
    const d = new Date(selectedDate + 'T00:00:00'); d.setDate(d.getDate() + n)
    setSelectedDate(toIso(d))
  }

  // ─── 핸들러 ────────────────────────────────────────────
  const handleMood = async (key) => {
    setEntry(p => ({ ...p, mood: key }))
    try { await patchEntry(slug, selectedDate, { mood: key, date: selectedDate }) }
    catch { toast('저장 실패', 'error') }
  }
  const handleEmotionTag = async (tag) => {
    const prev = entry?.emotion_tags || []
    const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    setEntry(p => ({ ...p, emotion_tags: next }))
    try { await patchEntry(slug, selectedDate, { emotion_tags: next, date: selectedDate }) }
    catch { toast('저장 실패', 'error') }
  }
  const handleEnergy = async (val) => {
    setEntry(p => ({ ...p, energy: val }))
    try { await patchEntry(slug, selectedDate, { energy: val, date: selectedDate }) }
    catch { toast('저장 실패', 'error') }
  }
  const handleJournalChange = (val) => {
    setJournal(val)
    clearTimeout(journalTimer.current)
    journalTimer.current = setTimeout(async () => {
      setJournalSaving(true)
      try { await patchEntry(slug, selectedDate, { journal: val, date: selectedDate }) }
      finally { setJournalSaving(false) }
    }, 800)
  }
  const handleOneLinerChange = (val) => {
    setOneLiner(val)
    clearTimeout(oneLinerTimer.current)
    oneLinerTimer.current = setTimeout(async () => {
      try { await patchEntry(slug, selectedDate, { one_liner: val, date: selectedDate }) }
      catch { /* silent */ }
    }, 600)
  }
  const handleGratitudeChange = (idx, val) => {
    const next = gratitude.map((g, i) => i === idx ? val : g)
    setGratitude(next)
    clearTimeout(gratitudeTimer.current)
    gratitudeTimer.current = setTimeout(async () => {
      try { await patchEntry(slug, selectedDate, { gratitude: next, date: selectedDate }) }
      catch { /* silent */ }
    }, 600)
  }
  const handleAddBlock = async (e) => {
    e.preventDefault()
    if (!newBlockTitle.trim()) return
    setAddingBlock(true)
    try {
      const block = await createBlock(slug, selectedDate, {
        title: newBlockTitle.trim(), category: newBlockCat, order: blocks.length,
      })
      setEntry(p => ({ ...p, time_blocks: [...(p?.time_blocks || []), block] }))
      setNewBlockTitle('')
    } catch { toast('태스크 추가 실패', 'error') }
    finally { setAddingBlock(false) }
  }
  const handleToggleBlock = async (block) => {
    const newDone = !block.is_done
    setEntry(p => ({ ...p, time_blocks: p.time_blocks.map(b => b.id === block.id ? { ...b, is_done: newDone } : b) }))
    try { await patchBlock(slug, selectedDate, block.id, { is_done: newDone }) }
    catch {
      setEntry(p => ({ ...p, time_blocks: p.time_blocks.map(b => b.id === block.id ? { ...b, is_done: block.is_done } : b) }))
      toast('변경 실패', 'error')
    }
  }
  const handleDeleteBlock = async (block) => {
    setEntry(p => ({ ...p, time_blocks: p.time_blocks.filter(b => b.id !== block.id) }))
    try { await deleteBlock(slug, selectedDate, block.id) }
    catch { toast('삭제 실패', 'error'); loadDay() }
  }
  const handleToggleHabit = async (habit) => {
    const was = habit.logged_today
    setHabits(p => p.map(h => h.id === habit.id ? { ...h, logged_today: !was, streak: was ? Math.max(0, h.streak - 1) : h.streak + 1 } : h))
    try { await toggleHabitLog(slug, habit.id, selectedDate) }
    catch {
      setHabits(p => p.map(h => h.id === habit.id ? { ...h, logged_today: was } : h))
      toast('변경 실패', 'error')
    }
  }
  const handleAddHabit = async (e) => {
    e.preventDefault()
    if (!newHabitName.trim()) return
    const PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316']
    try {
      const habit = await createHabit(slug, { name: newHabitName.trim(), color: PALETTE[habits.length % PALETTE.length] })
      setHabits(p => [...p, { ...habit, logged_today: false, streak: 0 }])
      setNewHabitName(''); setAddingHabit(false)
    } catch { toast('습관 추가 실패', 'error') }
  }
  const handleDeleteHabit = async (habit) => {
    setHabits(p => p.filter(h => h.id !== habit.id))
    try { await deleteHabit(slug, habit.id) }
    catch { toast('삭제 실패', 'error'); loadDay() }
  }

  // ─── 파생값 ─────────────────────────────────────────────
  const moodObj     = MOODS.find(m => m.key === entry?.mood)
  const ambientBg   = moodObj?.ambient || 'rgba(99,102,241,0.03)'
  const plantStage  = getPlantStage(journalStreak)
  const todayPrompt = DAILY_PROMPTS[getDayOfYear(selectedDate) % DAILY_PROMPTS.length]
  const weekDates   = getWeekDates()

  // ─── 렌더 ───────────────────────────────────────────────
  return (
    <div className="planner-page" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ambient */}
      <div style={{ position: 'absolute', inset: 0, background: ambientBg, pointerEvents: 'none', transition: 'background 1s', zIndex: 0 }} />

      {/* ── 상단 헤더 ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <button onClick={() => shiftDay(-1)} style={NAV_BTN}>‹</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtDate(selectedDate)}</span>
            {isToday && <span style={{ fontSize: 10, background: 'var(--accent)', color: '#fff', borderRadius: 4, padding: '2px 7px', fontWeight: 600 }}>오늘</span>}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getGreeting()}</span>
          </div>
          {/* 주간 감정 닷 */}
          <div style={{ display: 'flex', gap: 4, marginTop: 5, alignItems: 'center' }}>
            {weekDates.map((date, i) => {
              const mood = weekMoods[date]; const isSel = date === selectedDate
              return (
                <div key={date} title={`${DAY_KO[i]} ${fmtShort(date)}`}
                  onClick={() => { setCelebratedToday(false); setSelectedDate(date) }}
                  style={{ width: isSel ? 18 : 12, height: isSel ? 18 : 12, borderRadius: '50%', background: mood ? MOOD_COLORS[mood] : 'var(--border)', cursor: 'pointer', transition: 'all .2s', border: isSel ? '2px solid var(--accent)' : '2px solid transparent', flexShrink: 0 }}
                />
              )
            })}
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>이번 주</span>
          </div>
        </div>

        {/* 스트릭 + 식물 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {journalStreak > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span>📓</span><span style={{ color: '#10b981', fontWeight: 700 }}>{journalStreak}일</span><span>연속</span>
            </div>
          )}
          <div title={`${plantStage.label} — ${plantStage.desc}`}
            style={{ fontSize: 22, cursor: 'default', filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.3))', transition: 'transform .2s' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >{plantStage.emoji}</div>
        </div>

        <button onClick={() => shiftDay(1)} style={NAV_BTN}>›</button>
        <button onClick={() => { setCelebratedToday(false); setSelectedDate(toIso(new Date())) }}
          style={{ ...NAV_BTN, width: 'auto', padding: '4px 10px', fontSize: 11 }}>오늘</button>
        <div style={{ display: 'flex', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          <button style={{ padding: '4px 12px', fontSize: 12, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>일간</button>
          <button onClick={() => navigate(`/workspaces/${slug}/planner/week`)}
            style={{ padding: '4px 12px', fontSize: 12, background: 'none', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>주간</button>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, position: 'relative', zIndex: 1 }}>로딩 중...</div>
      ) : (
        <div className="planner-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

          {/* ══ 왼쪽: 계획 + 습관 (50:50) ══ */}
          <div className="planner-left-panel" style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── 상단 절반: 오늘의 계획 ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* 섹션 헤더 */}
              <div style={{ padding: '10px 16px 8px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: blocks.length > 0 ? 6 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>오늘의 계획</div>
                  {blocks.length > 0 && (
                    <span style={{ fontSize: 11, color: progress === 100 ? '#10b981' : 'var(--text-muted)', fontWeight: progress === 100 ? 700 : 400 }}>
                      {getCompletionMsg(progress, entry?.mood || '')}
                    </span>
                  )}
                </div>
                {blocks.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, borderRadius: 3, transition: 'width .4s, background .5s', background: progress === 100 ? '#10b981' : progress >= 60 ? '#f59e0b' : progress >= 30 ? '#f97316' : '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{doneCount}/{blocks.length}</span>
                  </div>
                )}
              </div>

              {/* 이번 주 목표 컨텍스트 */}
              {weekContext && (weekContext.mit1 || weekContext.mit2 || weekContext.mit3 || weekContext.next_focus) && (
                <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--accent) 5%, var(--bg-elevated))' }}>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 5px', cursor: 'pointer' }}
                    onClick={() => setShowWeekContext(v => !v)}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: 1, textTransform: 'uppercase', flex: 1 }}>⚡ 이번 주 MIT</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{showWeekContext ? '▾' : '▸'}</span>
                  </div>
                  {showWeekContext && (
                    <div style={{ padding: '0 16px 8px' }}>
                      {weekContext.next_focus && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5, fontStyle: 'italic', lineHeight: 1.4 }}>
                          🎯 {weekContext.next_focus}
                        </div>
                      )}
                      {[weekContext.mit1, weekContext.mit2, weekContext.mit3].filter(Boolean).map((mit, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: ['#6366f1','#10b981','#f59e0b'][i], flexShrink: 0, width: 14 }}>{i + 1}.</span>
                          <span style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4 }}>{mit}</span>
                        </div>
                      ))}
                      <button onClick={() => navigate(`/workspaces/${slug}/planner/week`)}
                        style={{ marginTop: 5, fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', opacity: 0.8 }}>
                        주간 플래너에서 편집 →
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* 태스크 목록 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '6px 12px' }}>
                {projectTasks.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: 1, textTransform: 'uppercase', padding: '4px 2px 5px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>📋</span> 프로젝트 마감 ({projectTasks.length})
                    </div>
                    {projectTasks.map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 'var(--r-sm)', marginBottom: 3, background: 'color-mix(in srgb, #f59e0b 8%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, #f59e0b 25%, var(--border))' }}>
                        <span style={{ fontSize: 11, color: '#f59e0b', flexShrink: 0 }}>◆</span>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
                      </div>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                  </div>
                )}
                {blocks.length === 0 && projectTasks.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>오늘 할 일을 추가해보세요 ✏️</div>
                )}
                {blocks.map(block => (
                  <div key={block.id} className="planner-block-row"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--r-sm)', marginBottom: 4, background: block.is_done ? 'transparent' : 'var(--bg-elevated)', border: `1px solid ${block.is_done ? 'transparent' : 'var(--border)'}`, transition: 'all .15s', cursor: 'pointer' }}
                    onClick={() => handleToggleBlock(block)}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${CATEGORIES[block.category]?.color || 'var(--accent)'}`, background: block.is_done ? (CATEGORIES[block.category]?.color || 'var(--accent)') : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', transform: block.is_done ? 'scale(1.1)' : 'scale(1)' }}>
                      {block.is_done && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, color: block.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: block.is_done ? 'line-through' : 'none', transition: 'all .15s' }}>{block.title}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>{CATEGORIES[block.category]?.label}</span>
                    <button className="planner-block-del" onClick={ev => { ev.stopPropagation(); handleDeleteBlock(block) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>×</button>
                  </div>
                ))}
              </div>

              {/* 태스크 추가 폼 */}
              <form onSubmit={handleAddBlock} style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setNewBlockCat(k)}
                      style={{ flex: 1, padding: '3px 0', fontSize: 10, borderRadius: 3, border: `1px solid ${newBlockCat === k ? v.color : 'var(--border)'}`, background: newBlockCat === k ? v.color + '22' : 'transparent', color: newBlockCat === k ? v.color : 'var(--text-muted)', cursor: 'pointer', transition: 'all .12s' }}
                    >{v.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={newBlockTitle} onChange={e => setNewBlockTitle(e.target.value)} placeholder="할 일 추가..."
                    style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                  <button type="submit" disabled={addingBlock || !newBlockTitle.trim()}
                    style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', color: '#fff', fontSize: 14, cursor: 'pointer', opacity: addingBlock || !newBlockTitle.trim() ? 0.5 : 1 }}>+</button>
                </div>
              </form>
            </div>

            {/* ── 하단 절반: 습관 트래커 ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderTop: '2px solid var(--border)' }}>
              <div style={{ padding: '10px 16px 8px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>습관 트래커</div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px' }}>
                {habits.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>습관을 추가해보세요 🌱</div>
                )}
                {habits.map(habit => (
                  <div key={habit.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px' }}>
                      <button onClick={() => handleToggleHabit(habit)}
                        style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${habit.color}`, background: habit.logged_today ? habit.color : 'transparent', flexShrink: 0, cursor: 'pointer', fontSize: 15, color: habit.logged_today ? '#fff' : 'inherit', transition: 'all .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: habit.logged_today ? 'scale(1.12)' : 'scale(1)', boxShadow: habit.logged_today ? `0 0 10px ${habit.color}55` : 'none' }}
                      >{habit.logged_today ? '✓' : (habit.emoji || '○')}</button>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandedHabit(expandedHabit?.id === habit.id ? null : habit)}>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</div>
                        {habit.streak > 0 && (
                          <div style={{ fontSize: 11, color: habit.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ filter: `drop-shadow(0 0 3px ${habit.color})` }}>🔥</span> {habit.streak}일 연속
                          </div>
                        )}
                      </div>
                      <button onClick={() => handleDeleteHabit(habit)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 2, flexShrink: 0 }}>×</button>
                    </div>
                    {expandedHabit?.id === habit.id && (
                      <div style={{ padding: '0 4px 10px' }}>
                        <HabitHeatmap slug={slug} habit={habit} selectedDate={selectedDate} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                {addingHabit ? (
                  <form onSubmit={handleAddHabit} style={{ display: 'flex', gap: 6 }}>
                    <input autoFocus value={newHabitName} onChange={e => setNewHabitName(e.target.value)}
                      onKeyDown={e => e.key === 'Escape' && setAddingHabit(false)} placeholder="습관 이름..."
                      style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }} />
                    <button type="submit" style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--r-sm)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>+</button>
                  </form>
                ) : (
                  <button onClick={() => setAddingHabit(true)}
                    style={{ width: '100%', padding: '7px', background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                    + 습관 추가
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ══ 오른쪽: 기분·감정 + 일기 영역 ══ */}
          <div className="planner-right-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* 기분 + 복합 감정 태그 + 에너지 (한 행) */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
              {/* 기분 */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>기분</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {MOODS.map(m => (
                    <button key={m.key} onClick={() => handleMood(m.key)} title={m.label}
                      style={{ fontSize: 20, background: entry?.mood === m.key ? `${m.color}22` : 'none', border: `2px solid ${entry?.mood === m.key ? m.color : 'transparent'}`, borderRadius: 8, padding: '2px 4px', cursor: 'pointer', transition: 'all .18s', transform: entry?.mood === m.key ? 'scale(1.2)' : 'scale(1)' }}
                    >{m.emoji}</button>
                  ))}
                </div>
              </div>

              {/* 에너지 */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>에너지</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => handleEnergy(n)}
                      style={{ width: 28, height: 28, borderRadius: 4, border: `2px solid ${(entry?.energy || 0) >= n ? 'var(--accent)' : 'var(--border)'}`, background: (entry?.energy || 0) >= n ? 'var(--accent)' : 'transparent', color: (entry?.energy || 0) >= n ? '#fff' : 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all .12s' }}
                    >{n}</button>
                  ))}
                </div>
              </div>

              {/* 복합 감정 태그 */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>감정 태그</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {EMOTION_TAGS.map(tag => {
                    const active = entry?.emotion_tags?.includes(tag)
                    return (
                      <button key={tag} onClick={() => handleEmotionTag(tag)}
                        style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all .12s', fontWeight: active ? 600 : 400 }}
                      >{tag}</button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 오늘의 한 줄 */}
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>✨ 오늘의 한 줄</div>
              <input value={oneLiner} onChange={e => handleOneLinerChange(e.target.value)}
                placeholder="오늘 하루를 한 문장으로 표현한다면..."
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 16, fontWeight: 500, fontFamily: 'Georgia, "Nanum Myeongjo", serif', letterSpacing: 0.3, boxSizing: 'border-box' }} />
            </div>

            {/* 일기 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 24px 0', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase' }}>📝 일기</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                  {journal.length > 0 && <span>{journal.length}자</span>}
                  {journalSaving
                    ? <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>● 저장 중</span>
                    : journal.length > 0 && <span style={{ color: '#10b981', fontStyle: 'italic' }}>✓ 저장됨</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, padding: '8px 12px', background: 'color-mix(in srgb, var(--accent) 6%, var(--bg-elevated))', borderRadius: 'var(--r-sm)', borderLeft: '3px solid var(--accent)', fontStyle: 'italic', lineHeight: 1.6 }}>
                💬 {todayPrompt}
              </div>
              <textarea value={journal} onChange={e => handleJournalChange(e.target.value)}
                placeholder={`자유롭게 적어보세요...\n\n오늘 배운 것, 느낀 것, 내일의 다짐을 담아보세요.`}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontSize: 15, lineHeight: 2, fontFamily: 'Georgia, "Nanum Myeongjo", serif', letterSpacing: 0.3 }} />
            </div>

            {/* 감사 일기 */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>🙏 오늘 감사한 것</div>
              <div className="gratitude-row" style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', transition: 'border-color .2s' }}
                    onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{i + 1}.</span>
                    <input value={gratitude[i]} onChange={e => handleGratitudeChange(i, e.target.value)}
                      placeholder={['감사한 사람', '감사한 순간', '감사한 것'][i]}
                      style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, minWidth: 0 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* 과거 같은 날 */}
            {(pastEntries.month || pastEntries.year) && (
              <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                <button onClick={() => setShowPast(p => !p)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, padding: 0 }}>
                  <span style={{ transition: 'transform .2s', display: 'inline-block', transform: showPast ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                  📖 그때의 나 돌아보기
                </button>
                {showPast && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                    {pastEntries.month && (
                      <div style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>한 달 전 ({pastEntries.month.date})</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 56, overflow: 'hidden' }}>{pastEntries.month.journal}</div>
                      </div>
                    )}
                    {pastEntries.year && (
                      <div style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-base)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>1년 전 ({pastEntries.year.date})</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 56, overflow: 'hidden' }}>{pastEntries.year.journal}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .planner-block-del { opacity: 0; transition: opacity .15s; }
        .planner-block-row:hover .planner-block-del { opacity: 1; }
      `}</style>
    </div>
  )
}

const NAV_BTN = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
  width: 28, height: 28, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
