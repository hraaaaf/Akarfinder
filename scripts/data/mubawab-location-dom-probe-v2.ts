import { load } from "cheerio";

const normalize=(value:string)=>value.replace(/\s+/g," ").trim();
function safeLocationText(value:string):string|null{
 const x=normalize(value).slice(0,150);
 if(x.length<2||x.length>105||/\d{3,}|@|https?:|www\.|(?:\+?212|0)[5-7][\d .-]{7,}/i.test(x))return null;
 if(!/^[\p{L}\p{M}0-9][\p{L}\p{M}0-9 '\u2019,./()\-–àâéêèîôûùç]*$/u.test(x))return null;
 if(x.split(/\s+/).length>12)return null;
 return x;
}
function summarize(el:any,$:ReturnType<typeof load>){
 const x=$(el);
 return {tag:el?.tagName||null,classes:(x.attr("class")||"").slice(0,95),itemprop:(x.attr("itemprop")||"").slice(0,45)};
}
export function probeMubawabLocationDom(html:string){
 const $=load(html);
 const main=$(".blockProp").filter((_:any,el:any)=>$(el).find("h1.searchTitle").length===1);
 const root=main.closest(".col-8");
 const seen=new Set<string>();
 const observations:Array<{scope:string,text:string,element:ReturnType<typeof summarize>,parent:ReturnType<typeof summarize>}>=[]; 
 function collect(scope:string,selector:string,context:ReturnType<typeof $>){
  context.find(selector).each((_:any,el:any)=>{
   if(observations.length>=45)return false;
   const node=$(el);
   const t=safeLocationText(node.text());
   if(!t)return;
   const item={scope,text:t,element:summarize(el,$),parent:summarize(el.parent,$)};
   const key=scope+"|"+t+"|"+item.element.classes;
   if(!seen.has(key)){seen.add(key);observations.push(item);}
  });
 }
 const scope='[class*="locat"],[class*="Locat"],[class*="adress"],[class*="Adress"],[class*="address"],[class*="Address"],[class*="district"],[class*="quartier"],[itemprop*="address"],[class*="region"],[class*="Region"]';
 if(root.length===1)collect("primary_column",scope,root);
 if(main.length===1){
  collect("primary_block","span,p,small,h2,h3,[class*='adMainFeatureContentValue']",main);
 }
 collect("breadcrumb",'[class*="breadcrumb"] a,[class*="breadcrumb"] li,[class*="breadCrumb"] a,[class*="breadCrumb"] li,nav[aria-label*=breadcrumb] a',$("body"));
 const jsonld:Array<{type:string,locality:string|null,region:string|null,neighborhood:string|null}>=[];
 $('script[type="application/ld+json"]').each((_:any,el:any)=>{
  if(jsonld.length>=5)return false;
  try{
   const data=JSON.parse($(el).html()||"null");
   const nodes=Array.isArray(data)?data:[data];
   for(const n of nodes){
    if(!n||typeof n!=="object")continue;
    const addr=n.address&&typeof n.address==="object"?n.address:n.location?.address;
    if(!addr||typeof addr!=="object")continue;
    jsonld.push({type:String(n["@type"]||"").slice(0,70),locality:safeLocationText(String(addr.addressLocality||"")),region:safeLocationText(String(addr.addressRegion||"")),neighborhood:safeLocationText(String(addr.addressNeighborhood||""))});
   }
  }catch{}
 });
 return {primary_block_count:main.length,primary_column_count:root.length,observations,jsonld};
}
