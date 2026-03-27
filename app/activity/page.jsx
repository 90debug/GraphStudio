'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getOrCreateRoom, subscribeRoom, subscribeStep1Posts, subscribeStep4Posts,
  updateRoomStep, setSyncLeader, clearSyncLeader, updateDataTable, updateChartConfig,
  setSelectedPost, addStep1Post, toggleLike1, addComment1, deleteStep1Post,
  addStep4Post, toggleLike4, addComment4, deleteStep4Post,
  updatePresence, subscribePresence, removePresence,
  createSurvey, getSurvey, subscribeSurvey, subscribeSurveyResponses, addSurveyResponse,
  addStroke, subscribeStrokes, deleteMyStrokes, clearStrokes, setCurrentDrawer,
  saveCanvasSnapshot, loadCanvasSnapshot,
  updateRoomMeta, updateSurveyTopic,
  setSelectionVote, agreeSelectionVote,
  setLivePreview,
} from '../../lib/firestore'

// ─── Constants ────────────────────────────────────────────────────────────

const STEPS = [
  { n:1, label:'탐구 문제 정하기', short:'탐구문제', emoji:'🔍', c:'var(--s1)', bg:'var(--s1-bg)', bd:'var(--s1-bd)', dk:'var(--s1-dk)' },
  { n:2, label:'자료 모으기',       short:'자료수집',  emoji:'📥', c:'var(--s2)', bg:'var(--s2-bg)', bd:'var(--s2-bd)', dk:'var(--s2-dk)' },
  { n:3, label:'그래프로 나타내기', short:'그래프',    emoji:'📊', c:'var(--s3)', bg:'var(--s3-bg)', bd:'var(--s3-bd)', dk:'var(--s3-dk)' },
  { n:4, label:'그래프 해석하기',   short:'해석',      emoji:'💡', c:'var(--s4)', bg:'var(--s4-bg)', bd:'var(--s4-bd)', dk:'var(--s4-dk)' },
]

const CHART_COLORS = ['#FF8C42','#4EACD9','#5BBF7A','#C97DE8','#F7C948','#FF6B7A','#4DD9C0','#FF9FBB']
const AV_BG = ['#FFF3E8','#EBF7FF','#EDFAF2','#F8EFFE','#FFFAE8','#FFF0F1']
const AV_FG = ['#D4601A','#2785B5','#2D9950','#9A45C2','#A07C10','#C0364A']
const DRAW_COLORS = ['#3D2B1F','#FF6B7A','#FF8C42','#4EACD9','#5BBF7A','#C97DE8','#F7C948','#FFFFFF']
const CHECKLIST = [
  '그래프 제목이 명확하게 작성되었나요?',
  '조사 목적에 알맞은 그래프 유형을 선택했나요?',
  '항목의 수치가 정확하게 표시되었나요?',
  '백분율(%)이 올바르게 계산되었나요?',
  '그래프에서 알 수 있는 내용을 잘 정리했나요?',
]
const EDU_GRAD = 'linear-gradient(135deg,#FF8C42 0%,#FFB347 30%,#FF6B7A 55%,#C97DE8 80%,#4EACD9 100%)'
const IG_GRAD = EDU_GRAD  // alias for backward compat

// 교과서 파스텔 포스트잇 색상
const POSTIT_COLORS = [
  { bg: '#FFF8DC', border: '#FFD966', shadow: 'rgba(255,200,50,.30)' },
  { bg: '#FFE8F4', border: '#FFB3D9', shadow: 'rgba(255,105,180,.22)' },
  { bg: '#E0F4FF', border: '#90D8F9', shadow: 'rgba(78,172,217,.22)' },
  { bg: '#E4F9ED', border: '#7FE0A2', shadow: 'rgba(91,191,122,.22)' },
  { bg: '#FFF0DC', border: '#FFBD7A', shadow: 'rgba(255,140,66,.22)' },
  { bg: '#F3EAFF', border: '#D9AAFF', shadow: 'rgba(201,125,232,.22)' },
  { bg: '#FFE8E8', border: '#FFB0B0', shadow: 'rgba(255,107,122,.22)' },
  { bg: '#E6F8FF', border: '#99D9F5', shadow: 'rgba(78,172,217,.18)' },
]
const postitColor = (name) => POSTIT_COLORS[(name || '').charCodeAt(0) % POSTIT_COLORS.length]

// ─── Helpers ──────────────────────────────────────────────────────────────

const avBg  = n => AV_BG[(n || '').charCodeAt(0) % AV_BG.length]
const avFg  = n => AV_FG[(n || '').charCodeAt(0) % AV_FG.length]
const tsNow = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

function useDb(fn, delay) {
  const t = useRef(null)
  return useCallback((...a) => {
    clearTimeout(t.current)
    t.current = setTimeout(() => fn(...a), delay)
  }, []) // eslint-disable-line
}

// ─── Mini UI ──────────────────────────────────────────────────────────────

function Avatar({ name, size = 30, gradient = false }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
      padding: gradient ? 2.5 : 0,
      background: gradient ? EDU_GRAD : 'transparent',
    }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%',
        background: avBg(name), color: avFg(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * (gradient ? 0.38 : 0.42), fontWeight: 800,
        border: gradient ? '2.5px solid #fff' : `2.5px solid ${avFg(name)}25`,
        boxShadow: gradient ? 'none' : `0 2px 8px ${avFg(name)}25`,
      }}>{(name || '?')[0]}</div>
    </div>
  )
}

function Btn({ children, onClick, color = 'blue', pill = false, sm = false,
  outline = false, disabled = false, style: ex = {}, full = false }) {
  const m = {
    blue:   ['#4EACD9', '#fff', '#4EACD9', '0 4px 12px rgba(78,172,217,.35)'],
    orange: ['#FF8C42', '#fff', '#FF8C42', '0 4px 12px rgba(255,140,66,.35)'],
    green:  ['#5BBF7A', '#fff', '#5BBF7A', '0 4px 12px rgba(91,191,122,.35)'],
    purple: ['#C97DE8', '#fff', '#C97DE8', '0 4px 12px rgba(201,125,232,.35)'],
    red:    ['#FF6B7A', '#fff', '#FF6B7A', '0 4px 12px rgba(255,107,122,.35)'],
    gray:   ['#F2EAE0', '#8C7B6E', '#E8DFD4', 'none'],
    dark:   ['#3D2B1F', '#fff', '#3D2B1F', '0 4px 12px rgba(61,43,31,.25)'],
  }
  const [bg, txt, bd, sh] = m[color] || m.blue
  return (
    <button onClick={disabled ? undefined : onClick} className={disabled ? '' : 'edu-btn'} style={{
      padding: sm ? '7px 16px' : '11px 22px',
      minHeight: sm ? 36 : 44,
      borderRadius: pill ? 999 : 12,
      fontSize: sm ? 13 : 15,
      fontWeight: 800,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: `2px solid ${bd}`,
      background: outline ? '#fff' : bg,
      color: outline ? bd : txt,
      opacity: disabled ? .45 : 1,
      boxShadow: disabled || outline ? 'none' : sh,
      transition: 'all .15s',
      fontFamily: 'inherit',
      display: 'inline-flex', alignItems: 'center', gap: 5,
      width: full ? '100%' : undefined,
      justifyContent: full ? 'center' : undefined,
      ...ex,
    }}>{children}</button>
  )
}

function Inp({ value, onChange, placeholder, multi = false, rows = 3, style: ex = {}, onKeyDown, type = 'text' }) {
  const base = {
    width: '100%', padding: '12px 16px', borderRadius: 14,
    border: '2.5px solid #E6D8C8', fontSize: 14, color: '#3D2B1F',
    background: '#FFFDF9', outline: 'none', fontFamily: 'inherit',
    resize: multi ? 'vertical' : 'none', lineHeight: 1.7, fontWeight: 600,
    transition: 'border-color .15s, box-shadow .15s', ...ex,
  }
  return multi
    ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={base}
        onFocus={e => { e.target.style.borderColor='#4EACD9'; e.target.style.boxShadow='0 0 0 4px rgba(78,172,217,.15)' }}
        onBlur={e  => { e.target.style.borderColor='#E6D8C8'; e.target.style.boxShadow='none' }} />
    : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={base} onKeyDown={onKeyDown}
        onFocus={e => { e.target.style.borderColor='#4EACD9'; e.target.style.boxShadow='0 0 0 4px rgba(78,172,217,.15)' }}
        onBlur={e  => { e.target.style.borderColor='#E6D8C8'; e.target.style.boxShadow='none' }} />
}

function Lbl({ children, mt = 12 }) {
  return <div style={{ fontSize: 13, fontWeight: 800, color: '#7B6858', marginBottom: 8, marginTop: mt, letterSpacing: '0.2px', display:'flex', alignItems:'center', gap:5 }}>{children}</div>
}

function Sec({ children, style: ex = {} }) {
  return (
    <div style={{
      background: '#fff', border: '2.5px solid #E6D8C8',
      borderRadius: 20, padding: '16px 18px', marginBottom: 14,
      boxShadow: '0 4px 16px rgba(140,90,50,.08)', ...ex,
    }}>{children}</div>
  )
}

function Tag({ children, color = '#FF8C42' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 14px',
      borderRadius: 999, background: color + '15', color, border: `2px solid ${color}35`,
      fontSize: 12, fontWeight: 800, gap: 4, boxShadow: `0 2px 8px ${color}20`,
      letterSpacing: '0.1px' }}>{children}</span>
  )
}

// ─── Selection Vote Modal ─────────────────────────────────────────────────

