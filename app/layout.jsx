import './globals.css'
import TabletFrame from '../components/TabletFrame'

export const metadata = {
  title: '메모 보드',
  description: '초등 수학 5단원 여러 가지 그래프 — 모둠 활동 협업 플랫폼',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // 모바일에서 가로 모드를 기본으로 유도
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TabletFrame>{children}</TabletFrame>
      </body>
    </html>
  )
}
