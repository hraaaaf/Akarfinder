export function extractMubawabStrictSurfaceFromUrl(url:string){
 let path=''; try{path=decodeURIComponent(new URL(url).pathname);}catch{return null;}
 const route=path.match(/^\/(?:fr|en|ar|es|it|nl)\/(?:a|pa)\/\d+\/(.+)$/i); if(!route)return null;
 const text=route[1].replace(/-/g,' '); const vals:number[]=[];
 for(const m of text.matchAll(/(?<!\d)(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/giu)){
  const n=Math.round(Number(m[1].replace(',','.'))); if(Number.isFinite(n)&&n>=5&&n<=100000&&!vals.includes(n))vals.push(n);
 }
 if(vals.length!==1)return null;
 return {value:vals[0],evidence:'mubawab_canonical_detail_slug_explicit_m2',confidence:'high' as const};
}
