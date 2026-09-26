export function deepJsonLdNodes(input: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[]=[];
  const seen=new Set<object>();
  const walk=(v:unknown)=>{
    if(!v||typeof v!=="object") return;
    if(seen.has(v as object)) return;
    seen.add(v as object);
    if(Array.isArray(v)){for(const x of v)walk(x);return;}
    const o=v as Record<string,unknown>;
    out.push(o);
    for(const value of Object.values(o)) walk(value);
  };
  walk(input);
  return out;
}
function numeric(v:unknown):number|null{
  if(typeof v==="number"&&Number.isFinite(v)) return v;
  if(typeof v!=="string") return null;
  const cleaned=v.replace(/[\s\u202f\u00a0]/g,"").replace(/,/g,".");
  const n=Number(cleaned); return Number.isFinite(n)?n:null;
}
export function jsonLdPrice(nodes:unknown[]):number|null{
  const candidates:number[]=[];
  for(const n of deepJsonLdNodes(nodes)){
    for(const k of ["price","lowPrice","highPrice"]){
      const x=numeric(n[k]);
      if(x!==null&&x>=100&&x<=1_000_000_000)candidates.push(x);
    }
  }
  return candidates.length?Math.max(...candidates):null;
}
export function jsonLdSurface(nodes:unknown[]):number|null{
  const candidates:number[]=[];
  for(const n of deepJsonLdNodes(nodes)){
    const type=String(n["@type"]??"").toLowerCase();
    if(["quantitativevalue","propertyvalue"].includes(type)){
      const x=numeric(n.value);
      const unit=String(n.unitCode??n.unitText??"").toLowerCase();
      if(x!==null&&x>=5&&x<=100000&&(!unit||/mtk|m2|m²|square|metre|meter/.test(unit))) candidates.push(x);
    }
    for(const k of ["floorSize","area","surface"]){
      const v=n[k];
      if(v&&typeof v==="object"){
        const x=numeric((v as any).value);
        if(x!==null&&x>=5&&x<=100000)candidates.push(x);
      } else {
        const x=numeric(v);
        if(x!==null&&x>=5&&x<=100000)candidates.push(x);
      }
    }
  }
  return candidates.length?Math.max(...candidates):null;
}
export function jsonLdBedrooms(nodes:unknown[]):number|null{
  const vals:number[]=[];
  for(const n of deepJsonLdNodes(nodes)){
    for(const k of ["numberOfBedrooms","numberOfRooms"]){
      const x=numeric(n[k]); if(x!==null&&x>=0&&x<=50) vals.push(x);
    }
  }
  return vals.length?Math.max(...vals):null;
}
