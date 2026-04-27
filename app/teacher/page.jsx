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

// ── 디자인 토큰 (activity 화면 기준) ─────────────────────────────────────────
// --color-cool-gray-100: #eeeef3  (배경, 보조 배경)
// --color-cool-gray-200: #e2e3e5  (카드 테두리, input 테두리)
// --color-cool-gray-400: #8a949e  (보조 텍스트)
// --color-cool-gray-500: #555555  (기본 텍스트 보조)
// --color-purple-500:    #5b41eb  (주 버튼, 액센트)
// --color-white:         #ffffff  (카드 배경, input 배경)

// ── 단계 완료 판단 ────────────────────────────────────────────────────────────
function completedStep(room, step4Counts) {
  if ((step4Counts?.[room.id] || 0) > 0) return 4
  if (room.canvasSnapshot || (room.chartConfig && room.chartConfig.title)) return 3
  if (Array.isArray(room.dataTable) && room.dataTable.some(r =>
    Object.values(r).some(v => v && String(v).trim()))) return 2
  if (room.selectedPost) return 1
  return 0
}
function isStepDone(room, step, step4Counts) { return completedStep(room, step4Counts) >= step }

// ── StepPip ───────────────────────────────────────────────────────────────────
function StepPip({ step, status }) {
  const s = {
    done:    { bg: 'var(--color-purple-500)', color: 'var(--color-white)', border: 'var(--color-purple-500)' },
    active:  { bg: 'var(--color-white)', color: 'var(--color-purple-500)', border: 'var(--color-purple-500)' },
    pending: { bg: 'var(--color-white)', color: 'var(--color-cool-gray-400)', border: 'var(--color-cool-gray-200)' },
  }[status]
  return (
    <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, background: s.bg, color: s.color, border: `2px solid ${s.border}`, transition: 'all .2s' }}>
      {status === 'done' ? '✓' : step}
    </div>
  )
}

// ── Card 컴포넌트: 흰 배경 + cool-gray 테두리 ─────────────────────────────────
function Card({ children, style, ...rest }) {
  return (
    <div style={{ background: 'var(--color-white)', border: '1.5px solid var(--color-cool-gray-200)', borderRadius: 12, padding: 16, ...style }} {...rest}>
      {children}
    </div>
  )
}

