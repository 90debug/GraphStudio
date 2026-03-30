'use client'
import { useEffect } from 'react'
import { avBg, avFg, EDU_GRAD } from '../../lib/constants'

// ─── Avatar ───────────────────────────────────────────────────────────────
export function Avatar({ name, size = 30, gradient = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      padding: gradient ? 2.5 : 0,
      background: gradient ? EDU_GRAD : 'transparent',
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%',
        background: avBg(name), color: avFg(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * (gradient ? 0.38 : 0.42), fontWeight: 800,
        border: gradient ? '2.5px solid #fff' : `2.5px solid ${avFg(name)}25`,
        boxShadow: gradient ? 'none' : `0 2px 8px ${avFg(name)}25`,
      }}>{(name || '?')[0]}</div>
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────
export function Btn({ children, onClick, color = 'blue', pill = false, sm = false,
  outline = false, disabled = false, style: ex = {}, full = false }) {
  const m = {
    blue:   ['#4EACD9', '#fff', '#4EACD9', '0 4px 12px rgba(78,172,217,.35)'],
    orange: ['#FF8C42', '#fff', '#FF8C42', '0 4px 12px rgba(255,140,66,.35)'],
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

// ─── Input ────────────────────────────────────────────────────────────────
export function Inp({ value, onChange, placeholder, multi = false, rows = 3, style: ex = {}, onKeyDown, type = 'text' }) {
  const base = {
    width: '100%', padding: '12px 16px', borderRadius: 14,
    border: '2.5px solid #E6D8C8', fontSize: 14, color: '#3D2B1F',
    background: '#FFFDF9', outline: 'none', fontFamily: 'inherit',
    resize: multi ? 'vertical' : 'none', lineHeight: 1.7, fontWeight: 600,
    transition: 'border-color .15s, box-shadow .15s', ...ex,
  }
  return multi
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={base}
        onFocus={e => { e.target.style.borderColor='#4EACD9'; e.target.style.boxShadow='0 0 0 4px rgba(78,172,217,.15)' }}
        onBlur={e  => { e.target.style.borderColor='#E6D8C8'; e.target.style.boxShadow='none' }} />
    : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} onKeyDown={onKeyDown}
        onFocus={e => { e.target.style.borderColor='#4EACD9'; e.target.style.boxShadow='0 0 0 4px rgba(78,172,217,.15)' }}
        onBlur={e  => { e.target.style.borderColor='#E6D8C8'; e.target.style.boxShadow='none' }} />
}

// ─── Label ────────────────────────────────────────────────────────────────
export function Lbl({ children, mt = 12 }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: '#7B6858', marginBottom: 8, marginTop: mt,
      letterSpacing: '0.2px', display:'flex', alignItems:'center', gap:5 }}>{children}</div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────
export function Sec({ children, style: ex = {} }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.96)', border: '2px solid rgba(230,216,200,.7)',
      borderRadius: 20, padding: '16px 18px', marginBottom: 14,
      boxShadow: '0 4px 20px rgba(0,0,0,.10)', backdropFilter: 'blur(8px)', ...ex,
    }}>{children}</div>
  )
}

// ─── Tag ─────────────────────────────────────────────────────────────────
export function Tag({ children, color = '#FF8C42' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 14px',
      borderRadius: 999, background: color + '15', color, border: `2px solid ${color}35`,
      fontSize: 12, fontWeight: 800, gap: 4, boxShadow: `0 2px 8px ${color}20`,
      letterSpacing: '0.1px' }}>{children}</span>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────
export function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, []) // eslint-disable-line
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg,#3D2B1F,#5C3D28)', color: '#fff',
      borderRadius: 999, padding: '13px 28px',
      fontSize: 14, fontWeight: 800, zIndex: 9999,
      boxShadow: '0 8px 28px rgba(61,43,31,.36)',
      animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)',
      whiteSpace: 'nowrap',
      border: '2px solid rgba(255,255,255,.18)',
      backdropFilter: 'blur(8px)',
    }}>{msg}</div>
  )
}

// ─── Modal Wrapper ────────────────────────────────────────────────────────
export function Modal({ children, onClose }) {
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

// ─── Online Users ─────────────────────────────────────────────────────────
export function OnlineUsers({ users }) {
  if (!users.length) return null
  const vis = users.slice(0, 4), extra = users.length - 4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
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
      <span style={{ fontSize: 11, color: '#8C7B6E' }}>{users.length}명</span>
    </div>
  )
}
