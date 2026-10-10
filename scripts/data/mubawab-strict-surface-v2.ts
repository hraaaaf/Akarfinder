import { load } from "cheerio";

type SurfaceEvidence={value:number,evidence:string,confidence:"high"};
type SurfaceInspection={surface:SurfaceEvidence|null,conflict:boolean};

function surfaceValues(text:string):number[]{
 const normalized=text.replace(/\s+/g," ");
 const found=new Set<number>();
 for(const m of normalized.matchAll(/(?<!\d)(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/giu)){
  const n=Number(m[1].replace(",","."));
  if(Number.isFinite(n)&&n>=5&&n<=100000)found.add(n);
 }
 return [...found];
}

export function hasMubawabPrimaryDetail(html:string):boolean{
 const $=load(html);
 return $(".blockProp").filter((_:any,el:any)=>$(el).find("h1.searchTitle").length===1).length===1;
}

export function inspectMubawabStrictSurface(html:string):SurfaceInspection{
 const $=load(html);
 const main=$(".blockProp").filter((_:any,el:any)=>$(el).find("h1.searchTitle").length===1);
 const primaryValues=new Set<number>();
 if(main.length>1)return {surface:null,conflict:true};
 if(main.length===1){
  main.find("h1.searchTitle, p").each((_:any,el:any)=>{
   const direct=$(el).contents().filter((_:any,n:any)=>n.type==="text").toArray().map((n:any)=>n.data||"").join(" ").replace(/\s+/g," ").trim();
   if(!/\b(?:surface|superficie)\b/i.test(direct))return;
   for(const n of surfaceValues(direct))primaryValues.add(n);
  });
  const root=main.closest(".col-8");
  if(root.length===1){
   root.find(".adDetails .adDetailFeature > span").each((_:any,el:any)=>{
    if($(el).closest(".contentBox,.dataRelat,.listingTit,.related,.recommendations").length)return;
    for(const n of surfaceValues($(el).text()))primaryValues.add(n);
   });
  }
 }
 if(primaryValues.size>1)return {surface:null,conflict:true};

 const selectors=["[class*='blockDetails'] li","[class*='ficheDetails'] li","[class*='caracteristiques'] li","[class*='Caracteristiques'] li","[class*='criteria'] li","[class*='detail-features'] li","table[class*='fiche'] tr","table[class*='detail'] tr"].join(",");
 const labeled=new Set<number>();
 $(selectors).each((_:any,el:any)=>{
  const item=$(el);
  if(item.closest(".dataRelat,.contentBox,.related,.recommendations").length)return;
  if(main.length===1){
   const root=main.closest(".col-8");
   if(root.length===1&&!root.is(item)&&!root.has(item).length)return;
  }
  const label=item.find("[class*='titreFiche'],[class*='label'],[class*='key'],th,dt").first().text().replace(/\s+/g," ").trim();
  const value=item.find("[class*='titreFicheValue'],[class*='value'],[class*='val'],td,dd").first().text().replace(/\s+/g," ").trim();
  if(!/^(?:surface|superficie)(?:\s+(?:habitable|totale))?\s*:?$/i.test(label))return;
  for(const n of surfaceValues(value))labeled.add(n);
 });
 if(labeled.size>1 || (primaryValues.size===1&&labeled.size===1&&[...primaryValues][0]!==[...labeled][0])){
  return {surface:null,conflict:true};
 }
 if(primaryValues.size===1)return {surface:{value:[...primaryValues][0],evidence:"mubawab_primary_blockProp_or_col8_features",confidence:"high"},conflict:false};
 if(labeled.size===1)return {surface:{value:[...labeled][0],evidence:"mubawab_labeled_surface_dom",confidence:"high"},conflict:false};
 return {surface:null,conflict:false};
}

export function extractMubawabStrictSurface(html:string):SurfaceEvidence|null{
 return inspectMubawabStrictSurface(html).surface;
}
