'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogOut, Copy } from 'lucide-react'
import { useDevice } from '../../lib/DeviceContext'
import {
  subscribeSession, subscribeSessionRooms, subscribePresence,
  subscribeStep4Posts, resetRoomData, resetAllRoomsInSession,
  sendAnnouncement, subscribeAnnouncements,
} from '../../lib/firestore'

// ── 단계 완료 판단 ────────────────────────────────────────────────────────────
function completedStep(room, step4Counts) {
  if ((step4Counts?.[room.id] || 0) > 0) return 4
  if (room.canvasSnapshot || (room.chartConfig && room.chartConfig.title)) return 3
  if (Array.isArray(room.dataTable) && room.dataTable.some(r => Object.values(r).some(v => v && String(v).trim()))) return 2
  if (room.selectedPost) return 1
  return 0
}
function isStepDone(room, step, step4Counts) {
  return completedStep(room, step4Counts) >= step
}

// ── StepPip ───────────────────────────────────────────────────────────────────
function StepPip({ step, status }) {
  const s = {
    done:    { bg: 'var(--s1)', color: 'var(--color-white)', border: 'var(--s1)' },
    active:  { bg: 'var(--color-white)', color: 'var(--s1)', border: 'var(--s1)' },
    pending: { bg: 'var(--color-white)', color: 'var(--color-cool-gray-400)', border: 'var(--color-cool-gray-200)' },
  }[status]
  return (
    <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, background: s.bg, color: s.color, border: `2px solid ${s.border}`, transition: 'all 0.2s' }}>
      {status === 'done' ? '✓' : step}
    </div>
  )
}

