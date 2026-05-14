'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDevice } from '../lib/DeviceContext'
import { createSession, createRoomInSession } from '../lib/firestore'

// ▼ 시연 당일 실제 모둠 코드로 교체 (빈 문자열이면 버튼 자동 숨김)
const DEMO_ROOM_CODE = "JPZXP6"

// ── 탭 버튼 공용 스타일 (교사/학생 동일) ──────────────────────────────────────
const TAB_WRAP = { display: 'flex', background: 'var(--color-cool-gray-100)', borderRadius: '8px', height: '48px', overflow: 'hidden' }
function tabBtn(active) {
  return {
    flex: 1, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: active ? 600 : 400,
    color: active ? 'var(--color-white)' : 'var(--color-cool-gray-500)',
    background: active ? 'var(--color-purple-300)' : 'transparent',
    borderRadius: '8px', border: 'none', cursor: 'pointer',
    transition: 'background 0.18s, color 0.18s',
  }
}

// ── TextInput ──────────────────────────────────────────────────────────────────
function TextInput({ label, placeholder, value, onChange, maxLength }) {
  const [focused, setFocused] = useState(false)
  const isMobile = useDevice() === 'mobile'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', width: '100%' }}>
      {label && (
        <label style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-17-size)', fontWeight: 400, color: isMobile ? '#1E293B' : 'var(--color-cool-gray-400)', lineHeight: 1.5 }}>
          {label}
        </label>
      )}
      <input
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ width: '100%', height: '48px', padding: '0 var(--spacing-16)', border: `1px solid ${focused ? 'var(--color-purple-500)' : 'var(--color-cool-gray-200)'}`, borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 400, color: 'var(--color-black)', outline: 'none', background: 'var(--color-white)', transition: 'border-color 0.18s', letterSpacing: 'normal' }}
      />
    </div>
  )
}

// ── 역할 선택 카드 ────────────────────────────────────────────────────────────
function RoleCard({ onSelect }) {
  return (
    <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20)' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, color: 'var(--color-black)', letterSpacing: '-0.4px' }}>어떤 역할로 접속할까요?</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-cool-gray-400)', marginTop: '6px' }}>선택한 역할에 맞는 화면이 표시됩니다</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-10)' }}>
        {[
          { role: 'teacher', label: '선생님이에요.', desc: '수업 세션을 만들고 관리해요.' },
          { role: 'student', label: '학생이에요.', desc: '모둠을 만들거나 참여해요.' },
        ].map(({ role, label, desc }) => (
          <button key={role} onClick={() => onSelect(role)}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-16)', padding: 'var(--spacing-16) var(--spacing-20)', border: '2px solid var(--color-cool-gray-200)', borderRadius: '14px', background: 'var(--color-white)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-purple-300)'; e.currentTarget.style.background = 'var(--color-cool-gray-100)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-cool-gray-200)'; e.currentTarget.style.background = 'var(--color-white)' }}
          >
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--color-black)' }}>{label}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-cool-gray-400)', marginTop: '2px' }}>{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
function RoleModal({ onSelect }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-24)' }}>
      <div style={{ background: 'var(--color-white)', borderRadius: '20px', padding: 'var(--spacing-32) var(--spacing-24)', width: '100%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <RoleCard onSelect={onSelect} />
      </div>
    </div>
  )
}
function ChangeRoleBtn({ onClick }) {
  const isMobile = useDevice() === 'mobile'
  return (
    <button onClick={onClick} style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: isMobile ? 'var(--color-purple-500)' : 'var(--color-cool-gray-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', padding: 0 }}>
      역할 바꾸기
    </button>
  )
}

// ── 제출 버튼 공용 ─────────────────────────────────────────────────────────────
function SubmitBtn({ loading, label, loadingLabel }) {
  return (
    <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', background: loading ? 'var(--color-cool-gray-200)' : 'var(--color-purple-500)', color: 'var(--color-white)', fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, border: '1px solid var(--color-black-overlay-10)', borderRadius: '100px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.4px' }}>
      {loading ? (loadingLabel || '처리 중…') : label}
    </button>
  )
}

