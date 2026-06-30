import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Avatar from '../components/ui/Avatar'
import { PageLoader } from '../components/ui/Spinner'
import useAuthStore from '../store/authStore'
import useToastStore from '../store/toastStore'
import { getWorkspaceMembers, removeWorkspaceMember } from '../lib/workspaceApi'

const ROLE_META = {
  owner: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '오너' },
  admin: { bg: 'var(--accent-muted)', color: 'var(--accent)', label: '관리자' },
  member: { bg: 'rgba(100,116,139,0.15)', color: 'var(--text-secondary)', label: '멤버' },
}

export default function MembersPage() {
  const { slug } = useParams()
  const { user: me } = useAuthStore()
  const toast = useToastStore((s) => s.add)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getWorkspaceMembers(slug).then(setMembers).catch(() => toast('불러오기 실패', 'error')).finally(() => setLoading(false))
  }, [slug])

  const myRole = members.find((m) => m.user.id === me?.id)?.role
  const canManage = myRole === 'owner' || myRole === 'admin'

  const handleRemove = async (memberId, userId, username) => {
    if (!confirm(`"${username}" 멤버를 제거하시겠습니까?`)) return
    try {
      await removeWorkspaceMember(slug, userId)
      setMembers((prev) => prev.filter((m) => m.id !== memberId))
      toast(`${username} 제거됨`, 'success')
    } catch {
      toast('제거 실패', 'error')
    }
  }

  if (loading) return <div className="app-content"><PageLoader /></div>

  const presentUrl = `${window.location.origin}/present/${slug}`

  return (
    <div className="app-content">
      <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '24px', margin: '0 0 24px' }}>멤버</h1>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: '24px' }}>
        {members.map((m, i) => {
          const rm = ROLE_META[m.role] || ROLE_META.member
          return (
            <div
              key={m.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar user={m.user} size={36} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                    {m.user.display_name || m.user.username}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.user.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ padding: '2px 10px', borderRadius: 'var(--r-full)', fontSize: '11px', fontWeight: 500, background: rm.bg, color: rm.color }}>
                  {rm.label}
                </span>
                {canManage && m.role !== 'owner' && m.user.id !== me?.id && (
                  <button
                    onClick={() => handleRemove(m.id, m.user.id, m.user.username)}
                    style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '3px 10px', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '11px' }}
                  >
                    제거
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {members.length === 0 && <div style={{ padding: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>멤버가 없습니다.</div>}
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>멤버 초대</div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
          GitHub OAuth로 로그인하면 워크스페이스에 자동으로 참여됩니다.
        </p>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 500 }}>📅 공개 캘린더 URL (로그인 불필요)</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{ flex: 1, display: 'block', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '8px 12px', fontSize: '12px', color: 'var(--accent)', wordBreak: 'break-all' }}>
            {presentUrl}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(presentUrl); toast('URL 복사됨', 'success') }}
            style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}
          >
            복사
          </button>
        </div>
      </div>
    </div>
  )
}
