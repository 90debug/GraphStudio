'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

function randCode() {
  return Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')
}

export default function JoinPage() {
  const router = useRouter()
  const [mode,      setMode]      = useState('new')
  const [name,      setName]      = useState('')
  const [groupName, setGroupName] = useState('')
  const [joinCode,  setJoinCode]  = useState('')
  const [error,     setError]     = useState('')
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

  function handleNew(e) {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요')
    if (!groupName.trim()) return setError('모둠 이름을 입력해 주세요')
    save({ name: name.trim(), groupName: groupName.trim(), code: randCode(), role: 'leader' })
  }

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요')
    if (!joinCode.trim()) return setError('참여 코드를 입력해 주세요')
    const code = joinCode.toUpperCase().trim()
    save({ name: name.trim(), groupName: code, code, role: 'member' })
  }

  const C = {
    pageBg:        '#EEF2F8',
    cardBg:        '#FFFFFF',
    border:        '#E2E8F2',
    primary:       '#3B82F6',
    primaryDark:   '#2563EB',
    primaryLight:  '#EFF6FF',
    text:          '#1E293B',
    textMuted:     '#64748B',
    inputBg:       '#F8FAFC',
    inputBorder:   '#CBD5E1',
    errorText:     '#DC2626',
    errorBg:       '#FEF2F2',
    errorBorder:   '#FECACA',
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 10,
    border: `1.5px solid ${C.inputBorder}`,
    fontSize: 15,
    color: C.text,
    background: C.inputBg,
    outline: 'none',
    marginTop: 8,
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontSize: 13,
    fontWeight: 700,
    color: C.textMuted,
    display: 'block',
    letterSpacing: '0.3px',
  }

  const btnStyle = {
    width: '100%',
    padding: '15px',
    borderRadius: 12,
    background: `linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    marginTop: 4,
    cursor: 'pointer',
    letterSpacing: '-0.2px',
    transition: 'opacity .15s, transform .1s',
    boxShadow: '0 4px 12px rgba(59,130,246,.35)',
  }

  return (
    <div style={{
      width: 1024,
      height: 768,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.pageBg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ① 연한 파스텔 장식 배경 */}
      <div style={{
        position: 'absolute', top: -60, left: '35%',
        width: 340, height: 260, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(59,130,246,.09), rgba(139,92,246,.07))',
        filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -40, right: '25%',
        width: 280, height: 200, borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(16,185,129,.07), rgba(59,130,246,.07))',
        filter: 'blur(36px)', pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>

        {/* ② 헤더 – 중앙 정렬, 시각적 위계 */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{
            width: 66, height: 66, borderRadius: '50%', margin: '0 auto 14px',
            padding: 3,
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: '#fff', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28,
            }}>📝</div>
          </div>
          <div style={{
            fontSize: 28,
            fontWeight: 800,
            color: C.text,
            letterSpacing: '-0.5px',
            lineHeight: 1.2,
          }}>메모 보드</div>
          <div style={{
            fontSize: 13,
            color: C.textMuted,
            marginTop: 6,
            fontWeight: 400,
          }}>초등 수학 5단원 · 여러 가지 그래프</div>
        </div>

        {/* Quick rejoin */}
        {lastGroup && (
          <div onClick={() => {
            sessionStorage.setItem('gts_user', JSON.stringify({ ...lastGroup, role: 'member' }))
            router.push('/activity')
          }} style={{
            marginBottom: 12, padding: '12px 16px',
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            display: 'flex', alignItems: 'center',
            gap: 12, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,.06)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#10B981,#3B82F6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>🔁</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lastGroup.name} · {lastGroup.groupName}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1 }}>{lastGroup.code}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, whiteSpace: 'nowrap' }}>다시 참여 →</div>
          </div>
        )}

        {/* ① 카드 컨테이너 – 흰색, 둥근 모서리, 드롭 섀도우 */}
        <div style={{
          background: C.cardBg,
          borderRadius: 20,
          padding: '28px 28px 24px',
          boxShadow: '0 4px 24px rgba(30,41,59,.10), 0 1px 4px rgba(30,41,59,.06)',
          border: `1px solid ${C.border}`,
        }}>

          {/* ③ 탭 UI – 세그먼트 컨트롤 스타일, 포인트 컬러 Active */}
          <div style={{
            display: 'flex',
            gap: 4,
            marginBottom: 24,
            background: '#F1F5F9',
            borderRadius: 12,
            padding: 4,
          }}>
            {[['new', '새 모둠 만들기'], ['join', '코드로 참여']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  fontSize: 13,
                  fontWeight: mode === m ? 700 : 500,
                  color: mode === m ? C.primary : C.textMuted,
                  background: mode === m ? C.cardBg : 'transparent',
                  border: 'none',
                  borderRadius: 9,
                  cursor: 'pointer',
                  transition: 'all .18s ease',
                  boxShadow: mode === m ? '0 1px 4px rgba(30,41,59,.10)' : 'none',
                }}
              >{label}</button>
            ))}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div style={{
              fontSize: 12,
              color: C.errorText,
              padding: '10px 14px',
              background: C.errorBg,
              borderRadius: 10,
              marginBottom: 18,
              border: `1px solid ${C.errorBorder}`,
            }}>
              {error}
            </div>
          )}

          {mode === 'new' ? (
            <form onSubmit={handleNew}>

              {/* ④ 이름 입력 그룹 – 라벨 위, 입력창 아래, 여유 간격 */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>이름</label>
                <input
                  style={inputStyle}
                  placeholder="예: 김민준"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primaryLight}` }}
                  onBlur={e =>  { e.target.style.borderColor = C.inputBorder; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* ④ 모둠 이름 입력 그룹 */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>모둠 이름</label>
                <input
                  style={inputStyle}
                  placeholder="예: 2모둠"
                  value={groupName}
                  onChange={e => { setGroupName(e.target.value); setError('') }}
                  onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primaryLight}` }}
                  onBlur={e =>  { e.target.style.borderColor = C.inputBorder; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* ⑤ CTA 버튼 – Full-width, 포인트 컬러 */}
              <button
                type="submit"
                style={btnStyle}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.91'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'none' }}
              >시작하기</button>

              {/* ⑥ 도움말 텍스트 – 버튼 바로 아래, 작고 옅게, 중앙 정렬 */}
              <div style={{
                marginTop: 12,
                textAlign: 'center',
                fontSize: 12,
                color: C.textMuted,
                lineHeight: 1.6,
              }}>
                💡 모둠을 만들면 <span style={{ fontWeight: 700, color: C.primary }}>참여 코드</span>가 생성돼요
              </div>

            </form>
          ) : (
            <form onSubmit={handleJoin}>

              {/* ④ 이름 입력 그룹 */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>이름</label>
                <input
                  style={inputStyle}
                  placeholder="예: 이서연"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }}
                  onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primaryLight}` }}
                  onBlur={e =>  { e.target.style.borderColor = C.inputBorder; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* ④ 참여 코드 입력 그룹 */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>참여 코드 (6자리)</label>
                <input
                  style={{
                    ...inputStyle,
                    textTransform: 'uppercase',
                    letterSpacing: 10,
                    fontWeight: 800,
                    fontSize: 22,
                    textAlign: 'center',
                    padding: '14px 16px',
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }}
                  onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `0 0 0 3px ${C.primaryLight}` }}
                  onBlur={e =>  { e.target.style.borderColor = C.inputBorder; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* ⑤ CTA 버튼 */}
              <button
                type="submit"
                style={btnStyle}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.91'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'none' }}
              >참여하기</button>

              {/* ⑥ 도움말 텍스트 */}
              <div style={{
                marginTop: 12,
                textAlign: 'center',
                fontSize: 12,
                color: C.textMuted,
                lineHeight: 1.6,
              }}>
                💡 모둠장에게 받은 <span style={{ fontWeight: 700, color: C.primary }}>6자리 코드</span>를 입력하세요
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  )
}
