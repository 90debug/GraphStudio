'use client'
import { useState } from 'react'
import { CHART_COLORS, tsNow } from '../../lib/constants'
import { useDevice } from '../../lib/DeviceContext'
import { addStep1Post, toggleLike1, addComment1 } from '../../lib/firestore'
import { Heart, MessageCircle, Crown, X, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AVATAR_COLORS = ['#5B41EB','#4EACD9','#5BBF7A','#C97DE8','#FF6B7A','#FFB432','#22D3EE','#F97316']
function nameColor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function PadletStep1Card({ post, myName, selectedPost, onLike, onComment, onDeleteComment, onSelectRequest, onDelete }) {
  const [showCmt, setShowCmt] = useState(false)
  const [cmtText, setCmtText] = useState('')
  const isMyPost   = post.name === myName
  const isLiked    = post.likedBy?.includes(myName)
  const isSelected = selectedPost?.postId === post.id || !!post.selected
  
  // 컬러 다이어트: 배경은 화이트 고정, 포인트는 왼쪽 바(bar)와 아이콘에만.
  const pal = isSelected
    ? { border: 'border-gsp-500', accent: 'bg-gsp-500', text: 'text-gsp-600', light: 'bg-gsp-50' }
    : { border: 'border-slate-100', accent: isMyPost ? 'bg-gsp-400' : 'bg-slate-200', text: 'text-slate-600', light: 'bg-slate-50' }

  async function submitCmt() {
    if (!cmtText.trim()) return
    await onComment(post.id, cmtText.trim())
    setCmtText(''); setShowCmt(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative group transition-all duration-300
        rounded-[20px] border bg-white shadow-sm
        ${pal.border} ${isSelected ? 'ring-4 ring-gsp-500/5' : 'hover:shadow-md hover:border-slate-200'}
      `}
    >
      {/* 상태 표시용 버티컬 바 (Bento Point) */}
      <div className={`absolute top-5 left-0 w-1 h-10 rounded-r-full ${pal.accent} transition-colors`} />

      {/* 책갈피 선정됨 배지 */}
      {isSelected && (
        <div style={{ position: 'absolute', top: 0, right: 18, zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', filter: 'drop-shadow(2px 6px 10px rgba(255,180,50,0.45))' }}>
          <div style={{
            width: 54, background: '#FFB432',
            borderRadius: 0,
            paddingTop: 12, paddingBottom: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
          }}>
            <Crown size={16} fill="#fff" strokeWidth={0} />
            <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>선정됨</span>
          </div>
          <div style={{ width: 0, height: 0, borderLeft: '27px solid #FFB432', borderRight: '27px solid #FFB432', borderBottom: '14px solid transparent' }} />
        </div>
      )}

      {/* 우측 상단 액션 */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isMyPost && !isSelected && (
          <button onClick={() => onDelete?.(post.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
            <X size={14} />
          </button>
        )}
      </div>

      {/* 카드 내용 */}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div style={{
            width: 28, height: 28, borderRadius: '100px',
            background: nameColor(post.name),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
            color: '#fff', flexShrink: 0,
          }}>
            {(post.name?.[0] ?? '?')}
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 leading-none">{post.name} {isMyPost && <span className="text-gsp-500 text-[9px] font-black ml-0.5">MY</span>}</p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">{post.time}</p>
          </div>
        </div>

        <h3 className="text-[15px] font-black text-slate-900 leading-tight mb-3 break-keep">
          {post.topic || post.content?.split('\n')[0]?.replace('주제: ','').replace('📌 주제: ','')}
        </h3>

        {post.question && (
          <div className="bg-slate-50/80 rounded-xl p-3 mb-4 border border-slate-100">
            <p className="text-[12px] text-slate-600 leading-relaxed">
              <span className="text-gsp-500 font-black mr-1.5">Q.</span>
              {post.question}
            </p>
          </div>
        )}

        {/* 태그: 컬러를 완전히 뺌 (그래프에서만 컬러 사용) */}
        {post.items?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.items.map((item, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200/50">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 액션 바 */}
      <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
        <div className="flex gap-4">
          <button onClick={() => onLike(post.id, !isLiked)} className="flex items-center gap-1.5 group">
            <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-300 group-hover:text-slate-400'}`} />
            <span className="text-[11px] font-extrabold text-slate-400">{post.likes || 0}</span>
          </button>
          <button onClick={() => setShowCmt(!showCmt)} className="flex items-center gap-1.5 group">
            <MessageCircle className={`w-4 h-4 transition-colors ${showCmt ? 'text-gsp-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
            <span className="text-[11px] font-extrabold text-slate-400">{post.comments?.length || 0}</span>
          </button>
        </div>
        {onSelectRequest && !isSelected && (
          <button onClick={() => onSelectRequest(post)} style={{ fontSize:11, fontWeight:900, color:'#5B41EB', padding:'6px 12px', borderRadius:999, background:'#fff', border:'1px solid #5B41EB', cursor:'pointer', fontFamily:'inherit', transition:'background .15s' }} onMouseEnter={e=>e.currentTarget.style.background='#EEEEF3'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
            주제 선정
          </button>
        )}
      </div>

      {/* 댓글 영역 — 카드 내 인라인 배치 (absolute 제거로 팝업 영역 밖 노출 문제 해소) */}
      <AnimatePresence>
        {showCmt && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{borderTop:'1px solid #f1f5f9', padding:'10px 14px 12px', background:'#fafafa', borderRadius:'0 0 20px 20px'}}>
              <div className="space-y-2">
                {post.comments?.map((cmt, i) => {
                  const isObj = typeof cmt === 'object' && cmt !== null
                  const text = isObj ? cmt.text : cmt
                  const author = isObj ? cmt.author : null
                  const isMyComment = isObj && cmt.author === myName
                  return (
                    <div key={i} className="bg-white px-3 py-2 rounded-xl text-[11px] text-slate-600 border border-slate-100 flex items-start justify-between gap-1">
                      <span>
                        {author && <span className="font-black text-gsp-500 mr-1">{author}</span>}
                        {text}
                      </span>
                      {isMyComment && onDeleteComment && (
                        <button onClick={() => onDeleteComment(post.id, cmt)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5 flex-shrink-0 mt-0.5">
                          <X size={11} strokeWidth={2.5}/>
                        </button>
                      )}
                    </div>
                  )
                })}
                <div style={{display:'flex', gap:8, paddingTop:4}}>
                  <input
                    value={cmtText}
                    onChange={e => setCmtText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && submitCmt()}
                    placeholder="의견을 남겨 주세요."
                    style={{flex:1, padding:'8px 12px', borderRadius:999, border:'1px solid #E2E3E5', fontSize:11, outline:'none', fontFamily:'inherit', minWidth:0, background:'#fff'}}
                  />
                  <button
                    onClick={submitCmt}
                    style={{padding:'8px 14px', borderRadius:999, background:'#5B41EB', color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, minHeight:36}}
                  >등록</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function Step1({ user, code, posts, selectedPost, onToast, onLike, onComment, onDeleteComment, onSelectRequest, onDelete, showModal: showModalProp, onShowModal }) {
  const device = useDevice()
  const [showModalLocal, setShowModalLocal] = useState(false)
  const showModal = showModalProp !== undefined ? showModalProp : showModalLocal
  const setShowModal = onShowModal ?? setShowModalLocal
  const [form, setForm] = useState({ topic:'', question:'', items:[] })
  const [itemInput, setItemInput] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareErr, setShareErr] = useState('')

  function addItem() {
    if (!itemInput.trim() || form.items.length >= 8) return
    setForm(f => ({ ...f, items: [...f.items, itemInput.trim()] }))
    setItemInput('')
  }
  function removeItem(idx) {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  }
  function closeModal() { setShowModal(false); setShareErr('') }

  async function doShare() {
    if (!form.topic.trim() || !form.question.trim() || !form.items.length) return
    setSharing(true); setShareErr('')
    try {
      const content = `주제: ${form.topic}\n질문: ${form.question}\n항목: ${form.items.join(', ')}`
      await addStep1Post(code, {
        name: user.name, step: 1, content,
        topic: form.topic, question: form.question, items: form.items, time: tsNow(),
      })
      setForm({ topic:'', question:'', items:[] }); setItemInput(''); closeModal()
      onToast?.('보드에 공유되었어요!')
    } catch { setShareErr('공유에 실패했어요. 다시 시도해주세요.') }
    finally { setSharing(false) }
  }

  const canShare = form.topic.trim() && form.question.trim() && form.items.length > 0

  return (
    <div className="relative flex-1 flex flex-col h-full bg-[#F3F4F8]">
      {/* 헤더 */}
      <header className="px-6 h-14 bg-white/70 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img src="/icon_01.png" alt="탐구 문제 정하기" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none tracking-tight">1단계</h1>
            <p className="text-[12px] text-slate-400 font-bold mt-1">탐구 문제 정하기</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(n => (
            <div key={n} className={`h-1 rounded-full transition-all duration-300 ${n===1 ? 'w-6 bg-gsp-600' : 'w-1.5 bg-slate-200'}`} />
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pb-40 space-y-6">
        {selectedPost && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #3b2fa0 0%, #5B41EB 60%, #7c6ff7 100%)',
              padding: '20px 24px',
              boxShadow: '0 8px 32px rgba(91,65,235,0.35)',
              minHeight: 130,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* 배경 블러 원 */}
            <div style={{ position:'absolute', top:-30, right:-30, width:160, height:160, borderRadius:8, background:'rgba(255,255,255,0.06)', pointerEvents:'none' }}/>
            <div style={{ position:'absolute', bottom:-20, left:40, width:100, height:100, borderRadius:8, background:'rgba(255,255,255,0.04)', pointerEvents:'none' }}/>

            {/* 상단: 뱃지 + 제목 */}
            <div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.18)', borderRadius:8, padding:'3px 12px', marginBottom:10 }}>
                <Crown size={12} fill="#FFB432" strokeWidth={0} />
                <span style={{ fontSize:11, fontWeight:700, color:'#fff', letterSpacing:'-0.2px' }}>우리 모둠 탐구 문제</span>
              </div>
              <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-0.5px', lineHeight:1.3, margin:0 }}>
                {selectedPost.topic}
              </h2>
            </div>

            {/* 하단: Q. 질문 + 태그 */}
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              {selectedPost.question && (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:900, color:'rgba(255,255,255,0.85)', flexShrink:0 }}>Q.</span>
                  <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.88)', letterSpacing:'-0.2px' }}>{selectedPost.question}</span>
                </div>
              )}
              {selectedPost.items?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'flex-end' }}>
                  {selectedPost.items.map((item, i) => (
                    <span key={i} style={{ padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', fontSize:12, fontWeight:600, color:'#fff', whiteSpace:'nowrap' }}>{item}</span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => (
            <PadletStep1Card key={post.id} post={post} myName={user.name} selectedPost={selectedPost}
              onLike={onLike} onComment={onComment} onDeleteComment={onDeleteComment} onSelectRequest={onSelectRequest} onDelete={onDelete}/>
          ))}
          {posts.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-3">
              <p className="text-sm font-medium text-[#8A949E]">첫 번째 아이디어를 기다리고 있어요!</p>
            </div>
          )}
        </div>
      </main>


      {/* 모달 */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4" style={{maxHeight:'calc(100dvh - 80px)',overflowY:'auto'}}
            >
              {/* 모달 헤더 */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-800">탐구 문제 작성</h3>
                </div>
                <button onClick={closeModal} className="text-slate-300 hover:text-slate-500 transition-colors p-1">
                  <X size={18} />
                </button>
              </div>

              {/* 주제 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">조사 주제</label>
                <input
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="예: 우리 반 학생들이 좋아하는 과목"
                  className="w-full px-4 py-3 bg-slate-50 border border-[#E2E3E5] rounded-[8px] text-sm font-bold text-black outline-none bg-white focus:border-gsp-500 transition-all placeholder:text-[#8A949E] placeholder:font-medium"
                />
              </div>

              {/* 질문 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">탐구 질문</label>
                <input
                  value={form.question}
                  onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="예: 어떤 과목을 가장 좋아하나요?"
                  className="w-full px-4 py-3 bg-slate-50 border border-[#E2E3E5] rounded-[8px] text-sm font-bold text-black outline-none bg-white focus:border-gsp-500 transition-all placeholder:text-[#8A949E] placeholder:font-medium"
                />
              </div>

              {/* 조사 항목 */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  조사 항목 <span className="normal-case font-medium text-slate-300">({form.items.length}/8)</span>
                </label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input
                    value={itemInput}
                    onChange={e => setItemInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addItem()}
                    placeholder="항목 입력 후 Enter"
                    style={{flex:1, minWidth:0, padding:'10px 14px', borderRadius:8, border:'1px solid #E2E3E5', fontSize:13, fontWeight:700, outline:'none', background:'#fff', fontFamily:'inherit'}}
                  />
                  <button
                    onClick={addItem}
                    style={{padding:'10px 16px', borderRadius:999, background:'#5B41EB', color:'#fff', border:'none', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap', minHeight:42}}
                  >추가</button>
                </div>
                {form.items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.items.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gsp-50 text-gsp-700 border border-gsp-100 rounded-full text-[11px] font-bold">
                        {item}
                        <button onClick={() => removeItem(i)} className="text-gsp-400 hover:text-gsp-700 transition-colors">
                          <X size={10} strokeWidth={3} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {shareErr && (
                <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">{shareErr}</p>
              )}

              <button
                onClick={doShare}
                disabled={!canShare || sharing}
                className="w-full py-3.5 bg-gsp-600 text-white rounded-full font-black text-sm shadow-lg shadow-gsp-100 hover:bg-gsp-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sharing ? '올리는 중...' : '보드에 올리기'}
              </button>
              <p className="text-center text-[11px] text-slate-400 font-medium">올리면 모든 모둠원에게 바로 보여요.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
