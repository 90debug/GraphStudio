'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DeviceContext } from '../lib/DeviceContext'

// ── 콘텐츠 고정 크기 (activity/page.jsx 와 동일) ──
const CONTENT_W  = 1024
const CONTENT_H  = 768

// ── 태블릿 프레임 베젤 ──
const BEZEL_TOP  = 40
const BEZEL_BOT  = 40
const BEZEL_SIDE = 26
const FRAME_W    = CONTENT_W + BEZEL_SIDE * 2   // 1076
const FRAME_H    = CONTENT_H + BEZEL_TOP + BEZEL_BOT  // 848

// ── 기기 판별 (SSR safe) ──
function detectDevice() {
  if (typeof window === 'undefined') return 'pc'
  const ua = navigator.userAgent

  // 명확한 모바일 UA
  if (/iPhone|Android.*Mobile|Mobile.*Android|Windows Phone/i.test(ua)) return 'mobile'

  // 명확한 태블릿 UA
  if (/iPad|Android(?!.*Mobile)|Tablet|Kindle|Silk/i.test(ua)) return 'tablet'

  // UA 불확실 시 터치 + 화면 크기로 보조 판별
  // (예: iPad가 "Macintosh"로 UA를 보내는 경우)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 1
  const isSmallScreen = Math.min(window.screen.width, window.screen.height) < 1024
  if (hasTouch && isSmallScreen) return 'tablet'

  return 'pc'
}

// ── PC용 태블릿 프레임 ─────────────────────────────────────────────────────
function PCFrame({ children, scale, isActivity, onGoHome }) {
  const scaledW = FRAME_W * scale
  const scaledH = FRAME_H * scale

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: `
        radial-gradient(ellipse at 20% 10%, rgba(240,148,51,.55) 0%, transparent 45%),
        radial-gradient(ellipse at 80% 20%, rgba(220,39,67,.45) 0%, transparent 45%),
        radial-gradient(ellipse at 50% 90%, rgba(188,24,136,.4)  0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(102,51,153,.35) 0%, transparent 40%),
        #1a0a2e
      `,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {/* 배경 장식 블롭 */}
      <div style={{ position:'absolute', top:'8%', left:'6%', width:180, height:180, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(240,148,51,.18) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'12%', right:'8%', width:220, height:220, borderRadius:'50%',
        background:'radial-gradient(circle, rgba(188,24,136,.15) 0%, transparent 70%)', pointerEvents:'none' }} />

      {/* 스케일 컨테이너 */}
      <div style={{ width: scaledW, height: scaledH, position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: FRAME_W, height: FRAME_H,
          transformOrigin: 'top left', transform: `scale(${scale})`,
          position: 'absolute', top: 0, left: 0,
        }}>
          {/* 하드웨어 쉘 */}
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(160deg, #3A3530 0%, #252220 40%, #1E1C19 100%)',
            borderRadius: 28, position: 'relative',
            boxShadow: [
              '0 0 0 1px #4A4540', '0 0 0 2px #111',
              '0 32px 80px rgba(0,0,0,.85)', '0 0 60px rgba(240,148,51,.1)',
              'inset 0 1px 0 rgba(255,255,255,.08)', 'inset 0 -1px 0 rgba(0,0,0,.4)',
            ].join(', '),
          }}>
            {/* 사이드 버튼들 */}
            <div style={{ position:'absolute', left:-5, top:120, width:5, height:32, background:'#2A2520', borderRadius:'3px 0 0 3px', boxShadow:'-1px 0 0 #4A4540' }}/>
            <div style={{ position:'absolute', left:-5, top:162, width:5, height:32, background:'#2A2520', borderRadius:'3px 0 0 3px', boxShadow:'-1px 0 0 #4A4540' }}/>
            <div style={{ position:'absolute', right:-5, top:150, width:5, height:48, background:'#2A2520', borderRadius:'0 3px 3px 0', boxShadow:'1px 0 0 #4A4540' }}/>

            {/* 상단 베젤 (카메라) */}
            <div style={{ position:'absolute', top:0, left:BEZEL_SIDE, right:BEZEL_SIDE, height:BEZEL_TOP,
              display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#0D0C0B',
                boxShadow:'inset 0 0 3px rgba(0,0,0,.9), 0 0 0 1.5px #333' }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:'rgba(100,140,255,.22)', margin:'1px 0 0 1px' }}/>
              </div>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#1A1714', boxShadow:'inset 0 0 2px rgba(0,0,0,.9)' }}/>
            </div>

            {/* 스크린 */}
            <div style={{
              position: 'absolute',
              top: BEZEL_TOP, left: BEZEL_SIDE,
              width: CONTENT_W, height: CONTENT_H,
              background: '#fafafa', overflow: 'hidden', borderRadius: 4,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.15)',
            }}>
              {children}
            </div>

            {/* 하단 베젤 (홈 바) */}
            <div style={{ position:'absolute', bottom:0, left:BEZEL_SIDE, right:BEZEL_SIDE, height:BEZEL_BOT,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:90, height:4, borderRadius:999, background:'rgba(255,255,255,.15)' }}/>
            </div>

            {/* 상단 광택 */}
            <div style={{ position:'absolute', top:0, left:28, right:28, height:1, borderRadius:'28px 28px 0 0',
              background:'linear-gradient(90deg, transparent, rgba(255,255,255,.12) 30%, rgba(255,255,255,.18) 50%, rgba(255,255,255,.12) 70%, transparent)' }}/>
          </div>
        </div>
      </div>

      {/* 홈 버튼 */}
      {isActivity && (
        <button onClick={onGoHome} title="처음 화면으로" style={{
          position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
          padding:'7px 18px', borderRadius:999,
          background:'rgba(255,255,255,.08)', color:'rgba(255,255,255,.5)',
          border:'1px solid rgba(255,255,255,.15)',
          fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'system-ui, sans-serif',
          display:'flex', alignItems:'center', gap:5,
          backdropFilter:'blur(6px)', transition:'all .2s', zIndex:9999,
        }}
          onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.18)'; e.currentTarget.style.color='rgba(255,255,255,.85)' }}
          onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.08)'; e.currentTarget.style.color='rgba(255,255,255,.5)' }}
        >🏠 처음 화면으로</button>
      )}
    </div>
  )
}

