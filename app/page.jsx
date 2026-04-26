'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDevice } from '../lib/DeviceContext'
import { createSession, createRoomInSession } from '../lib/firestore'

function randCode() {
  return Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
}

function TextInput({ label, placeholder, value, onChange, type = 'text', maxLength, center, helper }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', width: '100%' }}>
      {label && (
        <label style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-17-size)', fontWeight: 400, color: 'var(--color-cool-gray-400)', lineHeight: 1.5 }}>
          {label}
        </label>
      )}
      <input
        type={type}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', height: '48px', padding: '0 var(--spacing-16)',
          border: `1px solid ${focused ? 'var(--color-purple-500)' : 'var(--color-cool-gray-200)'}`,
          borderRadius: '8px', fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 400,
          color: 'var(--color-black)', outline: 'none', background: 'var(--color-white)',
          transition: 'border-color 0.18s',
          textAlign: center ? 'center' : 'left',
          letterSpacing: center ? '8px' : 'normal',
          textTransform: center ? 'uppercase' : 'none',
        }}
      />
      {helper && <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-cool-gray-400)', marginTop: '-4px' }}>{helper}</p>}
    </div>
  )
}

function RoleModal({ onSelect }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-24)' }}>
      <div style={{ background: 'var(--color-white)', borderRadius: '20px', padding: 'var(--spacing-32) var(--spacing-24)', width: '100%', maxWidth: '340px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-20)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, color: 'var(--color-black)', letterSpacing: '-0.4px' }}>어떤 역할로 접속할까요?</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-cool-gray-400)', marginTop: '6px' }}>선택한 역할에 맞는 화면이 표시됩니다</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-10)' }}>
          {[
            { role: 'teacher', emoji: '👩‍🏫', label: '선생님이에요', desc: '수업 세션을 만들고 모둠을 관리해요' },
            { role: 'student', emoji: '🧑‍🎒', label: '학생이에요', desc: '모둠을 만들거나 참여해요' },
          ].map(({ role, emoji, label, desc }) => (
            <button key={role} onClick={() => onSelect(role)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-16)', padding: 'var(--spacing-16) var(--spacing-20)', border: '2px solid var(--color-cool-gray-200)', borderRadius: '14px', background: 'var(--color-white)', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-purple-300)'; e.currentTarget.style.background = 'var(--color-cool-gray-100)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-cool-gray-200)'; e.currentTarget.style.background = 'var(--color-white)' }}
            >
              <span style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 700, color: 'var(--color-black)' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--color-cool-gray-400)', marginTop: '2px' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function TeacherForm({ isMobile }) {
  const router = useRouter()
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('')
  const [classNum, setClassNum] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastSession, setLastSession] = useState(null)

  useEffect(() => {
    try { const s = localStorage.getItem('gts_teacher_last'); if (s) setLastSession(JSON.parse(s)) } catch {}
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!grade.trim()) return setError('학년을 입력해 주세요')
    if (!classNum.trim()) return setError('반을 입력해 주세요')
    setLoading(true); setError('')
    try {
      const sessionCode = await createSession({ school: school.trim(), grade: grade.trim(), classNum: classNum.trim() })
      const info = { sessionCode, school: school.trim(), grade: grade.trim(), classNum: classNum.trim() }
      localStorage.setItem('gts_teacher_last', JSON.stringify(info))
      router.push(`/teacher?session=${sessionCode}`)
    } catch {
      setError('세션 생성에 실패했습니다. 다시 시도해 주세요.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)', position: 'relative', zIndex: 2 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '22px', fontWeight: 700, color: 'var(--color-black)', letterSpacing: '-0.4px' }}>수업 만들기</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--color-cool-gray-400)', marginTop: '4px' }}>세션 코드가 발급되면 학생에게 공유하세요</p>
      </div>
      <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
        <TextInput label="학교명 (선택)" placeholder="예: 한울초등학교" value={school} onChange={e => { setSchool(e.target.value); setError('') }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-10)' }}>
          <TextInput label="학년" placeholder="예: 5" value={grade} onChange={e => { setGrade(e.target.value); setError('') }} maxLength={2} />
          <TextInput label="반" placeholder="예: 3" value={classNum} onChange={e => { setClassNum(e.target.value); setError('') }} maxLength={3} />
        </div>
        {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--state-error)', textAlign: 'center' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', background: loading ? 'var(--color-cool-gray-200)' : 'var(--color-purple-500)', color: 'var(--color-white)', fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, border: '1px solid var(--color-black-overlay-10)', borderRadius: '100px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.4px', marginTop: 'var(--spacing-8)' }}>
          {loading ? '세션 생성 중…' : '수업 만들기'}
        </button>
      </form>
      {lastSession && (
        <div style={{ marginTop: 'var(--spacing-8)', background: 'var(--color-purple-400)', borderRadius: '12px', padding: 'var(--spacing-16) var(--spacing-20)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-10)', boxShadow: '0 4px 16px rgba(91,65,235,0.25)' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>이전 세션</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-10)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 700, color: 'var(--color-white)', letterSpacing: '-0.3px' }}>
                {[lastSession.school, lastSession.grade && `${lastSession.grade}학년`, lastSession.classNum && `${lastSession.classNum}반`].filter(Boolean).join(' ')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', fontWeight: 800, color: 'var(--color-white)', letterSpacing: '4px', marginTop: '2px' }}>{lastSession.sessionCode}</p>
            </div>
            <button onClick={() => router.push(`/teacher?session=${lastSession.sessionCode}`)} style={{ padding: '10px 18px', background: 'var(--color-purple-500)', border: 'none', borderRadius: '999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--color-white)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(72,51,201,0.4)' }}>
              대시보드 열기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentForm({ isMobile }) {
  const router = useRouter()
  const [mode, setMode] = useState('new')
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [sessionCode, setSessionCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastGroup, setLastGroup] = useState(null)

  useEffect(() => {
    try { const s = localStorage.getItem('gts_last'); if (s) setLastGroup(JSON.parse(s)) } catch {}
  }, [])

  function save(user) {
    sessionStorage.setItem('gts_user', JSON.stringify(user))
    localStorage.setItem('gts_last', JSON.stringify({ name: user.name, groupName: user.groupName, code: user.code }))
    router.push('/activity')
  }

  const handleNew = async (e) => {
    e.preventDefault()
    if (!sessionCode.trim()) return setError('세션 코드를 입력해 주세요')
    if (!name.trim()) return setError('이름을 입력해 주세요')
    if (!groupName.trim()) return setError('모둠 이름을 입력해 주세요')
    setLoading(true); setError('')
    try {
      const code = await createRoomInSession(sessionCode.toUpperCase().trim(), groupName.trim(), name.trim())
      save({ name: name.trim(), groupName: groupName.trim(), code, role: 'leader' })
    } catch (err) {
      setError(err.message || '모둠 생성에 실패했습니다.')
    } finally { setLoading(false) }
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요')
    if (!joinCode.trim()) return setError('참여 코드를 입력해 주세요')
    save({ name: name.trim(), groupName: joinCode.toUpperCase().trim(), code: joinCode.toUpperCase().trim(), role: 'member' })
  }

  return (
    <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', background: 'var(--color-cool-gray-100)', borderRadius: '8px', height: '48px', overflow: 'hidden' }}>
        {[{ key: 'new', label: '새 모둠 만들기' }, { key: 'join', label: '코드로 참여' }].map(({ key, label }) => (
          <button key={key} onClick={() => { setMode(key); setError('') }} style={{ flex: 1, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: mode === key ? 600 : 400, color: mode === key ? 'var(--color-white)' : 'var(--color-cool-gray-500)', background: mode === key ? 'var(--color-purple-300)' : 'transparent', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background 0.18s, color 0.18s' }}>{label}</button>
        ))}
      </div>

      <form onSubmit={mode === 'new' ? handleNew : handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
        {mode === 'new' && (
          <TextInput label="세션 코드" placeholder="선생님께 받은 세션 코드" value={sessionCode} maxLength={6} center onChange={e => { setSessionCode(e.target.value.toUpperCase()); setError('') }} />
        )}
        <TextInput label="이름" placeholder="예: 김민준" value={name} onChange={e => { setName(e.target.value); setError('') }} />
        {mode === 'new' ? (
          <TextInput label="모둠 이름" placeholder="예: 2모둠" value={groupName} onChange={e => { setGroupName(e.target.value); setError('') }} />
        ) : (
          <TextInput label="참여 코드" placeholder="ABC123" value={joinCode} maxLength={6} center onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }} />
        )}
        {error && <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-17-size)', fontWeight: 500, color: 'var(--state-error)', textAlign: 'center' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
          <button type="submit" disabled={loading} style={{ width: '100%', height: '56px', background: loading ? 'var(--color-cool-gray-200)' : 'var(--color-purple-500)', color: 'var(--color-white)', fontFamily: 'var(--font-body)', fontSize: '16px', fontWeight: 600, border: '1px solid var(--color-black-overlay-10)', borderRadius: '100px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.4px' }}>
            {loading ? '처리 중…' : mode === 'new' ? '모둠 활동 시작하기' : '모둠 활동 참여하기'}
          </button>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 400, color: 'var(--color-cool-gray-500)', textAlign: 'center', lineHeight: 1.5 }}>
            {mode === 'new' ? (<>모둠을 만들면 <strong style={{ fontWeight: 600, color: 'var(--color-purple-500)' }}>참여 코드</strong>가 생성돼요.</>) : (<>모둠장에게 받은 <strong style={{ fontWeight: 600, color: 'var(--color-purple-500)' }}>6자리 코드</strong>를 입력하세요.</>)}
          </p>
        </div>
      </form>

      {lastGroup && (
        <div style={{ width: '100%', position: 'relative', zIndex: 2 }}>
          <div style={{ background: 'var(--color-purple-400)', borderRadius: '12px', padding: 'var(--spacing-16) var(--spacing-20)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-16)', boxShadow: '0 4px 16px rgba(91,65,235,0.25)' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '100px', background: 'rgba(255,255,255,0.25)', border: '1.5px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-20-size)', fontWeight: 700, color: 'var(--color-white)', flexShrink: 0 }}>
              {lastGroup.name?.[0] ?? '?'}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-medium-17-size)', fontWeight: 700, color: 'var(--color-white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lastGroup.name}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{lastGroup.code}</p>
            </div>
            <button onClick={() => { sessionStorage.setItem('gts_user', JSON.stringify({ ...lastGroup, role: 'member' })); router.push('/activity') }} style={{ padding: '10px 18px', background: 'var(--color-purple-500)', border: 'none', borderRadius: '999px', fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 700, color: 'var(--color-white)', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(72,51,201,0.4)' }}>
              이어서 활동하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function JoinPage() {
  const device = useDevice()
  const isMobile = device === 'mobile'
  const [role, setRole] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gts_role')
      if (saved === 'teacher' || saved === 'student') { setRole(saved) }
      else { setShowRoleModal(true) }
    } catch { setShowRoleModal(true) }
  }, [])

  function handleSelectRole(r) {
    localStorage.setItem('gts_role', r)
    setRole(r)
    setShowRoleModal(false)
  }

  function handleChangeRole() {
    localStorage.removeItem('gts_role')
    setRole(null)
    setShowRoleModal(true)
  }

  return (
    <>
      {showRoleModal && <RoleModal onSelect={handleSelectRole} />}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: 'var(--color-white)', overflow: isMobile ? 'auto' : 'hidden' }}>
        {!isMobile && (
          <div style={{ flex: '0 0 calc(70% - var(--spacing-36))', position: 'relative', overflow: 'hidden', background: 'var(--color-purple-400)', borderRadius: '30px', margin: 'var(--spacing-36) 0 var(--spacing-36) var(--spacing-36)' }}>
            <video src="/hero.mp4" autoPlay loop muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left bottom', transform: 'scale(1.05)', transformOrigin: 'center center', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', left: 'var(--spacing-48)', right: '38%', top: 'calc(15% - 20px)', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 'calc(var(--text-section-semibold-size) * 0.75)', fontWeight: 'var(--text-section-semibold-weight)', lineHeight: 1.3, color: 'var(--color-white)', letterSpacing: '-0.54px', marginBottom: 'var(--spacing-8)' }}>
                탐구 주제를 정하고<br />그래프로 표현해 보세요!
              </p>
              <h1 style={{ fontFamily: 'var(--font-body)', fontSize: 'calc(var(--text-hero-size) * 0.75)', fontWeight: 'var(--text-hero-weight)', lineHeight: 'var(--text-hero-lh)', color: 'var(--color-white)', letterSpacing: '-0.93px', marginBottom: 'var(--spacing-16)' }}>
                여러가지 그래프
              </h1>
            </div>
          </div>
        )}

        <div style={{ flex: isMobile ? '1' : '0 0 30%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: isMobile ? '40px 24px' : '60px 20px', position: 'relative', minHeight: isMobile ? '100vh' : undefined }}>
          {isMobile && (
            <>
              <video autoPlay muted loop playsInline src="/main.mp4" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.82)', zIndex: 1 }} />
            </>
          )}

          {role === 'teacher' && <TeacherForm isMobile={isMobile} />}
          {role === 'student' && <StudentForm isMobile={isMobile} />}

          {role && (
            <div style={{ width: '100%', maxWidth: '320px', marginTop: 'var(--spacing-24)', textAlign: 'center', position: 'relative', zIndex: 2 }}>
              <button onClick={handleChangeRole} style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 500, color: 'var(--color-cool-gray-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                역할 바꾸기
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
