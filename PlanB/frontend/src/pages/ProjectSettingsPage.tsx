import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageLoader } from '../components/ui/Spinner'
import useToastStore from '../store/toastStore'
import { getProject, updateProject, deleteProject, getWorkspaceMembers } from '../lib/workspaceApi'
import Avatar from '../components/ui/Avatar'

const STATUS_OPTS = [
  { value: 'active',   label: '진행 중',  desc: '현재 활성화된 프로젝트' },
  { value: 'archived', label: '보관됨',   desc: '완료 또는 일시 중단된 프로젝트' },
]

const PUB_STATUS_OPTS = [
  { value: '',             label: '없음' },
  { value: 'writing',      label: '✍️ 작성 중' },
  { value: 'submitted',    label: '📤 제출됨' },
  { value: 'under_review', label: '🔍 심사 중' },
  { value: 'revision',     label: '🔄 수정 요청' },
  { value: 'accepted',     label: '✅ 승인됨' },
  { value: 'published',    label: '📰 게재됨' },
]

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '9px 12px',
  borderRadius: 'var(--r-md)', fontSize: '14px',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', outline: 'none',
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '24px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 18px', color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  )
}

export default function ProjectSettingsPage() {
  const { slug, projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToastStore(s => s.add)

  const [project, setProject]   = useState(null)
  const [members, setMembers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [form, setForm] = useState({ name: '', description: '', status: 'active', project_type: 'standard', publication_status: '', target_journal: '' })

  useEffect(() => {
    Promise.all([getProject(slug, projectId), getWorkspaceMembers(slug)])
      .then(([p, m]) => {
        setProject(p)
        setMembers(m)
        setForm({ name: p.name, description: p.description || '', status: p.status || 'active', project_type: p.project_type || 'standard', publication_status: p.publication_status || '', target_journal: p.target_journal || '' })
      })
      .catch(() => toast('불러오기 실패', 'error'))
      .finally(() => setLoading(false))
  }, [slug, projectId])

  const handleSave = async e => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const updated = await updateProject(slug, projectId, form)
      setProject(updated)
      toast('설정이 저장됐습니다', 'success')
    } catch { toast('저장 실패', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (deleteInput !== project.name) return
    try {
      await deleteProject(slug, projectId)
      toast('프로젝트가 삭제됐습니다', 'success')
      navigate(`/workspaces/${slug}`)
    } catch { toast('삭제 실패', 'error') }
  }

  const handleArchive = async () => {
    try {
      const updated = await updateProject(slug, projectId, { status: 'archived' })
      setProject(updated)
      setForm(f => ({ ...f, status: 'archived' }))
      toast('프로젝트가 보관됐습니다', 'success')
    } catch { toast('보관 실패', 'error') }
  }

  if (loading) return <div className="app-content"><PageLoader /></div>

  return (
    <div className="app-content" style={{ maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px' }}>
          ← 뒤로
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>프로젝트 설정</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{project?.name}</div>
        </div>
      </div>

      {/* General Settings */}
      <Section title="일반">
        <form onSubmit={handleSave}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>프로젝트 이름</label>
          <input
            style={{ ...inputStyle, marginBottom: '16px' }}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />

          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>설명 (선택)</label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', marginBottom: '20px' }}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="프로젝트 목적, 범위 등을 적어주세요"
          />

          <button
            type="submit"
            disabled={saving}
            style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>
      </Section>

      {/* Status */}
      <Section title="프로젝트 상태">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {STATUS_OPTS.map(opt => (
            <label
              key={opt.value}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${form.status === opt.value ? 'var(--border-focus)' : 'var(--border)'}`, background: form.status === opt.value ? 'var(--accent-muted)' : 'var(--bg-elevated)', cursor: 'pointer', transition: 'all var(--duration) var(--ease)' }}
            >
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={form.status === opt.value}
                onChange={() => setForm(f => ({ ...f, status: opt.value }))}
                style={{ accentColor: 'var(--accent)' }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: form.status === opt.value ? 'var(--accent)' : 'var(--text-primary)' }}>{opt.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <button
          onClick={handleSave}
          style={{ marginTop: '16px', padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
        >
          상태 저장
        </button>
      </Section>

      {/* Project Type */}
      <Section title="프로젝트 유형">
        <div style={{ display: 'flex', gap: '10px', marginBottom: form.project_type === 'research' ? 20 : 0 }}>
          {[['standard','📁 일반 프로젝트','업무, 개발, 기획 등 범용 프로젝트'],['research','🔬 연구 프로젝트','논문, 실험, 데이터 분석 전용 탭 활성화']].map(([v, label, desc]) => (
            <label key={v} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 14px', borderRadius: 'var(--r-md)', border: `1px solid ${form.project_type === v ? 'var(--border-focus)' : 'var(--border)'}`, background: form.project_type === v ? 'var(--accent-muted)' : 'var(--bg-elevated)', cursor: 'pointer', transition: 'all var(--duration) var(--ease)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="radio" name="project_type" value={v} checked={form.project_type === v} onChange={() => setForm(f => ({ ...f, project_type: v }))} style={{ accentColor: 'var(--accent)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: form.project_type === v ? 'var(--accent)' : 'var(--text-primary)' }}>{label}</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 22 }}>{desc}</span>
            </label>
          ))}
        </div>
        {form.project_type === 'research' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 2 }}>📄 논문 추적 정보</div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>논문 상태</label>
              <select style={inputStyle} value={form.publication_status} onChange={e => setForm(f => ({ ...f, publication_status: e.target.value }))}>
                {PUB_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>목표 저널</label>
              <input style={inputStyle} value={form.target_journal} onChange={e => setForm(f => ({ ...f, target_journal: e.target.value }))} placeholder="예: Nature, Science, NEJM..." />
            </div>
          </div>
        )}
        <button onClick={handleSave} style={{ marginTop: 16, padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>저장</button>
      </Section>

      {/* Members */}
      <Section title="멤버">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <Avatar user={m.user} size={28} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{m.user?.display_name || m.user?.username}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.user?.email}</div>
              </div>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--r-full)', background: m.role === 'manager' ? 'var(--accent-muted)' : 'var(--bg-elevated)', color: m.role === 'manager' ? 'var(--accent)' : 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 500 }}>
                {m.role === 'manager' ? '관리자' : '멤버'}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger Zone */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--danger)', borderRadius: 'var(--r-lg)', padding: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px', color: 'var(--danger)' }}>위험 구역</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 20px' }}>아래 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.</p>

        {/* Archive */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>프로젝트 보관</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>프로젝트를 숨기고 읽기 전용으로 만듭니다</div>
          </div>
          <button
            onClick={handleArchive}
            disabled={form.status === 'archived'}
            style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: form.status === 'archived' ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 500, opacity: form.status === 'archived' ? 0.5 : 1 }}
          >
            {form.status === 'archived' ? '이미 보관됨' : '보관하기'}
          </button>
        </div>

        {/* Delete */}
        <div style={{ paddingTop: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>프로젝트 삭제</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>모든 태스크, 댓글, 활동 로그가 영구 삭제됩니다</div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{ padding: '7px 14px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
            >
              프로젝트 삭제
            </button>
          ) : (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)', borderRadius: 'var(--r-md)', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                확인을 위해 프로젝트 이름 <strong style={{ color: 'var(--danger)' }}>{project?.name}</strong>을 입력하세요
              </div>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                placeholder={project?.name}
                style={{ ...inputStyle, marginBottom: '10px', borderColor: 'var(--danger)' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDelete}
                  disabled={deleteInput !== project?.name}
                  style={{ padding: '7px 16px', background: deleteInput === project?.name ? 'var(--danger)' : 'var(--bg-elevated)', color: deleteInput === project?.name ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 'var(--r-md)', cursor: deleteInput === project?.name ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: 600 }}
                >
                  영구 삭제
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteInput('') }}
                  style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '12px' }}
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