function VoteModal({ vote, myName, onAgree, onClose, onCancel, isRequester }) {
  const alreadyAgreed = vote?.agreed?.includes(myName)
  const agreedCount   = vote?.agreed?.length  || 0
  const totalVoters   = vote?.voters?.length  || 1
  const allAgreed     = agreedCount >= totalVoters && totalVoters > 0

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(61,43,31,.52)',
      backdropFilter: 'blur(3px)',
      zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 28, padding: '32px 28px 26px',
        maxWidth: 390, width: '100%',
        boxShadow: '0 20px 60px rgba(61,43,31,.28)',
        animation: 'fadeUp .25s cubic-bezier(.34,1.3,.64,1)',
        border: '3px solid #A8ECC0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 배경 장식 */}
        <div style={{ position:'absolute', top:-20, right:-20, width:80, height:80, borderRadius:'50%',
          background:'rgba(91,191,122,.08)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-15, left:-15, width:60, height:60, borderRadius:'50%',
          background:'rgba(78,172,217,.08)', pointerEvents:'none' }} />

        {/* 닫기(X) 버튼 — 항상 표시 */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          width: 30, height: 30, borderRadius: '50%',
          background: '#F2EAE0', color: '#8C7B6E',
          border: '2px solid #E6D8C8', fontSize: 14, fontWeight: 800,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit', lineHeight: 1, transition: 'all .15s',
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🗳️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#3D2B1F', letterSpacing:'-0.3px' }}>탐구 문제 선정 투표</div>
          <div style={{ fontSize: 13, color: '#8C7B6E', marginTop: 6, fontWeight:600 }}>
            <span style={{
              display:'inline-block', padding:'3px 10px', borderRadius:999,
              background:'#EBF7FF', color:'#2785B5', fontWeight:800, fontSize:13,
            }}>{vote?.requestedBy}</span>님이 선정을 요청했어요
          </div>
        </div>

        {/* Post content preview */}
        <div style={{
          background: 'linear-gradient(135deg,#EDFAF2,#E0F8EA)', border: '2px solid #90DDB0',
          borderRadius: 16, padding: '14px 16px', marginBottom: 20,
          boxShadow: '0 3px 10px rgba(91,191,122,.12)',
        }}>
          <div style={{ fontSize: 11, color: '#2D9950', fontWeight: 800, marginBottom: 7,
            letterSpacing:'0.5px', textTransform:'uppercase' }}>📋 선정 후보 내용</div>
          <div style={{ fontSize: 14, lineHeight: 1.75, color: '#3D2B1F', whiteSpace: 'pre-line', fontWeight:600 }}>
            {vote?.postData?.content}
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8C7B6E', marginBottom: 8, fontWeight:700 }}>
            <span>찬성 현황</span>
            <span style={{ background:'#EDFAF2', color:'#2D9950', padding:'2px 10px',
              borderRadius:999, border:'1.5px solid #90DDB0', fontWeight:800 }}>{agreedCount} / {totalVoters}명</span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: '#F0E8DC', overflow: 'hidden',
            border:'1.5px solid #E6D8C8' }}>
            <div style={{
              width: `${(agreedCount / totalVoters) * 100}%`, height: '100%',
              background: 'linear-gradient(90deg, #5BBF7A, #2D9950)',
              borderRadius: 999, transition: 'width .5s cubic-bezier(.34,1.3,.64,1)',
            }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {vote?.voters?.map(name => (
              <div key={name} style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                background: vote?.agreed?.includes(name) ? '#EDFAF2' : '#FFF9F2',
                color:      vote?.agreed?.includes(name) ? '#2D9950' : '#C4B4A8',
                border: `2px solid ${vote?.agreed?.includes(name) ? '#90DDB0' : '#E6D8C8'}`,
                boxShadow: vote?.agreed?.includes(name) ? '0 2px 6px rgba(91,191,122,.18)' : 'none',
                transition: 'all .2s',
              }}>
                {vote?.agreed?.includes(name) ? '✅ ' : '⏳ '}{name}
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        {allAgreed ? (
          <div style={{
            textAlign: 'center', padding: '14px', background: 'linear-gradient(135deg,#EDFAF2,#D4F5E0)',
            borderRadius: 14, fontSize: 15, fontWeight: 800, color: '#2D9950',
            border: '2px solid #90DDB0', boxShadow: '0 3px 10px rgba(91,191,122,.15)',
          }}>
            🎉 전원 찬성! 잠시 후 자동으로 선정돼요...
          </div>
        ) : alreadyAgreed ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{
              textAlign: 'center', padding: '13px', background: 'linear-gradient(135deg,#EDFAF2,#D4F5E0)',
              borderRadius: 14, fontSize: 14, fontWeight: 800, color: '#2D9950',
              border: '2px solid #90DDB0',
            }}>
              ✅ 찬성 완료! 다른 모둠원을 기다리는 중...
            </div>
            {isRequester && (
              <button onClick={onCancel} style={{
                padding: '11px', borderRadius: 14,
                background: '#FFF0F1', color: '#C0364A',
                border: '2px solid #FFB0B0', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(192,54,74,.12)',
              }}>🔄 투표 취소하고 다시 요청하기</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: '13px', borderRadius: 14,
              background: '#F2EAE0', color: '#8C7B6E',
              border: '2px solid #E6D8C8', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>나중에</button>
            <button onClick={onAgree} className="edu-btn" style={{
              flex: 2, padding: '13px', borderRadius: 14,
              background: 'linear-gradient(135deg, #5BBF7A, #2D9950)',
              color: '#fff', border: 'none', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 5px 16px rgba(91,191,122,.40)',
            }}>👍 찬성하기</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t) }, []) // eslint-disable-line
  return (
    <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg,#3D2B1F,#5C3D28)', color: '#fff',
      borderRadius: 999, padding: '13px 28px',
      fontSize: 14, fontWeight: 800, zIndex: 9999,
      boxShadow: '0 8px 28px rgba(61,43,31,.36)',
      animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)',
      whiteSpace: 'nowrap',
      border: '2px solid rgba(255,255,255,.18)',
      backdropFilter: 'blur(8px)',
      letterSpacing: '0.1px',
    }}>{msg}</div>
  )
}

function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(61,43,31,.50)',
      backdropFilter: 'blur(4px)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 26, padding: 26,
        maxWidth: 420, width: '100%',
        boxShadow: '0 16px 52px rgba(61,43,31,.24)',
        animation: 'fadeUp .26s cubic-bezier(.34,1.3,.64,1)',
        border: '2.5px solid #E6D8C8' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Survey Modal ─────────────────────────────────────────────────────────

function SurveyModal({ survey, userName, surveyCode, onClose }) {
  const [selected, setSelected] = useState('')
  const [done,     setDone]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function submit() {
    if (!selected) return
    setLoading(true)
    await addSurveyResponse(surveyCode, userName, selected)
    setDone(true)
    setLoading(false)
    setTimeout(onClose, 1800)
  }

  return (
    <Modal onClose={onClose}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#4EACD9', marginBottom: 6, letterSpacing: .3 }}>
        📋 {survey.groupName || surveyCode} 모둠의 설문조사
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{survey.topic}</div>
      <div style={{ fontSize: 14, color: '#8C7B6E', marginBottom: 18, lineHeight: 1.6 }}>📌 {survey.question}</div>
      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 40 }}>✅</div>
          <div style={{ fontWeight: 700, marginTop: 10, color: '#5BBF7A', fontSize: 15 }}>참여 완료!</div>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
            {survey.items?.map((item, i) => (
              <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 14px', borderRadius: 10,
                border: `2px solid ${selected === item ? '#4EACD9' : '#E6D8C8'}`,
                background: selected === item ? '#EBF7FF' : '#fff',
                cursor: 'pointer', fontWeight: selected === item ? 700 : 400,
                transition: 'all .15s', minHeight: 44 }}>
                <input type="radio" name="sv" value={item} checked={selected === item}
                  onChange={() => setSelected(item)}
                  style={{ accentColor: '#4EACD9', width: 17, height: 17 }} />
                <span style={{ fontSize: 15 }}>{item}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={onClose} color="gray" style={{ flex: 1 }}>닫기</Btn>
            <Btn onClick={submit} color="blue" disabled={!selected || loading} style={{ flex: 2 }}>
              {loading ? '제출 중...' : '✉️ 제출하기'}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Charts ───────────────────────────────────────────────────────────────

function NoData({ msg = '2단계에서 데이터를 입력하면\n그래프가 나타나요' }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 16px', color: '#8C7B6E', fontSize: 13, lineHeight: 1.8 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
      {msg}
    </div>
  )
}

