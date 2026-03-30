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
    if (!name.trim()) return setError('이름을 입력해 주세요 😊')
    if (!groupName.trim()) return setError('모둠 이름을 입력해 주세요 😊')
    save({ name: name.trim(), groupName: groupName.trim(), code: randCode(), role: 'leader' })
  }

  function handleJoin(e) {
    e.preventDefault()
    if (!name.trim()) return setError('이름을 입력해 주세요 😊')
    if (!joinCode.trim()) return setError('참여 코드를 입력해 주세요 😊')
    const code = joinCode.toUpperCase().trim()
    save({ name: name.trim(), groupName: code, code, role: 'member' })
  }

  const inputBase = {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 14,
    border: '2.5px solid #E8DFD4',
    fontSize: 15,
    color: '#3D2B1F',
    background: '#FFFCF8',
    outline: 'none',
    marginTop: 8,
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    fontWeight: 600,
  }

  const labelBase = {
    fontSize: 13,
    fontWeight: 800,
    color: '#8C7B6E',
    display: 'block',
    letterSpacing: '0.3px',
  }

  return (
    <div style={{
      width: 1024, height: 768,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backgroundImage: "url('/bg-main.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* ── Spurout 캐릭터: 로그인창 좌측 상단 ── */}
      <img
        src="/char-spurout.png"
        alt=""
        style={{
          position: 'absolute',
          left: 400, top: 130,
          width: 168,
          zIndex: 6,
          pointerEvents: 'none',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,.15))',
        }}
      />

      {/* ── 왼쪽: 타이틀 영역 ── */}
      <div style={{ width: 420, padding: '0 40px', flexShrink: 0 }}>


        {/* 메인 타이틀 */}
        <div style={{ marginBottom: 18, marginTop: 20 }}>
          <div style={{
            display:'inline-block', padding:'5px 16px', borderRadius:999,
            background:'#FF8C42', color:'#fff',
            fontSize:12, fontWeight:800, letterSpacing:1.5, marginBottom:10,
          }}>6. 여러 가지 그래프</div>
          <h1 style={{
            fontSize: 32, fontWeight: 800, color:'#3D2B1F',
            lineHeight: 1.25, letterSpacing:'-0.5px',
          }}>
            자료를 수집하여<br />
            <span style={{ color:'#4EACD9' }}>알맞은 그래프로</span><br />
            나타내고 해석해요!
          </h1>
          <p style={{ fontSize:14, color:'#8C7B6E', marginTop:10, lineHeight:1.7, fontWeight:600 }}>
            모둠원과 함께 탐구 주제를 정하고,<br />
            자료를 모아 그래프로 표현해 보세요 📊
          </p>
        </div>


      </div>

      {/* ── 오른쪽: 입장 카드 ── */}
      <div style={{ width: 400, padding: '0 16px', position: 'relative' }}>

        {/* ── Sun 캐릭터: 카드 우측 상단 뒤 (DOM 최상단 = 카드 아래에 렌더) ── */}
        <img
          src="/char-sun.png"
          alt=""
          style={{
            position: 'absolute',
            right: -42, top: lastGroup ? -105 : -95,
            width: 138,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.18))',
          }}
        />

        {/* 이전 모둠 빠른 재참여 */}
        {lastGroup && (
          <div onClick={() => {
            sessionStorage.setItem('gts_user', JSON.stringify({ ...lastGroup, role: 'member' }))
            router.push('/activity')
          }} style={{
            marginBottom: 14, padding:'12px 16px',
            background:'#fff', borderRadius:16,
            border:'2.5px solid #E8DFD4',
            display:'flex', alignItems:'center', gap:12,
            cursor:'pointer', boxShadow:'0 3px 10px rgba(150,100,60,.08)',
            transition:'transform .15s, box-shadow .15s',
            position:'relative', zIndex: 2,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(150,100,60,.14)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 3px 10px rgba(150,100,60,.08)' }}
          >
            <div style={{
              width:38, height:38, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,#5BBF7A,#4EACD9)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            }}>🔁</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#3D2B1F',
                whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {lastGroup.name} · {lastGroup.groupName}
              </div>
              <div style={{ fontSize:11, color:'#8C7B6E', letterSpacing:1.5, fontWeight:700 }}>{lastGroup.code}</div>
            </div>
            <div style={{
              fontSize:12, fontWeight:800, color:'#4EACD9',
              background:'#EBF7FF', padding:'4px 10px', borderRadius:999,
              border:'1.5px solid #B3DFFB', whiteSpace:'nowrap',
            }}>다시 참여 →</div>
          </div>
        )}

        {/* 메인 카드 — position:relative로 Sun(absolute, DOM상단)보다 위에 렌더링 */}
        <div style={{
          background:'#fff', borderRadius:24, padding:'28px 28px 24px',
          boxShadow:'0 6px 28px rgba(150,100,60,.12), 0 2px 6px rgba(150,100,60,.06)',
          border:'2.5px solid #E8DFD4',
          position:'relative', zIndex: 2,
        }}>
          {/* 탭 */}
          <div style={{
            display:'flex', gap:4, marginBottom:24,
            background:'#FFF3E8', borderRadius:14, padding:4,
          }}>
            {[['new','🏠 새 모둠 만들기'], ['join','🔑 코드로 참여']].map(([m, label]) => (
              <button key={m} onClick={() => { setMode(m); setError('') }}
                style={{
                  flex:1, padding:'10px 0',
                  fontSize:13, fontWeight: mode === m ? 800 : 600,
                  color: mode === m ? '#fff' : '#8C7B6E',
                  background: mode === m ? '#FF8C42' : 'transparent',
                  border:'none', borderRadius:11,
                  cursor:'pointer', transition:'all .18s ease',
                  boxShadow: mode === m ? '0 3px 10px rgba(255,140,66,.35)' : 'none',
                  fontFamily:'inherit',
                }}>{label}</button>
            ))}
          </div>

          {/* 에러 */}
          {error && (
            <div style={{
              fontSize:13, color:'#D4601A', padding:'10px 14px',
              background:'#FFF3E8', borderRadius:12, marginBottom:16,
              border:'2px solid #FFDAB9', fontWeight:700,
            }}>⚠️ {error}</div>
          )}

          {mode === 'new' ? (
            <form onSubmit={handleNew}>
              <div style={{ marginBottom:18 }}>
                <label style={labelBase}>✏️ 이름</label>
                <input className="edu-input" style={inputBase}
                  placeholder="예: 김민준"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={labelBase}>🏷️ 모둠 이름</label>
                <input className="edu-input" style={inputBase}
                  placeholder="예: 2모둠"
                  value={groupName}
                  onChange={e => { setGroupName(e.target.value); setError('') }} />
              </div>

              <button type="submit" className="edu-btn" style={{
                width:'100%', padding:'15px',
                borderRadius:16, fontSize:16, fontWeight:800, fontFamily:'inherit',
                background:'linear-gradient(135deg, #FF8C42, #FF6520)',
                color:'#fff', border:'none', cursor:'pointer', letterSpacing:'-0.2px',
                boxShadow:'0 5px 16px rgba(255,140,66,.40)',
              }}>🚀 모둠 활동 시작하기!</button>

              <div style={{ marginTop:12, textAlign:'center', fontSize:12, color:'#8C7B6E', lineHeight:1.6, fontWeight:600 }}>
                💡 모둠을 만들면 <span style={{ fontWeight:800, color:'#FF8C42' }}>참여 코드</span>가 생성돼요
              </div>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <div style={{ marginBottom:18 }}>
                <label style={labelBase}>✏️ 이름</label>
                <input className="edu-input" style={inputBase}
                  placeholder="예: 이서연"
                  value={name}
                  onChange={e => { setName(e.target.value); setError('') }} />
              </div>
              <div style={{ marginBottom:20 }}>
                <label style={labelBase}>🔑 참여 코드 (6자리)</label>
                <input className="edu-input"
                  style={{
                    ...inputBase,
                    textTransform:'uppercase', letterSpacing:10,
                    fontWeight:800, fontSize:22, textAlign:'center',
                    padding:'14px 16px',
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.toUpperCase()); setError('') }} />
              </div>

              <button type="submit" className="edu-btn" style={{
                width:'100%', padding:'15px',
                borderRadius:16, fontSize:16, fontWeight:800, fontFamily:'inherit',
                background:'linear-gradient(135deg, #4EACD9, #2785B5)',
                color:'#fff', border:'none', cursor:'pointer', letterSpacing:'-0.2px',
                boxShadow:'0 5px 16px rgba(78,172,217,.40)',
              }}>🙋 모둠 활동 참여하기!</button>

              <div style={{ marginTop:12, textAlign:'center', fontSize:12, color:'#8C7B6E', lineHeight:1.6, fontWeight:600 }}>
                💡 모둠장에게 받은 <span style={{ fontWeight:800, color:'#4EACD9' }}>6자리 코드</span>를 입력하세요
              </div>
            </form>
          )}
        </div>

        {/* ── Water 캐릭터: 카드 우측 하단 앞 ── */}
        <img
          src="/char-water.png"
          alt=""
          style={{
            position: 'absolute',
            right: -48, bottom: -72,
            width: 155,
            zIndex: 10,
            pointerEvents: 'none',
            filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.18))',
          }}
        />
      </div>
    </div>
  )
}
