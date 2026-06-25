const STATUS_OPTS    = [['todo','Todo'],['in_progress','In Progress'],['done','Done'],['cancelled','Cancelled']]
const PRIORITY_OPTS  = [['urgent','⚡ Urgent'],['high','↑ High'],['medium','→ Medium'],['low','↓ Low']]

const chipStyle = (active) => ({
  padding: '3px 10px', borderRadius: 'var(--r-full)', fontSize: '12px', fontWeight: 500,
  cursor: 'pointer', border: '1px solid', transition: 'all var(--duration) var(--ease)',
  background:   active ? 'var(--accent-muted)' : 'var(--bg-elevated)',
  borderColor:  active ? 'var(--border-focus)' : 'var(--border)',
  color:        active ? 'var(--accent)'        : 'var(--text-muted)',
})

export default function TaskFilters({ filters, onChange, members = [] }) {
  const toggle = (key, val) => {
    const cur = filters[key] || []
    onChange({ ...filters, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] })
  }
  const hasFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', padding: '10px 0' }}>
      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '5px 10px', minWidth: 180 }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>🔍</span>
        <input
          value={filters.search || ''}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          placeholder="태스크 검색..."
          style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text-primary)', width: 140 }}
        />
      </div>

      {/* Status chips */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {STATUS_OPTS.map(([v, l]) => (
          <span key={v} onClick={() => toggle('status', v)} style={chipStyle((filters.status || []).includes(v))}>{l}</span>
        ))}
      </div>

      {/* Priority chips */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {PRIORITY_OPTS.map(([v, l]) => (
          <span key={v} onClick={() => toggle('priority', v)} style={chipStyle((filters.priority || []).includes(v))}>{l}</span>
        ))}
      </div>

      {/* Assignee */}
      {members.length > 0 && (
        <select
          value={filters.assignee || ''}
          onChange={e => onChange({ ...filters, assignee: e.target.value })}
          style={{ padding: '4px 8px', borderRadius: 'var(--r-md)', fontSize: '12px', border: '1px solid var(--border)', background: filters.assignee ? 'var(--accent-muted)' : 'var(--bg-elevated)', color: filters.assignee ? 'var(--accent)' : 'var(--text-muted)', cursor: 'pointer' }}
        >
          <option value="">담당자 전체</option>
          {members.map(m => <option key={m.user?.id} value={m.user?.id}>{m.user?.display_name || m.user?.username}</option>)}
        </select>
      )}

      {/* Clear */}
      {hasFilters && (
        <button onClick={() => onChange({ search: '', status: [], priority: [], assignee: '' })} style={{ fontSize: '11px', color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
          × 초기화
        </button>
      )}
    </div>
  )
}