function BarChart({ data }) {
  if (!data?.some(d => Number(d.value) > 0)) return <NoData />
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1)
  const W = 560, H = 200, pL = 36, pT = 24, pB = 36
  const bw = Math.min(56, Math.floor((W - pL - 20) / data.length) - 10)
  const gap = Math.floor((W - pL - 20 - bw * data.length) / (data.length + 1))
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + pT + pB}`} style={{ display: 'block' }}>
      {[.25, .5, .75, 1].map(p => (
        <line key={p} x1={pL} y1={pT + H * (1 - p)} x2={W - 8} y2={pT + H * (1 - p)}
          stroke="#efefef" strokeWidth=".8" strokeDasharray="4 3" />
      ))}
      <line x1={pL} y1={pT} x2={pL} y2={pT + H} stroke="#dbdbdb" strokeWidth=".8" />
      <line x1={pL} y1={pT + H} x2={W - 8} y2={pT + H} stroke="#dbdbdb" strokeWidth=".8" />
      {[0, Math.round(max * .5), max].map((v, i) => (
        <text key={i} x={pL - 5} y={pT + H - (v / max) * H + 4}
          textAnchor="end" fontSize="10" fill="#8e8e8e">{v}</text>
      ))}
      {data.map((d, i) => {
        const v = Number(d.value) || 0, bh = (v / max) * H
        const x = pL + gap + i * (bw + gap), y = pT + H - bh
        const lbl = d.label?.length > 5 ? d.label.slice(0, 4) + '…' : d.label
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="5" fill={CHART_COLORS[i % CHART_COLORS.length]} opacity=".9" />
            {v > 0 && <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="12"
              fill={CHART_COLORS[i % CHART_COLORS.length]} fontWeight="700">{v}</text>}
            <text x={x + bw / 2} y={pT + H + 18} textAnchor="middle" fontSize="11" fill="#8e8e8e">{lbl}</text>
          </g>
        )
      })}
    </svg>
  )
}

function PieChart({ data }) {
  const total = data?.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0
  if (!total) return <NoData />
  let angle = -Math.PI / 2
  const cx = 110, cy = 110, r = 90
  const slices = data.map((d, i) => {
    const v = Number(d.value) || 0
    // Clamp to slightly less than 2π to avoid degenerate full-circle arc
    const a = Math.min((v / total) * 2 * Math.PI, 2 * Math.PI - 0.0001)
    const s = angle; angle += (v / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(s + a), y2 = cy + r * Math.sin(s + a)
    const mid = s + a / 2
    const isFull = v / total >= 0.9999
    return {
      path: isFull
        // Full circle: two half-arcs
        ? `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
        : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2}Z`,
      color: CHART_COLORS[i % CHART_COLORS.length],
      pct: Math.round(v / total * 100),
      lx: cx + r * .58 * Math.cos(mid), ly: cy + r * .58 * Math.sin(mid),
      label: d.label, v,
    }
  }).filter(s => s.v > 0)  // skip zero-value slices
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="220" height="220" viewBox="0 0 220 220" style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.path} fill={s.color} stroke="#fff" strokeWidth="2.5" />
            {s.pct > 7 && <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central"
              fontSize="12" fill="#fff" fontWeight="700">{s.pct}%</text>}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: '#8C7B6E' }}>{s.label}</span>
            <span style={{ fontWeight: 700 }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StripChart({ data }) {
  const total = data?.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0
  if (!total) return <NoData />
  let cum = 0
  const segs = data.map((d, i) => {
    const v = Number(d.value) || 0, pct = v / total * 100, x = cum; cum += pct
    return { x, pct, color: CHART_COLORS[i % CHART_COLORS.length], label: d.label }
  })
  return (
    <div>
      <div style={{ height: 52, borderRadius: 10, overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
        {segs.map((s, i) => (
          <div key={i} style={{ width: `${s.pct}%`, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {s.pct > 8 && <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{Math.round(s.pct)}%</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color }} />
            <span style={{ color: '#8C7B6E' }}>{s.label}</span>
            <span style={{ fontWeight: 700 }}>{Math.round(s.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const CHART_CMPS = { bar: BarChart, pie: PieChart, strip: StripChart }

// ─── Drawing Canvas (with grid paper) ─────────────────────────────────────

// tool: 'pen' | 'eraser' | 'ruler' | 'compass'
function DrawingCanvas({ code, userName, strokes, currentDrawer, livePreview }) {
  const canvasRef    = useRef(null)
  const overlayRef   = useRef(null)   // overlay canvas for preview (ruler/compass)
  const drawing      = useRef(false)
  const startPt      = useRef(null)   // ruler/compass start point
  const curStroke    = useRef([])
  const [color,    setColor]    = useState('#1C1917')
  const [width,    setWidth]    = useState(4)
  const [tool,     setTool]     = useState('pen')  // pen | eraser | ruler | compass
  const [saving,   setSaving]   = useState(false)
  const [snapshotImg, setSnapshotImg] = useState(null)

  // throttle용 — 너무 자주 Firestore에 쓰지 않도록
  const previewThrottle = useRef(null)

  const eraser = tool === 'eraser'

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect()
    const src = e.touches?.[0] ?? e
    return {
      x: (src.clientX - r.left) * (canvas.width / r.width),
      y: (src.clientY - r.top)  * (canvas.height / r.height),
    }
  }

  // ── Draw grid paper (모눈종이) ──
  function drawGrid(ctx, w, h) {
    const cell = 25
    ctx.save()
    ctx.strokeStyle = 'rgba(173,213,240,0.45)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= w; x += cell) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y <= h; y += cell) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(120,180,220,0.35)'
    ctx.lineWidth = 0.9
    for (let x = 0; x <= w; x += cell * 5) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y <= h; y += cell * 5) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
    ctx.restore()
  }

  function drawStrokes(ctx, stks) {
    stks.forEach(sk => {
      if (!sk.points?.length) return
      if (sk.type === 'ruler' && sk.points.length >= 2) {
        const p1 = sk.points[0], p2 = sk.points[sk.points.length - 1]
        ctx.beginPath()
        ctx.strokeStyle = sk.color
        ctx.lineWidth   = sk.width
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.globalCompositeOperation = 'source-over'
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
        return
      }
      if (sk.type === 'compass' && sk.points.length >= 2) {
        const center = sk.points[0], edge = sk.points[sk.points.length - 1]
        const r = Math.hypot(edge.x - center.x, edge.y - center.y)
        ctx.beginPath()
        ctx.strokeStyle = sk.color
        ctx.lineWidth   = sk.width
        ctx.globalCompositeOperation = 'source-over'
        ctx.arc(center.x, center.y, r, 0, Math.PI * 2)
        ctx.stroke()
        return
      }
      ctx.beginPath()
      ctx.strokeStyle = sk.color
      ctx.lineWidth   = sk.width
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      ctx.globalCompositeOperation = sk.eraser ? 'destination-out' : 'source-over'
      sk.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
      ctx.stroke()
    })
    ctx.globalCompositeOperation = 'source-over'
  }

  function redrawStrokes(stks) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(ctx, canvas.width, canvas.height)
    if (snapshotImg) {
      const img = new Image()
      img.src = snapshotImg
      img.onload = () => {
        ctx.globalAlpha = .5
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = 1
        drawStrokes(ctx, stks)
      }
    } else {
      drawStrokes(ctx, stks)
    }
  }

  // ── Overlay (preview) helpers ──
  function clearOverlay() {
    const ov = overlayRef.current
    if (!ov) return
    ov.getContext('2d').clearRect(0, 0, ov.width, ov.height)
  }

  // 내부 미리보기 렌더 (자)
  function _renderRulerOnCtx(ctx, p1, p2, clr, lw) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.beginPath()
    ctx.strokeStyle = clr
    ctx.lineWidth = lw
    ctx.lineCap = 'round'
    ctx.setLineDash([8, 6])
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
    ctx.stroke()
    ctx.setLineDash([])
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const cells = (dist / 25).toFixed(1)
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2
    ctx.font = 'bold 14px sans-serif'
    ctx.fillStyle = clr
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.setLineDash([])
    ctx.strokeText(`${cells}칸`, mx + 6, my - 8)
    ctx.fillText(`${cells}칸`, mx + 6, my - 8)
  }

  // 내부 미리보기 렌더 (컴퍼스)
  function _renderCompassOnCtx(ctx, center, edge, clr, lw) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    const r = Math.hypot(edge.x - center.x, edge.y - center.y)
    ctx.beginPath()
    ctx.strokeStyle = clr
    ctx.lineWidth = lw
    ctx.setLineDash([8, 6])
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    // center dot
    ctx.beginPath()
    ctx.fillStyle = clr
    ctx.arc(center.x, center.y, 5, 0, Math.PI * 2)
    ctx.fill()
    // radius line
    ctx.beginPath()
    ctx.strokeStyle = clr + '90'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(edge.x, edge.y)
    ctx.stroke()
    ctx.setLineDash([])
    // radius label
    const cells = (r / 25).toFixed(1)
    const labelX = center.x + 8, labelY = center.y - r - 8
    ctx.font = 'bold 14px sans-serif'
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.strokeText(`반지름 ${cells}칸`, labelX, labelY)
    ctx.fillStyle = clr
    ctx.fillText(`반지름 ${cells}칸`, labelX, labelY)
  }

  function drawRulerPreview(p1, p2) {
    const ov = overlayRef.current
    if (!ov) return
    _renderRulerOnCtx(ov.getContext('2d'), p1, p2, color, width)
  }

  function drawCompassPreview(center, edge) {
    const ov = overlayRef.current
    if (!ov) return
    _renderCompassOnCtx(ov.getContext('2d'), center, edge, color, width)
  }

  // ── 다른 사람의 livePreview 수신 → overlay에 렌더 ──
  useEffect(() => {
    // 내가 그리는 중이면 무시 (내 overlay는 내가 관리)
    if (drawing.current) return
    const ov = overlayRef.current
    if (!ov) return
    const ctx = ov.getContext('2d')

    if (!livePreview || livePreview.drawer === userName) {
      // 아무도 미리보기 안 하거나 내 것이면 클리어
      ctx.clearRect(0, 0, ov.width, ov.height)
      return
    }
    const { type, p1, p2, color: clr, width: lw } = livePreview
    if (type === 'ruler' && p1 && p2) {
      _renderRulerOnCtx(ctx, p1, p2, clr, lw)
    } else if (type === 'compass' && p1 && p2) {
      _renderCompassOnCtx(ctx, p1, p2, clr, lw)
    } else {
      ctx.clearRect(0, 0, ov.width, ov.height)
    }
  }, [livePreview]) // eslint-disable-line

  useEffect(() => { redrawStrokes(strokes) }, [strokes, snapshotImg]) // eslint-disable-line

  function onStart(e) {
    e.preventDefault()
    const p = getPos(e, canvasRef.current)
    drawing.current = true
    startPt.current = p
    curStroke.current = [p]
    setCurrentDrawer(code, userName)
  }

  function onMove(e) {
    e.preventDefault()
    if (!drawing.current) return
    const p = getPos(e, canvasRef.current)

    if (tool === 'ruler') {
      curStroke.current = [p]
      drawRulerPreview(startPt.current, p)
      // Firestore에 throttle 전송 (100ms)
      if (!previewThrottle.current) {
        previewThrottle.current = setTimeout(() => {
          previewThrottle.current = null
          if (drawing.current && startPt.current) {
            setLivePreview(code, {
              type: 'ruler', drawer: userName, color, width,
              p1: startPt.current,
              p2: curStroke.current[curStroke.current.length - 1] || startPt.current,
            }).catch(() => {})
          }
        }, 80)
      }
      return
    }
    if (tool === 'compass') {
      curStroke.current = [p]
      drawCompassPreview(startPt.current, p)
      // Firestore에 throttle 전송 (100ms)
      if (!previewThrottle.current) {
        previewThrottle.current = setTimeout(() => {
          previewThrottle.current = null
          if (drawing.current && startPt.current) {
            setLivePreview(code, {
              type: 'compass', drawer: userName, color, width,
              p1: startPt.current,
              p2: curStroke.current[curStroke.current.length - 1] || startPt.current,
            }).catch(() => {})
          }
        }, 80)
      }
      return
    }

    curStroke.current.push(p)
    const ctx = canvasRef.current.getContext('2d')
    const pts = curStroke.current
    if (pts.length < 2) return
    ctx.beginPath()
    ctx.strokeStyle = eraser ? '#fff' : color
    ctx.lineWidth   = eraser ? width * 3 : width
    ctx.lineCap     = 'round'; ctx.lineJoin = 'round'
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over'
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y)
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
  }

  async function onEnd(e) {
    e.preventDefault()
    if (!drawing.current) return
    drawing.current = false
    clearOverlay()

    if (tool === 'ruler' && startPt.current && curStroke.current.length >= 1) {
      const lastPt = curStroke.current[curStroke.current.length - 1] || startPt.current
      // get final cursor position from event
      const canvas = canvasRef.current
      const finalPt = e.changedTouches
        ? getPos({ changedTouches: e.changedTouches }, canvas)
        : (e.type === 'mouseleave' ? lastPt : getPos(e, canvas))
      if (Math.hypot(finalPt.x - startPt.current.x, finalPt.y - startPt.current.y) > 3) {
        await addStroke(code, {
          drawer: userName, color, width, eraser: false, type: 'ruler',
          points: [startPt.current, finalPt],
        })
      }
    } else if (tool === 'compass' && startPt.current && curStroke.current.length >= 1) {
      const canvas = canvasRef.current
      const finalPt = e.changedTouches
        ? getPos({ changedTouches: e.changedTouches }, canvas)
        : (e.type === 'mouseleave' ? curStroke.current[curStroke.current.length - 1] : getPos(e, canvas))
      const r = Math.hypot(finalPt.x - startPt.current.x, finalPt.y - startPt.current.y)
      if (r > 5) {
        await addStroke(code, {
          drawer: userName, color, width, eraser: false, type: 'compass',
          points: [startPt.current, finalPt],
        })
      }
    } else if (curStroke.current.length > 1) {
      await addStroke(code, {
        drawer: userName,
        color: eraser ? '#fff' : color,
        width: eraser ? width * 3 : width,
        eraser: !!eraser,
        type: 'pen',
        points: curStroke.current,
      })
    }

    curStroke.current = []
    startPt.current = null
    // throttle 취소 및 livePreview 클리어
    if (previewThrottle.current) {
      clearTimeout(previewThrottle.current)
      previewThrottle.current = null
    }
    if (tool === 'ruler' || tool === 'compass') {
      setLivePreview(code, null).catch(() => {})
    }
    await setCurrentDrawer(code, null)
  }

  async function doSave() {
    setSaving(true)
    const dataUrl = canvasRef.current.toDataURL('image/png')
    await saveCanvasSnapshot(code, dataUrl)
    const a = document.createElement('a')
    a.href = dataUrl; a.download = '우리모둠_그래프.png'; a.click()
    setSaving(false)
  }

  async function doDeleteMine() {
    if (!confirm('내 그림만 지울까요?')) return
    await deleteMyStrokes(code, userName)
  }

  async function doClearAll() {
    if (!confirm('모든 그림을 지울까요?')) return
    await clearStrokes(code)
    setSnapshotImg(null)
  }

  async function doLoad() {
    const img = await loadCanvasSnapshot(code)
    if (img) setSnapshotImg(img)
    else alert('저장된 그림이 없어요')
  }

  const toolBtns = [
    { id: 'pen',     label: '✏️ 펜',    clr: '#4EACD9' },
    { id: 'ruler',   label: '📏 자',    clr: '#F97316' },
    { id: 'compass', label: '🔵 컴퍼스', clr: '#8B5CF6' },
    { id: 'eraser',  label: '🧹 지우개', clr: '#FF6B7A' },
  ]

  const cursorMap = { pen: 'crosshair', ruler: 'crosshair', compass: 'crosshair', eraser: 'cell' }

  return (
    <div>
      {/* Toolbar row 1: tool selector */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        {toolBtns.map(tb => (
          <button key={tb.id} onClick={() => setTool(tb.id)} style={{
            padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
            background: tool === tb.id ? tb.clr + '18' : 'transparent',
            border: `1.5px solid ${tool === tb.id ? tb.clr : '#E6D8C8'}`,
            color: tool === tb.id ? tb.clr : '#8C7B6E', cursor: 'pointer',
            transition: 'all .15s',
          }}>{tb.label}</button>
        ))}
        {/* tool hints */}
        {tool === 'ruler' && (
          <span style={{ fontSize: 11, color: '#F97316', fontWeight: 600, marginLeft: 4 }}>
            클릭해서 시작점 → 드래그해서 선 그리기
          </span>
        )}
        {tool === 'compass' && (
          <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600, marginLeft: 4 }}>
            클릭해서 중심점 → 드래그해서 반지름 설정
          </span>
        )}
      </div>

      {/* Toolbar row 2: colors + width */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {DRAW_COLORS.map(c => (
            <button key={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('pen') }} style={{
              width: 26, height: 26, borderRadius: '50%',
              background: c === '#FFFFFF' ? '#f5f5f5' : c,
              border: `3px solid ${color === c && tool !== 'eraser' ? '#3D2B1F' : 'transparent'}`,
              cursor: 'pointer', transition: 'border .1s',
              boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #dbdbdb' : 'none',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8C7B6E' }}>
          굵기
          <input type="range" min="2" max="18" value={width} step="1"
            onChange={e => setWidth(+e.target.value)}
            style={{ width: 64, accentColor: '#4EACD9' }} />
          <div style={{
            width: Math.max(eraser ? width*3 : width, 6), height: Math.max(eraser ? width*3 : width, 6),
            borderRadius: '50%', background: eraser ? '#E6D8C8' : color, flexShrink: 0,
            border: '1px solid #dbdbdb', minWidth: 6, transition: 'all .1s',
          }} />
        </div>
      </div>

      {/* Toolbar row 3: actions */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <Btn onClick={doDeleteMine} color="gray" sm>🙋 내 그림만</Btn>
        <Btn onClick={doClearAll}   color="gray" sm>🗑️ 전체 지우기</Btn>
        <Btn onClick={doLoad}       color="gray" sm>📂 불러오기</Btn>
        <Btn onClick={doSave} color="green" sm disabled={saving} style={{ marginLeft: 'auto' }}>
          {saving ? '저장 중...' : '💾 저장하기'}
        </Btn>
      </div>

      {/* 작성자 표시 영역 — 항상 고정 높이로 확보하여 레이아웃 흔들림 방지 */}
      <div style={{
        height: 28, display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 4, fontSize: 13, color: '#8C7B6E',
      }}>
        {currentDrawer ? (
          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#5BBF7A',
              animation: 'pulse 1s infinite', display: 'inline-block', flexShrink: 0,
            }} />
            <b style={{ color: '#3D2B1F' }}>{currentDrawer}</b>님이 그리는 중...
          </span>
        ) : (
          <span style={{ opacity: 0 }}>placeholder</span>
        )}
        {/* 자/컴퍼스 실시간 협동 표시 */}
        {livePreview && livePreview.drawer && livePreview.drawer !== userName && (
          <span style={{
            display:'inline-flex', alignItems:'center', gap:5,
            padding:'2px 10px', borderRadius:999,
            background: livePreview.type === 'ruler' ? '#FFF3E8' : '#F8EFFE',
            border: `1.5px solid ${livePreview.type === 'ruler' ? '#FFCB96' : '#D9A4F5'}`,
            fontSize: 12, fontWeight: 700,
            color: livePreview.type === 'ruler' ? '#D4601A' : '#9A45C2',
          }}>
            <span style={{ animation:'pulse 1s infinite', display:'inline-block',
              width:6, height:6, borderRadius:'50%',
              background: livePreview.type === 'ruler' ? '#FF8C42' : '#C97DE8',
              flexShrink:0 }} />
            {livePreview.drawer}님이 {livePreview.type === 'ruler' ? '📏 자' : '🔵 컴퍼스'} 사용 중
          </span>
        )}
      </div>

      {/* Canvas stack: main + overlay */}
      <div style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvasRef} width={800} height={480}
          style={{
            width: '100%', borderRadius: 10,
            border: '1.5px solid #dbdbdb',
            background: '#fff',
            cursor: cursorMap[tool] || 'crosshair',
            touchAction: 'none', display: 'block',
          }}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
        {/* Overlay canvas — same size, pointer-events disabled */}
        <canvas ref={overlayRef} width={800} height={480}
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            borderRadius: 10, pointerEvents: 'none',
          }} />
      </div>
      <div style={{ fontSize: 13, color: '#8C7B6E', marginTop: 7, lineHeight: 1.6 }}>
        💡 모눈종이 위에 그래프를 직접 그려보세요. 친구들의 그림이 실시간으로 반영돼요.
      </div>
    </div>
  )
}

// ─── Post-it PostCard ────────────────────────────────────────────────────

const MY_POSTIT  = { bg: '#FFF8DC', border: '#FFD966', shadow: 'rgba(255,200,50,.28)' }
const OTHER_POSTIT_COLORS = [
  { bg: '#E0F4FF', border: '#90D8F9', shadow: 'rgba(78,172,217,.22)' },
  { bg: '#FFE8F4', border: '#FFB3D9', shadow: 'rgba(255,105,180,.22)' },
  { bg: '#E4F9ED', border: '#7FE0A2', shadow: 'rgba(91,191,122,.22)' },
  { bg: '#F3EAFF', border: '#D9AAFF', shadow: 'rgba(201,125,232,.22)' },
  { bg: '#FFF0DC', border: '#FFBD7A', shadow: 'rgba(255,140,66,.22)' },
  { bg: '#E6F8F5', border: '#7FD8CC', shadow: 'rgba(77,217,192,.22)' },
]
const otherPostitColor = (name) =>
  OTHER_POSTIT_COLORS[(name || '').charCodeAt(0) % OTHER_POSTIT_COLORS.length]

function PostCard({ post, myName, code, onLike, onComment, onSelectRequest, onDelete, maxLikes = 0 }) {
  const [showCmt, setShowCmt] = useState(false)
  const [cmtText, setCmtText] = useState('')
  const cmtRef = useRef(null)

  const isMyPost   = post.name === myName
  const isLiked    = post.likedBy?.includes(myName)
  const isCrown    = post.likes >= maxLikes && post.likes > 0
  const isSelected = !!post.selected

  const color = isSelected
    ? { bg: '#EDFAF2', border: '#5BBF7A', shadow: 'rgba(91,191,122,.30)' }
    : isMyPost
      ? MY_POSTIT
      : otherPostitColor(post.name)

  useEffect(() => {
    if (showCmt && cmtRef.current) {
      setTimeout(() => {
        cmtRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        cmtRef.current?.querySelector('input')?.focus()
      }, 60)
    }
  }, [showCmt])

  async function toggleLike() { await onLike(post.id, !isLiked) }
  async function submitCmt() {
    if (!cmtText.trim()) return
    await onComment(post.id, cmtText.trim())
    setCmtText(''); setShowCmt(false)
  }

  return (
    <div className="slide-in postcard-wrap" style={{
      position: 'relative',
      background: color.bg,
      border: `2px solid ${color.border}`,
      borderRadius: 16,
      margin: '0 10px 14px',
      boxShadow: `0 3px 12px ${color.shadow}`,
      overflow: 'visible',
    }}>
      {/* ── 내 포스트에만 X 삭제 버튼 (hover) ── */}
      {isMyPost && !isSelected && (
        <button
          className="postcard-close"
          onClick={() => onDelete && onDelete(post.id)}
          title="삭제"
          style={{
            position: 'absolute', top: -9, right: -9, zIndex: 10,
            width: 22, height: 22, borderRadius: '50%',
            background: '#EF4444', color: '#fff',
            border: '2px solid #fff', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(239,68,68,.45)',
            fontFamily: 'inherit', lineHeight: 1,
          }}>✕</button>
      )}

      {/* 내 포스트 라벨 */}
      {isMyPost && (
        <div style={{
          position: 'absolute', top: -9, left: 12, zIndex: 10,
          padding: '2px 8px', borderRadius: 999,
          background: '#F59E0B', color: '#fff',
          fontSize: 10, fontWeight: 800, letterSpacing: 0.3,
          boxShadow: '0 1px 4px rgba(245,158,11,.4)',
        }}>내 글</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px 6px' }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%', flexShrink: 0, padding: 2,
          background: isSelected ? IG_GRAD : isCrown ? 'linear-gradient(45deg,#F59E0B,#F97316)' : color.border,
        }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', padding: 1.5, background: '#fff' }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: avBg(post.name), color: avFg(post.name),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>{(post.name || '?')[0]}</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#3D2B1F' }}>{post.name}</span>
            {isCrown && <span title="좋아요 1위!">👑</span>}
            {isSelected && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: '#5BBF7A', color: '#fff' }}>✅ 선정됨</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#C4B4A8' }}>{post.time}</div>
        </div>

        {/* 선정 버튼 — 투표 요청 방식 */}
        {onSelectRequest && !isSelected && (
          <button onClick={() => onSelectRequest(post)} style={{
            fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8,
            border: '1.5px solid #10B981', background: '#fff', color: '#5BBF7A',
            cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#5BBF7A'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff';    e.currentTarget.style.color = '#5BBF7A' }}
          >선정</button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 12px 8px', fontSize: 13, lineHeight: 1.75, color: '#3D2B1F', whiteSpace: 'pre-line' }}>
        {post.content}
      </div>

      {/* Comments */}
      {post.comments?.map((c, i) => (
        <div key={i} style={{
          fontSize: 12, color: '#8C7B6E', padding: '3px 12px 3px 16px',
          borderLeft: `2px solid ${color.border}`, margin: '2px 12px', lineHeight: 1.6,
        }}>{c}</div>
      ))}

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px 9px' }}>
        <button onClick={toggleLike} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1,
          color: isLiked ? '#FF6B7A' : '#C4B4A8', transition: 'transform .15s', padding: '2px 4px',
        }}>{isLiked ? '❤️' : '🤍'}</button>
        <button onClick={() => setShowCmt(!showCmt)} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1,
          color: '#C4B4A8', padding: '2px 4px',
        }}>💬</button>
        {(post.likes > 0 || post.comments?.length > 0) && (
          <span style={{ fontSize: 11, color: '#C4B4A8' }}>
            {post.likes > 0 && <><b style={{ color: '#8C7B6E' }}>♥ {post.likes}</b>{' '}</>}
            {post.comments?.length > 0 && `댓글 ${post.comments.length}`}
          </span>
        )}
        {/* 작성자 이름 — 우측 */}
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#C4B4A8', fontWeight: 600 }}>
          ✍️ {post.name}
        </div>
      </div>

      {/* Comment input */}
      {showCmt && (
        <div ref={cmtRef} style={{ padding: '0 12px 12px', display: 'flex', gap: 7 }} className="fade-up">
          <input
            value={cmtText}
            onChange={e => setCmtText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitCmt()}
            placeholder="댓글 달기..."
            style={{
              flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: 999,
              border: `1px solid ${color.border}`, fontSize: 13,
              background: '#fff', outline: 'none',
            }}
          />
          <button onClick={submitCmt} style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            background: '#4EACD9', border: 'none', borderRadius: 8,
            cursor: 'pointer', padding: '8px 14px', fontFamily: 'inherit',
          }}>게시</button>
        </div>
      )}
    </div>
  )
}

// ─── Feed Panel ──────────────────────────────────────────────────────────

function FeedPanel({ posts, myName, code, onLike, onComment, onSelectRequest, onDelete }) {
  const maxLikes = Math.max(...posts.map(p => p.likes || 0), 0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background:'#FFF9F2' }}>
      <div style={{ padding: '12px 14px 11px',
        borderBottom: '2.5px solid #E6D8C8',
        background:'#fff',
        fontSize: 13, fontWeight: 800, color: '#3D2B1F', flexShrink: 0,
        display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ fontSize:16 }}>📌</span> 모둠원 공유 피드
        {posts.length > 0 && (
          <span style={{
            marginLeft:'auto', fontSize:11, fontWeight:800,
            background:'#FFF3E8', color:'#D4601A',
            padding:'2px 8px', borderRadius:999, border:'1.5px solid #FFCB96',
          }}>{posts.length}</span>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 14 }}>
        {posts.length === 0
          ? <div style={{ textAlign: 'center', padding: '32px 14px', color: '#C4B4A8', fontSize: 13, lineHeight: 2 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🌱</div>
              아직 공유된 내용이 없어요<br />
              <span style={{ fontWeight:800, color:'#FF8C42' }}>공유하기</span>를 눌러보세요!
            </div>
          : posts.map(p => (
            <PostCard key={p.id} post={p} myName={myName} code={code}
              onLike={onLike} onComment={onComment}
              onSelectRequest={onSelectRequest}
              onDelete={onDelete}
              maxLikes={maxLikes} />
          ))
        }
      </div>
    </div>
  )
}

// ─── Online Users ─────────────────────────────────────────────────────────

function OnlineUsers({ users }) {
  if (!users.length) return null
  const vis = users.slice(0, 4), extra = users.length - 4
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex' }}>
        {vis.map((u, i) => (
          <div key={i} title={u.name} style={{ marginLeft: i ? -7 : 0, zIndex: 10 - i, position: 'relative' }}>
            <Avatar name={u.name} size={24} />
          </div>
        ))}
        {extra > 0 && (
          <div style={{ marginLeft: -7, width: 24, height: 24, borderRadius: '50%',
            background: '#F2EAE0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#8C7B6E', border: '1.5px solid #fff' }}>+{extra}</div>
        )}
      </div>
      <span style={{ fontSize: 11, color: '#8C7B6E' }}>{users.length}명</span>
    </div>
  )
}

// ─── STEP 1 ───────────────────────────────────────────────────────────────

function Step1({ user, code, posts, selectedPost, onToast }) {
  const [form,      setForm]      = useState({ topic: '', question: '', items: [] })
  const [itemInput, setItemInput] = useState('')
  const [sharing,   setSharing]   = useState(false)
  const [dragIdx,   setDragIdx]   = useState(null)
  const [shareErr,  setShareErr]  = useState('')

  function addItem(e) {
    if (e.key !== 'Enter' || !itemInput.trim()) return
    e.preventDefault()
    if (form.items.length >= 8) return
    setForm(f => ({ ...f, items: [...f.items, itemInput.trim()] }))
    setItemInput('')
  }
  function removeItem(i) { setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })) }

  function onDragStart(i) { setDragIdx(i) }
  function onDragEnter(i) {
    if (dragIdx === null || dragIdx === i) return
    const next = [...form.items]
    const [moved] = next.splice(dragIdx, 1); next.splice(i, 0, moved)
    setForm(f => ({ ...f, items: next })); setDragIdx(i)
  }

  async function doShare() {
    if (!form.topic.trim() || !form.question.trim() || !form.items.length) return
    setSharing(true)
    setShareErr('')
    try {
      const content = `📌 주제: ${form.topic}\n🔍 질문: ${form.question}\n📋 항목: ${form.items.join(', ')}`
      await addStep1Post(code, {
        name: user.name, step: 1, content,
        topic: form.topic, question: form.question, items: form.items, time: tsNow(),
      })
      // 공유 성공 후 폼 초기화
      setForm({ topic: '', question: '', items: [] })
      setItemInput('')
      onToast && onToast('🚀 모둠원에게 공유되었어요!')
    } catch (err) {
      console.error('공유 실패:', err)
      setShareErr('공유에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSharing(false)
    }
  }

  const ready = form.topic.trim() && form.question.trim() && form.items.length > 0

  return (
    <div>
      {/* ── 우리 모둠의 탐구 문제 (강조) ── */}
      {selectedPost && (
        <div className="selected-glow" style={{
          background: 'linear-gradient(135deg, #EDFAF2, #D4F5E0)',
          border: '2.5px solid #90DDB0',
          borderRadius: 20,
          padding: '18px 22px',
          marginBottom: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:-15, right:-15, width:70, height:70,
            borderRadius:'50%', background:'rgba(91,191,122,.10)', pointerEvents:'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,#5BBF7A,#2D9950)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 15, flexShrink: 0,
              boxShadow: '0 3px 10px rgba(91,191,122,.35)',
            }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#2D9950', letterSpacing: '-0.2px' }}>
              ⭐ 우리 모둠의 탐구 문제
            </div>
            <div style={{ marginLeft:'auto', fontSize:11, fontWeight:800,
              background:'#fff', color:'#2D9950', padding:'3px 10px',
              borderRadius:999, border:'1.5px solid #90DDB0' }}>만장일치 선정!</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#3D2B1F', lineHeight: 1.45 }}>
            {selectedPost.topic}
          </div>
          <div style={{ fontSize: 13, color: '#2D9950', marginTop: 8, lineHeight: 1.65, fontWeight: 700 }}>
            📌 {selectedPost.question}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {selectedPost.items?.map((item, i) => (
              <Tag key={i} color={CHART_COLORS[i % CHART_COLORS.length]}>{item}</Tag>
            ))}
          </div>
        </div>
      )}

      {/* ── 탐구 문제 작성 폼 ── */}
      <Sec>
        <Lbl mt={0}>📌 조사 주제
          <span style={{ fontSize: 12, fontWeight: 400, color: '#8C7B6E', marginLeft: 6 }}>
            공유 버튼을 눌러야 친구들에게 보여요
          </span>
        </Lbl>
        <Inp value={form.topic} onChange={v => { setForm(f => ({ ...f, topic: v })); setShareErr('') }}
          placeholder="예: 우리 반 학생들이 좋아하는 간식의 종류" />

        <Lbl>🔍 조사 질문</Lbl>
        <Inp value={form.question} onChange={v => { setForm(f => ({ ...f, question: v })); setShareErr('') }}
          placeholder="예: 가장 자주 먹는 간식은 무엇인가요?" />

        <Lbl>📋 조사 항목
          <span style={{ fontSize: 12, fontWeight: 400, color: '#8C7B6E', marginLeft: 6 }}>
            Enter로 추가 · 최대 8개
          </span>
        </Lbl>
        <Inp value={itemInput} onChange={setItemInput} onKeyDown={addItem}
          placeholder="항목 입력 후 Enter — 예: 과자" />

        {form.items.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {form.items.map((item, i) => (
              <div key={i} draggable
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragEnd={() => setDragIdx(null)}
                onDragOver={e => e.preventDefault()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 999,
                  background: CHART_COLORS[i % CHART_COLORS.length] + '12',
                  color: CHART_COLORS[i % CHART_COLORS.length],
                  border: `1.5px solid ${CHART_COLORS[i % CHART_COLORS.length]}35`,
                  fontSize: 13, fontWeight: 700, cursor: 'grab',
                  opacity: dragIdx === i ? .5 : 1, userSelect: 'none',
                }}>
                {item}
                <button onClick={() => removeItem(i)} style={{
                  fontSize: 16, color: 'inherit', background: 'none',
                  border: 'none', cursor: 'pointer', lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {shareErr && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEF2F2',
            border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>
            ⚠️ {shareErr}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Btn onClick={doShare} disabled={!ready || sharing} color="dark" pill>
            {sharing ? '공유 중...' : '🚀 모둠원에게 공유하기'}
          </Btn>
        </div>
      </Sec>
    </div>
  )
}

// ─── STEP 2 ───────────────────────────────────────────────────────────────

function Step2({ user, code, selectedPost, dataTable, onChange, surveyActive, survey, surveyResponses }) {
  const [tab,         setTab]         = useState('create')
  const [lookupCode,  setLookupCode]  = useState('')
  const [surveyModal, setSurveyModal] = useState(null)
  const prevPostIdRef = useRef(null)

  const items = selectedPost?.items || []
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)

  // When selected topic changes (postId changes), reset data table to match new items
  useEffect(() => {
    if (!selectedPost?.postId) return
    if (prevPostIdRef.current && prevPostIdRef.current !== selectedPost.postId) {
      // Topic changed → reset table with new items
      onChange(selectedPost.items.map(label => ({ label, value: '' })))
    }
    prevPostIdRef.current = selectedPost.postId
  }, [selectedPost?.postId]) // eslint-disable-line

  // Auto-populate from survey responses
  useEffect(() => {
    if (!surveyResponses?.length || !items.length) return
    const counts = {}
    items.forEach(item => { counts[item] = 0 })
    surveyResponses.forEach(r => { if (counts[r.selectedItem] !== undefined) counts[r.selectedItem]++ })
    const next = items.map(label => ({ label, value: String(counts[label] || 0) }))
    onChange(next)
  }, [surveyResponses]) // eslint-disable-line

  async function doCreateSurvey() {
    if (!selectedPost) return alert('Step 1에서 탐구 문제를 먼저 선정해 주세요')
    await createSurvey(code, {
      groupName: user.groupName, topic: selectedPost.topic,
      question: selectedPost.question, items: selectedPost.items, roomCode: code,
    })
    setTab('results')
  }

  async function doLookupSurvey() {
    const c = lookupCode.trim().toUpperCase()
    if (!c) return
    const sv = await getSurvey(c)
    if (sv) { setSurveyModal({ ...sv, code: c }); setLookupCode('') }
    else alert(`"${c}" 코드의 설문조사를 찾을 수 없어요`)
  }

  function updateValue(i, v) {
    onChange(items.map((label, idx) => ({ label, value: idx === i ? v : (dataTable[idx]?.value || '') })))
  }

  const TABS = [
    { id: 'create',  label: '📨 설문 만들기' },
    { id: 'results', label: '📊 응답 확인' },
    { id: 'join',    label: '🙋 다른 모둠 참여' },
  ]

  return (
    <div>
      {/* IG-style tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #dbdbdb' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px', fontSize: 14, fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? '#3D2B1F' : '#8C7B6E',
            borderBottom: `2px solid ${tab === t.id ? '#3D2B1F' : 'transparent'}`,
            marginBottom: -1, background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t.id ? '#3D2B1F' : 'transparent'}`,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'create' && (
        <div>
          {selectedPost ? (
            <Sec style={{ background: '#FFF7ED', border: '1.5px solid #F97316' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#C2410C', marginBottom: 8 }}>
                ✅ 선정된 탐구 문제
              </div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{selectedPost.topic}</div>
              <div style={{ fontSize: 13, color: '#8C7B6E', marginTop: 5, marginBottom: 11, lineHeight: 1.6 }}>
                📌 {selectedPost.question}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedPost.items?.map((item, i) => (
                  <Tag key={i} color={CHART_COLORS[i % CHART_COLORS.length]}>{item}</Tag>
                ))}
              </div>
            </Sec>
          ) : (
            <Sec style={{ background: '#FFFBEB', border: '1px dashed #F59E0B' }}>
              <div style={{ fontSize: 14, color: '#B45309', fontWeight: 700 }}>
                ⚠️ Step 1에서 탐구 문제를 먼저 선정해 주세요
              </div>
            </Sec>
          )}

          {!surveyActive ? (
            <Sec>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>📨 설문조사 시작하기</div>
              <div style={{ fontSize: 14, color: '#8C7B6E', marginBottom: 14, lineHeight: 1.75 }}>
                선정된 탐구 문제로 설문조사를 만들어요.<br />
                모둠 코드 <b style={{ color: '#4EACD9', letterSpacing: 1 }}>{code}</b>를 친구들에게 알려 주세요!
              </div>
              <Btn onClick={doCreateSurvey} color="blue" disabled={!selectedPost}>
                📨 설문조사 생성하기
              </Btn>
            </Sec>
          ) : (
            <Sec style={{ background: '#EBF7FF', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28 }}>📋</div>
                <div>
                  <div style={{ fontSize: 14, color: '#4EACD9', fontWeight: 700 }}>설문조사 진행 중!</div>
                  <div style={{ fontSize: 13, marginTop: 3 }}>
                    코드 <b style={{ color: '#F97316', fontSize: 16, letterSpacing: 2 }}>{code}</b>를 친구들에게 알려 주세요
                  </div>
                </div>
              </div>
              {surveyResponses.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#4EACD9' }}>
                  {surveyResponses.length}명 참여 완료 →{' '}
                  <button onClick={() => setTab('results')} style={{
                    color: '#4EACD9', textDecoration: 'underline', background: 'none',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                  }}>응답 확인하기</button>
                </div>
              )}
            </Sec>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div>
          {items.length === 0 ? (
            <Sec>
              <div style={{ textAlign: 'center', padding: 24, color: '#8C7B6E', fontSize: 14 }}>
                💡 Step 1에서 탐구 문제를 선정하면 여기에 항목이 나타나요
              </div>
            </Sec>
          ) : (
            <>
              <div style={{ marginBottom: 12, padding: '9px 14px', background: '#FFF7ED',
                borderRadius: 8, border: '1px solid #FED7AA', fontSize: 13, color: '#C2410C', fontWeight: 600, lineHeight: 1.6 }}>
                📌 {selectedPost?.topic} — {selectedPost?.question}
              </div>

              {surveyActive && surveyResponses.length > 0 && (
                <Sec style={{ background: '#EBF7FF', border: '1px solid #BFDBFE', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#4EACD9', marginBottom: 10 }}>
                    📊 실시간 응답 ({surveyResponses.length}명)
                  </div>
                  {items.map(item => {
                    const cnt = surveyResponses.filter(r => r.selectedItem === item).length
                    const pct = surveyResponses.length ? Math.round(cnt / surveyResponses.length * 100) : 0
                    return (
                      <div key={item} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                          <span>{item}</span>
                          <span style={{ fontWeight: 700, color: '#4EACD9' }}>{cnt}명 ({pct}%)</span>
                        </div>
                        <div style={{ height: 10, borderRadius: 999, background: '#93D1F5', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#4EACD9',
                            borderRadius: 999, transition: 'width .5s' }} />
                        </div>
                      </div>
                    )
                  })}
                </Sec>
              )}

              <Sec>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📥 항목별 조사 결과</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        background: CHART_COLORS[i % CHART_COLORS.length] + '18',
                        color: CHART_COLORS[i % CHART_COLORS.length],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700 }}>{i + 1}</div>
                      <span style={{ flex: 1, fontSize: 14 }}>{item}</span>
                      <input type="number" min="0" max="999"
                        value={dataTable[i]?.value || ''}
                        onChange={e => updateValue(i, e.target.value)}
                        placeholder="0"
                        style={{ width: 76, padding: '8px 10px', borderRadius: 8,
                          border: '1.5px solid #dbdbdb', fontSize: 17, fontWeight: 700,
                          textAlign: 'center', fontFamily: 'inherit', outline: 'none',
                          background: '#fafafa' }} />
                      <span style={{ fontSize: 14, color: '#8C7B6E', width: 22 }}>명</span>
                    </div>
                  ))}
                </div>

                {total > 0 && (
                  <div style={{ marginTop: 14, padding: '11px 14px', background: '#EDFAF2',
                    borderRadius: 10, border: '1px solid #A7F3D0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #A7F3D0' }}>
                          {['항목', '명수', '백분율(%)'].map(h => (
                            <th key={h} style={{ padding: '6px 8px', textAlign: h === '항목' ? 'left' : 'right',
                              color: '#2D9950', fontWeight: 700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const v = Number(dataTable[i]?.value) || 0
                          const pct = total ? Math.round(v / total * 100) : 0
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid #D1FAE5' }}>
                              <td style={{ padding: '6px 8px' }}>{item}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{v}</td>
                              <td style={{ padding: '6px 8px', textAlign: 'right', color: '#5BBF7A', fontWeight: 700 }}>{pct}%</td>
                            </tr>
                          )
                        })}
                        <tr>
                          <td style={{ padding: '7px 8px', fontWeight: 700 }}>합계</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>{total}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#5BBF7A' }}>100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </Sec>
            </>
          )}
        </div>
      )}

      {tab === 'join' && (
        <Sec>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 9 }}>🙋 다른 모둠 설문 참여하기</div>
          <div style={{ fontSize: 14, color: '#8C7B6E', marginBottom: 14, lineHeight: 1.75 }}>
            다른 모둠에서 공유한 <b style={{ color: '#3D2B1F' }}>6자리 코드</b>를 입력하면 해당 설문에 참여할 수 있어요.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={lookupCode} onChange={e => setLookupCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && doLookupSurvey()}
              maxLength={6} placeholder="ABC123"
              style={{ flex: 1, padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #dbdbdb', fontSize: 20, fontWeight: 700,
                letterSpacing: 5, textTransform: 'uppercase', fontFamily: 'inherit',
                textAlign: 'center', outline: 'none', background: '#fafafa' }} />
            <Btn onClick={doLookupSurvey} color="blue" style={{ padding: '12px 22px' }}>참여하기</Btn>
          </div>
          <div style={{ fontSize: 13, color: '#8C7B6E', marginTop: 10 }}>
            💡 설문 코드는 다른 모둠의 참여 코드와 동일해요
          </div>
        </Sec>
      )}

      {surveyModal && (
        <SurveyModal survey={surveyModal} userName={user.name}
          surveyCode={surveyModal.code} onClose={() => setSurveyModal(null)} />
      )}
    </div>
  )
}