// ── 교사 폼 ────────────────────────────────────────────────────────────────────
function TeacherForm({ onChangeRole }) {
  const router = useRouter()
  const [tab, setTab] = useState('new')  // 'new' | 'code'

  // 수업 만들기
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 코드로 접속
  const [existingCode, setExistingCode] = useState('')
  const [existingError, setExistingError] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!school.trim()) return setError('학교명을 입력해 주세요')
    if (!grade.trim()) return setError('학년을 입력해 주세요')
    if (!classNum.trim()) return setError('반을 입력해 주세요')
    setLoading(true); setError('')
    try {
      const sessionCode = await createSession({ school: school.trim(), grade: grade.trim(), classNum: classNum.trim() })
      localStorage.setItem('gts_teacher_last', JSON.stringify({ sessionCode, school: school.trim(), grade: grade.trim(), classNum: classNum.trim() }))
      router.push(`/teacher?session=${sessionCode}`)
    } catch {
      setError('세션 생성에 실패했습니다. 네트워크를 확인해 주세요.')
    } finally { setLoading(false) }
  }

  function handleGoExisting(e) {
    e.preventDefault()
    const code = existingCode.trim().toUpperCase()
    if (!code) return setExistingError('세션 코드를 입력해 주세요.')
    if (code.length !== 6) return setExistingError('6자리 코드를 입력해 주세요.')
    // 코드로 접속 시에도 이전 세션 이력 저장 (기기 변경 지원)
    try {
      const prev = JSON.parse(localStorage.getItem('gts_teacher_last') || '{}')
      if (prev.sessionCode !== code) {
        localStorage.setItem('gts_teacher_last', JSON.stringify({ sessionCode: code, school: '', grade: '', classNum: '' }))
      }
    } catch {}
    router.push(`/teacher?session=${code}`)
  }

  return (
    <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)', position: 'relative', zIndex: 2 }}>
      {/* 탭 바 — 학생용과 동일 스타일 */}
      <div style={TAB_WRAP}>
        <button style={tabBtn(tab === 'new')} onClick={() => { setTab('new'); setError(''); setExistingError('') }}>수업 만들기</button>
        <button style={tabBtn(tab === 'code')} onClick={() => { setTab('code'); setError(''); setExistingError('') }}>코드로 접속</button>
      </div>

      {/* 수업 만들기 탭 */}
      {tab === 'new' && (
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
          <TextInput label="학교명" placeholder="예: 한울초등학교" value={school} onChange={e => { setSchool(e.target.value); setError('') }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-10)' }}>
            <TextInput label="학년" placeholder="예: 5" value={grade} onChange={e => { setGrade(e.target.value); setError('') }} maxLength={2} />
            <TextInput label="반" placeholder="예: 3" value={classNum} onChange={e => { setClassNum(e.target.value); setError('') }} maxLength={3} />
          </div>
          {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--state-error)', textAlign: 'center' }}>{error}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)', marginTop: 'var(--spacing-8)' }}>
            <SubmitBtn loading={loading} label="수업 만들기" loadingLabel="세션 생성 중…" />
            <div style={{ textAlign: 'center' }}>
              <ChangeRoleBtn onClick={onChangeRole} />
            </div>
          </div>
        </form>
      )}

      {/* 코드로 접속 탭 */}
      {tab === 'code' && (
        <form onSubmit={handleGoExisting} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
          <TextInput
            label="세션 코드"
            placeholder="예: 4K9M2X"
            value={existingCode}
            maxLength={6}
            onChange={e => { setExistingCode(e.target.value.toUpperCase()); setExistingError('') }}
          />
          {existingError && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--state-error)', textAlign: 'center' }}>{existingError}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)', marginTop: 'var(--spacing-8)' }}>
            <SubmitBtn loading={false} label="접속하기" />
            <div style={{ textAlign: 'center' }}>
              <ChangeRoleBtn onClick={onChangeRole} />
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

