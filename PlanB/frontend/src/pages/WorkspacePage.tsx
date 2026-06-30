import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import TemplateGallery from '../components/TemplateGallery'
import EmptyState from '../components/ui/EmptyState'
import { PageLoader } from '../components/ui/Spinner'
import useToastStore from '../store/toastStore'
import { getProjects, createProject, updateProject, getTasks, getWorkspaceMembers } from '../lib/workspaceApi'
import useProjectStore from '../store/projectStore'

const PROJECT_PALETTE = [
  '#6366f1','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16',
]
const projectColor = (project, index) => project.color || PROJECT_PALETTE[index % PROJECT_PALETTE.length]

const STATUS_META = {
  planning: { bg:'rgba(100,116,139,0.15)', color:'var(--text-muted)',    label:'계획 중' },
  active:   { bg:'var(--accent-muted)',    color:'var(--accent)',         label:'진행 중 ●' },
  archived: { bg:'rgba(15,23,42,0.4)',     color:'var(--text-secondary)', label:'보관됨' },
}

const PUB_BADGE = {
  writing:      { bg:'rgba(99,102,241,0.15)',  color:'#6366f1', label:'✍️ 작성 중' },
  submitted:    { bg:'rgba(245,158,11,0.15)',  color:'#f59e0b', label:'📤 제출됨' },
  under_review: { bg:'rgba(139,92,246,0.15)',  color:'#8b5cf6', label:'🔍 심사 중' },
  revision:     { bg:'rgba(239,68,68,0.15)',   color:'#ef4444', label:'🔄 수정 요청' },
  accepted:     { bg:'rgba(16,185,129,0.15)',  color:'#10b981', label:'✅ 승인됨' },
  published:    { bg:'rgba(20,184,166,0.15)',  color:'#14b8a6', label:'📰 게재됨' },
}
const PIE_COLORS = ['#64748b','#6366f1','#10b981','#ef4444']
const STATUS_ORDER = ['todo','in_progress','done','cancelled']
const STATUS_LABEL = { todo:'Todo', in_progress:'진행 중', done:'완료', cancelled:'취소' }

