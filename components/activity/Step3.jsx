'use client'
import { CHART_COLORS } from '../../lib/constants'
import { Sec, Lbl, Inp } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import DrawingCanvas from './DrawingCanvas'
import { CHART_CMPS } from './charts'

export default function Step3({ user, code, items, dataTable, chartConfig, onChartConfig, strokes, currentDrawer, drawMode, onDrawMode, livePreview, selectedPost, step3SnapshotImg, onStep3SnapshotImg, activeStep = 3 }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'

  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || CHART_CMPS.bar
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)

  const CHART_TYPES = [
    { type:'bar',   label:'막대그래프', emoji:'📊' },
    { type:'pie',   label:'원그래프',   emoji:'🥧' },
    { type:'strip', label:'띠그래프',   emoji:'🎨' },
  ]

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
      {/* 자체 스텝 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',
        background:'linear-gradient(135deg,#F0FDF4,#fff)',
        borderBottom:'2px solid #A7F3D0',flexShrink:0,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-10,top:-10,width:50,height:50,
          borderRadius:'50%',background:'rgba(91,191,122,.10)',pointerEvents:'none'}}/>
        <img src="/step3_icon.png" alt="Step 3"
          style={{width:34,height:34,flexShrink:0,objectFit:'contain'}}/>
        <div style={{fontWeight:800,fontSize:15,color:'#2D9950',letterSpacing:'-0.2px'}}>그래프로 나타내기</div>
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          {[1,2,3,4].map(n=>(
            <div key={n} style={{width:n<=activeStep?20:8,height:7,borderRadius:999,
              background:n<=activeStep?'#5BBF7A':'#E6D8C8',transition:'all .3s',
              boxShadow:n<=activeStep?'0 2px 6px rgba(91,191,122,.40)':'none'}}/>
          ))}
        </div>
      </div>
      {/* 데이터 요약 테이블 */}
      {total > 0 && (
        <div style={{flexShrink:0,padding: isMobile ? '10px 12px 0' : '12px 14px 0'}}>
          <div style={{background:'#EDFAF2',border:'1px solid #A7F3D0',borderRadius:12,padding:'12px 16px'}}>
            <div style={{fontWeight:700,fontSize:13,color:'#2D9950',marginBottom:9}}>
              {selectedPost?.question ? <span>🔍 {selectedPost.question}</span> : '📊 항목별 조사 결과'}
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{borderBottom:'1px solid #A7F3D0'}}>
                  {['항목','명수','백분율(%)'].map(h=>(
                    <th key={h} style={{padding:'5px 8px',textAlign:h==='항목'?'left':'right',color:'#2D9950',fontWeight:700}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item,i)=>{
                  const v=Number(dataTable[i]?.value)||0; const pct=total?Math.round(v/total*100):0
                  return(
                    <tr key={i} style={{borderBottom:'1px solid #D1FAE5'}}>
                      <td style={{padding:'5px 8px',display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:9,height:9,borderRadius:'50%',background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>{item}
                      </td>
                      <td style={{padding:'5px 8px',textAlign:'right',fontWeight:700}}>{v}</td>
                      <td style={{padding:'5px 8px',textAlign:'right',color:'#5BBF7A',fontWeight:700}}>{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 모드 토글 */}
      <div style={{flexShrink:0,padding: isMobile ? '10px 12px 0' : '12px 14px 0'}}>
        <div style={{display:'flex',gap:7}}>
          {[['draw','✏️ 직접 그리기','#C97DE8'],['auto','📊 자동 그래프','#5BBF7A']].map(([mode,label,clr])=>(
            <button key={mode} type="button" onClick={()=>onDrawMode(mode)} style={{
              flex:1,
              padding: isMobile ? '10px 8px' : '9px 20px',
              minHeight:44,borderRadius:999,
              fontSize: isMobile ? 13 : 14,
              fontWeight:700,cursor:'pointer',border:'1.5px solid',
              fontFamily:'inherit',transition:'all .15s',
              background:drawMode===mode?clr:'#ffffff',
              color:drawMode===mode?'#fff':'#8C7B6E',
              borderColor:drawMode===mode?clr:'#E6D8C8',
              whiteSpace:'nowrap',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding: isMobile ? '10px 12px 20px' : '12px 14px 20px'}}>
        {drawMode==='auto'?(
          <Sec>
            <Lbl mt={0}>📊 그래프 종류</Lbl>
            <div style={{display:'flex',gap:7,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
              {CHART_TYPES.map(c=>(
                <button type="button" key={c.type} onClick={()=>onChartConfig({type:c.type})} style={{
                  padding: isMobile ? '8px 14px' : '8px 18px',
                  minHeight:44,borderRadius:999,fontSize:14,fontWeight:700,
                  cursor:'pointer',border:'1.5px solid',fontFamily:'inherit',transition:'all .15s',
                  background:chartConfig.type===c.type?'#5BBF7A':'#fff',
                  color:chartConfig.type===c.type?'#fff':'#8C7B6E',
                  borderColor:chartConfig.type===c.type?'#5BBF7A':'#E6D8C8',
                  whiteSpace:'nowrap', flexShrink:0,
                }}>{c.emoji} {c.label}</button>
              ))}
            </div>
            <Lbl>✏️ 그래프 제목</Lbl>
            <Inp value={chartConfig.title} onChange={v=>onChartConfig({title:v})} placeholder="예: 우리 반 좋아하는 간식 조사 결과" style={{marginBottom:14}}/>
            {chartConfig.title&&(
              <div style={{fontWeight:700,fontSize:16,textAlign:'center',marginBottom:12,color:'#3D2B1F'}}>{chartConfig.title}</div>
            )}
            <ChartComp data={chartData}/>
          </Sec>
        ):(
          <Sec style={{display:'flex',flexDirection:'column',minHeight: isMobile ? 360 : 'auto'}}>
            <DrawingCanvas code={code} userName={user.name} strokes={strokes} currentDrawer={currentDrawer} livePreview={livePreview} snapshotImg={step3SnapshotImg} onSnapshotImg={onStep3SnapshotImg}/>
          </Sec>
        )}
      </div>
    </div>
  )
}
