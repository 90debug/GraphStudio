'use client'
import { useState, useEffect, useRef } from 'react'
import { DRAW_COLORS } from '../../lib/constants'
import { Btn } from './ui'
import {
  addStroke, deleteMyStrokes, clearStrokes, setCurrentDrawer,
  saveCanvasSnapshot, loadCanvasSnapshot, setLivePreview,
} from '../../lib/firestore'

export default function DrawingCanvas({ code, userName, strokes, currentDrawer, livePreview, snapshotImg, onSnapshotImg }) {
  const canvasRef        = useRef(null)
  const overlayRef       = useRef(null)
  const drawing          = useRef(false)
  const startPt          = useRef(null)
  const curStroke        = useRef([])
  const previewThrottle  = useRef(null)

  const [color,  setColor]  = useState('#1C1917')
  const [width,  setWidth]  = useState(4)
  const [tool,   setTool]   = useState('pen')
  const [saving, setSaving] = useState(false)

  const eraser = tool === 'eraser'

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect()
    const src = e.touches?.[0] ?? e
    return {
      x: (src.clientX - r.left) * (canvas.width / r.width),
      y: (src.clientY - r.top)  * (canvas.height / r.height),
    }
  }

  function drawGrid(ctx, w, h) {
    const cell = 25
    ctx.save()
    ctx.strokeStyle = 'rgba(173,213,240,0.45)'; ctx.lineWidth = 0.5
    for (let x = 0; x <= w; x += cell) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke() }
    for (let y = 0; y <= h; y += cell) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke() }
    ctx.strokeStyle = 'rgba(120,180,220,0.35)'; ctx.lineWidth = 0.9
    for (let x = 0; x <= w; x += cell*5) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke() }
    for (let y = 0; y <= h; y += cell*5) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke() }
    ctx.restore()
  }

  function drawStrokes(ctx, stks) {
    stks.forEach(sk => {
      if (!sk.points?.length) return
      if (sk.type === 'ruler' && sk.points.length >= 2) {
        const p1 = sk.points[0], p2 = sk.points[sk.points.length-1]
        ctx.beginPath(); ctx.strokeStyle=sk.color; ctx.lineWidth=sk.width
        ctx.lineCap='round'; ctx.lineJoin='round'; ctx.globalCompositeOperation='source-over'
        ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); return
      }
      if (sk.type === 'compass' && sk.points.length >= 2) {
        const center=sk.points[0], edge=sk.points[sk.points.length-1]
        const r = Math.hypot(edge.x-center.x, edge.y-center.y)
        ctx.beginPath(); ctx.strokeStyle=sk.color; ctx.lineWidth=sk.width
        ctx.globalCompositeOperation='source-over'
        ctx.arc(center.x,center.y,r,0,Math.PI*2); ctx.stroke(); return
      }
      ctx.beginPath(); ctx.strokeStyle=sk.color; ctx.lineWidth=sk.width
      ctx.lineCap='round'; ctx.lineJoin='round'
      ctx.globalCompositeOperation = sk.eraser ? 'destination-out' : 'source-over'
      sk.points.forEach((p,i) => i===0 ? ctx.moveTo(p.x,p.y) : ctx.lineTo(p.x,p.y))
      ctx.stroke()
    })
    ctx.globalCompositeOperation = 'source-over'
  }

  function redrawStrokes(stks) {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,canvas.width,canvas.height)
    drawGrid(ctx, canvas.width, canvas.height)
    if (snapshotImg) {
      const img = new Image(); img.src = snapshotImg
      img.onload = () => { ctx.globalAlpha=.5; ctx.drawImage(img,0,0,canvas.width,canvas.height); ctx.globalAlpha=1; drawStrokes(ctx,stks) }
    } else { drawStrokes(ctx, stks) }
  }

  function clearOverlay() { const ov=overlayRef.current; if(ov) ov.getContext('2d').clearRect(0,0,ov.width,ov.height) }

  function _renderRulerOnCtx(ctx,p1,p2,clr,lw) {
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    ctx.beginPath(); ctx.strokeStyle=clr; ctx.lineWidth=lw; ctx.lineCap='round'; ctx.setLineDash([8,6])
    ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke(); ctx.setLineDash([])
    const dist=Math.hypot(p2.x-p1.x,p2.y-p1.y), cells=(dist/25).toFixed(1)
    const mx=(p1.x+p2.x)/2, my=(p1.y+p2.y)/2
    ctx.font='bold 14px sans-serif'; ctx.fillStyle=clr; ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.setLineDash([])
    ctx.strokeText(`${cells}칸`,mx+6,my-8); ctx.fillText(`${cells}칸`,mx+6,my-8)
  }

  function _renderCompassOnCtx(ctx,center,edge,clr,lw) {
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
    const r=Math.hypot(edge.x-center.x,edge.y-center.y)
    ctx.beginPath(); ctx.strokeStyle=clr; ctx.lineWidth=lw; ctx.setLineDash([8,6])
    ctx.arc(center.x,center.y,r,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
    ctx.beginPath(); ctx.fillStyle=clr; ctx.arc(center.x,center.y,5,0,Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.strokeStyle=clr+'90'; ctx.lineWidth=1.5; ctx.setLineDash([4,4])
    ctx.moveTo(center.x,center.y); ctx.lineTo(edge.x,edge.y); ctx.stroke(); ctx.setLineDash([])
    const cells=(r/25).toFixed(1), labelX=center.x+8, labelY=center.y-r-8
    ctx.font='bold 14px sans-serif'; ctx.strokeStyle='#fff'; ctx.lineWidth=3
    ctx.strokeText(`반지름 ${cells}칸`,labelX,labelY); ctx.fillStyle=clr; ctx.fillText(`반지름 ${cells}칸`,labelX,labelY)
  }

  useEffect(() => {
    if (drawing.current) return
    const ov = overlayRef.current; if (!ov) return
    const ctx = ov.getContext('2d')
    if (!livePreview || livePreview.drawer===userName) { ctx.clearRect(0,0,ov.width,ov.height); return }
    const {type,p1,p2,color:clr,width:lw} = livePreview
    if (type==='ruler'&&p1&&p2) _renderRulerOnCtx(ctx,p1,p2,clr,lw)
    else if (type==='compass'&&p1&&p2) _renderCompassOnCtx(ctx,p1,p2,clr,lw)
    else ctx.clearRect(0,0,ov.width,ov.height)
  }, [livePreview]) // eslint-disable-line

  useEffect(() => { redrawStrokes(strokes) }, [strokes, snapshotImg]) // eslint-disable-line

  function onStart(e) {
    e.preventDefault()
    const p = getPos(e, canvasRef.current)
    drawing.current=true; startPt.current=p; curStroke.current=[p]
    setCurrentDrawer(code, userName)
  }

  function onMove(e) {
    e.preventDefault()
    if (!drawing.current) return
    const p = getPos(e, canvasRef.current)
    if (tool==='ruler') {
      curStroke.current=[p]; const ov=overlayRef.current; if(ov) _renderRulerOnCtx(ov.getContext('2d'),startPt.current,p,color,width)
      if (!previewThrottle.current) {
        previewThrottle.current=setTimeout(()=>{
          previewThrottle.current=null
          if(drawing.current&&startPt.current) setLivePreview(code,{type:'ruler',drawer:userName,color,width,p1:startPt.current,p2:curStroke.current[curStroke.current.length-1]||startPt.current}).catch(()=>{})
        },80)
      }
      return
    }
    if (tool==='compass') {
      curStroke.current=[p]; const ov=overlayRef.current; if(ov) _renderCompassOnCtx(ov.getContext('2d'),startPt.current,p,color,width)
      if (!previewThrottle.current) {
        previewThrottle.current=setTimeout(()=>{
          previewThrottle.current=null
          if(drawing.current&&startPt.current) setLivePreview(code,{type:'compass',drawer:userName,color,width,p1:startPt.current,p2:curStroke.current[curStroke.current.length-1]||startPt.current}).catch(()=>{})
        },80)
      }
      return
    }
    curStroke.current.push(p)
    const ctx=canvasRef.current.getContext('2d'), pts=curStroke.current
    if (pts.length<2) return
    ctx.beginPath(); ctx.strokeStyle=eraser?'#fff':color; ctx.lineWidth=eraser?width*3:width
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.globalCompositeOperation=eraser?'destination-out':'source-over'
    ctx.moveTo(pts[pts.length-2].x,pts[pts.length-2].y); ctx.lineTo(pts[pts.length-1].x,pts[pts.length-1].y); ctx.stroke()
    ctx.globalCompositeOperation='source-over'
  }

  async function onEnd(e) {
    e.preventDefault(); if (!drawing.current) return
    drawing.current=false; clearOverlay()
    const canvas=canvasRef.current
    if (tool==='ruler'&&startPt.current&&curStroke.current.length>=1) {
      const finalPt=e.changedTouches?getPos({changedTouches:e.changedTouches},canvas):(e.type==='mouseleave'?curStroke.current[curStroke.current.length-1]||startPt.current:getPos(e,canvas))
      if (Math.hypot(finalPt.x-startPt.current.x,finalPt.y-startPt.current.y)>3)
        await addStroke(code,{drawer:userName,color,width,eraser:false,type:'ruler',points:[startPt.current,finalPt]})
    } else if (tool==='compass'&&startPt.current&&curStroke.current.length>=1) {
      const finalPt=e.changedTouches?getPos({changedTouches:e.changedTouches},canvas):(e.type==='mouseleave'?curStroke.current[curStroke.current.length-1]:getPos(e,canvas))
      const r=Math.hypot(finalPt.x-startPt.current.x,finalPt.y-startPt.current.y)
      if (r>5) await addStroke(code,{drawer:userName,color,width,eraser:false,type:'compass',points:[startPt.current,finalPt]})
    } else if (curStroke.current.length>1) {
      await addStroke(code,{drawer:userName,color:eraser?'#fff':color,width:eraser?width*3:width,eraser:!!eraser,type:'pen',points:curStroke.current})
    }
    curStroke.current=[]; startPt.current=null
    if (previewThrottle.current) { clearTimeout(previewThrottle.current); previewThrottle.current=null }
    if (tool==='ruler'||tool==='compass') setLivePreview(code,null).catch(()=>{})
    await setCurrentDrawer(code,null)
  }

  async function doSave() {
    setSaving(true)
    const dataUrl=canvasRef.current.toDataURL('image/png')
    await saveCanvasSnapshot(code,dataUrl)
    const a=document.createElement('a'); a.href=dataUrl; a.download='우리모둠_그래프.png'; a.click()
    setSaving(false)
  }

  const toolBtns=[
    {id:'pen',label:'펜',clr:'#FF8C42'},
    {id:'ruler',label:'자',clr:'#F97316'},
    {id:'compass',label:'컴퍼스',clr:'#8B5CF6'},
    {id:'eraser',label:'지우개',clr:'#FF6B7A'},
  ]

  return (
    <div>
      {/* Row 1: tools */}
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
        {toolBtns.map(tb=>(
          <button key={tb.id} onClick={()=>setTool(tb.id)} style={{
            padding:'5px 13px',borderRadius:8,fontSize:12,fontWeight:700,fontFamily:'inherit',
            background:tool===tb.id?tb.clr+'18':'transparent',
            border:`1.5px solid ${tool===tb.id?tb.clr:'#E6D8C8'}`,
            color:tool===tb.id?tb.clr:'#8C7B6E',cursor:'pointer',transition:'all .15s',
          }}>{tb.label}</button>
        ))}
        {tool==='ruler'&&<span style={{fontSize:11,color:'#F97316',fontWeight:600,marginLeft:4}}>클릭 → 드래그해서 선 그리기</span>}
        {tool==='compass'&&<span style={{fontSize:11,color:'#8B5CF6',fontWeight:600,marginLeft:4}}>클릭 → 드래그해서 반지름 설정</span>}
      </div>

      {/* Row 2: colors + width */}
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
        <div style={{display:'flex',gap:4}}>
          {DRAW_COLORS.map(c=>(
            <button key={c} onClick={()=>{setColor(c);if(tool==='eraser')setTool('pen')}} style={{
              width:26,height:26,borderRadius:'50%',
              background:c==='#FFFFFF'?'#f5f5f5':c,
              border:`3px solid ${color===c&&tool!=='eraser'?'#3D2B1F':'transparent'}`,
              cursor:'pointer',transition:'border .1s',
              boxShadow:c==='#FFFFFF'?'inset 0 0 0 1px #dbdbdb':'none',
            }}/>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'#8C7B6E'}}>
          굵기
          <input type="range" min="2" max="18" value={width} step="1" onChange={e=>setWidth(+e.target.value)} style={{width:64,accentColor:'#FF8C42'}}/>
          <div style={{width:Math.max(eraser?width*3:width,6),height:Math.max(eraser?width*3:width,6),borderRadius:'50%',background:eraser?'#E6D8C8':color,flexShrink:0,border:'1px solid #dbdbdb',minWidth:6,transition:'all .1s'}}/>
        </div>
      </div>

      {/* Row 3: actions */}
      <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
        <Btn onClick={()=>{if(!confirm('내 그림만 지울까요?'))return;deleteMyStrokes(code,userName)}} color="gray" sm>내 그림만 지우기</Btn>
        <Btn onClick={()=>{if(!confirm('모든 그림을 지울까요?'))return;clearStrokes(code);onSnapshotImg&&onSnapshotImg(null)}} color="gray" sm>전체 지우기</Btn>
        <Btn onClick={doSave} color="green" sm disabled={saving} style={{marginLeft:'auto'}}>
          {saving?'저장 중...':'저장하기'}
        </Btn>
      </div>

      {/* 작성자 표시 */}
      <div style={{height:28,display:'flex',alignItems:'center',gap:10,marginBottom:4,fontSize:13,color:'#8C7B6E'}}>
        {currentDrawer?(
          <span style={{display:'flex',alignItems:'center',gap:5}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'#5BBF7A',animation:'pulse 1s infinite',display:'inline-block',flexShrink:0}}/>
            <b style={{color:'#3D2B1F'}}>{currentDrawer}</b>님이 그리는 중...
          </span>
        ):<span style={{opacity:0}}>placeholder</span>}
        {livePreview&&livePreview.drawer&&livePreview.drawer!==userName&&(
          <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 10px',borderRadius:999,
            background:livePreview.type==='ruler'?'#FFF3E8':'#F8EFFE',
            border:`1.5px solid ${livePreview.type==='ruler'?'#FFCB96':'#D9A4F5'}`,
            fontSize:12,fontWeight:700,color:livePreview.type==='ruler'?'#D4601A':'#9A45C2'}}>
            <span style={{animation:'pulse 1s infinite',display:'inline-block',width:6,height:6,borderRadius:'50%',
              background:livePreview.type==='ruler'?'#FF8C42':'#C97DE8',flexShrink:0}}/>
            {livePreview.drawer}님이 {livePreview.type==='ruler'?'자':'컴퍼스'} 사용 중
          </span>
        )}
      </div>

      {/* Canvas */}
      <div style={{position:'relative',width:'100%'}}>
        <canvas ref={canvasRef} width={800} height={480}
          style={{width:'100%',borderRadius:10,border:'1.5px solid #dbdbdb',background:'#fff',cursor:tool==='eraser'?'cell':'crosshair',touchAction:'none',display:'block'}}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}/>
        <canvas ref={overlayRef} width={800} height={480}
          style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',borderRadius:10,pointerEvents:'none'}}/>
      </div>
      <div style={{fontSize:13,color:'#8C7B6E',marginTop:7,lineHeight:1.6}}>
        모눈종이 위에 그래프를 직접 그려 보세요. 친구들의 그림이 실시간으로 반영돼요.
      </div>
    </div>
  )
}
