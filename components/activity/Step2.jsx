'use client'
import { useState, useEffect, useRef } from 'react'
import { CHART_COLORS } from '../../lib/constants'

const PURPLE_VARS = ['#5B41EB', '#7c6ff7', '#9395ff', '#4833c9', '#a09cf5', '#c7c3f7']
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
      <div style={{fontSize:13,fontWeight:700,color:'#5B41EB',marginBottom:6,letterSpacing:.3}}>{survey.groupName||surveyCode} 모둠의 설문조사</div>
      <div style={{fontSize:17,fontWeight:700,marginBottom:6}}>{survey.topic}</div>
      <div style={{fontSize:14,color:'#8C7B6E',marginBottom:18,lineHeight:1.6}}>{survey.question}</div>
      {done?(
        <div style={{textAlign:'center',padding:'20px 0'}}><div style={{fontWeight:700,marginTop:10,color:'#5B41EB',fontSize:15}}>참여 완료!</div></div>
      ):(
        <>
          <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
            {survey.items?.map((item,i)=>(
              <label key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',borderRadius:10,
                border:`1px solid ${selected===item?'#5B41EB':'#E6D8C8'}`,background:selected===item?'#EEEEF3':'#fff',
                cursor:'pointer',fontWeight:selected===item?700:400,transition:'all .15s',minHeight:44}}>
                <input type="radio" name="sv" value={item} checked={selected===item} onChange={()=>setSelected(item)} style={{accentColor:'#5B41EB',width:17,height:17}}/>
                <span style={{fontSize:15}}>{item}</span>
              </label>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <Btn onClick={onClose} color="gray" style={{flex:1}}>닫기</Btn>
            <Btn onClick={submit} color="orange" disabled={!selected||loading} style={{flex:2}}>{loading?'제출 중...':'제출하기'}</Btn>
          </div>
        </>
      )}
    </Modal>
  )
}

