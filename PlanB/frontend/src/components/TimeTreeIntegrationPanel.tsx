import { useEffect, useState } from 'react'
import useToastStore from '../store/toastStore'
import {
  getTimeTreeIntegrations,
  createTimeTreeIntegration,
  updateTimeTreeIntegration,
  deleteTimeTreeIntegration,
  syncTimeTreeIntegration,
} from '../lib/workspaceApi'
import { PageLoader } from './ui/Spinner'

const inp = { width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:'var(--r-md)', fontSize:13, background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-primary)', outline:'none' } as React.CSSProperties
const lbl = { display:'block', fontSize:12, color:'var(--text-muted)', marginBottom:6, fontWeight:500 }
const card = { background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'12px', display:'flex', flexDirection:'column', gap:8 }

function fmtDate(d) {
  if (!d) return '없음'
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
}

export default function TimeTreeIntegrationPanel({ slug, onClose }) {
  const toast = useToastStore(s => s.add)
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ label:'TimeTree', timetree_email:'', password:'', calendar_code:'' })

  const load = async () => {
    try {
      const data = await getTimeTreeIntegrations(slug)
      setIntegrations(data)
    } catch { toast('불러오기 실패', 'error') }
    setLoading(false)
  }

  useEffect(() => { load() }, [slug])

  const openNew = () => {
    setEditing(null)
    setForm({ label:'TimeTree', timetree_email:'', password:'', calendar_code:'' })
    setShowForm(true)
  }

  const openEdit = (i) => {
    setEditing(i.id)
    setForm({ label:i.label, timetree_email:i.timetree_email, password:'', calendar_code:i.calendar_code })
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const data = { label:form.label, timetree_email:form.timetree_email, calendar_code:form.calendar_code }
        if (form.password) data.password = form.password
        await updateTimeTreeIntegration(slug, editing, data)
        toast('수정됨','success')
      } else {
        await createTimeTreeIntegration(slug, {
          label:form.label, timetree_email:form.timetree_email,
          password:form.password, calendar_code:form.calendar_code,
        })
        toast('추가됨','success')
      }
      setShowForm(false)
      load()
    } catch { toast('저장 실패','error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까?')) return
    try {
      await deleteTimeTreeIntegration(slug, id)
      setIntegrations(prev => prev.filter(i => i.id !== id))
      toast('삭제됨','success')
    } catch { toast('삭제 실패','error') }
  }

  const handleSync = async (id) => {
    setSyncing(id)
    try {
      const result = await syncTimeTreeIntegration(slug, id)
      if (result.status === 'ok') toast('동기화 완료','success')
      else toast(`동기화 실패: ${result.detail}`,'error')
      load()
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || '알 수 없는 오류'
      toast(`동기화 요청 실패: ${detail}`, 'error')
    }
    setSyncing(null)
  }

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(420px, 100vw)', zIndex:201, background:'var(--bg-surface)', borderLeft:'1px solid var(--border)', boxShadow:'var(--shadow-lg)', padding:'24px', display:'flex', flexDirection:'column', gap:16, animation:'slideInRight 0.2s ease', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:16, fontWeight:700, margin:0 }}>TimeTree 연동</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>

        {loading ? <PageLoader /> : (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {integrations.length === 0 && (
                <div style={{ fontSize:13, color:'var(--text-muted)', padding:'12px 0' }}>등록된 연동이 없습니다.</div>
              )}
              {integrations.map(i => (
                <div key={i.id} style={card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                        {i.label}
                        {i.is_active && <span style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{i.timetree_email}</div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => handleSync(i.id)} disabled={syncing === i.id}
                        style={{ padding:'5px 10px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:11, fontWeight:500, opacity: syncing===i.id ? 0.6 : 1 }}>
                        {syncing === i.id ? '동기화 중…' : i.last_status === 'error' ? '재시도' : '동기화'}
                      </button>
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', fontSize:11, color:'var(--text-muted)' }}>
                    <span>캘린더 코드: {i.calendar_code}</span>
                    <span>마지막 동기화: {fmtDate(i.last_synced_at)}</span>
                    <span>동기화된 이벤트: {i.events_synced ?? 0}개</span>
                    <span style={{ color: i.last_status === 'error' ? '#ef4444' : 'inherit' }}>
                      상태: {i.last_status === 'success' ? '✓ 성공' : i.last_status === 'error' ? `✗ ${i.last_error || '오류'}` : '—'}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                    <button onClick={() => openEdit(i)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:11, color:'var(--text-secondary)' }}>편집</button>
                    <button onClick={() => handleDelete(i.id)} style={{ padding:'4px 10px', background:'transparent', border:'1px solid var(--danger)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:11, color:'var(--danger)' }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>

            {!showForm && (
              <button onClick={openNew} style={{ padding:'8px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:13, fontWeight:500 }}>
                + 연동 추가
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSave} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{editing ? '연동 수정' : '새 연동'}</div>
                <div>
                  <label style={lbl}>이름</label>
                  <input style={inp} value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="내 TimeTree" />
                </div>
                <div>
                  <label style={lbl}>TimeTree 이메일</label>
                  <input style={inp} type="email" required value={form.timetree_email} onChange={e=>setForm(f=>({...f,timetree_email:e.target.value}))} placeholder="you@example.com" />
                </div>
                <div>
                  <label style={lbl}>{editing ? '새 비밀번호 (비워두면 유지)' : 'TimeTree 비밀번호'}</label>
                  <input style={inp} type="password" required={!editing} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••" />
                </div>
                <div>
                  <label style={lbl}>캘린더 코드</label>
                  <input style={inp} required value={form.calendar_code} onChange={e=>setForm(f=>({...f,calendar_code:e.target.value}))} placeholder="예: AbCdEfG" />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button type="submit" style={{ flex:1, padding:'8px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                    {editing ? '저장' : '추가'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ flex:1, padding:'8px', background:'transparent', border:'1px solid var(--border)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
                    취소
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </>
  )
}
