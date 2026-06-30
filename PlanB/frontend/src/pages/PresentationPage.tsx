import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import { getPresentationEvents } from '../lib/workspaceApi'

export default function PresentationPage() {
  const { slug } = useParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPresentationEvents(slug)
      .then(data => {
        setEvents(data.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start_at,
          end: e.end_at,
          allDay: e.is_all_day,
          color: '#1f6feb',
        })))
      })
      .catch(() => setError('워크스페이스를 찾을 수 없습니다.'))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <div style={s.center}>불러오는 중...</div>
  if (error) return <div style={s.center}>{error}</div>

  return (
    <div style={s.root}>
      <header style={s.header}>
        <span style={s.logo}>PlanB</span>
        <span style={s.subtitle}>📅 {slug} — 공개 일정</span>
      </header>
      <main style={s.main}>
        <div style={s.calWrap}>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            events={events}
            height="auto"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth' }}
            editable={false}
          />
        </div>
      </main>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#0d1117', color: '#e6edf3' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', height: 56, borderBottom: '1px solid #21262d',
    background: '#161b22',
  },
  logo: { fontWeight: 700, fontSize: 18, color: '#58a6ff' },
  subtitle: { fontSize: 13, color: '#8b949e' },
  main: { padding: '32px', maxWidth: 1000, margin: '0 auto' },
  calWrap: { background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 20 },
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#0d1117', color: '#8b949e', fontSize: 14,
  },
}
