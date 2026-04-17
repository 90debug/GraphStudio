'use client'
import { useState, useEffect, useRef } from 'react'
import { CHART_COLORS } from '../../lib/constants'
import { Sec, Tag, Btn, Modal } from './ui'
import { useDevice } from '../../lib/DeviceContext'
import { createSurvey, getSurvey, addSurveyResponse } from '../../lib/firestore'

function SurveyModal({ survey, userName, surveyCode, onClose }) {
  const [selected, setSelected] = useState('')
  const [done,     setDone]     = useState(false)
  const [loading,  setLoading]  = useState(false)

  async function submit() {
    if (!selected) return
    setLoading(true)
    await addSurveyResponse(surveyCode, userName, selected)
    setDone(true); setLoading(false)
    setTimeout(onClose, 1800)
  }

  return (
    <Modal onClose={onClose}>
      <div style={{fontSize:13,fontWeight:700,color:'#4EACD9',marginBottom:6,letterSpacing:.3}}>📋 {survey.groupName||surveyCode} 모둠의 설문조사</div>
      <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>{survey.topic}</div>
      <div style={{fontSize:14,color:'#8C7B6E',marginBottom:18,lineHeight:1.6}}>📌 {survey.question}</div>
      {done?(
        <div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontSize:40}}>✅</div><div style={{fontWeight:700,marginTop:10,color:'#5BBF7A',fontSize:15}}>참여 완료!</div></div>
      ):(
        <>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
            {survey.items?.map((item,i)=>(
              <label key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:10,
                border:`2px solid ${selected===item?'#4EACD9':'#E6D8C8'}`,background:selected===item?'#EBF7FF':'#fff',
                cursor:'pointer',fontWeight:selected===item?700:400,transition:'all .15s',minHeight:44}}>
                <input type="radio" name="sv" value={item} checked={selected===item} onChange={()=>setSelected(item)} style={{accentColor:'#4EACD9',width:17,height:17}}/>
                <span style={{fontSize:15}}>{item}</span>
              </label>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={onClose} color="gray" style={{flex:1}}>닫기</Btn>
            <Btn onClick={submit} color="blue" disabled={!selected||loading} style={{flex:2}}>{loading?'제출 중...':'✉️ 제출하기'}</Btn>
          </div>
        </>
      )}
    </Modal>
  )
}

