import { useEffect, useState } from 'react'
import { getTemplates, createProjectFromTemplate } from '../lib/workspaceApi'
import useToastStore from '../store/toastStore'

const CATEGORY_LABEL = {
  development: '개발',
  marketing: '마케팅',
  research: '연구',
  product: '제품',
  general: '일반',
}

export default function TemplateGallery({ slug, onCreated, onClose }) {
  const [templates, setTemplates] = useState([])
  const [selected, setSelected]   = useState(null)
  const [name, setName]           = useState('')
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    getTemplates(slug)
      .then(setTemplates)
      .catch(() => toast('템플릿 불러오기 실패', 'error'))
      .finally(() => setLoading(false))
  }, [slug])

  const handleSelect = (tpl) => {
    setSelected(tpl)
    setName(tpl.name)
  }

  const handleApply = async () => {
    if (!selected || !name.trim()) return
    setCreating(true)
    try {
      const project = await createProjectFromTemplate(slug, selected.id, { name: name.trim() })
      toast(`"${project.name}" 프로젝트 생성됨`, 'success')
      onCreated(project)
    } catch {
      toast('프로젝트 생성 실패', 'error')
    } finally {
      setCreating(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
    borderRadius: 'var(--r-md)', fontSize: '13px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none',
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '28px', width: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>템플릿으로 시작</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>불러오는 중…</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {templates.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  style={{
                    textAlign: 'left', padding: '14px 16px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                    border: `1px solid ${selected?.id === tpl.id ? 'var(--border-focus)' : 'var(--border)'}`,
                    background: selected?.id === tpl.id ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{tpl.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{tpl.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, lineHeight: 1.4 }}>{tpl.description}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 'var(--r-full)', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                      {CATEGORY_LABEL[tpl.category] || tpl.category}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tpl.tasks.length}개 태스크</span>
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>
                  프로젝트 이름
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="프로젝트 이름 입력"
                  style={inp}
                  autoFocus
                />
              </div>
            )}

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={onClose} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 13 }}>취소</button>
              <button
                onClick={handleApply}
                disabled={!selected || !name.trim() || creating}
                style={{ padding: '7px 16px', background: selected ? 'var(--accent)' : 'var(--bg-elevated)', color: selected ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 'var(--r-md)', cursor: selected ? 'pointer' : 'default', fontSize: 13, fontWeight: 500, opacity: creating ? 0.7 : 1 }}
              >
                {creating ? '생성 중…' : '프로젝트 만들기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
