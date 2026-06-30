import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useNotificationStore from '../store/notificationStore'

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - Number(new Date(iso))) / 1000)
  if (s < 60)    return '방금 전'
  if (s < 3600)  return `${Math.floor(s / 60)}분 전`
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`
  return `${Math.floor(s / 86400)}일 전`
}

const TIER = {
  task_assigned: 0, due_soon: 0,
  comment_added: 1, status_changed: 1,
  task_updated: 1, mention: 1, file_attached: 1,
  sprint_started: 2, info: 2, system: 2,
}
const TIER_LABEL = ['긴급 · 할당', '활동', '정보']
const TIER_COLOR = ['var(--danger)', 'var(--accent)', 'var(--text-muted)']
const TYPE_META = {
  task_assigned:  { icon: '📌', color: 'var(--accent)' },
  status_changed: { icon: '🔄', color: '#f59e0b' },
  comment_added:  { icon: '💬', color: 'var(--success)' },
  task_updated:   { icon: '✏️', color: '#f59e0b' },
  mention:        { icon: '👤', color: '#6366f1' },
  file_attached:  { icon: '📎', color: '#10b981' },
  sprint_started: { icon: '🚀', color: '#6366f1' },
  due_soon:       { icon: '⏰', color: 'var(--danger)' },
  info:           { icon: 'ℹ️', color: 'var(--text-muted)' },
  system:         { icon: '⚙️', color: 'var(--text-muted)' },
}

function NotifItem({ n, onResolve, onSnooze, onOpen }) {
  const meta = TYPE_META[n.type] || TYPE_META.info
  const tier = TIER[n.type] ?? 2
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex', gap: 10, padding: '11px 14px',
        borderBottom: '1px solid var(--border)',
        background: n.read ? 'transparent' : 'rgba(99,102,241,0.06)',
        position: 'relative',
      }}
    >
      {!n.read && (
        <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 5, height: 5, borderRadius: '50%', background: TIER_COLOR[tier] }} />
      )}
      <span style={{ fontSize: 17, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.45, marginBottom: 2 }}>{n.message}</div>
        {n.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{n.sub}</div>}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</span>
          <button onClick={() => onResolve(n.id)} style={{ fontSize: 10, padding: '1px 7px', border: '1px solid var(--border)', borderRadius: 99, background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer' }}>완료</button>
          {tier === 0 && <button onClick={() => onSnooze(n.id)} style={{ fontSize: 10, padding: '1px 7px', border: '1px solid var(--border)', borderRadius: 99, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>나중에</button>}
          {n.link && <button onClick={() => onOpen(n)} style={{ fontSize: 10, padding: '1px 7px', border: '1px solid var(--accent)', borderRadius: 99, background: 'var(--accent-muted)', color: 'var(--accent)', cursor: 'pointer' }}>열기</button>}
        </div>
      </div>
    </motion.div>
  )
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const ref = useRef(null)
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const tiered = [0, 1, 2].map(tier =>
    notifications.filter(n => (TIER[n.type as keyof typeof TIER] ?? 2) === tier)
  )
  const displayed = activeTab === -1 ? notifications : tiered[activeTab]
  const unreadInTab = displayed.filter(n => !n.read).length

  const handleResolve = (id) => markRead(id)
  const handleSnooze = (id) => markRead(id)
  const handleOpen = (n) => { markRead(n.id) }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ position: 'relative', background: open ? 'var(--accent-muted)' : 'var(--bg-elevated)', border: `1px solid ${open ? 'var(--border-focus)' : 'var(--border)'}`, borderRadius: 'var(--r-md)', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, lineHeight: 1, transition: 'all 0.15s' }}
      >
        🔔
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            style={{ position: 'absolute', top: -5, right: -5, background: 'var(--danger)', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 99, minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid var(--bg-base)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', width: 360, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 300, overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '12px 14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>인박스 {unreadCount > 0 && <span style={{ color: 'var(--accent)', fontWeight: 500 }}>({unreadCount})</span>}</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>모두 읽음 처리</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 0 }}>
                {[...TIER_LABEL, '전체'].map((label, i) => {
                  const idx = i === 3 ? -1 : i
                  const cnt = idx === -1 ? unreadCount : tiered[i]?.filter(n => !n.read).length
                  return (
                    <button
                      key={label}
                      onClick={() => setActiveTab(idx)}
                      style={{ flex: 1, padding: '6px 2px', fontSize: 10, fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', color: activeTab === idx ? 'var(--accent)' : 'var(--text-muted)', borderBottom: `2px solid ${activeTab === idx ? 'var(--accent)' : 'transparent'}`, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                    >
                      {label}{cnt > 0 ? ` (${cnt})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Body */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {displayed.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                  <div>모두 처리됐어요!</div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {displayed.map(n => (
                    <NotifItem key={n.id} n={n} onResolve={handleResolve} onSnooze={handleSnooze} onOpen={handleOpen} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