// ─── STEP 3 ───────────────────────────────────────────────────────────────

function Step3({ user, code, items, dataTable, chartConfig, onChartConfig, strokes, currentDrawer, drawMode, onDrawMode, livePreview }) {
  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || BarChart
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)

  const CHART_TYPES = [
    { type: 'bar',   label: '막대그래프', emoji: '📊' },
    { type: 'pie',   label: '원그래프',   emoji: '🥧' },
    { type: 'strip', label: '띠그래프',   emoji: '🎨' },
  ]

  return (
    <div>
      {total > 0 && (
        <Sec style={{ background: '#EDFAF2', border: '1px solid #A7F3D0', padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#2D9950', marginBottom: 9 }}>
            📊 2단계 항목별 조사 결과
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #A7F3D0' }}>
                {['항목', '명수', '백분율(%)'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: h === '항목' ? 'left' : 'right',
                    color: '#2D9950', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const v = Number(dataTable[i]?.value) || 0
                const pct = total ? Math.round(v / total * 100) : 0
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #D1FAE5' }}>
                    <td style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 9, height: 9, borderRadius: '50%',
                        background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                      {item}
                    </td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700 }}>{v}</td>
                    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#5BBF7A', fontWeight: 700 }}>{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Sec>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {[['auto','📊 자동 그래프','#5BBF7A'], ['draw','✏️ 직접 그리기','#C97DE8']].map(([mode, label, clr]) => (
          <button key={mode} type="button" onClick={() => onDrawMode(mode)} style={{
            padding: '9px 20px', minHeight: 42, borderRadius: 999, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all .15s',
            background: drawMode === mode ? clr : '#ffffff',
            color: drawMode === mode ? '#fff' : '#8C7B6E',
            borderColor: drawMode === mode ? clr : '#E6D8C8',
          }}>{label}</button>
        ))}
      </div>

      {drawMode === 'auto' ? (
        <Sec>
          <Lbl mt={0}>📊 그래프 종류</Lbl>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            {CHART_TYPES.map(c => (
              <button type="button" key={c.type} onClick={() => onChartConfig({ type: c.type })} style={{
                padding: '8px 18px', minHeight: 40, borderRadius: 999, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', border: '1.5px solid', fontFamily: 'inherit', transition: 'all .15s',
                background: chartConfig.type === c.type ? '#5BBF7A' : '#fff',
                color: chartConfig.type === c.type ? '#fff' : '#8C7B6E',
                borderColor: chartConfig.type === c.type ? '#5BBF7A' : '#E6D8C8',
              }}>{c.emoji} {c.label}</button>
            ))}
          </div>
          <Lbl>✏️ 그래프 제목</Lbl>
          <Inp value={chartConfig.title} onChange={v => onChartConfig({ title: v })}
            placeholder="예: 우리 반 좋아하는 간식 조사 결과" style={{ marginBottom: 14 }} />
          {chartConfig.title && (
            <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 12, color: '#3D2B1F' }}>
              {chartConfig.title}
            </div>
          )}
          <ChartComp data={chartData} />
        </Sec>
      ) : (
        <Sec>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            ✏️ 모둠 공동 그리기
            <span style={{ fontSize: 13, fontWeight: 400, color: '#8C7B6E', marginLeft: 8 }}>
              모눈종이 위에 모두가 함께 그릴 수 있어요
            </span>
          </div>
          <DrawingCanvas code={code} userName={user.name} strokes={strokes} currentDrawer={currentDrawer} livePreview={livePreview} />
        </Sec>
      )}
    </div>
  )
}