export default function Step2({ user, code, selectedPost, dataTable, onChange, surveyActive, survey, surveyResponses, activeStep = 2 }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'

  const [tab,         setTab]         = useState('create')
  const [lookupCode,  setLookupCode]  = useState('')
  const [surveyModal, setSurveyModal] = useState(null)
  const prevPostIdRef = useRef(null)

  const items = selectedPost?.items || []
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)

  useEffect(() => {
    if (!selectedPost?.postId) return
    if (prevPostIdRef.current && prevPostIdRef.current !== selectedPost.postId) {
      onChange(selectedPost.items.map(label => ({ label, value: '' })))
    }
    prevPostIdRef.current = selectedPost.postId
  }, [selectedPost?.postId]) // eslint-disable-line

  useEffect(() => {
    if (!surveyResponses?.length || !items.length) return
    const counts = {}
    items.forEach(item => { counts[item] = 0 })
    surveyResponses.forEach(r => { if (counts[r.selectedItem] !== undefined) counts[r.selectedItem]++ })
    onChange(items.map(label => ({ label, value: String(counts[label] || 0) })))
  }, [surveyResponses]) // eslint-disable-line

  async function doCreateSurvey() {
    if (!selectedPost) return alert('탐구 문제를 먼저 선정해 주세요')
    await createSurvey(code, { groupName: user.groupName, topic: selectedPost.topic, question: selectedPost.question, items: selectedPost.items, roomCode: code })
    setTab('results')
  }

  async function doLookupSurvey() {
    const c = lookupCode.trim().toUpperCase()
    if (!c) return
    const sv = await getSurvey(c)
    if (sv) { setSurveyModal({ ...sv, code: c }); setLookupCode('') }
    else alert(`"${c}" 코드의 설문조사를 찾을 수 없어요`)
  }

  function updateValue(i, v) {
    onChange(items.map((label, idx) => ({ label, value: idx === i ? v : (dataTable[idx]?.value || '') })))
  }

  const TABS = [
    { id: 'create',  label: '📨 설문 만들기' },
    { id: 'results', label: '📊 결과 확인' },
    { id: 'join',    label: '🙋 설문 참여' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
      {/* 자체 스텝 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 14px',
        background:'linear-gradient(135deg,#EBF7FF,#fff)',
        borderBottom:'2px solid #93D1F5',flexShrink:0,position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',right:-10,top:-10,width:50,height:50,
          borderRadius:'50%',background:'rgba(78,172,217,.10)',pointerEvents:'none'}}/>
        <img src="/step2_icon.png" alt="Step 2"
          style={{width:34,height:34,display:'block',flexShrink:0}}/>
        <div style={{fontWeight:800,fontSize:15,color:'#2785B5',letterSpacing:'-0.2px'}}>자료 수집하기</div>
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          {[1,2,3,4].map(n=>(
            <div key={n} style={{width:n<=activeStep?20:8,height:7,borderRadius:999,
              background:n<=activeStep?'#4EACD9':'#E6D8C8',transition:'all .3s',
              boxShadow:n<=activeStep?'0 2px 6px rgba(78,172,217,.40)':'none'}}/>
          ))}
        </div>
      </div>
      {/* 탭바 */}
      <div style={{display:'flex',gap:0,borderBottom:'1px solid #dbdbdb',overflowX:'auto',flexShrink:0,background:'#fff'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding: isMobile ? '10px 14px' : '10px 16px',
            fontSize: isMobile ? 13 : 14,
            fontWeight:tab===t.id?700:400,
            color:tab===t.id?'#3D2B1F':'#8C7B6E',
            borderBottom:`2px solid ${tab===t.id?'#3D2B1F':'transparent'}`,
            marginBottom:-1,background:'none',border:'none',
            borderBottom:`2px solid ${tab===t.id?'#3D2B1F':'transparent'}`,
            cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
            minHeight: 44,
          }}>{t.label}</button>
        ))}
      </div>

      {/* 스크롤 영역 */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding: isMobile ? '12px 12px' : '14px'}}>

        {/* 설문조사 만들기 탭 */}
        {tab==='create'&&(
          <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:14,alignItems:'flex-start'}}>
            <div style={{flex:1}}>
              {selectedPost?(
                <Sec style={{background:'#FFF7ED',border:'1.5px solid #F97316',marginBottom:0}}>
                  <div style={{fontWeight:700,fontSize:13,color:'#C2410C',marginBottom:8}}>✅ 선정된 탐구 문제</div>
                  <div style={{fontSize:15,fontWeight:700}}>{selectedPost.topic}</div>
                  <div style={{fontSize:13,color:'#8C7B6E',marginTop:5,marginBottom:11,lineHeight:1.6}}>📌 {selectedPost.question}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {selectedPost.items?.map((item,i)=><Tag key={i} color={CHART_COLORS[i%CHART_COLORS.length]}>{item}</Tag>)}
                  </div>
                </Sec>
              ):(
                <Sec style={{background:'#FFFBEB',border:'1px dashed #F59E0B',marginBottom:0}}>
                  <div style={{fontSize:14,color:'#B45309',fontWeight:700}}>⚠️ 우리 모둠의 탐구 문제를 먼저 선정해 주세요.</div>
                </Sec>
              )}
            </div>
            <div style={{flex:1}}>
              {!surveyActive?(
                <Sec style={{marginBottom:0}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:10}}>📨 설문조사 만들기</div>
                  <div style={{fontSize:14,color:'#8C7B6E',marginBottom:14,lineHeight:1.75}}>
                    선정된 탐구 문제로 설문조사를 만들어요.<br/>
                    모둠 코드 <b style={{color:'#4EACD9',letterSpacing:1}}>{code}</b>를 친구들에게 알려 주세요!
                  </div>
                  <Btn onClick={doCreateSurvey} color="blue" disabled={!selectedPost} full={isMobile}>만들기</Btn>
                </Sec>
              ):(
                <Sec style={{background:'#EBF7FF',border:'1px solid #BFDBFE',marginBottom:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontSize:28}}>📋</div>
                    <div>
                      <div style={{fontSize:14,color:'#4EACD9',fontWeight:700}}>설문조사 진행 중!</div>
                      <div style={{fontSize:13,marginTop:3}}>코드 <b style={{color:'#F97316',fontSize:16,letterSpacing:2}}>{code}</b>를 친구들에게 알려 주세요</div>
                    </div>
                  </div>
                  {surveyResponses.length>0&&(
                    <div style={{marginTop:10,fontSize:12,fontWeight:700,color:'#4EACD9'}}>
                      {surveyResponses.length}명 참여 완료 →{' '}
                      <button onClick={()=>setTab('results')} style={{color:'#4EACD9',textDecoration:'underline',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:12}}>응답 확인하기</button>
                    </div>
                  )}
                </Sec>
              )}
            </div>
          </div>
        )}

        {/* 응답 확인 탭 */}
        {tab==='results'&&(
          <div>
            {!surveyActive?(
              <Sec>
                <div style={{textAlign:'center',padding:'28px 0',color:'#8C7B6E'}}>
                  <div style={{fontSize:36,marginBottom:10}}>📭</div>
                  <div style={{fontSize:15,fontWeight:700,color:'#64748B'}}>진행 중인 설문조사가 없어요.</div>
                  <div style={{fontSize:13,marginTop:6}}>설문조사를 먼저 만들어 주세요.</div>
                </div>
              </Sec>
            ):items.length===0?(
              <Sec><div style={{textAlign:'center',padding:24,color:'#8C7B6E',fontSize:14}}>💡 Step 1에서 탐구 문제를 선정하면 여기에 항목이 나타나요</div></Sec>
            ):(
              <>
                <div style={{marginBottom:12,padding:'9px 14px',background:'#FFF7ED',borderRadius:8,border:'1px solid #FED7AA',fontSize:13,color:'#C2410C',fontWeight:600,lineHeight:1.6}}>
                  📌 {selectedPost?.topic} — {selectedPost?.question}
                </div>
                <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:12,alignItems:'flex-start'}}>
                  {surveyActive&&surveyResponses.length>0&&(
                    <Sec style={{flex:1,background:'#EBF7FF',border:'1px solid #BFDBFE',marginBottom: isMobile ? 0 : 0}}>
                      <div style={{fontSize:14,fontWeight:700,color:'#4EACD9',marginBottom:10}}>📊 실시간 응답 ({surveyResponses.length}명)</div>
                      {items.map(item=>{
                        const cnt=surveyResponses.filter(r=>r.selectedItem===item).length
                        const pct=surveyResponses.length?Math.round(cnt/surveyResponses.length*100):0
                        return(
                          <div key={item} style={{marginBottom:10}}>
                            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:5}}>
                              <span>{item}</span><span style={{fontWeight:700,color:'#4EACD9'}}>{cnt}명 ({pct}%)</span>
                            </div>
                            <div style={{height:10,borderRadius:999,background:'#93D1F5',overflow:'hidden'}}>
                              <div style={{width:`${pct}%`,height:'100%',background:'#4EACD9',borderRadius:999,transition:'width .5s'}}/>
                            </div>
                          </div>
                        )
                      })}
                    </Sec>
                  )}
                  <Sec style={{flex:1,marginBottom:0}}>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:12}}>📥 항목별 조사 결과</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:8}}>
                      {items.map((item,i)=>(
                        <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'10px 12px',borderRadius:12,background:CHART_COLORS[i%CHART_COLORS.length]+'10',border:`1.5px solid ${CHART_COLORS[i%CHART_COLORS.length]}30`}}>
                          <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:CHART_COLORS[i%CHART_COLORS.length]+'20',color:CHART_COLORS[i%CHART_COLORS.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800}}>{i+1}</div>
                          <span style={{fontSize:13,fontWeight:700,color:'#334155',textAlign:'center',lineHeight:1.3}}>{item}</span>
                          <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <input type="number" min="0" max="999" value={dataTable[i]?.value||''} onChange={e=>updateValue(i,e.target.value)} placeholder="0"
                              style={{width:60,padding:'7px 6px',borderRadius:8,border:'1.5px solid #dbdbdb',fontSize:18,fontWeight:800,textAlign:'center',fontFamily:'inherit',outline:'none',background:'#fff'}}/>
                            <span style={{fontSize:12,color:'#8C7B6E'}}>명</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {total>0&&(
                      <div style={{marginTop:12,padding:'10px 12px',background:'#EDFAF2',borderRadius:10,border:'1px solid #A7F3D0'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                          <thead><tr style={{borderBottom:'1px solid #A7F3D0'}}>{['항목','명수','%'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:h==='항목'?'left':'right',color:'#2D9950',fontWeight:700}}>{h}</th>)}</tr></thead>
                          <tbody>
                            {items.map((item,i)=>{const v=Number(dataTable[i]?.value)||0;const pct=total?Math.round(v/total*100):0;return(
                              <tr key={i} style={{borderBottom:'1px solid #D1FAE5'}}>
                                <td style={{padding:'5px 6px',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item}</td>
                                <td style={{padding:'5px 6px',textAlign:'right',fontWeight:700}}>{v}</td>
                                <td style={{padding:'5px 6px',textAlign:'right',color:'#5BBF7A',fontWeight:700}}>{pct}%</td>
                              </tr>
                            )})}
                            <tr><td style={{padding:'6px 6px',fontWeight:700}}>합계</td><td style={{padding:'6px 6px',textAlign:'right',fontWeight:700}}>{total}</td><td style={{padding:'6px 6px',textAlign:'right',fontWeight:700,color:'#5BBF7A'}}>100%</td></tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Sec>
                </div>
              </>
            )}
          </div>
        )}

        {/* 설문조사 참여하기 탭 */}
        {tab==='join'&&(
          <Sec>
            <div style={{fontWeight:700,fontSize:15,marginBottom:9}}>🙋 설문조사 참여하기</div>
            <div style={{fontSize:14,color:'#8C7B6E',marginBottom:14,lineHeight:1.75}}>
              다른 모둠에서 공유한 <b style={{color:'#3D2B1F'}}>6자리 코드</b>를 입력하면 해당 설문에 참여할 수 있어요.
            </div>
            <input value={lookupCode} onChange={e=>setLookupCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&doLookupSurvey()}
              maxLength={6} placeholder="ABC123"
              style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:10,border:'1.5px solid #dbdbdb',fontSize:20,fontWeight:700,letterSpacing:5,textTransform:'uppercase',fontFamily:'inherit',textAlign:'center',outline:'none',background:'#fafafa',minHeight:50,display:'block',marginBottom:10}}/>
            <Btn onClick={doLookupSurvey} color="blue" full={isMobile} style={{width: isMobile ? '100%' : undefined, padding:'12px 22px'}}>✉️ 참여하기</Btn>
            <div style={{fontSize:13,color:'#8C7B6E',marginTop:10}}>💡 설문 코드는 다른 모둠의 참여 코드와 동일해요</div>
          </Sec>
        )}
      </div>

      {surveyModal&&<SurveyModal survey={surveyModal} userName={user.name} surveyCode={surveyModal.code} onClose={()=>setSurveyModal(null)}/>}
    </div>
  )
}