// ── 사이드바 ─────────────────────────────────────────────────────────────────
function Sidebar({ session, rooms, navTab, setNavTab, onCopied, step4Counts }) {
  const onlineCount = rooms.filter(r => r._online).length
  const totalMembers = rooms.reduce((sum, r) => sum + (r._memberCount || 0), 0)
  const avgStep = rooms.length > 0 ? rooms.reduce((s, r) => s + completedStep(r, step4Counts), 0) / rooms.length : 0
  const pct = Math.round((avgStep / 4) * 100)

  return (
    <div style={{ width: 220, flexShrink: 0, background: '#1E293B', display: 'flex', flexDirection: 'column', padding: 16, gap: 16, height: '100%', overflow: 'hidden' }}>
      {/* 세션 코드 */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>세션 코드</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-white)', letterSpacing: 5 }}>{session?.sessionCode || '------'}</p>
          {session?.sessionCode && (
            <button onClick={() => navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)', borderRadius: 6, transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-white)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.4)'}>
              <Copy size={13} />
            </button>
          )}
        </div>
        {session && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>
            {[session.school, session.grade && `${session.grade}학년`, session.classNum && `${session.classNum}반`].filter(Boolean).join(' ') || '학교 정보 없음'}
          </p>
        )}
      </div>

      {/* 요약 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[['접속 모둠', `${onlineCount} / ${rooms.length}`], ['접속 학생', `${totalMembers}명`]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.55)' }}>{l}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-white)' }}>{v}</span>
          </div>
        ))}
      </div>

      {/* 진행도 */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>평균 진행 단계</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-white)' }}>{Math.round(avgStep)} / 4단계</span>
        </div>
        <div style={{ height: 5, borderRadius: 99, background: 'rgba(255,255,255,.15)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: 'var(--color-purple-500)', transition: 'width .4s ease' }} />
        </div>
      </div>

      {/* 네비 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {[
          { key: 'rooms',    label: '모둠 현황', icon: '/icon_03.png' },
          { key: 'announce', label: '공지 사항', icon: '/icon_06.png' },
          { key: 'manage',   label: '세션 관리', icon: '/icon_05.png' },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setNavTab(key)} className="h-step-item"
            style={{ background: navTab === key ? 'rgba(255,255,255,.13)' : 'transparent', color: navTab === key ? 'var(--color-white)' : 'rgba(255,255,255,.55)', fontSize: 13, fontWeight: navTab === key ? 700 : 500 }}>
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

  // 전체 배경: --color-cool-gray-100 (#eeeef3)
  if (rooms.length === 0) {
    return (
      <div style={{ flex: 1, background: 'var(--color-cool-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, opacity: 0.6 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-cool-gray-500)' }}>아직 참여한 모둠이 없어요.</p>
        <p style={{ fontSize: 13, color: 'var(--color-cool-gray-400)' }}>세션 코드를 학생에게 공유해 주세요.</p>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-cool-gray-100)' }}>
        {rooms.map(room => {
          const isOnline = !!room._online
          const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
          const cur = room.currentStep || 1
          return (
            <Card key={room.id} style={{ opacity: isOnline ? 1 : 0.5, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#10B981' : 'var(--color-cool-gray-200)', flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-cool-gray-500)' }}>{room.teamName || room.groupName || '-'}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cool-gray-400)', letterSpacing: '1px' }}>{room.id}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--color-cool-gray-400)' }}>{room._memberCount || 0}명</span>
                  {isOnline && (
                    <button onClick={() => handleMonitor(room)} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-cool-gray-100)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <img src="/icon_07.png" alt="모니터링" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: topic !== '-' ? 8 : 0 }}>
                {[1, 2, 3, 4].map(step => (
                  <StepPip key={step} step={step} status={isStepDone(room, step, step4Counts) ? 'done' : cur === step ? 'active' : 'pending'} />
                ))}
              </div>
              {topic !== '-' && <p style={{ fontSize: 11, color: 'var(--color-cool-gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>탐구: {topic}</p>}
            </Card>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--color-cool-gray-100)' }}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1.5px solid var(--color-cool-gray-200)` }}>
              {['', '모둠', '인원', '1단계', '2단계', '3단계', '4단계', '탐구 문제', '모니터링'].map((h, i) => (
                <th key={i} style={{ padding: '10px 12px', textAlign: i <= 2 ? 'left' : 'center', fontSize: 11, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.4px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => {
              const isOnline = !!room._online
              const topic = room.selectedPost?.topic || room.selectedPost?.text || '-'
              const cur = room.currentStep || 1
              return (
                <tr key={room.id} style={{ borderBottom: `1px solid var(--color-cool-gray-100)`, opacity: isOnline ? 1 : .45 }}>
                  <td style={{ padding: '11px 12px', width: 28 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: isOnline ? '#10B981' : 'var(--color-cool-gray-200)', margin: '0 auto' }} />
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-cool-gray-500)', whiteSpace: 'nowrap' }}>{room.teamName || room.groupName || '-'}</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-cool-gray-400)', letterSpacing: '1px', marginTop: 1 }}>{room.id}</p>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--color-cool-gray-400)' }}>{room._memberCount || 0}명</td>
                  {[1, 2, 3, 4].map(step => (
                    <td key={step} style={{ padding: '11px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StepPip step={step} status={isStepDone(room, step, step4Counts) ? 'done' : cur === step ? 'active' : 'pending'} />
                      </div>
                    </td>
                  ))}
                  <td style={{ padding: '11px 12px', fontSize: 12, color: 'var(--color-cool-gray-400)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic}</td>
                  <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                    {isOnline ? (
                      <button onClick={() => handleMonitor(room)}
                        style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-cool-gray-100)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <img src="/icon_07.png" alt="모니터링" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                      </button>
                    ) : <span style={{ fontSize: 11, color: 'var(--color-cool-gray-400)' }}>—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
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
    return `${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${d.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`
  }

  const canSend = !sending && !!text.trim()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16, background: 'var(--color-cool-gray-100)', gap: 10 }}>
      {/* 입력 카드 */}
      <Card>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>새 공지 작성</p>
        {/* input — 이미지3 스타일: 흰 배경 + cool-gray 테두리 */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="모든 모둠에게 공지할 내용을 입력하세요."
          rows={3}
          style={{
            width: '100%', padding: '10px 14px',
            borderRadius: 8, border: `1.5px solid var(--color-cool-gray-200)`,
            fontSize: 14, color: 'var(--color-cool-gray-500)',
            background: 'var(--color-white)',
            outline: 'none', resize: 'none', lineHeight: 1.6,
            display: 'block', marginBottom: 10,
            transition: 'border-color .15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--color-purple-500)'}
          onBlur={e => e.target.style.borderColor = 'var(--color-cool-gray-200)'}
        />
        {/* 버튼 — 이미지3 스타일: 보라 배경(활성) or 연보라(비활성) */}
        <button
          onClick={() => handleSend()}
          disabled={!canSend}
          style={{
            width: '100%', height: 48,
            borderRadius: 100,
            background: canSend ? 'var(--color-purple-500)' : 'var(--color-cool-gray-100)',
            color: canSend ? 'var(--color-white)' : 'var(--color-cool-gray-400)',
            fontSize: 15, fontWeight: 600,
            border: '1px solid var(--color-black-overlay-10)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            transition: 'background .15s',
            letterSpacing: '-.3px',
          }}
        >
          {sending ? '전송 중…' : '전송'}
        </button>
      </Card>

      {/* 히스토리 */}
      <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 0 }}>전송 히스토리</p>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.length === 0 ? (
          <Card>
            <p style={{ fontSize: 13, color: 'var(--color-cool-gray-400)', textAlign: 'center', padding: '8px 0' }}>아직 전송된 공지가 없습니다.</p>
          </Card>
        ) : history.map(item => (
          <Card key={item.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
              <p style={{ fontSize: 14, color: 'var(--color-cool-gray-500)', lineHeight: 1.55, flex: 1 }}>{item.text}</p>
              {/* 다시 전송 버튼 — 이미지3 보조버튼 스타일 */}
              <button onClick={() => handleSend(item.text)}
                style={{
                  flexShrink: 0, padding: '7px 14px',
                  borderRadius: 100,
                  background: 'var(--color-cool-gray-100)',
                  color: 'var(--color-purple-500)',
                  fontSize: 12, fontWeight: 700,
                  border: `1.5px solid var(--color-cool-gray-200)`,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                다시 전송
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--color-cool-gray-400)', fontWeight: 600 }}>{fmtTime(item.sentAt)}</p>
          </Card>
        ))}
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

  // 경고 배경색: 부드러운 연빨강
  const errBg = '#FEF2F2', errBd = '#FECACA', errTx = '#DC2626'

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: 16, background: 'var(--color-cool-gray-100)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 전체 초기화 */}
      <Card>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 8 }}>전체 초기화</p>
        <p style={{ fontSize: 13, color: 'var(--color-cool-gray-400)', lineHeight: 1.6, marginBottom: 14 }}>세션 내 모든 모둠의 활동 데이터를 초기화합니다. 모둠 자체(코드)는 유지됩니다.</p>
        {confirmAll && (
          <div style={{ background: errBg, border: `1.5px solid ${errBd}`, borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: errTx }}>⚠️ 정말 전체 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleResetAll} disabled={loading}
            style={{ padding: '9px 20px', borderRadius: 100, background: confirmAll ? errTx : errBg, color: confirmAll ? 'var(--color-white)' : errTx, fontSize: 13, fontWeight: 700, border: `1.5px solid ${errBd}`, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1 }}>
            {loading ? '초기화 중…' : confirmAll ? '확인 — 전체 초기화' : '전체 초기화'}
          </button>
          {confirmAll && (
            <button onClick={() => setConfirmAll(false)}
              style={{ padding: '9px 20px', borderRadius: 100, background: 'var(--color-cool-gray-100)', color: 'var(--color-cool-gray-500)', fontSize: 13, fontWeight: 600, border: `1.5px solid var(--color-cool-gray-200)`, cursor: 'pointer' }}>
              취소
            </button>
          )}
        </div>
      </Card>

      {/* 모둠별 초기화 */}
      <Card>
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 12 }}>모둠별 초기화</p>
        {rooms.length === 0
          ? <p style={{ fontSize: 13, color: 'var(--color-cool-gray-400)' }}>아직 참여한 모둠이 없습니다.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rooms.map(room => {
                const name = room.teamName || room.groupName || room.id
                const isResetting = resettingId === room.id
                return (
                  <div key={room.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: 'var(--color-cool-gray-100)', border: `1.5px solid var(--color-cool-gray-200)` }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-cool-gray-500)' }}>{name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-cool-gray-400)', marginTop: 1 }}>{room.id} · {room.currentStep || 1}단계 진행 중</p>
                    </div>
                    <button onClick={() => handleResetOne(room.id, name)} disabled={isResetting}
                      style={{ padding: '7px 14px', borderRadius: 100, background: errBg, color: errTx, fontSize: 12, fontWeight: 700, border: `1.5px solid ${errBd}`, cursor: isResetting ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: isResetting ? .6 : 1 }}>
                      {isResetting ? '초기화 중…' : '초기화'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
      </Card>
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
    <div onClick={e => e.stopPropagation()}
      style={{ position: 'absolute', top: 42, right: 0, zIndex: 200, background: 'var(--color-white)', border: `1.5px solid var(--color-cool-gray-200)`, borderRadius: 12, padding: 14, width: 260, maxHeight: 320, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.10)' }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 10 }}>공지 내역</p>
      {announcements.length === 0
        ? <p style={{ fontSize: 13, color: 'var(--color-cool-gray-400)' }}>전송된 공지가 없습니다.</p>
        : announcements.slice(0, 10).map(a => (
          <div key={a.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--color-cool-gray-100)', border: `1px solid var(--color-cool-gray-200)`, marginBottom: 6 }}>
            <p style={{ fontSize: 13, color: 'var(--color-cool-gray-500)', lineHeight: 1.5 }}>{a.text}</p>
            <p style={{ fontSize: 10, color: 'var(--color-cool-gray-400)', marginTop: 3, fontWeight: 600 }}>{fmtTime(a.sentAt)}</p>
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
    <div style={{ flexShrink: 0, background: 'var(--color-white)', borderBottom: `1.5px solid var(--color-cool-gray-200)`, zIndex: 10 }}>
      <div style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
        {/* 왼쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-cool-gray-400)', letterSpacing: '.5px', textTransform: 'uppercase', display: 'block' }}>세션</span>
                <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--color-cool-gray-500)', letterSpacing: 3, lineHeight: 1 }}>{session?.sessionCode || '------'}</span>
              </div>
              {session?.sessionCode && (
                <button onClick={() => navigator.clipboard.writeText(session.sessionCode).then(() => onCopied?.())}
                  style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-cool-gray-400)', borderRadius: 6, transition: 'color .15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-purple-500)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--color-cool-gray-400)'}>
                  <Copy size={13} />
                </button>
              )}
            </div>
          ) : (
            <h1 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-cool-gray-500)', letterSpacing: '-.2px' }}>{tabTitles[navTab]}</h1>
          )}
          {session && !session.active && (
            <span style={{ padding: '3px 10px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700, border: '1px solid #FECACA' }}>종료됨</span>
          )}
        </div>

        {/* 오른쪽 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {actionMsg && (
            <p style={{ fontSize: 12, fontWeight: 700, color: '#10B981', animation: 'fadeIn .3s ease' }}>✓ {actionMsg}</p>
          )}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={handleNotifClick}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-cool-gray-100)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <img src="/icon_06.png" alt="공지" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              {hasNew && <div style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#EF4444', border: '2px solid var(--color-white)' }} />}
            </button>
            {showNotif && <NotifDropdown announcements={announcements} />}
          </div>
          <button onClick={onGoHome} title="메인 화면으로"
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-cool-gray-400)', transition: 'background .15s, color .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-cool-gray-100)'; e.currentTarget.style.color = 'var(--color-cool-gray-500)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-cool-gray-400)' }}>
            <LogOut size={17} />
          </button>
        </div>
      </div>

      {/* 모바일 요약 스트립 */}
      {isMobile && (
        <div style={{ display: 'flex', borderTop: `1.5px solid var(--color-cool-gray-200)` }}>
          {[['접속 모둠', `${onlineCount} / ${rooms.length}`], ['접속 학생', `${totalMembers}명`]].map(([l, v], i) => (
            <div key={l} style={{ flex: 1, padding: '8px 14px', borderRight: i === 0 ? `1.5px solid var(--color-cool-gray-200)` : 'none', background: 'var(--color-white)' }}>
              <p style={{ fontSize: 10, color: 'var(--color-cool-gray-400)', marginBottom: 2 }}>{l}</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-cool-gray-500)' }}>{v}</p>
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
    <div style={{ flexShrink: 0, display: 'flex', background: 'var(--color-white)', borderTop: `1.5px solid var(--color-cool-gray-200)`, height: 54 }}>
      {[
        { key: 'rooms',    label: '모둠 현황', icon: '/icon_03.png' },
        { key: 'announce', label: '공지 사항', icon: '/icon_06.png' },
        { key: 'manage',   label: '세션 관리', icon: '/icon_05.png' },
      ].map(({ key, label, icon }) => (
        <button key={key} onClick={() => setNavTab(key)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          border: 'none', background: navTab === key ? 'var(--color-cool-gray-100)' : 'var(--color-white)',
          cursor: 'pointer', fontSize: 10, fontWeight: navTab === key ? 800 : 500,
          color: navTab === key ? 'var(--color-purple-500)' : 'var(--color-cool-gray-400)',
          borderTop: navTab === key ? `2px solid var(--color-purple-500)` : '2px solid transparent',
          transition: 'all .15s', marginTop: -2,
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

  const enrichedRooms = rooms.map(r => ({ ...r, _online: (presenceCounts[r.id] ?? 0) > 0, _memberCount: presenceCounts[r.id] ?? 0 }))
  function showAction(msg) { setActionMsg(msg); setTimeout(() => setActionMsg(''), 3000) }

  if (!sessionCode) return null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--color-cool-gray-100)' }}>
      <p style={{ fontSize: 15, color: 'var(--color-cool-gray-400)' }}>로딩 중…</p>
    </div>
  )

  if (!session) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'var(--color-cool-gray-100)', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-cool-gray-500)' }}>세션을 찾을 수 없습니다</p>
      <button onClick={() => router.replace('/')}
        style={{ padding: '10px 24px', borderRadius: 100, background: 'var(--color-purple-500)', color: 'var(--color-white)', border: '1px solid var(--color-black-overlay-10)', fontSize: 14, fontWeight: 600, cursor: 'pointer', letterSpacing: '-.3px' }}>
        홈으로
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: 'var(--color-cool-gray-100)', overflow: 'hidden' }}>
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