// ── 세로 모드 안내 화면 ──────────────────────────────────────────────────────
function PortraitGuide() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center', padding: 32, gap: 20,
      userSelect: 'none',
    }}>
      <div style={{
        width: 88, height: 88, borderRadius: 22,
        background: 'rgba(255,255,255,.08)',
        border: '2px solid rgba(255,255,255,.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 44,
        animation: 'rotateTip 2.6s ease-in-out infinite',
      }}>📱</div>

      <div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.3px' }}>
          가로 모드로 전환해 주세요
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.55)', lineHeight: 1.8 }}>
          이 앱은 가로(landscape) 모드에서<br />최적으로 동작해요
        </div>
      </div>

      <div style={{
        display:'flex', alignItems:'center', gap:10, marginTop:4,
        padding:'10px 22px', borderRadius:999,
        background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)',
      }}>
        <span style={{ fontSize:18 }}>↺</span>
        <span style={{ fontSize:13, color:'rgba(255,255,255,.6)', fontWeight:600 }}>
          기기를 90° 회전해 주세요
        </span>
      </div>

      <style>{`
        @keyframes rotateTip {
          0%,15%  { transform: rotate(0deg); }
          45%,70% { transform: rotate(-90deg); }
          90%,100%{ transform: rotate(0deg); }
        }
      `}</style>
    </div>
  )
}

