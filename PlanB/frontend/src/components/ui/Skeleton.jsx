import { motion } from 'framer-motion'

export function Skeleton({ width = '100%', height = 16, rounded = false, style = {} }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width, height,
        background: 'linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-hover) 50%, var(--bg-elevated) 100%)',
        borderRadius: rounded ? 9999 : 6,
        ...style,
      }}
    />
  )
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? lastWidth : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonCard({ height = 80 }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 8 }}>
      <Skeleton height={height} />
    </div>
  )
}
