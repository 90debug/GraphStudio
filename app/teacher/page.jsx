'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  subscribeSession, subscribeSessionRooms,
  closeSession, resetRoomData, resetAllRoomsInSession,
} from '../../lib/firestore'

// ── 단계 pip ─────────────────────────────────────────────────────────────────
const STEP_LABELS = ['탐구 문제', '자료 수집', '그래프', '해석']
const STEP_COLORS = {
  done:    { bg: 'var(--s1)', color: 'var(--color-white)', border: 'var(--s1)' },
  active:  { bg: 'var(--color-white)', color: 'var(--s1)', border: 'var(--s1)' },
  pending: { bg: 'var(--color-white)', color: 'var(--color-cool-gray-400)', border: 'var(--color-cool-gray-200)' },
}

function getStepStatus(room, step) {
  const cur = room.currentStep || 1
  if (step < cur) return 'done'
  if (step === cur) return 'active'
  return 'pending'
}

// 명세서 기준: 데이터 상태 기반 완료 판단
function isStepComplete(room, step, step4PostsMap) {
  if (step === 1) return !!room.selectedPost
  if (step === 2) return Array.isArray(room.dataTable) && room.dataTable.some(r => Object.values(r).some(v => v && String(v).trim()))
  if (step === 3) return !!(room.canvasSnapshot || (room.chartConfig && room.chartConfig.title))
  if (step === 4) return (step4PostsMap?.[room.id] || 0) > 0
  return false
}

function StepPip({ step, status }) {
  const s = STEP_COLORS[status]
  return (
    <div style={{
      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '12px', fontWeight: 800,
      background: s.bg, color: s.color,
      border: `2px solid ${s.border}`,
      transition: 'all 0.2s',
    }}>
      {status === 'done' ? '✓' : step}
    </div>
  )
}

// ── 사이드바 ──────────────────────────────────────────────────────────────────
function Sidebar({ session, rooms, navTab, setNavTab, onCloseSession }) {
  const onlineRooms = rooms.filter(r => r._online)
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 1), 0)
  const avgStep = rooms.length > 0
    ? rooms.reduce((sum, r) => sum + (r.currentStep || 1), 0) / rooms.length
    : 0

  const progressPct = Math.round((avgStep / 4) * 100)

  return (
    <div style={{
      width: '220px', flexShrink: 0,
      background: 'var(--slate-dk)',
      display: 'flex', flexDirection: 'column',
      padding: 'var(--spacing-20)',
      gap: 'var(--spacing-20)',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* 세션 코드 */}
      <div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>세션 코드</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '28px', fontWeight: 800, color: 'var(--color-white)', letterSpacing: '6px' }}>
          {session?.sessionCode || '------'}
        </p>
        {session && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {[session.school, session.grade && `${session.grade}학년`, session.classNum && `${session.classNum}반`].filter(Boolean).join(' ') || '학교 정보 없음'}
          </p>
        )}
      </div>

      {/* 요약 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>접속 모둠</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--color-white)' }}>{onlineRooms.length}<span style={{ fontWeight: 400, fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}> / {rooms.length}</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>접속 학생</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--color-white)' }}>{totalMembers}</span>
        </div>
      </div>

      {/* 평균 진행도 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>평균 진행 단계</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--color-white)' }}>{avgStep.toFixed(1)} / 4</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', width: `${progressPct}%`, background: 'var(--s1)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* 네비 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {[
          { key: 'rooms', label: '모둠 현황', icon: '📊' },
          { key: 'manage', label: '세션 관리', icon: '⚙️' },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setNavTab(key)}
            className="h-step-item"
            style={{
              background: navTab === key ? 'rgba(255,255,255,0.13)' : 'transparent',
              color: navTab === key ? 'var(--color-white)' : 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              fontWeight: navTab === key ? 700 : 500,
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 세션 종료 */}
      <button
        onClick={onCloseSession}
        style={{
          width: '100%', padding: '10px', borderRadius: '8px',
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: 'var(--state-error-bd)',
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
      >
        세션 종료
      </button>
    </div>
  )
}

