'use client'
import { useState } from 'react'
import { CHART_COLORS, CHECKLIST, padletPalette } from '../../lib/constants'
import { Btn } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import { CHART_CMPS } from './charts'
import { addStep4Post, loadCanvasSnapshot } from '../../lib/firestore'
import { tsNow } from '../../lib/constants'

function PadletStep4Card({ post, myName, onLike, onComment, onDelete }) {
  const [showCmt, setShowCmt] = useState(false)
  const [cmtText, setCmtText] = useState('')
  const isMyPost = post.name === myName
  const isLiked  = post.likedBy?.includes(myName)
  const pal = isMyPost
    ? { bg:'#FDFAFF', border:'#C4B5FD', hdr:'#F5F3FF', avBg:'#EDE9FE', avFg:'#5B21B6' }
    : padletPalette(post.name)
  const doneCount4 = post.doneCount ?? (post.checks ? Object.values(post.checks).filter(Boolean).length : 0)

  async function toggleLike() { if (onLike) await onLike(post.id, !isLiked) }
  async function submitCmt() {
    if (!cmtText.trim()) return
    await onComment(post.id, cmtText.trim())
    setCmtText(''); setShowCmt(false)
  }

  return (
    <div className="padlet-card-item postcard-wrap" style={{background:pal.bg,border:`1.5px solid ${pal.border}`,borderRadius:14,overflow:'visible',position:'relative',boxShadow:'0 4px 16px rgba(0,0,0,.13)'}}>
      {isMyPost&&(
        <>
          <div style={{position:'absolute',top:-8,left:12,zIndex:10,padding:'2px 8px',borderRadius:999,background:'#8B5CF6',color:'#fff',fontSize:10,fontWeight:800}}>내 글</div>
          <button onClick={()=>onDelete&&onDelete(post.id)} className="postcard-close" style={{position:'absolute',top:-9,right:-9,zIndex:10,width:22,height:22,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'2px solid #fff',fontSize:11,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(239,68,68,.45)'}}>✕</button>
        </>
      )}
      <div style={{padding:'9px 12px 7px',display:'flex',alignItems:'center',gap:8,background:pal.hdr,borderRadius:'12px 12px 0 0'}}>
        <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:pal.avBg,color:pal.avFg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700}}>{(post.name||'?')[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'#1E293B'}}>{post.name}{isMyPost&&<span style={{fontSize:10,color:'#94A3B8',fontWeight:400}}> (나)</span>}</div>
          <div style={{fontSize:10,color:'#94A3B8'}}>{post.time}</div>
        </div>
      </div>
      <div style={{padding:'10px 12px 8px'}}>
        {post.noteTexts?.length>0&&(
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:'#8B5CF6',marginBottom:5}}>🗒️ 알 수 있는 사실</div>
            <div style={{display:'flex',flexDirection:'column',gap:3}}>
              {post.noteTexts.map((t,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:5,fontSize:12,color:'#334155',lineHeight:1.5}}>
                  <div style={{width:5,height:5,borderRadius:'50%',marginTop:5,flexShrink:0,background:CHART_COLORS[i%CHART_COLORS.length]}}/>{t}
                </div>
              ))}
            </div>
          </div>
        )}
        {post.ps&&(
          <div style={{marginBottom:8}}>
            <div style={{fontSize:11,fontWeight:700,color:'#8B5CF6',marginBottom:4}}>📝 문제 해결 과정</div>
            <div style={{fontSize:12,color:'#475569',lineHeight:1.6,padding:'7px 10px',background:'rgba(139,92,246,.06)',borderRadius:8,whiteSpace:'pre-line'}}>{post.ps}</div>
          </div>
        )}
        {!post.noteTexts?.length&&!post.ps&&<div style={{fontSize:13,color:'#334155',lineHeight:1.65,whiteSpace:'pre-line'}}>{post.content}</div>}
        <div style={{display:'flex',alignItems:'center',gap:7,marginTop:6}}>
          <div style={{flex:1,height:6,borderRadius:999,background:'#E2E8F2',overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:999,background:'#10B981',width:`${Math.round(doneCount4/CHECKLIST.length*100)}%`,transition:'width .4s'}}/>
          </div>
          <span style={{fontSize:10,fontWeight:700,color:'#10B981',whiteSpace:'nowrap'}}>{doneCount4}/{CHECKLIST.length}{doneCount4===CHECKLIST.length?' ✨':''}</span>
        </div>
      </div>
      {post.comments?.map((c,i)=>(
        <div key={i} style={{fontSize:12,color:'#64748B',padding:'2px 12px 2px 16px',borderLeft:`2px solid ${pal.border}`,margin:'0 12px 3px',lineHeight:1.6}}>{c}</div>
      ))}
      {showCmt&&(
        <div style={{padding:'0 12px 10px',display:'flex',gap:6}}>
          <input value={cmtText} onChange={e=>setCmtText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitCmt()}
            placeholder="댓글 달기..." style={{flex:1,padding:'7px 11px',borderRadius:999,border:`1.5px solid ${pal.border}`,fontSize:12,background:'#fff',outline:'none',fontFamily:'inherit'}}/>
          <button onClick={submitCmt} style={{fontSize:12,fontWeight:700,color:'#fff',background:'#8B5CF6',border:'none',borderRadius:8,cursor:'pointer',padding:'7px 12px',fontFamily:'inherit',minHeight:36}}>게시</button>
        </div>
      )}
      <div style={{padding:'7px 10px 9px',display:'flex',alignItems:'center',gap:5,borderTop:`1px solid ${pal.border}50`}}>
        <button onClick={toggleLike} style={{background:'none',border:'none',cursor:'pointer',fontSize:17,lineHeight:1,transition:'transform .15s',padding:'4px',minWidth:36,minHeight:36}}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.25)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          {isLiked?'❤️':'🤍'}
        </button>
        <button onClick={()=>setShowCmt(s=>!s)} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1,color:'#94A3B8',padding:'4px',minWidth:36,minHeight:36}}>💬</button>
        {(post.likes>0||post.comments?.length>0)&&(
          <span style={{fontSize:11,color:'#94A3B8'}}>
            {post.likes>0&&<b style={{color:'#475569'}}>♥ {post.likes}</b>}
            {post.likes>0&&post.comments?.length>0&&' · '}
            {post.comments?.length>0&&`댓글 ${post.comments.length}`}
          </span>
        )}
      </div>
    </div>
  )
}

