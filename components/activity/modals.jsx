'use client'
import { useEffect } from 'react'

// ─── ConfirmResetModal ────────────────────────────────────────────────────
export function ConfirmResetModal({ topicName, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(61,43,31,.52)', backdropFilter:'blur(3px)', zIndex:10002,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'28px 24px 22px',
        maxWidth:'min(400px,94vw)', width:'100%',
        boxShadow:'0 20px 60px rgba(91,65,235,.18)', animation:'fadeUp .25s cubic-bezier(.34,1.3,.64,1)',
        position:'relative', overflow:'hidden' }}>
        <div style={{ width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#EEEEF3,#c7c3f7)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 16px',
          boxShadow:'0 4px 12px rgba(91,65,235,.20)' }}>⚠️</div>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ fontSize:16,fontWeight:800,color:'#1E293B',marginBottom:10 }}>탐구 문제를 다시 선정할까요?</div>
          <div style={{ fontSize:13,color:'#64748B',lineHeight:1.75,padding:'10px 14px',
            background:'#EEEEF3',borderRadius:12,border:'1px solid #e2e3e5' }}>
            이미 설문 조사가 진행 중인 탐구 문제가 있습니다.<br/>
            <b style={{ color:'#5B41EB' }}>새로운 문제를 선정하면 모든 내용이 초기화됩니다.</b>
          </div>
          {topicName && (
            <div style={{ marginTop:10,fontSize:12,color:'#94A3B8' }}>
              현재 선정된 문제: <b style={{ color:'#475569' }}>{topicName}</b>
            </div>
          )}
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} style={{ flex:1,padding:'12px',borderRadius:999,background:'#F8FAFC',
            color:'#64748B',border:'1.5px solid #E2E8F2',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>취소</button>
          <button onClick={onConfirm} style={{ flex:1,padding:'12px',borderRadius:999,
            background:'#5B41EB',color:'#fff',border:'none',
            fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
            boxShadow:'0 4px 12px rgba(91,65,235,.35)' }}>다시 선정하기</button>
        </div>
      </div>
    </div>
  )
}

