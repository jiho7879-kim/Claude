import { useState, useEffect, useSyncExternalStore } from 'react'
import useToastStore from '../store/toastStore'

function subscribe(cb) {
  window.addEventListener('online',  cb)
  window.addEventListener('offline', cb)
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) }
}

export function useIsOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}

export function OfflineBanner() {
  const isOnline = useIsOnline()
  const toast = useToastStore(s => s.add)

  useEffect(() => {
    if (!isOnline) toast('오프라인 상태입니다. 일부 기능이 제한될 수 있습니다.', 'error', 5000)
    else           toast('온라인 상태로 복구되었습니다.', 'success', 3000)
  }, [isOnline])

  if (isOnline) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: '#ef4444', color: '#fff',
      fontSize: 12, fontWeight: 600, textAlign: 'center',
      padding: '6px 0', letterSpacing: '0.03em',
    }}>
      ⚠ 오프라인 · 네트워크 연결을 확인해주세요
    </div>
  )
}
