const STATUS_STYLES = {
  todo:        { bg: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary)' },
  in_progress: { bg: 'var(--accent-muted)',    color: 'var(--accent)' },
  done:        { bg: 'rgba(16,185,129,0.15)',  color: 'var(--success)' },
  cancelled:   { bg: 'rgba(55,65,81,0.5)',     color: 'var(--text-muted)' },
}

const STATUS_LABELS = {
  todo: 'Todo', in_progress: 'In Progress', done: 'Done', cancelled: 'Cancelled',
}

export function StatusBadge({ status, onChange }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.todo
  if (!onChange) {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 500, ...s }}>
        {STATUS_LABELS[status] || status}
      </span>
    )
  }
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      style={{ padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 500, border: 'none', cursor: 'pointer', ...s }}
    >
      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

export function PriorityBadge({ priority, onChange }) {
  const PRIORITY_META = {
    urgent: { icon: '⚡', color: 'var(--priority-urgent)', label: 'Urgent' },
    high:   { icon: '↑',  color: 'var(--priority-high)',   label: 'High' },
    medium: { icon: '→',  color: 'var(--priority-medium)', label: 'Medium' },
    low:    { icon: '↓',  color: 'var(--priority-low)',    label: 'Low' },
  }
  const m = PRIORITY_META[priority] || PRIORITY_META.medium
  if (!onChange) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: m.color, fontWeight: 500 }}>
        {m.icon} {m.label}
      </span>
    )
  }
  return (
    <select
      value={priority}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      style={{ background: 'transparent', border: 'none', color: m.color, fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}
    >
      {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.icon} {m.label}</option>)}
    </select>
  )
}
