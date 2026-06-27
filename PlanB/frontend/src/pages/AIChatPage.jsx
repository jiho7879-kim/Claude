import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { aiChat } from '../lib/aiApi'

const SUGGESTIONS = [
  '마감이 가장 급한 태스크가 뭐야?',
  '이번 주 일정 알려줘',
  '진행 중인 프로젝트 현황 요약해줘',
  '기한이 지난 태스크 있어?',
]

function ActionBadge({ action }) {
  const ICONS = { create_task: '✅', create_note: '📝', update_note: '✏️', create_time_block: '⏰', create_event: '📅' }
  const icon = ICONS[action.type] || '✨'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
      borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#10b981', marginTop: 6,
    }}>
      {icon} {action.label}
    </div>
  )
}

function ModelBadge({ model }) {
  if (!model) return null
  const isGroq = model.toLowerCase().includes('groq') || model.toLowerCase().includes('llama')
  return (
    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: isGroq ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
      {model}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
      {msg.loading ? (
        <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}>
          <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
          <span style={{ display: 'inline-flex', gap: 4 }}>
            {[0,1,2].map(i => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)', display: 'inline-block', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
            ))}
          </span>
        </div>
      ) : (
        <div style={{
          maxWidth: '82%', padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'var(--accent)' : 'var(--bg-surface)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
      )}
      {msg.actions?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, marginTop: 4, maxWidth: '82%' }}>
          {msg.actions.map((a, i) => <ActionBadge key={i} action={a} />)}
        </div>
      )}
      {!isUser && !msg.loading && msg.model && <ModelBadge model={msg.model} />}
    </div>
  )
}

export default function AIChatPage() {
  const { slug } = useParams()
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '안녕하세요! PlanB AI 비서입니다 🤖\n\n프로젝트·태스크·일정에 대해 무엇이든 물어보세요.\n예: "000 언제까지 마감해야 해?" / "000 일정 언제야?" / "000 프로젝트에 태스크 등록해줘"',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const history = messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content }))

  const send = async (text) => {
    const msg = (text !== undefined ? text : input).trim()
    if (!msg || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
    } catch (err) {
      const detail = err?.response?.data?.reply || err?.response?.data?.detail || err?.message || '알 수 없는 오류'
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
      {/* 헤더 */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>AI 비서</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gemini 2.0 Flash · 프로젝트 데이터 연동</div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* 추천 질문 */}
      {messages.length === 1 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ padding: '5px 11px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 입력창 */}
      <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 10px 8px 14px', transition: 'border-color 0.2s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <textarea
            ref={el => { inputRef.current = el; textareaRef.current = el }}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="질문하거나 태스크·일정 등록을 요청하세요... (Enter 전송)"
            disabled={loading}
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.5, fontFamily: 'inherit', minHeight: 22, maxHeight: 120, overflow: 'hidden' }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            style={{ width: 34, height: 34, borderRadius: 9, background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default', color: input.trim() && !loading ? '#fff' : 'var(--text-muted)', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
