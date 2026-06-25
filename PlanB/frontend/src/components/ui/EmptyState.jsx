import Button from './Button'

export default function EmptyState({ icon = '📋', title, description, action, onAction }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', gap: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '48px', lineHeight: 1 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</div>
        {description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 320 }}>{description}</div>}
      </div>
      {action && onAction && (
        <Button variant="primary" onClick={onAction}>{action}</Button>
      )}
    </div>
  )
}
