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
  if (Array.isArray(room.dataTable) && room.dataTable.some(r =>
    Object.values(r).some(v => v && String(v).trim()))) return 2
  if (room.selectedPost) return 1
  return 0
}
function isStepDone(room, step, step4Counts) {
  return completedStep(room, step4Counts) >= step
}

// ── StepPip ───────────────────────────────────────────────────────────────────
function StepPip({ step, status }) {
  const s = {
    done:    { bg: 'var(--s1)',   color: 'var(--white)', border: 'var(--s1)' },
    active:  { bg: 'var(--white)', color: 'var(--s1)',   border: 'var(--s1)' },
    pending: { bg: 'var(--white)', color: 'var(--text-3)', border: 'var(--border)' },
  }[status]
  return (
    <div style={{
      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800,
      background: s.bg, color: s.color, border: `2.5px solid ${s.border}`,
      transition: 'all .2s',
    }}>
      {status === 'done' ? '✓' : step}
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
  const pct = Math.round((avgStep / 4) * 100)

  return (
    <div style={{
      width: 220, flexShrink: 0, background: 'var(--slate-dk)',
      display: 'flex', flexDirection: 'column',
      padding: 'var(--spacing-16)', gap: 'var(--spacing-16)',
      height: '100%', overflow: 'hidden',
    }}>
      {/* 세션 코드 */}
      <div>
        <p className="sec-label" style={{ color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>세션 코드</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--white)', letterSpacing: 5 }}>
            {session?.sessionCode || '------'}
          </p>
          {session?.sessionCode && (
            <button
              onClick={() => navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', borderRadius: 6, transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--white)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}
            >
              <Copy size={13} />
            </button>
          )}
        </div>
        {session && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>
            {[session.school, session.grade && `${session.grade}학년`, session.classNum && `${session.classNum}반`]
              .filter(Boolean).join(' ') || '학교 정보 없음'}
          </p>
        )}
      </div>

      {/* 요약 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
        {[['접속 모둠', `${onlineCount} / ${rooms.length}`], ['접속 학생', `${totalMembers}명`]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{l}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* 진행도 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>평균 진행 단계</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--white)' }}>{Math.round(avgStep)} / 4단계</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: 'var(--s1)', transition: 'width .4s ease' }} />
        </div>
      </div>

      {/* 네비 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {[
          { key: 'rooms',    label: '모둠 현황', icon: '/icon_03.png' },
          { key: 'announce', label: '공지 사항', icon: '/icon_06.png' },
          { key: 'manage',   label: '세션 관리', icon: '/icon_05.png' },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setNavTab(key)}
            className="h-step-item"
            style={{
              background: navTab === key ? 'rgba(255,255,255,.13)' : 'transparent',
              color: navTab === key ? 'var(--white)' : 'rgba(255,255,255,.55)',
              fontSize: 13,
              fontWeight: navTab === key ? 700 : 500,
            }}
          >
            <img src={icon} alt="" style={{ width: 18, height: 18, objectFit: 'contain', opacity: navTab === key ? 1 : 0.55, flexShrink: 0 }} />
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
    if (isMobile) window.location.href = url
    else window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (rooms.length === 0) {
    return (
      <div style={{ flex: 1, background: 'var(--s1-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 'var(--spacing-10)', opacity: 0.6 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>아직 참여한 모둠이 없어요.</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>세션 코드를 학생에게 공유해 주세요.</p>
      </div>
    )
  }

  /* 모바일: 카드 목록 */
  if (isMobile) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-10)', background: 'var(--s1-bg)' }}>
        {rooms.map(room => {
          const isOnline = !!room._online
          const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
          const cur = room.currentStep || 1
          return (
            <div key={room.id} className="edu-card" style={{ opacity: isOnline ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--spacing-10)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-8)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? 'var(--state-selected)' : 'var(--border)', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{room.teamName || room.groupName || '-'}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px' }}>{room.id}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-6)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{room._memberCount || 0}명</span>
                  {isOnline && (
                    <button onClick={() => handleMonitor(room)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--s1-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <img src="/icon_07.png" alt="모니터링" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-6)', marginBottom: topic !== '-' ? 'var(--spacing-8)' : 0 }}>
                {[1, 2, 3, 4].map(step => (
                  <StepPip key={step} step={step} status={isStepDone(room, step, step4Counts) ? 'done' : cur === step ? 'active' : 'pending'} />
                ))}
              </div>
              {topic !== '-' && (
                <p style={{ fontSize: 11, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>탐구: {topic}</p>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* PC: 테이블 */
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad)', background: 'var(--s1-bg)' }}>
      <div className="edu-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2.5px solid var(--border)' }}>
              {['', '모둠', '인원', '1단계', '2단계', '3단계', '4단계', '탐구 문제', '모니터링'].map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: i <= 2 ? 'left' : 'center', fontSize: 11, fontWeight: 800, color: 'var(--text-2)', letterSpacing: '.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => {
              const isOnline = !!room._online
              const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
              const cur = room.currentStep || 1
              return (
                <tr key={room.id} style={{ borderBottom: '1px solid var(--border-soft)', opacity: isOnline ? 1 : .45 }}>
                  <td style={{ padding: '11px 12px', width: 28 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? 'var(--state-selected)' : 'var(--border)', margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{room.teamName || room.groupName || '-'}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px', marginTop: 1 }}>{room.id}</p>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--text-2)' }}>{room._memberCount || 0}명</td>
                  {[1, 2, 3, 4].map(step => (
                    <td key={step} style={{ padding: '11px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StepPip step={step} status={isStepDone(room, step, step4Counts) ? 'done' : cur === step ? 'active' : 'pending'} />
                      </div>
                    </td>
                  ))}
                  <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--text-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                    {isOnline ? (
                      <button onClick={() => handleMonitor(room)} className="edu-btn"
                        style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--s1-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <img src="/icon_07.png" alt="모니터링" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                      </button>
                    ) : <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 공지 사항 패널 ─────────────────────────────────────────────────────────────
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
    try { await sendAnnouncement(sessionCode, msg); setText(''); onAction('공지 전송 완료') }
    catch { onAction('전송 실패') }
    finally { setSending(false) }
  }

  function fmtTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    return `${mm}.${dd} ${time}`
  }

  const canSend = !sending && !!text.trim()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 'var(--pad)', background: 'var(--s1-bg)', gap: 'var(--spacing-10)' }}>
      {/* 입력 */}
      <div className="edu-sec">
        <p className="sec-label">새 공지 작성</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="모든 모둠에게 공지할 내용을 입력하세요."
          rows={3}
          style={{
            width: '100%', padding: '9px 12px',
            borderRadius: 'var(--r-xs)', border: '2.5px solid var(--border)',
            fontSize: 13, color: 'var(--text)',
            outline: 'none', resize: 'none', lineHeight: 1.6,
            background: 'var(--bg)', display: 'block',
            marginBottom: 'var(--spacing-10)',
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--s1)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={() => handleSend()}
          disabled={!canSend}
          className="edu-btn"
          style={{
            width: '100%', padding: '10px 0',
            borderRadius: 'var(--r-pill)',
            background: canSend ? 'var(--s1)' : 'var(--border-soft)',
            color: canSend ? 'var(--white)' : 'var(--text-3)',
            fontSize: 14, fontWeight: 800,
            border: '2.5px solid var(--border)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            boxShadow: canSend ? 'var(--shadow-sm)' : 'none',
          }}
        >
          {sending ? '전송 중…' : '전송'}
        </button>
      </div>

      {/* 히스토리 */}
      <p className="sec-label">전송 히스토리</p>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {history.length === 0 ? (
          <div className="edu-card" style={{ textAlign: 'center', padding: 'var(--pad)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-2)' }}>아직 전송된 공지가 없습니다.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)' }}>
            {history.map(item => (
              <div key={item.id} className="edu-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-10)', marginBottom: 'var(--spacing-6)' }}>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, flex: 1 }}>{item.text}</p>
                  <button
                    onClick={() => handleSend(item.text)}
                    className="edu-btn"
                    style={{
                      flexShrink: 0, padding: '5px 12px',
                      borderRadius: 'var(--r-pill)',
                      background: 'var(--s1-bg)', color: 'var(--s1-dk)',
                      fontSize: 11, fontWeight: 800,
                      border: '2px solid var(--s1-bd)',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    다시 전송
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 700 }}>{fmtTime(item.sentAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
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
    <div style={{ flex: 1, overflow: 'auto', padding: 'var(--pad)', background: 'var(--s1-bg)' }}>
      {/* 전체 초기화 */}
      <div className="edu-sec">
        <p className="sec-label">전체 초기화</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.55, marginBottom: 'var(--spacing-16)' }}>
          세션 내 모든 모둠의 활동 데이터를 초기화합니다. 모둠 자체(코드)는 유지됩니다.
        </p>
        {confirmAll && (
          <div style={{ background: 'var(--state-error-bg)', border: '2px solid var(--state-error-bd)', borderRadius: 'var(--r-xs)', padding: '10px 14px', marginBottom: 'var(--spacing-10)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--state-error)' }}>⚠️ 정말 전체 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--spacing-8)' }}>
          <button onClick={handleResetAll} disabled={loading} className="edu-btn"
            style={{
              padding: '9px 20px', borderRadius: 'var(--r-pill)',
              background: confirmAll ? 'var(--state-error)' : 'var(--state-error-bg)',
              color: confirmAll ? 'var(--white)' : 'var(--state-error)',
              fontSize: 13, fontWeight: 800,
              border: '2px solid var(--state-error-bd)',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? .6 : 1,
              boxShadow: 'var(--shadow-xs)',
            }}>
            {loading ? '초기화 중…' : confirmAll ? '확인 — 전체 초기화' : '전체 초기화'}
          </button>
          {confirmAll && (
            <button onClick={() => setConfirmAll(false)} className="edu-btn"
              style={{
                padding: '9px 20px', borderRadius: 'var(--r-pill)',
                background: 'var(--bg)', color: 'var(--text-2)',
                fontSize: 13, fontWeight: 700,
                border: '2.5px solid var(--border)',
                cursor: 'pointer', boxShadow: 'var(--shadow-xs)',
              }}>취소</button>
          )}
        </div>
      </div>

      {/* 모둠별 초기화 */}
      <div className="edu-sec">
        <p className="sec-label">모둠별 초기화</p>
        {rooms.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--text-2)' }}>아직 참여한 모둠이 없습니다.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
              {rooms.map(room => {
                const name = room.teamName || room.groupName || room.id
                const isResetting = resettingId === room.id
                return (
                  <div key={room.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 'var(--r-xs)',
                    background: 'var(--bg)', border: '2.5px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1 }}>
                        {room.id} · {room.currentStep || 1}단계 진행 중
                      </p>
                    </div>
                    <button onClick={() => handleResetOne(room.id, name)} disabled={isResetting} className="edu-btn"
                      style={{
                        padding: '7px 14px', borderRadius: 'var(--r-pill)',
                        background: 'var(--state-error-bg)', color: 'var(--state-error)',
                        fontSize: 12, fontWeight: 800,
                        border: '2px solid var(--state-error-bd)',
                        cursor: isResetting ? 'not-allowed' : 'pointer',
                        flexShrink: 0, opacity: isResetting ? .6 : 1,
                        boxShadow: 'var(--shadow-xs)',
                      }}>
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

// ── 알림 드롭다운 ─────────────────────────────────────────────────────────────
function NotifDropdown({ announcements }) {
  function fmtTime(ts) {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`
  }
  return (
    <div className="edu-card" onClick={e => e.stopPropagation()}
      style={{ position: 'absolute', top: 44, right: 0, zIndex: 200, width: 260, maxHeight: 320, overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
      <p className="sec-label" style={{ marginBottom: 'var(--spacing-10)' }}>공지 내역</p>
      {announcements.length === 0
        ? <p style={{ fontSize: 13, color: 'var(--text-2)' }}>전송된 공지가 없습니다.</p>
        : announcements.slice(0, 10).map(a => (
          <div key={a.id} style={{
            padding: '8px 10px', borderRadius: 'var(--r-xs)',
            background: 'var(--bg)', border: '2px solid var(--border)', marginBottom: 6,
          }}>
            <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{a.text}</p>
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3, fontWeight: 700 }}>{fmtTime(a.sentAt)}</p>
          </div>
        ))}
    </div>
  )
}

// ── 상단 바 ───────────────────────────────────────────────────────────────────
function TopBar({ session, navTab, actionMsg, onGoHome, isMobile, rooms, onCopied, announcements }) {
  const tabTitles = { rooms: '모둠 현황', announce: '공지 사항', manage: '세션 관리' }
  const [showNotif, setShowNotif] = useState(false)
  const [lastSeenCount, setLastSeenCount] = useState(() => {
    try { return Number(localStorage.getItem('gts_teacher_ann_seen') || '0') } catch { return 0 }
  })
  const hasNew = announcements.length > lastSeenCount
  const onlineCount = rooms.filter(r => r._online).length
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 0), 0)

  function handleNotifClick() {
    setShowNotif(v => !v)
    const n = announcements.length
    setLastSeenCount(n)
    try { localStorage.setItem('gts_teacher_ann_seen', String(n)) } catch {}
  }

  useEffect(() => {
    if (!showNotif) return
    const h = () => setShowNotif(false)
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [showNotif])

  return (
    <div style={{ flexShrink: 0, background: 'var(--white)', borderBottom: '2.5px solid var(--border)', zIndex: 10 }}>
      {/* 헤더 행 — var(--header-h) 적용 */}
      <div style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--pad)' }}>
        {/* 왼쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)' }}>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-2)', letterSpacing: '.5px', textTransform: 'uppercase', display: 'block' }}>세션</span>
                <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: 3, lineHeight: 1 }}>{session?.sessionCode || '------'}</span>
              </div>
              {session?.sessionCode && (
                <button onClick={() => navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())}
                  style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-2)', borderRadius: 6, transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--s1)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}>
                  <Copy size={13} />
                </button>
              )}
            </div>
          ) : (
            <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', letterSpacing: '-.2px' }}>{tabTitles[navTab]}</h1>
          )}
          {session && !session.active && (
            <span className="s1-pill" style={{ fontSize: 11, background: 'var(--state-error-bg)', color: 'var(--state-error)', borderColor: 'var(--state-error-bd)' }}>종료됨</span>
          )}
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-6)' }}>
          {actionMsg && (
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--state-selected)', animation: 'fadeIn .3s ease' }}>✓ {actionMsg}</p>
          )}
          {/* 알림 아이콘 */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={handleNotifClick}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--s1-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <img src="/icon_06.png" alt="공지" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              {hasNew && <div style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: 'var(--state-error)', border: '2px solid var(--white)' }} />}
            </button>
            {showNotif && <NotifDropdown announcements={announcements} />}
          </div>
          {/* 나가기 */}
          <button onClick={onGoHome} title="메인 화면으로"
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-2)', transition: 'background .15s, color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s1-bg)'; e.currentTarget.style.color = 'var(--s1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)' }}>
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* 모바일 요약 스트립 */}
      {isMobile && (
        <div style={{ display: 'flex', borderTop: '2px solid var(--border)' }}>
          {[['접속 모둠', `${onlineCount} / ${rooms.length}`], ['접속 학생', `${totalMembers}명`]].map(([l, v], i) => (
            <div key={l} style={{ flex: 1, padding: '7px var(--pad-sm)', borderRight: i === 0 ? '2px solid var(--border)' : 'none', background: 'var(--bg)' }}>
              <p style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 2 }}>{l}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{v}</p>
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
    <div style={{ flexShrink: 0, display: 'flex', background: 'var(--white)', borderTop: '2.5px solid var(--border)', height: 54 }}>
      {[
        { key: 'rooms',    label: '모둠 현황', icon: '/icon_03.png' },
        { key: 'announce', label: '공지 사항', icon: '/icon_06.png' },
        { key: 'manage',   label: '세션 관리', icon: '/icon_05.png' },
      ].map(({ key, label, icon }) => (
        <button key={key} onClick={() => setNavTab(key)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 2, border: 'none', background: navTab === key ? 'var(--s1-bg)' : 'var(--white)',
          cursor: 'pointer', fontSize: 10, fontWeight: navTab === key ? 800 : 500,
          color: navTab === key ? 'var(--s1)' : 'var(--text-2)',
          borderTop: navTab === key ? '2.5px solid var(--s1)' : '2.5px solid transparent',
          transition: 'all .15s', marginTop: -2.5,
        }}>
          <img src={icon} alt="" style={{ width: 20, height: 20, objectFit: 'contain', opacity: navTab === key ? 1 : .45 }} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
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
    return subscribeSession(sessionCode, s => {
      setSession(s); setLoading(false)
      if (s) try { localStorage.setItem('gts_teacher_last', JSON.stringify({ sessionCode: s.sessionCode, school: s.school||'', grade: s.grade||'', classNum: s.classNum||'' })) } catch {}
    })
  }, [sessionCode])

  useEffect(() => {
    if (!sessionCode) return
    return subscribeSessionRooms(sessionCode, setRooms)
  }, [sessionCode])

  useEffect(() => {
    if (!sessionCode) return
    return subscribeAnnouncements(sessionCode, setAnnouncements)
  }, [sessionCode])

  useEffect(() => {
    const currentIds = new Set(rooms.map(r => r.id))
    const pt = new Set(Object.keys(presenceUnsubsRef.current))
    const st = new Set(Object.keys(step4UnsubsRef.current))
    rooms.forEach(room => {
      if (!pt.has(room.id)) presenceUnsubsRef.current[room.id] = subscribePresence(room.id, members =>
        setPresenceCounts(prev => ({ ...prev, [room.id]: members.length })))
      if (!st.has(room.id)) step4UnsubsRef.current[room.id] = subscribeStep4Posts(room.id, posts =>
        setStep4Counts(prev => ({ ...prev, [room.id]: posts.length })))
    })
    ;[presenceUnsubsRef, step4UnsubsRef].forEach((ref, ri) => {
      (ri === 0 ? pt : st).forEach(id => {
        if (!currentIds.has(id)) { ref.current[id]?.(); delete ref.current[id] }
      })
    })
  }, [rooms])

  useEffect(() => () => {
    Object.values(presenceUnsubsRef.current).forEach(fn => fn?.())
    Object.values(step4UnsubsRef.current).forEach(fn => fn?.())
  }, [])

  const enrichedRooms = rooms.map(r => ({
    ...r,
    _online: (presenceCounts[r.id] ?? 0) > 0,
    _memberCount: presenceCounts[r.id] ?? 0,
  }))

  function showAction(msg) { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

  if (!sessionCode) return null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg)' }}>
      <p style={{ fontSize: 15, color: 'var(--text-2)' }}>로딩 중…</p>
    </div>
  )

  if (!session) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--bg)', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>세션을 찾을 수 없습니다</p>
      <button onClick={() => router.replace('/')} className="edu-btn"
        style={{ padding: '10px 24px', borderRadius: 'var(--r-pill)', background: 'var(--s1)', color: 'var(--white)', border: 'none', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
        홈으로
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>
      {!isMobile && (
        <Sidebar session={session} rooms={enrichedRooms} navTab={navTab} setNavTab={setNavTab}
          onCopied={() => showAction('복사되었습니다')} step4Counts={step4Counts} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <TopBar session={session} navTab={navTab} actionMsg={actionMsg}
          onGoHome={() => router.push('/')} isMobile={isMobile} rooms={enrichedRooms}
          onCopied={() => showAction('복사되었습니다')} announcements={announcements} />
        {navTab === 'rooms'    && <RoomsTable rooms={enrichedRooms} step4Counts={step4Counts} isMobile={isMobile} sessionCode={sessionCode} />}
        {navTab === 'announce' && <AnnouncementPanel sessionCode={sessionCode} onAction={showAction} />}
        {navTab === 'manage'   && <ManageTab rooms={enrichedRooms} sessionCode={sessionCode} onAction={showAction} />}
        {isMobile && <BottomTabBar navTab={navTab} setNavTab={setNavTab} />}
      </div>
    </div>
  )
}
