import { load } from "cheerio";
function parse(v:string){const m=v.replace(/\s+/g," ").match(/(\d{1,6}(?:[.,]\d+)?)\s*m(?:²|2)(?=\s|$|[^\p{L}\p{N}_])/iu);if(!m)return null;const n=Math.round(Number(m[1].replace(",",".")));return Number.isFinite(n)&&n>=5&&n<=100000?n:null;}
export function extractMubawabStrictSurface(html:string){
 const $=load(html); const selectors=["[class*='blockDetails'] li","[class*='ficheDetails'] li","[class*='caracteristiques'] li","[class*='Caracteristiques'] li","[class*='criteria'] li","[class*='detail-features'] li","table[class*='fiche'] tr","table[class*='detail'] tr"].join(",");
 let result:any=null;
 $(selectors).each((_:any,el:any)=>{if(result)return false;const item=$(el);const label=item.find("[class*='titreFiche'], [class*='label'], [class*='key'], th, dt").first().text().replace(/\s+/g," ").trim();const value=item.find("[class*='titreFicheValue'], [class*='value'], [class*='val'], td, dd").first().text().replace(/\s+/g," ").trim();if(!/^(?:surface|superficie)(?:\s+(?:habitable|totale))?\s*:?$/i.test(label))return;const n=parse(value);if(n)result={value:n,evidence:"mubawab_labeled_surface_dom",confidence:"high"};}); return result;
}
