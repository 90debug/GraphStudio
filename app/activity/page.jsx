'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDevice } from '../../lib/DeviceContext'
import { STEPS, STEP_COLORS, STEP_FULL_LABELS, EDU_GRAD } from '../../lib/constants'
import {
  getOrCreateRoom, subscribeRoom, subscribeStep1Posts, subscribeStep4Posts,
  updateRoomStep, setSyncLeader, clearSyncLeader, updateDataTable, updateChartConfig,
  setSelectedPost, addStep1Post, toggleLike1, addComment1, deleteStep1Post,
  addStep4Post, toggleLike4, addComment4, deleteStep4Post,
  updatePresence, subscribePresence, removePresence,
  createSurvey, getSurvey, subscribeSurvey, subscribeSurveyResponses, addSurveyResponse,
  addStroke, subscribeStrokes, deleteMyStrokes, clearStrokes, setCurrentDrawer,
  saveCanvasSnapshot, loadCanvasSnapshot,
  updateRoomMeta, updateSurveyTopic,
  setSelectionVote, agreeSelectionVote,
  setLivePreview, resetSurvey,
} from '../../lib/firestore'
import { Toast, OnlineUsers } from '../../components/activity/ui'
import { ConfirmResetModal, VoteModal } from '../../components/activity/modals'
import Step1 from '../../components/activity/Step1'
import Step2 from '../../components/activity/Step2'
import Step3 from '../../components/activity/Step3'
import Step4 from '../../components/activity/Step4'

function useDb(fn, delay) {
  const t = useRef(null)
  return useCallback((...a) => {
    clearTimeout(t.current)
    t.current = setTimeout(() => fn(...a), delay)
  }, []) // eslint-disable-line
}


