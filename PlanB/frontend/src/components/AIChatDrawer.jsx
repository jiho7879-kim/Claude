import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { aiChat } from '../lib/aiApi'

const SUGGESTIONS = [
  '오늘 할 일 요약해줘',
  '마감이 급한 태스크가 뭐야?',
  '이번 주 일정 알려줘',
  '진행 중인 프로젝트 현황은?',
]

const ACTION_ICONS = {
  create_task: '✅',
  create_note: '📝',
  update_note: '✏️',
  create_time_block: '⏰',
  create_event: '📅',
}

function ModelBadge({ model }) {
  if (!model) return null
  const isGroq = model.toLowerCase().includes('groq') || model.toLowerCase().includes('llama')
  return (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: isGroq ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
      {model}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      {msg.loading ? (
        <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px' }}>
          <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style>
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
            ))}
          </span>
        </div>
      ) : (
        <div style={{
          maxWidth: '86%', padding: '8px 12px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser ? 'var(--accent)' : 'var(--bg-elevated)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
      )}
      {msg.actions?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, marginTop: 3, maxWidth: '86%' }}>
          {msg.actions.map((a, i) => (
            <div key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#10b981',
            }}>
              {ACTION_ICONS[a.type] || '✨'} {a.label}
            </div>
          ))}
        </div>
      )}
      {!isUser && !msg.loading && msg.model && <ModelBadge model={msg.model} />}
    </div>
  )
}

export default function AIChatDrawer({ open, onClose }) {
  const { slug } = useParams()
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '안녕하세요! 무엇이든 물어보세요 🤖\n태스크·일정·노트 생성도 가능합니다.',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastModel, setLastModel] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const history = messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content }))

  const send = async (text) => {
    const msg = (text !== undefined ? text : input).trim()
    if (!msg || loading || !slug) return
    setInput('')
    setMessages(prev => [...prev,
      { role: 'user', content: msg },
      { role: 'assistant', loading: true, content: '' },
    ])
    setLoading(true)
    try {
      const data = await aiChat(slug, msg, history)
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: data.reply, actions: data.actions || [], model: data.model }
        return next
      })
      if (data.model) setLastModel(data.model)
    } catch (err) {
      const detail = err?.response?.data?.reply || err?.response?.data?.detail || err?.message || '오류 발생'
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'assistant', content: `오류: ${detail}` }
        return next
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 998 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 92vw)',
        background: 'var(--bg-base)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', zIndex: 999,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        animation: 'slideInRight 0.22s var(--ease)',
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI 비서</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
              {lastModel ? (
                <>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: lastModel.toLowerCase().includes('groq') ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
                  {lastModel}
                </>
              ) : 'AI · 워크스페이스 연동'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
          {messages.map((m, i) => <Message key={i} msg={m} />)}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div style={{ padding: '0 12px 8px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{ padding: '4px 9px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '8px 12px 12px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '6px 8px 6px 12px' }}
            onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="질문하거나 작업을 요청하세요..."
              disabled={loading}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5, fontFamily: 'inherit', minHeight: 20, maxHeight: 100, overflow: 'hidden' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: 30, height: 30, borderRadius: 8, background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', color: input.trim() && !loading ? '#fff' : 'var(--text-muted)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              ↑
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
