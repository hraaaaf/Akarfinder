import { VERIFIED_LANDMARKS } from "@/lib/geo/territory-landmark-registry";

const casa = VERIFIED_LANDMARKS.filter((entry) => entry.entity.citySlug === "casablanca");
const bounds = { minLat: 33.43, maxLat: 33.64, minLng: -7.74, maxLng: -7.55 };
const px = (lng:number) => ((lng-bounds.minLng)/(bounds.maxLng-bounds.minLng))*100;
const py = (lat:number) => (1-((lat-bounds.minLat)/(bounds.maxLat-bounds.minLat)))*100;

export default function LandmarkSeedVisualQA() {
  return (
    <main style={{minHeight:"100vh",background:"#f5f8fc",padding:"32px",fontFamily:"Inter, Arial, sans-serif",color:"#071B33"}}>
      <div style={{maxWidth:1360,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:24,marginBottom:20}}>
          <div>
            <div style={{fontSize:12,fontWeight:800,letterSpacing:1.8,textTransform:"uppercase",color:"#60738a"}}>AkarFinder · Visual QA</div>
            <h1 style={{fontSize:38,lineHeight:1.05,margin:"8px 0 6px",letterSpacing:-1.4}}>Casablanca · Landmark Dictionary</h1>
            <p style={{margin:0,color:"#60738a",fontWeight:600}}>Coordonnées réelles du registre — validation de densité et de placement avant merge.</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <span style={{background:"#071B33",color:"white",padding:"9px 12px",borderRadius:999,fontSize:12,fontWeight:800}}>CASABLANCA</span>
            <span style={{background:"white",border:"1px solid #dbe5ef",padding:"9px 12px",borderRadius:999,fontSize:12,fontWeight:800}}>{casa.length} REPÈRES</span>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 360px",gap:20}}>
          <section style={{position:"relative",height:720,overflow:"hidden",borderRadius:28,background:"linear-gradient(180deg,#eef5fb 0%,#e9f0f6 100%)",border:"1px solid #dbe5ef",boxShadow:"0 24px 70px rgba(7,27,51,.10)"}}>
            <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(7,27,51,.035) 1px, transparent 1px),linear-gradient(90deg, rgba(7,27,51,.035) 1px, transparent 1px)",backgroundSize:"44px 44px"}}/>
            <div style={{position:"absolute",left:24,top:22,fontSize:13,fontWeight:900,letterSpacing:.3}}>Casablanca · quartiers canoniques</div>
            <div style={{position:"absolute",left:24,bottom:18,fontSize:11,color:"#6a7c91",fontWeight:700}}>Projection QA locale · pas une carte routière</div>
            {casa.map(({entity})=>{
              const c=entity.coordinates!;
              const left=Math.max(5,Math.min(90,px(c.lng)));
              const top=Math.max(8,Math.min(88,py(c.lat)));
              const iconic=entity.importance.score>=95;
              return <div key={entity.id} style={{position:"absolute",left:left+"%",top:top+"%",transform:"translate(-50%,-50%)",zIndex:iconic?3:2}}>
                <div style={{display:"flex",alignItems:"center",gap:8,background:iconic?"rgba(255,255,255,.98)":"rgba(255,255,255,.88)",border:iconic?"1px solid rgba(7,27,51,.16)":"1px solid rgba(7,27,51,.09)",borderRadius:iconic?12:9,padding:iconic?"8px 10px":"6px 8px",boxShadow:iconic?"0 8px 24px rgba(7,27,51,.11)":"0 4px 12px rgba(7,27,51,.07)",minWidth:iconic?138:118}}>
                  <span style={{width:iconic?11:8,height:iconic?11:8,borderRadius:999,background:"#071B33",boxShadow:"0 0 0 4px rgba(7,27,51,.08)",flex:"0 0 auto"}}/>
                  <span style={{minWidth:0}}>
                    <span style={{display:"block",fontSize:iconic?11.5:10.5,fontWeight:iconic?850:750,whiteSpace:"nowrap"}}>{entity.canonicalName}</span>
                    <span style={{display:"block",fontSize:9,color:"#718196",fontWeight:700,marginTop:1,whiteSpace:"nowrap"}}>{entity.districtSlug} · {entity.importance.score}</span>
                  </span>
                </div>
              </div>
            })}
          </section>
          <aside style={{background:"white",border:"1px solid #dbe5ef",borderRadius:24,padding:18,boxShadow:"0 18px 48px rgba(7,27,51,.065)",height:720,overflow:"auto"}}>
            <div style={{fontSize:11,fontWeight:900,letterSpacing:1.4,textTransform:"uppercase",color:"#708198"}}>Repères du registre</div>
            <h2 style={{fontSize:24,margin:"7px 0 14px",letterSpacing:-.7}}>Base Casablanca</h2>
            <div style={{display:"grid",gap:9}}>
              {casa.slice().sort((a,b)=>b.entity.importance.score-a.entity.importance.score).map(({entity})=>
                <div key={entity.id} style={{padding:"11px 12px",border:"1px solid #e4ebf2",borderRadius:14,background:"#fbfdff"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"baseline"}}>
                    <strong style={{fontSize:12.5}}>{entity.canonicalName}</strong>
                    <span style={{fontSize:10,fontWeight:900,color:entity.importance.score>=95?"#0B63CE":"#60738a"}}>{entity.importance.score}</span>
                  </div>
                  <div style={{marginTop:3,fontSize:10.5,color:"#718196",fontWeight:700}}>{entity.districtSlug} · {entity.category}</div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
