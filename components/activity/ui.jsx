'use client'
import { useEffect, useRef } from 'react'

const AVATAR_COLORS = ['#5B41EB','#4EACD9','#5BBF7A','#C97DE8','#FF6B7A','#FFB432','#22D3EE','#F97316']
function nameColor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export function Avatar({ name, size = 30 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: nameColor(name),
      border: '1px solid rgba(255,255,255,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700,
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>{(name || '?')[0]}</div>
  )
}

export function Btn({ children, onClick, color = 'blue', pill = false, sm = false,
  outline = false, disabled = false, style: ex = {}, full = false }) {
  const m = {
    blue:   ['#4EACD9', '#fff', '#4EACD9', '0 4px 12px rgba(78,172,217,.35)'],
    orange: ['#5B41EB', '#fff', '#5B41EB', '0 4px 12px rgba(91,65,235,.35)'],
    green:  ['#5BBF7A', '#fff', '#5BBF7A', '0 4px 12px rgba(91,191,122,.35)'],
    purple: ['#C97DE8', '#fff', '#C97DE8', '0 4px 12px rgba(201,125,232,.35)'],
    red:    ['#FF6B7A', '#fff', '#FF6B7A', '0 4px 12px rgba(255,107,122,.35)'],
    gray:   ['#F2EAE0', '#8C7B6E', '#E8DFD4', 'none'],
    dark:   ['#3D2B1F', '#fff', '#3D2B1F', '0 4px 12px rgba(61,43,31,.25)'],
  }
  const [bg, txt, bd, sh] = m[color] || m.blue
  return (
    <button onClick={disabled ? undefined : onClick} className={disabled ? '' : 'edu-btn'} style={{
      padding: sm ? '7px 16px' : '11px 22px',
      minHeight: sm ? 36 : 44,
      borderRadius: pill ? 999 : 12,
      fontSize: sm ? 13 : 15,
      fontWeight: 800,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: `2px solid ${bd}`,
      background: outline ? '#fff' : bg,
      color: outline ? bd : txt,
      opacity: disabled ? .45 : 1,
      boxShadow: disabled || outline ? 'none' : sh,
      transition: 'all .15s',
      fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      width: full ? '100%' : undefined,
      justifyContent: full ? 'center' : undefined,
      ...ex,
    }}>{children}</button>
  )
}

export function Inp({ value, onChange, placeholder, multi = false, rows = 3, style: ex = {}, onKeyDown, type = 'text' }) {
  const composing = useRef(false)
  const base = {
    width: '100%', padding: '12px 16px', borderRadius: 14,
    border: '2.5px solid var(--ds-border)', fontSize: 14, color: 'var(--ds-text)',
    background: 'var(--ds-bg)', outline: 'none', fontFamily: 'inherit',
    resize: multi ? 'vertical' : 'none', lineHeight: 1.7, fontWeight: 600,
    transition: 'border-color .15s, box-shadow .15s', ...ex,
  }
  return multi
    ? <textarea value={value}
        onChange={e => { if (!composing.current) onChange(e.target.value) }}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={e => { composing.current = false; onChange(e.target.value) }}
        placeholder={placeholder} rows={rows} style={base}
        onFocus={e => { e.target.style.borderColor='var(--ds-secondary)'; e.target.style.boxShadow='0 0 0 4px rgba(91,65,235,.15)' }}
        onBlur={e  => { e.target.style.borderColor='var(--ds-border)'; e.target.style.boxShadow='none' }} />
    : <input type={type} value={value}
        onChange={e => { if (!composing.current) onChange(e.target.value) }}
        onCompositionStart={() => { composing.current = true }}
        onCompositionEnd={e => { composing.current = false; onChange(e.target.value) }}
        placeholder={placeholder} style={base} onKeyDown={onKeyDown}
        onFocus={e => { e.target.style.borderColor='var(--ds-secondary)'; e.target.style.boxShadow='0 0 0 4px rgba(91,65,235,.15)' }}
        onBlur={e  => { e.target.style.borderColor='var(--ds-border)'; e.target.style.boxShadow='none' }} />
}

