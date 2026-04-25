'use client'
import { useState, useMemo } from 'react'
import { CHART_COLORS, tsNow } from '../../lib/constants'
import { useDevice } from '../../lib/DeviceContext'
import { addStep1Post } from '../../lib/firestore'
import { Heart, MessageCircle, Crown, X, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const AVATAR_COLORS = ['#5B41EB','#4EACD9','#5BBF7A','#C97DE8','#FF6B7A','#FFB432','#22D3EE','#F97316']
function nameColor(name) {
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ── 카드 컴포넌트 (Step4와 동일한 UX: 댓글 항상 표시, deleteDoc 방식) ──
function PadletStep1Card({ post, postComments, myName, selectedPost, onLike, onComment, onDeleteComment, onSelectRequest, onDelete }) {
  const [cmtText, setCmtText] = useState('')
  const [showInput, setShowInput] = useState(false)

  const isMyPost = post.name === myName
  const isLiked  = post.likedBy?.includes(myName)
  const isSelected = selectedPost?.postId === post.id
  const accentColor = nameColor(post.name)

  async function submitCmt() {
    if (!cmtText.trim()) return
    await onComment(post.id, cmtText.trim())
    setCmtText('')
    setShowInput(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative group transition-all duration-300 rounded-[20px] border bg-white shadow-sm
        ${isSelected ? 'border-gsp-400 shadow-gsp-100' : 'border-slate-100 hover:shadow-md hover:border-slate-200'}`}
    >
      {/* 왼쪽 버티컬 바 */}
      <div style={{ position:'absolute', top:20, left:0, width:4, height:40, borderRadius:'0 4px 4px 0', background: accentColor }} />

      {/* 삭제 버튼 (본인 글) */}
      {isMyPost && (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button onClick={() => onDelete?.(post.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 선정 표시 */}
      {isSelected && (
        <div style={{ position:'absolute', top:-8, right:12, background:'#5B41EB', color:'#fff', borderRadius:999, padding:'2px 10px', fontSize:10, fontWeight:800, display:'flex', alignItems:'center', gap:4 }}>
          <Crown size={10} /> 선정됨
        </div>
      )}

      <div className="p-5">
        {/* 작성자 헤더 */}
        <div className="flex items-center gap-2.5 mb-3">
          <div style={{ width:28, height:28, borderRadius:'100px', background:accentColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {post.name?.[0] ?? '?'}
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 leading-none">
              {post.name} {isMyPost && <span className="text-gsp-500 text-[9px] font-black ml-0.5">MY</span>}
            </p>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">{post.time}</p>
          </div>
        </div>

        {/* 주제 + 질문 */}
        <div className="space-y-1.5 mb-3">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">조사 주제</div>
          <div className="text-[13px] font-bold text-slate-700 leading-snug">{post.topic}</div>
          {post.question && (
            <div className="text-[11px] text-slate-500 leading-relaxed">{post.question}</div>
          )}
        </div>

        {/* 항목 태그 */}
        {post.items?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.items.map((item, i) => (
              <span key={i} style={{ background:`${CHART_COLORS[i % CHART_COLORS.length]}18`, color:CHART_COLORS[i % CHART_COLORS.length], border:`1px solid ${CHART_COLORS[i % CHART_COLORS.length]}30` }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                {item}
              </span>
            ))}
          </div>
        )}

        {/* 주제 선정 버튼 */}
        {!isSelected && onSelectRequest && (
          <button onClick={() => onSelectRequest(post)}
            className="w-full py-2 rounded-full text-[11px] font-black border border-gsp-200 text-gsp-600 hover:bg-gsp-50 hover:border-gsp-400 transition-all active:scale-[0.98] mb-1">
            이 탐구 문제로 정하기
          </button>
        )}
        {isSelected && (
          <div className="w-full py-2 text-center rounded-full text-[11px] font-black bg-gsp-50 text-gsp-600 border border-gsp-200 mb-1">
            <CheckCircle2 className="inline w-3 h-3 mr-1" />현재 탐구 문제
          </div>
        )}
      </div>

      {/* ── 댓글 영역 (Step4와 동일: 항상 표시) ── */}
      {postComments.length > 0 && (
        <div className="px-5 pb-2 space-y-1.5">
          {postComments.map((cmt) => {
            const isMyComment = cmt.author === myName
            return (
              <div key={cmt.commentId} className="bg-slate-50 px-3 py-1.5 rounded-xl text-[11px] text-slate-600 border border-slate-100 flex items-start justify-between gap-1">
                <span>
                  <span className="font-black mr-1" style={{color: accentColor}}>{cmt.author}</span>
                  {cmt.text}
                </span>
                {isMyComment && onDeleteComment && (
                  <button
                    onClick={() => onDeleteComment(cmt.commentId)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-0.5 flex-shrink-0 mt-0.5"
                  >
                    <X size={11} strokeWidth={2.5}/>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 댓글 입력창 (showInput=true일 때) */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity:0, height:0 }}
            animate={{ opacity:1, height:'auto' }}
            exit={{ opacity:0, height:0 }}
            style={{ overflow:'hidden' }}
          >
            <div style={{borderTop:'1px solid #f1f5f9', padding:'8px 14px 10px', background:'#fafafa', borderRadius:'0 0 20px 20px'}}>
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <input
                  value={cmtText}
                  onChange={e => setCmtText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && submitCmt()}
                  placeholder="의견을 남겨 주세요."
                  autoFocus
                  style={{flex:1, minWidth:0, padding:'8px 12px', borderRadius:999, border:'1px solid #E2E3E5', fontSize:11, outline:'none', fontFamily:'inherit', background:'#fff'}}
                />
                <button
                  onClick={submitCmt}
                  style={{padding:'8px 14px', borderRadius:999, background:'#5B41EB', color:'#fff', border:'none', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', flexShrink:0, minHeight:36}}
                >등록</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 액션 바 */}
      <div className="px-5 py-3 border-t border-slate-50 flex items-center gap-4">
        <button onClick={() => onLike?.(post.id, !isLiked)} className="flex items-center gap-1.5 group">
          <Heart className={`w-4 h-4 transition-all ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-300 group-hover:text-slate-400'}`} />
          <span className="text-[11px] font-extrabold text-slate-400">{post.likes || 0}</span>
        </button>
        <button onClick={() => setShowInput(s => !s)} className="flex items-center gap-1.5 group">
          <MessageCircle className={`w-4 h-4 transition-colors ${showInput ? 'text-gsp-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
          <span className="text-[11px] font-extrabold text-slate-400">{postComments.length}</span>
        </button>
      </div>
    </motion.div>
  )
}

// ── Step1 메인 ──
export default function Step1({ user, code, posts, selectedPost, onToast, onLike, onComment, onDeleteComment, onSelectRequest, onDelete, comments1 = [], showModal: showModalProp, onShowModal }) {
  const device = useDevice()
  const [showModalLocal, setShowModalLocal] = useState(false)
  const showModal = showModalProp !== undefined ? showModalProp : showModalLocal
  const openModal  = () => { if (onShowModal) onShowModal(true);  else setShowModalLocal(true)  }
  const closeModal = () => { if (onShowModal) onShowModal(false); else setShowModalLocal(false) }

  const [form, setForm]         = useState({ topic: '', question: '', items: [] })
  const [itemInput, setItemInput] = useState('')
  const [sharing,  setSharing]  = useState(false)
  const [shareErr, setShareErr] = useState('')

  // comments1 (subcollection) → postId별 맵
  const commentsMap = useMemo(() => {
    const map = {}
    comments1.forEach(cmt => {
      if (!map[cmt.postId]) map[cmt.postId] = []
      map[cmt.postId].push(cmt)
    })
    return map
  }, [comments1])

  function addItem() {
    const v = itemInput.trim(); if (!v || form.items.length >= 8) return
    setForm(f => ({ ...f, items: [...f.items, v] })); setItemInput('')
  }
  function removeItem(i) { setForm(f => ({ ...f, items: f.items.filter((_, j) => j !== i) })) }

  const canShare = form.topic.trim() && form.question.trim() && form.items.length >= 2

  async function doShare() {
    if (!canShare || sharing) return
    setSharing(true); setShareErr('')
    try {
      await addStep1Post(code, { name: user.name, time: tsNow(), ...form })
      closeModal(); setForm({ topic: '', question: '', items: [] })
    } catch { setShareErr('공유에 실패했어요. 다시 시도해 주세요.') }
    setSharing(false)
  }

  const isMobile = device === 'mobile'

  return (
    <div className="relative flex-1 flex flex-col h-full bg-[#F3F4F8]">
      {/* 자체 스텝 헤더 */}
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

      {/* 보드 */}
      <main className="flex-1 overflow-y-auto p-6 pb-40 space-y-6">
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-base font-black text-slate-600 mb-2">아직 탐구 문제가 없어요.</h3>
            <p className="text-[13px] text-slate-400 mb-6 leading-relaxed">탐구 문제를 작성하고<br/>모둠원들과 함께 선정해 보세요.</p>
            <button onClick={openModal}
              className="px-6 py-3 bg-gsp-600 text-white rounded-full text-sm font-black shadow-lg shadow-gsp-100 hover:bg-gsp-700 active:scale-[0.98] transition-all">
              + 탐구 문제 작성하기
            </button>
          </div>
        ) : (
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {posts.map(post => (
              <PadletStep1Card
                key={post.id}
                post={post}
                postComments={commentsMap[post.id] || []}
                myName={user.name}
                selectedPost={selectedPost}
                onLike={onLike}
                onComment={onComment}
                onDeleteComment={onDeleteComment}
                onSelectRequest={onSelectRequest}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      {posts.length > 0 && (
        <div className="fixed bottom-24 right-6 z-30">
          <button onClick={openModal}
            className="w-14 h-14 bg-gsp-600 text-white rounded-full shadow-xl shadow-gsp-200 flex items-center justify-center text-2xl font-black hover:bg-gsp-700 active:scale-95 transition-all">
            +
          </button>
        </div>
      )}

      {/* 탐구 문제 작성 모달 */}
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
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4"
              style={{maxHeight:'calc(100dvh - 80px)', overflowY:'auto'}}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-base font-black text-slate-800">탐구 문제 작성</h3>
                <button onClick={closeModal} className="text-slate-300 hover:text-slate-500 transition-colors p-1"><X size={18} /></button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">조사 주제</label>
                <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="예: 우리 반 학생들이 좋아하는 과목"
                  className="w-full px-4 py-3 bg-slate-50 border border-[#E2E3E5] rounded-[8px] text-sm font-bold text-black outline-none bg-white focus:border-gsp-500 transition-all placeholder:text-[#8A949E] placeholder:font-medium"/>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">탐구 질문</label>
                <input value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="예: 어떤 과목을 가장 좋아하나요?"
                  className="w-full px-4 py-3 bg-slate-50 border border-[#E2E3E5] rounded-[8px] text-sm font-bold text-black outline-none bg-white focus:border-gsp-500 transition-all placeholder:text-[#8A949E] placeholder:font-medium"/>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  조사 항목 <span className="normal-case font-medium text-slate-300">({form.items.length}/8)</span>
                </label>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input value={itemInput} onChange={e => setItemInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && addItem()}
                    placeholder="항목 입력 후 Enter"
                    style={{flex:1, minWidth:0, padding:'10px 14px', borderRadius:8, border:'1px solid #E2E3E5', fontSize:13, fontWeight:700, outline:'none', background:'#fff', fontFamily:'inherit'}}/>
                  <button onClick={addItem}
                    style={{padding:'10px 16px', borderRadius:999, background:'#5B41EB', color:'#fff', border:'none', fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', flexShrink:0, whiteSpace:'nowrap', minHeight:42}}>
                    추가
                  </button>
                </div>
                {form.items.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {form.items.map((item, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gsp-50 text-gsp-700 border border-gsp-100 rounded-full text-[11px] font-bold">
                        {item}
                        <button onClick={() => removeItem(i)} className="text-gsp-400 hover:text-gsp-700 transition-colors"><X size={10} strokeWidth={3}/></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {shareErr && <p className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">{shareErr}</p>}

              <button onClick={doShare} disabled={!canShare || sharing}
                className="w-full py-3.5 bg-gsp-600 text-white rounded-full font-black text-sm shadow-lg shadow-gsp-100 hover:bg-gsp-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
