'use client'
import { useState, useRef } from 'react'
import { CHART_COLORS, CHECKLIST } from '../../lib/constants'
import { Btn } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import { CHART_CMPS } from './charts'
import { addStep4Post, loadCanvasSnapshot } from '../../lib/firestore'
import { tsNow } from '../../lib/constants'
import { Heart, MessageCircle, X, ZoomIn } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── 이미지 확대 모달 (PC 전용) ─────────────────────────────────────────────────
function ImageModal({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:99999,
        background:'rgba(0,0,0,0.80)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'zoom-out',
      }}
    >
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative', maxWidth:'95vw', maxHeight:'95vh' }}>
        <img
          src={src}
          alt="확대 이미지"
          style={{
            maxWidth:'95vw', maxHeight:'95vh',
            borderRadius:16, boxShadow:'0 24px 80px rgba(0,0,0,0.55)',
            objectFit:'contain', display:'block',
          }}
        />
        <button
          onClick={onClose}
          style={{
            position:'absolute', top:-14, right:-14,
            width:36, height:36, borderRadius:'50%',
            background:'#fff', border:'none',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', boxShadow:'0 2px 12px rgba(0,0,0,0.2)',
            color:'#334155', fontSize:14, fontWeight:800,
          }}
        ><X size={16}/></button>
      </div>
    </div>
  )
}

// ── 차트 확대 모달 (PC 전용) ───────────────────────────────────────────────────
function ChartModal({ children, title, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:99999,
        background:'rgba(0,0,0,0.72)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'zoom-out',
      }}
    >
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          background:'#fff', borderRadius:20,
          padding:'32px 40px 40px',
          maxWidth:'90vw', width:860,
          boxShadow:'0 24px 80px rgba(0,0,0,0.40)',
          cursor:'default', position:'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position:'absolute', top:14, right:14,
            width:32, height:32, borderRadius:'50%',
            background:'#F1F5F9', border:'none',
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer', color:'#64748B',
          }}
        ><X size={15}/></button>
        {title && (
          <div style={{ fontWeight:800, fontSize:18, color:'#1E293B', textAlign:'center', marginBottom:24 }}>{title}</div>
        )}
        <div>{children}</div>
      </div>
    </div>
  )
}

