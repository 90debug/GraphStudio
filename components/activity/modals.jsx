'use client'

// ─── ConfirmResetModal ────────────────────────────────────────────────────
export function ConfirmResetModal({ topicName, onConfirm, onCancel }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(61,43,31,.52)', backdropFilter:'blur(3px)', zIndex:10002,
      display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:24, padding:'28px 24px 22px',
        maxWidth:'min(400px,94vw)', width:'100%',
        boxShadow:'0 20px 60px rgba(61,43,31,.28)', animation:'fadeUp .25s cubic-bezier(.34,1.3,.64,1)',
        border:'3px solid #FECACA', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',
          background:'rgba(239,68,68,.06)',pointerEvents:'none' }}/>
        <div style={{ width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#FEF2F2,#FECACA)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 16px',
          boxShadow:'0 4px 12px rgba(239,68,68,.20)' }}>⚠️</div>
        <div style={{ textAlign:'center', marginBottom:18 }}>
          <div style={{ fontSize:16,fontWeight:800,color:'#1E293B',marginBottom:10 }}>탐구 문제를 다시 선정할까요?</div>
          <div style={{ fontSize:13,color:'#64748B',lineHeight:1.75,padding:'10px 14px',
            background:'#FEF2F2',borderRadius:12,border:'1px solid #FECACA' }}>
            이미 설문 조사가 진행 중인 탐구 문제가 있습니다.<br/>
            <b style={{ color:'#DC2626' }}>새로운 문제를 선정하면 모든 내용이 초기화됩니다.</b>
          </div>
          {topicName && (
            <div style={{ marginTop:10,fontSize:12,color:'#94A3B8' }}>
              현재 선정된 문제: <b style={{ color:'#475569' }}>{topicName}</b>
            </div>
          )}
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} style={{ flex:1,padding:'12px',borderRadius:12,background:'#F8FAFC',
            color:'#64748B',border:'1.5px solid #E2E8F2',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit' }}>취소</button>
          <button onClick={onConfirm} style={{ flex:1,padding:'12px',borderRadius:12,
            background:'linear-gradient(135deg,#EF4444,#DC2626)',color:'#fff',border:'none',
            fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
            boxShadow:'0 4px 12px rgba(239,68,68,.35)' }}>다시 선정하기</button>
        </div>
      </div>
    </div>
  )
}

