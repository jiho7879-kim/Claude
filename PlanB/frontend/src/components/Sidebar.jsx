import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { useCommandPaletteStore } from '../hooks/useCommandPalette'
import useAuthStore from '../store/authStore'
import Avatar from './ui/Avatar'

const navBase = (isActive) => ({
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '6px 10px', borderRadius: 'var(--r-md)', fontSize: '13px', fontWeight: 500,
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  background: isActive ? 'var(--bg-elevated)' : 'transparent',
  textDecoration: 'none', cursor: 'pointer', border: 'none', fontFamily: 'inherit',
  transition: 'background var(--duration) var(--ease), color var(--duration) var(--ease)',
  width: '100%', textAlign: 'left', boxSizing: 'border-box',
})

function NavItem({ to, icon, label, end, collapsed }) {
  return (
    <NavLink to={to} end={end} title={collapsed ? label : undefined}
      style={({ isActive }) => ({ ...navBase(isActive), justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '8px' : '6px 10px' })}
      onMouseEnter={e => { if (!e.currentTarget.style.background.includes('elevated')) e.currentTarget.style.background = 'var(--bg-elevated)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ fontSize: '14px', width: 18, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      {!collapsed && label}
    </NavLink>
  )
}

export default function Sidebar({ projects = [], collapsed, onToggle }) {
  const { slug, projectId } = useParams()
  const { user, logout } = useAuthStore()
  const { show } = useCommandPaletteStore()
  const navigate = useNavigate()

  return (
    <div className="app-sidebar" style={{ width: collapsed ? 56 : 240, transition: 'width 0.2s var(--ease)', overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '12px 6px' : '14px 12px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <button onClick={() => navigate('/')} title="홈" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
          <div style={{ width: 28, height: 28, borderRadius: 'var(--r-sm)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#fff', fontWeight: 700, flexShrink: 0 }}>P</div>
          {!collapsed && <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>PlanB</span>}
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={show} style={{ ...navBase(false), color: 'var(--text-muted)', width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px' }}>🔍</span>
              검색 / 이동
            </span>
            <kbd style={{ fontSize: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px', color: 'var(--text-muted)' }}>⌘K</kbd>
          </button>
        </div>
      )}
      {collapsed && (
        <div style={{ padding: '4px', borderBottom: '1px solid var(--border)' }}>
          <button onClick={show} title="검색" style={{ ...navBase(false), width: '100%', justifyContent: 'center', padding: '8px' }}>🔍</button>
        </div>
      )}

      {/* Nav */}
      <div style={{ flex: 1, padding: collapsed ? '8px 4px' : '8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', overflowX: 'hidden' }}>
        {slug ? (
          <>
            <NavItem to={`/workspaces/${slug}/home`} icon="🏠" label="홈" collapsed={collapsed} />
            <NavItem to={`/workspaces/${slug}`} icon="⊞" label="프로젝트" end collapsed={collapsed} />
            <NavItem to={`/workspaces/${slug}/calendar`} icon="📅" label="캘린더" collapsed={collapsed} />
            <NavItem to={`/workspaces/${slug}/planner`} icon="📓" label="플래너" collapsed={collapsed} />
            {!collapsed && (
              <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <NavLink to={`/workspaces/${slug}/planner`} end style={({ isActive }) => ({ ...navBase(isActive), fontSize: 12, padding: '4px 8px' })}>일간</NavLink>
                <NavLink to={`/workspaces/${slug}/planner/week`} style={({ isActive }) => ({ ...navBase(isActive), fontSize: 12, padding: '4px 8px' })}>주간</NavLink>
              </div>
            )}
            <NavItem to={`/workspaces/${slug}/members`} icon="👥" label="멤버" collapsed={collapsed} />

            {!collapsed && projects.length > 0 && (
              <>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '12px 10px 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  프로젝트
                </div>
                {projects.map(p => (
                  <div key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <NavLink
                        to={`/workspaces/${slug}/projects/${p.id}`}
                        end
                        style={({ isActive }) => ({ ...navBase(isActive), paddingLeft: 22, flex: 1, minWidth: 0 })}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color || 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      </NavLink>
                      {projectId === String(p.id) && (
                        <NavLink
                          to={`/workspaces/${slug}/projects/${p.id}/settings`}
                          title="프로젝트 설정"
                          style={({ isActive }) => ({ ...navBase(isActive), width: 28, padding: '6px 4px', flexShrink: 0, justifyContent: 'center', flex: 'none' })}
                        >
                          ⚙
                        </NavLink>
                      )}
                    </div>
                    {projectId === String(p.id) && (
                      <NavLink
                        to={`/workspaces/${slug}/projects/${p.id}/sprints`}
                        style={({ isActive }) => ({ ...navBase(isActive), paddingLeft: 38, fontSize: '12px', marginTop: '1px' })}
                      >
                        <span style={{ fontSize: '12px' }}>🔄</span> 스프린트
                      </NavLink>
                    )}
                    {projectId === String(p.id) && (
                      <NavLink
                        to={`/workspaces/${slug}/projects/${p.id}/analytics`}
                        style={({ isActive }) => ({ ...navBase(isActive), paddingLeft: 38, fontSize: '12px', marginTop: '1px' })}
                      >
                        <span style={{ fontSize: '12px' }}>📊</span> 애널리틱스
                      </NavLink>
                    )}
                    {projectId === String(p.id) && (
                      <NavLink
                        to={`/workspaces/${slug}/projects/${p.id}/automation`}
                        style={({ isActive }) => ({ ...navBase(isActive), paddingLeft: 38, fontSize: '12px', marginTop: '1px' })}
                      >
                        <span style={{ fontSize: '12px' }}>⚡</span> 자동화
                      </NavLink>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <NavItem to="/" icon="⊞" label="워크스페이스" end collapsed={collapsed} />
        )}
      </div>

      {/* User + fold */}
      <div style={{ padding: collapsed ? '8px 4px' : '8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          onClick={onToggle}
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '5px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', width: '100%', textAlign: 'center' }}
        >
          {collapsed ? '›' : '‹ 접기'}
        </button>

        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: 'var(--r-md)' }}>
            <Avatar user={user} size={26} />
            <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.display_name || user?.username}
            </span>
            <button onClick={logout} title="로그아웃" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '2px 4px', flexShrink: 0 }}>⎋</button>
          </div>
        )}
        {collapsed && (
          <button onClick={logout} title="로그아웃" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px', padding: '6px', width: '100%', textAlign: 'center' }}>⎋</button>
        )}
      </div>
    </div>
  )
}