// ── 학생 폼 ────────────────────────────────────────────────────────────────────
function StudentForm({ onChangeRole }) {
  const router = useRouter()
  const [mode, setMode] = useState('new')
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  // 시연용 자동 입력 state
  const [animating, setAnimating] = useState(false)
  const [autofillDone, setAutofillDone] = useState(false)
  const joinInputRef = useRef(null)

  function handleAutoFill() {
    if (animating || !DEMO_ROOM_CODE) return
    setAnimating(true)
    setAutofillDone(false)
    setJoinCode('')
    setError('')
    let i = 0
    const interval = setInterval(function() {
      i++
      setJoinCode(DEMO_ROOM_CODE.slice(0, i))
      if (i >= DEMO_ROOM_CODE.length) {
        clearInterval(interval)
        setAnimating(false)
        setAutofillDone(true)
        if (joinInputRef.current) joinInputRef.current.focus()
      }
    }, 90)
  }

  function save(user) {
    sessionStorage.setItem('gts_user', JSON.stringify(user))
    localStorage.setItem('gts_last', JSON.stringify({ name: user.name, groupName: user.groupName, code: user.code, sessionCode: user.sessionCode }))
    router.push('/activity')
  }

  const handleNew = async (e) => {
    e.preventDefault()
    if (!sessionCode.trim()) return setError('세션 코드를 입력해 주세요.')
    if (!name.trim()) return setError('이름을 입력해 주세요.')
    if (!groupName.trim()) return setError('모둠 이름을 입력해 주세요.')
    setLoading(true); setError('')
    try {
      const code = await createRoomInSession(sessionCode.toUpperCase().trim(), groupName.trim(), name.trim())
      save({ name: name.trim(), groupName: groupName.trim(), code, role: 'leader', sessionCode: sessionCode.toUpperCase().trim() })
    } catch (err) {
      setError(err.message || '모둠 생성에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요.')
    if (!joinCode.trim()) return setError('참여 코드를 입력해 주세요.')
    save({ name: name.trim(), groupName: joinCode.toUpperCase().trim(), code: joinCode.toUpperCase().trim(), role: 'member' })
  }

  return (
    <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)', position: 'relative', zIndex: 2 }}>
      <div style={TAB_WRAP}>
        {[{ key: 'new', label: '새 모둠 만들기' }, { key: 'join', label: '코드로 참여' }].map(({ key, label }) => (
          <button key={key} onClick={() => { setMode(key); setError('') }} style={tabBtn(mode === key)}>{label}</button>
        ))}
      </div>

      <form onSubmit={mode === 'new' ? handleNew : handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
        {mode === 'new' && (
          <TextInput label="세션 코드" placeholder="예: 4K9M2X" value={sessionCode} maxLength={6} onChange={e => { setSessionCode(e.target.value.toUpperCase()); setError('') }} />
        )}
        <TextInput label="이름" placeholder="예: 김민준" value={name} onChange={e => { setName(e.target.value); setError('') }} />
        {mode === 'new'
          ? <TextInput label="모둠 이름" placeholder="예: 2모둠" value={groupName} onChange={e => { setGroupName(e.target.value); setError('') }} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-17-size)', fontWeight: 400, color: 'var(--color-cool-gray-400)', lineHeight: 1.5 }}>
                  참여 코드
                </label>
                {DEMO_ROOM_CODE && (
                  <button
                    onClick={handleAutoFill}
                    disabled={animating || autofillDone}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 20,
                      background: autofillDone ? '#EDE9FE' : '#F5F3FF',
                      border: `1.5px solid ${autofillDone ? '#C4B8F8' : '#DDD6FE'}`,
                      cursor: (animating || autofillDone) ? 'default' : 'pointer',
                      fontSize: 11, fontWeight: 700,
                      color: autofillDone ? '#5B41EB' : '#7C6FCD',
                      fontFamily: 'inherit',
                      opacity: autofillDone ? 0.75 : 1,
                    }}
                  >
                    {animating ? '입력 중…' : autofillDone ? '완료' : '시연용'}
                  </button>
                )}
              </div>
              <input
                ref={joinInputRef}
                maxLength={6}
                placeholder="예: ABC123"
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError(''); setAutofillDone(false) }}
                style={{
                  width: '100%', height: '48px', padding: '0 var(--spacing-16)',
                  border: `1px solid ${autofillDone ? '#C4B8F8' : 'var(--color-cool-gray-200)'}`,
                  borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '16px',
                  fontWeight: 400,
                  color: autofillDone ? '#5B41EB' : 'var(--color-black)',
                  background: autofillDone ? '#F5F3FF' : 'var(--color-white)',
                  outline: 'none', letterSpacing: 'normal',
                  transition: 'border-color 0.18s, background 0.18s, color 0.18s',
                }}
              />
            </div>
          )
        }
        {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-17-size)', fontWeight: 500, color: 'var(--state-error)', textAlign: 'center' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)', marginTop: 'var(--spacing-8)' }}>
          <SubmitBtn loading={loading} label={mode === 'new' ? '모둠 활동 시작하기' : '모둠 활동 참여하기'} />
          {/* 안내 문구 삭제됨 */}
          <div style={{ textAlign: 'center' }}>
            <ChangeRoleBtn onClick={onChangeRole} />
          </div>
        </div>
      </form>
    </div>
  )
}