// ─── STEP 4 ───────────────────────────────────────────────────────────────

function Step4({ user, code, items, dataTable, chartConfig, step4State, onStep4State }) {
  const [loadedImg,  setLoadedImg]  = useState(null)
  const [loadingImg, setLoadingImg] = useState(false)

  const notes  = step4State?.notes  || []
  const checks = step4State?.checks || {}
  const ps     = step4State?.ps     || ''
  const [noteInput, setNoteInput] = useState('')

  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || BarChart
  const hasData   = dataTable.some(d => Number(d.value) > 0)

  async function doLoadCanvas() {
    setLoadingImg(true)
    const img = await loadCanvasSnapshot(code)
    if (img) setLoadedImg(img)
    else alert('저장된 그림이 없어요. Step 3에서 직접 그리기 후 저장해 주세요.')
    setLoadingImg(false)
  }

  function addNote() {
    if (!noteInput.trim()) return
    const next = [...notes, { id: Date.now(), text: noteInput.trim() }]
    onStep4State({ notes: next })
    setNoteInput('')
  }

  const [sharing, setSharing] = useState(false)
  async function doShare() {
    setSharing(true)
    const content = `💡 탐구 결과!\n주제: ${notes.map(n => n.text).join(' · ')}\n성찰: ${Object.values(checks).filter(Boolean).length}/${CHECKLIST.length}개 달성`
    await addStep4Post(code, { name: user.name, step: 4, content, time: tsNow() })
    setSharing(false)
  }

  return (
    <div>
      <Sec>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
          {chartConfig.title || '완성된 그래프'}
        </div>
        {hasData ? <ChartComp data={chartData} /> : (
          <div style={{ textAlign: 'center', padding: '14px 0', color: '#8C7B6E', fontSize: 14 }}>
            2단계에서 데이터를 입력하면 그래프가 나타나요
          </div>
        )}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #efefef',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#8C7B6E' }}>✏️ Step 3 직접 그린 그래프</span>
          <Btn onClick={doLoadCanvas} color="gray" sm disabled={loadingImg}>
            {loadingImg ? '불러오는 중...' : '📂 불러오기'}
          </Btn>
        </div>
        {loadedImg && (
          <div style={{ marginTop: 10 }}>
            <img src={loadedImg} alt="직접 그린 그래프"
              style={{ width: '100%', borderRadius: 8, border: '1px solid #dbdbdb' }} />
          </div>
        )}
      </Sec>

      <Sec>
        <Lbl mt={0}>🗒️ 그래프에서 알 수 있는 사실</Lbl>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Inp value={noteInput} onChange={setNoteInput}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder="예: 과자를 좋아하는 학생이 가장 많다" />
          </div>
          <button onClick={addNote} className="edu-btn" style={{
            flexShrink: 0, whiteSpace: 'nowrap',
            padding: '0 18px', borderRadius: 14, fontSize: 14, fontWeight: 800,
            background: '#3D2B1F', color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(61,43,31,.25)',
            height: 46,
          }}>추가</button>
        </div>
        {notes.length > 0
          ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {notes.map((n, i) => (
              <div key={n.id} style={{ padding: '9px 14px', maxWidth: 210,
                background: CHART_COLORS[i % CHART_COLORS.length] + '12',
                border: `1.5px solid ${CHART_COLORS[i % CHART_COLORS.length]}30`,
                borderRadius: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.6,
                animation: 'fadeUp .3s ease' }}>{n.text}</div>
            ))}
          </div>
          : <div style={{ fontSize: 14, color: '#8C7B6E', textAlign: 'center', padding: 16 }}>
            그래프를 보고 알 수 있는 것을 적어 보세요
          </div>
        }
      </Sec>

      <Sec>
        <Lbl mt={0}>✏️ 문제 해결 과정</Lbl>
        <Inp value={ps} onChange={v => onStep4State({ ps: v })} multi rows={4}
          placeholder="그래프를 이용하여 문제를 해결한 과정을 써 보세요..." />
      </Sec>

      <Sec>
        <Lbl mt={0}>✅ 성찰 체크리스트</Lbl>
        {CHECKLIST.map((item, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10,
            marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!checks[i]}
              onChange={e => onStep4State({ checks: { ...checks, [i]: e.target.checked } })}
              style={{ marginTop: 3, accentColor: '#5BBF7A', width: 18, height: 18, flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: checks[i] ? '#2D9950' : '#8C7B6E',
              fontWeight: checks[i] ? 700 : 400, lineHeight: 1.6, transition: 'all .15s' }}>
              {item}
            </span>
          </label>
        ))}
        <div style={{ fontSize: 13, color: '#8C7B6E', marginTop: 4 }}>
          {Object.values(checks).filter(Boolean).length}/{CHECKLIST.length}개 완료
        </div>
      </Sec>

      <Btn onClick={doShare} color="blue" full disabled={sharing} pill style={{ marginBottom: 8 }}>
        {sharing ? '공유 중...' : '📤 최종 탐구 결과 공유하기'}
      </Btn>
    </div>
  )
}

