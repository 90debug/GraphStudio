'use client'
import { motion } from 'framer-motion'
import { CHART_COLORS } from '../../lib/constants'

function NoData({ msg = '2단계에서 데이터를 입력하면\n그래프가 나타나요.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-bento bg-white/40 backdrop-blur-sm border-2 border-white/60 shadow-glass border-dashed">
      <div className="text-5xl mb-4">📊</div>
      <p className="text-slate-500 text-sm font-bold text-center whitespace-pre-line leading-relaxed">{msg}</p>
    </div>
  )
}

// ── 막대그래프 (전체 높이 20% 축소) ─────────────────────────────────────
export function BarChart({ data }) {
  if (!data?.some(d => Number(d.value) > 0)) return <NoData />

  const max = Math.max(...data.map(d => Number(d.value) || 0), 1)
  // 20% 축소: H 200→160, pT 30→24, pB 40→32
  const W = 560, H = 160, pL = 40, pT = 24, pB = 32
  const bw  = Math.min(38, Math.floor((W - pL - 40) / data.length) - 10)
  const gap = Math.floor((W - pL - 40 - bw * data.length) / (data.length + 1))

  return (
    <div className="bg-white/50 backdrop-blur-md p-4 rounded-bento border border-white/60 shadow-glass">
      <svg width="100%" viewBox={`0 0 ${W} ${H + pT + pB}`} className="overflow-visible">
        {[0.25, 0.5, 0.75, 1].map(p => (
          <line key={p} x1={pL} y1={pT + H * (1 - p)} x2={W - 10} y2={pT + H * (1 - p)}
            stroke="#E2E8F0" strokeWidth="1" strokeDasharray="5 5" />
        ))}
        {data.map((d, i) => {
          const v = Number(d.value) || 0
          const bh = (v / max) * H
          const x = pL + gap + i * (bw + gap)
          const y = pT + H - bh
          const color = CHART_COLORS[i % CHART_COLORS.length]
          const lbl = d.label?.length > 6 ? d.label.slice(0, 5) + '..' : d.label
          return (
            <g key={i}>
              {/* initial 애니메이션: 첫 마운트 시 한 번만 실행됨 */}
              <motion.rect
                initial={{ height: 0, y: pT + H }}
                animate={{ height: bh, y }}
                transition={{ type: 'spring', damping: 15, stiffness: 100, delay: i * 0.08 }}
                x={x} width={bw} rx={bw / 2}
                fill={color}
                className="filter drop-shadow-md"
              />
              {v > 0 && (
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 + 0.4 }}
                  x={x + bw / 2} y={y - 8}
                  textAnchor="middle" fontSize="12" fontWeight="900" fill={color}
                >
                  {v}
                </motion.text>
              )}
              <text x={x + bw / 2} y={pT + H + 20} textAnchor="middle" fontSize="11" fontWeight="700" fill="#64748B">
                {lbl}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── 원그래프 (기본 모드: Step3 / compact 모드: Step4 하단 범례) ──────────
export function PieChart({ data, compact = false }) {
  const total = data?.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0
  if (!total) return <NoData />

  let angle = -Math.PI / 2
  const cx = 110, cy = 110, r = 90

  const slices = data.map((d, i) => {
    const v = Number(d.value) || 0
    const a = (v / total) * 2 * Math.PI
    const s = angle; angle += a
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(s + a), y2 = cy + r * Math.sin(s + a)
    const mid = s + a / 2
    return {
      path: v / total >= 0.9999
        ? `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.01},${cy - r} Z`
        : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2}Z`,
      color: CHART_COLORS[i % CHART_COLORS.length],
      pct: Math.round(v / total * 100),
      lx: cx + r * 0.65 * Math.cos(mid),
      ly: cy + r * 0.65 * Math.sin(mid),
      label: d.label, v,
    }
  }).filter(s => s.v > 0)

  if (compact) {
    // Step4 전용: 파이 SVG + 하단 띠그래프식 범례
    return (
      <div style={{overflow:'hidden',maxWidth:'100%'}} className="flex flex-col items-center gap-4 bg-white/50 backdrop-blur-md p-6 rounded-bento border border-white/60 shadow-glass">
        <motion.svg
          width="200" height="200" viewBox="0 0 220 220"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="filter drop-shadow-xl"
        >
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="3" />
          ))}
        </motion.svg>
        {/* 하단 범례 (띠그래프 스타일) */}
        <div className="flex flex-wrap gap-2 justify-center w-full">
          {slices.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 + 0.3 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-full border border-white/80 shadow-clay-sm"
            >
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[11px] font-extrabold text-slate-600">{s.label}</span>
              <span className="text-[11px] font-black text-slate-400">{s.pct}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // 기본 모드 (Step3): 파이 내부 % 표시 + 오른쪽 그리드 범례
  return (
    <div style={{overflow:'hidden',maxWidth:'100%'}} className="flex flex-col md:flex-row items-center gap-6 bg-white/50 backdrop-blur-md p-6 rounded-bento border border-white/60 shadow-glass">
      <svg width="220" height="220" viewBox="0 0 220 220" style={{flexShrink:0}} className="filter drop-shadow-xl">
        {slices.map((s, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          >
            <path d={s.path} fill={s.color} stroke="#fff" strokeWidth="3" className="hover:opacity-80 transition-opacity" />
            {s.pct > 5 && (
              <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="central" fontSize="14" fill="#fff" fontWeight="900">
                {s.pct}%
              </text>
            )}
          </motion.g>
        ))}
      </svg>
      <div style={{minWidth:0,overflow:'hidden',flex:1}} className="grid grid-cols-2 gap-2 w-full">
        {slices.map((s, i) => (
          <div key={i} style={{overflow:'hidden',minWidth:0}} className="flex items-center gap-2 p-2 bg-white/40 rounded-xl border border-white/60 shadow-clay-sm">
            <div className="w-4 h-4 rounded-full shadow-inner flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs font-bold text-slate-600 truncate flex-1" style={{minWidth:0}}>{s.label}</span>
            <span className="text-xs font-black text-slate-400 flex-shrink-0">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 띠그래프 ────────────────────────────────────────────────────────────────
export function StripChart({ data }) {
  const total = data?.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0
  if (!total) return <NoData />

  let cum = 0
  const segs = data.map((d, i) => {
    const v = Number(d.value) || 0
    const pct = (v / total) * 100
    cum += pct
    return { pct, color: CHART_COLORS[i % CHART_COLORS.length], label: d.label }
  })

  return (
    <div className="bg-white/50 backdrop-blur-md p-6 rounded-bento border border-white/60 shadow-glass space-y-6">
      <div className="h-16 w-full flex rounded-2xl overflow-hidden shadow-clay-md border-4 border-white/50">
        {segs.map((s, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ duration: 0.9, ease: 'circOut', delay: i * 0.05 }}
            style={{ background: s.color }}
            className="flex items-center justify-center overflow-hidden"
          >
            {s.pct > 7 && (
              <span className="text-xs font-black text-white drop-shadow-md">{Math.round(s.pct)}%</span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {segs.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 + 0.5 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-full border border-white/80 shadow-clay-sm"
          >
            <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px] font-extrabold text-slate-600">{s.label}</span>
            <span className="text-[11px] font-black text-slate-400">{Math.round(s.pct)}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}


export function LineChart({ data }) {
  const hasData = data?.some(d => Number(d.value) > 0)
  if (!hasData) return <NoData />
  const W=320, H=180, pT=24, pL=40, pB=30
  const values = data.map(d=>Number(d.value)||0)
  const maxV = Math.max(...values,1)
  const xs = data.map((_,i)=>pL+(i/(data.length-1||1))*(W-pL-10))
  const ys = values.map(v=>pT+H*(1-v/maxV))
  const polyline = xs.map((x,i)=>`${x},${ys[i]}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H+pB}`} style={{width:'100%',maxHeight:220,overflow:'visible'}}>
      {[0,.25,.5,.75,1].map(p=>(
        <line key={p} x1={pL} y1={pT+H*(1-p)} x2={W-10} y2={pT+H*(1-p)}
          stroke='#f1f5f9' strokeWidth={1}/>
      ))}
      <polyline points={polyline} fill="none" stroke={CHART_COLORS[0]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"/>
      {xs.map((x,i)=>(
        <g key={i}>
          <circle cx={x} cy={ys[i]} r={5} fill={CHART_COLORS[i%CHART_COLORS.length]} stroke='#fff' strokeWidth={2}/>
          <text x={x} y={ys[i]-10} textAnchor="middle" fontSize={10} fill='#64748B' fontWeight={700}>{values[i]}</text>
          <text x={x} y={H+pT+pB-4} textAnchor="middle" fontSize={10} fill='#94A3B8' fontWeight={600}>{data[i].label}</text>
        </g>
      ))}
    </svg>
  )
}

export const CHART_CMPS = { bar: BarChart, pie: PieChart, strip: StripChart, line: LineChart }
