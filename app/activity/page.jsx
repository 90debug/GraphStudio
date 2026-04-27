'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDevice } from '../../lib/DeviceContext'
import {
  getOrCreateRoom, subscribeRoom, subscribeStep1Posts, subscribeStep4Posts,
  updateRoomStep, setSyncLeader, clearSyncLeader, updateDataTable, updateChartConfig,
  setSelectedPost, toggleLike1, addComment1, deleteComment1, deleteStep1Post,
  toggleLike4, addComment4, deleteComment4, deleteStep4Post,
  updatePresence, subscribePresence, removePresence,
  subscribeSurvey, subscribeSurveyResponses,
  subscribeStrokes, clearStrokes,
  updateRoomMeta, clearSelectionVote, resetSurvey, setSelectionVote, agreeSelectionVote,
  subscribeLastAnnouncement, subscribeAnnouncements
} from '../../lib/firestore'

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Copy, Key, CheckCircle2, Plus } from 'lucide-react'
import { Toast, OnlineUsers } from '../../components/activity/ui'
import { ConfirmResetModal, VoteModal } from '../../components/activity/modals'
import BottomNav from '../../components/activity/BottomNav'
import Step1 from '../../components/activity/Step1'
import Step2 from '../../components/activity/Step2'
import Step3 from '../../components/activity/Step3'
import Step4 from '../../components/activity/Step4'

function useDb(fn, delay) {
  const t = useRef(null)
  return useCallback(function() {
    var args = arguments
    clearTimeout(t.current)
    t.current = setTimeout(function() { fn.apply(void 0, args) }, delay)
  }, [fn, delay])
}