export default function ActivityPage() {
  const router   = useRouter()
  const device   = useDevice()

  const [user,        setUser]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [room,        setRoom]        = useState({})
  const [step1Posts,  setStep1Posts]  = useState([])
  const [step4Posts,  setStep4Posts]  = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [survey,      setSurvey]      = useState(null)
  const [surveyResp,  setSurveyResp]  = useState([])
  const [strokes,     setStrokes]     = useState([])
  const [activeStep,  setActiveStep]  = useState(1)
  const [freeMode,    setFreeMode]    = useState(false)
  const [toast,       setToast]       = useState(null)
  const [voteModal,   setVoteModal]   = useState(false)
  const [resetConfirmPost, setResetConfirmPost] = useState(null)
  const [step3SnapshotImg, setStep3SnapshotImg] = useState(null)

  const freeModeRef          = useRef(false); freeModeRef.current = freeMode
  const iAmLeaderRef         = useRef(false)
  const userRef              = useRef(null)
  const presenceT            = useRef(null)
  const remoteStep           = useRef(1)
  const mainRef              = useRef(null)
  const lastDismissedVoteRef = useRef(null)

  const dbTable = useDb((code, val) => updateDataTable(code, val), 700)
  const dbChart = useDb((code, val) => updateChartConfig(code, val), 700)
  const dbMeta  = useDb((code, val) => updateRoomMeta(code, val), 500)

  useEffect(() => {
    const el = mainRef.current; if (!el) return
    let debT = null
    const handler = () => {
      if (!iAmLeaderRef.current) return
      clearTimeout(debT)
      debT = setTimeout(() => updateRoomMeta(userRef.current.code, { syncScrollTop: el.scrollTop }), 120)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => { el.removeEventListener('scroll', handler); clearTimeout(debT) }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem('gts_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    setUser(u); userRef.current = u
    localStorage.setItem('gts_last', JSON.stringify({ name: u.name, groupName: u.groupName, code: u.code }))
    let unsubs = []
    async function init() {
      try {
        await getOrCreateRoom(u.code, u.groupName)
        await updatePresence(u.code, u.name)
        presenceT.current = setInterval(() => updatePresence(u.code, u.name), 30_000)
        unsubs.push(subscribeRoom(u.code, roomData => {
          setRoom(roomData)
          remoteStep.current = roomData.currentStep || 1
          if (!freeModeRef.current && roomData.syncLeader) {
            setActiveStep(roomData.currentStep || 1)
            if (mainRef.current && roomData.syncScrollTop !== undefined)
              mainRef.current.scrollTop = roomData.syncScrollTop
          }
        }))
        unsubs.push(subscribeStep1Posts(u.code, setStep1Posts))
        unsubs.push(subscribeStep4Posts(u.code, setStep4Posts))
        unsubs.push(subscribePresence(u.code, setOnlineUsers))
        unsubs.push(subscribeSurvey(u.code, setSurvey))
        unsubs.push(subscribeSurveyResponses(u.code, setSurveyResp))
        unsubs.push(subscribeStrokes(u.code, setStrokes))
        setLoading(false)
      } catch (err) {
        console.error(err); setLoading(false)
        setToast('⚠️ Firebase 연결 실패 — .env.local 파일을 확인해 주세요')
      }
    }
    init()
    return () => { unsubs.forEach(fn => fn()); clearInterval(presenceT.current); removePresence(u.code, u.name).catch(() => {}) }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!freeMode && room.syncLeader) setActiveStep(remoteStep.current)
  }, [freeMode]) // eslint-disable-line

  async function changeStep(n) {
    setActiveStep(n)
    if (room.syncLeader === userRef.current?.name) {
      await updateRoomStep(userRef.current.code, n)
      if (mainRef.current) mainRef.current.scrollTop = 0
      await updateRoomMeta(userRef.current.code, { syncScrollTop: 0 })
    }
  }

  function handleDataTable(next) { setRoom(r => ({ ...r, dataTable: next })); dbTable(userRef.current?.code, next) }
  function handleChartConfig(changes) {
    const next = { ...room.chartConfig, ...changes }
    setRoom(r => ({ ...r, chartConfig: next })); dbChart(userRef.current?.code, next)
  }
  function handleDrawMode(mode) { setRoom(r => ({ ...r, drawMode: mode })); dbMeta(userRef.current?.code, { drawMode: mode }) }
  function handleStep4State(changes) {
    const next = { ...(room.step4State || {}), ...changes }
    setRoom(r => ({ ...r, step4State: next })); dbMeta(userRef.current?.code, { step4State: next })
  }

  async function handleLike1(postId, nowLiking) { await toggleLike1(userRef.current?.code, postId, user?.name, nowLiking) }
  async function handleComment1(postId, text) { await addComment1(userRef.current?.code, postId, text) }
  async function handleDelete1(postId) {
    try { await deleteStep1Post(userRef.current?.code, postId); setToast('🗑️ 삭제되었어요') }
    catch { setToast('⚠️ 삭제에 실패했어요') }
  }

  async function doSelectVote(post) {
    const voters = onlineUsers.map(u => u.name)
    if (!voters.includes(user.name)) voters.push(user.name)
    await setSelectionVote(userRef.current?.code, {
      postId: post.id,
      postData: { content: post.content, topic: post.topic, question: post.question, items: post.items },
      requestedBy: user.name, voters, agreed: [user.name],
    })
    setVoteModal(true); setToast('🗳️ 모둠원에게 투표를 요청했어요!')
  }

  async function handleSelectRequest(post) {
    if (room.surveyActive || (room.selectedPost?.postId && room.selectedPost?.postId !== post.id)) {
      setResetConfirmPost(post); return
    }
    await doSelectVote(post)
  }

  async function handleConfirmReset() {
    const post = resetConfirmPost; setResetConfirmPost(null); if (!post) return
    const code = userRef.current?.code
    try {
      await Promise.all([
        updateRoomMeta(code, { selectedPost:null, dataTable:[], chartConfig:{type:'bar',title:''}, step4State:{}, drawMode:'draw', surveyActive:false, selectionVote:null, currentDrawer:null, livePreview:null }),
        clearStrokes(code), resetSurvey(code),
      ])
      setRoom(r => ({ ...r, selectedPost:null, dataTable:[], chartConfig:{type:'bar',title:''}, step4State:{}, drawMode:'draw', surveyActive:false }))
      setToast('🔄 모든 데이터가 초기화되었어요!')
    } catch (e) { console.error(e); setToast('⚠️ 초기화에 실패했어요.'); return }
    await doSelectVote(post)
  }

  async function handleVote() { await agreeSelectionVote(userRef.current?.code, user.name) }
  async function handleCancelVote() {
    await setSelectionVote(userRef.current?.code, null)
    setVoteModal(false)
    setToast('투표가 취소되었습니다.')
  }
  async function handleDeclineVote() {
    await setSelectionVote(userRef.current?.code, null)
    setVoteModal(false)
    setToast('투표가 취소되었습니다.')
  }

  useEffect(() => {
    const sv = room.selectionVote; if (!sv || !user) return
    if (!sv.agreed?.includes(user.name)) {
      const voteKey = `${sv.postId}_${sv.requestedBy}_${sv.voters?.length}`
      if (lastDismissedVoteRef.current !== voteKey) setVoteModal(true)
    }
    const allAgreed = sv.voters?.length > 0 && sv.agreed?.length >= sv.voters?.length
    const notYetSelected = !room.selectedPost?.postId || room.selectedPost?.postId !== sv.postId
    if (allAgreed && notYetSelected) {
      const post = sv.postData; if (!post) return
      const finalize = async () => {
        await setSelectedPost(userRef.current?.code, { postId:sv.postId, name:sv.requestedBy, topic:post.topic, question:post.question, items:post.items, content:post.content })
        if (room.surveyActive) await updateSurveyTopic(userRef.current?.code, post.topic, post.question, post.items)
        await setSelectionVote(userRef.current?.code, null)
        setVoteModal(false); setToast('🎉 탐구 문제가 만장일치로 선정되었어요!')
      }
      if (sv.requestedBy === user.name) finalize().catch(console.error)
    }
  }, [room.selectionVote]) // eslint-disable-line

  async function handleLike4(postId, nowLiking) { await toggleLike4(userRef.current?.code, postId, user?.name, nowLiking) }
  async function handleComment4(postId, text) { await addComment4(userRef.current?.code, postId, text) }
  async function handleDelete4(postId) {
    try { await deleteStep4Post(userRef.current?.code, postId); setToast('🗑️ 삭제되었어요') }
    catch { setToast('⚠️ 삭제에 실패했어요') }
  }

  if (loading || !user) return (
    <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:18,
      backgroundImage:"url('/bg-loading.png')", backgroundSize:'cover', backgroundPosition:'center' }}>
      <div style={{ position:'relative' }}>
        <div className="bounce" style={{ fontSize:60 }}>📚</div>
        <div style={{ position:'absolute', top:-4, right:-8, width:20, height:20, borderRadius:'50%',
          background:'#FF8C42', animation:'pulse 1s infinite', boxShadow:'0 2px 8px rgba(255,140,66,.4)' }}/>
      </div>
      <div style={{ fontSize:17, fontWeight:800, color:'#3D2B1F', letterSpacing:'-0.3px' }}>연결 중...</div>
      <div style={{ fontSize:13, color:'#8C7B6E', fontWeight:700, background:'rgba(255,255,255,.9)', padding:'8px 20px',
        borderRadius:999, border:'2.5px solid #E6D8C8', boxShadow:'0 3px 10px rgba(140,90,50,.08)' }}>잠시만 기다려 주세요 😊</div>
    </div>
  )

  const step        = STEPS[activeStep - 1]
  const items       = room.selectedPost?.items || []
  const dataTable   = room.dataTable   || []
  const chartConfig = room.chartConfig || { type:'bar', title:'' }
  const drawMode    = room.drawMode    || 'draw'
  const step4State  = room.step4State  || {}
  const iAmLeader   = room.syncLeader === user.name
  const hasSyncLead = !!room.syncLeader
  iAmLeaderRef.current = iAmLeader

  const done = [null, !!room.selectedPost,
    dataTable.some(d => Number(d.value) > 0),
    (chartConfig.title || strokes.length > 0), true]

  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100%', height:'100%',
      overflow:'hidden', backgroundImage:"url('/bg-activity.png')", backgroundSize:'cover', backgroundPosition:'center' }}>

      {/* ── 상단 헤더 ── */}
      <header style={{ background:'rgba(255,255,255,.92)', backdropFilter:'blur(12px)',
        height: device==='mobile' ? 48 : 44,
        display:'flex', alignItems:'center',
        padding: device==='mobile' ? '0 10px' : '0 14px',
        gap: device==='mobile' ? 6 : 10,
        flexShrink:0,
        borderBottom:'1.5px solid rgba(230,216,200,.6)', boxShadow:'0 2px 12px rgba(0,0,0,.08)' }}>

        {/* 로고: 모바일에서는 숨김 */}
        {device !== 'mobile' && (
          <span style={{ fontSize:15, fontWeight:800, letterSpacing:-0.3,
            background:EDU_GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text', flexShrink:0 }}>📊 메모 보드</span>
        )}

        <div style={{ flex:1 }}/>

        {/* 동기화 pill: 모바일에서는 점 표시만 */}
        {device === 'mobile' ? (
          hasSyncLead && (
            <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:999,
              background:iAmLeader?'#ECFDF5':'#EFF6FF',
              border:`1px solid ${iAmLeader?'#A7F3D0':'#BFDBFE'}`,
              fontSize:10, fontWeight:700, color:iAmLeader?'#047857':'#1D4ED8' }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:iAmLeader?'#10B981':'#3B82F6', animation:'pulse 1.5s infinite', display:'inline-block', flexShrink:0 }}/>
              {iAmLeader ? '동기화 중' : `${room.syncLeader}`}
            </div>
          )
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:999,
            background:hasSyncLead?iAmLeader?'#ECFDF5':'#EFF6FF':'#F8FAFC',
            border:`1px solid ${hasSyncLead?iAmLeader?'#A7F3D0':'#BFDBFE':'#E2E8F2'}`,
            fontSize:10, fontWeight:700, color:hasSyncLead?iAmLeader?'#047857':'#1D4ED8':'#64748B' }}>
            {hasSyncLead && <span style={{ width:6, height:6, borderRadius:'50%',
              background:iAmLeader?'#10B981':'#3B82F6', animation:'pulse 1.5s infinite', display:'inline-block', flexShrink:0 }}/>}
            {hasSyncLead ? iAmLeader ? '내 화면 동기화 중' : `${room.syncLeader}님 동기화 중` : freeMode ? '🔓 자유 탐색' : '동기화 없음'}
            {freeMode ? (
              <button onClick={()=>{ setFreeMode(false); setActiveStep(remoteStep.current) }} style={{ marginLeft:3, padding:'1px 7px', borderRadius:999, fontSize:10, fontWeight:800, background:'#FF8C42', color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>← 합류</button>
            ) : (
              <button onClick={()=>setFreeMode(true)} style={{ marginLeft:3, padding:'1px 7px', borderRadius:999, fontSize:10, fontWeight:800, background:'rgba(0,0,0,.08)', color:'inherit', border:'none', cursor:'pointer', fontFamily:'inherit' }}>자유</button>
            )}
            {!hasSyncLead ? (
              <button onClick={async()=>{ await setSyncLeader(userRef.current?.code, userRef.current?.name, activeStep); setToast('🔗 화면 동기화를 시작했어요!') }} style={{ marginLeft:3, padding:'1px 7px', borderRadius:999, fontSize:10, fontWeight:800, background:'rgba(0,0,0,.08)', color:'inherit', border:'none', cursor:'pointer', fontFamily:'inherit' }}>동기화</button>
            ) : iAmLeader ? (
              <button onClick={async()=>await clearSyncLeader(userRef.current?.code)} style={{ padding:'1px 7px', borderRadius:999, fontSize:10, fontWeight:800, background:'rgba(0,0,0,.08)', color:'inherit', border:'none', cursor:'pointer', fontFamily:'inherit' }}>해제</button>
            ) : null}
          </div>
        )}

        <OnlineUsers users={onlineUsers}/>

        {/* 참여 코드 */}
        <div style={{ display:'flex', alignItems:'center', gap: device==='mobile' ? 3 : 5,
          padding: device==='mobile' ? '4px 8px' : '4px 9px 4px 11px',
          borderRadius:999, background:'#FFF3E8', border:'1.5px solid #FFCB96', boxShadow:'0 2px 6px rgba(255,140,66,.14)' }}>
          <span style={{ fontSize:10, color:'#D4601A', fontWeight:800 }}>🔑</span>
          <span style={{ fontSize: device==='mobile' ? 11 : 12, fontWeight:800, color:'#3D2B1F', letterSpacing: device==='mobile' ? 1 : 2 }}>{user.code}</span>
          <button onClick={()=>navigator.clipboard.writeText(user.code).then(()=>setToast('✅ 코드가 복사되었어요!'))}
            style={{ marginLeft:2, padding:'3px 8px', borderRadius:8, background:'#FF8C42', color:'#fff', border:'none', fontSize:10, fontWeight:800, cursor:'pointer', fontFamily:'inherit', minHeight:28 }}>복사</button>
        </div>

        <button onClick={()=>{ sessionStorage.removeItem('gts_user'); router.push('/') }}
          style={{ padding: device==='mobile' ? '5px 8px' : '5px 12px', borderRadius:10, background:'#fff', color:'#8C7B6E', border:'1.5px solid #E6D8C8', fontSize:11, fontWeight:800, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', minHeight:32 }}
          onMouseEnter={e=>{ e.currentTarget.style.background='#FFF0F1'; e.currentTarget.style.color='#C0364A' }}
          onMouseLeave={e=>{ e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#8C7B6E' }}>
          {device==='mobile' ? '나가기' : '나가기 →'}
        </button>
      </header>

      {/* ── 바디 ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {activeStep === 1 && (
            <Step1 user={user} code={user.code} posts={step1Posts}
              selectedPost={room.selectedPost} onToast={setToast}
              onLike={handleLike1} onComment={handleComment1}
              onSelectRequest={handleSelectRequest} onDelete={handleDelete1}/>
          )}

          {activeStep === 4 && (
            <Step4 user={user} code={user.code}
              items={items} dataTable={dataTable} chartConfig={chartConfig}
              step4State={step4State} onStep4State={handleStep4State}
              posts4={step4Posts}
              onLike4={handleLike4} onComment4={handleComment4} onDelete4={handleDelete4}/>
          )}

          {(activeStep === 2 || activeStep === 3) && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <main ref={mainRef} style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0,
                backgroundImage:"url('/bg-activity.png')", backgroundSize:'cover',
                backgroundPosition:'center', backgroundAttachment:'local' }}>
                {activeStep === 2 && (
                  <Step2 user={user} code={user.code} selectedPost={room.selectedPost}
                    dataTable={dataTable} onChange={handleDataTable}
                    surveyActive={room.surveyActive || false} survey={survey} surveyResponses={surveyResp}
                    activeStep={activeStep}/>
                )}
                {activeStep === 3 && (
                  <Step3 user={user} code={user.code}
                    items={items} dataTable={dataTable}
                    chartConfig={chartConfig} onChartConfig={handleChartConfig}
                    strokes={strokes} currentDrawer={room.currentDrawer || null}
                    drawMode={drawMode} onDrawMode={handleDrawMode}
                    livePreview={room.livePreview || null}
                    selectedPost={room.selectedPost}
                    step3SnapshotImg={step3SnapshotImg}
                    onStep3SnapshotImg={setStep3SnapshotImg}
                    activeStep={activeStep}/>
                )}
              </main>
            </div>
          )}
        </div>

        {/* ── 하단 탭 네비게이션 ── */}
        <nav style={{ display:'flex', flexShrink:0, height: device==='mobile' ? 58 : 62,
          background:'rgba(255,255,255,.97)', backdropFilter:'blur(12px)',
          borderTop:'1.5px solid #E6D8C8', boxShadow:'0 -4px 16px rgba(61,43,31,.08)',
          paddingBottom: device==='mobile' ? 'env(safe-area-inset-bottom, 0px)' : 0 }}>
          {STEPS.map((s, idx) => {
            const isActive = activeStep === s.n
            const isDone   = done[s.n] && !isActive
            const clr      = STEP_COLORS[idx]
            const mobileLabel = ['탐구 문제','자료 수집','그래프','결과 해석'][idx]
            return (
              <button key={s.n} onClick={()=>changeStep(s.n)} style={{ flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:2, border:'none', background:'none',
                cursor:'pointer', fontFamily:'inherit', position:'relative', padding:'5px 2px 4px', transition:'background .15s',
                minHeight: 44 }}>
                {isActive && <div style={{ position:'absolute', top:0, left:'15%', right:'15%',
                  height:3, borderRadius:'0 0 3px 3px', background:clr, boxShadow:`0 2px 8px ${clr}60` }}/>}
                <div style={{ width:30, height:30, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                  opacity: isActive ? 1 : isDone ? 0.75 : 0.45,
                  transition:'all .2s',
                  filter: isActive ? `drop-shadow(0 2px 6px ${clr}80)` : 'none' }}>
                  <img src={`/step${s.n}_icon.png`} alt={`Step ${s.n}`}
                    style={{ width:30, height:30, objectFit:'contain' }}/>
                </div>
                <div style={{ fontSize: device==='mobile' ? 9 : 10, fontWeight:isActive?800:isDone?700:600,
                  color:isActive?clr:isDone?clr:'#94A3B8',
                  lineHeight:1.3, textAlign:'center', letterSpacing:'-0.3px', whiteSpace:'nowrap' }}>
                  {device==='mobile' ? mobileLabel : STEP_FULL_LABELS[idx]}
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {resetConfirmPost && (
        <ConfirmResetModal topicName={room.selectedPost?.topic} onConfirm={handleConfirmReset} onCancel={()=>setResetConfirmPost(null)}/>
      )}
      {voteModal && room.selectionVote && (
        <VoteModal vote={room.selectionVote} myName={user.name} onAgree={handleVote}
          onClose={handleDeclineVote}
          onCancel={handleCancelVote} isRequester={room.selectionVote?.requestedBy===user.name}/>
      )}
      {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  )
}
