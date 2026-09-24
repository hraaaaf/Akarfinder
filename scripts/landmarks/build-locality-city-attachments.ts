#!/usr/bin/env -S npx tsx
import fs from "node:fs";
import {
  GEO_CITIES,
  normalizeGeoText,
  type CanonicalCityEntity,
} from "../../lib/geo/geo-entity-registry";
import {
  CANONICAL_CITY_REGION,
  MOROCCO_REGIONS,
  type MoroccoRegionSlug,
} from "../../lib/geo/morocco-region-registry";

type RegionContainment = {
  status: "HINT_ONLY";
  ambiguous: boolean;
  matches: Array<{
    name?: string | null;
    "name:fr"?: string | null;
    "name:ar"?: string | null;
    official_name?: string | null;
  }>;
};

type LocalityCenter = {
  osm_id: number;
  name?: string | null;
  "name:fr"?: string | null;
  "name:ar"?: string | null;
  place?: string | null;
  lat?: number | null;
  lon?: number | null;
  region_containment?: RegionContainment | null;
};

type Inventory = {
  schema_version: number;
  source_control?: Record<string, unknown>;
  urban_centers: LocalityCenter[];
};

function arg(name: string, fallback?: string): string {
  const i=process.argv.indexOf(name);
  if (i !== -1 && process.argv[i+1]) return process.argv[i+1];
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing ${name}`);
}

function rowNames(row: {
  name?: string | null;
  "name:fr"?: string | null;
  "name:ar"?: string | null;
  official_name?: string | null;
}): string[] {
  return [row.name,row["name:fr"],row["name:ar"],row.official_name]
    .filter((v): v is string => Boolean(v?.trim()))
    .map(v=>v.trim());
}

function canonicalCityMatch(center: LocalityCenter): CanonicalCityEntity | null {
  const names=rowNames(center).map(normalizeGeoText);
  const matches=GEO_CITIES.filter(city=>{
    const variants=[city.canonical_name,city.slug,...city.aliases].map(normalizeGeoText);
    return names.some(name=>variants.includes(name));
  });
  return matches.length===1 ? matches[0] : null;
}

function resolveRegion(containment?: RegionContainment | null): MoroccoRegionSlug | null {
  if (!containment || containment.ambiguous || containment.matches.length!==1) return null;
  const names=rowNames(containment.matches[0]).map(normalizeGeoText);
  const matches=MOROCCO_REGIONS.filter(region=>{
    const canonical=normalizeGeoText(region.canonical_name);
    return names.some(name=>{
      if (name===canonical) return true;
      const stripped=name
        .replace(/^region de /,"")
        .replace(/^region du /,"")
        .replace(/^region d /,"")
        .replace(/^region /,"");
      return stripped===canonical;
    });
  });
  return matches.length===1 ? matches[0].slug : null;
}

function haversineKm(a: LocalityCenter,b: LocalityCenter): number {
  if (a.lat==null||a.lon==null||b.lat==null||b.lon==null) return Number.POSITIVE_INFINITY;
  const r=6371.0088;
  const p1=a.lat*Math.PI/180;
  const p2=b.lat*Math.PI/180;
  const dphi=(b.lat-a.lat)*Math.PI/180;
  const dl=(b.lon-a.lon)*Math.PI/180;
  const x=Math.sin(dphi/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*r*Math.asin(Math.sqrt(x));
}

const inventory=JSON.parse(fs.readFileSync(arg("--inventory"),"utf8")) as Inventory;
const out=arg("--out");
const maxAttachmentKm=Number(arg("--max-attachment-km","50"));
if(inventory.schema_version!==4) throw new Error(`Expected inventory schema v4, got ${inventory.schema_version}`);
if(!Number.isFinite(maxAttachmentKm)||maxAttachmentKm<=0) throw new Error("max attachment distance must be > 0");

const cityHubCandidates=GEO_CITIES.map(city=>{
  const expectedRegion=CANONICAL_CITY_REGION[city.slug];
  const exact=inventory.urban_centers.filter(center=>{
    const match=canonicalCityMatch(center);
    return match?.slug===city.slug && resolveRegion(center.region_containment)===expectedRegion;
  });
  return {
    city,
    region_slug:expectedRegion,
    center:exact.length===1 ? exact[0] : null,
    exact_center_count:exact.length,
    status:exact.length===1 ? "USABLE_CITY_HUB_POINT" as const : "HOLD_CITY_HUB_POINT" as const,
  };
});

const attachments:any[]=[];
const holds:any[]=[];
const secondary:any[]=[];

for(const center of inventory.urban_centers){
  if(canonicalCityMatch(center)) continue;
  const name=center.name??center["name:fr"]??center["name:ar"]??null;
  const region=resolveRegion(center.region_containment);

  if(center.place!=="village"){
    secondary.push({
      osm_id:center.osm_id,
      name,
      place:center.place??null,
      region_slug:region,
      status:"SECONDARY_URBAN_CENTER_REVIEW",
      map_policy:"NOT_AUTO_ATTACHED",
    });
    continue;
  }

  if(!region){
    holds.push({
      osm_id:center.osm_id,
      name,
      place:center.place,
      status:"HOLD_REGION_UNRESOLVED",
      map_policy:"SUPPRESS_FROM_COUNTRY_LABELS_PENDING_REVIEW",
    });
    continue;
  }

  const candidates=cityHubCandidates.filter(h=>h.region_slug===region && h.center);
  if(candidates.length===0){
    holds.push({
      osm_id:center.osm_id,
      name,
      place:center.place,
      region_slug:region,
      status:"HOLD_NO_USABLE_CITY_HUB_IN_REGION",
      map_policy:"SUPPRESS_FROM_COUNTRY_LABELS_PENDING_REVIEW",
    });
    continue;
  }

  const ranked=candidates
    .map(h=>({hub:h,distance_km:haversineKm(center,h.center!)}))
    .sort((a,b)=>a.distance_km-b.distance_km || a.hub.city.canonical_name.localeCompare(b.hub.city.canonical_name,"fr"));
  const best=ranked[0];

  if(!Number.isFinite(best.distance_km) || best.distance_km>maxAttachmentKm){
    holds.push({
      osm_id:center.osm_id,
      name,
      place:center.place,
      region_slug:region,
      status:"HOLD_OUTSIDE_ATTACHMENT_RADIUS",
      nearest_city_slug:best.hub.city.slug,
      distance_km:Number.isFinite(best.distance_km)?Number(best.distance_km.toFixed(3)):null,
      max_attachment_km:maxAttachmentKm,
      map_policy:"SUPPRESS_FROM_COUNTRY_LABELS_PENDING_REVIEW",
    });
    continue;
  }

  attachments.push({
    osm_id:center.osm_id,
    name,
    place:center.place,
    region_slug:region,
    city_hub_slug:best.hub.city.slug,
    city_hub_name:best.hub.city.canonical_name,
    status:"HINT_ONLY_ATTACHMENT",
    method:"SAME_CANONICAL_REGION_THEN_NEAREST_USABLE_CITY_HUB",
    distance_km:Number(best.distance_km.toFixed(3)),
    max_attachment_km:maxAttachmentKm,
    geometry_claim:"NONE",
    map_policy:"DO_NOT_RENDER_AS_INDEPENDENT_COUNTRY_LABEL",
  });
}

const summary={
  canonical_city_hub_count:GEO_CITIES.length,
  usable_city_hub_point_count:cityHubCandidates.filter(h=>h.status==="USABLE_CITY_HUB_POINT").length,
  held_city_hub_point_count:cityHubCandidates.filter(h=>h.status==="HOLD_CITY_HUB_POINT").length,
  village_attachment_count:attachments.length,
  village_hold_count:holds.length,
  secondary_urban_center_review_count:secondary.length,
};

const payload={
  schema_version:1,
  scope:"Morocco",
  evidence_role:"LOCALITY_TO_CITY_ATTACHMENT_ROUTING_ONLY",
  source_control:inventory.source_control??null,
  activation_allowed:false,
  geometry_promotion_allowed:false,
  attachment_semantics:"HINT_ONLY_DATA_RELATIONSHIP",
  max_attachment_km:maxAttachmentKm,
  guardrails:[
    "Only OSM place=village centers are auto-routed; towns, cities and municipalities remain secondary-center review items.",
    "A village must resolve to exactly one canonical HCP region before a city hub can be considered.",
    "Distance chooses only among usable canonical city hubs in the same resolved region.",
    "Distance never creates a boundary, administrative membership, market-zone claim or product-neighborhood claim.",
    "Villages outside the configured radius remain HOLD instead of being force-attached.",
    "No Voronoi, radius polygon, buffer polygon, midpoint or manual closure is generated.",
  ],
  summary,
  city_hubs:cityHubCandidates.map(h=>({
    city_slug:h.city.slug,
    canonical_name:h.city.canonical_name,
    region_slug:h.region_slug,
    exact_center_count:h.exact_center_count,
    status:h.status,
    center:h.center ? {osm_id:h.center.osm_id,lat:h.center.lat,lon:h.center.lon} : null,
  })),
  attachments,
  holds,
  secondary_urban_centers:secondary,
};

fs.writeFileSync(out,`${JSON.stringify(payload,null,2)}\n`,"utf8");
console.log(JSON.stringify(summary,null,2));