export default function Step2({ user, code, selectedPost, dataTable, onChange, surveyActive, survey, surveyResponses, activeStep = 2, syncTab, onTabChange }) {
  const device   = useDevice()
  const isMobile = device === 'mobile'

  const [tab, setTab] = useState('create')

  // 화면 공유 팔로워: 리더의 탭 변경 수신
  useEffect(() => {
    if (syncTab && syncTab !== tab) setTab(syncTab)
  }, [syncTab])

  function handleSetTab(id) {
    setTab(id)
    if (onTabChange) onTabChange(id)   // 리더일 때만 Firestore 기록
  }
  const [lookupCode,  setLookupCode]  = useState('')
  const [surveyModal, setSurveyModal] = useState(null)
  const prevPostIdRef = useRef(null)
  const surveyCountsRef = useRef({})

  const items = selectedPost?.items || []
  const total = dataTable.reduce((s, d) => s + (Number(d.value) || 0), 0)

  useEffect(() => {
    if (!selectedPost?.postId) return
    if (prevPostIdRef.current && prevPostIdRef.current !== selectedPost.postId) {
      onChange(selectedPost.items.map(label => ({ label, value: '' })))
      surveyCountsRef.current = {}
    }
    prevPostIdRef.current = selectedPost.postId
  }, [selectedPost?.postId]) // eslint-disable-line

  // 실시간 설문 결과를 항목별 조사 결과에 반영 (수동 입력값과 자연스럽게 연동)
  useEffect(() => {
    if (!surveyResponses?.length || !items.length) return
    const counts = {}
    items.forEach(item => { counts[item] = 0 })
    surveyResponses.forEach(r => { if (counts[r.selectedItem] !== undefined) counts[r.selectedItem]++ })
    surveyCountsRef.current = counts
    onChange(items.map((label, idx) => {
      const surveyVal = counts[label] || 0
      const currentVal = Number(dataTable[idx]?.value) || 0
      const newVal = Math.max(surveyVal, currentVal)
      return { label, value: String(newVal) }
    }))
  }, [surveyResponses]) // eslint-disable-line

  async function doCreateSurvey() {
    if (!selectedPost) return alert('탐구 문제를 먼저 선정해 주세요.')
    await createSurvey(code, { groupName: user.groupName, topic: selectedPost.topic, question: selectedPost.question, items: selectedPost.items, roomCode: code })
    handleSetTab('results')
  }

  async function doLookupSurvey() {
    const c = lookupCode.trim().toUpperCase()
    if (!c) return
    const sv = await getSurvey(c)
    if (sv) { setSurveyModal({ ...sv, code: c }); setLookupCode('') }
    else alert(`"${c}" 코드의 설문조사를 찾을 수 없어요.`)
  }

  function updateValue(i, v) {
    onChange(items.map((label, idx) => ({ label, value: idx === i ? v : (dataTable[idx]?.value || '') })))
  }

  const TABS = [
    { id: 'create',  label: '설문 만들기' },
    { id: 'results', label: '결과 확인' },
    { id: 'join',    label: '설문 참여' },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden',background:'#F3F4F8'}}>
      {/* 자체 스텝 헤더 */}
      <header className="px-6 h-14 bg-white/70 backdrop-blur-lg border-b border-slate-100 flex items-center justify-between sticky top-0 z-40" style={{flexShrink:0}}>
        <div className="flex items-center gap-3">
          <img src="/icon_02.png" alt="자료 수집하기" style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 className="text-sm font-black text-slate-800 leading-none tracking-tight">2단계</h1>
            <p style={{ fontSize: isMobile ? 12 : 14, color:'#8A949E', fontWeight:700, marginTop:4 }}>자료 수집하기</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[1,2,3,4].map(n => (
            <div key={n} className={`h-1 rounded-full transition-all duration-300 ${n===2 ? 'w-6 bg-gsp-600' : 'w-1.5 bg-slate-200'}`} />
          ))}
        </div>
      </header>

      {/* 탭바 */}
      <div style={{display:'flex',gap:0,overflowX:'auto',flexShrink:0,background:'#fff'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>handleSetTab(t.id)} style={{
            padding: isMobile ? '10px 14px' : '10px 16px',
            fontSize: isMobile ? 13 : 15,
            fontWeight:tab===t.id?700:400,
            color:tab===t.id?'#1E293B':'#94A3B8',
            borderTop:'none', borderLeft:'none', borderRight:'none',
            borderBottom:`2px solid ${tab===t.id?'#5B41EB':'transparent'}`,
            background:'none', cursor:'pointer', fontFamily:'inherit',
            whiteSpace:'nowrap', minHeight: 44,
          }}>{t.label}</button>
        ))}
      </div>

      {/* 스크롤 영역 */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch',padding: isMobile ? '12px 12px' : '14px'}}>

        {/* 설문조사 만들기 탭 */}
        {tab==='create'&&(
          <div style={{display:'flex',flexDirection: isMobile ? 'column' : 'row',gap:14,alignItems:'stretch'}}>
            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
              {selectedPost?(
                <Sec style={{background:'#fff',border:'1px solid #5B41EB',marginBottom:0,flex:1}}>
                  <div style={{fontWeight:700,fontSize: isMobile ? 13 : 15,color:'#5B41EB',marginBottom:8}}>선정된 탐구 문제</div>
                  <div style={{fontSize:15,fontWeight:700,color:'#1E293B'}}>{selectedPost.topic}</div>
                  <div style={{fontSize: isMobile ? 13 : 15,color:'#64748B',marginTop:5,marginBottom:11,lineHeight:1.6}}>{selectedPost.question}</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {selectedPost.items?.map((item,i)=>(
                      <span key={i} style={{padding:'2px 10px',borderRadius:6,background:'#F1F5F9',color:'#64748B',fontSize: isMobile ? 12 : 14,fontWeight:700,border:'1px solid rgba(203,213,225,0.5)'}}>
                        {item}
                      </span>
                    ))}
                  </div>
                </Sec>
              ):(
                <Sec style={{background:'#fff',border:'1px dashed #e2e3e5',marginBottom:0}}>
                  <div style={{fontSize:14,color:'#5B41EB',fontWeight:700}}>우리 모둠의 탐구 문제를 먼저 선정해 주세요.</div>
                </Sec>
              )}
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
              {!surveyActive?(
                <Sec style={{marginBottom:0, border:'1px solid #F1F5F9', flex:1}}>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:10,color:'#1E293B'}}>설문조사 만들기</div>
                  <div style={{fontSize: isMobile ? 14 : 15,color:'#64748B',marginBottom:14,lineHeight:1.75}}>
                    선정된 탐구 문제로 설문조사를 만들어요. 모둠 코드 <b style={{color:'#5B41EB',letterSpacing:1}}>{code}</b>를 친구들에게 알려주세요!
                  </div>
                  <Btn onClick={doCreateSurvey} color="orange" disabled={!selectedPost} full={isMobile} pill sm>만들기</Btn>
                </Sec>
              ):(
                <Sec style={{background:'#EEEEF3',border:'1px solid #e2e3e5',marginBottom:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <div style={{fontSize:28}}>📊</div>
                    <div>
                      <div style={{fontSize: isMobile ? 14 : 15,color:'#5B41EB',fontWeight:700}}>설문조사 진행 중!</div>
                      <div style={{fontSize: isMobile ? 13 : 15,marginTop:3}}>코드 <b style={{color:'#5B41EB',fontSize:16,letterSpacing:2}}>{code}</b>를 친구들에게 알려주세요!</div>
                    </div>
                  </div>
                  {surveyResponses.length>0&&(
                    <div style={{marginTop:10,fontSize: isMobile ? 12 : 14,fontWeight:700,color:'#5B41EB'}}>
                      {surveyResponses.length}명 참여 완료 →{' '}
                      <button onClick={()=>handleSetTab('results')} style={{color:'#5B41EB',textDecoration:'underline',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',fontSize: isMobile ? 12 : 14}}>응답 확인하기</button>
                    </div>
                  )}
                </Sec>
              )}
            </div>
          </div>
        )}

        {/* 결과 확인 탭 — 좌우 분할 */}
        {tab==='results'&&(
          <div>
            {!surveyActive?(
              <Sec>
                <div style={{textAlign:'center',padding:'28px 0',color:'#8C7B6E'}}>
                  <div style={{fontSize:36,marginBottom:10}}>📋</div>
                  <div style={{fontSize:15,fontWeight:700,color:'#94A3B8'}}>진행 중인 설문조사가 없어요.</div>
                  <div style={{fontSize:13,marginTop:6,color:'#94A3B8'}}>설문조사를 먼저 만들어 주세요.</div>
                </div>
              </Sec>
            ):items.length===0?(
              <Sec><div style={{textAlign:'center',padding:24,color:'#8C7B6E',fontSize:14}}>Step 1에서 탐구 문제를 선정하면 여기에 항목이 나타나요.</div></Sec>
            ):(
              <>
                <div style={{marginBottom:12,padding:'9px 14px',background:'#F8FAFC',borderRadius:8,border:'1px solid #E2E8F0',fontSize:13,color:'#1E293B',fontWeight:600,lineHeight:1.6}}>
                  {selectedPost?.topic} — {selectedPost?.question}
                </div>

                {/* 좌우 패널 */}
                <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', gap:12, alignItems: isMobile ? 'stretch' : 'flex-start'}}>
                  {/* 좌측: 항목별 조사 결과 (입력) */}
                  <Sec style={{flex:1, marginBottom:0, width: isMobile ? '100%' : undefined, boxSizing:'border-box'}}>
                    <div style={{fontWeight:700,fontSize: isMobile ? 15 : 16,marginBottom:12}}>항목별 조사 결과</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:8}}>
                      {items.map((item,i)=>{
                        const surveyCount = surveyCountsRef.current[item] || 0
                        return (
                          <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'10px 12px',borderRadius:12,background:'#EEEEF3',border:'1px solid #e2e3e5'}}>
                            <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,background:'#5B41EB',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800}}>{i+1}</div>
                            <span style={{fontSize: isMobile ? 13 : 15,fontWeight:700,color:'#334155',textAlign:'center',lineHeight:1.3}}>{item}</span>
                            <div style={{display:'flex',alignItems:'center',gap:4}}>
                              <input type="number" min="0" max="999" value={dataTable[i]?.value||''} onChange={e=>updateValue(i,e.target.value)} placeholder="0"
                                style={{width:60,padding:'7px 6px',borderRadius:8,border:'1px solid #F1F5F9',fontSize:18,fontWeight:800,textAlign:'center',fontFamily:'inherit',outline:'none',background:'#fff'}}/>
                              <span style={{fontSize: isMobile ? 12 : 14,color:'#8C7B6E'}}>명</span>
                            </div>
                            {surveyCount > 0 && (
                              <div style={{fontSize: isMobile ? 10 : 12,color:'#9395ff',fontWeight:700}}>실시간 {surveyCount}명</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Sec>

                  {/* 우측: 집계 표 */}
                  {total > 0 ? (
                    <Sec style={{flex:1, marginBottom:0}}>
                      <div style={{fontWeight:700,fontSize: isMobile ? 15 : 16,marginBottom:10}}>집계 표</div>
                      <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
                      <table style={{width:'100%',minWidth:200,borderCollapse:'collapse',fontSize: isMobile ? 12 : 14}}>
                        <thead><tr style={{borderBottom:'1px solid #e2e3e5'}}>{['항목','수','%'].map(h=><th key={h} style={{padding:'5px 6px',textAlign:h==='항목'?'left':'right',color:'#5B41EB',fontWeight:700}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {items.map((item,i)=>{const v=Number(dataTable[i]?.value)||0;const pct=total?Math.round(v/total*100):0;return(
                            <tr key={i} style={{borderBottom:'1px solid #e2e3e5'}}>
                              <td style={{padding:'5px 6px',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item}</td>
                              <td style={{padding:'5px 6px',textAlign:'right',fontWeight:700}}>{v}</td>
                              <td style={{padding:'5px 6px',textAlign:'right',color:'#5B41EB',fontWeight:700}}>{pct}%</td>
                            </tr>
                          )})}
                          <tr><td style={{padding:'6px 6px',fontWeight:700}}>합계</td><td style={{padding:'6px 6px',textAlign:'right',fontWeight:700}}>{total}</td><td style={{padding:'6px 6px',textAlign:'right',fontWeight:700,color:'#5B41EB'}}>100%</td></tr>
                        </tbody>
                      </table>
                      </div>
                    </Sec>
                  ) : (
                    <Sec style={{flex:1, marginBottom:0}}>
                      <div style={{fontSize: isMobile ? 13 : 15,color:'#94A3B8',textAlign:'center',padding:'20px 0'}}>항목별 인원수를 입력하면 집계 표가 나타나요.</div>
                    </Sec>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 설문조사 참여하기 탭 */}
        {tab==='join'&&(
          <Sec>
            <div style={{fontWeight:700,fontSize: isMobile ? 15 : 16,marginBottom:9,color:'#1E293B'}}>설문조사 참여하기</div>
            <div style={{fontSize: isMobile ? 14 : 15,color:'#64748B',marginBottom:14,lineHeight:1.75}}>
              다른 모둠에서 공유한 <b style={{color:'#1E293B'}}>6자리 코드</b>를 입력하면 해당 설문에 참여할 수 있어요.
            </div>
            <input value={lookupCode} onChange={e=>setLookupCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&doLookupSurvey()}
              maxLength={6} placeholder="ABC123"
              style={{width:'100%',boxSizing:'border-box',padding:'12px 14px',borderRadius:10,border:'1px solid #e2e3e5',fontSize:20,fontWeight:700,letterSpacing:5,textTransform:'uppercase',fontFamily:'inherit',textAlign:'center',outline:'none',background:'#F3F4F8',minHeight:50,display:'block',marginBottom:10}}/>
            <Btn onClick={doLookupSurvey} color="orange" full={isMobile} pill sm style={{width: isMobile ? '100%' : undefined}}>참여하기</Btn>
          </Sec>
        )}
      </div>

      {surveyModal&&<SurveyModal survey={surveyModal} userName={user.name} surveyCode={surveyModal.code} onClose={()=>setSurveyModal(null)}/>}
    </div>
  )
}
