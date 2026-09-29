import { createHash } from "node:crypto";
import type { HarvestQuery } from "@/lib/serper-mass-harvest/types";

type RecoverySource = {
  source_id: string;
  domain: string;
  count: number;
  cities?: readonly string[];
  routeHint?: string;
};

const NATIONAL_CITIES = [
  "Casablanca","Rabat","Marrakech","Tanger","Agadir","Fes","Meknes","Kenitra",
  "Tetouan","Oujda","El Jadida","Mohammedia","Beni Mellal","Nador","Sale",
] as const;

const PROPERTY_TYPES = [
  "appartement","villa","maison","terrain","riad","bureau","local commercial","ferme",
] as const;

const SOURCES: readonly RecoverySource[] = [
  { source_id:"mubawab", domain:"mubawab.ma", count:300, routeHint:"/fr/a/" },
  { source_id:"avito", domain:"avito.ma", count:250, routeHint:"/fr/" },
  { source_id:"sarout_recovery", domain:"sarout.ma", count:250, routeHint:"/fr/annonce/" },
  { source_id:"marocannonces_recovery", domain:"marocannonces.com", count:250, routeHint:"/categorie/" },
  { source_id:"agenz", domain:"agenz.ma", count:180, routeHint:"/fr/annonces/" },
  { source_id:"sarouty", domain:"sarouty.ma", count:140, routeHint:"/plp/" },
  { source_id:"mouldar", domain:"mouldar.com", count:100, routeHint:"/fr/" },
  { source_id:"1immo", domain:"1immo.ma", count:100 },
  { source_id:"daragadir", domain:"daragadir.com", count:70, cities:["Agadir"], routeHint:"/annonces/annonces-immobilieres/" },
  { source_id:"masaken", domain:"masaken.ma", count:60, routeHint:"/fr/immobilier-maroc/" },
  { source_id:"soukimmobilier", domain:"soukimmobilier.com", count:50, routeHint:"/fr/" },
  { source_id:"aykana", domain:"aykana.ma", count:40, cities:["Rabat","Sale"], routeHint:"/property/" },
  { source_id:"promoimmomarrakech", domain:"promoimmomarrakech.com", count:30, cities:["Marrakech"], routeHint:"/produit/" },
  { source_id:"atlasimmobilier", domain:"atlasimmobilier.com", count:20, cities:["Marrakech","Essaouira"], routeHint:"/p/" },
  { source_id:"marrakechrealty", domain:"marrakechrealty.com", count:20, cities:["Marrakech","Casablanca"] },
  { source_id:"limmobiliersansfrontieres", domain:"limmobiliersansfrontieres.com", count:20, cities:["Marrakech","Meknes"], routeHint:"/property/" },
  { source_id:"kawtarimmobilier", domain:"kawtarimmobilier.com", count:10, cities:["Essaouira"] },
  { source_id:"barnes_marrakech", domain:"barnes-marrakech.com", count:10, cities:["Marrakech"] },
] as const;

const MODIFIERS = ["","prix","surface","chambres","m2","annonce","quartier","immobilier"] as const;

function stableId(parts:string[]):string {
  return createHash("sha256").update(parts.join("|"),"utf8").digest("hex").slice(0,20);
}

function intentText(intent:"sale"|"rent"):string {
  return intent==="sale" ? "a vendre" : "a louer";
}

function sourceQuery(source:RecoverySource, city:string, type:string, intent:"sale"|"rent", variant:number):string {
  const site=`site:${source.domain}`;
  const route=source.routeHint ? ` inurl:${source.routeHint}` : "";
  const modifier=MODIFIERS[variant % MODIFIERS.length];
  let query=`${site}${route} "${type}" "${city}" "${intentText(intent)}"`;
  if (source.domain==="daragadir.com") query += " -vacances -saisonnier";
  if (source.domain==="marocannonces.com") query += " inurl:/annonce/";
  if (source.domain==="sarout.ma") query += " inurl:/annonce/";
  if (modifier) query += ` ${modifier}`;
  return query.replace(/\s+/g," ").trim();
}

function buildPool(source:RecoverySource):HarvestQuery[] {
  const cities=source.cities ?? NATIONAL_CITIES;
  const out:HarvestQuery[]=[];
  const seen=new Set<string>();
  let variant=0;

  while(out.length < source.count) {
    let progressed=false;
    for(const city of cities) {
      for(const property_type of PROPERTY_TYPES) {
        for(const intent of ["sale","rent"] as const) {
          const query=sourceQuery(source,city,property_type,intent,variant);
          if(seen.has(query)) continue;
          seen.add(query);
          out.push({
            id:`recovery-${source.source_id}-${stableId([query,String(variant)])}`,
            phase:"fixed",
            source_id:"long_tail",
            query,
            city,
            property_type,
            intent,
          });
          progressed=true;
          if(out.length>=source.count) return out;
        }
      }
    }
    variant += 1;
    if(!progressed && variant > MODIFIERS.length * 8) {
      throw new Error(`Unable to build ${source.count} unique queries for ${source.domain}`);
    }
  }
  return out;
}

export const RECOVERY_SERPER_QUERY_BUDGET = 1900;

export function buildRecoverySerperQueries():HarvestQuery[] {
  const rows=SOURCES.flatMap(buildPool);
  if(rows.length!==RECOVERY_SERPER_QUERY_BUDGET) {
    throw new Error(`Recovery Serper plan expected ${RECOVERY_SERPER_QUERY_BUDGET}, got ${rows.length}`);
  }
  if(new Set(rows.map(r=>r.query)).size!==rows.length) {
    throw new Error("Recovery Serper plan contains duplicate query text");
  }
  return rows;
}

export const RECOVERY_SERPER_SOURCE_ALLOCATION = SOURCES.map(({source_id,domain,count,cities})=>({
  source_id,domain,count,cities:cities ?? NATIONAL_CITIES,
}));
