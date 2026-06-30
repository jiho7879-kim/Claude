import { useEffect } from 'react'
import useToastStore from '../../store/toastStore'

const TYPE_STYLES = {
  success: { bg: '#064e3b', border: '#10b981', icon: '✓' },
  error:   { bg: '#450a0a', border: '#ef4444', icon: '✕' },
  info:    { bg: '#0c1a3a', border: '#3b82f6', icon: 'ℹ' },
  warning: { bg: '#3d1f00', border: '#f59e0b', icon: '⚠' },
}

function ToastItem({ toast }) {
  const remove = useToastStore((s) => s.remove)
  const s = TYPE_STYLES[toast.type] || TYPE_STYLES.info
  return (
    <div
      className="fade-in"
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', borderRadius: 'var(--r-md)',
        background: s.bg, border: `1px solid ${s.border}`,
        color: 'var(--text-primary)', fontSize: '13px',
        boxShadow: 'var(--shadow-lg)', minWidth: 260, maxWidth: 400,
      }}
    >
      <span style={{ color: s.border, fontWeight: 700 }}>{s.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button onClick={() => remove(toast.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0 2px' }}>×</button>
    </div>
  )
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
