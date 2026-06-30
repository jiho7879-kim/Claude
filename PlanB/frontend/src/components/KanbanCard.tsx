import { motion } from 'framer-motion'
import Avatar from './ui/Avatar'

const PRIORITY_ICON  = { urgent: '⚡', high: '↑', medium: '→', low: '↓' }
const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#64748b' }

function dueBadgeStyle(dueDate) {
  if (!dueDate) return null
  const diff = Math.round((new Date(dueDate) - new Date()) / 86400000)
  if (diff < 0)  return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: `${Math.abs(diff)}일 초과` }
  if (diff === 0) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '오늘' }
  if (diff === 1) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', label: '내일' }
  return null
}

export default function KanbanCard({ task, onClick, isDragging, isDropped }) {
  const due = dueBadgeStyle(task.due_date)
  const childTotal = task.children_count ?? 0
  const childDone  = task.children_done  ?? 0
  const childPct   = childTotal > 0 ? Math.round(childDone / childTotal * 100) : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      whileHover={{ y: -1 }}
      onClick={() => onClick?.(task)}
      style={{
        background: isDragging ? 'var(--bg-hover)' : 'var(--bg-elevated)',
        border: `1px solid ${isDragging ? 'var(--border-focus)' : due ? due.color + '44' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        marginBottom: 6,
        boxShadow: isDragging ? 'var(--shadow-md)' : '0 1px 3px rgba(0,0,0,0.2)',
        animation: isDropped ? 'cardDrop 0.5s ease' : 'none',
      }}
    >
      <style>{`@keyframes cardDrop{0%,100%{background:var(--bg-elevated)}50%{background:var(--accent-muted);border-color:var(--accent)}}`}</style>

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
        <span style={{ color: PRIORITY_COLOR[task.priority], fontSize: 12, flexShrink: 0, marginTop: 1 }}>
          {PRIORITY_ICON[task.priority]}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 500, flex: 1 }}>
          {task.title}
        </span>
        {task.is_milestone && <span title="마일스톤" style={{ fontSize: 11, color: '#f59e0b' }}>◆</span>}
      </div>

      {/* Sub-task progress bar */}
      {childPct !== null && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${childPct}%`, background: 'var(--success)', borderRadius: 99, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{childDone}/{childTotal} 서브태스크</div>
        </div>
      )}

      {/* Footer meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '1px 6px', borderRadius: 99 }}>
            {task.level_name}
          </span>
          {due && (
            <span style={{ fontSize: 10, fontWeight: 600, color: due.color, background: due.bg, padding: '1px 6px', borderRadius: 99 }}>
              {due.label}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {!due && task.due_date && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {new Date(task.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {task.comments_count > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>💬{task.comments_count}</span>
          )}
          {task.assignee && <Avatar user={task.assignee} size={18} />}
        </div>
      </div>
    </motion.div>
  )
}
