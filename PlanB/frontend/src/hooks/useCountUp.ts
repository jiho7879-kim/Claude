import { useState, useEffect, useRef } from 'react'

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

export function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    startRef.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(target * easeOut(progress)))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return value
}
