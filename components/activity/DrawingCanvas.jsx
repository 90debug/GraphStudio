'use client'
import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { DRAW_COLORS } from '../../lib/constants'
import { Btn } from './ui'
import {
  addStroke, deleteMyStrokes, clearStrokes, setCurrentDrawer,
  saveCanvasSnapshot, setLivePreview, updateCursorPos, subscribeRoom,
} from '../../lib/firestore'

// 이름별 고정 색상
const NAME_COLORS = ['#5B41EB','#4EACD9','#5BBF7A','#C97DE8','#FF6B7A','#FFB432','#F97316','#22D3EE']
function nameColor(name) {
  let h = 0; for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h<<5)-h)
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length]
}

export default function DrawingCanvas({
  code, userName, strokes, currentDrawer, livePreview,
  snapshotImg, onSnapshotImg,
  isMobile,
  isFullscreen = false,
}) {
  const canvasRef  = useRef(null)
  const overlayRef = useRef(null)
  const fsWrapRef  = useRef(null)
  const drawing    = useRef(false)
  const startPt    = useRef(null)
  const curStroke  = useRef([])
  const previewT   = useRef(null)
  const cursorT    = useRef(null)

  const toolRef  = useRef('pen')
  const colorRef = useRef('#1C1917')
  const widthRef = useRef(4)
  const [tool,  setToolUI]  = useState('pen')
  const [color, setColorUI] = useState('#1C1917')
  const [width, setWidthUI] = useState(4)
  const [saving, setSaving] = useState(false)

  // 전체화면 캔버스 크기
  const [fsDim, setFsDim] = useState(null)
  // 실시간 커서 위치 (본인 포함 모든 유저)
  const [cursors, setCursors] = useState({})
  // 본인 현재 커서 (canvas 좌표)
  const myCursor = useRef(null)

  function setTool(v)  { toolRef.current  = v; setToolUI(v)  }
  function setColor(v) { colorRef.current = v; setColorUI(v) }
  function setWidth(v) { widthRef.current = v; setWidthUI(v) }
  const isEraser = tool === 'eraser'

  // ── 전체화면 크기 계산 (ResizeObserver) ──────────────────────────────
  useLayoutEffect(() => {
    if (!isFullscreen) { setFsDim(null); return }
    const el = fsWrapRef.current; if (!el) return
    const calc = () => {
      const {width:cw,height:ch} = el.getBoundingClientRect()
      const ratio = 800/480; let w=cw, h=w/ratio
      if (h>ch) { h=ch; w=h*ratio }
      setFsDim({w:Math.floor(w), h:Math.floor(h)})
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isFullscreen])

  // 전체화면에서 fsDim 확보되면 바로 strokes 그리기 (클릭 전에도 표시)
  useEffect(() => {
    if (isFullscreen && fsDim) redrawStrokes(strokes)
  }, [fsDim]) // eslint-disable-line

  // ── 커서 위치 구독 (Firestore room.cursors) ──────────────────────────
  useEffect(() => {
    if (!code) return
    const unsub = subscribeRoom(code, (roomData) => {
      const raw = roomData.cursors || {}
      // 본인 제외한 커서만 표시 (본인은 로컬에서 처리)
      const filtered = Object.fromEntries(
        Object.entries(raw).filter(([,v]) => v && v.n !== userName)
      )
      setCursors(filtered)
    })
    return () => unsub()
  }, [code, userName])

  // 컴포넌트 언마운트 시 커서 제거
  useEffect(() => {
    return () => {
      updateCursorPos(code, userName, null)
      if (drawing.current) setCurrentDrawer(code, null).catch(()=>{})
    }
  }, [code, userName]) // eslint-disable-line

  // ── 좌표 계산 ──────────────────────────────────────────────────────
  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect()
    const src = e.touches?.[0] ?? e.changedTouches?.[0] ?? e
    return {
      x: (src.clientX - r.left) * (canvas.width / r.width),
      y: (src.clientY - r.top)  * (canvas.height / r.height),
    }
  }

  // ── 모눈종이 ──────────────────────────────────────────────────────
  function drawGrid(ctx, w, h) {
    const cell=25; ctx.save()
    ctx.strokeStyle='rgba(173,213,240,0.45)'; ctx.lineWidth=0.5
    for(let x=0;x<=w;x+=cell){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
    for(let y=0;y<=h;y+=cell){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    ctx.strokeStyle='rgba(120,180,220,0.35)'; ctx.lineWidth=0.9
    for(let x=0;x<=w;x+=cell*5){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
    for(let y=0;y<=h;y+=cell*5){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
    ctx.restore()
  }

  function drawStrokes(ctx, stks) {
    stks.forEach(sk => {
      if (!sk.points?.length) return
      if (sk.type==='ruler'&&sk.points.length>=2) {
        const p1=sk.points[0],p2=sk.points[sk.points.length-1]
        ctx.beginPath();ctx.strokeStyle=sk.color;ctx.lineWidth=sk.width
        ctx.lineCap='round';ctx.lineJoin='round';ctx.globalCompositeOperation='source-over'
        ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();return
      }
      if (sk.type==='compass'&&sk.points.length>=2) {
        const ce=sk.points[0],ed=sk.points[sk.points.length-1]
        const r=Math.hypot(ed.x-ce.x,ed.y-ce.y)
        ctx.beginPath();ctx.strokeStyle=sk.color;ctx.lineWidth=sk.width
        ctx.globalCompositeOperation='source-over'
        ctx.arc(ce.x,ce.y,r,0,Math.PI*2);ctx.stroke();return
      }
      ctx.beginPath();ctx.strokeStyle=sk.color;ctx.lineWidth=sk.width
      ctx.lineCap='round';ctx.lineJoin='round'
      ctx.globalCompositeOperation=sk.eraser?'destination-out':'source-over'
      sk.points.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y))
      ctx.stroke()
    })
    ctx.globalCompositeOperation='source-over'
  }

  function redrawStrokes(stks) {
    const canvas=canvasRef.current; if(!canvas) return
    const ctx=canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,canvas.width,canvas.height)
    drawGrid(ctx,canvas.width,canvas.height)
    if (snapshotImg) {
      const img=new Image(); img.src=snapshotImg
      img.onload=()=>{ctx.globalAlpha=.5;ctx.drawImage(img,0,0,canvas.width,canvas.height);ctx.globalAlpha=1;drawStrokes(ctx,stks)}
    } else { drawStrokes(ctx,stks) }
  }

  function clearOverlay() {
    const ov=overlayRef.current; if(ov) ov.getContext('2d').clearRect(0,0,ov.width,ov.height)
  }

  function _ruler(ctx,p1,p2,clr,lw) {
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    ctx.beginPath();ctx.strokeStyle=clr;ctx.lineWidth=lw;ctx.lineCap='round';ctx.setLineDash([8,6])
    ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.setLineDash([])
    const dist=Math.hypot(p2.x-p1.x,p2.y-p1.y),cells=(dist/25).toFixed(1)
    const mx=(p1.x+p2.x)/2,my=(p1.y+p2.y)/2
    ctx.font='bold 14px sans-serif';ctx.fillStyle=clr;ctx.strokeStyle='#fff';ctx.lineWidth=3
    ctx.strokeText(`${cells}칸`,mx+6,my-8);ctx.fillText(`${cells}칸`,mx+6,my-8)
  }

  function _compass(ctx,center,edge,clr,lw) {
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    const r=Math.hypot(edge.x-center.x,edge.y-center.y)
    ctx.beginPath();ctx.strokeStyle=clr;ctx.lineWidth=lw;ctx.setLineDash([8,6])
    ctx.arc(center.x,center.y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])
    ctx.beginPath();ctx.fillStyle=clr;ctx.arc(center.x,center.y,5,0,Math.PI*2);ctx.fill()
    ctx.beginPath();ctx.strokeStyle=clr+'90';ctx.lineWidth=1.5;ctx.setLineDash([4,4])
    ctx.moveTo(center.x,center.y);ctx.lineTo(edge.x,edge.y);ctx.stroke();ctx.setLineDash([])
    const cells=(r/25).toFixed(1)
    ctx.font='bold 14px sans-serif';ctx.strokeStyle='#fff';ctx.lineWidth=3
    ctx.strokeText(`반지름 ${cells}칸`,center.x+8,center.y-r-8);ctx.fillStyle=clr;ctx.fillText(`반지름 ${cells}칸`,center.x+8,center.y-r-8)
  }

  useEffect(()=>{
    if(drawing.current) return
    const ov=overlayRef.current; if(!ov) return
    const ctx=ov.getContext('2d')
    if(!livePreview||livePreview.drawer===userName){ctx.clearRect(0,0,ov.width,ov.height);return}
    const{type,p1,p2,color:clr,width:lw}=livePreview
    if(type==='ruler'&&p1&&p2) _ruler(ctx,p1,p2,clr,lw)
    else if(type==='compass'&&p1&&p2) _compass(ctx,p1,p2,clr,lw)
    else ctx.clearRect(0,0,ov.width,ov.height)
  },[livePreview]) // eslint-disable-line

  useEffect(()=>{ if(!drawing.current) redrawStrokes(strokes) },[strokes,snapshotImg]) // eslint-disable-line

  // ── 커서 위치 전송 (mousemove 스로틀) ──────────────────────────────
  function sendCursorPos(pos) {
    myCursor.current = pos
    if (!cursorT.current) {
      cursorT.current = setTimeout(() => {
        cursorT.current = null
        if (myCursor.current) updateCursorPos(code, userName, myCursor.current)
      }, 80)
    }
  }

  // ── 마우스 이벤트 ──────────────────────────────────────────────────
  function handleStart(e) {
    if(e.type.startsWith('touch')) return
    e.preventDefault()
    const p=getPos(e,canvasRef.current)
    drawing.current=true; startPt.current=p; curStroke.current=[p]
    setCurrentDrawer(code,userName)
  }
  function handleMove(e) {
    if(e.type.startsWith('touch')) return
    e.preventDefault()
    const p=getPos(e,canvasRef.current)
    sendCursorPos(p)
    if(!drawing.current) return
    processMove(e,p)
  }
  function handleEnd(e) {
    if(e.type.startsWith('touch')) return
    e.preventDefault()
    if(!drawing.current) return
    processEnd(e)
  }
  function handleLeave() {
    // 캔버스 밖으로 나가면 커서 제거
    myCursor.current = null
    updateCursorPos(code,userName,null)
    if(drawing.current) processEnd({type:'mouseleave'})
  }

  function processMove(e,prePos) {
    if(!drawing.current) return
    const t=toolRef.current,cl=colorRef.current,w=widthRef.current
    const p = prePos || getPos(e,canvasRef.current)
    if(t==='ruler'){
      curStroke.current=[p]
      const ov=overlayRef.current; if(ov) _ruler(ov.getContext('2d'),startPt.current,p,cl,w)
      if(!previewT.current){previewT.current=setTimeout(()=>{previewT.current=null;if(drawing.current&&startPt.current)setLivePreview(code,{type:'ruler',drawer:userName,color:cl,width:w,p1:startPt.current,p2:p}).catch(()=>{})},80)}
      return
    }
    if(t==='compass'){
      curStroke.current=[p]
      const ov=overlayRef.current; if(ov) _compass(ov.getContext('2d'),startPt.current,p,cl,w)
      if(!previewT.current){previewT.current=setTimeout(()=>{previewT.current=null;if(drawing.current&&startPt.current)setLivePreview(code,{type:'compass',drawer:userName,color:cl,width:w,p1:startPt.current,p2:p}).catch(()=>{})},80)}
      return
    }
    const er=t==='eraser'
    curStroke.current.push(p)
    const ctx=canvasRef.current.getContext('2d'),pts=curStroke.current
    if(pts.length<2) return
    ctx.beginPath();ctx.strokeStyle=er?'#fff':cl;ctx.lineWidth=er?w*3:w
    ctx.lineCap='round';ctx.lineJoin='round'
    ctx.globalCompositeOperation=er?'destination-out':'source-over'
    ctx.moveTo(pts[pts.length-2].x,pts[pts.length-2].y);ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y);ctx.stroke()
    ctx.globalCompositeOperation='source-over'
  }

  async function processEnd(e) {
    if(!drawing.current) return
    drawing.current=false; clearOverlay()
    const t=toolRef.current,cl=colorRef.current,w=widthRef.current,er=t==='eraser'
    const canvas=canvasRef.current
    try {
      if(t==='ruler'&&startPt.current&&curStroke.current.length>=1){
        const fp=e.changedTouches?getPos(e,canvas):(e.type==='mouseleave'?curStroke.current[curStroke.current.length-1]||startPt.current:getPos(e,canvas))
        if(Math.hypot(fp.x-startPt.current.x,fp.y-startPt.current.y)>3)
          await addStroke(code,{drawer:userName,color:cl,width:w,eraser:false,type:'ruler',points:[startPt.current,fp]})
      } else if(t==='compass'&&startPt.current&&curStroke.current.length>=1){
        const fp=e.changedTouches?getPos(e,canvas):(e.type==='mouseleave'?curStroke.current[curStroke.current.length-1]:getPos(e,canvas))
        const r=Math.hypot(fp.x-startPt.current.x,fp.y-startPt.current.y)
        if(r>5) await addStroke(code,{drawer:userName,color:cl,width:w,eraser:false,type:'compass',points:[startPt.current,fp]})
      } else if(curStroke.current.length>1){
        await addStroke(code,{drawer:userName,color:er?'#fff':cl,width:er?w*3:w,eraser:!!er,type:'pen',points:curStroke.current})
      }
    } finally {
      curStroke.current=[];startPt.current=null
      if(previewT.current){clearTimeout(previewT.current);previewT.current=null}
      if(t==='ruler'||t==='compass') setLivePreview(code,null).catch(()=>{})
      await setCurrentDrawer(code,null)
    }
  }

  // ── 터치 non-passive ──────────────────────────────────────────────
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return
    function onTS(e){e.preventDefault();if(!e.touches?.length)return;const p=getPos(e,canvas);drawing.current=true;startPt.current=p;curStroke.current=[p];setCurrentDrawer(code,userName)}
    function onTM(e){e.preventDefault();if(!drawing.current)return;processMove(e)}
    function onTE(e){e.preventDefault();if(!drawing.current)return;processEnd(e)}
    canvas.addEventListener('touchstart',onTS,{passive:false})
    canvas.addEventListener('touchmove',onTM,{passive:false})
    canvas.addEventListener('touchend',onTE,{passive:false})
    return()=>{canvas.removeEventListener('touchstart',onTS);canvas.removeEventListener('touchmove',onTM);canvas.removeEventListener('touchend',onTE)}
  },[code,userName]) // eslint-disable-line

  async function doSave() {
    setSaving(true)
    try {
      const dataUrl=canvasRef.current.toDataURL('image/png')
      await saveCanvasSnapshot(code,dataUrl)
      const a=document.createElement('a');a.href=dataUrl;a.download='우리모둠_그래프.png';a.click()
    } finally { setSaving(false) }
  }

  const toolBtns=[
    {id:'pen',label:'펜',clr:'#FF8C42'},
    {id:'ruler',label:'자',clr:'#F97316'},
    {id:'compass',label:'컴퍼스',clr:'#8B5CF6'},
    {id:'eraser',label:'지우개',clr:'#FF6B7A'},
  ]

  // ── 커서 뱃지 렌더러 (캔버스 위 절대 위치) ──────────────────────────
  function CursorBadges({ localPos }) {
    const allCursors = []
    // 다른 유저 커서
    Object.values(cursors).forEach(cur => {
      if (!cur || !cur.n) return
      allCursors.push({ name: cur.n, x: cur.x, y: cur.y, isMe: false })
    })
    // 본인 커서 (로컬)
    if (localPos) allCursors.push({ name: userName, x: localPos.x, y: localPos.y, isMe: true })

    return allCursors.map((cur, i) => (
      <div key={i} style={{
        position: 'absolute',
        // canvas 내부 좌표(0-800, 0-480) → CSS 퍼센트
        left: `${cur.x / 800 * 100}%`,
        top: `${cur.y / 480 * 100}%`,
        transform: 'translate(8px, -50%)',
        pointerEvents: 'none',
        zIndex: 20,
      }}>
        {/* 커서 점 */}
        <div style={{
          position:'absolute', top:'50%', left:-8, transform:'translateY(-50%)',
          width:8,height:8,borderRadius:'50%',
          background: nameColor(cur.name),
          border:'1.5px solid #fff',
          boxShadow:'0 1px 4px rgba(0,0,0,0.3)',
        }}/>
        {/* 이름 뱃지 */}
        <div style={{
          background: nameColor(cur.name),
          color:'#fff',
          borderRadius: 999,
          padding:'2px 8px',
          fontSize:10,
          fontWeight:700,
          whiteSpace:'nowrap',
          boxShadow:'0 2px 8px rgba(0,0,0,0.2)',
          opacity: cur.isMe ? 0.7 : 1,
          fontFamily:'inherit',
        }}>
          {cur.isMe ? '나' : cur.name}
        </div>
      </div>
    ))
  }

  // ── 캔버스 컨테이너 공통 스타일 ─────────────────────────────────────
  const canvasCommonStyle = {
    position:'absolute',top:0,left:0,width:'100%',height:'100%',
    display:'block',background:'#fff',
    cursor: tool==='eraser'?'none':'crosshair', // none: eraser cursor not shown, badge handles it
    touchAction:'none',
  }

  // ── 도구 UI (재사용, compact=전체화면) ─────────────────────────────
  function ToolRows({ compact }) {
    return (
      <>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:5,flexShrink:0}}>
          {toolBtns.map(tb=>(
            <button key={tb.id} onClick={()=>setTool(tb.id)} style={{
              padding:compact?'4px 10px':'5px 13px',
              borderRadius:8,fontSize:12,fontWeight:700,fontFamily:'inherit',
              background:tool===tb.id?tb.clr+'18':'transparent',
              border:`1.5px solid ${tool===tb.id?tb.clr:'#E6D8C8'}`,
              color:tool===tb.id?tb.clr:'#8C7B6E',cursor:'pointer',transition:'all .15s',
            }}>{tb.label}</button>
          ))}
          {tool==='ruler'&&<span style={{fontSize:11,color:'#F97316',fontWeight:600}}>클릭→드래그</span>}
          {tool==='compass'&&<span style={{fontSize:11,color:'#8B5CF6',fontWeight:600}}>클릭→드래그</span>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:5,flexShrink:0}}>
          <div style={{display:'flex',gap:4}}>
            {DRAW_COLORS.map(clr=>(
              <button key={clr} onClick={()=>{setColor(clr);if(tool==='eraser')setTool('pen')}} style={{
                width:compact?20:24,height:compact?20:24,borderRadius:'50%',
                background:clr==='#FFFFFF'?'#f5f5f5':clr,
                border:`3px solid ${color===clr&&tool!=='eraser'?'#3D2B1F':'transparent'}`,
                cursor:'pointer',boxShadow:clr==='#FFFFFF'?'inset 0 0 0 1px #dbdbdb':'none',
              }}/>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,color:'#8C7B6E'}}>
            굵기<input type="range" min="2" max="18" value={width} step="1" onChange={e=>setWidth(+e.target.value)} style={{width:52,accentColor:'#FF8C42'}}/>
            <div style={{width:Math.max(isEraser?width*3:width,6),height:Math.max(isEraser?width*3:width,6),borderRadius:'50%',background:isEraser?'#E6D8C8':color,flexShrink:0,border:'1px solid #dbdbdb',minWidth:6,transition:'all .1s'}}/>
          </div>
        </div>
        {/* 지우기 + 그리는 사람 표시 + 저장 */}
        <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6,flexWrap:'wrap',flexShrink:0}}>
          <Btn onClick={()=>{if(!confirm('내 그림만 지울까요?'))return;deleteMyStrokes(code,userName)}} color="gray" sm>내 그림만 지우기</Btn>
          <Btn onClick={()=>{if(!confirm('모든 그림을 지울까요?'))return;clearStrokes(code);onSnapshotImg&&onSnapshotImg(null)}} color="gray" sm>전체 지우기</Btn>
          {/* 그리는 사람 표시 — 전체화면에서는 여기에, 일반모드에서는 캔버스 위에 */}
          {(compact || isFullscreen) && currentDrawer && (
            <span style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:700,
              color: currentDrawer===userName?'#5B41EB':'#3D2B1F',marginLeft:4}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:currentDrawer===userName?'#5B41EB':'#5BBF7A',animation:'pulse 1s infinite',display:'inline-block',flexShrink:0}}/>
              {currentDrawer===userName ? '내가 그리는 중' : `${currentDrawer}님이 그리는 중`}
            </span>
          )}
          {(!isMobile||compact||isFullscreen) && (
            <Btn onClick={doSave} color="green" sm disabled={saving} style={{marginLeft:'auto'}}>
              {saving?'저장 중...':'저장하기'}
            </Btn>
          )}
        </div>
      </>
    )
  }

  // ── 전체화면 레이아웃 ─────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div ref={fsWrapRef} style={{
        flex:1,minHeight:0,overflow:'hidden',
        display:'flex',flexDirection:'column',alignItems:'center',
        padding:'4px 0 0',
      }}>
        {fsDim ? (
          <div style={{width:fsDim.w,display:'flex',flexDirection:'column',flexShrink:0}}>
            <ToolRows compact={true}/>
            {/* 캔버스 */}
            <div style={{position:'relative',width:fsDim.w,height:fsDim.h,flexShrink:0}}>
              <canvas ref={canvasRef} width={800} height={480}
                style={{...canvasCommonStyle,borderRadius:6,border:'1.5px solid #dbdbdb'}}
                onMouseDown={handleStart} onMouseMove={handleMove}
                onMouseUp={handleEnd} onMouseLeave={handleLeave}
              />
              <canvas ref={overlayRef} width={800} height={480}
                style={{...canvasCommonStyle,borderRadius:6,pointerEvents:'none',background:'transparent'}}
              />
              {/* 커서 뱃지 */}
              <CursorBadges localPos={myCursor.current}/>
            </div>
          </div>
        ) : (
          // fsDim 측정 전 invisible placeholder
          <div style={{position:'relative',width:'100%',opacity:0}}>
            <canvas ref={canvasRef} width={800} height={480} style={{width:'100%',height:'auto',display:'block'}}/>
            <canvas ref={overlayRef} width={800} height={480} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none'}}/>
          </div>
        )}
      </div>
    )
  }

  // ── 일반 모드 레이아웃 ───────────────────────────────────────────
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <ToolRows compact={false}/>

      {/* 그리는 사람 표시 (일반모드) */}
      <div style={{height:22,display:'flex',alignItems:'center',gap:8,marginBottom:4,fontSize:12,color:'#8C7B6E',flexShrink:0}}>
        {currentDrawer ? (
          <span style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:6,height:6,borderRadius:'50%',
              background:currentDrawer===userName?'#5B41EB':'#5BBF7A',
              animation:'pulse 1s infinite',display:'inline-block',flexShrink:0}}/>
            <span style={{fontWeight:700,color:currentDrawer===userName?'#5B41EB':'#3D2B1F'}}>
              {currentDrawer===userName?'내가 그리는 중':`${currentDrawer}님이 그리는 중`}
            </span>
          </span>
        ) : <span style={{opacity:0}}>-</span>}
      </div>

      {/* 캔버스 */}
      <div style={{position:'relative',width:'100%',flex:isMobile?'1':undefined}}>
        <canvas ref={canvasRef} width={800} height={480}
          style={{width:'100%',borderRadius:10,border:'1.5px solid #dbdbdb',background:'#fff',
            cursor:tool==='eraser'?'none':'crosshair',touchAction:'none',display:'block',
            minHeight:isMobile?280:undefined}}
          onMouseDown={handleStart} onMouseMove={handleMove}
          onMouseUp={handleEnd} onMouseLeave={handleLeave}
        />
        <canvas ref={overlayRef} width={800} height={480}
          style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',borderRadius:10,pointerEvents:'none',background:'transparent'}}
        />
        {/* 커서 뱃지 */}
        <CursorBadges localPos={myCursor.current}/>
      </div>

      <div style={{fontSize:12,color:'#8C7B6E',marginTop:6,lineHeight:1.6,flexShrink:0}}>
        모눈종이 위에 그래프를 직접 그려 보세요. 친구들의 그림이 실시간으로 반영돼요.
      </div>

      {isMobile && (
        <div style={{marginTop:10,paddingBottom:4,flexShrink:0}}>
          <Btn onClick={doSave} color="green" full disabled={saving} style={{width:'100%'}}>
            {saving?'저장 중...':'저장하기'}
          </Btn>
        </div>
      )}
    </div>
  )
}
