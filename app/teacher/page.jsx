'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogOut, Copy } from 'lucide-react'
import { useDevice } from '../../lib/DeviceContext'
import {
  subscribeSession, subscribeSessionRooms, subscribePresence,
  subscribeStep4Posts, resetRoomData, resetAllRoomsInSession,
} from '../../lib/firestore'

// ── 단계 완료 판단 ────────────────────────────────────────────────────────────
// 4단계: step4Posts에 문서가 하나라도 있으면 완료
function isStepComplete(room, step, step4Counts) {
  if (step === 1) return !!room.selectedPost
  if (step === 2) return Array.isArray(room.dataTable) && room.dataTable.some(r => Object.values(r).some(v => v && String(v).trim()))
  if (step === 3) return !!(room.canvasSnapshot || (room.chartConfig && room.chartConfig.title))
  if (step === 4) return (step4Counts?.[room.id] || 0) > 0
  return false
}

// ── Step Pip ──────────────────────────────────────────────────────────────────
function StepPip({ step, status }) {
  const styles = {
    done:    { bg: 'var(--s1)', color: 'var(--color-white)', border: 'var(--s1)' },
    active:  { bg: 'var(--color-white)', color: 'var(--s1)', border: 'var(--s1)' },
    pending: { bg: 'var(--color-white)', color: 'var(--color-cool-gray-400)', border: 'var(--color-cool-gray-200)' },
  }
  const s = styles[status]
  return (
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, background: s.bg, color: s.color, border: `2px solid ${s.border}`, transition: 'all 0.2s' }}>
      {status === 'done' ? '✓' : step}
    </div>
  )
}

