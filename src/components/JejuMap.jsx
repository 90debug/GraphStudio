import { useRef, useCallback } from 'react'
import { getPartColor } from '../utils'
import PinInputBar from './PinInputBar'
import styles from './JejuMap.module.css'

const HIT_RADIUS = 6

export default function JejuMap({
  parts = {},
  myPartName,
  canPin = false,
  pendingPin,
  onMapClick,
  onPinSave,
  onPinCancel,
  onMarkerClick,
  onDeleteMyPin,
  onExpand,
  expanded = false,
}) {
  const containerRef = useRef(null)

  const partEntries = Object.entries(parts).map(([key, val]) => {
    const history = val.history
      ? Object.values(val.history).sort((a, b) => a.timestamp - b.timestamp)
      : []
    return {
      partName: val.partName ?? val.current?.partName ?? key,
      current:  val.current ?? null,
      history,
      color:    getPartColor(val.partName ?? val.current?.partName ?? key),
    }
  })

  const handleClick = useCallback((e) => {
    if (pendingPin) return
    const rect = containerRef.current.getBoundingClientRect()
    const cx = ((e.clientX - rect.left) / rect.width)  * 100
    const cy = ((e.clientY - rect.top)  / rect.height) * 100

    // 마커 근처 클릭인지 먼저 확인
    for (const { partName, current } of partEntries) {
      if (!current) continue
      const dx = cx - current.x
      const dy = cy - current.y
      if (Math.sqrt(dx * dx + dy * dy) < HIT_RADIUS) {
        onMarkerClick?.(partName, current.label)
        return
      }
    }

    if (!canPin) return
    onMapClick?.(parseFloat(cx.toFixed(2)), parseFloat(cy.toFixed(2)))
  }, [canPin, pendingPin, onMapClick, onMarkerClick, partEntries])

  return (
    <div
      ref={containerRef}
      className={`${styles.wrap} ${canPin && !pendingPin ? styles.crosshair : ''} ${expanded ? styles.expanded : ''}`}
      onClick={handleClick}
    >
      {/* ── 배경 SVG ── */}
      <svg
        viewBox="0 0 375 256"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.islandSvg}
        style={{ pointerEvents: 'none' }}
      >
        <rect width="375" height="256" fill="#B8DFF0" />
        <path d="M0 235Q70 227 140 235Q210 243 280 235Q335 229 375 235L375 256L0 256Z" fill="#A8D5EC" opacity=".45" />
        <path d="M58 126C60 97 77 78 104 69C124 61 154 57 184 56C214 55 247 58 271 64C295 70 314 80 324 93C333 104 334 116 329 126C325 136 314 143 304 148C294 154 281 158 264 161C247 164 227 166 209 166C189 166 174 170 159 173C144 176 129 178 114 176C97 173 81 165 69 153C59 143 56 138 58 126Z"
          fill="#7DC975" stroke="#5AAF5A" strokeWidth="1.3" />
        <ellipse cx="189" cy="110" rx="48" ry="26" fill="#5AAF5A" opacity=".32" />
        <ellipse cx="189" cy="105" rx="26" ry="17" fill="#3D8A3D" opacity=".28" />
        <path d="M94 118Q138 113 189 111Q240 109 284 113"
          fill="none" stroke="white" strokeWidth="1.2" opacity=".4" strokeDasharray="4 3" />
        <ellipse cx="329" cy="88" rx="14" ry="8" fill="#7DC975" stroke="#5AAF5A" strokeWidth=".8" />
        <text x="329" y="92" textAnchor="middle" fontSize="8" fill="#2D5A2D" fontWeight="700">우도</text>

        {/* 상단 뱃지 */}
        <rect x="8" y="8" width="72" height="17" rx="6" fill="rgba(0,0,0,.3)" />
        <circle cx="14" cy="16.5" r="3.5" fill="#E8634A" />
        <text x="46" y="20" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">실시간 동기화</text>
        <rect x="280" y="8" width="86" height="17" rx="6" fill="rgba(0,0,0,.3)" />
        <line x1="287" y1="16.5" x2="302" y2="16.5" stroke="#E8634A" strokeWidth="1.5" strokeDasharray="4 2.5" />
        <text x="351" y="20" textAnchor="middle" fontSize="8" fill="white" fontWeight="700">이동 경로</text>
      </svg>

      {/* ── 경로 오버레이 SVG ── */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        className={styles.overlaySvg} style={{ pointerEvents: 'none' }}>
        {partEntries.map(({ partName, current, history, color }) => {
          const pts = [...history, ...(current ? [current] : [])]
          if (pts.length < 2) return null
          return (
            <polyline key={`path-${partName}`}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none" stroke={color} strokeWidth=".6"
              strokeDasharray="2.2 1.6"
              opacity={partName === myPartName ? '.75' : '.45'} />
          )
        })}
      </svg>

      {/* ── 마커 ── */}
      {partEntries.map(({ partName, current, history, color }) => {
        if (!current) return null
        const isMe = partName === myPartName
        return (
          <div key={partName}>
            {history.slice(-3).map((h, i) => (
              <div key={i} className={styles.histDot}
                style={{ left: `${h.x}%`, top: `${h.y}%`, background: color, opacity: 0.2 + i * 0.12 }} />
            ))}
            <div className={`${styles.marker} ${isMe ? styles.markerMe : ''}`}
              style={{ left: `${current.x}%`, top: `${current.y}%` }}>
              {isMe && <div className={styles.pulseRing} style={{ borderColor: color }} />}
              <div className={styles.markerCircle} style={{ background: color }}>{partName[0]}</div>
              <div className={styles.markerLabel} style={isMe ? { color, fontWeight: 700 } : {}}>
                {current.label}
              </div>
              {isMe && canPin && (
                <button className={styles.deletePinBtn}
                  onClick={e => { e.stopPropagation(); onDeleteMyPin?.() }}
                  title="핀 삭제">✕</button>
              )}
            </div>
          </div>
        )
      })}

      {/* ── 대기 중 핀 ── */}
      {pendingPin && (
        <div className={styles.pendingPin}
          style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}>
          <svg width="28" height="38" viewBox="0 0 28 38">
            <path d="M14 2C7.4 2 2 7.4 2 14C2 23 14 36 14 36C14 36 26 23 26 14C26 7.4 20.6 2 14 2Z"
              fill={getPartColor(myPartName)} stroke="white" strokeWidth="2" />
            <circle cx="14" cy="14" r="5" fill="white" />
          </svg>
          <div className={styles.pinRipple} style={{ borderColor: getPartColor(myPartName) }} />
        </div>
      )}

      {/* ── 핀 입력 바 ── */}
      <PinInputBar pin={pendingPin} onSave={onPinSave} onCancel={onPinCancel} />

      {/* ── 하단 UI 레이어 ── */}
      <div className={styles.bottomBar}>
        {/* 좌측: 안내 문구 (기록자만, 핀 입력 중 숨김) */}
        {canPin && !pendingPin && (
          <span className={styles.hintText}>ⓘ 지도를 터치해 핀을 꽂고 위치명을 입력하세요</span>
        )}

        {/* 우측: 확대 버튼 (확대 모드에서는 숨김) */}
        {!expanded && onExpand && (
          <button className={styles.expandBtn} onClick={e => { e.stopPropagation(); onExpand() }} title="지도 확대">
            ⛶
          </button>
        )}
      </div>
    </div>
  )
}
