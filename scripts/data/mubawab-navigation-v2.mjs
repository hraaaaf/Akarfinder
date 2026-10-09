import { parseMubawabRoute } from "./mubawab-url-parser-v2.mjs";

const LOCALES=new Set(["fr","en","ar","es","it","nl"]);
const SEARCH_PREFIXES=new Set(["is","sc","cd","pc","ps","cl","s","search","recherche","immobilier","appartements","terrains"]);
const ERROR_PREFIXES=new Set(["404","not-found","error","login","connexion"]);

function parseUrl(url){
 try { return new URL(url); } catch { return null; }
}

function officialHost(host){
 return host==="mubawab.ma"||host==="www.mubawab.ma";
}

function idBand(route){
 if(!route) return null;
 const id=Number(route.id);
 if(!Number.isSafeInteger(id)) return null;
 const start=Math.floor(id/100000)*100000;
 return String(start)+"-"+String(start+99999);
}

const ROUTE_PREFIX_ALLOWLIST=new Set(["a","pa","b","ad","ads","is","sc","cd","pc","ps","cl","s","search","recherche","immobilier","annonce","annonces","location","vente","404","not-found","error","login","connexion"]);
function safePathProfile(final,requestRoute,locale){
 const parts=final.pathname.split("/").filter(Boolean);
 const suffix=locale?parts.slice(1):parts;
 const sourceId=requestRoute?.id??null;
 const classify=(segment)=>{
  if(LOCALES.has(segment.toLowerCase()))return "locale";
  if(sourceId!==null&&segment===sourceId)return "requested_id";
  if(/^\d{1,12}$/.test(segment))return "other_number";
  if(ROUTE_PREFIX_ALLOWLIST.has(segment.toLowerCase()))return "known_route";
  if(/^[a-z]{1,3}$/i.test(segment))return "short_alpha";
  if(/^[a-z]{4,20}$/i.test(segment))return "alpha";
  if(/^[a-z0-9-]{4,}$/i.test(segment))return "slug_like";
  return "mixed";
 };
 const pathShape=parts.slice(0,5).map(classify).join("/");
 const first=suffix[0]||"";
 const routePrefix=ROUTE_PREFIX_ALLOWLIST.has(first.toLowerCase())?first.toLowerCase():"unrecognized";
 return {
  final_path_depth:Math.min(parts.length,6),
  final_route_prefix:routePrefix,
  final_route_shape:pathShape,
  final_requested_id_in_path:sourceId!==null&&parts.some(p=>p===sourceId),
  final_has_other_numeric_segment:parts.some(p=>/^\d{1,12}$/.test(p)&&p!==sourceId)
 };
}

/**
 * Anonymized final-navigation evidence only: never returns the destination URL,
 * its query string, untrusted path segments, title or HTML.
 * "other_path" is not proof that a listing is unavailable.
 */
export function classifyMubawabNavigation(requestedUrl,finalUrl,fetchRedirected=false){
 const requested=parseUrl(requestedUrl);
 const final=parseUrl(finalUrl);
 const requestRoute=requested?parseMubawabRoute(requested.href):null;
 const base={
  requested_valid:!!requestRoute,
  request_id_band:idBand(requestRoute),
  request_kind:requestRoute?.kind??null,
  http_redirected:fetchRedirected===true,
  identity_preserved:false,
  final_category:"invalid_final_url",
  final_locale:null,
  final_host:"invalid"
 };
 if(!final)return base;
 const host=final.hostname.toLowerCase();
 const hostClass=officialHost(host)?"mubawab_official":"external_host";
 const parts=final.pathname.split("/").filter(Boolean);
 const locale=LOCALES.has((parts[0]||"").toLowerCase())?parts[0].toLowerCase():null;
 const common={...base,final_host:hostClass,final_locale:locale,...(hostClass==="mubawab_official"?safePathProfile(final,requestRoute,locale):{})};
 if(hostClass!=="mubawab_official")return {...common,final_category:"external_host"};
 const detail=parseMubawabRoute(final.href);
 if(detail){
  const preserved=!!requestRoute && detail.identity===requestRoute.identity;
  return {...common,identity_preserved:preserved,final_category:preserved?"same_detail_identity":"different_detail_identity"};
 }
 if(parts.length===0)return {...common,final_category:"site_home"};
 if(parts.length===1&&locale)return {...common,final_category:"locale_home"};
 const prefix=(locale?parts[1]:parts[0]||"").toLowerCase();
 if(SEARCH_PREFIXES.has(prefix))return {...common,final_category:"search_or_catalog"};
 if(ERROR_PREFIXES.has(prefix))return {...common,final_category:"error_or_auth_page"};
 if(prefix==="a"||prefix==="pa")return {...common,final_category:"unrecognized_detail_route"};
 return {...common,final_category:locale?"locale_other_path":"site_other_path"};
}
