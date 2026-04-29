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
  subscribeLastAnnouncement, subscribeAnnouncements,
  addTeacherMemo,
  addStamp, subscribeStamps,
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

function StampOverlay({ x, y, onDone }) {
  const [phase, setPhase] = useState('enter')  // enter → hold → exit
  useEffect(function() {
    const t1 = setTimeout(function() { setPhase('exit') }, 2880)
    const t2 = setTimeout(function() { onDone() }, 3330)
    return function() { clearTimeout(t1); clearTimeout(t2) }
  }, []) // eslint-disable-line
  const anim = phase === 'enter'
    ? { animation: 'stampEnter 380ms cubic-bezier(0.34,1.56,0.64,1) forwards' }
    : { animation: 'stampExit 450ms ease forwards' }
  return (
    <>
      <style>{`
        @keyframes stampEnter { from { transform: translate(-50%,-50%) scale(0.2) rotate(-20deg); opacity:0 } to { transform: translate(-50%,-50%) scale(1) rotate(-4deg); opacity:0.88 } }
        @keyframes stampExit  { from { transform: translate(-50%,-50%) scale(1) rotate(-4deg); opacity:0.88 } to { transform: translate(-50%,-50%) scale(0.88) rotate(-4deg); opacity:0 } }
      `}</style>
      <div style={{
        position: 'absolute', left: x + '%', top: y + '%',
        width: 80, pointerEvents: 'none', zIndex: 500,
        ...anim,
      }}>
        <img src="/stamp_01.png" alt="" style={{ width: 80, height: 'auto' }} />
      </div>
    </>
  )
}

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
  const watchSessionCode = searchParams.get('session') // 관찰 메모용 세션 코드
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
  const [showMembersPanel, setShowMembersPanel] = useState(false)  // 접속 모둠원 패널
  const [stampMode, setStampMode] = useState(false)               // 스탬프 모드 (watch 전용)
  const [incomingStamps, setIncomingStamps] = useState([])        // 학생 수신 스탬프
  const annTimerRef = useRef(null)
  const mountTimeRef = useRef(Date.now())  // 마운트 시각 기록 → 이후 공지만 토스트
  const [step1Modal, setStep1Modal] = useState(false)
  const [resetConfirmPost, setResetConfirmPost] = useState(null)
  // watch 모드 전용: 관찰 메모
  const [showMemoPanel, setShowMemoPanel] = useState(false)
  const [memoText, setMemoText]     = useState('')
  const [memoSaving, setMemoSaving] = useState(false)

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
      const watchUnsubs = [
        // room 구독: currentStep을 activeStep에 동기화
        subscribeRoom(watchRoomId, function(roomData) {
          setRoom(roomData)
          // watch 모드: activeStep 자동 동기화 제거 → 교사가 BottomNav로 수동 탐색
        }),
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
            // 마운트 이전 공지 or 이미 읽은 공지는 토스트 안 띄움
            const lastSeenId = localStorage.getItem('gts_ann_seen_' + sc)
            const annTs = ann.sentAt?.toMillis ? ann.sentAt.toMillis() : (ann.sentAt?.seconds ? ann.sentAt.seconds * 1000 : 0)
            const isNew = ann.id !== lastSeenId && annTs > mountTimeRef.current - 3000
            setAnnouncement(prev => {
              if (!isNew) return prev
              if (prev?.id === ann.id) return prev
              clearTimeout(annTimerRef.current)
              annTimerRef.current = setTimeout(() => {
                setAnnouncement(null)
                localStorage.setItem('gts_ann_seen_' + sc, ann.id)
              }, 8000)
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

  // ── 화면 공유 탭 동기화 핸들러 (리더 전용) ────────────────────────────────
  function handleStep2TabChange(tabId) {
    if (!iAmLeader) return
    updateRoomMeta(userRef.current?.code, { step2Tab: tabId })
  }
  function handleStep3DrawModeChange(mode) {
    if (!iAmLeader) return
    updateRoomMeta(userRef.current?.code, { step3Tab: mode })
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

  // ── 학생 스탬프 구독 ────────────────────────────────────────────────────────
  // user.sessionCode(새 모둠 생성) 또는 room.sessionCode(코드로 참여한 학생) 중 하나로 구독
  useEffect(function() {
    if (watchMode) return
    const sessionCode = user?.sessionCode || room?.sessionCode
    const roomCode = user?.code
    if (!sessionCode || !roomCode) return
    return subscribeStamps(sessionCode, roomCode, function(stamp) {
      setIncomingStamps(function(prev) { return [...prev, { ...stamp, uid: Date.now() + Math.random() }] })
    })
  }, [watchMode, user?.sessionCode, user?.code, room?.sessionCode]) // eslint-disable-line

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

  // watch 모드 전용 댓글 핸들러 — activeCode와 '선생님' 이름 사용
  async function handleWatchComment1(postId, text) {
    await addComment1(activeCode, postId, { author: '선생님', text })
  }
  async function handleWatchDeleteComment1(postId, comment) {
    const { deleteComment1: dc1 } = await import('../../lib/firestore')
    await dc1(activeCode, postId, comment)
  }
  async function handleWatchComment4(postId, text) {
    await addComment4(activeCode, postId, { author: '선생님', text })
  }
  async function handleWatchDeleteComment4(postId, comment) {
    const { deleteComment4: dc4 } = await import('../../lib/firestore')
    await dc4(activeCode, postId, comment)
  }
  const recentAnnouncements = allAnnouncements.slice(0, 5)
  const hasSyncLead = !!room.syncLeader

  // ── watch 모드 메모 저장 핸들러 ────────────────────────────────────────────
  async function handleSaveMemo() {
    if (!memoText.trim() || !watchSessionCode) return
    setMemoSaving(true)
    try {
      await addTeacherMemo(watchSessionCode, {
        roomCode: watchRoomId,
        roomName: room.teamName || room.groupName || watchRoomId,
        step: activeStep,
        text: memoText.trim(),
      })
      setMemoText('')
      setShowMemoPanel(false)
      setToast('관찰 메모가 저장되었어요.')
    } catch {
      setToast('저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setMemoSaving(false)
    }
  }

  const STEP_COLORS = ['#FF8C42','#4EACD9','#5BBF7A','#C97DE8']

  const watchUser = watchMode ? { name: '선생님', code: watchRoomId, groupName: '' } : user

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-[#FAFBFF]" style={watchMode ? { paddingTop: 32 } : {}}>
      {/* watch 모드: 읽기 전용 배너 */}
      {watchMode && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, letterSpacing: '-0.2px' }}>
          <img src="/icon_08.png" alt="" style={{ width:16, height:16, objectFit:'contain', flexShrink:0 }} />
          <span>관찰 중</span>
          <button
            onClick={() => {
              if (window.history.length > 1) { router.back() }
              else { window.close() }
            }}
            style={{ padding: '3px 10px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '99px', color: '#fff', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
          >뒤로</button>
        </div>
      )}
      {/* 공지사항 토스트 — 타이틀 영역 부근 (헤더 바로 아래) */}
      {announcement && !watchMode && (
        <div style={{ position: 'fixed', top: '64px', left: '50%', transform: 'translateX(-50%)', zIndex: 8000, maxWidth: 'calc(100vw - 40px)', width: '360px', background: 'var(--s1)', color: '#fff', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(91,65,235,0.4)', animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)', border: '1px solid rgba(255,255,255,0.18)', overflow: 'hidden', opacity: 0.96 }}>
          <span style={{ fontSize: '11px', fontWeight: 800, background: 'rgba(255,255,255,0.18)', padding: '3px 7px', borderRadius: '6px', flexShrink: 0, letterSpacing: '0.3px' }}>[공지]</span>
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div id="ann-scroll" style={{ whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600, lineHeight: 1.4, animationDuration: '0s', display: 'inline-block', willChange: 'transform' }}>{announcement.text}</div>
          </div>
          <button onClick={() => { const sc = user?.sessionCode; if(sc && announcement?.id) localStorage.setItem('gts_ann_seen_'+sc, announcement.id); setAnnouncement(null) }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '14px', flexShrink: 0, padding: '0 4px' }}>✕</button>
        </div>
      )}
      {/* watch 모드: 쓰기 핸들러는 noop으로 처리 (오버레이 없이 스크롤/클릭 허용) */}
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
          <div
            style={{ position: 'relative' }}
            onBlur={function(e) { if (!e.currentTarget.contains(e.relatedTarget)) setShowMembersPanel(false) }}
            tabIndex={-1}
          >
            <OnlineUsers
              users={onlineUsers}
              onClick={function() { setShowMembersPanel(function(v) { return !v }) }}
              isOpen={showMembersPanel}
            />
            {showMembersPanel && (
              <div style={{
                position: 'absolute', top: 36, right: 0, zIndex: 8001,
                background: '#fff', border: '1px solid #E2E3E5',
                borderRadius: 12, padding: '12px 14px',
                minWidth: 170, maxHeight: 260, overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                WebkitOverflowScrolling: 'touch',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8C7B6E', marginBottom: 8 }}>
                  접속 중인 모둠원
                </p>
                {onlineUsers.length === 0
                  ? <p style={{ fontSize: 13, color: '#8C7B6E' }}>접속자가 없습니다.</p>
                  : onlineUsers.map(function(u, i) {
                      const isMe = u.name === user?.name
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '6px 8px', borderRadius: 8,
                          background: isMe ? '#F5F3FF' : '#F8F9FA',
                          marginBottom: 5,
                        }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', flexShrink: 0 }}/>
                          <span style={{ fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? '#5B41EB' : '#3D2B1F' }}>
                            {u.name}
                          </span>
                          {isMe && (
                            <span style={{
                              marginLeft: 'auto', fontSize: 9, fontWeight: 800,
                              color: '#5B41EB', background: '#EDE9FE',
                              padding: '1px 6px', borderRadius: 4,
                            }}>나</span>
                          )}
                        </div>
                      )
                    })
                }
                <p style={{ fontSize: 10, color: '#B0ACCC', marginTop: 4, textAlign: 'right', fontWeight: 600 }}>
                  총 {onlineUsers.length}명 접속 중
                </p>
              </div>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-[8px] shadow-lg shadow-slate-200">
            <Key size={12} className="text-gsp-400" />
            <span className="text-xs font-black tracking-widest">{user?.code}</span>
            <button onClick={function() { navigator.clipboard.writeText(user?.code||''); setToast('복사 완료') }} className="ml-1 hover:text-gsp-400 transition-colors"><Copy size={12}/></button>
          </div>
          {/* 알림 아이콘 */}
          {!watchMode && (
            <div style={{ position:'relative' }} onBlur={function(e){ if(!e.currentTarget.contains(e.relatedTarget)) setShowNotifPanel(false) }} tabIndex={-1}>
              <button
                onClick={function() { setShowNotifPanel(function(v){return !v}) }}
                className="p-2 text-slate-400 hover:text-gsp-600 transition-all hover:bg-gsp-50 rounded-xl"
                style={{ position:'relative' }}
              >
                <img src="/icon_06.png" alt="공지" style={{ width:20, height:20, objectFit:'contain' }}/>
                {announcement && <span style={{ position:'absolute', top:5, right:5, width:7, height:7, borderRadius:'50%', background:'#E24B4A', border:'1.5px solid #fff', display:'block' }}/>}
              </button>
              {showNotifPanel && (
                <div style={{ position:'absolute', top:'40px', right:0, zIndex:8001, background:'#fff', border:'1px solid #e2e3e5', borderRadius:12, padding:'12px 14px', width:240, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', maxHeight:280, overflowY:'scroll', WebkitOverflowScrolling:'touch', touchAction:'pan-y' }}>
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

      <main
        className="flex-1 relative overflow-hidden flex flex-col"
        style={watchMode && stampMode ? { cursor: 'crosshair', outline: '2px dashed rgba(229,62,62,0.45)' } : {}}
        onClick={watchMode && stampMode ? function(e) {
          const effectiveSessionCode = watchSessionCode || room?.sessionCode
          if (!effectiveSessionCode || !watchRoomId) return
          const rect = e.currentTarget.getBoundingClientRect()
          const x = ((e.clientX - rect.left) / rect.width) * 100
          const y = ((e.clientY - rect.top) / rect.height) * 100
          addStamp(effectiveSessionCode, { roomCode: watchRoomId, x, y })
          // 교사 로컬에도 즉시 표시
          setIncomingStamps(function(prev) { return [...prev, { x, y, uid: Date.now() + Math.random() }] })
        } : undefined}
      >
        <AnimatePresence mode="wait">
          <motion.div key={activeStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex-1 flex flex-col overflow-hidden">
            {/* watch 모드: 쓰기 핸들러 noop, 읽기(스크롤·클릭) 허용 */}
            {activeStep === 1 && <Step1 user={watchUser} code={activeCode} posts={step1Posts} selectedPost={room.selectedPost} onToast={setToast} onLike={watchMode ? function(){} : handleLike1} onComment={watchMode ? handleWatchComment1 : handleComment1} onSelectRequest={watchMode ? function(){} : handleSelectRequest} onDelete={watchMode ? function(){} : handleDelete1} onDeleteComment={watchMode ? handleWatchDeleteComment1 : handleDeleteComment1} showModal={watchMode ? false : step1Modal} onShowModal={watchMode ? function(){} : setStep1Modal}/>}
            {activeStep === 2 && <Step2 user={watchUser} code={activeCode} selectedPost={room.selectedPost} dataTable={room.dataTable || []} onChange={watchMode ? function(){} : handleDataTable} surveyActive={room.surveyActive} survey={survey} surveyResponses={surveyResp} syncTab={hasSyncLead && !iAmLeader ? (room.step2Tab || 'create') : undefined} onTabChange={iAmLeader ? handleStep2TabChange : undefined}/>}
            {activeStep === 3 && <Step3 user={watchUser} code={activeCode} items={room.selectedPost?.items || []} dataTable={room.dataTable || []} chartConfig={room.chartConfig || {type:'bar'}} onChartConfig={watchMode ? function(){} : handleChartConfig} strokes={strokes} currentDrawer={watchMode ? null : room.currentDrawer} drawMode={room.drawMode||'draw'} onDrawMode={watchMode ? function(){} : handleDrawMode} livePreview={room.livePreview} selectedPost={room.selectedPost} step3SnapshotImg={room.canvasSnapshot} onStep3SnapshotImg={watchMode ? function(){} : (img)=>updateRoomMeta(userRef.current?.code,{canvasSnapshot:img})} readOnly={watchMode} syncDrawMode={hasSyncLead && !iAmLeader ? (room.step3Tab || 'draw') : undefined} onDrawModeChange={iAmLeader ? handleStep3DrawModeChange : undefined}/>}
            {activeStep === 4 && <Step4 user={watchUser} code={activeCode} items={room.selectedPost?.items || []} dataTable={room.dataTable || []} chartConfig={room.chartConfig || {type:'bar'}} step4State={room.step4State || {}} onStep4State={watchMode ? function(){} : handleStep4State} posts4={step4Posts} onLike4={watchMode ? function(){} : handleLike4} onComment4={watchMode ? handleWatchComment4 : handleComment4} onDelete4={watchMode ? function(){} : handleDelete4} onDeleteComment4={watchMode ? handleWatchDeleteComment4 : handleDeleteComment4}/>}
          </motion.div>
        </AnimatePresence>

        {activeStep === 1 && !step1Modal && !watchMode && (
          <button
            onClick={() => setStep1Modal(true)}
            className="fixed bottom-[86px] right-6 w-14 h-14 bg-gsp-500 text-white rounded-full shadow-[0_8px_24px_rgba(91,65,235,0.4)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-[200]"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        )}
        {/* 스탬프 오버레이 렌더링 */}
        {incomingStamps.map(function(s) {
          return (
            <StampOverlay
              key={s.uid}
              x={s.x}
              y={s.y}
              onDone={function() { setIncomingStamps(function(prev) { return prev.filter(function(p) { return p.uid !== s.uid }) }) }}
            />
          )
        })}
        <BottomNav currentStep={activeStep} onStepChange={changeStep} />
      </main>

      {resetConfirmPost && <ConfirmResetModal topicName={room.selectedPost?.topic} onConfirm={handleConfirmReset} onCancel={function() { setResetConfirmPost(null) }}/>}
      {!watchMode && voteModal && room.selectionVote && <VoteModal vote={room.selectionVote} myName={user?.name||''} onAgree={handleVote} onClose={function() { setVoteModal(false) }} onDecline={handleVoteDecline} isRequester={room.selectionVote?.requestedBy === user?.name} />}
      {toast && <Toast msg={toast} onDone={function() { setToast(null) }} />}
      {showNotifPanel && <div style={{ position:'fixed', inset:0, zIndex:8000, pointerEvents:'none' }} />}
      {showMembersPanel && (
        <div
          onClick={function() { setShowMembersPanel(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 8000, background: 'transparent' }}
        />
      )}

      {/* ── watch 모드 전용: 관찰 메모 + 스탬프 플로팅 버튼 ── */}
      {watchMode && watchSessionCode && (
        <>
          {/* 스탬프 버튼 (위) */}
          <button
            onClick={() => setStampMode(function(v) { return !v })}
            title="스탬프 찍기"
            style={{
              position:'fixed', bottom:134, right:20, zIndex:9500,
              width:52, height:52, borderRadius:'50%',
              background: stampMode ? '#E53E3E' : '#fff',
              border: stampMode ? 'none' : '1.5px solid #5B41EB',
              cursor:'pointer',
              boxShadow: stampMode ? '0 4px 20px rgba(229,62,62,0.45)' : '0 2px 10px rgba(0,0,0,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'background .2s, box-shadow .2s',
            }}
          >
            {stampMode
              ? <span style={{ fontSize:18, color:'#fff', fontWeight:700, lineHeight:1 }}>✕</span>
              : <img src="/icon_10.png" alt="스탬프" style={{ width:26, height:26, objectFit:'contain', opacity:0.6 }}/>
            }
          </button>

          {/* 스탬프 모드 ON 배너 */}
          {stampMode && (
            <div style={{
              position:'fixed', top:40, left:'50%', transform:'translateX(-50%)',
              zIndex:9600, background:'rgba(229,62,62,0.9)', color:'#fff',
              borderRadius:8, padding:'6px 18px', fontSize:12, fontWeight:800,
              animation:'fadeUp .2s ease', whiteSpace:'nowrap',
              boxShadow:'0 4px 16px rgba(229,62,62,0.4)',
            }}>
              스탬프 모드 ON
            </div>
          )}
          <button
            onClick={() => setShowMemoPanel(true)}
            title="관찰 기록 작성"
            style={{
              position:'fixed', bottom:72, right:20, zIndex:9500,
              width:52, height:52, borderRadius:'50%',
              background:'#5B41EB', border:'none', cursor:'pointer',
              boxShadow:'0 4px 20px rgba(91,65,235,0.45)',
              display:'flex', alignItems:'center', justifyContent:'center',
              transition:'transform .2s, box-shadow .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='scale(1.08)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(91,65,235,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(91,65,235,0.45)' }}
          >
            <img src="/icon_09.png" alt="관찰 기록" style={{ width:26, height:26, objectFit:'contain', filter:'brightness(0) invert(1)' }}/>
          </button>

          {/* 관찰 기록 작성 모달 — 인라인 JSX (inner component 금지: textarea 재마운트 오류 방지) */}
          {showMemoPanel && (() => {
            const stepLabel = ['1단계 탐구문제','2단계 자료수집','3단계 그래프','4단계 해석'][activeStep - 1] || ''
            const roomLabel = room.teamName || room.groupName || watchRoomId
            return (
              <div
                onClick={() => setShowMemoPanel(false)}
                style={{
                  position:'fixed', inset:0, zIndex:10000,
                  background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'0 16px',
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    background:'#fff', borderRadius:20, padding:24,
                    width:'100%', maxWidth:480,
                    boxShadow:'0 24px 64px rgba(0,0,0,0.18)',
                    display:'flex', flexDirection:'column', gap:16,
                  }}
                >
                  {/* 헤더 */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <h2 style={{ fontSize:18, fontWeight:800, color:'#3D2B1F', letterSpacing:'-0.3px' }}>
                      관찰 기록 작성
                    </h2>
                    <button
                      onClick={() => setShowMemoPanel(false)}
                      style={{ background:'none', border:'none', fontSize:18, color:'#8A949E', cursor:'pointer', lineHeight:1, padding:'2px 4px' }}
                    >✕</button>
                  </div>

                  {/* 관찰 대상 */}
                  <div>
                    <p style={{ fontSize:11, fontWeight:800, color:'#8A949E', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:6 }}>관찰 대상</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', borderRadius:10, border:'1.5px solid #E2E3E5', background:'#F8F9FA' }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#555' }}>{roomLabel}</span>
                      <span style={{
                        fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background: STEP_COLORS[activeStep-1] + '22',
                        color: STEP_COLORS[activeStep-1],
                        border:`1px solid ${STEP_COLORS[activeStep-1]}44`,
                      }}>{stepLabel}</span>
                    </div>
                  </div>

                  {/* 관찰 내용 */}
                  <div>
                    <p style={{ fontSize:11, fontWeight:800, color:'#8A949E', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:6 }}>관찰 내용</p>
                    <textarea
                      value={memoText}
                      onChange={e => setMemoText(e.target.value)}
                      placeholder="이 모둠의 활동 상황, 특이사항, 피드백 내용을 기록하세요."
                      rows={4}
                      autoFocus
                      style={{
                        width:'100%', padding:'12px 14px',
                        borderRadius:10, border:'1.5px solid #E2E3E5',
                        fontSize:14, color:'#3D2B1F',
                        background:'#fff', outline:'none', resize:'none',
                        lineHeight:1.65, display:'block',
                        fontFamily:'inherit', boxSizing:'border-box',
                      }}
                      onFocus={e => e.target.style.borderColor='#5B41EB'}
                      onBlur={e => e.target.style.borderColor='#E2E3E5'}
                      onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveMemo() }}
                    />
                  </div>

                  {/* 저장 버튼 */}
                  <button
                    onClick={handleSaveMemo}
                    disabled={!memoText.trim() || memoSaving}
                    style={{
                      width:'100%', height:50, borderRadius:100,
                      background: memoText.trim() && !memoSaving ? '#5B41EB' : '#E2E3E5',
                      color: memoText.trim() && !memoSaving ? '#fff' : '#8A949E',
                      fontSize:16, fontWeight:800, border:'none',
                      cursor: memoText.trim() && !memoSaving ? 'pointer' : 'not-allowed',
                      transition:'background .15s, color .15s',
                      fontFamily:'inherit', letterSpacing:'-0.3px',
                    }}
                  >
                    {memoSaving ? '저장 중…' : '기록 저장'}
                  </button>
                  <p style={{ fontSize:12, color:'#8A949E', textAlign:'center', marginTop:-8 }}>
                    기록은 교사 대시보드에서 모아볼 수 있어요.
                  </p>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}