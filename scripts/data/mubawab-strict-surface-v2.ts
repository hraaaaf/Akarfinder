import { load } from "cheerio";

type SurfaceEvidence={value:number,evidence:string,confidence:"high"};

function parseM2(value:string):number|null {
 const m=value.replace(/\s+/g," ").match(/(?<!\d)(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/iu);
 if(!m)return null;
 const n=Number(m[1].replace(",","."));
 return Number.isFinite(n)&&n>=5&&n<=100000?n:null;
}

export function hasMubawabPrimaryDetail(html:string):boolean {
 const $=load(html);
 return $(".blockProp").filter((_:any,el:any)=>$(el).find("h1.searchTitle").length===1).length===1;
}

export function extractMubawabStrictSurface(html:string):SurfaceEvidence|null {
 const $=load(html);
 const main=$(".blockProp").filter((_:any,el:any)=>$(el).find("h1.searchTitle").length===1);
 const values=new Set<number>();
 if(main.length===1){
  main.find("h1.searchTitle, p").each((_:any,el:any)=>{
   const direct=$(el).contents().filter((_:any,n:any)=>n.type==="text").toArray().map((n:any)=>n.data||"").join(" ").replace(/\s+/g," ").trim();
   if(!/\b(?:surface|superficie)\b/i.test(direct))return;
   const n=parseM2(direct);if(n!==null)values.add(n);
  });
  const root=main.closest(".col-8");
  if(root.length===1){
   root.find(".adDetails .adDetailFeature > span").each((_:any,el:any)=>{
    if($(el).closest(".contentBox,.dataRelat,.listingTit,.related,.recommendations").length)return;
    const n=parseM2($(el).text());if(n!==null)values.add(n);
   });
  }
  if(values.size>1)return null;
  if(values.size===1)return {value:[...values][0],evidence:"mubawab_primary_blockProp_or_col8_features",confidence:"high"};
 }
 const selectors=["[class*='blockDetails'] li","[class*='ficheDetails'] li","[class*='caracteristiques'] li","[class*='Caracteristiques'] li","[class*='criteria'] li","[class*='detail-features'] li","table[class*='fiche'] tr","table[class*='detail'] tr"].join(",");
 const labeled=new Set<number>();
 $(selectors).each((_:any,el:any)=>{
  const item=$(el);
  if(item.closest(".dataRelat,.contentBox,.related,.recommendations").length)return;
  const label=item.find("[class*='titreFiche'],[class*='label'],[class*='key'],th,dt").first().text().replace(/\s+/g," ").trim();
  const value=item.find("[class*='titreFicheValue'],[class*='value'],[class*='val'],td,dd").first().text().replace(/\s+/g," ").trim();
  if(!/^(?:surface|superficie)(?:\s+(?:habitable|totale))?\s*:?$/i.test(label))return;
  const n=parseM2(value);if(n!==null)labeled.add(n);
 });
 if(labeled.size===1 && values.size===0)return {value:[...labeled][0],evidence:"mubawab_labeled_surface_dom",confidence:"high"};
 return null;
}
