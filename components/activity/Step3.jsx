'use client'
import { CHART_COLORS } from '../../lib/constants'
import { Sec, Lbl, Inp } from './ui'
import DrawingCanvas from './DrawingCanvas'
import { CHART_CMPS } from './charts'

export default function Step3({ user, code, items, dataTable, chartConfig, onChartConfig, strokes, currentDrawer, drawMode, onDrawMode, livePreview, selectedPost, step3SnapshotImg, onStep3SnapshotImg }) {
  const chartData = items.map((label, i) => ({ label, value: dataTable[i]?.value || 0 }))
  const ChartComp = CHART_CMPS[chartConfig.type] || CHART_CMPS.bar
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)

  const CHART_TYPES = [
    { type:'bar',   label:'막대그래프', emoji:'📊' },
    { type:'pie',   label:'원그래프',   emoji:'🥧' },
    { type:'strip', label:'띠그래프',   emoji:'🎨' },
  ]

  return (
    <div>
      {/* 데이터 요약 테이블 */}
      {total > 0 && (
        <Sec style={{background:'#EDFAF2',border:'1px solid #A7F3D0',padding:'12px 16px',marginBottom:12}}>
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
        </Sec>
      )}

      {/* 모드 토글 */}
      <div style={{display:'flex',gap:7,marginBottom:14,flexWrap:'wrap'}}>
        {[['auto','📊 자동 그래프','#5BBF7A'],['draw','✏️ 직접 그리기','#C97DE8']].map(([mode,label,clr])=>(
          <button key={mode} type="button" onClick={()=>onDrawMode(mode)} style={{
            padding:'9px 20px',minHeight:42,borderRadius:999,fontSize:14,fontWeight:700,
            cursor:'pointer',border:'1.5px solid',fontFamily:'inherit',transition:'all .15s',
            background:drawMode===mode?clr:'#ffffff',
            color:drawMode===mode?'#fff':'#8C7B6E',
            borderColor:drawMode===mode?clr:'#E6D8C8',
          }}>{label}</button>
        ))}
      </div>

      {drawMode==='auto'?(
        <Sec>
          <Lbl mt={0}>📊 그래프 종류</Lbl>
          <div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:14}}>
            {CHART_TYPES.map(c=>(
              <button type="button" key={c.type} onClick={()=>onChartConfig({type:c.type})} style={{
                padding:'8px 18px',minHeight:40,borderRadius:999,fontSize:14,fontWeight:700,
                cursor:'pointer',border:'1.5px solid',fontFamily:'inherit',transition:'all .15s',
                background:chartConfig.type===c.type?'#5BBF7A':'#fff',
                color:chartConfig.type===c.type?'#fff':'#8C7B6E',
                borderColor:chartConfig.type===c.type?'#5BBF7A':'#E6D8C8',
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
        <Sec>
          <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>
            ✏️ 모둠 공동 그리기
            <span style={{fontSize:13,fontWeight:400,color:'#8C7B6E',marginLeft:8}}>모눈종이 위에 모두가 함께 그릴 수 있어요</span>
          </div>
          <DrawingCanvas code={code} userName={user.name} strokes={strokes} currentDrawer={currentDrawer} livePreview={livePreview} snapshotImg={step3SnapshotImg} onSnapshotImg={onStep3SnapshotImg}/>
        </Sec>
      )}
    </div>
  )
}