// ── 공통 하단 카드 ─────────────────────────────────────────────────────────────
function BottomCard({ label, line1, line2, btnLabel, onBtn, isMobile }) {
  return (
    <div style={{ background: 'var(--color-purple-400)', borderRadius: '12px', padding: isMobile ? '10px var(--spacing-20)' : 'var(--spacing-16) var(--spacing-20)', display: 'flex', flexDirection: 'column', gap: isMobile ? 'var(--spacing-8)' : 'var(--spacing-10)', boxShadow: '0 4px 16px rgba(91,65,235,0.25)' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--color-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.3px' }}>{line1}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 800, color: 'var(--color-white)', letterSpacing: '4px', marginTop: '2px' }}>{line2}</p>
        </div>
        <button onClick={onBtn} style={{ padding: '10px 18px', background: 'var(--color-purple-500)', border: 'none', borderRadius: '999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--color-white)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(72,51,201,0.4)' }}>
          {btnLabel}
        </button>
      </div>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
export default function JoinPage() {
  const device = useDevice()
  const isMobile = device === 'mobile'
  const router = useRouter()
  const [role, setRole] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [lastGroup, setLastGroup] = useState(null)
  const [lastSession, setLastSession] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gts_role')
      if (saved === 'teacher' || saved === 'student') setRole(saved)
      else setShowRoleModal(true)
    } catch { setShowRoleModal(true) }
    try { const s = localStorage.getItem('gts_last'); if (s) setLastGroup(JSON.parse(s)) } catch {}
    try { const s = localStorage.getItem('gts_teacher_last'); if (s) setLastSession(JSON.parse(s)) } catch {}
  }, [])

  function handleSelectRole(r) { localStorage.setItem('gts_role', r); setRole(r); setShowRoleModal(false) }
  function handleChangeRole() { localStorage.removeItem('gts_role'); setRole(null); setShowRoleModal(true) }

  const showInlineRoleSelect = !role && !isMobile
  const showTeacherCard = role === 'teacher' && !!lastSession
  const showStudentCard = role === 'student' && !!lastGroup

  const teacherLine1 = lastSession
    ? [lastSession.school, lastSession.grade && `${lastSession.grade}학년`, lastSession.classNum && `${lastSession.classNum}반`].filter(Boolean).join(' ')
    : ''

  // PC 하단 카드: maxWidth=320px, 좌우 패딩 내부 센터
  const pcCardStyle = {
    position: 'absolute',
    bottom: 'var(--spacing-24)',
    left: 0, right: 0,
    padding: '0 var(--spacing-20)',
    zIndex: 10,
    display: 'flex',
    justifyContent: 'center',
  }
  const pcCardInner = { width: '100%', maxWidth: '320px' }

  return (
    <>
      {isMobile && showRoleModal && <RoleModal onSelect={handleSelectRole} />}

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: isMobile ? '#F5F3FF' : 'var(--color-white)', overflow: isMobile ? 'auto' : 'hidden' }}>

        {/* 좌측 히어로 (PC 전용) */}
        {!isMobile && (
          <div style={{ flex: '0 0 calc(70% - var(--spacing-36))', position: 'relative', overflow: 'hidden', background: 'var(--color-purple-400)', borderRadius: '30px', margin: 'var(--spacing-36) 0 var(--spacing-36) var(--spacing-36)' }}>
            <video src="/hero.mp4" autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left bottom', transform: 'scale(1.05)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 'var(--spacing-48)', right: '38%', top: 'calc(15% - 20px)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'calc(var(--text-section-semibold-size) * 0.75)', fontWeight: 'var(--text-section-semibold-weight)', lineHeight: 1.3, color: 'var(--color-white)', letterSpacing: '-0.54px', marginBottom: 'var(--spacing-8)' }}>
                탐구 주제를 정하고<br />그래프로 표현해 보세요!
              </p>
              <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'calc(var(--text-hero-size) * 0.75)', fontWeight: 'var(--text-hero-weight)', lineHeight: 'var(--text-hero-lh)', color: 'var(--color-white)', letterSpacing: '-0.93px' }}>
                여러 가지 그래프
              </h1>
            </div>
          </div>
        )}

        {/* 우측 폼 패널
            모바일: 배경색을 var(--color-purple-50) 으로 지정하여
            동영상이 짧을 때 생기는 흰 여백 방지 */}
        <div style={{
          flex: isMobile ? '1' : '0 0 30%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: isMobile ? '40px 24px 40px' : '60px 20px 24px',
          position: 'relative',
          minHeight: isMobile ? '100vh' : undefined,
          // 모바일: 동영상 뷰어 짧을 때 흰 여백 방지 — 영상 주조색과 유사
          background: isMobile ? 'var(--color-purple-50, #F5F3FF)' : undefined,
        }}>
          {isMobile && (
            <>
              <video autoPlay muted loop playsInline src="/main.mp4"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
              />
              {/* 동영상 위 반투명 오버레이 — 짧아도 흰 여백 없이 보라 계열 */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(245,243,255,0.50)', zIndex: 1 }} />
            </>
          )}

          {showInlineRoleSelect && <RoleCard onSelect={handleSelectRole} />}
          {role === 'teacher' && <TeacherForm onChangeRole={handleChangeRole} />}
          {role === 'student' && <StudentForm onChangeRole={handleChangeRole} />}

          {/* PC 하단 카드: 항상 maxWidth:320px 이내 */}
          {showTeacherCard && !isMobile && (
            <div style={pcCardStyle}>
              <div style={pcCardInner}>
                <BottomCard label="이전 세션" line1={teacherLine1} line2={lastSession.sessionCode} btnLabel="대시보드 열기" onBtn={() => router.push(`/teacher?session=${lastSession.sessionCode}`)} />
              </div>
            </div>
          )}
          {showStudentCard && !isMobile && (
            <div style={pcCardStyle}>
              <div style={pcCardInner}>
                <BottomCard label="이전 모둠" line1={lastGroup.name} line2={lastGroup.code} btnLabel="이어서 활동하기" onBtn={() => { sessionStorage.setItem('gts_user', JSON.stringify({ ...lastGroup, role: 'member' })); router.push('/activity') }} />
              </div>
            </div>
          )}

          {/* 모바일 하단 카드: 일반 흐름 */}
          {showTeacherCard && isMobile && (
            <div style={{ width: '100%', maxWidth: '320px', marginTop: 'var(--spacing-32)', position: 'relative', zIndex: 2 }}>
              <BottomCard isMobile label="이전 세션" line1={teacherLine1} line2={lastSession.sessionCode} btnLabel="대시보드 열기" onBtn={() => router.push(`/teacher?session=${lastSession.sessionCode}`)} />
            </div>
          )}
          {showStudentCard && isMobile && (
            <div style={{ width: '100%', maxWidth: '320px', marginTop: 'var(--spacing-32)', position: 'relative', zIndex: 2 }}>
              <BottomCard isMobile label="이전 모둠" line1={lastGroup.name} line2={lastGroup.code} btnLabel="이어서 활동하기" onBtn={() => { sessionStorage.setItem('gts_user', JSON.stringify({ ...lastGroup, role: 'member' })); router.push('/activity') }} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