// ─── Main ActivityPage ────────────────────────────────────────────────────

export default function ActivityPage() {
  const router = useRouter()

  const [user,        setUser]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [room,        setRoom]        = useState({})
  const [step1Posts,  setStep1Posts]  = useState([])
  const [step4Posts,  setStep4Posts]  = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [survey,      setSurvey]      = useState(null)
  const [surveyResp,  setSurveyResp]  = useState([])
  const [strokes,     setStrokes]     = useState([])
  const [activeStep,  setActiveStep]  = useState(1)
  const [freeMode,    setFreeMode]    = useState(false)
  const [toast,       setToast]       = useState(null)
  const [voteModal,   setVoteModal]   = useState(false)   // shows vote popup for this user

  const freeModeRef  = useRef(false); freeModeRef.current = freeMode
  const iAmLeaderRef = useRef(false)
  const userRef      = useRef(null)
  const presenceT    = useRef(null)
  const remoteStep   = useRef(1)
  const mainRef      = useRef(null)

  const dbTable  = useDb((code, val) => updateDataTable(code, val), 700)
  const dbChart  = useDb((code, val) => updateChartConfig(code, val), 700)
  const dbMeta   = useDb((code, val) => updateRoomMeta(code, val), 500)

  // ── Scroll sync listener ──────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    let debT = null
    const handler = () => {
      if (!iAmLeaderRef.current) return
      clearTimeout(debT)
      debT = setTimeout(() => {
        updateRoomMeta(userRef.current.code, { syncScrollTop: el.scrollTop })
      }, 120)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => { el.removeEventListener('scroll', handler); clearTimeout(debT) }
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem('gts_user')
    if (!stored) { router.push('/'); return }
    const u = JSON.parse(stored)
    setUser(u); userRef.current = u
    localStorage.setItem('gts_last', JSON.stringify({ name: u.name, groupName: u.groupName, code: u.code }))

    let unsubs = []

    async function init() {
      try {
        await getOrCreateRoom(u.code, u.groupName)
        await updatePresence(u.code, u.name)
        presenceT.current = setInterval(() => updatePresence(u.code, u.name), 30_000)

        unsubs.push(subscribeRoom(u.code, roomData => {
          setRoom(roomData)
          remoteStep.current = roomData.currentStep || 1
          if (!freeModeRef.current && roomData.syncLeader) {
            setActiveStep(roomData.currentStep || 1)
            // Apply scroll sync
            if (mainRef.current && roomData.syncScrollTop !== undefined) {
              mainRef.current.scrollTop = roomData.syncScrollTop
            }
          }
        }))
        unsubs.push(subscribeStep1Posts(u.code, setStep1Posts))
        unsubs.push(subscribeStep4Posts(u.code, setStep4Posts))
        unsubs.push(subscribePresence(u.code, setOnlineUsers))
        unsubs.push(subscribeSurvey(u.code, setSurvey))
        unsubs.push(subscribeSurveyResponses(u.code, setSurveyResp))
        unsubs.push(subscribeStrokes(u.code, setStrokes))

        setLoading(false)
      } catch (err) {
        console.error(err)
        setLoading(false)
        setToast('⚠️ Firebase 연결 실패 — .env.local 파일을 확인해 주세요')
      }
    }

    init()
    return () => {
      unsubs.forEach(fn => fn())
      clearInterval(presenceT.current)
      removePresence(u.code, u.name).catch(() => {})
    }
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!freeMode && room.syncLeader) setActiveStep(remoteStep.current)
  }, [freeMode]) // eslint-disable-line

  async function changeStep(n) {
    setActiveStep(n)
    if (room.syncLeader === userRef.current?.name) {
      await updateRoomStep(userRef.current.code, n)
    }
    // Reset scroll on step change
    if (mainRef.current) mainRef.current.scrollTop = 0
    if (room.syncLeader === userRef.current?.name) {
      await updateRoomMeta(userRef.current.code, { syncScrollTop: 0 })
    }
  }

  async function takeSyncLead() {
    await setSyncLeader(userRef.current?.code, userRef.current?.name, activeStep)
    setToast('🔗 화면 동기화를 시작했어요!')
  }
  async function releaseSyncLead() {
    await clearSyncLeader(userRef.current?.code)
  }

  function handleDataTable(next) {
    setRoom(r => ({ ...r, dataTable: next }))
    dbTable(userRef.current?.code, next)
  }
  function handleChartConfig(changes) {
    const next = { ...room.chartConfig, ...changes }
    setRoom(r => ({ ...r, chartConfig: next }))
    dbChart(userRef.current?.code, next)
  }
  function handleDrawMode(mode) {
    setRoom(r => ({ ...r, drawMode: mode }))
    dbMeta(userRef.current?.code, { drawMode: mode })
  }
  function handleStep4State(changes) {
    const cur = room.step4State || {}
    const next = { ...cur, ...changes }
    setRoom(r => ({ ...r, step4State: next }))
    dbMeta(userRef.current?.code, { step4State: next })
  }

  async function handleLike1(postId, nowLiking) {
    await toggleLike1(userRef.current?.code, postId, user?.name, nowLiking)
  }
  async function handleComment1(postId, text) {
    await addComment1(userRef.current?.code, postId, text)
  }
  async function handleDelete1(postId) {
    try {
      await deleteStep1Post(userRef.current?.code, postId)
      setToast('🗑️ 삭제되었어요')
    } catch { setToast('⚠️ 삭제에 실패했어요') }
  }

  // 선정 요청 → 모둠원 전체 투표 시작
  async function handleSelectRequest(post) {
    const voters = onlineUsers.map(u => u.name)
    // 현재 사용자가 onlineUsers에 없을 경우 포함
    if (!voters.includes(user.name)) voters.push(user.name)
    const voteData = {
      postId:      post.id,
      postData:    { content: post.content, topic: post.topic, question: post.question, items: post.items },
      requestedBy: user.name,
      voters,
      agreed:      [user.name],   // 요청자는 자동 찬성
    }
    await setSelectionVote(userRef.current?.code, voteData)
    setVoteModal(true)
    setToast('🗳️ 모둠원에게 투표를 요청했어요!')
  }

  // 내가 찬성 클릭
  async function handleVote() {
    await agreeSelectionVote(userRef.current?.code, user.name)
  }

  // 투표 취소 (요청자가 재요청 가능하도록)
  async function handleCancelVote() {
    await setSelectionVote(userRef.current?.code, null)
    setVoteModal(false)
    setToast('🔄 투표가 취소되었어요. 다시 선정을 요청해 주세요.')
  }

  // room.selectionVote 변경 감지 → 팝업 / 자동 선정
  useEffect(() => {
    const sv = room.selectionVote
    if (!sv || !user) return

    // 내가 아직 투표 안 했으면 팝업 표시
    if (!sv.agreed?.includes(user.name)) {
      setVoteModal(true)
    }

    // 전원 찬성 → 자동 선정 처리
    // 연산자 우선순위 버그 수정: 조건을 명확하게 괄호로 묶음
    const allAgreed = sv.voters?.length > 0 && sv.agreed?.length >= sv.voters?.length
    const notYetSelected = !room.selectedPost?.postId || room.selectedPost?.postId !== sv.postId
    if (allAgreed && notYetSelected) {
      const post = sv.postData
      if (!post) return
      const finalize = async () => {
        await setSelectedPost(userRef.current?.code, {
          postId: sv.postId, name: sv.requestedBy,
          topic: post.topic, question: post.question, items: post.items, content: post.content,
        })
        if (room.surveyActive) {
          await updateSurveyTopic(userRef.current?.code, post.topic, post.question, post.items)
        }
        await setSelectionVote(userRef.current?.code, null)
        setVoteModal(false)
        setToast('🎉 탐구 문제가 만장일치로 선정되었어요!')
      }
      // 요청자만 최종 처리 (중복 방지) — syncLeader가 없으면 요청자가 처리
      if (sv.requestedBy === user.name) {
        finalize().catch(console.error)
      }
    }
  }, [room.selectionVote]) // eslint-disable-line

  async function handleLike4(postId, nowLiking) {
    await toggleLike4(userRef.current?.code, postId, user?.name, nowLiking)
  }
  async function handleComment4(postId, text) {
    await addComment4(userRef.current?.code, postId, text)
  }
  async function handleDelete4(postId) {
    try {
      await deleteStep4Post(userRef.current?.code, postId)
      setToast('🗑️ 삭제되었어요')
    } catch { setToast('⚠️ 삭제에 실패했어요') }
  }

  if (loading || !user) return (
    <div className="textbook-bg" style={{ width: 1024, height: 768, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 18 }}>
      <div style={{ position:'relative' }}>
        <div className="bounce" style={{ fontSize: 60 }}>📚</div>
        <div style={{ position:'absolute', top:-4, right:-8, width:20, height:20, borderRadius:'50%',
          background:'#FF8C42', animation:'pulse 1s infinite', boxShadow:'0 2px 8px rgba(255,140,66,.4)' }} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: '#3D2B1F', letterSpacing:'-0.3px' }}>연결 중...</div>
      <div style={{ fontSize: 13, color: '#8C7B6E', fontWeight: 700,
        background:'#fff', padding:'8px 20px', borderRadius:999,
        border:'2.5px solid #E6D8C8', boxShadow:'0 3px 10px rgba(140,90,50,.08)' }}>잠시만 기다려 주세요 😊</div>
    </div>
  )

  const step        = STEPS[activeStep - 1]
  const items       = room.selectedPost?.items || []
  const dataTable   = room.dataTable || []
  const chartConfig = room.chartConfig || { type: 'bar', title: '' }
  const drawMode    = room.drawMode || 'auto'
  const step4State  = room.step4State || {}
  const iAmLeader   = room.syncLeader === user.name
  const hasSyncLead = !!room.syncLeader
  iAmLeaderRef.current = iAmLeader

  const done = [null, !!room.selectedPost,
    dataTable.some(d => Number(d.value) > 0),
    (chartConfig.title || strokes.length > 0), true]

  const hasSidepanel = activeStep === 1 || activeStep === 4

  return (
    <div className="textbook-bg" style={{ display: 'flex', flexDirection: 'column', width: 1024, height: 768,
      overflow: 'hidden' }}>

      {/* ── Top Navigation Bar ── */}
      <header style={{
        background: '#fff',
        height: 62, display: 'flex', alignItems: 'center',
        padding: '0 18px', gap: 12, flexShrink: 0,
        borderBottom: '3px solid #E6D8C8',
        boxShadow: '0 3px 12px rgba(140,90,50,.07)',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', padding: 2.5,
            background: EDU_GRAD, flexShrink: 0,
            boxShadow: '0 3px 10px rgba(255,140,66,.30)' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📚</div>
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#3D2B1F', whiteSpace: 'nowrap' }}>
              {user.groupName}
            </div>
            <div style={{ fontSize: 11, color: '#8C7B6E', fontWeight: 700 }}>✏️ {user.name}</div>
          </div>
        </div>

        {/* Center */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <span style={{
            fontSize: 17, fontWeight: 800, letterSpacing: -0.5,
            background: EDU_GRAD,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>📊 자료를 수집하여 그래프로 나타내고 해석해요!</span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <OnlineUsers users={onlineUsers} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px 5px 13px', borderRadius: 999,
            background: '#FFF3E8', border: '2.5px solid #FFCB96',
            boxShadow: '0 2px 8px rgba(255,140,66,.14)',
          }}>
            <span style={{ fontSize: 11, color: '#D4601A', fontWeight: 800 }}>🔑</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#3D2B1F', letterSpacing: 2.5 }}>{user.code}</span>
            <button
              onClick={() => navigator.clipboard.writeText(user.code).then(() => setToast('✅ 코드가 복사되었어요!'))}
              style={{
                marginLeft: 2, padding: '4px 10px', borderRadius: 10,
                background: '#FF8C42', color: '#fff', border: 'none',
                fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(255,140,66,.38)',
                transition: 'all .15s',
              }}>복사</button>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem('gts_user'); router.push('/') }}
            style={{
              padding: '7px 16px', borderRadius: 12,
              background: '#fff', color: '#8C7B6E',
              border: '2.5px solid #E6D8C8', fontSize: 12, fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='#FFF0F1'; e.currentTarget.style.color='#C0364A'; e.currentTarget.style.borderColor='#FFB0B0' }}
            onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.color='#8C7B6E'; e.currentTarget.style.borderColor='#E6D8C8' }}
          >나가기 →</button>
        </div>
      </header>

      {/* ── Sync Strip ── */}
      <div style={{ height: 30, flexShrink: 0, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 8,
        background: hasSyncLead
          ? iAmLeader ? '#EDFAF2' : '#EBF7FF'
          : freeMode ? '#FFF3E8' : '#FFF9F2',
        borderBottom: `2.5px solid ${hasSyncLead ? iAmLeader ? '#90DDB0' : '#93D1F5' : freeMode ? '#FFCB96' : '#E6D8C8'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1,
          fontSize: 11, fontWeight: 800,
          color: hasSyncLead ? iAmLeader ? '#2D9950' : '#2785B5' : freeMode ? '#D4601A' : '#8C7B6E' }}>
          {hasSyncLead && (
            <span style={{ width: 7, height: 7, borderRadius: '50%',
              background: iAmLeader ? '#5BBF7A' : '#4EACD9',
              animation: 'pulse 1.5s infinite', display: 'inline-block', flexShrink: 0 }} />
          )}
          {hasSyncLead
            ? iAmLeader ? '👑 내 화면으로 모둠원이 동기화 중' : `📡 ${room.syncLeader}님 화면과 동기화 중`
            : freeMode  ? '🔓 자유 탐색 모드' : '동기화 없음'
          }
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {freeMode ? (
            <button onClick={() => { setFreeMode(false); setActiveStep(remoteStep.current) }} style={{
              padding: '3px 11px', height: 22, borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: '#FF8C42', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>← 합류</button>
          ) : (
            <button onClick={() => setFreeMode(true)} style={{
              padding: '3px 11px', height: 22, borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: '#fff', color: '#8C7B6E', border: '1.5px solid #E8DFD4',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>자유 탐색</button>
          )}
          {!hasSyncLead ? (
            <button onClick={takeSyncLead} style={{
              padding: '3px 11px', height: 22, borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: '#5BBF7A', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>🔗 화면 동기화</button>
          ) : iAmLeader ? (
            <button onClick={releaseSyncLead} style={{
              padding: '3px 11px', height: 22, borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: '#5BBF7A', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>동기화 해제</button>
          ) : (
            <button disabled style={{
              padding: '3px 11px', height: 22, borderRadius: 999, fontSize: 11, fontWeight: 800,
              background: '#F2EAE0', color: '#8C7B6E', border: 'none', cursor: 'not-allowed', fontFamily: 'inherit',
            }}>동기화 중</button>
          )}
        </div>
      </div>

      {/* ── Step Nav ── */}
      <div style={{ height: 74, flexShrink: 0, background: '#fff',
        borderBottom: '3px solid #E6D8C8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '0 16px',
        boxShadow: '0 3px 10px rgba(140,90,50,.06)',
      }}>
        {STEPS.map((s, idx) => {
          const isActive = activeStep === s.n
          const isDone   = done[s.n] && !isActive
          const stepColors = ['#FF8C42','#4EACD9','#5BBF7A','#C97DE8']
          const sc = stepColors[idx]
          return (
            <button key={s.n} onClick={() => changeStep(s.n)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: isActive ? s.bg : 'none',
              border: isActive ? `2px solid ${s.bd}` : '2px solid transparent',
              borderRadius: 16, cursor: 'pointer',
              padding: '5px 12px 5px 10px',
              transition: 'all .2s cubic-bezier(.34,1.3,.64,1)',
              boxShadow: isActive ? `0 4px 14px ${sc}25` : 'none',
            }}
            onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='#F0E8DC'; e.currentTarget.style.transform='translateY(-2px)' }}}
            onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='none'; e.currentTarget.style.transform='none' }}}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', padding: 2.5,
                background: isActive ? `linear-gradient(135deg, ${sc}, ${sc}bb)` :
                             isDone  ? 'linear-gradient(135deg,#90DDB0,#5BBF7A)' : '#EDE4D8',
                transition: 'all .2s', boxShadow: isActive ? `0 5px 14px ${sc}40` : isDone ? '0 3px 8px rgba(91,191,122,.30)' : 'none',
              }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%',
                  background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: isActive ? 18 : 15, transition:'font-size .2s' }}>{isDone ? '✓' : s.emoji}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: isActive ? sc : isDone ? '#5BBF7A' : '#C4B4A8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff', fontWeight: 800, flexShrink: 0,
                  boxShadow: isActive ? `0 2px 6px ${sc}50` : 'none',
                }}>{s.n}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 600,
                  color: isActive ? sc : '#8C7B6E', whiteSpace: 'nowrap' }}>
                  {s.short}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* 메인 영역 — 크림 파스텔 배경 */}
        <main ref={mainRef} style={{
          flex: 1, overflowY: 'auto', padding: 16, minWidth: 0,
          background: '#FFF9F2',
          backgroundImage: `
            radial-gradient(circle at 10% 15%, rgba(255,140,66,.07) 0%, transparent 40%),
            radial-gradient(circle at 88% 12%, rgba(78,172,217,.06) 0%, transparent 40%),
            radial-gradient(circle at 52% 82%, rgba(91,191,122,.05) 0%, transparent 40%),
            radial-gradient(circle at 20% 70%, rgba(201,125,232,.04) 0%, transparent 35%)
          `,
        }}>
          {/* Step 헤더 뱃지 — 교과서 스타일 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
            padding: '12px 20px', borderRadius: 20,
            background: `linear-gradient(135deg, ${step.bg}, #fff)`,
            border: `2.5px solid ${step.bd}`,
            boxShadow: `0 4px 16px ${step.c}18`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position:'absolute', right:-10, top:-10, width:60, height:60,
              borderRadius:'50%', background:`${step.c}12`, pointerEvents:'none' }} />
            <div style={{ width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(135deg, ${step.c}, ${step.dk})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 15, fontWeight: 800, flexShrink: 0,
              boxShadow: `0 4px 10px ${step.c}45` }}>{step.n}</div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: step.dk, letterSpacing: '-0.3px' }}>{step.emoji} {step.label}</div>
              <div style={{ fontSize: 11, color: step.c, fontWeight: 700, marginTop: 1, opacity:.75 }}>Step {step.n} of 4</div>
            </div>
            <div style={{ marginLeft: 'auto', display:'flex', gap:4 }}>
              {[1,2,3,4].map(n => (
                <div key={n} style={{ width: n <= activeStep ? 20 : 8, height:8, borderRadius:999,
                  background: n <= activeStep ? step.c : '#E6D8C8',
                  transition:'all .3s', boxShadow: n <= activeStep ? `0 2px 6px ${step.c}40` : 'none',
                }} />
              ))}
            </div>
          </div>

          {activeStep === 1 && (
            <Step1 user={user} code={user.code} posts={step1Posts}
              selectedPost={room.selectedPost} onToast={setToast} />
          )}
          {activeStep === 2 && (
            <Step2 user={user} code={user.code} selectedPost={room.selectedPost}
              dataTable={dataTable} onChange={handleDataTable}
              surveyActive={room.surveyActive || false} survey={survey} surveyResponses={surveyResp} />
          )}
          {activeStep === 3 && (
            <Step3 user={user} code={user.code}
              items={items} dataTable={dataTable}
              chartConfig={chartConfig} onChartConfig={handleChartConfig}
              strokes={strokes} currentDrawer={room.currentDrawer || null}
              drawMode={drawMode} onDrawMode={handleDrawMode}
              livePreview={room.livePreview || null} />
          )}
          {activeStep === 4 && (
            <Step4 user={user} code={user.code}
              items={items} dataTable={dataTable} chartConfig={chartConfig}
              step4State={step4State} onStep4State={handleStep4State} />
          )}
        </main>

        {/* Side panel — Step 1 & 4 only */}
        {hasSidepanel && (
          <aside style={{
            width: 244, borderLeft: '2.5px solid #E6D8C8',
            display: 'flex', flexDirection: 'column',
            background: '#FFF9F2', flexShrink: 0, overflow: 'hidden',
          }}>
            {activeStep === 1 ? (
              <FeedPanel posts={step1Posts} myName={user.name} code={user.code}
                onLike={handleLike1} onComment={handleComment1}
                onSelectRequest={handleSelectRequest}
                onDelete={handleDelete1} />
            ) : (
              <FeedPanel posts={step4Posts} myName={user.name} code={user.code}
                onLike={handleLike4} onComment={handleComment4}
                onSelectRequest={null} onDelete={handleDelete4} />
            )}
          </aside>
        )}
      </div>

      {/* ── Vote Modal ── */}
      {voteModal && room.selectionVote && (
        <VoteModal
          vote={room.selectionVote}
          myName={user.name}
          onAgree={handleVote}
          onClose={() => setVoteModal(false)}
          onCancel={handleCancelVote}
          isRequester={room.selectionVote?.requestedBy === user.name}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
