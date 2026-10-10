import { load } from "cheerio";
export function probeMubawabSurfaceDom(html:string){
 const $=load(html);
 const structures:any[]=[];
 const seen=new Set<string>();
 const format=(el:any)=>{if(!el||el.type!=="tag")return null;const x=$(el);return {tag:el.tagName,classes:(x.attr("class")||"").slice(0,110),id:(x.attr("id")||"").slice(0,60)};};
 $("body *").each((_:any,el:any)=>{
  if(structures.length>=45)return false;
  if(["script","style","noscript"].includes(el.tagName))return;
  const direct=$(el).contents().filter((_:any,n:any)=>n.type==="text").toArray().map((n:any)=>n.data||"").join(" ").replace(/\s+/g," ").trim();
  if(!direct||direct.length>350)return;
  const matches=[...direct.matchAll(/(?<!\d)(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/giu)];
  for(const m of matches){
   const n=Number(m[1].replace(",","."));
   if(!Number.isFinite(n)||n<5||n>100000)continue;
   const parent=el.parent; const grand=parent?.parent;
   const record={value:n,element:format(el),parent:format(parent),grandparent:format(grand),label_hint:/\b(?:surface|superficie|habitable|totale)\b/i.test(direct)?"surface":/\bterrain\b/i.test(direct)?"terrain":null};
   const k=JSON.stringify(record);if(!seen.has(k)){seen.add(k);structures.push(record);}
   if(structures.length>=45)break;
  }
 });
 const nodes=$("script[type='application/ld+json']").length;
 return {html_bytes:html.length,jsonld_script_count:nodes,surface_leaf_occurrences:structures.length,surface_leaf_structures:structures};
}
