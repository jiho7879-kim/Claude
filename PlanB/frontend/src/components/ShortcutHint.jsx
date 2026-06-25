import { useState } from 'react'

const SHORTCUTS = [
  { keys: ['⌘', 'K'],       desc: '커맨드 팔레트 열기' },
  { keys: ['G', 'W'],        desc: '워크스페이스 목록' },
  { keys: ['G', 'P'],        desc: '프로젝트 목록' },
  { keys: ['G', 'C'],        desc: '캘린더' },
  { keys: ['G', 'M'],        desc: '멤버' },
  { keys: ['G', 'S'],        desc: '스프린트' },
  { keys: ['Esc'],           desc: '닫기 / 포커스 해제' },
  { keys: ['⌘', 'Enter'],   desc: '댓글 전송' },
]

export default function ShortcutHint() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="키보드 단축키"
        style={{ position:'fixed', bottom:20, right:20, zIndex:300, width:32, height:32, borderRadius:'var(--r-full)', background:'var(--bg-surface)', border:'1px solid var(--border)', color:'var(--text-muted)', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'var(--shadow-md)' }}
      >
        ?
      </button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'flex-end', padding:64 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'16px 20px', width:260, boxShadow:'var(--shadow-lg)' }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12, color:'var(--text-primary)' }}>키보드 단축키</div>
            {SHORTCUTS.map(({ keys, desc }) => (
              <div key={desc} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text-muted)' }}>{desc}</span>
                <div style={{ display:'flex', gap:3 }}>
                  {keys.map(k => (
                    <kbd key={k} style={{ fontSize:10, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'1px 5px', color:'var(--text-secondary)', fontFamily:'monospace' }}>{k}</kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
