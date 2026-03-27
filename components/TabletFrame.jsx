'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

const SCREEN_W   = 1024
const SCREEN_H   = 768
const BEZEL_TOP  = 40
const BEZEL_BOT  = 40
const BEZEL_SIDE = 26
const FRAME_W    = SCREEN_W + BEZEL_SIDE * 2  // 1076
const FRAME_H    = SCREEN_H + BEZEL_TOP + BEZEL_BOT  // 848

export default function TabletFrame({ children }) {
  const wrapRef  = useRef(null)
  const frameRef = useRef(null)
  const [scale,  setScale]  = useState(1)
  const router   = useRouter()
  const pathname = usePathname()
  const isActivity = pathname === '/activity'

  useEffect(() => {
    function fit() {
      if (!wrapRef.current) return
      const pad = 24
      const vw  = window.innerWidth
      const vh  = window.innerHeight
      const sx  = (vw - pad) / FRAME_W
      const sy  = (vh - pad) / FRAME_H
      const s   = Math.min(sx, sy)
      setScale(s)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  function goHome() {
    sessionStorage.removeItem('gts_user')
    router.push('/')
  }

  const scaledW = FRAME_W * scale
  const scaledH = FRAME_H * scale

  return (
    <div ref={wrapRef} style={{
      position: 'fixed',
      inset: 0,
      /* Instagram-inspired gradient background */
      background: `
        radial-gradient(ellipse at 20% 10%, rgba(240,148,51,.55) 0%, transparent 45%),
        radial-gradient(ellipse at 80% 20%, rgba(220,39,67,.45) 0%, transparent 45%),
        radial-gradient(ellipse at 50% 90%, rgba(188,24,136,.4) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(102,51,153,.35) 0%, transparent 40%),
        #1a0a2e
      `,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute', top: '8%', left: '6%',
        width: 180, height: 180, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,148,51,.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '12%', right: '8%',
        width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(188,24,136,.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
        <div ref={frameRef} style={{
          width:  FRAME_W,
          height: FRAME_H,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'absolute',
          top: 0, left: 0,
        }}>
          {/* Hardware shell */}
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #3A3530 0%, #252220 40%, #1E1C19 100%)',
            borderRadius: 28, position: 'relative',
            boxShadow: [
              '0 0 0 1px #4A4540',
              '0 0 0 2px #111',
              '0 32px 80px rgba(0,0,0,.85)',
              '0 0 60px rgba(240,148,51,.1)',
              'inset 0 1px 0 rgba(255,255,255,.08)',
              'inset 0 -1px 0 rgba(0,0,0,.4)',
            ].join(', '),
          }}>
            {/* Volume buttons */}
            <div style={{ position:'absolute', left:-5, top:120, width:5, height:32, background:'#2A2520', borderRadius:'3px 0 0 3px', boxShadow:'-1px 0 0 #4A4540' }}/>
            <div style={{ position:'absolute', left:-5, top:162, width:5, height:32, background:'#2A2520', borderRadius:'3px 0 0 3px', boxShadow:'-1px 0 0 #4A4540' }}/>
            {/* Power button */}
            <div style={{ position:'absolute', right:-5, top:150, width:5, height:48, background:'#2A2520', borderRadius:'0 3px 3px 0', boxShadow:'1px 0 0 #4A4540' }}/>

            {/* Top bezel */}
            <div style={{ position:'absolute', top:0, left:BEZEL_SIDE, right:BEZEL_SIDE, height:BEZEL_TOP,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#0D0C0B',
                boxShadow:'inset 0 0 3px rgba(0,0,0,.9), 0 0 0 1.5px #333' }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(100,140,255,.22)', margin:'1px 0 0 1px' }}/>
              </div>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#1A1714', boxShadow:'inset 0 0 2px rgba(0,0,0,.9)' }}/>
            </div>

            {/* Screen */}
            <div style={{
              position: 'absolute',
              top: BEZEL_TOP, left: BEZEL_SIDE,
              width: SCREEN_W, height: SCREEN_H,
              background: '#fafafa',
              overflow: 'hidden',
              borderRadius: 4,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)',
            }}>
              {children}
            </div>

            {/* Bottom bezel */}
            <div style={{ position:'absolute', bottom:0, left:BEZEL_SIDE, right:BEZEL_SIDE, height:BEZEL_BOT,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:90, height:4, borderRadius:999, background:'rgba(255,255,255,.15)' }}/>
            </div>

            {/* Top shine */}
            <div style={{ position:'absolute', top:0, left:28, right:28, height:1, borderRadius:'28px 28px 0 0',
              background:'linear-gradient(90deg, transparent, rgba(255,255,255,.12) 30%, rgba(255,255,255,.18) 50%, rgba(255,255,255,.12) 70%, transparent)' }}/>
          </div>
        </div>
      </div>

      {/* Home button */}
      {isActivity && (
        <button onClick={goHome} title="처음 화면으로" style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          padding: '7px 18px', borderRadius: 999,
          background: 'rgba(255,255,255,.08)',
          color: 'rgba(255,255,255,.5)',
          border: '1px solid rgba(255,255,255,.15)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex', alignItems: 'center', gap: 5,
          backdropFilter: 'blur(6px)',
          transition: 'all .2s',
          zIndex: 9999,
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.18)'; e.currentTarget.style.color = 'rgba(255,255,255,.85)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)' }}
        >
          🏠 처음 화면으로
        </button>
      )}
    </div>
  )
}
