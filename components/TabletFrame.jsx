'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DeviceContext } from '../lib/DeviceContext'

const CONTENT_W  = 1024
const CONTENT_H  = 768
const BEZEL_TOP  = 40
const BEZEL_BOT  = 40
const BEZEL_SIDE = 26
const FRAME_W    = CONTENT_W + BEZEL_SIDE * 2
const FRAME_H    = CONTENT_H + BEZEL_TOP + BEZEL_BOT

function detectDevice() {
  if (typeof window === 'undefined') return 'pc'
  const ua = navigator.userAgent
  if (/iPhone|Android.*Mobile|Mobile.*Android|Windows Phone/i.test(ua)) return 'mobile'
  if (/iPad|Android(?!.*Mobile)|Tablet|Kindle|Silk/i.test(ua)) return 'tablet'
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 1
  const w = Math.min(window.screen.width, window.screen.height)
  if (hasTouch && w < 768) return 'mobile'
  if (hasTouch) return 'tablet'
  return 'pc'
}

function PCFrame({ children, scale, isActivity, onGoHome }) {
  const scaledW = FRAME_W * scale
  const scaledH = FRAME_H * scale
  return (
    <div style={{
      position:'fixed', inset:0,
      background:'radial-gradient(ellipse at 20% 10%,rgba(240,148,51,.55) 0%,transparent 45%),radial-gradient(ellipse at 80% 20%,rgba(220,39,67,.45) 0%,transparent 45%),radial-gradient(ellipse at 50% 90%,rgba(188,24,136,.4) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(102,51,153,.35) 0%,transparent 40%),#1a0a2e',
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
    }}>
      <div style={{position:'absolute',top:'8%',left:'6%',width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(240,148,51,.18) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:'12%',right:'8%',width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(188,24,136,.15) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{width:scaledW,height:scaledH,position:'relative',flexShrink:0}}>
        <div style={{width:FRAME_W,height:FRAME_H,transformOrigin:'top left',transform:`scale(${scale})`,position:'absolute',top:0,left:0}}>
          <div style={{width:'100%',height:'100%',background:'linear-gradient(160deg,#3A3530 0%,#252220 40%,#1E1C19 100%)',borderRadius:28,position:'relative',boxShadow:'0 0 0 1px #4A4540,0 0 0 2px #111,0 32px 80px rgba(0,0,0,.85),0 0 60px rgba(240,148,51,.1),inset 0 1px 0 rgba(255,255,255,.08),inset 0 -1px 0 rgba(0,0,0,.4)'}}>
            <div style={{position:'absolute',left:-5,top:120,width:5,height:32,background:'#2A2520',borderRadius:'3px 0 0 3px',boxShadow:'-1px 0 0 #4A4540'}}/>
            <div style={{position:'absolute',left:-5,top:162,width:5,height:32,background:'#2A2520',borderRadius:'3px 0 0 3px',boxShadow:'-1px 0 0 #4A4540'}}/>
            <div style={{position:'absolute',right:-5,top:150,width:5,height:48,background:'#2A2520',borderRadius:'0 3px 3px 0',boxShadow:'1px 0 0 #4A4540'}}/>
            <div style={{position:'absolute',top:0,left:BEZEL_SIDE,right:BEZEL_SIDE,height:BEZEL_TOP,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <div style={{width:10,height:10,borderRadius:'50%',background:'#0D0C0B',boxShadow:'inset 0 0 3px rgba(0,0,0,.9),0 0 0 1.5px #333'}}><div style={{width:4,height:4,borderRadius:'50%',background:'rgba(100,140,255,.22)',margin:'1px 0 0 1px'}}/></div>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#1A1714',boxShadow:'inset 0 0 2px rgba(0,0,0,.9)'}}/>
            </div>
            <div style={{position:'absolute',top:BEZEL_TOP,left:BEZEL_SIDE,width:CONTENT_W,height:CONTENT_H,background:'#fafafa',overflow:'hidden',borderRadius:4,boxShadow:'inset 0 0 0 1px rgba(0,0,0,.15)'}}>{children}</div>
            <div style={{position:'absolute',bottom:0,left:BEZEL_SIDE,right:BEZEL_SIDE,height:BEZEL_BOT,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:90,height:4,borderRadius:999,background:'rgba(255,255,255,.15)'}}/></div>
            <div style={{position:'absolute',top:0,left:28,right:28,height:1,borderRadius:'28px 28px 0 0',background:'linear-gradient(90deg,transparent,rgba(255,255,255,.12) 30%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.12) 70%,transparent)'}}/>
          </div>
        </div>
      </div>
      {isActivity&&(
        <button onClick={onGoHome} title="처음 화면으로" style={{position:'fixed',bottom:20,left:'50%',transform:'translateX(-50%)',padding:'7px 18px',borderRadius:999,background:'rgba(255,255,255,.08)',color:'rgba(255,255,255,.5)',border:'1px solid rgba(255,255,255,.15)',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'system-ui,sans-serif',display:'flex',alignItems:'center',gap:5,backdropFilter:'blur(6px)',transition:'all .2s',zIndex:9999}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.18)';e.currentTarget.style.color='rgba(255,255,255,.85)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.08)';e.currentTarget.style.color='rgba(255,255,255,.5)'}}>🏠 처음 화면으로</button>
      )}
    </div>
  )
}

function PortraitGuide() {
  return (
    <div style={{position:'fixed',inset:0,background:'linear-gradient(135deg,#1a0a2e 0%,#2d1b4e 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:'system-ui,-apple-system,sans-serif',textAlign:'center',padding:32,gap:20,userSelect:'none'}}>
      <div style={{width:88,height:88,borderRadius:22,background:'rgba(255,255,255,.08)',border:'2px solid rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:44,animation:'rotateTip 2.6s ease-in-out infinite'}}>📱</div>
      <div>
        <div style={{fontSize:20,fontWeight:800,marginBottom:8,letterSpacing:'-0.3px'}}>가로 모드로 전환해 주세요</div>
        <div style={{fontSize:14,color:'rgba(255,255,255,.55)',lineHeight:1.8}}>이 앱은 가로(landscape) 모드에서<br/>최적으로 동작해요</div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginTop:4,padding:'10px 22px',borderRadius:999,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)'}}>
        <span style={{fontSize:18}}>↺</span>
        <span style={{fontSize:13,color:'rgba(255,255,255,.6)',fontWeight:600}}>기기를 90° 회전해 주세요</span>
      </div>
      <style>{`@keyframes rotateTip{0%,15%{transform:rotate(0deg)}45%,70%{transform:rotate(-90deg)}90%,100%{transform:rotate(0deg)}}`}</style>
    </div>
  )
}

export default function TabletFrame({ children }) {
  const [scale,      setScale]      = useState(1)
  const [device,     setDevice]     = useState('pc')
  const [isPortrait, setIsPortrait] = useState(false)
  const [ready,      setReady]      = useState(false)

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
        const pad = 24
        setScale(Math.min((vw - pad) / FRAME_W, (vh - pad) / FRAME_H, 1))
        setIsPortrait(false)
      } else {
        setIsPortrait(vw < vh)
      }
    }

    fit()
    setReady(true)
    window.addEventListener('resize', fit)
    const onOrient = () => setTimeout(fit, 150)
    window.addEventListener('orientationchange', onOrient)
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('orientationchange', onOrient) }
  }, [])

  function goHome() { sessionStorage.removeItem('gts_user'); router.push('/') }

  if (!ready) return null

  // ── PC ──
  if (device === 'pc') {
    return (
      <DeviceContext.Provider value="pc">
        <PCFrame scale={scale} isActivity={isActivity} onGoHome={goHome}>{children}</PCFrame>
      </DeviceContext.Provider>
    )
  }

  // ── 모바일: 세로/가로 모두 반응형 레이아웃 ──
  if (device === 'mobile') {
    return (
      <DeviceContext.Provider value="mobile">
        <div style={{ position:'fixed', inset:0, background:'#FFFDF9', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {children}
        </div>
      </DeviceContext.Provider>
    )
  }

  // ── 태블릿 세로: 회전 안내 ──
  if (isPortrait) return <PortraitGuide />

  // ── 태블릿 가로: 전체 화면 ──
  return (
    <DeviceContext.Provider value="tablet">
      <div style={{ position:'fixed', inset:0, background:'#FFFDF9', overflow:'hidden' }}>
        {children}
      </div>
    </DeviceContext.Provider>
  )
}