// ── 공지사항 패널 ─────────────────────────────────────────────────────────────
function AnnouncementPanel({ sessionCode, onAction }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!sessionCode) return
    return subscribeAnnouncements(sessionCode, setHistory)
  }, [sessionCode])

  async function handleSend(t) {
    const msg = (t || text).trim()
    if (!msg) return
    setSending(true)
    try {
      await sendAnnouncement(sessionCode, msg)
      setText('')
      onAction('공지 전송 완료')
    } catch { onAction('전송 실패') }
    finally { setSending(false) }
  }

  function fmtTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const mm = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    return mm+'.'+dd+' '+time
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, background: 'var(--s1-bg)' }}>
      {/* 입력 영역 */}
      <div className="edu-sec">
        <p className="sec-label">새 공지 작성</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="모든 모둠에게 공지할 내용을 입력하세요."
          rows={3}
          className="edu-input"
          style={{ width: '100%', padding: '9px 11px', borderRadius: 'var(--r-xs)', border: '2px solid var(--border)', fontFamily: 'var(--font-body)', fontSize: '13px', outline: 'none', resize: 'none', lineHeight: 1.6, background: 'var(--slate-bg)', color: 'var(--text)', display: 'block', marginBottom: 10 }}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !text.trim()}
          className="edu-btn"
          style={{ width: '100%', padding: '10px', borderRadius: 'var(--r-pill)', background: (sending || !text.trim()) ? 'var(--slate-bg)' : 'var(--s1)', color: (sending || !text.trim()) ? 'var(--text-3)' : '#fff', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 800, border: '2.5px solid var(--border)', cursor: (sending || !text.trim()) ? 'not-allowed' : 'pointer', boxShadow: (sending || !text.trim()) ? 'none' : 'var(--shadow-sm)' }}
        >
          {sending ? '전송 중…' : '전송'}
        </button>
      </div>

      {/* 히스토리 */}
      <p className="sec-label" style={{ marginBottom: 8 }}>전송 히스토리</p>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {history.length === 0 ? (
          <div className="edu-card" style={{ textAlign: 'center', padding: 20 }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>아직 전송된 공지가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(item => (
              <div key={item.id} className="edu-card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text)', lineHeight: 1.55, flex: 1 }}>{item.text}</p>
                  <button
                    onClick={() => handleSend(item.text)}
                    className="edu-btn"
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 'var(--r-pill)', background: 'var(--s1-bg)', color: 'var(--s1-dk)', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 800, border: '2px solid var(--s1-bd)', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-xs)' }}
                  >
                    다시 전송
                  </button>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-3)', fontWeight: 700 }}>{fmtTime(item.sentAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 사이드바 ─────────────────────────────────────────────────────────────────
function Sidebar({ session, rooms, navTab, setNavTab, onCopied, step4Counts }) {
  const onlineCount = rooms.filter(r => r._online).length
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 0), 0)
  const validRooms = rooms.filter(r => r.id)
  const avgStep = validRooms.length > 0
    ? validRooms.reduce((sum, r) => sum + completedStep(r, step4Counts), 0) / validRooms.length
    : 0
  const avgStepRounded = Math.round(avgStep)
  const progressPct = Math.round((avgStep / 4) * 100)

  return (
    <div style={{ width: '220px', flexShrink: 0, background: 'var(--slate-dk)', display: 'flex', flexDirection: 'column', padding: 'var(--spacing-20)', gap: 'var(--spacing-20)', height: '100%', overflow: 'hidden' }}>
      {/* 세션 코드 */}
      <div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>세션 코드</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '28px', fontWeight: 800, color: 'var(--color-white)', letterSpacing: '6px' }}>{session?.sessionCode || '------'}</p>
          {session?.sessionCode && (
            <button onClick={() => navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())} title="복사" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', borderRadius: '6px', transition: 'color 0.15s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
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
        {[['접속 모둠', `${onlineCount} / ${rooms.length}`], ['접속 학생', `${totalMembers}명`]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>{l}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--color-white)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* 진행도 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>평균 진행 단계</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--color-white)' }}>{avgStepRounded} / 4단계</span>
        </div>
        <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: '99px', width: `${progressPct}%`, background: 'var(--s1)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* 네비 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {[
          { key: 'rooms',   label: '모둠 현황', icon: '/icon_03.png' },
          { key: 'announce',label: '공지 사항',  icon: '/icon_06.png' },
          { key: 'manage',  label: '세션 관리', icon: '/icon_05.png' },
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
function RoomsTable({ rooms, step4Counts, isMobile, sessionCode }) {
  function handleMonitor(room) {
    const url = `/activity?room=${room.id}&mode=watch&session=${sessionCode}`
    if (isMobile) {
      window.location.href = url
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

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
          const done = completedStep(room, step4Counts)
          return (
            <div key={room.id} className="edu-card" style={{ opacity: isOnline ? 1 : 0.5, padding: 'var(--spacing-16)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? 'var(--state-selected)' : 'var(--color-cool-gray-200)', flexShrink: 0 }} />
                  <div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)', display: 'block' }}>{room.teamName || room.groupName || '-'}</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '1px' }}>{room.id}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>{room._memberCount || 0}명</span>
                  {isOnline && (
                    <button onClick={() => handleMonitor(room)} title="화면 모니터링" style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slate-bg)', border: '1px solid var(--slate-bd)', borderRadius: '6px', cursor: 'pointer' }}><img src='/icon_07.png' alt='모니터링' style={{ width:16, height:16, objectFit:'contain' }}/></button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: topic !== '-' ? '8px' : 0 }}>
                {[1, 2, 3, 4].map(step => {
                  const isDone = isStepDone(room, step, step4Counts)
                  const cur = room.currentStep || 1
                  const status = isDone ? 'done' : cur === step ? 'active' : 'pending'
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
            {['', '모둠명', '인원', '1단계', '2단계', '3단계', '4단계', '탐구 문제', '모니터링'].map((h, i) => (
              <th key={i} style={{ padding: '10px 12px', textAlign: i === 0 || i === 8 ? 'center' : i <= 2 ? 'left' : 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{h}</th>
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
                <td style={{ padding: '12px', maxWidth: '140px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.teamName || room.groupName || '-'}</p>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-2)', letterSpacing: '1px', marginTop: '1px' }}>{room.id}</p>
                </td>
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{room._memberCount || 0}명</td>
                {[1, 2, 3, 4].map(step => {
                  const isDone = isStepDone(room, step, step4Counts)
                  const status = isDone ? 'done' : cur === step ? 'active' : 'pending'
                  return (
                    <td key={step} style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StepPip step={step} status={status} />
                      </div>
                    </td>
                  )
                })}
                <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-2)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {isOnline ? (
                    <button
                      onClick={() => handleMonitor(room)}
                      title={`${room.teamName || room.groupName} 화면 보기`}
                      style={{ width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--slate-bg)', border: '1px solid var(--slate-bd)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--s1-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'var(--slate-bg)'}
                    ><img src="/icon_07.png" alt="모니터링" style={{ width:16, height:16, objectFit:'contain' }}/></button>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--color-cool-gray-300)' }}>—</span>
                  )}
                </td>
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
          {confirmAll && <button onClick={() => setConfirmAll(false)} style={{ padding: '9px 20px', borderRadius: '8px', background: 'var(--slate-bg)', color: 'var(--text-2)', border: '1px solid var(--slate-bd)', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>취소</button>}
        </div>
      </div>
      <div className="edu-sec">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>모둠별 초기화</p>
        {rooms.length === 0 ? <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>아직 참여한 모둠이 없습니다.</p> : (
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

// ── 알림 아이콘 드롭다운 ──────────────────────────────────────────────────────
function NotifDropdown({ announcements, onClose }) {
  function fmtTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  }
  return (
    <div style={{ position: 'absolute', top: '44px', right: '0', zIndex: 200, background: 'var(--color-white)', border: '1px solid var(--border)', borderRadius: '12px', padding: 'var(--spacing-16)', width: '260px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: '320px', overflowY: 'auto' }}
      onClick={e => e.stopPropagation()}
    >
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '10px' }}>공지 내역</p>
      {announcements.length === 0 ? (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-2)' }}>전송된 공지가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {announcements.slice(0, 10).map(a => (
            <div key={a.id} style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--slate-bg)', border: '1px solid var(--slate-bd)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>{a.text}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-2)', marginTop: '3px' }}>{fmtTime(a.sentAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 상단 바 ───────────────────────────────────────────────────────────────────
function TopBar({ session, navTab, actionMsg, onGoHome, isMobile, rooms, onCopied, announcements, sessionCode }) {
  const tabTitles = { rooms: '모둠 현황', announce: '공지 사항', manage: '세션 관리' }
  const onlineCount = rooms.filter(r => r._online).length
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 0), 0)
  const [showNotif, setShowNotif] = useState(false)
  // localStorage에 마지막으로 확인한 공지 수를 저장 → 새로고침 후에도 유지
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    try { return Number(localStorage.getItem('gts_teacher_ann_seen') || '0') } catch { return 0 }
  })
  const hasNew = announcements.length > lastSeenCount

  function handleNotifClick() {
    setShowNotif(v => !v)
    const newCount = announcements.length
    setLastSeenCount(newCount)
    try { localStorage.setItem('gts_teacher_ann_seen', String(newCount)) } catch {}
  }

  useEffect(() => {
    if (!showNotif) return
    function handle() { setShowNotif(false) }
    document.addEventListener('click', handle)
    return () => document.removeEventListener('click', handle)
  }, [showNotif])

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
                <button onClick={() => navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-2)', borderRadius: '6px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-8)' }}>
          {actionMsg && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--state-selected)', animation: 'fadeIn 0.3s ease' }}>✓ {actionMsg}</p>
          )}
          {/* 알림 아이콘 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={handleNotifClick}
              title="공지 내역"
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <img src="/icon_06.png" alt="공지" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
              {hasNew && <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--state-error)', border: '2px solid var(--color-white)' }} />}
            </button>
            {showNotif && <NotifDropdown announcements={announcements} onClose={() => setShowNotif(false)} />}
          </div>
          {/* 나가기 */}
          <button onClick={onGoHome} title="메인 화면으로" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', transition: 'background 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--slate-bg)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* 모바일 요약 스트립 */}
      {isMobile && (
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
          {[['접속 모둠', `${onlineCount} / ${rooms.length}`], ['접속 학생', `${totalMembers}명`]].map(({ 0: label, 1: value }, i) => (
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
        { key: 'rooms',    label: '모둠 현황', icon: '/icon_03.png' },
        { key: 'announce', label: '공지 사항',  icon: '/icon_06.png' },
        { key: 'manage',   label: '세션 관리', icon: '/icon_05.png' },
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
  const [step4Counts, setStep4Counts] = useState({})
  const [announcements, setAnnouncements] = useState([])
  const [navTab, setNavTab] = useState('rooms')
  const [actionMsg, setActionMsg] = useState('')
  const [loading, setLoading] = useState(true)

  const presenceUnsubsRef = useRef({})
  const step4UnsubsRef    = useRef({})

  useEffect(() => { if (!sessionCode) router.replace('/') }, [sessionCode, router])

  useEffect(() => {
    if (!sessionCode) return
    const unsub = subscribeSession(sessionCode, s => {
      setSession(s)
      setLoading(false)
      if (s) {
        try {
          localStorage.setItem('gts_teacher_last', JSON.stringify({
            sessionCode: s.sessionCode, school: s.school || '',
            grade: s.grade || '', classNum: s.classNum || '',
          }))
        } catch {}
      }
    })
    return unsub
  }, [sessionCode])

  useEffect(() => {
    if (!sessionCode) return
    const unsub = subscribeSessionRooms(sessionCode, rs => setRooms(rs))
    return unsub
  }, [sessionCode])

  // 공지사항 구독
  useEffect(() => {
    if (!sessionCode) return
    return subscribeAnnouncements(sessionCode, setAnnouncements)
  }, [sessionCode])

  // presence + step4 구독
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

  useEffect(() => {
    return () => {
      Object.values(presenceUnsubsRef.current).forEach(fn => fn?.())
      Object.values(step4UnsubsRef.current).forEach(fn => fn?.())
    }
  }, [])

  const enrichedRooms = rooms.map(r => ({
    ...r,
    _online: (presenceCounts[r.id] ?? 0) > 0,
    _memberCount: presenceCounts[r.id] ?? 0,
  }))

  function showAction(msg) { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

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
        <Sidebar session={session} rooms={enrichedRooms} navTab={navTab} setNavTab={setNavTab}
          onCopied={() => showAction('복사되었습니다')} step4Counts={step4Counts} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar session={session} navTab={navTab} actionMsg={actionMsg} onGoHome={() => router.push('/')}
          isMobile={isMobile} rooms={enrichedRooms} onCopied={() => showAction('복사되었습니다')}
          announcements={announcements} sessionCode={sessionCode} />

        {navTab === 'rooms'    && <RoomsTable rooms={enrichedRooms} step4Counts={step4Counts} isMobile={isMobile} sessionCode={sessionCode} />}
        {navTab === 'announce' && <AnnouncementPanel sessionCode={sessionCode} onAction={showAction} />}
        {navTab === 'manage'   && <ManageTab rooms={enrichedRooms} sessionCode={sessionCode} onAction={showAction} />}

        {isMobile && <BottomTabBar navTab={navTab} setNavTab={setNavTab} />}
      </div>
    </div>
  )
}