function StatCard({ title, value, sub = '', accent = '' }) {
  return (
    <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'16px 20px', display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ fontSize:'12px', color:'var(--text-muted)', fontWeight:500 }}>{title}</div>
      <div style={{ fontSize:'26px', fontWeight:700, color: accent || 'var(--text-primary)', lineHeight:1.2 }}>{value}</div>
      {sub && <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function ColorPicker({ color, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position:'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ width:22, height:22, borderRadius:'50%', background:color, border:'2px solid var(--bg-surface)', cursor:'pointer', boxShadow:'0 0 0 1px var(--border)', flexShrink:0 }}
        title="색상 변경"
      />
      {open && (
        <>
          <div onClick={e => { e.stopPropagation(); setOpen(false) }} style={{ position:'fixed', inset:0, zIndex:10 }} />
          <div onClick={e => e.stopPropagation()} style={{ position:'absolute', top:28, left:0, zIndex:11, background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:8, display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:4, boxShadow:'var(--shadow-md)' }}>
            {PROJECT_PALETTE.map(c => (
              <button key={c} onClick={() => { onChange(c); setOpen(false) }} style={{ width:20, height:20, borderRadius:'50%', background:c, border: c===color ? '2px solid var(--text-primary)' : '2px solid transparent', cursor:'pointer' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ProjectCard({ project, taskStats, index, onClick, onColorChange }) {
  const sm      = STATUS_META[project.status] || STATUS_META.planning
  const color   = projectColor(project, index)
  const total   = taskStats?.total || 0
  const done    = taskStats?.done  || 0
  const pct     = total > 0 ? Math.round(done/total*100) : 0
  const isResearch = project.project_type === 'research'
  const pubBadge   = isResearch && project.publication_status ? PUB_BADGE[project.publication_status] : null
  return (
    <div onClick={onClick} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'20px', cursor:'pointer', transition:'transform 0.18s var(--ease), border-color 0.18s var(--ease), box-shadow 0.18s var(--ease)', borderTop:`3px solid ${color}` }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor=color; e.currentTarget.style.boxShadow='var(--shadow-md)' }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.borderTopColor=color; e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.borderTopColor=color; e.currentTarget.style.boxShadow='' }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:36, height:36, borderRadius:'var(--r-md)', background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px' }}>{isResearch ? '🔬' : '📁'}</div>
          <ColorPicker color={color} onChange={c => onColorChange(project.id, c)} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
          <span style={{ padding:'2px 8px', borderRadius:'var(--r-full)', fontSize:'11px', fontWeight:500, background:sm.bg, color:sm.color }}>{sm.label}</span>
          {pubBadge && <span style={{ padding:'2px 8px', borderRadius:'var(--r-full)', fontSize:'10px', fontWeight:600, background:pubBadge.bg, color:pubBadge.color }}>{pubBadge.label}</span>}
        </div>
      </div>
      <h3 style={{ fontSize:'15px', fontWeight:600, margin:'0 0 4px', color:'var(--text-primary)' }}>{project.name}</h3>
      {isResearch && project.target_journal && <div style={{ fontSize:'11px', color:'var(--text-muted)', marginBottom:4 }}>📰 {project.target_journal}</div>}
      {project.description && <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:'0 0 12px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{project.description}</p>}
      {total > 0 && (
        <div style={{ marginTop:8 }}>
          <div style={{ height:3, background:'var(--border)', borderRadius:'var(--r-full)', overflow:'hidden', marginBottom:4 }}>
            <div style={{ height:'100%', width:`${pct}%`, background:'var(--success)', borderRadius:'var(--r-full)', transition:'width 0.4s var(--ease)' }}/>
          </div>
          <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{done}/{total} 완료 ({pct}%)</div>
        </div>
      )}
    </div>
  )
}

function CreateModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:'', description:'', status:'active', color:'', project_type:'standard' })
  const sel = { width:'100%', padding:'8px 12px', borderRadius:'var(--r-md)', fontSize:'13px', background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-primary)', cursor:'pointer' }
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'var(--bg-overlay)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'24px', width:'min(420px, calc(100vw - 32px))', boxSizing:'border-box', boxShadow:'var(--shadow-lg)' }}>
        <h2 style={{ fontSize:'16px', fontWeight:600, marginBottom:20 }}>새 프로젝트</h2>
        <form onSubmit={e=>{e.preventDefault();onSave(form)}}>
          {[['name','이름','Project Alpha'],['description','설명 (선택)','이 프로젝트에 대한 설명']].map(([key,label,ph])=>(
            <div key={key} style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:500, marginBottom:5 }}>{label}</label>
              <input required={key==='name'} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                style={{ width:'100%', boxSizing:'border-box', padding:'8px 12px', borderRadius:'var(--r-md)', fontSize:'13px', background:'var(--bg-elevated)', border:'1px solid var(--border)', color:'var(--text-primary)' }}/>
            </div>
          ))}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:500, marginBottom:5 }}>유형</label>
            <div style={{ display:'flex', gap:8 }}>
              {[['standard','📁 일반'],['research','🔬 연구']].map(([v,l])=>(
                <label key={v} style={{ flex:1, display:'flex', alignItems:'center', gap:6, padding:'8px 12px', borderRadius:'var(--r-md)', border:`1px solid ${form.project_type===v?'var(--border-focus)':'var(--border)'}`, background:form.project_type===v?'var(--accent-muted)':'var(--bg-elevated)', cursor:'pointer', fontSize:12, fontWeight:500, color:form.project_type===v?'var(--accent)':'var(--text-secondary)' }}>
                  <input type="radio" name="project_type" value={v} checked={form.project_type===v} onChange={()=>setForm(f=>({...f,project_type:v}))} style={{ accentColor:'var(--accent)' }} />{l}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:500, marginBottom:5 }}>색상</label>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ColorPicker color={form.color || PROJECT_PALETTE[0]} onChange={c=>setForm(f=>({...f,color:c}))} />
              <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{form.color || '자동 선택'}</span>
            </div>
          </div>
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', fontWeight:500, marginBottom:5 }}>상태</label>
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={sel}>
              <option value="active">진행 중</option><option value="archived">보관됨</option>
            </select>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
            <button type="button" onClick={onClose} style={{ padding:'7px 14px', background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px' }}>취소</button>
            <button type="submit" style={{ padding:'7px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>만들기</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WorkspacePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore(s=>s.add)
  const { addProject } = useProjectStore()
  const [projects, setProjects]     = useState([])
  const [taskStats, setTaskStats]   = useState<Record<string, { total: number; done: number; byStatus: Record<string, number> }>>({})
  const [allTasksFlat, setAllTasksFlat] = useState([])
  const [members, setMembers]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [activeFilter, setFilter]   = useState('all')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getProjects(slug),
      getWorkspaceMembers(slug).catch(() => []),
    ]).then(async ([projs, mems]) => {
      setProjects(projs)
      setMembers(mems)
      const stats = {}
      const flat = []
      await Promise.all(projs.map(async p => {
        try {
          const tasks = await getTasks(slug, p.id, { tree:false })
          const byStatus: Record<string, number> = {}
          STATUS_ORDER.forEach(s => { byStatus[s] = tasks.filter(t=>t.status===s).length })
          stats[p.id] = { total: tasks.length, done: byStatus.done, byStatus }
          tasks.forEach(t => flat.push({ ...t, projectId: p.id }))
        } catch { stats[p.id] = { total:0, done:0, byStatus:{} } }
      }))
      setTaskStats(stats)
      setAllTasksFlat(flat)
    }).catch(()=>toast('불러오기 실패','error')).finally(()=>setLoading(false))
  }, [slug])

  const handleCreate = async data => {
    try {
      const autoColor = PROJECT_PALETTE[projects.length % PROJECT_PALETTE.length]
      const p = await createProject(slug, { ...data, color: data.color || autoColor })
      setProjects(prev=>[...prev, p])
      addProject(p)
      setShowModal(false); toast('프로젝트 생성됨','success')
    } catch { toast('생성 실패','error') }
  }

  const handleCreatedFromTemplate = (project) => {
    setProjects(prev => [...prev, project])
    addProject(project)
    setShowTemplates(false)
  }

  const handleColorChange = async (projectId, color) => {
    try {
      const updated = await updateProject(slug, projectId, { color })
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, color } : p))
    } catch { toast('색상 저장 실패','error') }
  }

  const filtered = activeFilter==='all' ? projects
    : activeFilter==='research' ? projects.filter(p=>p.project_type==='research')
    : projects.filter(p=>p.status===activeFilter)

  // Aggregate stats
  const totalTasks  = Object.values(taskStats).reduce((a,s)=>a+s.total,0)
  const totalDone   = Object.values(taskStats).reduce((a,s)=>a+s.done,0)
  const activeProjs = projects.filter(p=>p.status==='active').length
  const pieData     = STATUS_ORDER.map(s=>({ name:STATUS_LABEL[s], value: Object.values(taskStats).reduce((a,st)=>a+(st.byStatus?.[s]||0),0) })).filter(d=>d.value>0)

  if (loading) return <div className="app-content"><PageLoader /></div>

  return (
    <div className="app-content">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h1 style={{ fontSize:'22px', fontWeight:700, margin:0 }}>프로젝트</h1>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setShowTemplates(true)} style={{ padding:'8px 14px', background:'var(--bg-elevated)', color:'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>📋 템플릿</button>
          <button onClick={()=>setShowModal(true)} style={{ padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'var(--r-md)', cursor:'pointer', fontSize:'13px', fontWeight:500 }}>+ 새 프로젝트</button>
        </div>
      </div>

      {/* Dashboard stats */}
      {projects.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          <StatCard title="전체 프로젝트" value={projects.length} sub={`활성 ${activeProjs}개`} />
          <StatCard title="전체 태스크" value={totalTasks} sub={`완료 ${totalDone}개`} />
          <StatCard title="완료율" value={totalTasks>0?`${Math.round(totalDone/totalTasks*100)}%`:'—'} accent="var(--success)" />
          <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'8px 12px 4px' }}>
            <div style={{ fontSize:'12px', color:'var(--text-muted)', fontWeight:500, marginBottom:2 }}>태스크 분포</div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={70}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={18} outerRadius={30} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', fontSize:'11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{ height:70, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'var(--text-muted)' }}>태스크 없음</div>}
          </div>
        </div>
      )}

      {/* Project health bars */}
      {projects.filter(p=>p.status==='active').length > 0 && (
        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'16px 20px', marginBottom:16 }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text-primary)', marginBottom:12 }}>프로젝트 건강도</div>
          {projects.filter(p=>p.status==='active').map((p, i) => {
            const st = taskStats[p.id] || { total:0, done:0 }
            const pct = st.total > 0 ? Math.round(st.done / st.total * 100) : 0
            const color = projectColor(p, i)
            const overdue = allTasksFlat.filter(t => t.projectId === p.id && t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'cancelled').length
            return (
              <div key={p.id} style={{ marginBottom:10 }} onClick={() => navigate(`/workspaces/${slug}/projects/${p.id}`)} >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4, cursor:'pointer' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
                    <span style={{ fontSize:'13px', color:'var(--text-primary)' }}>{p.name}</span>
                    {overdue > 0 && <span style={{ fontSize:'10px', background:'rgba(239,68,68,0.15)', color:'#ef4444', borderRadius:'var(--r-full)', padding:'1px 6px', fontWeight:600 }}>지연 {overdue}</span>}
                  </div>
                  <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{pct}%</span>
                </div>
                <div style={{ height:5, background:'var(--border)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'var(--r-full)', transition:'width 0.4s var(--ease)', opacity:0.85 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Team workload */}
      {members.length > 0 && allTasksFlat.length > 0 && (
        <div style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'16px 20px', marginBottom:16 }}>
          <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text-primary)', marginBottom:12 }}>팀 워크로드</div>
          {(() => {
            const maxCount = 8
            const memberCounts = members
              .map(m => {
                const u = m.user || m
                const count = allTasksFlat.filter(t => {
                  const aid = t.assignee?.id ?? t.assignee
                  return aid === u.id && t.status !== 'done' && t.status !== 'cancelled'
                }).length
                return { user: u, count }
              })
              .filter(m => m.count > 0)
              .sort((a, b) => b.count - a.count)
            if (memberCounts.length === 0) return <div style={{ fontSize:'13px', color:'var(--text-muted)' }}>태스크가 할당된 멤버가 없습니다</div>
            const max = Math.max(...memberCounts.map(m => m.count), 1)
            return memberCounts.map(({ user: u, count }) => (
              <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent-muted)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:600, color:'var(--accent)', flexShrink:0 }}>
                  {(u.username || u.email || '?')[0].toUpperCase()}
                </div>
                <span style={{ fontSize:'12px', color:'var(--text-secondary)', width:72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.username || u.email}</span>
                <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:'var(--r-full)', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(count/max)*100}%`, background: count > maxCount ? '#ef4444' : 'var(--accent)', borderRadius:'var(--r-full)', transition:'width 0.4s' }} />
                </div>
                <span style={{ fontSize:'12px', color: count > maxCount ? '#ef4444' : 'var(--text-muted)', fontWeight: count > maxCount ? 600 : 400, width:28, textAlign:'right' }}>{count}</span>
              </div>
            ))
          })()}
        </div>
      )}

      {/* Filter chips */}
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['all','전체'],['active','진행 중'],['research','🔬 연구'],['archived','보관됨']].map(([v,l])=>(
          <span key={v} onClick={()=>setFilter(v)} style={{ padding:'4px 12px', borderRadius:'var(--r-full)', fontSize:'12px', fontWeight:500, cursor:'pointer', border:'1px solid', background:activeFilter===v?'var(--accent-muted)':'var(--bg-elevated)', borderColor:activeFilter===v?'var(--border-focus)':'var(--border)', color:activeFilter===v?'var(--accent)':'var(--text-muted)', transition:'all var(--duration) var(--ease)' }}>
            {l}
          </span>
        ))}
      </div>

      {/* Project grid */}
      {filtered.length===0 ? (
        <EmptyState icon="📁" title="프로젝트가 없습니다" description="새 프로젝트를 만들어 팀과 함께 시작하세요." action="+ 새 프로젝트" onAction={()=>setShowModal(true)}/>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16 }}>
          {filtered.map((p, i)=><ProjectCard key={p.id} index={i} project={p} taskStats={taskStats[p.id]} onClick={()=>navigate(`/workspaces/${slug}/projects/${p.id}`)} onColorChange={handleColorChange}/>)}
        </div>
      )}

      {showModal && <CreateModal onClose={()=>setShowModal(false)} onSave={handleCreate}/>}
      {showTemplates && <TemplateGallery slug={slug} onCreated={handleCreatedFromTemplate} onClose={()=>setShowTemplates(false)} />}
    </div>
  )
}