function WorkPanel({ code, user, items, dataTable, chartConfig, step4State, onStep4State }) {
  const [loadingImg, setLoadingImg] = useState(false)
  const [noteInput,  setNoteInput]  = useState('')
  const [notes,      setNotes]      = useState([])
  const [sharing,    setSharing]    = useState(false)

  const checks    = step4State?.checks   || {}
  const ps        = step4State?.ps       || ''
  const loadedImg = step4State?.loadedImg || null

  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || CHART_CMPS.bar
  const hasData   = dataTable.some(d => Number(d.value) > 0)
  const doneCount = Object.values(checks).filter(Boolean).length
  const canShare  = notes.length > 0 || ps.trim() !== '' || doneCount > 0

  async function doLoadCanvas() {
    setLoadingImg(true)
    const img = await loadCanvasSnapshot(code)
    if (img) onStep4State({ loadedImg: img })
    else alert('저장된 그림이 없어요. Step 3에서 직접 그리기 후 저장해 주세요.')
    setLoadingImg(false)
  }

  function addNote() {
    if (!noteInput.trim()) return
    setNotes(prev => [...prev, { id: Date.now(), text: noteInput.trim() }])
    setNoteInput('')
  }
  function removeNote(id) { setNotes(prev => prev.filter(n => n.id !== id)) }

  async function doShare() {
    setSharing(true)
    const noteTexts = notes.map(n => n.text)
    const content = `💡 탐구 결과!\n사실: ${noteTexts.join(' · ')}\n성찰: ${doneCount}/${CHECKLIST.length}개 달성`
    await addStep4Post(code, { name:user.name, step:4, content, time:tsNow(), noteTexts, ps, doneCount })
    setSharing(false)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',overflow:'hidden',flex:1}}>
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:14}}>
        {/* 그래프 썸네일 */}
        <div style={{background:'#F0FDF4',border:'1.5px solid #A7F3D0',borderRadius:12,padding:12,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#047857',marginBottom:6}}>📊 {chartConfig.title||'완성된 그래프'}</div>
          {hasData?(
            <div style={{transform:'scale(0.82)',transformOrigin:'top left',width:'122%',pointerEvents:'none'}}>
              <ChartComp data={chartData}/>
            </div>
          ):(
            <div style={{fontSize:12,color:'#94A3B8',textAlign:'center',padding:'8px 0'}}>설문 조사 결과를 그래프로 나타내 주세요.</div>
          )}
          <button onClick={doLoadCanvas} disabled={loadingImg} style={{marginTop:8,width:'100%',padding:'6px',borderRadius:7,border:'1px solid #A7F3D0',background:'#fff',color:'#047857',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',minHeight:36}}>
            {loadingImg?'불러오는 중...':'📂 직접 그린 그래프 불러오기'}
          </button>
          {loadedImg&&<img src={loadedImg} alt="직접 그린 그래프" style={{width:'100%',borderRadius:6,border:'1px solid #A7F3D0',marginTop:8}}/>}
        </div>

        {/* 알 수 있는 사실 */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#64748B',marginBottom:7}}>🗒️ 알 수 있는 사실</div>
          <div style={{display:'flex',gap:6,marginBottom:8}}>
            <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addNote()}
              placeholder="예: 과자를 좋아하는 학생이 가장 많다"
              style={{flex:1,padding:'8px 10px',borderRadius:8,border:'1.5px solid #CBD5E1',fontSize:12,background:'#F8FAFC',outline:'none',fontFamily:'inherit',minHeight:40}}
              onFocus={e=>e.target.style.borderColor='#8B5CF6'} onBlur={e=>e.target.style.borderColor='#CBD5E1'}/>
            <button onClick={addNote} style={{padding:'8px 12px',borderRadius:8,background:'#1E293B',color:'#fff',border:'none',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0,minHeight:40}}>추가</button>
          </div>
          {notes.length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {notes.map((n,i)=>(
                <div key={n.id} className="note-chip-wrap" style={{display:'flex',alignItems:'flex-start',gap:5,padding:'6px 10px',borderRadius:8,fontSize:12,fontWeight:500,lineHeight:1.5,background:CHART_COLORS[i%CHART_COLORS.length]+'12',border:`1px solid ${CHART_COLORS[i%CHART_COLORS.length]}25`,position:'relative'}}>
                  <div style={{width:5,height:5,borderRadius:'50%',marginTop:6,flexShrink:0,background:CHART_COLORS[i%CHART_COLORS.length]}}/>
                  <span style={{flex:1}}>{n.text}</span>
                  <button onClick={()=>removeNote(n.id)} className="note-chip-delete" style={{position:'absolute',top:-7,right:-7,width:18,height:18,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'1.5px solid #fff',fontSize:9,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 4px rgba(239,68,68,.4)',fontFamily:'inherit',lineHeight:1}}>✕</button>
                </div>
              ))}
            </div>
          ):(
            <div style={{fontSize:12,color:'#94A3B8',textAlign:'center',padding:'8px 0'}}>그래프를 보고 알 수 있는 사실을 적어 보세요.</div>
          )}
        </div>

        {/* 문제 해결 과정 */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#64748B',marginBottom:6}}>📝 문제 해결 과정</div>
          <textarea value={ps} onChange={e=>onStep4State({ps:e.target.value})}
            placeholder="탐구 문제를 그래프로 나타낸 과정을 써 보세요." rows={4}
            style={{width:'100%',padding:'9px 10px',borderRadius:8,border:'1.5px solid #CBD5E1',fontSize:12,background:'#F8FAFC',outline:'none',resize:'none',lineHeight:1.6,fontFamily:'inherit'}}
            onFocus={e=>e.target.style.borderColor='#8B5CF6'} onBlur={e=>e.target.style.borderColor='#CBD5E1'}/>
        </div>

        {/* 체크리스트 */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'#64748B',marginBottom:7}}>✅ 성찰 체크리스트</div>
          {CHECKLIST.map((item,i)=>(
            <label key={i} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,cursor:'pointer'}}>
              <div onClick={()=>onStep4State({checks:{...checks,[i]:!checks[i]}})}
                style={{width:20,height:20,borderRadius:4,border:checks[i]?'none':'2px solid #10B981',background:checks[i]?'#10B981':'#fff',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .15s',cursor:'pointer',minWidth:20}}>
                {checks[i]&&<span style={{color:'#fff',fontSize:11,fontWeight:800}}>✓</span>}
              </div>
              <span style={{fontSize:12,lineHeight:1.55,color:checks[i]?'#10B981':'#475569',fontWeight:checks[i]?700:400,transition:'all .15s',flex:1}}>{item}</span>
            </label>
          ))}
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
            <div style={{flex:1,height:7,borderRadius:999,background:'#E2E8F2',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.round(doneCount/CHECKLIST.length*100)}%`,background:'#10B981',borderRadius:999,transition:'width .4s'}}/>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:'#10B981',whiteSpace:'nowrap'}}>{doneCount}/{CHECKLIST.length}{doneCount===CHECKLIST.length?' ✨':' 완료'}</span>
          </div>
        </div>
      </div>

      {/* 공유 버튼 */}
      <div style={{padding:12,flexShrink:0,borderTop:'1px solid #F1F5F9'}}>
        <button onClick={doShare} disabled={sharing||!canShare} style={{width:'100%',padding:12,borderRadius:10,
          background:(sharing||!canShare)?'#E2E8F2':'linear-gradient(135deg,#8B5CF6,#6D28D9)',
          color:(sharing||!canShare)?'#94A3B8':'#fff',border:'none',fontSize:13,fontWeight:700,
          cursor:(sharing||!canShare)?'not-allowed':'pointer',fontFamily:'inherit',
          boxShadow:(sharing||!canShare)?'none':'0 4px 12px rgba(139,92,246,.35)',transition:'all .2s',minHeight:44}}>
          {sharing?'공유 중...':'📤 보드에 공유하기'}
        </button>
      </div>
    </div>
  )
}

function BoardPanel({ posts4, user, onLike4, onComment4, onDelete4, isMobile }) {
  return (
    <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding: isMobile ? '12px 12px 16px' : '14px 16px 20px',backgroundImage:"url('/bg-activity.png')",backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'local',position:'relative'}}>
      {posts4&&posts4.length>0?(
        <div style={{display:'grid',gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)',gap:12,alignItems:'start'}}>
          {posts4.map(post=>(
            <PadletStep4Card key={post.id} post={post} myName={user.name} onLike={onLike4} onComment={onComment4} onDelete={onDelete4}/>
          ))}
        </div>
      ):(
        <div style={{textAlign:'center',padding:'40px 20px',color:'#94A3B8'}}>
          <div style={{fontSize:44,marginBottom:10}}>💡</div>
          <div style={{fontSize:15,fontWeight:700,color:'#64748B',marginBottom:6}}>아직 공유된 해석이 없어요</div>
          <div style={{fontSize:13}}>해석을 작성하고<br/><b>보드에 공유하기</b>를 눌러보세요!</div>
        </div>
      )}
    </div>
  )
}

export default function Step4({ user, code, items, dataTable, chartConfig, step4State, onStep4State, posts4, onLike4, onComment4, onDelete4 }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'

  // 모바일: 탭으로 작업패널/보드 전환
  const [mobileTab, setMobileTab] = useState('work')
  const [collapsed, setCollapsed] = useState(false)

  const step4Info = { bg:'#F8EFFE', bd:'#D9A4F5', c:'#C97DE8', dk:'#9A45C2' }

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',background:`linear-gradient(135deg,${step4Info.bg},#fff)`,borderBottom:`2px solid ${step4Info.bd}`,flexShrink:0,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-10,top:-10,width:50,height:50,borderRadius:'50%',background:`${step4Info.c}12`,pointerEvents:'none'}}/>
        <img src='/step4_icon.png' alt='Step 4' style={{width:36,height:36,display:'block',flexShrink:0}}/>
        <div style={{fontWeight:800,fontSize:15,color:step4Info.dk,letterSpacing:'-0.2px'}}>그래프 해석하기</div>
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          {[1,2,3,4].map(n=><div key={n} style={{width:20,height:7,borderRadius:999,background:step4Info.c,boxShadow:`0 2px 6px ${step4Info.c}40`}}/>)}
        </div>
      </div>

      {/* 모바일: 탭 전환 / PC·태블릿: 좌우 분할 */}
      {isMobile ? (
        <>
          {/* 모바일 탭 바 */}
          <div style={{display:'flex',borderBottom:'1px solid #E9D5FF',flexShrink:0,background:'#fff'}}>
            {[['work','✏️ 내 해석 작성'],['board','📋 공유 보드']].map(([id,label])=>(
              <button key={id} onClick={()=>setMobileTab(id)} style={{
                flex:1,padding:'10px 0',fontSize:13,fontWeight:mobileTab===id?800:600,
                color:mobileTab===id?step4Info.dk:'#8C7B6E',
                borderBottom:`2px solid ${mobileTab===id?step4Info.c:'transparent'}`,
                marginBottom:-1,background:'none',border:'none',
                borderBottom:`2px solid ${mobileTab===id?step4Info.c:'transparent'}`,
                cursor:'pointer',fontFamily:'inherit',minHeight:44,
              }}>{label}</button>
            ))}
          </div>
          {mobileTab==='work' ? (
            <WorkPanel code={code} user={user} items={items} dataTable={dataTable} chartConfig={chartConfig} step4State={step4State} onStep4State={onStep4State}/>
          ) : (
            <BoardPanel posts4={posts4} user={user} onLike4={onLike4} onComment4={onComment4} onDelete4={onDelete4} isMobile={true}/>
          )}
        </>
      ) : (
        /* PC · 태블릿: 기존 좌우 분할 */
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          <div style={{
            width: collapsed ? 48 : 'clamp(260px, 32%, 340px)',
            flexShrink:0, borderRight:'1.5px solid #E2E8F2',
            background:'#fff', display:'flex', flexDirection:'column',
            overflow:'hidden', transition:'width .3s cubic-bezier(.4,0,.2,1)',
          }}>
            <div style={{padding:'10px 12px',borderBottom:'1px solid #F1F5F9',display:'flex',alignItems:'center',gap:8,flexShrink:0,background:'#F8FAFC'}}>
              {!collapsed&&<span style={{fontSize:13,fontWeight:700,color:'#1E293B',flex:1,whiteSpace:'nowrap'}}>✏️ 내 해석 작성</span>}
              <button onClick={()=>setCollapsed(c=>!c)} style={{width:28,height:28,borderRadius:8,border:'1.5px solid #E2E8F2',background:'#fff',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B',flexShrink:0,marginLeft:collapsed?'auto':0,transition:'transform .3s'}}>{collapsed?'▶':'◀'}</button>
            </div>
            {!collapsed&&(
              <WorkPanel code={code} user={user} items={items} dataTable={dataTable} chartConfig={chartConfig} step4State={step4State} onStep4State={onStep4State}/>
            )}
          </div>
          <BoardPanel posts4={posts4} user={user} onLike4={onLike4} onComment4={onComment4} onDelete4={onDelete4} isMobile={false}/>
        </div>
      )}
    </div>
  )
}
