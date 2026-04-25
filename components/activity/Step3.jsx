'use client'
import { useState, useEffect, useRef } from 'react'
import { CHART_COLORS } from '../../lib/constants'
import { Sec, Lbl, Inp } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import DrawingCanvas from './DrawingCanvas'
import { CHART_CMPS } from './charts'

const CHART_TYPES = [
  { type:'bar',   label:'막대그래프' },
  { type:'pie',   label:'원그래프'   },
  { type:'strip', label:'띠그래프'   },
]

// 전체화면 진입/종료 시 모바일 화면 회전 처리
async function lockLandscape() {
  try {
    if (typeof screen !== 'undefined' && screen.orientation?.lock) {
      await screen.orientation.lock('landscape-primary')
    }
  } catch {}
}
function unlockOrientation() {
  try {
    if (typeof screen !== 'undefined' && screen.orientation?.unlock) {
      screen.orientation.unlock()
    }
  } catch {}
}

export default function Step3({
  user, code, items, dataTable, chartConfig, onChartConfig,
  strokes, currentDrawer, drawMode, onDrawMode, livePreview,
  selectedPost, step3SnapshotImg, onStep3SnapshotImg, activeStep = 3
}) {
  const device   = useDevice()
  const isMobile = device === 'mobile'
  const [isFullscreen, setIsFullscreen] = useState(false)

  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || CHART_CMPS.bar
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const hasData = total > 0

  // 전체화면 진입
  async function enterFullscreen() {
    setIsFullscreen(true)
    if (isMobile) await lockLandscape()
  }

  // 전체화면 종료
  function exitFullscreen() {
    unlockOrientation()
    setIsFullscreen(false)
  }

  // 전체화면일 때 ESC 키 처리
  useEffect(() => {
    if (!isFullscreen) return
    function onKey(e) { if (e.key === 'Escape') exitFullscreen() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen]) // eslint-disable-line

  // 전체화면 버튼 (ds-card 우측 상단에 표시)
  const FullscreenBtn = () => (
    <button
      onClick={enterFullscreen}
      title="전체 화면으로 그리기"
      style={{
        position:'absolute', top:10, right:10, zIndex:10,
        width:30, height:30, borderRadius:8,
        background:'rgba(255,255,255,0.95)',
        border:'1px solid #e2e3e5',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', fontSize:13, color:'#5B41EB',
        fontFamily:'inherit', boxShadow:'0 2px 6px rgba(0,0,0,0.08)',
        transition:'all .15s', fontWeight:700,
      }}
      onMouseEnter={e=>{ e.currentTarget.style.background='#5B41EB'; e.currentTarget.style.color='#fff' }}
      onMouseLeave={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.95)'; e.currentTarget.style.color='#5B41EB' }}
    >⛶</button>
  )

  // 모드 토글 버튼 (인라인 JSX - 별도 컴포넌트 정의 금지)
  const modeButtons = (
    <div style={{display:'flex',gap:7,flexShrink:0}}>
      {[['draw','직접 그리기','#5B41EB'],['auto','자동 그래프','#5B41EB']].map(([mode,label,clr])=>(
        <button key={mode} type="button" onClick={()=>onDrawMode(mode)} style={{
          flex:1, padding: isMobile?'10px 8px':'9px 20px',
          minHeight:44, borderRadius:999, fontSize: isMobile?13:14,
          fontWeight:700, cursor:'pointer', border:'1px solid',
          fontFamily:'inherit', transition:'all .15s',
          background:drawMode===mode?clr:'#ffffff',
          color:drawMode===mode?'#fff':'#8C7B6E',
          borderColor:drawMode===mode?clr:'#E6D8C8',
          whiteSpace:'nowrap',
        }}>{label}</button>
      ))}
    </div>
  )

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#F3F4F8'}}>
      {/* 헤더 */}
      <header className="px-6 h-14 bg-white/70 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between sticky top-0 z-40" style={{flexShrink:0}}>
        <div className="flex items-center gap-3">
          <img src="/icon_03.png" alt="그래프 나타내기" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none tracking-tight">3단계</h1>
            <p className="text-[12px] text-slate-400 font-bold mt-1">그래프 나타내기</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(n => (
            <div key={n} className={`h-1 rounded-full transition-all duration-300 ${n===3 ? 'w-6 bg-gsp-600' : 'w-1.5 bg-slate-200'}`} />
          ))}
        </div>
      </header>

      {/* ── 전체화면 오버레이 ── */}
      {isFullscreen && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'#fff',
          display:'flex', flexDirection:'column',
        }}>
          {/* 전체화면 툴바: 최소화된 도구들 + 닫기 */}
          <div style={{
            flexShrink:0,
            padding:'6px 12px',
            borderBottom:'1px solid #eee',
            display:'flex',
            alignItems:'center',
            gap:8,
            background:'#fafafa',
          }}>
            {/* 도구/색상 요약 표시는 DrawingCanvas 내부에서 처리 */}
            <div style={{flex:1,fontSize:12,color:'#8C7B6E',fontWeight:600}}>직접 그리기</div>
            <button
              onClick={exitFullscreen}
              style={{
                padding:'5px 14px', borderRadius:999,
                background:'#5B41EB', color:'#fff',
                border:'none', fontSize:12, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                whiteSpace:'nowrap', flexShrink:0,
              }}
            >✕ 닫기</button>
          </div>

          {/* 전체화면 캔버스 영역: flex: 1, DrawingCanvas fills entire space */}
          <div style={{
            flex:1,
            overflow:'hidden',
            display:'flex',
            flexDirection:'column',
            padding:'8px 12px',
          }}>
            <DrawingCanvas
              code={code}
              userName={user.name}
              strokes={strokes}
              currentDrawer={currentDrawer}
              livePreview={livePreview}
              snapshotImg={step3SnapshotImg}
              onSnapshotImg={onStep3SnapshotImg}
              isMobile={isMobile}
              isFullscreen={true}
            />
          </div>
        </div>
      )}

      {/* ── 데이터 있고 PC/태블릿: 좌우 분할 ── */}
      {!isFullscreen && hasData && !isMobile ? (
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          {/* 좌측: 항목별 조사 결과 */}
          <div style={{
            width:'clamp(200px,28%,280px)', flexShrink:0,
            borderRight:'1px solid #E2E8F2', background:'#fff',
            overflowY:'auto', WebkitOverflowScrolling:'touch', padding:'14px',
          }}>
            <div style={{fontWeight:700,fontSize:13,color:'#5B41EB',marginBottom:9}}>
              {selectedPost?.question || '항목별 조사 결과'}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{borderBottom:'1px solid #e2e3e5'}}>
                  {['항목','명수','%'].map(h=>(
                    <th key={h} style={{padding:'5px 8px',textAlign:h==='항목'?'left':'right',color:'#5B41EB',fontWeight:700}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item,i)=>{
                  const v=Number(dataTable[i]?.value)||0; const pct=total?Math.round(v/total*100):0
                  return (
                    <tr key={i} style={{borderBottom:'1px solid #D1FAE5'}}>
                      <td style={{padding:'5px 8px',display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:9,height:9,borderRadius:'50%',background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>{item}
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700}}>{v}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#5B41EB',fontWeight:700}}>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 우측: 모드버튼 + 그리기/그래프 */}
          <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding:'12px 14px 20px',display:'flex',flexDirection:'column',gap:12}}>
            {modeButtons}
            {drawMode==='auto' ? (
              <Sec style={{flex:1}}>
                <Lbl mt={0}>그래프 종류</Lbl>
                <div style={{display:'flex',gap:7,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
                  {CHART_TYPES.map(c=>(
                    <button type="button" key={c.type} onClick={()=>onChartConfig({type:c.type})} style={{
                      padding:'8px 18px',minHeight:44,borderRadius:999,fontSize:14,fontWeight:700,
                      cursor:'pointer',border:'1px solid',fontFamily:'inherit',transition:'all .15s',
                      background:chartConfig.type===c.type?'#5B41EB':'#fff',
                      color:chartConfig.type===c.type?'#fff':'#8C7B6E',
                      borderColor:chartConfig.type===c.type?'#5B41EB':'#E6D8C8',
                      whiteSpace:'nowrap',flexShrink:0,
                    }}>{c.label}</button>
                  ))}
                </div>
                <Lbl>그래프 제목</Lbl>
                <Inp value={chartConfig.title} onChange={v=>onChartConfig({title:v})} placeholder="예: 우리 반 좋아하는 간식 조사 결과" style={{marginBottom:14}}/>
                {chartConfig.title&&(
                  <div style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:12,color:'#3D2B1F'}}>{chartConfig.title}</div>
                )}
                <ChartComp data={chartData}/>
              </Sec>
            ) : (
              /* 직접 그리기: Sec에 relative 설정, 전체화면 버튼 절대 배치 */
              <div style={{position:'relative',flex:1,display:'flex',flexDirection:'column'}}>
                <FullscreenBtn />
                <Sec style={{display:'flex',flexDirection:'column',flex:1}}>
                  <DrawingCanvas
                    code={code} userName={user.name} strokes={strokes}
                    currentDrawer={currentDrawer} livePreview={livePreview}
                    snapshotImg={step3SnapshotImg} onSnapshotImg={onStep3SnapshotImg}
                    isMobile={false} isFullscreen={false}
                  />
                </Sec>
              </div>
            )}
          </div>
        </div>

      ) : !isFullscreen && (
        /* ── 모바일 또는 데이터 없음: 세로 레이아웃 ── */
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
          {hasData && (
            <div style={{padding: isMobile?'10px 12px 0':'12px 14px 0'}}>
              <div style={{background:'#EEEEF3',border:'1px solid #e2e3e5',borderRadius:12,padding:'12px 16px'}}>
                <div style={{fontWeight:700,fontSize:13,color:'#5B41EB',marginBottom:9}}>
                  {selectedPost?.question || '항목별 조사 결과'}
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #e2e3e5'}}>
                      {['항목','명수','%'].map(h=>(
                        <th key={h} style={{padding:'5px 8px',textAlign:h==='항목'?'left':'right',color:'#5B41EB',fontWeight:700}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item,i)=>{
                      const v=Number(dataTable[i]?.value)||0; const pct=total?Math.round(v/total*100):0
                      return (
                        <tr key={i} style={{borderBottom:'1px solid #D1FAE5'}}>
                          <td style={{padding:'5px 8px',display:'flex',alignItems:'center',gap:7}}>
                            <div style={{width:9,height:9,borderRadius:'50%',background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>{item}
                          </td>
                          <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700}}>{v}</td>
                          <td style={{padding:'5px 8px',textAlign:'right',color:'#5B41EB',fontWeight:700}}>{pct}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{padding: isMobile?'10px 12px 20px':'12px 14px 20px', display:'flex', flexDirection:'column', gap:12}}>
            {modeButtons}
            {drawMode==='auto' ? (
              <Sec>
                <Lbl mt={0}>그래프 종류</Lbl>
                <div style={{display:'flex',gap:7,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
                  {CHART_TYPES.map(c=>(
                    <button type="button" key={c.type} onClick={()=>onChartConfig({type:c.type})} style={{
                      padding: isMobile?'8px 14px':'8px 18px',
                      minHeight:44,borderRadius:999,fontSize:14,fontWeight:700,
                      cursor:'pointer',border:'1px solid',fontFamily:'inherit',transition:'all .15s',
                      background:chartConfig.type===c.type?'#5B41EB':'#fff',
                      color:chartConfig.type===c.type?'#fff':'#8C7B6E',
                      borderColor:chartConfig.type===c.type?'#5B41EB':'#E6D8C8',
                      whiteSpace:'nowrap',flexShrink:0,
                    }}>{c.label}</button>
                  ))}
                </div>
                <Lbl>그래프 제목</Lbl>
                <Inp value={chartConfig.title} onChange={v=>onChartConfig({title:v})} placeholder="예: 우리 반 좋아하는 간식 조사 결과" style={{marginBottom:14}}/>
                {chartConfig.title&&(
                  <div style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:12,color:'#3D2B1F'}}>{chartConfig.title}</div>
                )}
                <ChartComp data={chartData}/>
              </Sec>
            ) : (
              /* 직접 그리기 (모바일): Sec + 전체화면 버튼 우상단 */
              <div style={{position:'relative'}}>
                <FullscreenBtn />
                <Sec style={{display:'flex',flexDirection:'column',minHeight: isMobile?360:'auto'}}>
                  <DrawingCanvas
                    code={code} userName={user.name} strokes={strokes}
                    currentDrawer={currentDrawer} livePreview={livePreview}
                    snapshotImg={step3SnapshotImg} onSnapshotImg={onStep3SnapshotImg}
                    isMobile={isMobile} isFullscreen={false}
                  />
                </Sec>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
