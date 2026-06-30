import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getRules, createRule, updateRule, deleteRule } from '../lib/automationApi'
import useToastStore from '../store/toastStore'

const TRIGGERS = [
  { value: 'status_changed',   label: '상태 변경' },
  { value: 'priority_changed', label: '우선순위 변경' },
  { value: 'task_created',     label: '태스크 생성' },
  { value: 'assigned',         label: '담당자 배정' },
]

const ACTIONS = [
  { value: 'change_status',   label: '상태 변경' },
  { value: 'change_priority', label: '우선순위 변경' },
  { value: 'assign_to',       label: '담당자 변경' },
  { value: 'notify_assignee', label: '담당자 알림' },
]

const STATUSES   = ['todo','in_progress','done','cancelled']
const PRIORITIES = ['urgent','high','medium','low']

const card = {
  background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
  padding: '16px 18px', marginBottom: 12,
}

function RuleCard({ rule, onToggle, onDelete }) {
  const triggerLabel = TRIGGERS.find(t => t.value === rule.trigger)?.label || rule.trigger
  const actionLabel  = ACTIONS.find(a => a.value === rule.action)?.label  || rule.action
  return (
    <div style={{ ...card, opacity: rule.is_active ? 1 : 0.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{rule.name}</span>
          <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 'var(--r-sm)' }}>
              When: {triggerLabel}
            </span>
            <span style={{ color: 'var(--accent)' }}>→</span>
            <span style={{ background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 'var(--r-sm)' }}>
              Then: {actionLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onToggle(rule)} style={{ padding: '4px 12px', borderRadius: 'var(--r-sm)', fontSize: 12, cursor: 'pointer', border: '1px solid var(--border)', background: rule.is_active ? 'var(--accent-muted)' : 'var(--bg-elevated)', color: rule.is_active ? 'var(--accent)' : 'var(--text-muted)' }}>
            {rule.is_active ? '활성' : '비활성'}
          </button>
          <button onClick={() => onDelete(rule.id)} style={{ padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: 12, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

function NewRuleForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', trigger: 'status_changed', action: 'change_status' })
  const [triggerFrom, setTriggerFrom] = useState('')
  const [triggerTo,   setTriggerTo]   = useState('')
  const [actionStatus,   setActionStatus]   = useState('done')
  const [actionPriority, setActionPriority] = useState('high')

  const handleSave = () => {
    if (!form.name.trim()) return
    const trigger_val: Record<string, string> = {}
    if (form.trigger === 'status_changed')   { if (triggerFrom) trigger_val.from = triggerFrom; if (triggerTo) trigger_val.to = triggerTo }
    if (form.trigger === 'priority_changed') { if (triggerFrom) trigger_val.from = triggerFrom; if (triggerTo) trigger_val.to = triggerTo }
    const action_val: Record<string, string> = {}
    if (form.action === 'change_status')   action_val.status   = actionStatus
    if (form.action === 'change_priority') action_val.priority = actionPriority
    onSave({ ...form, trigger_val, action_val })
  }

  const inp = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text)', padding: '6px 10px', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties

  return (
    <div style={{ ...card, borderColor: 'var(--border-focus)', marginBottom: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>새 자동화 규칙</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="규칙 이름" style={inp} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>When (트리거)</label>
            <select value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Then (액션)</label>
            <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
              {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>
        {(form.trigger === 'status_changed') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>From (선택)</label>
              <select value={triggerFrom} onChange={e => setTriggerFrom(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">모든 상태</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>To</label>
              <select value={triggerTo} onChange={e => setTriggerTo(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                <option value="">모든 상태</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
        {form.action === 'change_status' && (
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>변경할 상태</label>
            <select value={actionStatus} onChange={e => setActionStatus(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        {form.action === 'change_priority' && (
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>변경할 우선순위</label>
            <select value={actionPriority} onChange={e => setActionPriority(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '6px 14px', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)' }}>취소</button>
          <button onClick={handleSave} style={{ padding: '6px 16px', borderRadius: 'var(--r-sm)', fontSize: 13, cursor: 'pointer', border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 500 }}>저장</button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationPage() {
  const { slug, projectId } = useParams()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    getRules(slug, projectId)
      .then(setRules)
      .catch(() => toast('규칙 불러오기 실패', 'error'))
      .finally(() => setLoading(false))
  }, [slug, projectId])

  const handleCreate = async (data) => {
    try {
      const rule = await createRule(slug, projectId, data)
      setRules(prev => [...prev, rule])
      setShowForm(false)
      toast('규칙 생성됨', 'success')
    } catch { toast('생성 실패', 'error') }
  }

  const handleToggle = async (rule) => {
    try {
      const updated = await updateRule(slug, projectId, rule.id, { is_active: !rule.is_active })
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r))
    } catch { toast('업데이트 실패', 'error') }
  }

  const handleDelete = async (ruleId) => {
    try {
      await deleteRule(slug, projectId, ruleId)
      setRules(prev => prev.filter(r => r.id !== ruleId))
      toast('규칙 삭제됨', 'info')
    } catch { toast('삭제 실패', 'error') }
  }

  if (loading) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>불러오는 중…</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>⚡ 자동화</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>조건에 맞는 태스크에 자동으로 액션을 실행합니다</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
          + 새 규칙
        </button>
      </div>
      {showForm && <NewRuleForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}
      {rules.length === 0 && !showForm ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
          <div style={{ fontSize: 14 }}>자동화 규칙이 없습니다.</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>+ 새 규칙 버튼으로 시작해보세요.</div>
        </div>
      ) : (
        rules.map(rule => (
          <RuleCard key={rule.id} rule={rule} onToggle={handleToggle} onDelete={handleDelete} />
        ))
      )}
    </div>
  )
}
