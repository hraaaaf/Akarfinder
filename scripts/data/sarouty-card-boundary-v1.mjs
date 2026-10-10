import {load} from "cheerio";
import {saroutyListingRoute} from "./sarouty-detail-identity-v1.mjs";
const trimmed=x=>String(x??"").replace(/\s+/g," ").trim();
const money=/\d[\d \u00a0\u202f.,]{2,}\s*(?:DH|DHS|MAD)\b/i;
const area=/\d+(?:[.,]\d+)?\s*m(?:²|2)(?![\p{L}\p{N}])/iu;
export function inspectSaroutyCardBoundaries(html,baseUrl,{limit=12}={}){
 const $=load(html),seen=new Set(),profiles=[];
 for(const a of $("a[href]").toArray()){
  const source=saroutyListingRoute($(a).attr("href"),baseUrl);
  if(!source||seen.has(source.identity))continue;
  seen.add(source.identity);
  const levels=[];
  for(const [depth,el] of $(a).parents().slice(0,8).toArray().entries()){
   const node=$(el),tags=node.find("a[href]").toArray();
   const unique=new Set(tags.map(tag=>saroutyListingRoute($(tag).attr("href"),baseUrl)?.identity).filter(Boolean));
   const val=trimmed(node.text());
   const classes=trimmed(node.attr("class")).split(" ").filter(Boolean).slice(0,5);
   levels.push({depth,tag:el.tagName||null,classes:classes.map(x=>x.slice(0,42)),text_length:val.length,
    source_ids_in_subtree:unique.size,price_pattern:money.test(val),surface_pattern:area.test(val),
    location_class_nodes:node.find("[class*='location'],[class*='Location'],[class*='address'],[class*='Address']").length});
  }
  profiles.push({index:profiles.length,parents:levels,
   first_single_id_with_price_and_surface:levels.find(x=>x.source_ids_in_subtree===1&&x.price_pattern&&x.surface_pattern)?.depth??null});
  if(profiles.length>=limit)break;
 }
 return {schema_version:"AKARFINDER_SAROUTY_DOM_BOUNDARY_DIAGNOSTIC_V1",
  semantics:"tag_class_and_count_only_no_raw_html_listing_text_ids_contact_or_urls",
  unique_detail_links_seen:seen.size,profiles};
}