// ─── VoteModal ────────────────────────────────────────────────────────────
export function VoteModal({ vote, myName, onAgree, onClose, onCancel, isRequester }) {
  const alreadyAgreed = vote?.agreed?.includes(myName)
  const agreedCount   = vote?.agreed?.length  || 0
  const totalVoters   = vote?.voters?.length  || 1
  const allAgreed     = agreedCount >= totalVoters && totalVoters > 0

  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(61,43,31,.52)',backdropFilter:'blur(3px)',
      zIndex:10001,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}>
      <div style={{ background:'#fff',borderRadius:28,padding:'28px 22px 22px',
        maxWidth:'min(390px,94vw)',width:'100%',
        boxShadow:'0 20px 60px rgba(61,43,31,.28)',animation:'fadeUp .25s cubic-bezier(.34,1.3,.64,1)',
        border:'3px solid #A8ECC0',position:'relative',overflow:'hidden',
        maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',
          background:'rgba(91,191,122,.08)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',bottom:-15,left:-15,width:60,height:60,borderRadius:'50%',
          background:'rgba(78,172,217,.08)',pointerEvents:'none' }}/>

        <div style={{ textAlign:'center',marginBottom:20 }}>
          <div style={{ fontSize:40,marginBottom:8 }}>🗳️</div>
          <div style={{ fontSize:18,fontWeight:800,color:'#3D2B1F',letterSpacing:'-0.3px' }}>탐구 문제 선정 투표</div>
          <div style={{ fontSize:13,color:'#8C7B6E',marginTop:6,fontWeight:600 }}>
            <span style={{ display:'inline-block',padding:'3px 10px',borderRadius:999,background:'#EBF7FF',
              color:'#2785B5',fontWeight:800,fontSize:13 }}>{vote?.requestedBy}</span>님이 선정을 요청했어요
          </div>
        </div>

        <div style={{ background:'linear-gradient(135deg,#EDFAF2,#E0F8EA)',border:'2px solid #90DDB0',
          borderRadius:16,padding:'14px 16px',marginBottom:18,boxShadow:'0 3px 10px rgba(91,191,122,.12)' }}>
          <div style={{ fontSize:11,color:'#2D9950',fontWeight:800,marginBottom:7,letterSpacing:'0.5px',textTransform:'uppercase' }}>📋 선정 후보 내용</div>
          <div style={{ fontSize:14,lineHeight:1.75,color:'#3D2B1F',whiteSpace:'pre-line',fontWeight:600 }}>{vote?.postData?.content}</div>
        </div>

        <div style={{ marginBottom:18 }}>
          <div style={{ display:'flex',justifyContent:'space-between',fontSize:12,color:'#8C7B6E',marginBottom:8,fontWeight:700 }}>
            <span>찬성 현황</span>
            <span style={{ background:'#EDFAF2',color:'#2D9950',padding:'2px 10px',borderRadius:999,border:'1.5px solid #90DDB0',fontWeight:800 }}>{agreedCount} / {totalVoters}명</span>
          </div>
          <div style={{ height:10,borderRadius:999,background:'#F0E8DC',overflow:'hidden',border:'1.5px solid #E6D8C8' }}>
            <div style={{ width:`${(agreedCount/totalVoters)*100}%`,height:'100%',background:'linear-gradient(90deg,#5BBF7A,#2D9950)',borderRadius:999,transition:'width .5s cubic-bezier(.34,1.3,.64,1)' }}/>
          </div>
          <div style={{ display:'flex',flexWrap:'wrap',gap:7,marginTop:10 }}>
            {vote?.voters?.map(name=>(
              <div key={name} style={{ padding:'4px 12px',borderRadius:999,fontSize:12,fontWeight:700,
                background:vote?.agreed?.includes(name)?'#EDFAF2':'#FFF9F2',
                color:vote?.agreed?.includes(name)?'#2D9950':'#C4B4A8',
                border:`2px solid ${vote?.agreed?.includes(name)?'#90DDB0':'#E6D8C8'}`,
                transition:'all .2s' }}>
                {vote?.agreed?.includes(name)?'✅ ':'⏳ '}{name}
              </div>
            ))}
          </div>
        </div>

        {allAgreed ? (
          <div style={{ textAlign:'center',padding:'14px',background:'linear-gradient(135deg,#EDFAF2,#D4F5E0)',
            borderRadius:14,fontSize:15,fontWeight:800,color:'#2D9950',border:'2px solid #90DDB0' }}>
            🎉 전원 찬성! 잠시 후 자동으로 선정돼요...
          </div>
        ) : alreadyAgreed ? (
          <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
            <div style={{ textAlign:'center',padding:'13px',background:'linear-gradient(135deg,#EDFAF2,#D4F5E0)',
              borderRadius:14,fontSize:14,fontWeight:800,color:'#2D9950',border:'2px solid #90DDB0' }}>
              ✅ 찬성 완료! 다른 모둠원을 기다리는 중...
            </div>
            {isRequester && (
              <button onClick={onCancel} style={{ padding:'11px',borderRadius:14,background:'#FFF0F1',color:'#C0364A',
                border:'2px solid #FFB0B0',fontSize:13,fontWeight:800,cursor:'pointer',fontFamily:'inherit' }}>
                🔄 투표 취소하고 다시 요청하기
              </button>
            )}
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:9 }}>
            <div style={{ padding:'10px 14px',background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:12,
              fontSize:12,color:'#92400E',lineHeight:1.65,fontWeight:600 }}>
              💡 <b>나중에</b>를 누르면 이번 투표가 <b>즉시 취소</b>돼요.<br/>
              모둠원 모두가 찬성해야 탐구 문제가 선정됩니다.
            </div>
            <div style={{ display:'flex',gap:10 }}>
              <button onClick={onClose} style={{ flex:1,padding:'13px',borderRadius:14,background:'#F2EAE0',
                color:'#8C7B6E',border:'2px solid #E6D8C8',fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',
                minHeight:48 }}>나중에</button>
              <button onClick={onAgree} className="edu-btn" style={{ flex:2,padding:'13px',borderRadius:14,
                background:'linear-gradient(135deg,#5BBF7A,#2D9950)',color:'#fff',border:'none',
                fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',
                boxShadow:'0 5px 16px rgba(91,191,122,.40)',minHeight:48 }}>
                👍 찬성하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
