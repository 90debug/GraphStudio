import { useState } from 'react'
import { ref, remove } from 'firebase/database'
import { db } from '../firebase'
import { usePartsData }     from '../hooks/usePartsData'
import { useAnnouncements } from '../hooks/useAnnouncements'
import { encodeKey, getPartColor, fmtTime } from '../utils'
import styles from './AdminDashboard.module.css'

const TABS = ['현황', '공지', '이력']

export default function AdminDashboard({ user, onGoMap, onLogout, onGoHome }) {
  const [tab,   setTab]   = useState(0)
  const [title, setTitle] = useState('')
  const [body,  setBody]  = useState('')
  const [sent,  setSent]  = useState(false)

  const { parts }                           = usePartsData()
  const { announcements, sendAnnouncement } = useAnnouncements()

  const resetPart = (partKey) => remove(ref(db, `parts/${partKey}/current`))

  const handleSend = () => {
    if (!title.trim()) return
    sendAnnouncement({ title: title.trim(), body: body.trim() })
    setTitle(''); setBody(''); setSent(true)
    setTimeout(() => setSent(false), 2500)
  }

  const historyLog = Object.entries(parts)
    .flatMap(([key, val]) =>
      Object.values(val.history ?? {}).map(h => ({
        partName: h.partName ?? key,
        label:    h.label,
        ts:       h.timestamp,
        by:       h.updatedBy,
        color:    getPartColor(h.partName ?? key),
      }))
    )
    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    .slice(0, 50)

  return (
    <div className="app-shell">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>🔧 관리자 대시보드</div>
        <div className={styles.headerRight}>
          <div className={styles.adminBadge}>ADMIN</div>
          <button className={styles.mapBtn}    onClick={onGoMap}>지도</button>
          <button className={styles.homeBtn} onClick={onGoHome} title="홈으로">🏠</button>
          <button className={styles.logoutBtn} onClick={onLogout} title="로그아웃">⏏</button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((t, i) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === i ? styles.tabOn : ''}`}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={styles.body}>

        {/* ══ TAB 0: 현황 ══ */}
        {tab === 0 && (
          <div className="fade-in">
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <div className={styles.statNum}>{Object.keys(parts).length}</div>
                <div className={styles.statLbl}>참여 파트</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>
                  {Object.values(parts).reduce((s, p) =>
                    s + Object.keys(p.history ?? {}).length, 0)}
                </div>
                <div className={styles.statLbl}>체크인 수</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>{announcements.length}</div>
                <div className={styles.statLbl}>활성 공지</div>
              </div>
            </div>

            <div className={styles.sectionLabel}>파트 현황</div>
            {Object.keys(parts).length === 0 && (
              <div className={styles.empty}>아직 체크인한 파트가 없어요</div>
            )}
            {Object.entries(parts).map(([key, val]) => {
              const partName = val.current?.partName ?? key
              const color    = getPartColor(partName)
              return (
                <div key={key} className={styles.pmRow}>
                  <div className={styles.pmDot} style={{ background: color }} />
                  <div className={styles.pmName}>{partName}</div>
                  <div className={styles.pmLoc}>{val.current?.label ?? '—'}</div>
                  <div className={styles.pmTime}>{fmtTime(val.current?.timestamp)}</div>
                  <button className={styles.rstBtn} onClick={() => resetPart(key)}>리셋</button>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ TAB 1: 공지 ══ */}
        {tab === 1 && (
          <div className="fade-in">
            <div className={styles.sectionLabel}>새 공지 작성</div>
            <input
              className={styles.finp}
              type="text"
              placeholder="공지 제목"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={60}
            />
            <textarea
              className={`${styles.finp} ${styles.fta}`}
              placeholder="공지 내용 (선택)"
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={200}
            />
            <button
              className={`${styles.sendBtn} ${sent ? styles.sendBtnSent : ''}`}
              onClick={handleSend}
              disabled={sent}
            >
              {sent ? '✓ 발송 완료!' : '📢 전체 구성원에게 발송'}
            </button>

            {announcements.length > 0 && (
              <>
                <div className={styles.sectionLabel} style={{ marginTop: 20 }}>발송 이력</div>
                {announcements.map(a => (
                  <div key={a.id} className={styles.annItem}>
                    <div className={styles.annTitle}>{a.title}</div>
                    {a.body && <div className={styles.annBody}>{a.body}</div>}
                    <div className={styles.annTime}>{fmtTime(a.createdAt)} 발송</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ══ TAB 2: 이력 ══ */}
        {tab === 2 && (
          <div className="fade-in">
            <div className={styles.sectionLabel}>체크인 이력 (최근 50건)</div>
            {historyLog.length === 0 && (
              <div className={styles.empty}>아직 이력이 없어요</div>
            )}
            {historyLog.map((h, i) => (
              <div key={i} className={styles.logRow}>
                <div className={styles.logDot} style={{ background: h.color }} />
                <div className={styles.logTxt}>
                  <span className={styles.logPart}>{h.partName}</span>
                  {h.by && <span className={styles.logWho}> · {h.by}</span>}
                  <br />
                  <span className={styles.logLabel}>{h.label}</span>
                </div>
                <div className={styles.logTime}>{fmtTime(h.ts)}</div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
