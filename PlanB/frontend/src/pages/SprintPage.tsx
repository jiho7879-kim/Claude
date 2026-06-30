import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { PageLoader } from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import useToastStore from '../store/toastStore'
import { getSprints, createSprint, updateSprint, deleteSprint, getTasks, updateTask } from '../lib/workspaceApi'

const STATUS_META = {
  planned:   { bg: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary)', label: '계획됨' },
  active:    { bg: 'var(--accent-muted)',    color: 'var(--accent)',          label: '진행 중 ●' },
  completed: { bg: 'rgba(16,185,129,0.15)', color: 'var(--success)',         label: '완료됨' },
}
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 'var(--r-md)', fontSize: '13px', marginBottom: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as React.CSSProperties
const labelStyle = { display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '5px', fontWeight: 500 }

function SprintModal({ sprint, onClose, onSave }) {
  const [form, setForm] = useState(sprint || { name: '', start_date: '', end_date: '', goal: '', status: 'planned' })
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', width: 440, boxShadow: 'var(--shadow-lg)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>{sprint ? '스프린트 수정' : '새 스프린트'}</h2>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }}>
          <label style={labelStyle}>이름</label>
          <input style={inputStyle} value={form.name} required onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sprint 1" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={labelStyle}>시작일</label><input type="date" style={inputStyle} value={form.start_date} required onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            <div><label style={labelStyle}>종료일</label><input type="date" style={inputStyle} value={form.end_date} required onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          </div>
          <label style={labelStyle}>목표 (선택)</label>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} rows={2} placeholder="이 스프린트에서 달성할 목표" />
          <label style={labelStyle}>상태</label>
          <select style={inputStyle} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="planned">계획됨</option>
            <option value="active">진행 중</option>
            <option value="completed">완료됨</option>
          </select>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px' }}>취소</button>
            <button type="submit" style={{ padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>저장</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BurndownChart({ sprint, tasks }) {
  if (!sprint || tasks.length === 0) return null
  const start = new Date(sprint.start_date)
  const end   = new Date(sprint.end_date)
  const days  = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1)
  const ideal = Array.from({ length: days }, (_, i) => ({
    day: `D+${i}`,
    ideal: Math.round(tasks.length * (1 - i / (days - 1))),
  }))
  const doneByDay = ideal.map(({ day, ideal }) => ({ day, ideal, actual: null }))
  const doneCount = tasks.filter(t => t.status === 'done').length
  if (doneByDay.length > 0) doneByDay[doneByDay.length - 1].actual = tasks.length - doneCount
  return (
    <div style={{ marginTop: '16px', height: 160 }}>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>번다운 차트</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={doneByDay} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', fontSize: '12px' }} />
          <Line type="monotone" dataKey="ideal"  stroke="var(--border)"  strokeDasharray="4 2" dot={false} name="이상" />
          <Line type="monotone" dataKey="actual" stroke="var(--accent)"  strokeWidth={2}       dot={{ fill: 'var(--accent)', r: 3 }} name="실제 잔여" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function SprintPage() {
  const { slug, projectId } = useParams()
  const toast = useToastStore(s => s.add)
  const [sprints, setSprints]   = useState([])
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'create' | sprint-obj
  const [openId, setOpenId]     = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([getSprints(slug, projectId), getTasks(slug, projectId, { tree: false })])
      .then(([s, t]) => { setSprints(s); setTasks(t) })
      .catch(() => toast('불러오기 실패', 'error'))
      .finally(() => setLoading(false))
  }, [slug, projectId])

  const handleSave = async form => {
    try {
      if (modal && typeof modal === 'object') {
        const updated = await updateSprint(slug, projectId, modal.id, form)
        setSprints(s => s.map(x => x.id === updated.id ? updated : x))
        toast('스프린트 수정됨', 'success')
      } else {
        const created = await createSprint(slug, projectId, form)
        setSprints(s => [...s, created])
        toast('스프린트 생성됨', 'success')
      }
      setModal(null)
    } catch { toast('저장 실패', 'error') }
  }

  const handleDelete = async id => {
    if (!confirm('스프린트를 삭제하시겠습니까? 태스크는 삭제되지 않습니다.')) return
    try {
      await deleteSprint(slug, projectId, id)
      setSprints(s => s.filter(x => x.id !== id))
      toast('삭제됨', 'success')
    } catch { toast('삭제 실패', 'error') }
  }

  const handleAssignTask = async (taskId, sprintId) => {
    try {
      const updated = await updateTask(slug, projectId, taskId, { sprint_id: sprintId || null })
      setTasks(t => t.map(x => x.id === updated.id ? updated : x))
    } catch { toast('배정 실패', 'error') }
  }

  if (loading) return <div className="app-content"><PageLoader /></div>

  return (
    <div className="app-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>스프린트</h1>
        <button onClick={() => setModal('create')} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          + 새 스프린트
        </button>
      </div>

      {sprints.length === 0 ? (
        <EmptyState icon="🔄" title="스프린트가 없습니다" description="스프린트를 만들어 태스크를 시간 단위로 관리하세요." action="+ 새 스프린트" onAction={() => setModal('create')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sprints.map(sprint => {
            const sm = STATUS_META[sprint.status] || STATUS_META.planned
            const sprintTasks = tasks.filter(t => t.sprint === sprint.id)
            const doneCount = sprintTasks.filter(t => t.status === 'done').length
            const pct = sprintTasks.length > 0 ? Math.round(doneCount / sprintTasks.length * 100) : 0
            const isOpen = openId === sprint.id
            const today = new Date()
            const end   = new Date(sprint.end_date)
            const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000)
            return (
              <div key={sprint.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                {/* Sprint header */}
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setOpenId(isOpen ? null : sprint.id)}>
                  <span style={{ fontSize: '12px' }}>{isOpen ? '▼' : '▶'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{sprint.name}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 500, background: sm.bg, color: sm.color }}>{sm.label}</span>
                      {sprint.status === 'active' && daysLeft >= 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>D-{daysLeft}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {sprint.start_date} ~ {sprint.end_date}
                      {sprint.goal && <span style={{ marginLeft: '12px', fontStyle: 'italic' }}>"{sprint.goal}"</span>}
                    </div>
                  </div>
                  {/* Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 160 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--success)', borderRadius: 'var(--r-full)', transition: 'width 0.4s var(--ease)' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{doneCount}/{sprintTasks.length} ({pct}%)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setModal(sprint)} style={{ padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '11px' }}>수정</button>
                    <button onClick={() => handleDelete(sprint.id)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '11px' }}>삭제</button>
                  </div>
                </div>

                {/* Sprint tasks */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px' }}>
                    <BurndownChart sprint={sprint} tasks={sprintTasks} />
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        배정된 태스크 ({sprintTasks.length})
                      </div>
                      {sprintTasks.length === 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '8px 0' }}>아직 배정된 태스크가 없습니다.</div>}
                      {sprintTasks.map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '11px', color: t.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>{t.status === 'done' ? '✓' : '○'}</span>
                          <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                          <button onClick={() => handleAssignTask(t.id, null)} style={{ fontSize: '11px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>제거</button>
                        </div>
                      ))}

                      {/* Unassigned tasks */}
                      {tasks.filter(t => !t.sprint).length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>미배정 태스크 → 이 스프린트에 추가:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {tasks.filter(t => !t.sprint).map(t => (
                              <button key={t.id} onClick={() => handleAssignTask(t.id, sprint.id)} style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid var(--border-focus)', borderRadius: 'var(--r-full)', padding: '3px 10px', cursor: 'pointer' }}>
                                + {t.title.slice(0, 30)}{t.title.length > 30 ? '…' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && <SprintModal sprint={typeof modal === 'object' ? modal : null} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  )
}
