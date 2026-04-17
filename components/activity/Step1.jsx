'use client'
import { useState } from 'react'
import { CHART_COLORS, padletPalette, tsNow } from '../../lib/constants'
import { Sec, Tag, Btn } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import { addStep1Post, toggleLike1, addComment1 } from '../../lib/firestore'

function PadletStep1Card({ post, myName, selectedPost, onLike, onComment, onSelectRequest, onDelete }) {
  const [showCmt, setShowCmt] = useState(false)
  const [cmtText, setCmtText] = useState('')
  const isMyPost   = post.name === myName
  const isLiked    = post.likedBy?.includes(myName)
  const isSelected = selectedPost?.postId === post.id || !!post.selected
  const pal = isSelected
    ? { bg:'#F0FDF4', border:'#34D399', hdr:'#DCFCE7', avBg:'#D1FAE5', avFg:'#047857' }
    : isMyPost
      ? { bg:'#FEFCE8', border:'#FCD34D', hdr:'#FFFBEB', avBg:'#FEF3C7', avFg:'#92400E' }
      : padletPalette(post.name)

  async function toggleLike() { await onLike(post.id, !isLiked) }
  async function submitCmt() {
    if (!cmtText.trim()) return
    await onComment(post.id, cmtText.trim())
    setCmtText(''); setShowCmt(false)
  }

  return (
    <div className={`padlet-card-item postcard-wrap${isSelected?' card-selected-pulse':''}`} style={{
      background:pal.bg, border:`2px solid ${pal.border}`, borderRadius:14, overflow:'visible', position:'relative',
      boxShadow:isSelected?`0 0 0 3px ${pal.border}55,0 8px 28px rgba(0,0,0,.18)`:`0 4px 16px rgba(0,0,0,.13)`,
    }}>
      {isSelected&&<div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)',zIndex:20,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
        <span className="crown-icon" style={{fontSize:24,lineHeight:1,display:'block'}}>👑</span>
      </div>}
      {isMyPost&&!isSelected&&<div style={{position:'absolute',top:-8,left:12,zIndex:10,padding:'2px 8px',borderRadius:999,background:'#F59E0B',color:'#fff',fontSize:10,fontWeight:800,boxShadow:'0 1px 4px rgba(245,158,11,.4)'}}>내 글</div>}
      {isMyPost&&!isSelected&&<button onClick={()=>onDelete&&onDelete(post.id)} className="postcard-close" style={{position:'absolute',top:-8,right:-8,zIndex:10,width:22,height:22,borderRadius:'50%',background:'#EF4444',color:'#fff',border:'2px solid #fff',fontSize:11,fontWeight:800,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(239,68,68,.45)'}}>✕</button>}
      {isSelected&&<div style={{position:'absolute',top:8,right:10,zIndex:10,padding:'3px 9px',borderRadius:999,background:'#10B981',color:'#fff',fontSize:11,fontWeight:700,boxShadow:'0 2px 8px rgba(16,185,129,.4)'}}>✅ 선정됨</div>}

      <div style={{padding:'10px 12px 8px',display:'flex',alignItems:'center',gap:8,background:pal.hdr,borderRadius:'12px 12px 0 0'}}>
        <div style={{width:30,height:30,borderRadius:'50%',flexShrink:0,background:pal.avBg,color:pal.avFg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>{(post.name||'?')[0]}</div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'#1E293B'}}>{post.name}{isMyPost&&<span style={{fontSize:11,color:'#94A3B8',fontWeight:400}}> (나)</span>}</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>{post.time}</div>
        </div>
        {onSelectRequest&&!isSelected&&(
          <button onClick={()=>onSelectRequest(post)} style={{fontSize:12,fontWeight:700,padding:'5px 11px',borderRadius:8,border:'1.5px solid #10B981',background:'#fff',color:'#10B981',cursor:'pointer',flexShrink:0,fontFamily:'inherit',transition:'all .15s',minHeight:36}}
            onMouseEnter={e=>{e.currentTarget.style.background='#10B981';e.currentTarget.style.color='#fff'}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.color='#10B981'}}>선정</button>
        )}
      </div>

      <div style={{padding:'10px 14px'}}>
        <div style={{fontSize:15,fontWeight:800,color:'#1E293B',lineHeight:1.35,marginBottom:5}}>
          {post.topic||post.content?.split('\n')[0]?.replace('📌 주제: ','')}
        </div>
        {post.question&&<div style={{fontSize:12,color:'#475569',marginBottom:9,lineHeight:1.55}}>📌 {post.question}</div>}
        {post.items?.length>0&&(
          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
            {post.items.map((item,i)=>(
              <span key={i} style={{padding:'3px 9px',borderRadius:999,fontSize:11,fontWeight:700,
                background:CHART_COLORS[i%CHART_COLORS.length]+'18',color:CHART_COLORS[i%CHART_COLORS.length],
                border:`1.5px solid ${CHART_COLORS[i%CHART_COLORS.length]}30`}}>{item}</span>
            ))}
          </div>
        )}
      </div>

      {post.comments?.map((c,i)=>(
        <div key={i} style={{fontSize:12,color:'#64748B',padding:'2px 14px 2px 18px',borderLeft:`2px solid ${pal.border}`,margin:'0 14px 3px',lineHeight:1.6}}>{c}</div>
      ))}

      <div style={{padding:'7px 10px 9px',display:'flex',alignItems:'center',gap:5,borderTop:`1px solid ${pal.border}50`}}>
        <button onClick={toggleLike} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,lineHeight:1,transition:'transform .15s',padding:'4px',minWidth:36,minHeight:36,display:'flex',alignItems:'center',justifyContent:'center'}}
          onMouseEnter={e=>e.currentTarget.style.transform='scale(1.25)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
          {isLiked?'❤️':'🤍'}
        </button>
        <button onClick={()=>setShowCmt(!showCmt)} style={{background:'none',border:'none',cursor:'pointer',fontSize:15,lineHeight:1,color:'#94A3B8',padding:'4px',minWidth:36,minHeight:36,display:'flex',alignItems:'center',justifyContent:'center'}}>💬</button>
        {(post.likes>0||post.comments?.length>0)&&(
          <span style={{fontSize:11,color:'#94A3B8'}}>
            {post.likes>0&&<b style={{color:'#475569'}}>♥ {post.likes}</b>}
            {post.likes>0&&post.comments?.length>0&&' · '}
            {post.comments?.length>0&&`댓글 ${post.comments.length}`}
          </span>
        )}
      </div>

      {showCmt&&(
        <div style={{padding:'0 12px 12px',display:'flex',gap:7}}>
          <input value={cmtText} onChange={e=>setCmtText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submitCmt()}
            placeholder="댓글 달기..."
            style={{flex:1,padding:'8px 12px',borderRadius:999,border:`1.5px solid ${pal.border}`,fontSize:12,background:'#fff',outline:'none',fontFamily:'inherit'}}/>
          <button onClick={submitCmt} style={{fontSize:12,fontWeight:700,color:'#fff',background:'#4EACD9',border:'none',borderRadius:8,cursor:'pointer',padding:'8px 12px',fontFamily:'inherit',minHeight:36}}>게시</button>
        </div>
      )}
    </div>
  )
}