export default function ActivityPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const watchMode    = searchParams.get('mode') === 'watch'
  const watchRoomId  = searchParams.get('room')
  const device = useDevice()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState({})
  const [step1Posts, setStep1Posts] = useState([])
  const [step4Posts, setStep4Posts] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [survey, setSurvey] = useState(null)
  const [surveyResp, setSurveyResp] = useState([])
  const [strokes, setStrokes] = useState([])
  const [activeStep, setActiveStep] = useState(1)
  const [freeMode, setFreeMode] = useState(false)
  const [toast, setToast] = useState(null)
  const [voteModal,  setVoteModal]  = useState(false)
  const [announcement, setAnnouncement] = useState(null)  // 공지사항 토스트
  const [allAnnouncements, setAllAnnouncements] = useState([])  // 히스토리
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const annTimerRef = useRef(null)
  const [step1Modal, setStep1Modal] = useState(false)
  const [resetConfirmPost, setResetConfirmPost] = useState(null)

  const freeModeRef = useRef(false)
  const userRef = useRef(null)
  const presenceT = useRef(null)
  const remoteStep = useRef(1)
  const prevVotePostIdRef = useRef(null)
  const syncLeaderRef = useRef(null)  // 현재 syncLeader 이름 추적 (cleanup용)

  const dbTable = useDb(function(code, val) { updateDataTable(code, val) }, 700)
  const dbChart = useDb(function(code, val) { updateChartConfig(code, val) }, 700)
  const dbMeta  = useDb(function(code, val) { updateRoomMeta(code, val) }, 500)

  useEffect(function() {
    // watch 모드: sessionStorage 불필요, 바로 구독 초기화
    if (watchMode && watchRoomId) {
      let unsubs = []
      const watchUnsubs = [
        subscribeRoom(watchRoomId, setRoom),
        subscribeStep1Posts(watchRoomId, setStep1Posts),
        subscribeStep4Posts(watchRoomId, setStep4Posts),
        subscribePresence(watchRoomId, setOnlineUsers),
        subscribeSurvey(watchRoomId, setSurvey),
        subscribeSurveyResponses(watchRoomId, setSurveyResp),
        subscribeStrokes(watchRoomId, setStrokes),
      ]
      setLoading(false)
      return () => watchUnsubs.forEach(fn => fn?.())
    }

    const stored = sessionStorage.getItem('gts_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    setUser(u); userRef.current = u
    freeModeRef.current = freeMode
    
    let unsubs = []
    async function init() {
      try {
        // (watch 모드 분기는 위에서 처리됨)
        if (false) {
          unsubs.push(subscribeRoom(watchRoomId, setRoom))
          unsubs.push(subscribeStep1Posts(watchRoomId, setStep1Posts))
          unsubs.push(subscribeStep4Posts(watchRoomId, setStep4Posts))
          unsubs.push(subscribePresence(watchRoomId, setOnlineUsers))
          unsubs.push(subscribeSurvey(watchRoomId, setSurvey))
          unsubs.push(subscribeSurveyResponses(watchRoomId, setSurveyResp))
          unsubs.push(subscribeStrokes(watchRoomId, setStrokes))
          setLoading(false)
          return
        }
        await getOrCreateRoom(u.code, u.groupName)
        await updatePresence(u.code, u.name)
        presenceT.current = setInterval(function() { updatePresence(u.code, u.name) }, 30000)
        // 세션 공지사항 실시간 구독
        // u.sessionCode 우선, 없으면 room 문서에서 가져옴
        function subscribeAnn(sc) {
          unsubs.push(subscribeLastAnnouncement(sc, function(ann) {
            if (!ann) return
            setAnnouncement(prev => {
              if (prev?.id === ann.id) return prev
              clearTimeout(annTimerRef.current)
              annTimerRef.current = setTimeout(() => setAnnouncement(null), 8000)
              return ann
            })
          }))
          // 히스토리 구독 (import: subscribeAnnouncements)
          unsubs.push(subscribeAnnouncements(sc, function(list) {
            const fmt = list.map(function(a) {
              const ts = a.sentAt
              const d = ts && ts.toDate ? ts.toDate() : (ts ? new Date(ts) : new Date())
              const mm = String(d.getMonth()+1).padStart(2,'0')
              const dd = String(d.getDate()).padStart(2,'0')
              const time = d.toLocaleTimeString('ko-KR', { hour:'2-digit', minute:'2-digit' })
              return { id: a.id, text: a.text, time: mm+'.'+dd+' '+time }
            })
            setAllAnnouncements(fmt)
          }))
        }
        if (u.sessionCode) {
          subscribeAnn(u.sessionCode)
        }
        let annSubbed = !!u.sessionCode  // u.sessionCode가 있으면 이미 구독함
        unsubs.push(subscribeRoom(u.code, function(roomData) {
          setRoom(roomData)
          syncLeaderRef.current = roomData.syncLeader || null
          remoteStep.current = roomData.currentStep || 1
          if (!freeModeRef.current && roomData.syncLeader) setActiveStep(roomData.currentStep || 1)
          // room.sessionCode에서 세션 코드 획득 후 공지 구독 (u.sessionCode 없을 때)
          if (!annSubbed && roomData.sessionCode) {
            annSubbed = true
            subscribeAnn(roomData.sessionCode)
          }
        }))
        unsubs.push(subscribeStep1Posts(u.code, setStep1Posts))
        unsubs.push(subscribeStep4Posts(u.code, setStep4Posts))
        unsubs.push(subscribePresence(u.code, function(members) {
          setOnlineUsers(members)
          // 화면 동기화 중인 리더가 접속 이탈했으면 자동 해제
          const leader = syncLeaderRef.current
          if (leader && !members.find(function(m) { return m.name === leader })) {
            clearSyncLeader(u.code)
          }
        }))
        unsubs.push(subscribeSurvey(u.code, setSurvey))
        unsubs.push(subscribeSurveyResponses(u.code, setSurveyResp))
        unsubs.push(subscribeStrokes(u.code, setStrokes))
        setLoading(false)
      } catch (err) { setLoading(false); setToast('연결 실패') }
    }
    init()
    // 탭 닫기/새로고침 시 동기화 해제
    function handleBeforeUnload() {
      if (syncLeaderRef.current === u.name) clearSyncLeader(u.code)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return function() {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      unsubs.forEach(function(fn) { fn() })
      clearInterval(presenceT.current)
      removePresence(u.code, u.name)
      // 컴포넌트 언마운트 시 동기화 리더였으면 해제
      if (syncLeaderRef.current === u.name) clearSyncLeader(u.code)
    }
  }, [router, freeMode])

  async function changeStep(n) {
    setActiveStep(n); if (room.syncLeader === userRef.current?.name) await updateRoomStep(userRef.current.code, n)
  }

  function handleDataTable(next) { setRoom(function(r) { return { ...r, dataTable: next } }); dbTable(userRef.current?.code, next) }
  function handleChartConfig(changes) {
    const next = { ...room.chartConfig, ...changes }; setRoom(function(r) { return { ...r, chartConfig: next } }); dbChart(userRef.current?.code, next)
  }
  function handleDrawMode(mode) { setRoom(function(r) { return { ...r, drawMode: mode } }); dbMeta(userRef.current?.code, { drawMode: mode }) }
  function handleStep4State(changes) {
    const next = { ...(room.step4State || {}), ...changes }; setRoom(function(r) { return { ...r, step4State: next } }); dbMeta(userRef.current?.code, { step4State: next })
  }

  async function handleLike1(postId, nowLiking) { await toggleLike1(userRef.current?.code, postId, user?.name, nowLiking) }
  async function handleComment1(postId, text) { await addComment1(userRef.current?.code, postId, { author: user.name, text }) }
  async function handleDeleteComment1(postId, comment) {
    const code = user?.code || userRef.current?.code
    if (!code) { setToast('오류: 방 코드를 찾을 수 없어요.'); return }
    try { await deleteComment1(code, postId, comment); setToast('댓글이 삭제되었어요.') } catch(e) { setToast('댓글 삭제 중 오류가 발생했어요.') }
  }
  async function handleDelete1(postId) { try { await deleteStep1Post(userRef.current?.code, postId); setToast('삭제 완료') } catch (e) { setToast('실패') } }
  
  // 다른 사용자의 주제 선정 투표 요청을 실시간으로 감지하여 VoteModal 표시
  useEffect(function() {
    if (!room.selectionVote || !user) return
    const votePostId = room.selectionVote.postId
    if (prevVotePostIdRef.current !== votePostId) {
      prevVotePostIdRef.current = votePostId
      setVoteModal(true)
    }
  }, [room.selectionVote?.postId]) // eslint-disable-line

  // 투표가 완전히 완료되면 탐구 문제 선정 처리 (요청자만 처리)
  useEffect(function() {
    if (!room.selectionVote || !user) return
    var vote = room.selectionVote
    var agreedCount = vote.agreed?.length || 0
    var totalVoters = vote.voters?.length || 1
    if (agreedCount >= totalVoters && totalVoters > 0 && vote.requestedBy === user.name) {
      setSelectedPost(userRef.current?.code, { postId: vote.postData.id, ...vote.postData })
        .then(function() {
          updateRoomMeta(userRef.current?.code, { selectionVote: null })
          setToast('탐구 문제가 선정되었어요!')
        })
    }
  }, [room.selectionVote?.agreed?.length]) // eslint-disable-line

  async function handleSelectRequest(post) {
    if (room.surveyActive || (room.selectedPost?.postId && room.selectedPost?.postId !== post.id)) { setResetConfirmPost(post); return }
    const voters = onlineUsers.map(function(u) { return u.name }); if (!voters.includes(user.name)) voters.push(user.name)
    if (voters.length <= 1) {
      await setSelectedPost(userRef.current?.code, { postId: post.id, ...post })
      setToast('탐구 문제가 선정되었어요!'); return
    }
    await setSelectionVote(userRef.current?.code, { postId: post.id, postData: post, requestedBy: user.name, voters, agreed: [user.name] })
    setVoteModal(true); setToast('투표 요청 완료!')
  }

  async function handleConfirmReset() {
    try {
      await updateRoomMeta(userRef.current?.code, { selectedPost: null, dataTable: [], chartConfig: { type: 'bar' }, step4State: {}, surveyActive: false })
      await clearStrokes(userRef.current?.code); await resetSurvey(userRef.current?.code)
      setToast('초기화 완료'); handleSelectRequest(resetConfirmPost); setResetConfirmPost(null)
    } catch (e) { setToast('실패') }
  }

  async function handleVote() { await agreeSelectionVote(userRef.current?.code, user.name) }
  async function handleVoteDecline() {
    try {
      await clearSelectionVote(userRef.current?.code)
    } catch {
      // Firestore 실패해도 로컬 UI는 닫음
    }
    prevVotePostIdRef.current = null
    setVoteModal(false)
  }
  async function handleLike4(postId, nowLiking) { await toggleLike4(userRef.current?.code, postId, user?.name, nowLiking) }
  async function handleComment4(postId, text) { await addComment4(userRef.current?.code, postId, { author: user.name, text }) }
  async function handleDeleteComment4(postId, comment) {
    const code = user?.code || userRef.current?.code
    if (!code) { setToast('오류: 방 코드를 찾을 수 없어요.'); return }
    try { await deleteComment4(code, postId, comment); setToast('댓글이 삭제되었어요.') } catch(e) { setToast('댓글 삭제 중 오류가 발생했어요.') }
  }
  async function handleDelete4(postId) { try { await deleteStep4Post(userRef.current?.code, postId); setToast('삭제 완료') } catch { setToast('삭제 실패') } }

  if (loading) return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 font-black">연결 중...</div>
  )
  // watch 모드에서는 user 없어도 진행 (교사 관찰용)
  if (!user && !watchMode) return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 font-black">연결 중...</div>
  )
  // watch 모드에서는 user 없어도 진행 (교사 관찰용)
  if (!user && !watchMode) return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 font-black">연결 중...</div>
  )

  const activeCode  = watchMode ? watchRoomId : (user?.code || '')
  const iAmLeader = !watchMode && room.syncLeader === user?.name
  const recentAnnouncements = allAnnouncements.slice(0, 5)
  const hasSyncLead = !!room.syncLeader

  const watchUser = watchMode ? { name: '교사', code: watchRoomId, groupName: '' } : user

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#FAFBFF]" style={watchMode ? { paddingTop: 32 } : {}}>
      {/* watch 모드: 읽기 전용 배너 */}
      {watchMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, letterSpacing: '-0.2px' }}>
          <span>👁 교사 관찰 모드 — 읽기 전용</span>
          <button
            onClick={() => {
              // 모바일: 뒤로가기 / PC: 탭 닫기
              if (window.history.length > 1) { router.back() }
              else { window.close() }
            }}
            style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '99px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
          >뒤로</button>
        </div>
      )}
      {/* 공지사항 토스트 — 타이틀 영역 부근 (헤더 바로 아래) */}
      {announcement && !watchMode && (
        <div style={{ position: 'fixed', top: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 8000, maxWidth: 'calc(100vw - 40px)', width: '360px', background: '#1E293B', color: '#fff', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <span style={{ fontSize: '16px', flexShrink: 0 }}>📢</span>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div id="ann-scroll" style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600, lineHeight: 1.4, animationDuration: '0s', display: 'inline-block', willChange: 'transform' }}>{announcement.text}</div>
          </div>
          <button onClick={() => setAnnouncement(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', flexShrink: 0, padding: '0 4px' }}>✕</button>
        </div>
      )}
      {/* watch 모드 인터랙션 차단 오버레이 */}
      {watchMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, cursor: 'default' }} onClickCapture={e => e.stopPropagation()} />
      )}
      {/* ── 상단 헤더 ── */}
      <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 font-black text-slate-800 tracking-tighter text-[18px]">
            메모 보드
          </div>
          <div className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold flex items-center gap-2 ${hasSyncLead ? 'bg-gsp-50 text-gsp-600' : 'bg-slate-50 text-slate-400'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${hasSyncLead ? 'bg-current animate-pulse' : 'bg-slate-300'}`} />
            {hasSyncLead ? (iAmLeader ? '화면 공유 중' : room.syncLeader + '님 화면 보는 중') : '개별 활동 중'}
            {!hasSyncLead ? (
              <button onClick={function() { setSyncLeader(user.code, user.name, activeStep) }} className="ml-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm hover:border-gsp-500 transition-colors">화면 공유</button>
            ) : iAmLeader && (
              <button onClick={function() { clearSyncLeader(user.code) }} className="ml-1 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">해제</button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <OnlineUsers users={onlineUsers} />
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-[8px] shadow-lg shadow-slate-200">
            <Key size={12} className="text-gsp-400" />
            <span className="text-xs font-black tracking-widest">{user?.code}</span>
            <button onClick={function() { navigator.clipboard.writeText(user?.code||''); setToast('복사 완료') }} className="ml-1 hover:text-gsp-400 transition-colors"><Copy size={12}/></button>
          </div>
          {/* 알림 아이콘 */}
          {!watchMode && (
            <div style={{ position:'relative' }}>
              <button
                onClick={function() { setShowNotifPanel(function(v){return !v}) }}
                className="p-2 text-slate-400 hover:text-gsp-600 transition-all hover:bg-gsp-50 rounded-xl"
                style={{ position:'relative' }}
              >
                <img src="/icon_06.png" alt="공지" style={{ width:20, height:20, objectFit:'contain' }}/>
                {announcement && <span style={{ position:'absolute', top:5, right:5, width:7, height:7, borderRadius:'50%', background:'#E24B4A', border:'1.5px solid #fff', display:'block' }}/>}
              </button>
              {showNotifPanel && (
                <div style={{ position:'absolute', top:'40px', right:0, zIndex:8001, background:'#fff', border:'1px solid #e2e3e5', borderRadius:12, padding:'12px 14px', width:240, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:280, overflowY:'auto' }}
                  onClick={function(e){e.stopPropagation()}}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#8C7B6E', marginBottom:8 }}>선생님 공지</p>
                  {recentAnnouncements.length===0
                    ? <p style={{ fontSize:13, color:'#8C7B6E' }}>공지가 없습니다.</p>
                    : recentAnnouncements.map(function(a){ return (
                        <div key={a.id} style={{ padding:'8px 10px', borderRadius:8, background:'#F1F5F9', marginBottom:6 }}>
                          <p style={{ fontSize:12, color:'#3D2B1F', lineHeight:1.5 }}>{a.text}</p>
                          <p style={{ fontSize:10, color:'#94A3B8', marginTop:3 }}>{a.time}</p>
                        </div>
                      )})
                  }
                </div>
              )}
            </div>
          )}
          {!watchMode && <button onClick={function() { sessionStorage.removeItem('gts_user'); router.push('/') }} className="p-2 text-slate-400 hover:text-gsp-600 transition-all hover:bg-gsp-50 rounded-xl"><LogOut size={20}/></button>}
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div key={activeStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col overflow-hidden">
            {activeStep === 1 && <Step1 user={user} code={activeCode} posts={step1Posts} selectedPost={room.selectedPost} onToast={setToast} onLike={handleLike1} onComment={handleComment1} onSelectRequest={handleSelectRequest} onDelete={handleDelete1} onDeleteComment={handleDeleteComment1} showModal={step1Modal} onShowModal={setStep1Modal}/>}
            {activeStep === 2 && <Step2 user={user} code={activeCode} selectedPost={room.selectedPost} dataTable={room.dataTable || []} onChange={handleDataTable} surveyActive={room.surveyActive} survey={survey} surveyResponses={surveyResp}/>}
            {activeStep === 3 && <Step3 user={user} code={activeCode} items={room.selectedPost?.items || []} dataTable={room.dataTable || []} chartConfig={room.chartConfig || {type:'bar'}} onChartConfig={handleChartConfig} strokes={strokes} currentDrawer={room.currentDrawer} drawMode={room.drawMode||'draw'} onDrawMode={handleDrawMode} livePreview={room.livePreview} selectedPost={room.selectedPost} step3SnapshotImg={room.canvasSnapshot} onStep3SnapshotImg={(img)=>updateRoomMeta(userRef.current?.code,{canvasSnapshot:img})}/>}
            {activeStep === 4 && <Step4 user={user} code={activeCode} items={room.selectedPost?.items || []} dataTable={room.dataTable || []} chartConfig={room.chartConfig || {type:'bar'}} step4State={room.step4State || {}} onStep4State={handleStep4State} posts4={step4Posts} onLike4={handleLike4} onComment4={handleComment4} onDelete4={handleDelete4} onDeleteComment4={handleDeleteComment4}/>}
          </motion.div>
        </AnimatePresence>

        {activeStep === 1 && !step1Modal && (
          <button
            onClick={() => setStep1Modal(true)}
            className="fixed bottom-[86px] right-6 w-14 h-14 bg-gsp-500 text-white rounded-full shadow-[0_8px_24px_rgba(91,65,235,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-[200]"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        )}
        <BottomNav currentStep={activeStep} onStepChange={changeStep} />
      </main>

      {resetConfirmPost && <ConfirmResetModal topicName={room.selectedPost?.topic} onConfirm={handleConfirmReset} onCancel={function() { setResetConfirmPost(null) }}/>}
      {voteModal && room.selectionVote && <VoteModal vote={room.selectionVote} myName={user.name} onAgree={handleVote} onClose={function() { setVoteModal(false) }} onDecline={handleVoteDecline} isRequester={room.selectionVote?.requestedBy === user.name} />}
      {toast && <Toast msg={toast} onDone={function() { setToast(null) }} />}
      {showNotifPanel && <div style={{ position:'fixed', inset:0, zIndex:8000 }} onClick={function(){setShowNotifPanel(false)}}/>}
    </div>
  )
}