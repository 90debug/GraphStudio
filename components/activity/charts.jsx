'use client'
import { CHART_COLORS } from '../../lib/constants'

function NoData({ msg = '2단계에서 데이터를 입력하면\n그래프가 나타나요' }) {
  return (
    <div style={{ textAlign: 'center', padding: '28px 16px', color: '#8C7B6E', fontSize: 13, lineHeight: 1.8 }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
      {msg}
    </div>
  )
}

export function BarChart({ data }) {
  if (!data?.some(d => Number(d.value) > 0)) return <NoData />
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1)
  const W = 560, H = 200, pL = 36, pT = 24, pB = 36
  const bw  = Math.min(56, Math.floor((W - pL - 20) / data.length) - 10)
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

export function PieChart({ data }) {
  const total = data?.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0
  if (!total) return <NoData />
  let angle = -Math.PI / 2
  const cx = 110, cy = 110, r = 90
  const slices = data.map((d, i) => {
    const v = Number(d.value) || 0
    const a = Math.min((v / total) * 2 * Math.PI, 2 * Math.PI - 0.0001)
    const s = angle; angle += (v / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(s + a), y2 = cy + r * Math.sin(s + a)
    const mid = s + a / 2
    const isFull = v / total >= 0.9999
    return {
      path: isFull
        ? `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx - 0.001},${cy - r} Z`
        : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x2},${y2}Z`,
      color: CHART_COLORS[i % CHART_COLORS.length],
      pct: Math.round(v / total * 100),
      lx: cx + r * .58 * Math.cos(mid), ly: cy + r * .58 * Math.sin(mid),
      label: d.label, v,
    }
  }).filter(s => s.v > 0)
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

export function StripChart({ data }) {
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

export const CHART_CMPS = { bar: BarChart, pie: PieChart, strip: StripChart }