export default function Step1({ user, code, posts, selectedPost, onToast, onLike, onComment, onSelectRequest, onDelete }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'

  const [showModal, setShowModal] = useState(false)
  const [form,      setForm]      = useState({ topic:'', question:'', items:[] })
  const [itemInput, setItemInput] = useState('')
  const [sharing,   setSharing]   = useState(false)
  const [dragIdx,   setDragIdx]   = useState(null)
  const [shareErr,  setShareErr]  = useState('')

  function addItem() {
    if (!itemInput.trim()) return
    if (form.items.length>=8) return
    setForm(f=>({...f,items:[...f.items,itemInput.trim()]})); setItemInput('')
  }
  function removeItem(i) { setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)})) }
  function onDragStart(i) { setDragIdx(i) }
  function onDragEnter(i) {
    if (dragIdx===null||dragIdx===i) return
    const next=[...form.items]; const [moved]=next.splice(dragIdx,1); next.splice(i,0,moved)
    setForm(f=>({...f,items:next})); setDragIdx(i)
  }

  async function doShare() {
    if (!form.topic.trim()||!form.question.trim()||!form.items.length) return
    setSharing(true); setShareErr('')
    try {
      const content=`📌 주제: ${form.topic}\n🔍 질문: ${form.question}\n📋 항목: ${form.items.join(', ')}`
      await addStep1Post(code,{name:user.name,step:1,content,topic:form.topic,question:form.question,items:form.items,time:tsNow()})
      setForm({topic:'',question:'',items:[]}); setItemInput(''); setShowModal(false)
      onToast&&onToast('🚀 보드에 공유되었어요!')
    } catch(err) { setShareErr('공유에 실패했어요. 잠시 후 다시 시도해 주세요.') }
    finally { setSharing(false) }
  }

  const ready = form.topic.trim()&&form.question.trim()&&form.items.length>0

  // 모바일: 1열, PC/태블릿: 3열
  const gridCols = isMobile ? '1fr' : 'repeat(3, 1fr)'

  // ── 작성 폼 (모바일: 바텀시트 스타일 / PC: 기존 오버레이) ─────────────────
  const formContent = (
    <div style={{background:'#fff',borderRadius:isMobile?'20px 20px 0 0':20,padding:'24px 22px 20px',width:'100%',maxWidth:isMobile?'100%':'min(420px,96vw)',maxHeight:isMobile?'80vh':'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.25)',animation:'fadeUp .25s cubic-bezier(.34,1.3,.64,1)'}}>
      {/* 모바일 핸들 */}
      {isMobile&&<div style={{width:36,height:4,background:'#E2E8F2',borderRadius:999,margin:'-8px auto 16px'}}/>}
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18}}>
        <span style={{fontSize:18}}>📝</span>
        <span style={{fontSize:17,fontWeight:800,color:'#1E293B'}}>탐구 문제 작성</span>
        <button onClick={()=>setShowModal(false)} style={{marginLeft:'auto',width:30,height:30,borderRadius:'50%',background:'#F1F5F9',border:'none',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B'}}>✕</button>
      </div>

      {[{label:'📌 조사 주제',key:'topic',ph:'예: 우리 반 학생들이 좋아하는 간식의 종류'},{label:'🔍 조사 질문',key:'question',ph:'예: 가장 자주 먹는 간식은 무엇인가요?'}].map(f=>(
        <div key={f.key} style={{marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:'#64748B',marginBottom:6}}>{f.label}</div>
          <input value={form[f.key]} onChange={e=>{setForm(p=>({...p,[f.key]:e.target.value}));setShareErr('')}}
            placeholder={f.ph} style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #CBD5E1',fontSize:14,background:'#F8FAFC',outline:'none',fontFamily:'inherit'}}
            onFocus={e=>e.target.style.borderColor='#F97316'} onBlur={e=>e.target.style.borderColor='#CBD5E1'}/>
        </div>
      ))}

      <div style={{fontSize:13,fontWeight:700,color:'#64748B',marginBottom:4}}>📋 조사 항목 <span style={{fontSize:11,fontWeight:400,color:'#94A3B8',marginLeft:6}}>최대 8개</span></div>
      <div style={{display:'flex',gap:6,marginBottom:form.items.length>0?10:0}}>
        <input value={itemInput} onChange={e=>setItemInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()}
          placeholder="예: 과자"
          style={{flex:1,padding:'10px 14px',borderRadius:10,border:'1.5px solid #CBD5E1',fontSize:14,background:'#F8FAFC',outline:'none',fontFamily:'inherit'}}
          onFocus={e=>e.target.style.borderColor='#F97316'} onBlur={e=>e.target.style.borderColor='#CBD5E1'}/>
        <button onClick={addItem} disabled={!itemInput.trim()||form.items.length>=8}
          style={{padding:'10px 16px',borderRadius:10,background:(!itemInput.trim()||form.items.length>=8)?'#E2E8F2':'#1E293B',color:(!itemInput.trim()||form.items.length>=8)?'#94A3B8':'#fff',border:'none',fontSize:14,fontWeight:700,cursor:(!itemInput.trim()||form.items.length>=8)?'not-allowed':'pointer',fontFamily:'inherit',flexShrink:0,transition:'all .15s',minHeight:44}}>추가</button>
      </div>

      {form.items.length>0&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
          {form.items.map((item,i)=>(
            <div key={i} draggable onDragStart={()=>onDragStart(i)} onDragEnter={()=>onDragEnter(i)} onDragEnd={()=>setDragIdx(null)} onDragOver={e=>e.preventDefault()}
              style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:999,fontSize:12,fontWeight:700,background:CHART_COLORS[i%CHART_COLORS.length]+'15',color:CHART_COLORS[i%CHART_COLORS.length],border:`1.5px solid ${CHART_COLORS[i%CHART_COLORS.length]}35`,cursor:'grab',opacity:dragIdx===i?.5:1,userSelect:'none'}}>
              {item}
              <button onClick={()=>removeItem(i)} style={{fontSize:14,color:'inherit',background:'none',border:'none',cursor:'pointer',lineHeight:1,padding:0,minWidth:20,minHeight:20}}>×</button>
            </div>
          ))}
        </div>
      )}

      {shareErr&&<div style={{marginTop:10,padding:'8px 12px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,fontSize:12,color:'#DC2626',fontWeight:600}}>⚠️ {shareErr}</div>}

      <button onClick={doShare} disabled={!ready||sharing} style={{width:'100%',padding:'13px',borderRadius:12,marginTop:16,background:ready&&!sharing?'linear-gradient(135deg,#F97316,#EF4444)':'#E2E8F2',color:ready&&!sharing?'#fff':'#94A3B8',border:'none',fontSize:15,fontWeight:700,cursor:ready&&!sharing?'pointer':'not-allowed',fontFamily:'inherit',transition:'all .15s',boxShadow:ready&&!sharing?'0 4px 14px rgba(249,115,22,.35)':'none',minHeight:48}}>
        {sharing?'공유 중...':'🚀 보드에 올리기'}
      </button>
      <div style={{fontSize:12,color:'#94A3B8',textAlign:'center',marginTop:8}}>💡 올리면 모든 모둠원에게 바로 보여요</div>
    </div>
  )

  return (
    <div style={{position:'relative',flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 18px',background:'linear-gradient(135deg,#FFF3E8,#fff)',borderBottom:'2px solid #FFCB96',flexShrink:0,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-10,top:-10,width:50,height:50,borderRadius:'50%',background:'rgba(255,140,66,.10)',pointerEvents:'none'}}/>
        <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#FF8C42,#D4601A)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14,fontWeight:800,flexShrink:0,boxShadow:'0 4px 10px rgba(255,140,66,.45)'}}>1</div>
        <div style={{fontWeight:800,fontSize:15,color:'#D4601A',letterSpacing:'-0.2px'}}>탐구 문제 정하기</div>
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          {[1,2,3,4].map(n=><div key={n} style={{width:n<=1?20:8,height:7,borderRadius:999,background:n<=1?'#FF8C42':'#E6D8C8',boxShadow:n<=1?'0 2px 6px rgba(255,140,66,.40)':'none'}}/>)}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding: isMobile ? '12px 12px 80px' : '16px 20px 80px',backgroundImage:"url('/bg-activity.png')",backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'local'}}>

        {/* 선정된 문제 배너 */}
        {selectedPost&&(
          <div style={{background:'linear-gradient(135deg,#0F172A 0%,#1E293B 60%,#0F172A 100%)',border:'2px solid #22D3EE',borderRadius:14,padding: isMobile ? '10px 12px' : '14px 18px',marginBottom:14,boxShadow:'0 0 0 1px #22D3EE30,0 0 20px #22D3EE40,0 8px 24px rgba(0,0,0,.5)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,pointerEvents:'none',backgroundImage:'repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.15) 3px,rgba(0,0,0,.15) 4px)'}}/>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{display:'flex',gap:4}}>
                {['#EF4444','#FBBF24','#22D3EE'].map(c=><div key={c} style={{width:8,height:8,borderRadius:'50%',background:c,boxShadow:`0 0 6px ${c}`}}/>)}
              </div>
              <span style={{fontSize:10,fontWeight:800,color:'#22D3EE',letterSpacing:3,textShadow:'0 0 8px #22D3EE',textTransform:'uppercase'}}>✅ 우리 모둠의 탐구 문제</span>
            </div>
            <div style={{fontSize: isMobile ? 15 : 18,fontWeight:800,color:'#F0FDF4',letterSpacing:'-0.3px',lineHeight:1.3,marginBottom:8,textShadow:'0 0 12px rgba(34,211,238,.6)'}}>{selectedPost.topic}</div>
            <div style={{fontSize:13,color:'#94A3B8',marginBottom:8,lineHeight:1.6,borderLeft:'2px solid #22D3EE60',paddingLeft:10}}>
              <span style={{color:'#22D3EE',fontWeight:700}}>Q.</span> {selectedPost.question}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {selectedPost.items?.map((item,i)=>(
                <span key={i} style={{padding:'3px 10px',borderRadius:6,fontSize:11,fontWeight:700,background:CHART_COLORS[i%CHART_COLORS.length]+'22',color:CHART_COLORS[i%CHART_COLORS.length],border:`1px solid ${CHART_COLORS[i%CHART_COLORS.length]}55`,boxShadow:`0 0 6px ${CHART_COLORS[i%CHART_COLORS.length]}30`}}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {/* 카드 그리드 */}
        {posts.length===0?(
          <div style={{textAlign:'center',padding:'40px 20px',color:'#475569'}}>
            <div style={{fontSize:48,marginBottom:12}}>📋</div>
            <div style={{fontSize:15,fontWeight:700,color:'#334155',marginBottom:6}}>아직 올라온 탐구 문제가 없어요</div>
            <div style={{fontSize:13}}>하단 <b style={{color:'#F97316'}}>+</b> 버튼을 눌러서 첫 번째 아이디어를 올려보세요!</div>
          </div>
        ):(
          <div style={{display:'grid',gridTemplateColumns:gridCols,gap: isMobile ? 14 : 12}}>
            {posts.map(post=>(
              <PadletStep1Card key={post.id} post={post} myName={user.name} selectedPost={selectedPost}
                onLike={onLike} onComment={onComment} onSelectRequest={onSelectRequest} onDelete={onDelete}/>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {!showModal&&<button className="padlet-fab" onClick={()=>setShowModal(true)} title="탐구 문제 추가하기" style={{bottom: isMobile ? 16 : 22}}>＋</button>}

      {/* 모달: 모바일=바텀시트, PC=중앙 오버레이 */}
      {showModal&&(
        isMobile ? (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',zIndex:100,display:'flex',flexDirection:'column',justifyContent:'flex-end'}}
            onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
            {formContent}
          </div>
        ) : (
          <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.45)',backdropFilter:'blur(3px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
            onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
            {formContent}
          </div>
        )
      )}
    </div>
  )
}
