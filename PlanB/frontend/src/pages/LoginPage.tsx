const GITHUB_LOGIN_URL = `${import.meta.env.VITE_API_URL || ''}/accounts/github/login/`

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      {/* Background glow */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', top: '30%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '48px 40px', textAlign: 'center', width: '100%', maxWidth: 380, position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: '#fff' }}>P</div>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>PlanB</span>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 32px', lineHeight: 1.6 }}>
          개발팀을 위한 PM 도구<br />
          GitHub으로 바로 시작하세요
        </p>

        <a
          href={GITHUB_LOGIN_URL}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--text-primary)', color: 'var(--bg-base)', padding: '12px 20px', borderRadius: 'var(--r-md)', textDecoration: 'none', fontWeight: 600, fontSize: '14px', width: '100%', boxSizing: 'border-box', transition: 'opacity var(--duration) var(--ease)' }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub으로 로그인
        </a>

        <p style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          로그인 시 <span style={{ color: 'var(--accent)' }}>이용약관</span>에 동의하는 것으로 간주합니다
        </p>
      </div>
    </div>
  )
}