// ── 사이드바 (PC 전용) ────────────────────────────────────────────────────────
function Sidebar({ session, rooms, navTab, setNavTab, onCopied }) {
  const onlineCount = rooms.filter(r => r._online).length
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 0), 0)
  const avgStep = rooms.length > 0
    ? rooms.reduce((sum, r) => sum + (r.currentStep || 1), 0) / rooms.length
    : 0
  const avgStepRounded = Math.round(avgStep)
  const progressPct = Math.round((avgStep / 4) * 100)

  function handleCopy() {
    if (!session?.sessionCode) return
    navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())
  }

  return (
    <div style={{ width: '220px', flexShrink: 0, background: 'var(--slate-dk)', display: 'flex', flexDirection: 'column', padding: 'var(--spacing-20)', gap: 'var(--spacing-20)', height: '100%', overflow: 'hidden' }}>
      {/* 세션 코드 + 복사 */}
      <div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>세션 코드</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '28px', fontWeight: 800, color: 'var(--color-white)', letterSpacing: '6px' }}>
            {session?.sessionCode || '------'}
          </p>
          {session?.sessionCode && (
            <button
              onClick={handleCopy}
              title="복사"
              style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', flexShrink: 0, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-white)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
            >
              <Copy size={14} />
            </button>
          )}
        </div>
        {session && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {[session.school, session.grade && `${session.grade}학년`, session.classNum && `${session.classNum}반`].filter(Boolean).join(' ') || '학교 정보 없음'}
          </p>
        )}
      </div>

      {/* 요약 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
        {[
          { label: '접속 모둠', value: `${onlineCount} / ${rooms.length}` },
          { label: '접속 학생', value: `${totalMembers}명` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--color-white)' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* 평균 진행도 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>평균 진행 단계</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--color-white)' }}>{avgStepRounded} / 4단계</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', width: `${progressPct}%`, background: 'var(--s1)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* 네비 — 아이콘 이미지 사용 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {[
          { key: 'rooms',  label: '모둠 현황', icon: '/icon_03.png' },
          { key: 'manage', label: '세션 관리', icon: '/icon_05.png' },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setNavTab(key)} className="h-step-item" style={{ background: navTab === key ? 'rgba(255,255,255,0.13)' : 'transparent', color: navTab === key ? 'var(--color-white)' : 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: navTab === key ? 700 : 500 }}>
            <img src={icon} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: navTab === key ? 1 : 0.6, flexShrink: 0 }} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── 모둠 현황 ─────────────────────────────────────────────────────────────────
function RoomsTable({ rooms, step4Counts, isMobile }) {
  // 배경: 1단계 배경색(--s1-bg)
  const emptyBg = 'var(--s1-bg)'

  if (rooms.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--spacing-16)', opacity: 0.6, background: emptyBg }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>아직 참여한 모둠이 없어요.</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-2)' }}>세션 코드를 학생에게 공유해 주세요.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-16)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-10)', background: emptyBg }}>
        {rooms.map(room => {
          const isOnline = !!room._online
          const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
          const cur = room.currentStep || 1
          return (
            <div key={room.id} className="edu-card" style={{ opacity: isOnline ? 1 : 0.5, padding: 'var(--spacing-16)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--state-selected)' : 'var(--color-cool-gray-200)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{room.teamName || room.groupName || '-'}</span>
                </div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>{room._memberCount || 0}명</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: topic !== '-' ? '8px' : 0 }}>
                {[1, 2, 3, 4].map(step => {
                  const done = isStepComplete(room, step, step4Counts)
                  const status = done ? 'done' : cur === step ? 'active' : 'pending'
                  return <StepPip key={step} step={step} status={status} />
                })}
              </div>
              {topic !== '-' && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>탐구: {topic}</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-20)', background: emptyBg }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['', '모둠명', '인원', '1단계', '2단계', '3단계', '4단계', '탐구 문제'].map((h, i) => (
              <th key={i} style={{ padding: '10px 12px', textAlign: i === 0 ? 'center' : i <= 2 ? 'left' : 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rooms.map(room => {
            const isOnline = !!room._online
            const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
            const cur = room.currentStep || 1
            return (
              <tr key={room.id} style={{ borderBottom: '1px solid var(--border-soft)', opacity: isOnline ? 1 : 0.45, transition: 'opacity 0.2s' }}>
                <td style={{ padding: '12px', textAlign: 'center', width: '32px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--state-selected)' : 'var(--color-cool-gray-200)', margin: '0 auto', transition: 'background 0.3s' }} />
                </td>
                <td style={{ padding: '12px', fontSize: '14px', fontWeight: 700, color: 'var(--text)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.teamName || room.groupName || '-'}</td>
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{room._memberCount || 0}명</td>
                {[1, 2, 3, 4].map(step => {
                  const done = isStepComplete(room, step, step4Counts)
                  const status = done ? 'done' : cur === step ? 'active' : 'pending'
                  return (
                    <td key={step} style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StepPip step={step} status={status} />
                      </div>
                    </td>
                  )
                })}
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-2)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── 세션 관리 ─────────────────────────────────────────────────────────────────
function ManageTab({ rooms, sessionCode, onAction }) {
  const [confirmAll, setConfirmAll] = useState(false)
  const [resettingId, setResettingId] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleResetAll() {
    if (!confirmAll) return setConfirmAll(true)
    setLoading(true)
    try { await resetAllRoomsInSession(sessionCode); onAction('전체 초기화 완료') }
    catch { onAction('초기화 실패') }
    finally { setLoading(false); setConfirmAll(false) }
  }

  async function handleResetOne(code, name) {
    setResettingId(code)
    try { await resetRoomData(code); onAction(`${name} 초기화 완료`) }
    catch { onAction('초기화 실패') }
    finally { setResettingId(null) }
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-20)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}>
      <div className="edu-sec">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>전체 초기화</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)', marginBottom: 'var(--spacing-16)' }}>세션 내 모든 모둠의 활동 데이터를 초기화합니다. 모둠 자체(코드)는 유지됩니다.</p>
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
      <div className="edu-sec">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>모둠별 초기화</p>
        {rooms.length === 0
          ? <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>아직 참여한 모둠이 없습니다.</p>
          : (
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
                    <button onClick={() => handleResetOne(room.id, name)} disabled={isResetting} style={{ padding: '7px 14px', borderRadius: '6px', background: 'var(--state-error-bg)', color: 'var(--state-error)', border: '1px solid var(--state-error-bd)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: isResetting ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: isResetting ? 0.6 : 1 }}>
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
function TopBar({ session, navTab, actionMsg, onGoHome, isMobile, rooms, onCopied }) {
  const tabTitles = { rooms: '모둠 현황', manage: '세션 관리' }
  const onlineCount = rooms.filter(r => r._online).length
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 0), 0)

  function handleCopy() {
    if (!session?.sessionCode) return
    navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())
  }

  return (
    <div style={{ flexShrink: 0, background: 'var(--color-white)', borderBottom: '1px solid var(--border)', zIndex: 10 }}>
      <div style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--spacing-20)' }}>
        {/* 왼쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)' }}>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block' }}>세션</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 800, color: 'var(--text)', letterSpacing: '3px', lineHeight: 1 }}>{session?.sessionCode || '------'}</span>
              </div>
              {session?.sessionCode && (
                <button onClick={handleCopy} title="복사" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-2)', borderRadius: '6px' }}>
                  <Copy size={14} />
                </button>
              )}
            </div>
          ) : (
            <h1 style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{tabTitles[navTab]}</h1>
          )}
          {session && !session.active && (
            <span style={{ padding: '3px 10px', borderRadius: '99px', background: 'var(--state-error-bg)', color: 'var(--state-error)', fontSize: '12px', fontWeight: 700, border: '1px solid var(--state-error-bd)' }}>종료됨</span>
          )}
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)' }}>
          {actionMsg && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--state-selected)', animation: 'fadeIn 0.3s ease' }}>✓ {actionMsg}</p>
          )}
          <button onClick={onGoHome} title="메인 화면으로" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--slate-bg)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 모바일 요약 스트립 */}
      {isMobile && (
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
          {[
            { label: '접속 모둠', value: `${onlineCount} / ${rooms.length}` },
            { label: '접속 학생', value: `${totalMembers}명` },
          ].map(({ label, value }, i) => (
            <div key={label} style={{ flex: 1, padding: '8px 16px', borderRight: i === 0 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-2)', marginBottom: '2px' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 모바일 하단 탭 ─────────────────────────────────────────────────────────────
function BottomTabBar({ navTab, setNavTab }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', background: 'var(--color-white)', borderTop: '1px solid var(--border)', height: '56px' }}>
      {[
        { key: 'rooms',  label: '모둠 현황', icon: '/icon_03.png' },
        { key: 'manage', label: '세션 관리', icon: '/icon_05.png' },
      ].map(({ key, label, icon }) => (
        <button key={key} onClick={() => setNavTab(key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: navTab === key ? 700 : 400, color: navTab === key ? 'var(--s1)' : 'var(--text-2)' }}>
          <img src={icon} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', opacity: navTab === key ? 1 : 0.5 }} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function TeacherPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionCode = searchParams.get('session')
  const device = useDevice()
  const isMobile = device === 'mobile'

  const [session, setSession] = useState(null)
  const [rooms, setRooms] = useState([])
  const [presenceCounts, setPresenceCounts] = useState({})
  const [step4Counts, setStep4Counts] = useState({}) // roomId → post count
  const [navTab, setNavTab] = useState('rooms')
  const [actionMsg, setActionMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const presenceUnsubsRef = useRef({})
  const step4UnsubsRef    = useRef({})

  useEffect(() => { if (!sessionCode) router.replace('/') }, [sessionCode, router])

  // 세션 구독
  useEffect(() => {
    if (!sessionCode) return
    const unsub = subscribeSession(sessionCode, s => { setSession(s); setLoading(false) })
    return unsub
  }, [sessionCode])

  // 모둠 구독
  useEffect(() => {
    if (!sessionCode) return
    const unsub = subscribeSessionRooms(sessionCode, rs => setRooms(rs))
    return unsub
  }, [sessionCode])

  // presence + step4Posts 구독 관리
  useEffect(() => {
    const currentIds = new Set(rooms.map(r => r.id))
    const presenceTracked = new Set(Object.keys(presenceUnsubsRef.current))
    const step4Tracked    = new Set(Object.keys(step4UnsubsRef.current))

    rooms.forEach(room => {
      if (!presenceTracked.has(room.id)) {
        presenceUnsubsRef.current[room.id] = subscribePresence(room.id, members => {
          setPresenceCounts(prev => ({ ...prev, [room.id]: members.length }))
        })
      }
      if (!step4Tracked.has(room.id)) {
        step4UnsubsRef.current[room.id] = subscribeStep4Posts(room.id, posts => {
          setStep4Counts(prev => ({ ...prev, [room.id]: posts.length }))
        })
      }
    })

    ;[presenceUnsubsRef, step4UnsubsRef].forEach((ref, ri) => {
      const tracked = ri === 0 ? presenceTracked : step4Tracked
      tracked.forEach(id => {
        if (!currentIds.has(id)) {
          ref.current[id]?.()
          delete ref.current[id]
        }
      })
    })
  }, [rooms])

  // 언마운트 시 전체 해제
  useEffect(() => {
    return () => {
      Object.values(presenceUnsubsRef.current).forEach(fn => fn?.())
      Object.values(step4UnsubsRef.current).forEach(fn => fn?.())
    }
  }, [])

  // enriched rooms
  const enrichedRooms = rooms.map(r => ({
    ...r,
    _online: (presenceCounts[r.id] ?? 0) > 0,
    _memberCount: presenceCounts[r.id] ?? 0,
  }))

  function showAction(msg) { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

  function handleCopied() { showAction('복사되었습니다') }

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
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {!isMobile && (
        <Sidebar session={session} rooms={enrichedRooms} navTab={navTab} setNavTab={setNavTab} onCopied={handleCopied} />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar session={session} navTab={navTab} actionMsg={actionMsg} onGoHome={() => router.push('/')} isMobile={isMobile} rooms={enrichedRooms} onCopied={handleCopied} />

        {navTab === 'rooms' && <RoomsTable rooms={enrichedRooms} step4Counts={step4Counts} isMobile={isMobile} />}
        {navTab === 'manage' && <ManageTab rooms={enrichedRooms} sessionCode={sessionCode} onAction={showAction} />}

        {isMobile && <BottomTabBar navTab={navTab} setNavTab={setNavTab} />}
      </div>
    </div>
  )
}
