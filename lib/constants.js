// ─── Step 정의 ─────────────────────────────────────────────────────────────
export const STEPS = [
  { n:1, label:'탐구 문제 정하기', short:'탐구 문제 정하기', emoji:'🔍', c:'var(--s1)', bg:'var(--s1-bg)', bd:'var(--s1-bd)', dk:'var(--s1-dk)' },
  { n:2, label:'자료 수집하기',    short:'자료 수집하기',   emoji:'📥', c:'var(--s2)', bg:'var(--s2-bg)', bd:'var(--s2-bd)', dk:'var(--s2-dk)' },
  { n:3, label:'그래프로 나타내기', short:'그래프로 나타내기', emoji:'📊', c:'var(--s3)', bg:'var(--s3-bg)', bd:'var(--s3-bd)', dk:'var(--s3-dk)' },
  { n:4, label:'그래프 해석하기',   short:'그래프 해석하기', emoji:'💡', c:'var(--s4)', bg:'var(--s4-bg)', bd:'var(--s4-bd)', dk:'var(--s4-dk)' },
]

export const STEP_COLORS       = ['#FF8C42', '#4EACD9', '#5BBF7A', '#C97DE8']
export const STEP_FULL_LABELS  = ['탐구 문제 정하기', '자료 수집하기', '그래프로 나타내기', '그래프 해석하기']

// ─── 차트 색상 ─────────────────────────────────────────────────────────────
export const CHART_COLORS = ['#FF8C42','#4EACD9','#5BBF7A','#C97DE8','#F7C948','#FF6B7A','#4DD9C0','#FF9FBB']

// ─── 아바타 색상 ───────────────────────────────────────────────────────────
export const AV_BG = ['#FFF3E8','#EBF7FF','#EDFAF2','#F8EFFE','#FFFAE8','#FFF0F1']
export const AV_FG = ['#D4601A','#2785B5','#2D9950','#9A45C2','#A07C10','#C0364A']

// ─── 그리기 도구 색상 ──────────────────────────────────────────────────────
export const DRAW_COLORS = ['#3D2B1F','#FF6B7A','#FF8C42','#4EACD9','#5BBF7A','#C97DE8','#F7C948','#FFFFFF']

// ─── 성찰 체크리스트 ───────────────────────────────────────────────────────
export const CHECKLIST = [
  '조사 목적에 알맞은 그래프 유형을 선택했나요?',
  '항목의 수치가 정확하게 표시되었나요?',
  '백분율(%)이 올바르게 계산되었나요?',
  '그래프에서 알 수 있는 내용을 잘 정리했나요?',
]

// ─── 포스트잇 색상 ─────────────────────────────────────────────────────────
export const POSTIT_COLORS = [
  { bg: '#FFF8DC', border: '#FFD966', shadow: 'rgba(255,200,50,.30)' },
  { bg: '#FFE8F4', border: '#FFB3D9', shadow: 'rgba(255,105,180,.22)' },
  { bg: '#E0F4FF', border: '#90D8F9', shadow: 'rgba(78,172,217,.22)' },
  { bg: '#E4F9ED', border: '#7FE0A2', shadow: 'rgba(91,191,122,.22)' },
  { bg: '#FFF0DC', border: '#FFBD7A', shadow: 'rgba(255,140,66,.22)' },
  { bg: '#F3EAFF', border: '#D9AAFF', shadow: 'rgba(201,125,232,.22)' },
  { bg: '#FFE8E8', border: '#FFB0B0', shadow: 'rgba(255,107,122,.22)' },
  { bg: '#E6F8FF', border: '#99D9F5', shadow: 'rgba(78,172,217,.18)' },
]

export const PADLET_CARD_PALETTES = [
  { bg:'#FEFCE8', border:'#FDE68A', hdr:'#FFFBEB', avBg:'#FEF3C7', avFg:'#92400E' },
  { bg:'#F0F9FF', border:'#BAE6FD', hdr:'#E0F2FE', avBg:'#BFDBFE', avFg:'#1D4ED8' },
  { bg:'#FFF0F9', border:'#F9A8D4', hdr:'#FCE7F3', avBg:'#FDE8F5', avFg:'#9D174D' },
  { bg:'#F5F3FF', border:'#C4B5FD', hdr:'#EDE9FE', avBg:'#DDD6FE', avFg:'#5B21B6' },
  { bg:'#F0FDFA', border:'#5EEAD4', hdr:'#CCFBF1', avBg:'#CCFBF1', avFg:'#0F766E' },
  { bg:'#FFF7ED', border:'#FDBA74', hdr:'#FFEDD5', avBg:'#FED7AA', avFg:'#C2410C' },
]

// ─── 그라데이션 ────────────────────────────────────────────────────────────
export const EDU_GRAD = 'linear-gradient(135deg,#FF8C42 0%,#FFB347 30%,#FF6B7A 55%,#C97DE8 80%,#4EACD9 100%)'

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────
export const avBg  = n => AV_BG[(n || '').charCodeAt(0) % AV_BG.length]
export const avFg  = n => AV_FG[(n || '').charCodeAt(0) % AV_FG.length]
export const tsNow = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
export const padletPalette  = name => PADLET_CARD_PALETTES[(name || '?').charCodeAt(0) % PADLET_CARD_PALETTES.length]
export const postitColor    = name => POSTIT_COLORS[(name || '').charCodeAt(0) % POSTIT_COLORS.length]
