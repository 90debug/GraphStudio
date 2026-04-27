'use client'
import Image from 'next/image'
import { useDevice } from '../../lib/DeviceContext'

const TABS = [
  { id: 1, label: '탐구 문제 정하기', icon: '/icon_01.png' },
  { id: 2, label: '자료 수집하기',    icon: '/icon_02.png' },
  { id: 3, label: '그래프로 나타내기',  icon: '/icon_03.png' },
  { id: 4, label: '그래프 해석하기',  icon: '/icon_04.png' },
]

export default function BottomNav({ currentStep, onStepChange }) {
  const device = useDevice()
  const isMobile = device === 'mobile'

  if (!currentStep) return null

  return (
    <nav style={{
      width: '100%',
      height: isMobile ? '60px' : '70px',
      background: '#ffffff',
      borderTop: '1px solid #eeeef3',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'stretch',
      flexShrink: 0,
    }}>
      {TABS.map(function(tab) {
        const isActive = currentStep === tab.id

        return (
          <button
            key={tab.id}
            onClick={function() { onStepChange(tab.id) }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? 2 : 3,
              padding: isMobile ? '6px 2px' : '8px 6px',
              border: 'none',
              borderBottom: isActive ? '3px solid #5b41eb' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
              minWidth: 0,
            }}
          >
            <div style={{ position: 'relative', width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, flexShrink: 0 }}>
              <Image
                src={tab.icon}
                alt={tab.label}
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p style={{
              fontFamily: "'Pretendard', sans-serif",
              fontSize: isMobile ? '9px' : '11px',
              fontWeight: 600,
              color: isActive ? '#5b41eb' : '#8a949e',
              letterSpacing: '-0.2px',
              lineHeight: 1.3,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {tab.label}
            </p>
          </button>
        )
      })}
    </nav>
  )
}
