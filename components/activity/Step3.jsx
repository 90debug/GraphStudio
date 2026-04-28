'use client'
import { useState, useEffect } from 'react'
import { CHART_COLORS } from '../../lib/constants'
import { Sec, Lbl, Inp } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import DrawingCanvas from './DrawingCanvas'
import { CHART_CMPS } from './charts'

const CHART_TYPES = [
  { type:'bar',   label:'막대그래프' },
  { type:'pie',   label:'원그래프'   },
  { type:'strip', label:'띠그래프'   },
  { type:'line',  label:'꺾은선그래프' },
]

export default function Step3({
  user, code, items, dataTable, chartConfig, onChartConfig,
  strokes, currentDrawer, drawMode: _drawModeProp, onDrawMode, livePreview,
  selectedPost, step3SnapshotImg, onStep3SnapshotImg, activeStep = 3,
  readOnly = false,
}) {
  const device   = useDevice()
  const isMobile = device === 'mobile'
  // drawMode를 로컬 state로 관리 → Firestore 동기화 없이 개인별 독립 탭
  const [drawMode, setLocalDrawMode] = useState('draw')
  function handleTabClick(mode) {
    setLocalDrawMode(mode)
    // onDrawMode는 외부에서 noop으로 전달되어도 로컬은 정상 동작
  }
  const [isFullscreen, setIsFullscreen] = useState(false)
  // 제목 입력: 로컬 state에서 관리 → 추가/엔터 확정 시 onChartConfig 호출
  const [titleInput, setTitleInput] = useState(chartConfig.title || '')
  function confirmTitle() {
    const v = titleInput.trim()
    if (!v) return
    onChartConfig({ title: v })
  }
  function handleTitleKeyDown(e) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) confirmTitle()
  }

  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || CHART_CMPS.bar
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const hasData = total > 0

  function enterFullscreen() { if (!isMobile) setIsFullscreen(true) }
  function exitFullscreen()  { setIsFullscreen(false) }

  // ESC 키
  useEffect(() => {
    if (!isFullscreen) return
    function onKey(e) { if (e.key === 'Escape') exitFullscreen() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isFullscreen]) // eslint-disable-line

  // 전체화면 버튼 — Sec 컨테이너 우상단 절대 배치
  const FullscreenBtn = () => (
    <button
      onClick={enterFullscreen}
      title="전체 화면으로 그리기 (ESC로 종료)"
      style={{
        position:'absolute', top:10, right:10, zIndex:10,
        width:30, height:30, borderRadius:8,
        background:'rgba(255,255,255,0.95)', border:'1px solid #e2e3e5',
        display:'flex', alignItems:'center', justifyContent:'center',
        cursor:'pointer', fontSize: isMobile ? 13 : 15, color:'#5B41EB',
        fontFamily:'inherit', boxShadow:'0 2px 6px rgba(0,0,0,0.08)',
        transition:'all .15s', fontWeight:700, lineHeight:1,
      }}
      onMouseEnter={e=>{e.currentTarget.style.background='#5B41EB';e.currentTarget.style.color='#fff'}}
      onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.95)';e.currentTarget.style.color='#5B41EB'}}
    >⛶</button>
  )

  // 모드 토글 (인라인 JSX, 내부 컴포넌트 금지)
  const modeButtons = (
    <div style={{display:'flex',gap:7,flexShrink:0}}>
      {[['draw','직접 그리기','#5B41EB'],['auto','자동 그래프','#5B41EB']].map(([mode,label,clr])=>(
        <button key={mode} type="button" onClick={()=>handleTabClick(mode)} style={{
          flex:1, padding:isMobile?'10px 8px':'9px 20px', minHeight:44, borderRadius:999,
          fontSize:isMobile?13:15, fontWeight:700, cursor:'pointer', border:'1px solid',
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
          <img src="/icon_03.png" alt="그래프로 나타내기" style={{width:36,height:36,objectFit:'contain',flexShrink:0}}/>
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none tracking-tight">3단계</h1>
            <p style={{ fontSize: isMobile ? 12 : 14, color:'#8A949E', fontWeight:700, marginTop:4 }}>그래프로 나타내기</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(n=>(
            <div key={n} className={`h-1 rounded-full transition-all duration-300 ${n===3?'w-6 bg-gsp-600':'w-1.5 bg-slate-200'}`}/>
          ))}
        </div>
      </header>

      {/* ══ 전체화면 오버레이 (PC/태블릿 전용) ══ */}
      {isFullscreen && !isMobile && (
        <div style={{
          position:'fixed', inset:0, zIndex:9999,
          background:'#fff',
          display:'flex', flexDirection:'column',
          // 전체 화면 = 스크롤 없이 화면을 꽉 채움
        }}>
          {/* 최소화된 툴바: 닫기 버튼만 */}
          <div style={{
            flexShrink:0, height:44,
            padding:'0 12px',
            display:'flex', alignItems:'center', justifyContent:'flex-end',
            borderBottom:'1px solid #eee', background:'#fafafa', gap:8,
          }}>
            <span style={{flex:1,fontSize: isMobile ? 11 : 13,color:'#94A3B8'}}>ESC 또는 닫기 버튼으로 종료</span>
            <button
              onClick={exitFullscreen}
              style={{
                padding:'5px 16px', borderRadius:999,
                background:'#5B41EB', color:'#fff',
                border:'none', fontSize: isMobile ? 12 : 14, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                whiteSpace:'nowrap', flexShrink:0,
              }}
            >✕ 닫기</button>
          </div>

          {/* 캔버스 영역: 남은 공간 전체 사용 */}
          <div style={{
            flex:1, overflow:'hidden',
            display:'flex', flexDirection:'column',
            padding:'8px 10px 10px',
          }}>
            <DrawingCanvas
              code={code} userName={user.name}
              strokes={strokes} currentDrawer={currentDrawer} livePreview={livePreview}
              snapshotImg={step3SnapshotImg} onSnapshotImg={onStep3SnapshotImg}
              isMobile={false} isFullscreen={true}
            />
          </div>
        </div>
      )}

      {/* ══ 데이터 있고 PC/태블릿: 좌우 분할 ══ */}
      {!isFullscreen && hasData && !isMobile ? (
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          {/* 좌측: 항목별 조사 결과 */}
          <div style={{
            width:'clamp(200px,26%,270px)', flexShrink:0,
            borderRight:'1px solid #E2E8F2', background:'#fff',
            overflowY:'auto', WebkitOverflowScrolling:'touch', padding:14,
          }}>
            <div style={{fontWeight:700,fontSize: isMobile ? 13 : 15,color:'#5B41EB',marginBottom:9}}>
              {selectedPost?.question||'항목별 조사 결과'}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize: isMobile ? 13 : 15}}>
              <thead>
                <tr style={{borderBottom:'1px solid #e2e3e5'}}>
                  {['항목','수','%'].map(h=>(
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

          {/* 우측: 모드버튼 + 내용 */}
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
                {/* 제목 입력: 로컬 입력 → 엔터/추가 버튼으로 확정 */}
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10}}>
                  <input
                    value={titleInput}
                    onChange={e=>setTitleInput(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder="예: 공공 예절별 학생 수의 비율"
                    style={{flex:1,padding:'10px 14px',borderRadius:8,border:'1px solid #E2E3E5',fontSize:13,fontWeight:400,outline:'none',background:'#fff',fontFamily:'inherit'}}
                    onFocus={e=>e.target.style.borderColor='#5B41EB'}
                    onBlur={e=>e.target.style.borderColor='#E2E3E5'}
                  />
                  <button
                    type="button"
                    onClick={confirmTitle}
                    style={{padding:'10px 16px',borderRadius:999,background:chartConfig.title?'#8382e2':'#5B41EB',color:'#fff',border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap',minHeight:42}}
                  >{chartConfig.title ? '수정' : '추가'}</button>
                </div>
                {chartConfig.title&&(
                  <div style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:12,color:'#3D2B1F'}}>{chartConfig.title}</div>
                )}
                <ChartComp data={chartData}/>
              </Sec>
            ) : (
              /* 직접 그리기: 전체화면 버튼을 Sec 컨테이너 우상단에 배치 */
              <div style={{position:'relative',flex:1,display:'flex',flexDirection:'column'}}>
                <FullscreenBtn/>
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
        /* ══ 모바일 또는 데이터 없음: 세로 레이아웃 ══ */
        <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
          {hasData && (
            <div style={{padding:isMobile?'10px 12px 0':'12px 14px 0'}}>
              <div style={{background:'#EEEEF3',border:'1px solid #e2e3e5',borderRadius:12,padding:'12px 16px'}}>
                <div style={{fontWeight:700,fontSize: isMobile ? 13 : 15,color:'#5B41EB',marginBottom:9}}>
                  {selectedPost?.question||'항목별 조사 결과'}
                </div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize: isMobile ? 13 : 15}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #e2e3e5'}}>
                      {['항목','수','%'].map(h=>(
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

          <div style={{padding:isMobile?'10px 12px 20px':'12px 14px 20px',display:'flex',flexDirection:'column',gap:12}}>
            {modeButtons}
            {drawMode==='auto' ? (
              <Sec>
                <Lbl mt={0}>그래프 종류</Lbl>
                <div style={{display:'flex',gap:7,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
                  {CHART_TYPES.map(c=>(
                    <button type="button" key={c.type} onClick={()=>onChartConfig({type:c.type})} style={{
                      padding:isMobile?'8px 14px':'8px 18px',
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
                {/* 제목 입력: 로컬 입력 → 엔터/추가 버튼으로 확정 */}
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:10,overflow:'hidden'}}>
                  <input
                    value={titleInput}
                    onChange={e=>setTitleInput(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder="예: 공공 예절별 학생 수의 비율"
                    style={{flex:1,minWidth:0,padding:'10px 10px',borderRadius:8,border:'1px solid #E2E3E5',fontSize:13,fontWeight:400,outline:'none',background:'#fff',fontFamily:'inherit'}}
                    onFocus={e=>e.target.style.borderColor='#5B41EB'}
                    onBlur={e=>e.target.style.borderColor='#E2E3E5'}
                  />
                  <button
                    type="button"
                    onClick={confirmTitle}
                    style={{padding:'10px 12px',borderRadius:999,background:chartConfig.title?'#8382e2':'#5B41EB',color:'#fff',border:'none',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap',minHeight:42}}
                  >{chartConfig.title ? '수정' : '추가'}</button>
                </div>
                {chartConfig.title&&(
                  <div style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:12,color:'#3D2B1F'}}>{chartConfig.title}</div>
                )}
                <ChartComp data={chartData}/>
              </Sec>
            ) : (
              /* 모바일 직접 그리기: 전체화면 버튼 없음 */
              <Sec style={{display:'flex',flexDirection:'column',minHeight:isMobile?360:'auto'}}>
                <DrawingCanvas
                  code={code} userName={user.name} strokes={strokes}
                  currentDrawer={currentDrawer} livePreview={livePreview}
                  snapshotImg={step3SnapshotImg} onSnapshotImg={onStep3SnapshotImg}
                  isMobile={isMobile} isFullscreen={false}
                />
              </Sec>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
