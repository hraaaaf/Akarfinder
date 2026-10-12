import {load} from "cheerio";
const HOSTS=new Set(["sarouty.ma","www.sarouty.ma"]);
export function saroutyListingRoute(raw,base="https://www.sarouty.ma/"){
 try{
  const url=new URL(raw,base);
  if(url.protocol!=="https:"||!HOSTS.has(url.hostname.toLowerCase())||url.search||url.hash)return null;
  const m=url.pathname.match(/^\/(acheter|louer)\/([a-z0-9\-]+)-(\d{5,10})\/?$/i);
  if(!m)return null;
  return {source:"sarouty.ma",identity:"sarouty:"+m[3],url:url.href,intent:m[1].toLowerCase()};
 }catch{return null;}
}
export function inspectSaroutyDetail(html,requestedUrl,finalUrl,identity,httpStatus=200){
 const from=saroutyListingRoute(requestedUrl),to=saroutyListingRoute(finalUrl);
 const stable=!!from&&!!to&&from.identity===identity&&to.identity===identity;
 const $=load(html);
 const title=$("h1").first().text().replace(/\s+/g," ").trim();
 const body=$("body").text().replace(/\s+/g," ").trim();
 const unavailable=/(?:cette\s+annonce\s+n.est\s+plus\s+disponible|ce\s+bien\s+n.est\s+plus\s+disponible|this\s+(?:property|listing)\s+is\s+no\s+longer\s+available)/i.test(body);
 const primary=stable&&httpStatus===200&&title.length>=4&&title.length<=180&&!unavailable;
 return {identity,identity_preserved:stable,explicit_unavailable_banner:unavailable,primary_detail_verified:primary,
  source_page_reachable:httpStatus===200,commercial_availability_certified:false,freshness_certified:false,
  state:unavailable?"explicitly_unavailable":primary?"active_detail_candidate_unverified":"review_missing_primary_or_identity",
  database_access:0,database_writes:0};
}