// ── 모바일/태블릿 — 가로 모드 스케일 콘텐츠 (핀치 줌 + 패닝) ──────────────
function MobileScaled({ children, scale: baseScale }) {
  const containerRef  = useRef(null)
  // stateRef: 렌더를 트리거하지 않고 최신 transform 값 유지
  const stateRef      = useRef({ tx: 0, ty: 0, scale: baseScale })
  const prevTouchRef  = useRef(null)
  const lastTapRef    = useRef(0)
  // tf: CSS transform에 실제로 반영되는 값 (렌더 트리거)
  const [tf, setTf]   = useState({ tx: 0, ty: 0, scale: baseScale })

  // ── 1) 화면 크기 기준으로 콘텐츠 중앙 배치 ──────────────────────────────
  // ※ 컨테이너 div는 항상 렌더되어야 containerRef가 연결됨
  //   → 이 effect가 먼저 실행되어 stateRef를 초기화한 뒤
  //     effect 2(이벤트 리스너)가 실행되는 순서 보장
  useEffect(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const tx = (vw - CONTENT_W * baseScale) / 2
    const ty = (vh - CONTENT_H * baseScale) / 2
    const init = { tx, ty, scale: baseScale }
    stateRef.current = init
    setTf({ ...init })
  }, [baseScale])

  // ── 2) 터치 이벤트 핸들러 등록 ──────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return   // 이제 항상 렌더되므로 null이 되지 않음

    const PASSTHROUGH = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

    // e.touches는 live 객체라 그대로 저장하면 안 됨 → 좌표만 스냅샷
    function snap(e) {
      return Array.from(e.touches).map(t => ({
        id: t.identifier,
        x:  t.clientX,
        y:  t.clientY,
      }))
    }

    function onStart(e) {
      const curr = snap(e)

      if (curr.length === 1) {
        // 더블탭 → 줌 리셋
        const now = Date.now()
        if (now - lastTapRef.current < 280) {
          const vw = window.innerWidth
          const vh = window.innerHeight
          const tx = (vw - CONTENT_W * baseScale) / 2
          const ty = (vh - CONTENT_H * baseScale) / 2
          const reset = { tx, ty, scale: baseScale }
          stateRef.current = reset
          setTf({ ...reset })
          prevTouchRef.current = null
          return
        }
        lastTapRef.current = now

        // 입력 요소 위의 단일 터치는 패스스루 (팬 건너뜀)
        if (PASSTHROUGH.has(e.target.tagName)) {
          prevTouchRef.current = null
          return
        }
      }

      prevTouchRef.current = curr
    }

    function onMove(e) {
      e.preventDefault()
      const prev = prevTouchRef.current
      if (!prev) return

      const curr = snap(e)
      let { tx, ty, scale } = stateRef.current
      const vw = window.innerWidth
      const vh = window.innerHeight

      if (curr.length === 1 && prev.length >= 1) {
        // ─ 단일 손가락 패닝 ─
        const p = prev.find(t => t.id === curr[0].id) ?? prev[0]
        tx += curr[0].x - p.x
        ty += curr[0].y - p.y

      } else if (curr.length >= 2 && prev.length >= 2) {
        // ─ 두 손가락 핀치 줌 + 팬 ─
        const c0 = curr[0], c1 = curr[1]
        const p0 = prev.find(t => t.id === c0.id) ?? prev[0]
        const p1 = prev.find(t => t.id === c1.id) ?? prev[Math.min(1, prev.length - 1)]

        if (p0 && p1) {
          const prevDist = Math.hypot(p0.x - p1.x, p0.y - p1.y)
          const currDist = Math.hypot(c0.x - c1.x, c0.y - c1.y)

          if (prevDist > 1) {
            const newScale = Math.max(baseScale, Math.min(baseScale * 5, scale * (currDist / prevDist)))
            const ratio    = newScale / scale
            // 핀치 중심점 기준 줌
            const midX = (c0.x + c1.x) / 2
            const midY = (c0.y + c1.y) / 2
            tx    = midX - (midX - tx) * ratio
            ty    = midY - (midY - ty) * ratio
            scale = newScale
          }

          // 두 손가락 중점 이동 → 팬
          const pMidX = (p0.x + p1.x) / 2
          const pMidY = (p0.y + p1.y) / 2
          tx += (c0.x + c1.x) / 2 - pMidX
          ty += (c0.y + c1.y) / 2 - pMidY
        }
      }

      // 클램프: 콘텐츠가 화면에서 120px 이상 벗어나지 않도록
      const scaledW = CONTENT_W * scale
      const scaledH = CONTENT_H * scale
      const m = 120
      tx = Math.min(vw - m, Math.max(m - scaledW, tx))
      ty = Math.min(vh - m, Math.max(m - scaledH, ty))

      const next = { tx, ty, scale }
      stateRef.current     = next
      prevTouchRef.current = curr
      setTf({ ...next })
    }

    function onEnd(e) {
      prevTouchRef.current = snap(e)
      if (e.touches.length === 0) prevTouchRef.current = null
    }

    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove',  onMove,  { passive: false })
    el.addEventListener('touchend',   onEnd,   { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove',  onMove)
      el.removeEventListener('touchend',   onEnd)
    }
  }, [baseScale])

  // ※ 컨테이너 div를 항상 렌더 (조건부 return null 제거)
  //   → useEffect 실행 시점에 containerRef.current가 반드시 존재해야 함
  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0,
        background: '#000',
        overflow: 'hidden',
        touchAction: 'none',   // 브라우저 기본 스크롤·줌 차단
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: CONTENT_W, height: CONTENT_H,
        transformOrigin: 'top left',
        transform: `translate(${tf.tx}px, ${tf.ty}px) scale(${tf.scale})`,
        overflow: 'hidden',
        willChange: 'transform',
      }}>
        {children}
      </div>

      {/* 줌인 시 더블탭 리셋 안내 */}
      {tf.scale > baseScale * 1.05 && (
        <div style={{
          position: 'absolute', bottom: 72, left: '50%',
          transform: 'translateX(-50%)',
          padding: '5px 14px', borderRadius: 999,
          background: 'rgba(0,0,0,.50)', backdropFilter: 'blur(6px)',
          color: '#fff', fontSize: 11, fontWeight: 600,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          두 번 탭하면 원래 크기로 돌아가요
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export default function TabletFrame({ children }) {
  const [scale,      setScale]      = useState(1)
  const [device,     setDevice]     = useState('pc')
  const [isPortrait, setIsPortrait] = useState(false)
  const [ready,      setReady]      = useState(false)  // hydration 전 깜빡임 방지

  const router     = useRouter()
  const pathname   = usePathname()
  const isActivity = pathname === '/activity'

  useEffect(() => {
    const d = detectDevice()
    setDevice(d)

    function fit() {
      const vw = window.innerWidth
      const vh = window.innerHeight

      if (d === 'pc') {
        // PC: 태블릿 프레임(FRAME_W × FRAME_H)을 뷰포트에 맞게 스케일
        const pad = 24
        const sx  = (vw - pad) / FRAME_W
        const sy  = (vh - pad) / FRAME_H
        setScale(Math.min(sx, sy, 1))  // 1 초과 확대는 하지 않음
        setIsPortrait(false)
      } else {
        // 모바일/태블릿: 가로/세로 판별
        const landscape = vw >= vh
        setIsPortrait(!landscape)
        if (landscape) {
          // 콘텐츠(1024×768)를 뷰포트 전체에 꽉 차게 스케일
          const sx = vw / CONTENT_W
          const sy = vh / CONTENT_H
          setScale(Math.min(sx, sy))
        }
      }
    }

    fit()
    setReady(true)

    window.addEventListener('resize', fit)
    // orientationchange 직후엔 innerWidth/Height가 아직 갱신 전일 수 있어서 딜레이
    const onOrient = () => setTimeout(fit, 150)
    window.addEventListener('orientationchange', onOrient)

    return () => {
      window.removeEventListener('resize', fit)
      window.removeEventListener('orientationchange', onOrient)
    }
  }, [])

  function goHome() {
    sessionStorage.removeItem('gts_user')
    router.push('/')
  }

  // SSR/hydration 중 렌더 방지 (레이아웃 깜빡임 방지)
  if (!ready) return null

  // ── PC ──
  if (device === 'pc') {
    return (
      <DeviceContext.Provider value="pc">
        <PCFrame scale={scale} isActivity={isActivity} onGoHome={goHome}>
          {children}
        </PCFrame>
      </DeviceContext.Provider>
    )
  }

  // ── 모바일/태블릿 — 세로 모드 ──
  if (isPortrait) return <PortraitGuide />

  // ── 모바일/태블릿 — 가로 모드 ──
  return (
    <DeviceContext.Provider value={device}>
      <MobileScaled scale={scale}>{children}</MobileScaled>
    </DeviceContext.Provider>
  )
}