// ─── VoteModal ────────────────────────────────────────────────────────────
// onClose  = 단순 dismiss (모달만 닫기, 투표 유지)
// onDecline = 투표 취소 (모달 닫기 + Firestore 투표 삭제)
export function VoteModal({ vote, myName, onAgree, onClose, onDecline, onCancel, isRequester }) {
  const alreadyAgreed = vote?.agreed?.includes(myName)
  const agreedCount   = vote?.agreed?.length  || 0
  const totalVoters   = vote?.voters?.length  || 1
  const allAgreed     = agreedCount >= totalVoters && totalVoters > 0

  useEffect(() => {
    if (!allAgreed) return
    const t = setTimeout(() => onClose?.(), 1500)
    return () => clearTimeout(t)
  }, [allAgreed, onClose])

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(61,43,31,.52)',backdropFilter:'blur(3px)',
      zIndex:10001,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:16,padding:'28px 22px 22px',
        maxWidth:'min(390px,94vw)',width:'100%',
        boxShadow:'0 8px 32px rgba(91,65,235,.18)',animation:'fadeUp .25s cubic-bezier(.34,1.3,.64,1)',
        border:'1px solid #e2e3e5',position:'relative' }}>
        <button onClick={allAgreed ? onClose : onDecline} style={{
          position:'absolute', top:14, right:14,
          width:28, height:28, borderRadius:'50%',
          background:'transparent', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, color:'#94A3B8', fontWeight:700,
        }}>✕</button>

        <div style={{ textAlign:'center',marginBottom:20 }}>
          <div style={{ fontSize:40,marginBottom:8 }}>🗳️</div>
          <div style={{ fontSize:18,fontWeight:800,color:'#1E293B',letterSpacing:'-0.3px' }}>탐구 문제 선정 투표</div>
          <div style={{ fontSize:13,color:'#8a949e',marginTop:6,fontWeight:500 }}>
            <span style={{ display:'inline-block',padding:'3px 10px',borderRadius:999,background:'#EEEEF3',
              color:'#5B41EB',fontWeight:700,fontSize:13 }}>{vote?.requestedBy}</span>님이 선정을 요청했어요
          </div>
        </div>

        <div style={{ background:'#EEEEF3',border:'1px solid #e2e3e5',
          borderRadius:8,padding:'14px 16px',marginBottom:18 }}>
          <div style={{ fontSize:11,color:'#5B41EB',fontWeight:700,marginBottom:7,letterSpacing:'0.5px',textTransform:'uppercase' }}>선정 후보 내용</div>
          <div style={{ fontSize:14,lineHeight:1.75,color:'#1E293B',whiteSpace:'pre-line',fontWeight:500 }}>{vote?.postData?.content}</div>
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,color:'#8a949e',marginBottom:8,fontWeight:600 }}>
            <span>찬성 현황</span>
            <span style={{ background:'#EEEEF3',color:'#5B41EB',padding:'2px 10px',borderRadius:999,border:'1px solid #9395ff',fontWeight:700 }}>{agreedCount} / {totalVoters}명</span>
          </div>
          <div style={{ height:8,borderRadius:4,background:'#eeeef3',overflow:'hidden' }}>
            <div style={{ width:`${(agreedCount/totalVoters)*100}%`,height:'100%',background:'#5B41EB',borderRadius:4,transition:'width .5s cubic-bezier(.34,1.3,.64,1)' }}/>
          </div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:7,marginTop:10 }}>
            {vote?.voters?.map(name=>(
              <div key={name} style={{ padding:'4px 12px',borderRadius:999,fontSize:12,fontWeight:600,
                background:vote?.agreed?.includes(name)?'#EEEEF3':'#f8f8fb',
                color:vote?.agreed?.includes(name)?'#5B41EB':'#94A3B8',
                border:`1px solid ${vote?.agreed?.includes(name)?'#9395ff':'#e2e3e5'}`,
                transition:'all .2s' }}>
                {name}{vote?.agreed?.includes(name)?' ✓':''}
              </div>
            ))}
          </div>
        </div>

        {allAgreed ? (
          <div style={{ textAlign:'center',padding:'14px',background:'#EEEEF3',
            borderRadius:8,fontSize:15,fontWeight:700,color:'#5B41EB',border:'1px solid #9395ff' }}>
            전원 찬성! 잠시 후 자동으로 선정돼요...
          </div>
        ) : alreadyAgreed ? (
          <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
            <div style={{ textAlign:'center',padding:'13px',background:'#EEEEF3',
              borderRadius:8,fontSize:14,fontWeight:700,color:'#5B41EB',border:'1px solid #9395ff' }}>
              찬성 완료! 다른 모둠원을 기다리는 중...
            </div>
            {isRequester && (
              <button onClick={onDecline} style={{ padding:'11px',borderRadius:999,background:'#FFF0F1',color:'#C0364A',
                border:'1px solid #FFB0B0',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>
                투표 취소
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
            <div style={{ padding:'10px 14px',background:'#EEEEF3',border:'1px solid #e2e3e5',borderRadius:8,
              fontSize:12,color:'#555555',lineHeight:1.65,fontWeight:500 }}>
              <b>나중에</b>를 누르면 이번 투표가 <b>즉시 취소</b>돼요.<br/>
              모둠원 모두가 찬성해야 탐구 문제가 선정됩니다.
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={onDecline} style={{ flex:1,padding:'13px',borderRadius:999,background:'#f8f8fb',
                color:'#8a949e',border:'1px solid #e2e3e5',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
                minHeight:48 }}>나중에</button>
              <button onClick={onAgree} style={{ flex:2,padding:'13px',borderRadius:999,
                background:'#5B41EB',color:'#fff',border:'none',
                fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 4px 14px rgba(91,65,235,.35)',minHeight:48 }}>
                찬성하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
