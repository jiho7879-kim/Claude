const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899']

function colorFor(str) {
  let h = 0
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return COLORS[h % COLORS.length]
}

export default function Avatar({ user, size = 28 }) {
  const name = user?.display_name || user?.username || user?.email || '?'
  const initial = name.charAt(0).toUpperCase()
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={name}
        title={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <div
      title={name}
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: colorFor(name), color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 600,
      }}
    >
      {initial}
    </div>
  )
}
