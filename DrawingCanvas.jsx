'use client'
import Image from 'next/image'

const TABS = [
  { id: 1, label: '탐구 문제 정하기', icon: '/icon_01.png' },
  { id: 2, label: '자료 수집하기', icon: '/icon_02.png' },
  { id: 3, label: '그래프 나타내기', icon: '/icon_03.png' },
  { id: 4, label: '그래프 해석하기', icon: '/icon_04.png' },
]

export default function BottomNav({ currentStep, onStepChange }) {
  if (!currentStep) return null

  return (
    <nav style={{
      width: '100%',
      height: '70px',
      background: '#ffffff',
      borderTop: '1px solid #eeeef3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '70px',
      flexShrink: 0,
    }}>
      {TABS.map(function(tab) {
        const isActive = currentStep === tab.id

        return (
          <button
            key={tab.id}
            onClick={function() { onStepChange(tab.id) }}
            style={{
              width: '99px',
              height: '70px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              padding: '8px 6px',
              border: 'none',
              borderBottom: isActive ? '3px solid #5b41eb' : '3px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'border-color 0.2s',
            }}
          >
            <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
              <Image
                src={tab.icon}
                alt={tab.label}
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
            <p style={{
              fontFamily: "'Pretendard', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: '#8a949e',
              letterSpacing: '-0.28px',
              lineHeight: 1.5,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              margin: 0,
            }}>
              {tab.label}
            </p>
          </button>
        )
      })}
    </nav>
  )
}
