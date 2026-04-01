import { getPartColor, fmtTime } from '../utils'
import styles from './PartStatusPanel.module.css'

export default function PartStatusPanel({ parts, myPartName, canReset, onReset, onNameClick }) {
  const entries = Object.entries(parts)
    .map(([key, data]) => {
      const partName = data.partName ?? data.current?.partName ?? key
      const history  = data.history
        ? Object.values(data.history).sort((a, b) => a.timestamp - b.timestamp)
        : []
      return { key, partName, current: data.current ?? null, history }
    })
    .sort((a, b) => {
      if (a.partName === myPartName) return -1
      if (b.partName === myPartName) return  1
      return (b.current?.timestamp ?? 0) - (a.current?.timestamp ?? 0)
    })

  if (!entries.length) {
    return (
      <div className={styles.wrap}>
        <div className={styles.title}>파트 현황</div>
        <div className={styles.empty}>아직 체크인한 파트가 없어요</div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>파트 현황</div>
      {entries.map(({ key, partName, current, history }) => {
        const color = getPartColor(partName)
        const isMe  = partName === myPartName

        const pathPoints = [
          ...history.map(h => h.label).filter(Boolean),
          ...(current?.label && (history.length === 0 || history[history.length - 1]?.label !== current.label)
            ? [current.label] : []),
        ]

        return (
          <div key={key} className={`${styles.group} ${isMe ? styles.groupMe : ''}`}>
            <div className={styles.row}>
              <span className={styles.dot} style={{ background: color }} />
              {/* 파트명 뱃지 — 클릭 시 후기 팝업 */}
              <button
                className={styles.nameBadge}
                style={isMe ? { color, borderColor: color + '55', background: color + '11' } : {}}
                onClick={() => current?.label && onNameClick?.(current.label)}
                title={current?.label ? `${current.label} 후기 보기` : undefined}
                disabled={!current?.label}
              >
                {partName}
                {isMe && <span className={styles.meBadge}>● 나</span>}
              </button>
              <span className={styles.loc}>{current?.label ?? '—'}</span>
              <span className={styles.time}>
                {current?.timestamp ? fmtTime(current.timestamp) : ''}
              </span>
              {isMe && canReset && (
                <button className={styles.resetBtn} onClick={() => onReset(key)} title="초기화">↺</button>
              )}
            </div>

            {/* 이동 경로 breadcrumb */}
            {pathPoints.length > 0 && (
              <div className={styles.path}>
                {pathPoints.map((label, i) => (
                  <span key={i} className={styles.pathItem}>
                    <button
                      className={`${styles.pathNode} ${i === pathPoints.length - 1 ? styles.pathNodeCurrent : ''}`}
                      style={i === pathPoints.length - 1 ? { borderColor: color, color } : {}}
                      onClick={() => onNameClick?.(label)}
                    >
                      {label}
                    </button>
                    {i < pathPoints.length - 1 && <span className={styles.pathArrow}>→</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
