export default function Modal({ title, onClose, children }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.box} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <h3 style={s.title}>{title}</h3>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  box: {
    background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
    padding: 24, width: '100%', maxWidth: 440,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { margin: 0, fontSize: 16, fontWeight: 600, color: '#e6edf3' },
  closeBtn: {
    background: 'none', border: 'none', color: '#8b949e',
    fontSize: 16, cursor: 'pointer', padding: 4,
  },
}
