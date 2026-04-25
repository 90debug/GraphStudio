'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDevice } from '../lib/DeviceContext'


function randCode() {
  return Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
}

function TextInput({ label, placeholder, value, onChange, type = 'text', maxLength, center }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-8)', width: '100%' }}>
      <label style={{
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-body-medium-17-size)',
        fontWeight: 400,
        color: 'var(--color-cool-gray-400)',
        lineHeight: 1.5,
      }}>
        {label}
      </label>
      <input
        type={type}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          height: '48px',
          padding: '0 var(--spacing-16)',
          border: `1px solid ${focused ? 'var(--color-purple-500)' : 'var(--color-cool-gray-200)'}`,
          borderRadius: '8px',
          fontFamily: 'var(--font-body)',
          fontSize: '16px',
          fontWeight: 400,
          color: 'var(--color-black)',
          outline: 'none',
          background: 'var(--color-white)',
          transition: 'border-color 0.18s',
          textAlign: center ? 'center' : 'left',
          letterSpacing: center ? '8px' : 'normal',
          textTransform: center ? 'uppercase' : 'none',
        }}
      />
    </div>
  )
}

export default function JoinPage() {
  const router = useRouter()
  const device = useDevice()
  const isMobile = device === 'mobile'
  const [mode, setMode] = useState('new')
  const [name, setName] = useState('')
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [lastGroup, setLastGroup] = useState(null)

  useEffect(() => {
    try {
      const s = localStorage.getItem('gts_last')
      if (s) setLastGroup(JSON.parse(s))
    } catch {}
  }, [])

  function save(user) {
    sessionStorage.setItem('gts_user', JSON.stringify(user))
    localStorage.setItem('gts_last', JSON.stringify({ name: user.name, groupName: user.groupName, code: user.code }))
    router.push('/activity')
  }

  const handleNew = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요')
    if (!groupName.trim()) return setError('모둠 이름을 입력해 주세요')
    save({ name: name.trim(), groupName: groupName.trim(), code: randCode(), role: 'leader' })
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요')
    if (!joinCode.trim()) return setError('참여 코드를 입력해 주세요')
    save({ name: name.trim(), groupName: joinCode.toUpperCase().trim(), code: joinCode.toUpperCase().trim(), role: 'member' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', background: 'var(--color-white)', overflow: isMobile ? 'auto' : 'hidden' }}>

      {/* ── 좌측 히어로 패널 ── */}
      {!isMobile && (
      <div style={{
        flex: '0 0 calc(70% - var(--spacing-36))',
        position: 'relative',
        overflow: 'hidden',
        background: 'var(--color-purple-400)',
        borderRadius: '30px',
        margin: 'var(--spacing-36) 0 var(--spacing-36) var(--spacing-36)',
      }}>
        {/* 배경 영상 */}
        <video
          src="/hero.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'left bottom',
            transform: 'scale(1.05)',
            transformOrigin: 'center center',
            pointerEvents: 'none',
          }}
        />

        {/* 텍스트 영역 */}
        <div style={{
          position: 'absolute',
          left: 'var(--spacing-48)',
          right: '38%',
          top: 'calc(15% - 20px)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* 부제목 */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'calc(var(--text-section-semibold-size) * 0.75)',
            fontWeight: 'var(--text-section-semibold-weight)',
            lineHeight: 1.3,
            color: 'var(--color-white)',
            letterSpacing: '-0.54px',
            marginBottom: 'var(--spacing-8)',
          }}>
            탐구 주제를 정하고<br />
            그래프로 표현해 보세요!
          </p>

          {/* 메인 타이틀 */}
          <h1 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'calc(var(--text-hero-size) * 0.75)',
            fontWeight: 'var(--text-hero-weight)',
            lineHeight: 'var(--text-hero-lh)',
            color: 'var(--color-white)',
            letterSpacing: '-0.93px',
            marginBottom: 'var(--spacing-16)',
          }}>
            여러가지 그래프
          </h1>

        </div>
      </div>
      )}

      {/* ── 우측 폼 패널 ── */}
      <div style={{
        flex: isMobile ? '1' : '0 0 30%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'flex-start',
        padding: isMobile ? '40px 24px' : '60px 20px',
        position: 'relative',
        minHeight: isMobile ? '100vh' : undefined,
      }}>
        {/* 모바일 전용: 비디오 배경 */}
        {isMobile && (
          <>
            <video
              autoPlay muted loop playsInline
              src="/main.mp4"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                zIndex: 0,
              }}
            />
            {/* 반투명 흰색 오버레이 - UI 가독성 확보 */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(255,255,255,0.82)',
              zIndex: 1,
            }}/>
          </>
        )}

        {/* 폼 컨텐츠 */}
        <div style={{
          width: '100%',
          maxWidth: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-24)',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* 탭 바 */}
          <div style={{
            display: 'flex',
            background: 'var(--color-cool-gray-100)',
            borderRadius: '8px',
            height: '48px',
            overflow: 'hidden',
          }}>
            {[
              { key: 'new',  label: '새 모둠 만들기' },
              { key: 'join', label: '코드로 참여' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setMode(key); setError('') }}
                style={{
                  flex: 1,
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: mode === key ? 600 : 400,
                  color: mode === key ? 'var(--color-white)' : 'var(--color-cool-gray-500)',
                  background: mode === key ? 'var(--color-purple-300)' : 'transparent',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.18s, color 0.18s',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 입력 폼 */}
          <form
            onSubmit={mode === 'new' ? handleNew : handleJoin}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-24)' }}
          >
            <TextInput
              label="이름"
              placeholder="예: 김민준"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
            />

            {mode === 'new' ? (
              <TextInput
                label="모둠 이름"
                placeholder="예: 2모둠"
                value={groupName}
                onChange={e => { setGroupName(e.target.value); setError('') }}
              />
            ) : (
              <TextInput
                label="참여 코드"
                placeholder="ABC123"
                value={joinCode}
                maxLength={6}
                center
                onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
              />
            )}

            {error && (
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-body-medium-17-size)',
                fontWeight: 500,
                color: 'var(--state-error)',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-16)' }}>
              {/* CTA 버튼 */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  height: '56px',
                  background: 'var(--color-purple-500)',
                  color: 'var(--color-white)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  fontWeight: 600,
                  border: '1px solid var(--color-black-overlay-10)',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  letterSpacing: '-0.4px',
                }}
              >
                {mode === 'new' ? '모둠 활동 시작하기' : '모둠 활동 참여하기'}
              </button>

              {/* 안내 텍스트 */}
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '15px',
                fontWeight: 400,
                color: 'var(--color-cool-gray-500)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}>
                {mode === 'new' ? (
                  <>모둠을 만들면 <strong style={{ fontWeight: 600, color: 'var(--color-purple-500)' }}>참여 코드</strong>가 생성돼요.</>
                ) : (
                  <>모둠장에게 받은 <strong style={{ fontWeight: 600, color: 'var(--color-purple-500)' }}>6자리 코드</strong>를 입력하세요.</>
                )}
              </p>
            </div>
          </form>
        </div>

        {/* 최근 참여 카드 */}
        {lastGroup && (
          <div style={{
            width: '100%',
            maxWidth: '320px',
            marginTop: 'auto',
            position: 'relative',
            zIndex: 2,
          }}>
            <div style={{
              background: 'var(--color-cool-gray-100)',
              borderRadius: '8px',
              padding: 'var(--spacing-16) var(--spacing-20)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-16)',
            }}>
              {/* 아바타 */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '100px',
                background: 'var(--color-purple-300)',
                border: '1px solid var(--color-cool-gray-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-body-medium-20-size)',
                fontWeight: 700,
                color: 'var(--color-white)',
                flexShrink: 0,
              }}>
                {lastGroup.name?.[0] ?? '?'}
              </div>

              {/* 이름 + 코드 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-body-medium-17-size)',
                  fontWeight: 600,
                  color: 'var(--color-black)',
                  lineHeight: 1.5,
                  letterSpacing: '-0.36px',
                }}>
                  {lastGroup.name}
                </p>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 400,
                  color: 'var(--color-cool-gray-500)',
                  lineHeight: 1.4,
                  letterSpacing: '-0.32px',
                }}>
                  {lastGroup.code}
                </p>
              </div>

              {/* 다시 참여 버튼 */}
              <button
                onClick={() => {
                  sessionStorage.setItem('gts_user', JSON.stringify({ ...lastGroup, role: 'member' }))
                  router.push('/activity')
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-6)',
                  padding: 'var(--spacing-8) var(--spacing-16)',
                  background: 'var(--color-white)',
                  border: '1px solid var(--color-purple-500)',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-body)',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--color-purple-500)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                다시 참여
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