export function Lbl({ children, mt = 12 }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ds-text-2)', marginBottom: 8, marginTop: mt,
      letterSpacing: '0.2px', display:'flex', alignItems:'center', gap:5 }}>{children}</div>
  )
}

export function Sec({ children, style: ex = {} }) {
  return (
    <div className="ds-card" style={{
      background: '#fff', border: '1px solid #F1F5F9',
      borderRadius: 20, padding: '16px 18px', marginBottom: 14,
      boxShadow: '0 1px 2px rgba(0,0,0,.05)', ...ex,
    }}>{children}</div>
  )
}

export function Tag({ children, color = '#FF8C42' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 14px',
      borderRadius: 999, background: color + '15', color, border: `2px solid ${color}35`,
      fontSize: 12, fontWeight: 800, gap: 4, boxShadow: `0 2px 8px ${color}20`,
      letterSpacing: '0.1px' }}>{children}</span>
  )
}

export function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, []) // eslint-disable-line
  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      left: '50%', transform: 'translateX(-50%)',
      background: '#5B41EB', color: '#fff',
      borderRadius: 8, padding: '13px 28px',
      fontSize: 14, fontWeight: 600, zIndex: 9999,
      boxShadow: '0 8px 24px rgba(91,65,235,0.35)',
      animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)',
      whiteSpace: 'nowrap',
      border: '1px solid rgba(255,255,255,.2)',
      backdropFilter: 'blur(8px)',
      maxWidth: 'calc(100vw - 40px)',
      textAlign: 'center',
    }}>{msg}</div>
  )
}

export function Modal({ children, onClose }) {
  // 모바일 환경 감지
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  if (isMobile) {
    // 모바일: 바텀시트 스타일
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(61,43,31,.50)', backdropFilter: 'blur(4px)',
        zIndex: 10000, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      }} onClick={e => e.target === e.currentTarget && onClose()}>
        <div style={{
          background: '#fff', borderRadius: '24px 24px 0 0',
          padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 20px)',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 -8px 32px rgba(61,43,31,.18)',
          border: '2px solid #E6D8C8', borderBottom: 'none',
          animation: 'slideIn .28s cubic-bezier(.34,1.3,.64,1)',
        }}>
          {/* 핸들 */}
          <div style={{ width:36, height:4, background:'#E2E8F2', borderRadius:999, margin:'-4px auto 16px' }}/>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(61,43,31,.50)',
      backdropFilter: 'blur(4px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 26, padding: 24,
        maxWidth: 'min(420px, 94vw)', width: '100%',
        boxShadow: '0 16px 52px rgba(61,43,31,.24)',
        animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)',
        border: '2.5px solid #E6D8C8',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  )
}

export function OnlineUsers({ users, onClick, isOpen }) {
  if (!users.length) return null
  const vis = users.slice(0, 4), extra = users.length - 4
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        cursor: onClick ? 'pointer' : 'default',
        padding: '3px 6px', borderRadius: 8,
        background: isOpen ? 'rgba(91,65,235,0.08)' : 'transparent',
        transition: 'background .15s',
      }}
    >
      <div style={{ display: 'flex' }}>
        {vis.map((u, i) => (
          <div key={i} title={u.name} style={{ marginLeft: i ? -7 : 0, zIndex: 10 - i, position: 'relative' }}>
            <Avatar name={u.name} size={24} />
          </div>
        ))}
        {extra > 0 && (
          <div style={{ marginLeft: -7, width: 24, height: 24, borderRadius: '50%',
            background: '#F2EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#8C7B6E', border: '1.5px solid #fff' }}>+{extra}</div>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#555555' }}>{users.length}명</span>
    </div>
  )
}
