const VARIANTS = {
  primary: { bg: 'var(--accent)', hover: 'var(--accent-hover)', color: '#fff' },
  ghost:   { bg: 'transparent', hover: 'var(--bg-elevated)', color: 'var(--text-secondary)' },
  danger:  { bg: 'transparent', hover: 'rgba(239,68,68,0.12)', color: 'var(--danger)' },
  subtle:  { bg: 'var(--bg-elevated)', hover: 'var(--bg-hover)', color: 'var(--text-primary)' },
}

export default function Button({ children, variant = 'ghost', size = 'md', onClick, disabled, style, type = 'button', className }: {
  children?: any; variant?: string; size?: string; onClick?: any; disabled?: any; style?: any; type?: 'button' | 'submit' | 'reset'; className?: any
}) {
  const v = VARIANTS[variant]
  const pad = size === 'sm' ? '4px 10px' : size === 'lg' ? '10px 20px' : '6px 14px'
  const fontSize = size === 'sm' ? '12px' : size === 'lg' ? '15px' : '13px'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: pad, fontSize, fontWeight: 500, fontFamily: 'inherit',
        background: v.bg, color: v.color,
        border: '1px solid transparent', borderRadius: 'var(--r-md)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        transition: 'background var(--duration) var(--ease), color var(--duration) var(--ease)',
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = v.hover }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = v.bg }}
    >
      {children}
    </button>
  )
}
