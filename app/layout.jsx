import './globals.css'
import './design-system.css'
import TabletFrame from '../components/TabletFrame'

export const metadata = {
  title: '메모 보드',
  description: '초등 수학 5단원 여러 가지 그래프 — 모둠 활동 협업 플랫폼',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,     // 모바일에서 pinch-zoom 허용
  userScalable: true,  // 접근성을 위해 허용
  viewportFit: 'cover', // 노치/홈바 안전 영역
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <TabletFrame>{children}</TabletFrame>
      </body>
    </html>
  )
}
