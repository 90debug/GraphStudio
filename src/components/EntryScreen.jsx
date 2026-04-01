import { useState } from 'react'
import { useConfig } from '../hooks/useConfig'
import { getPartColor } from '../utils'
import styles from './EntryScreen.module.css'

const ROLES = [
  { id: 'member',  icon: '👀', label: '팀원',   desc: '열람만' },
  { id: 'leader',  icon: '📍', label: '기록자', desc: '기록 가능' },
  { id: 'admin',   icon: '🔧', label: '관리자', desc: '전체 관리' },
]

export default function EntryScreen({ isReEntry, savedUser, onEnter, onNewEntry }) {
  const { config } = useConfig()

  const [name,       setName]    = useState(savedUser?.name     ?? '')
  const [partName,   setPartName]= useState(savedUser?.partName ?? '')
  const [role,       setRole]    = useState(savedUser?.role     ?? 'member')
  const [code,       setCode]    = useState('')
  const [error,      setError]   = useState('')
  const [submitting, setSub]     = useState(false)

  const needsCode = role === 'admin'

  const handleSubmit = () => {
    if (!name.trim())     { setError('이름을 입력해 주세요');  return }
    if (!partName.trim()) { setError('파트명을 입력해 주세요'); return }
    if (needsCode) {
      const expected = config?.adminCode ?? '0000'
      if (!code.trim() || code.trim() !== expected) {
        setError('관리자 코드가 올바르지 않아요'); return
      }
    }
    setSub(true)
    onEnter({ name: name.trim(), partName: partName.trim(), role })
  }
  const onKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  /* ── Re-entry ── */
  if (isReEntry && savedUser?.name) {
    const color    = getPartColor(savedUser.partName)
    const roleInfo = ROLES.find(r => r.id === savedUser.role)
    return (
      <div className="app-shell">
        <div className={styles.hero}>
          <div className={styles.heroLogo}>2027 제주도 워크숍</div>
          <div className={styles.heroSub}>중고등개발본부</div>
          <div className={styles.heroWs}>{config?.workshopTitle ?? '대시보드'}</div>
        </div>
        <div className={styles.reBody}>
          <div className={styles.reCard}>
            <div className={styles.reCardTitle}>저장된 정보로 다시 접속해요</div>
            <div className={styles.reTop}>
              <div className={styles.reAvatar} style={{ background: color }}>
                {savedUser.name[0]}
              </div>
              <div>
                <div className={styles.reName}>{savedUser.name}</div>
                <div className={styles.reMeta}>{savedUser.partName}</div>
                <div className={styles.reRole}>
                  {roleInfo?.icon} {roleInfo?.label}
                  {savedUser._savedAt && (
                    <span className={styles.reSavedAt}>
                      {' '}· {new Date(savedUser._savedAt).toLocaleDateString('ko-KR')} 저장
                    </span>
                  )}
                </div>
              </div>
            </div>
            {savedUser.lastLabel && (
              <div className={styles.reLastLoc}>📍 마지막 위치 · {savedUser.lastLabel}</div>
            )}
            <button className={styles.reBtnPrimary} onClick={() => onEnter(savedUser)}>
              바로 입장하기 →
            </button>
            <button className={styles.reBtnSecondary} onClick={onNewEntry}>
              다른 계정으로 접속
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── 첫 진입 ── */
  return (
    <div className="app-shell">
      <div className={styles.hero}>
        <div className={styles.heroLogo}>2027 제주도 워크숍</div>
        <div className={styles.heroSub}>중고등개발본부</div>
        <div className={styles.heroWs}>{config?.workshopTitle ?? '대시보드'}</div>
      </div>
      <div className={styles.formBody}>
        <div className={styles.fieldLabel}>이름 (닉네임)</div>
        <input className={styles.inp} type="text" placeholder="예 : 홍길동"
          value={name} onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={onKey} maxLength={20} autoFocus />

        <div className={styles.fieldLabel}>팀/파트명</div>
        <input className={styles.inp} type="text" placeholder="예 : 중3부, 전략기획파트"
          value={partName} onChange={e => { setPartName(e.target.value); setError('') }}
          onKeyDown={onKey} maxLength={30} />

        <div className={styles.fieldLabel} style={{ marginBottom: 8 }}>역할</div>
        <div className={styles.roleRow}>
          {ROLES.map(r => (
            <div key={r.id}
              className={`${styles.roleCard} ${role === r.id ? styles.roleCardSel : ''}`}
              onClick={() => { setRole(r.id); setCode(''); setError('') }}>
              <div className={styles.roleIc}>{r.icon}</div>
              <div className={styles.roleName}>{r.label}</div>
              <div className={styles.roleDesc}>{r.desc}</div>
            </div>
          ))}
        </div>

        {needsCode && (
          <div className={styles.codeBox}>
            <div className={styles.codeBoxTitle}>🔑 관리자 코드를 입력해 주세요</div>
            <input className={styles.codeInp} type="password" placeholder="• • • •"
              value={code} onChange={e => { setCode(e.target.value); setError('') }}
              onKeyDown={onKey} maxLength={10} />
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.enterBtn} onClick={handleSubmit} disabled={submitting}>
          {submitting ? '접속 중...' : '대시보드 입장하기 →'}
        </button>
        <div className={styles.note}>입력 정보는 이 기기에만 저장돼요 · 다음엔 원터치로 진입해요</div>
      </div>
    </div>
  )
}