// ── 아바타 색상 ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#5B41EB','#4EACD9','#5BBF7A','#C97DE8','#FF6B7A','#FFB432','#22D3EE','#F97316']
function nameColor(name) {
  let h = 0
  for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ── 공유 카드 ─────────────────────────────────────────────────────────────────
function PadletStep4Card({ post, myName, onLike, onComment, onDeleteComment, onDelete }) {
  const [showCmt, setShowCmt] = useState(false)
  const [cmtText, setCmtText] = useState('')
  const isMyPost = post.name === myName
  const isLiked  = post.likedBy?.includes(myName)
  const doneCount = post.doneCount ?? (post.checks ? Object.values(post.checks).filter(Boolean).length : 0)
  const accentColor = nameColor(post.name)

  async function toggleLike() { if (onLike) await onLike(post.id, !isLiked) }
  async function submitCmt() {
    if (!cmtText.trim()) return
    await onComment(post.id, cmtText.trim())
    setCmtText('')
  }

  return (
    <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
      className="relative group transition-all duration-300 rounded-[20px] border bg-white shadow-sm border-slate-100 hover:shadow-md hover:border-slate-200">
      <div style={{ position:'absolute', top:20, left:0, width:4, height:40, borderRadius:'0 4px 4px 0', background:accentColor }} />
      {isMyPost && (
        <div className="absolute top-4 right-4">
          <button onClick={() => onDelete?.(post.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><X size={14}/></button>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div style={{ width:28, height:28, borderRadius:'100px', background:accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {post.name?.[0] ?? '?'}
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 leading-none">{post.name} {isMyPost && <span className="text-gsp-500 text-[9px] font-black ml-0.5">MY</span>}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">{post.time}</p>
          </div>
        </div>
        {post.noteTexts?.length > 0 && (
          <div className="mb-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">알 수 있는 사실</div>
            <div className="flex flex-col gap-1.5">
              {post.noteTexts.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-slate-600 leading-relaxed">
                  <div style={{ width:6, height:6, borderRadius:'50%', marginTop:5, flexShrink:0, background:CHART_COLORS[i%CHART_COLORS.length] }}/>
                  {t}
                </div>
              ))}
            </div>
          </div>
        )}
        {post.ps && (
          <div className="mb-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">탐구 문제 해결</div>
            <div className="text-[12px] text-slate-600 leading-relaxed px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 whitespace-pre-line">{post.ps}</div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div style={{ width:`${Math.round(doneCount/CHECKLIST.length*100)}%`, height:'100%', background:accentColor, borderRadius:999, transition:'width .4s' }}/>
          </div>
          <span className="text-[10px] font-bold text-slate-400">{doneCount}/{CHECKLIST.length}</span>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-50 flex items-center gap-4">
        <button onClick={toggleLike} className="flex items-center gap-1.5 group">
          <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-300 group-hover:text-slate-400'}`}/>
          <span className="text-[11px] font-extrabold text-slate-400">{post.likes||0}</span>
        </button>
        <button onClick={() => setShowCmt(s=>!s)} className="flex items-center gap-1.5 group">
          <MessageCircle className={`w-4 h-4 transition-colors ${showCmt ? 'text-gsp-500' : 'text-slate-300 group-hover:text-slate-400'}`}/>
          <span className="text-[11px] font-extrabold text-slate-400">{post.comments?.length||0}</span>
        </button>
      </div>
      <AnimatePresence>
        {showCmt && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} transition={{ duration:0.18 }} style={{ overflow:'hidden' }}>
            <div style={{ borderTop:'1px solid #f1f5f9', padding:'10px 14px 12px', background:'#fafafa', borderRadius:'0 0 20px 20px' }}>
              <div className="space-y-2">
                {post.comments?.map((c, i) => {
                  const isObj = typeof c==='object' && c!==null
                  const text = isObj ? c.text : c
                  const author = isObj ? c.author : null
                  const isMyComment = isObj && c.author===myName
                  return (
                    <div key={i} className="bg-white px-3 py-2 rounded-xl text-[11px] text-slate-600 border border-slate-100 flex items-start justify-between gap-1">
                      <span>{author && <span className="font-black text-gsp-500 mr-1">{author}</span>}{text}</span>
                      {isMyComment && onDeleteComment && (
                        <button onClick={() => onDeleteComment(post.id, c)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5 flex-shrink-0 mt-0.5"><X size={11} strokeWidth={2.5}/></button>
                      )}
                    </div>
                  )
                })}
                <div style={{ display:'flex', gap:8, paddingTop:4 }}>
                  <input value={cmtText} onChange={e=>setCmtText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.nativeEvent.isComposing&&submitCmt()} placeholder="의견을 남겨 주세요."
                    style={{ flex:1, padding:'8px 12px', borderRadius:999, border:'1px solid #E2E3E5', fontSize:11, outline:'none', fontFamily:'inherit', minWidth:0, background:'#fff' }}/>
                  <button onClick={submitCmt} style={{ padding:'8px 14px', borderRadius:999, background:'#5B41EB', color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, minHeight:36 }}>등록</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── WorkPanel
// ps, checks, loadedImg 는 로컬 state — Firestore 동기화 없음 (개인 작성)
function WorkPanel({ code, user, items, dataTable, chartConfig }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'
  const [loadingImg, setLoadingImg] = useState(false)
  const [noteInput,  setNoteInput]  = useState('')
  const [notes,      setNotes]      = useState([])
  const [sharing,    setSharing]    = useState(false)

  // ▼ 개인 로컬 state — 모둠원에게 동기화되지 않음
  const [ps,       setPs]       = useState('')
  const [checks,   setChecks]   = useState({})

  // 직접 그린 그래프: sessionStorage로 영속화 (다른 step 이동 후 복귀해도 유지)
  const SESSION_KEY = `step4_canvas_${code}`
  const [loadedImg, setLoadedImg] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) || null } catch { return null }
  })
  function saveLoadedImg(img) {
    setLoadedImg(img)
    try {
      if (img) sessionStorage.setItem(SESSION_KEY, img)
      else     sessionStorage.removeItem(SESSION_KEY)
    } catch {}
  }

  // 이미지 확대 모달 state (PC 전용)
  const [modalImgSrc,    setModalImgSrc]    = useState(null)
  const [showChartModal, setShowChartModal] = useState(false)

  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || CHART_CMPS.bar
  const hasData   = dataTable.some(d => Number(d.value) > 0)
  const doneCount = Object.values(checks).filter(Boolean).length
  const canShare  = notes.length > 0 || ps.trim() !== '' || doneCount > 0

  async function doLoadCanvas() {
    setLoadingImg(true)
    const img = await loadCanvasSnapshot(code)
    if (img) saveLoadedImg(img)
    else alert('저장된 그림이 없어요. 3단계에서 직접 그리기 후 저장해 주세요.')
    setLoadingImg(false)
  }

  function addNote() {
    if (!noteInput.trim()) return
    setNotes(prev => [...prev, { id:Date.now(), text:noteInput.trim() }])
    setNoteInput('')
  }
  function removeNote(id) { setNotes(prev => prev.filter(n => n.id!==id)) }

  async function doShare() {
    setSharing(true)
    const noteTexts = notes.map(n => n.text)
    const content = `탐구 결과!\n사실: ${noteTexts.join(' · ')}\n성찰: ${doneCount}/${CHECKLIST.length}개 달성`
    await addStep4Post(code, { name:user.name, step:4, content, time:tsNow(), noteTexts, ps, doneCount })
    setSharing(false)
  }

  // 공통 label 스타일 (디자인 시스템 text-[12px] 기준)
  const labelStyle = { fontSize:12, fontWeight:700, color:'#64748B', marginBottom:6 }
  const guideStyle = { fontSize:12, fontWeight:400, color:'#94A3B8', marginBottom:7 }

  return (
    <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', flex:1 }}>
      <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:14 }}>

        {/* 이미지 확대 모달 (PC 전용) */}
        {!isMobile && modalImgSrc && (
          <ImageModal src={modalImgSrc} onClose={()=>setModalImgSrc(null)}/>
        )}
        {!isMobile && showChartModal && (
          <ChartModal title={chartConfig.title||'완성된 그래프'} onClose={()=>setShowChartModal(false)}>
            {chartConfig.type==='pie' ? <ChartComp data={chartData} compact={true}/> : <ChartComp data={chartData}/>}
          </ChartModal>
        )}

        {/* 완성된 그래프 */}
        <div style={{ background:'#EEEEF3', border:'1px solid #e2e3e5', borderRadius:12, padding:12, marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#5B41EB', marginBottom:6 }}>{chartConfig.title||'완성된 그래프'}</div>
          {hasData ? (
            <div
              onClick={()=>{ if (!isMobile) setShowChartModal(true) }}
              title={!isMobile ? '클릭하여 확대' : undefined}
              style={{
                transform:'scale(0.82)', transformOrigin:'top left', width:'122%',
                pointerEvents: isMobile ? 'none' : 'auto',
                overflow:'hidden', borderRadius:8,
                cursor: isMobile ? 'default' : 'zoom-in',
                position:'relative',
              }}
            >
              {!isMobile && (
                <div style={{
                  position:'absolute', top:6, right:6, zIndex:2,
                  background:'rgba(91,65,235,0.85)', borderRadius:6,
                  padding:'3px 7px', display:'flex', alignItems:'center', gap:4,
                  fontSize:10, color:'#fff', fontWeight:700, pointerEvents:'none',
                }}>
                  <ZoomIn size={11}/> 확대
                </div>
              )}
              {chartConfig.type==='pie' ? <ChartComp data={chartData} compact={true}/> : <ChartComp data={chartData}/>}
            </div>
          ) : (
            <div style={{ fontSize:12, color:'#94A3B8', textAlign:'center', padding:'8px 0' }}>설문 조사 결과를 그래프로 나타내 주세요.</div>
          )}
          <button onClick={doLoadCanvas} disabled={loadingImg} style={{ marginTop:8, width:'100%', padding:'6px', borderRadius:7, border:'1px solid #e2e3e5', background:'#fff', color:'#5B41EB', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', minHeight:36 }}>
            {loadingImg ? '불러오는 중...' : '직접 그린 그래프 불러오기'}
          </button>
          {loadedImg && (
            <div style={{ position:'relative', marginTop:8 }}>
              <img
                src={loadedImg}
                alt="직접 그린 그래프"
                onClick={()=>{ if (!isMobile) setModalImgSrc(loadedImg) }}
                title={!isMobile ? '클릭하여 확대' : undefined}
                style={{
                  width:'100%', borderRadius:6, border:'1px solid #e2e3e5',
                  cursor: isMobile ? 'default' : 'zoom-in',
                  display:'block',
                }}
              />
              {!isMobile && (
                <div style={{
                  position:'absolute', top:8, right:8,
                  background:'rgba(91,65,235,0.85)', borderRadius:6,
                  padding:'3px 7px', display:'flex', alignItems:'center', gap:4,
                  fontSize:10, color:'#fff', fontWeight:700, pointerEvents:'none',
                }}>
                  <ZoomIn size={11}/> 확대
                </div>
              )}
            </div>
          )}
        </div>

        {/* 알 수 있는 사실 — 라벨 위, 좌측 정렬 */}
        <div style={{ marginBottom:12 }}>
          <div style={labelStyle}>알 수 있는 사실</div>
          <div style={{ ...guideStyle }}>그래프를 보고 알 수 있는 사실을 적어 보세요.</div>
          <div style={{ display:'flex', gap:6, marginBottom:8 }}>
            <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNote()}
              placeholder="예: 동물 등록 비율이 가장 낮습니다."
              style={{ flex:1, padding:'10px 14px', borderRadius:8, border:'1px solid #E2E3E5', fontSize:13, fontWeight:400, background:'#fff', outline:'none', fontFamily:'inherit', minHeight:42 }}
              onFocus={e=>e.target.style.borderColor='#5B41EB'} onBlur={e=>e.target.style.borderColor='#E2E3E5'}/>
            <button onClick={addNote} style={{ padding:'10px 16px', borderRadius:999, background:'#5B41EB', color:'#fff', border:'none', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap', minHeight:42 }}>추가</button>
          </div>
          {notes.length>0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {notes.map((n,i)=>(
                <div key={n.id} style={{ display:'flex', alignItems:'flex-start', gap:5, padding:'6px 10px', borderRadius:8, fontSize:12, fontWeight:500, lineHeight:1.5, background:CHART_COLORS[i%CHART_COLORS.length]+'12', border:`1px solid ${CHART_COLORS[i%CHART_COLORS.length]}25`, position:'relative' }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', marginTop:6, flexShrink:0, background:CHART_COLORS[i%CHART_COLORS.length] }}/>
                  <span style={{ flex:1 }}>{n.text}</span>
                  <button onClick={()=>removeNote(n.id)} style={{ position:'absolute', top:-7, right:-7, width:18, height:18, borderRadius:'50%', background:'#EF4444', color:'#fff', border:'1px solid #fff', fontSize:9, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(239,68,68,.4)', fontFamily:'inherit', lineHeight:1 }}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize:12, color:'#94A3B8', textAlign:'center', padding:'4px 0' }}></div>
          )}
        </div>

        {/* 탐구 문제 해결 (구: 문제 해결 과정) */}
        <div style={{ marginBottom:12 }}>
          <div style={labelStyle}>탐구 문제 해결</div>
          <div style={guideStyle}>그래프를 이용하여 탐구 문제를 해결해 보세요.</div>
          <textarea value={ps} onChange={e=>setPs(e.target.value)}
            placeholder="예: 실천 비율이 낮은 공공 예절을 실천할 수 있도록 홍보 포스터를 만들려고 합니다."
            rows={4}
            style={{ width:'100%', padding:'9px 10px', borderRadius:8, border:'1px solid #F1F5F9', fontSize:12, background:'#F8FAFC', outline:'none', resize:'none', lineHeight:1.6, fontFamily:'inherit' }}
            onFocus={e=>e.target.style.borderColor='#5B41EB'} onBlur={e=>e.target.style.borderColor='#CBD5E1'}/>
        </div>

        {/* 체크리스트 (구: 성찰 체크리스트) */}
        <div style={{ marginBottom:12 }}>
          <div style={labelStyle}>체크리스트</div>
          {CHECKLIST.map((item,i)=>(
            <label key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:8, cursor:'pointer' }}>
              <div onClick={()=>setChecks(prev=>({...prev,[i]:!prev[i]}))}
                style={{ width:20, height:20, borderRadius:4, border:checks[i]?'none':'1px solid #5B41EB', background:checks[i]?'#5B41EB':'#fff', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', cursor:'pointer', minWidth:20 }}>
                {checks[i] && <span style={{ color:'#fff', fontSize:11, fontWeight:800 }}>✓</span>}
              </div>
              <span style={{ fontSize:12, lineHeight:1.55, color:checks[i]?'#5B41EB':'#475569', fontWeight:checks[i]?700:400, transition:'all .15s', flex:1 }}>{item}</span>
            </label>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
            <div style={{ flex:1, height:7, borderRadius:999, background:'#E2E8F2', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${Math.round(doneCount/CHECKLIST.length*100)}%`, background:'#5B41EB', borderRadius:999, transition:'width .4s' }}/>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:'#5B41EB', whiteSpace:'nowrap' }}>{doneCount}/{CHECKLIST.length} 완료</span>
          </div>
        </div>
      </div>

      {/* 공유 버튼 */}
      <div style={{ padding:12, flexShrink:0, borderTop:'1px solid #F1F5F9' }}>
        <button onClick={doShare} disabled={sharing||!canShare} style={{
          width:'100%', padding:12, borderRadius:10,
          background:(sharing||!canShare)?'#E2E8F2':'linear-gradient(135deg,#5B41EB,#4833c9)',
          color:(sharing||!canShare)?'#94A3B8':'#fff', border:'none', fontSize:13, fontWeight:700,
          cursor:(sharing||!canShare)?'not-allowed':'pointer', fontFamily:'inherit',
          boxShadow:(sharing||!canShare)?'none':'0 4px 12px rgba(139,92,246,.35)', transition:'all .2s', minHeight:44,
        }}>
          {sharing ? '공유 중...' : '보드에 공유하기'}
        </button>
      </div>
    </div>
  )
}

// ── BoardPanel ────────────────────────────────────────────────────────────────
function BoardPanel({ posts4, user, onLike4, onComment4, onDeleteComment4, onDelete4, isMobile }) {
  return (
    <div style={{ flex:1, overflowY:'auto', WebkitOverflowScrolling:'touch', padding:isMobile?'12px 12px 16px':'14px 16px 20px', background:'#F3F4F8', position:'relative' }}>
      {posts4&&posts4.length>0 ? (
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(2,1fr)', gap:12, alignItems:'start' }}>
          {posts4.map(post=>(
            <PadletStep4Card key={post.id} post={post} myName={user.name}
              onLike={onLike4} onComment={onComment4} onDeleteComment={onDeleteComment4} onDelete={onDelete4}/>
          ))}
        </div>
      ) : (
        <div style={{ textAlign:'center', padding:'40px 20px', color:'#94A3B8' }}>
          <div style={{ fontSize:44, marginBottom:10 }}>📋</div>
          <div style={{ fontSize:15, fontWeight:700, color:'#64748B', marginBottom:6 }}>아직 공유된 해석이 없어요.</div>
          <div style={{ fontSize:13 }}>해석을 작성하고<br/><b>보드에 공유하기</b>를 눌러 보세요!</div>
        </div>
      )}
    </div>
  )
}

// ── Step4 메인 ────────────────────────────────────────────────────────────────
// step4State / onStep4State prop은 더 이상 WorkPanel에 전달하지 않음 (개인 로컬 state)
export default function Step4({ user, code, items, dataTable, chartConfig, step4State, onStep4State, posts4, onLike4, onComment4, onDelete4, onDeleteComment4 }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'
  const [mobileTab,  setMobileTab]  = useState('work')
  const [collapsed,  setCollapsed]  = useState(false)

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:'#F3F4F8' }}>
      {/* 헤더 */}
      <header className="px-6 h-14 bg-white/70 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between sticky top-0 z-40" style={{ flexShrink:0 }}>
        <div className="flex items-center gap-3">
          <img src="/icon_04.png" alt="그래프 해석하기" style={{ width:36, height:36, objectFit:'contain', flexShrink:0 }}/>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none tracking-tight">4단계</h1>
            <p className="text-[12px] text-slate-400 font-bold mt-1">그래프 해석하기</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(n=>(
            <div key={n} className={`h-1 rounded-full transition-all duration-300 ${n===4?'w-6 bg-gsp-600':'w-1.5 bg-slate-200'}`}/>
          ))}
        </div>
      </header>

      {isMobile ? (
        <>
          <div style={{ display:'flex', borderBottom:'1px solid #e2e3e5', flexShrink:0, background:'#fff' }}>
            {[['work','내 해석 작성'],['board','공유 보드']].map(([id,label])=>(
              <button key={id} onClick={()=>setMobileTab(id)} style={{
                flex:1, padding:'10px 0', fontSize:13, fontWeight:mobileTab===id?800:600,
                color:mobileTab===id?'#4833c9':'#8C7B6E',
                borderBottom:`2px solid ${mobileTab===id?'#5B41EB':'transparent'}`,
                background:'none', border:'none',
                borderBottom:`2px solid ${mobileTab===id?'#5B41EB':'transparent'}`,
                cursor:'pointer', fontFamily:'inherit', minHeight:44,
              }}>{label}</button>
            ))}
          </div>
          {mobileTab==='work'
            ? <WorkPanel code={code} user={user} items={items} dataTable={dataTable} chartConfig={chartConfig}/>
            : <BoardPanel posts4={posts4} user={user} onLike4={onLike4} onComment4={onComment4} onDeleteComment4={onDeleteComment4} onDelete4={onDelete4} isMobile={true}/>
          }
        </>
      ) : (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
          <div style={{
            width:collapsed?48:'clamp(260px,32%,340px)',
            flexShrink:0, borderRight:'1px solid #E2E8F2',
            background:'#fff', display:'flex', flexDirection:'column',
            overflow:'hidden', transition:'width .3s cubic-bezier(.4,0,.2,1)',
          }}>
            <div style={{ padding:'10px 12px', borderBottom:'1px solid #F1F5F9', display:'flex', alignItems:'center', gap:8, flexShrink:0, background:'#F8FAFC' }}>
              {!collapsed && <span style={{ fontSize:13, fontWeight:700, color:'#1E293B', flex:1, whiteSpace:'nowrap' }}>내 해석 작성</span>}
              <button onClick={()=>setCollapsed(c=>!c)} style={{ width:28, height:28, borderRadius:8, border:'1px solid #F1F5F9', background:'#fff', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', color:'#64748B', flexShrink:0, marginLeft:collapsed?'auto':0, transition:'transform .3s' }}>
                {collapsed?'▶':'◀'}
              </button>
            </div>
            {!collapsed && <WorkPanel code={code} user={user} items={items} dataTable={dataTable} chartConfig={chartConfig}/>}
          </div>
          <BoardPanel posts4={posts4} user={user} onLike4={onLike4} onComment4={onComment4} onDeleteComment4={onDeleteComment4} onDelete4={onDelete4} isMobile={false}/>
        </div>
      )}
    </div>
  )
}
