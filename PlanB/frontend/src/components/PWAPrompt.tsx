import { useState, useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegistered(r) { r && console.log('SW registered') },
  })

  if (!needRefresh) return null

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 20, zIndex: 400,
      background: 'var(--bg-surface)', border: '1px solid var(--border-focus)',
      borderRadius: 'var(--r-lg)', padding: '14px 18px', maxWidth: 300,
      boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>🔄 업데이트 가능</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>새 버전의 PlanB가 있습니다.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => updateServiceWorker(true)} style={{ flex: 1, padding: '6px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          지금 업데이트
        </button>
        <button onClick={() => setNeedRefresh(false)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12 }}>
          나중에
        </button>
      </div>
    </div>
  )
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-install-dismissed') === '1')

  useEffect(() => {
    const handler = e => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!deferredPrompt || dismissed) return null

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 400,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '12px 18px',
      boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 14,
      minWidth: 320, maxWidth: 420,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0 }}>P</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>PlanB 앱으로 설치</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>홈 화면에 추가하여 빠르게 접근</div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={handleInstall} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>설치</button>
        <button onClick={handleDismiss} style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
      </div>
    </div>
  )
}
