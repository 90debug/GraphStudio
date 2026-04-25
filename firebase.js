'use client'
import { motion } from 'framer-motion' // 애니메이션 추가
import { CHART_COLORS } from '../../lib/constants'

// 데이터가 없을 때 보여주는 Glassmorphism 카드
function NoData({ msg = '2단계에서 데이터를 입력하면\n그래프가 나타나요.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 rounded-bento bg-white/40 backdrop-blur-sm border-2 border-white/60 shadow-glass border-dashed">
      <motion.div 
        animate={{ y: [0, -10, 0] }} 
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-5xl mb-4"
      >
      </motion.div>
      <p className="text-slate-500 text-sm font-bold text-center whitespace-pre-line leading-relaxed">
        {msg}
      </p>
    </div>
  )
}

export function BarChart({ data }) {
  if (!data?.some(d => Number(d.value) > 0)) return <NoData />
  
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1)
  const W = 560, H = 200, pL = 40, pT = 30, pB = 40
  const bw  = Math.min(48, Math.floor((W - pL - 40) / data.length) - 12)
  const gap = Math.floor((W - pL - 40 - bw * data.length) / (data.length + 1))

  return (
    <div className="bg-white/50 backdrop-blur-md p-6 rounded-bento border border-white/60 shadow-glass">
      <svg width="100%" viewBox={`0 0 ${W} ${H + pT + pB}`} className="overflow-visible">
        {/* 가이드 라인 */}
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
            <g key={i} className="cursor-pointer">
              {/* 막대 애니메이션 (Claymorphism 느낌을 위해 rx를 크게) */}
              <motion.rect
                initial={{ height: 0, y: pT + H }}
                animate={{ height: bh, y: y }}
                transition={{ type: 'spring', damping: 15, stiffness: 100, delay: i * 0.1 }}
                x={x} width={bw} rx={bw / 2}
                fill={color}
                className="filter drop-shadow-md"
              />
              {/* 상단 수치 */}
              {v > 0 && (
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 + 0.5 }}
                  x={x + bw / 2} y={y - 10}
                  textAnchor="middle" fontSize="13" fontWeight="900" fill={color}
                >
                  {v}
                </motion.text>
              )}
              {/* 하단 레이블 */}
              <text x={x + bw / 2} y={pT + H + 25} textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748B">
                {lbl}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function PieChart({ data }) {
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
      lx: cx + r * 0.65 * Math.cos(mid), ly: cy + r * 0.65 * Math.sin(mid),
      label: d.label, v
    }
  }).filter(s => s.v > 0)

  return (
    <div style={{overflow:"hidden",maxWidth:"100%"}} className="flex flex-col md:flex-row items-center gap-10 bg-white/50 backdrop-blur-md p-8 rounded-bento border border-white/60 shadow-glass">
      <svg width="220" height="220" viewBox="0 0 220 220" className="filter drop-shadow-xl">
        {slices.map((s, i) => (
          <motion.g 
            key={i}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', delay: i * 0.1 }}
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
      {/* 범례 디자인 업그레이드 */}
      <div style={{minWidth:0,overflow:"hidden"}} className="grid grid-cols-2 gap-3 w-full">
        {slices.map((s, i) => (
          <div key={i} style={{overflow:"hidden",minWidth:0}} className="flex items-center gap-3 p-2 bg-white/40 rounded-xl border border-white/60 shadow-clay-sm">
            <div className="w-4 h-4 rounded-full shadow-inner" style={{ background: s.color }} />
            <span className="text-xs font-bold text-slate-600 truncate flex-1">{s.label}</span>
            <span className="text-xs font-black text-slate-400">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StripChart({ data }) {
  const total = data?.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0
  if (!total) return <NoData />

  let cum = 0
  const segs = data.map((d, i) => {
    const v = Number(d.value) || 0
    const pct = (v / total) * 100
    const x = cum
    cum += pct
    return { pct, color: CHART_COLORS[i % CHART_COLORS.length], label: d.label }
  })

  return (
    <div className="bg-white/50 backdrop-blur-md p-6 rounded-bento border border-white/60 shadow-glass space-y-6">
      {/* 띠 그래프 본체 (Claymorphism) */}
      <div className="h-16 w-full flex rounded-2xl overflow-hidden shadow-clay-md border-4 border-white/50">
        {segs.map((s, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${s.pct}%` }}
            transition={{ duration: 1, ease: 'circOut' }}
            style={{ background: s.color }}
            className="flex items-center justify-center relative group overflow-hidden"
          >
            {s.pct > 7 && (
              <span className="text-xs font-black text-white drop-shadow-md">
                {Math.round(s.pct)}%
              </span>
            )}
          </motion.div>
        ))}
      </div>
      {/* 범례 */}
      <div className="flex flex-wrap gap-3">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-full border border-white/80 shadow-clay-sm">
            <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            <span className="text-[11px] font-extrabold text-slate-600">{s.label}</span>
            <span className="text-[11px] font-black text-slate-400">{Math.round(s.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const CHART_CMPS = { bar: BarChart, pie: PieChart, strip: StripChart }