// ── 모둠 현황 테이블 ───────────────────────────────────────────────────────────
function RoomsTable({ rooms, step4PostsMap }) {
  if (rooms.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--spacing-16)', opacity: 0.5 }}>
        <span style={{ fontSize: '48px' }}>🏫</span>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>아직 참여한 모둠이 없어요</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-2)' }}>세션 코드를 학생에게 공유해 주세요</p>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-20)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['', '모둠명', '인원', '1단계', '2단계', '3단계', '4단계', '탐구 문제'].map((h, i) => (
              <th key={i} style={{ padding: '10px 12px', textAlign: i === 0 ? 'center' : i <= 2 ? 'left' : 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room, idx) => {
            const isOnline = !!room._online
            const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
            return (
              <tr key={room.id} style={{ borderBottom: '1px solid var(--border-soft)', opacity: isOnline ? 1 : 0.45, transition: 'opacity 0.2s' }}>
                {/* 접속 dot */}
                <td style={{ padding: '12px', textAlign: 'center', width: '32px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--state-selected)' : 'var(--color-cool-gray-200)', margin: '0 auto', transition: 'background 0.3s' }} />
                </td>
                {/* 모둠명 */}
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: 'var(--text)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.teamName || room.groupName || '-'}
                </td>
                {/* 인원 */}
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {room._memberCount || 1}명
                </td>
                {/* 단계 pip 1~4 */}
                {[1, 2, 3, 4].map(step => {
                  const done = isStepComplete(room, step, step4PostsMap)
                  const cur = room.currentStep || 1
                  const status = done ? 'done' : cur === step ? 'active' : 'pending'
                  return (
                    <td key={step} style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StepPip step={step} status={status} />
                      </div>
                    </td>
                  )
                })}
                {/* 탐구 문제 */}
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-2)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {topic}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 세션 관리 ──────────────────────────────────────────────────────────────────
function ManageTab({ rooms, sessionCode, onAction }) {
  const [confirmAll, setConfirmAll] = useState(false)
  const [resettingId, setResettingId] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleResetAll() {
    if (!confirmAll) return setConfirmAll(true)
    setLoading(true)
    try {
      await resetAllRoomsInSession(sessionCode)
      onAction('전체 초기화 완료')
    } catch { onAction('초기화 실패') } finally {
      setLoading(false); setConfirmAll(false)
    }
  }

  async function handleResetOne(code, name) {
    setResettingId(code)
    try {
      await resetRoomData(code)
      onAction(`${name} 초기화 완료`)
    } catch { onAction('초기화 실패') } finally { setResettingId(null) }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-20)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      {/* 전체 초기화 */}
      <div className="edu-sec">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>전체 초기화</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)', marginBottom: 'var(--spacing-16)' }}>
          세션 내 모든 모둠의 활동 데이터를 초기화합니다. 모둠 자체(코드)는 유지됩니다.
        </p>
        {confirmAll && (
          <div style={{ background: 'var(--state-error-bg)', border: '1px solid var(--state-error-bd)', borderRadius: 'var(--r-sm)', padding: 'var(--spacing-10) var(--spacing-16)', marginBottom: 'var(--spacing-10)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, color: 'var(--state-error)' }}>⚠️ 정말 전체 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--spacing-10)' }}>
          <button onClick={handleResetAll} disabled={loading} style={{ padding: '9px 20px', borderRadius: '8px', background: confirmAll ? 'var(--state-error)' : 'var(--state-error-bg)', color: confirmAll ? 'var(--color-white)' : 'var(--state-error)', border: `1px solid var(--state-error-bd)`, fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? '초기화 중…' : confirmAll ? '확인 — 전체 초기화' : '전체 초기화'}
          </button>
          {confirmAll && (
            <button onClick={() => setConfirmAll(false)} style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--slate-bg)', color: 'var(--text-2)', border: '1px solid var(--slate-bd)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
          )}
        </div>
      </div>

      {/* 모둠별 초기화 */}
      <div className="edu-sec">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>모둠별 초기화</p>
        {rooms.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>아직 참여한 모둠이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'var(--spacing-10)' }}>
            {rooms.map(room => {
              const name = room.teamName || room.groupName || room.id
              const isResetting = resettingId === room.id
              return (
                <div key={room.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--slate-bg)', border: '1px solid var(--slate-bd)' }}>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{name}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-2)' }}>{room.id} · {room.currentStep || 1}단계 진행 중</p>
                  </div>
                  <button
                    onClick={() => handleResetOne(room.id, name)}
                    disabled={isResetting}
                    style={{ padding: '7px 14px', borderRadius: '6px', background: 'var(--state-error-bg)', color: 'var(--state-error)', border: '1px solid var(--state-error-bd)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: isResetting ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: isResetting ? 0.6 : 1 }}
                  >
                    {isResetting ? '초기화 중…' : '초기화'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 상단 바 ───────────────────────────────────────────────────────────────────
function TopBar({ session, navTab, actionMsg }) {
  const tabTitles = { rooms: '모둠 현황', manage: '세션 관리' }
  return (
    <div style={{
      height: 'var(--header-h)', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 var(--spacing-20)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--color-white)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)' }}>
        <h1 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>
          {tabTitles[navTab]}
        </h1>
        {session && !session.active && (
          <span style={{ padding: '3px 10px', borderRadius: '99px', background: 'var(--state-error-bg)', color: 'var(--state-error)', fontSize: '12px', fontWeight: 700, border: '1px solid var(--state-error-bd)' }}>
            종료됨
          </span>
        )}
      </div>
      {actionMsg && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--state-selected)', animation: 'fadeIn 0.3s ease' }}>
          ✓ {actionMsg}
        </p>
      )}
    </div>
  )
}

// ── 확인 다이얼로그 ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-24)' }}>
      <div style={{ background: 'var(--color-white)', borderRadius: '16px', padding: 'var(--spacing-24)', maxWidth: '340px', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 'var(--spacing-10)', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--slate-bg)', color: 'var(--text-2)', border: '1px solid var(--slate-bd)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>취소</button>
          <button onClick={onConfirm} style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--state-error)', color: 'var(--color-white)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>종료</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 교사 페이지 ───────────────────────────────────────────────────────────
export default function TeacherPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionCode = searchParams.get('session')

  const [session, setSession] = useState(null)
  const [rooms, setRooms] = useState([])
  const [step4PostsMap, setStep4PostsMap] = useState({})
  const [navTab, setNavTab] = useState('rooms')
  const [actionMsg, setActionMsg] = useState('')
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  // 세션이 없으면 홈으로
  useEffect(() => {
    if (!sessionCode) {
      router.replace('/')
    }
  }, [sessionCode, router])

  // 세션 구독
  useEffect(() => {
    if (!sessionCode) return
    const unsub = subscribeSession(sessionCode, (s) => {
      setSession(s)
      setLoading(false)
    })
    return unsub
  }, [sessionCode])

  // 모둠 구독
  useEffect(() => {
    if (!sessionCode) return
    const unsub = subscribeSessionRooms(sessionCode, (rs) => {
      // presence 기반 online 체크: 최근 90초 내 presence가 있으면 online
      // 여기서는 presence 구독 없이 currentStep 변경 시각으로 근사
      // online 여부는 presence subcollection이 없으므로 currentStep > 0 로 간소화
      const enriched = rs.map(r => ({
        ...r,
        _online: r.currentStep != null,
        _memberCount: r._memberCount || 1,
      }))
      setRooms(enriched)
    })
    return unsub
  }, [sessionCode])

  function showAction(msg) {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function handleCloseSession() {
    setShowCloseConfirm(false)
    try {
      await closeSession(sessionCode)
      showAction('세션이 종료되었습니다')
    } catch { showAction('세션 종료 실패') }
  }

  if (!sessionCode) return null

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-2)' }}>로딩 중…</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg)', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>세션을 찾을 수 없습니다</p>
        <button onClick={() => router.replace('/')} style={{ padding: '10px 24px', borderRadius: '99px', background: 'var(--color-purple-500)', color: 'var(--color-white)', border: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>홈으로</button>
      </div>
    )
  }

  return (
    <>
      {showCloseConfirm && (
        <ConfirmDialog
          message={`세션 "${sessionCode}"을 종료하시겠습니까? 종료 후에는 새 모둠이 참여할 수 없습니다.`}
          onConfirm={handleCloseSession}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      <div style={{ display: 'flex', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
        {/* 사이드바 */}
        <Sidebar
          session={session}
          rooms={rooms}
          navTab={navTab}
          setNavTab={setNavTab}
          onCloseSession={() => setShowCloseConfirm(true)}
        />

        {/* 메인 영역 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
          <TopBar session={session} navTab={navTab} actionMsg={actionMsg} />

          {navTab === 'rooms' && (
            <RoomsTable rooms={rooms} step4PostsMap={step4PostsMap} />
          )}
          {navTab === 'manage' && (
            <ManageTab rooms={rooms} sessionCode={sessionCode} onAction={showAction} />
          )}
        </div>
      </div>
    </>
  )
}
