export function Spinner({ size = 20 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid var(--border)`,
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.6s linear infinite',
    }} />
  )
}

export function SkeletonLine({ width = '100%', height = 14 }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 'var(--r-sm)' }} />
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Spinner size={32} />
    </div>
  )
}

// Global spin keyframe — added to document once
if (typeof document !== 'undefined' && !document.getElementById('spin-kf')) {
  const s = document.createElement('style')
  s.id = 'spin-kf'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(s)
}
