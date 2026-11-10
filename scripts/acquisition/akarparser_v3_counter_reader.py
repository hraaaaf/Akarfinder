#!/usr/bin/env python3
"""AkarParser V3: independently implemented source-only counter-reader.

Reads ONLY immutable raw HTML + source capture sidecars, never imports V2/V3,
their predictions, reviewer priorities, benchmark truth or production data.
Conservative primary-source claims are NOT human ground truth or accuracy.
"""
from __future__ import annotations
from collections import Counter, defaultdict
import argparse
import gzip
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

CORE=("title","city","district","price_mad","surface_total_m2","property_type","transaction_type")
FAMILIES={"appartement":"apartment","appartements":"apartment","studio":"studio",
          "villa":"villa","villas":"villa","maison":"house","maisons":"house",
          "terrain":"land","terrains":"land","duplex":"duplex"}
MAX_HTML=3_000_000

class VisibleSource(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.meta={};self.visible=[];self.ld=[];self.skip=[]
        self.ld_parts=None;self.title=[];self.in_title=False
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="meta":
            key=(a.get("property") or a.get("name") or "").lower()
            if key and a.get("content"):self.meta[key]=a["content"]
        if tag=="script":
            is_ld="ld+json" in (a.get("type") or "").lower()
            self.skip.append(("script",is_ld))
            if is_ld:self.ld_parts=[]
            return
        if tag in ("style","noscript","svg","template"):
            self.skip.append((tag,False))
        if tag=="title" and not self.skip:self.in_title=True
        if not self.skip and tag in ("p","div","section","li","br","h1","h2","h3","article"):
            self.visible.append("\n")
    def handle_endtag(self,tag):
        if self.skip and self.skip[-1][0]==tag:
            _,is_ld=self.skip.pop()
            if is_ld:
                try:self.ld.append(json.loads("".join(self.ld_parts)))
                except (TypeError,ValueError):pass
                self.ld_parts=None
            return
        if tag=="title":self.in_title=False
    def handle_data(self,s):
        if self.skip:
            if self.skip[-1]==("script",True) and self.ld_parts is not None:
                self.ld_parts.append(s)
            return
        if self.in_title:self.title.append(s)
        self.visible.append(s)
    def tokens(self):
        return [x.strip() for x in "".join(self.visible).splitlines() if x.strip()]

def nodes(obj):
    if isinstance(obj,list):
        for item in obj: yield from nodes(item)
    elif isinstance(obj,dict):
        yield obj
        if "@graph" in obj:yield from nodes(obj["@graph"])
def node_type(node,t):
    kind=node.get("@type", "")
    return t in kind if isinstance(kind,(str,list)) else False

def number(v):
    if isinstance(v,bool) or v is None:return None
    if isinstance(v,(int,float)):
        return float(v) if 0 < float(v) < 1e12 else None
    if not isinstance(v,str):return None
    text=re.sub(r"[^\d.,]","",v)
    if not text:return None
    if "." in text and "," in text:
        mark="," if text.rfind(",")>text.rfind(".") else "."
        text=text.replace("." if mark=="," else ",","").replace(",",".")
    elif re.search(r"[,.]\d{3}(?:[,.]\d{3})*$",text):
        text=text.replace(",","").replace(".","")
    else:text=text.replace(",",".")
    try:
        n=float(text)
        return n if 0<n<1e12 else None
    except ValueError:return None

def plain(v):
    return re.sub(r"\s+"," ",str(v)).strip() if v is not None else ""

def candidate(value,path,source):
    return {"value":value,"path":path,"evidence":plain(source)[:280]}

class CounterClaims:
    def __init__(self):self.items=defaultdict(list)
    def add(self,field,value,path,source=None):
        if field not in CORE or value is None or value=="":return
        if field in ("price_mad","surface_total_m2"):
            value=number(value)
            if value is None:return
        else:
            value=plain(value)
            if not value:return
        if len(self.items[field])<8:self.items[field].append(candidate(value,path,source if source is not None else value))
    def finish(self):
        claims={}
        for field in CORE:
            arr=self.items[field]
            if not arr:
                claims[field]={"state":"unknown","value":None,"evidence":[]}
                continue
            uniques={}
            for a in arr:
                v=a["value"]
                marker=round(float(v),2) if field in ("price_mad","surface_total_m2") else v.casefold()
                uniques.setdefault(marker,a["value"])
            if len(uniques)>1:
                claims[field]={"state":"conflict","value":None,"evidence":arr,
                               "distinct_values":list(uniques.values())}
            else:
                claims[field]={"state":"supported","value":arr[0]["value"],
                               "evidence":arr}
        return claims

def title_transaction(s):
    """Only explicit offer terms, not speculative investments."""
    norm=plain(s).casefold()
    sale=bool(re.search(r"\b(?:à|a)\s+vendre\b|\ben\s+vente\b|\bvente\s+(?:de|d['’]un|d['’]une)\b|"
                        r"\b(?:à|a)\s+l['’]achat\b|\b[aà]\s+la\s+vente\b",norm))
    rent=bool(re.search(r"\b(?:à|a)\s+louer\b|\ben\s+location\b|\b(?:à|a)\s+la\s+location\b|"
                        r"^\s*location\s+(?:villa|appartement|studio|maison|bureau|local)\b|"
                        r"\b(?:villa|studio|appartement|maison|bureau|local)\b.{0,55}\blocation\b",norm))
    if re.search(r"\b(?:investissement|locatif|rentabilit[eé]|option|possibilit[eé])\b",norm):
        rent=rent and bool(re.search(r"\b(?:à|a)\s+louer\b|\ben\s+location\b",norm))
    return {"sale":sale,"rent":rent}

def extract(raw:bytes,url:str)->dict:
    doc=VisibleSource();doc.feed(raw.decode("utf-8","replace"))
    tokens=doc.tokens()
    host=urlsplit(url).hostname.lower().removeprefix("www.")
    path=unquote(urlsplit(url).path)
    items=[node for obj in doc.ld for node in nodes(obj)]
    listing=next((n for n in items if node_type(n,"RealEstateListing")),{})
    rooms=next((n for n in items if node_type(n,"Apartment") or node_type(n,"House")),{})
    c=CounterClaims()
    # Schema and meta titles; OG meta titles can contain portal suffix, so
    # treat as fallback only, not a second independent contradictory title.
    source_title=listing.get("name")
    if source_title:c.add("title",source_title,"jsonld.RealEstateListing.name")
    else:
        t=doc.meta.get("og:title") or "".join(doc.title)
        if t:c.add("title",t,"html.og:title_or_title")
    claim_title=plain(source_title or doc.meta.get("og:title") or "".join(doc.title))
    if host=="domio.ma":
        address=listing.get("address")
        if isinstance(address,dict):
            c.add("city",address.get("addressLocality"),"jsonld.address.addressLocality")
        val=listing.get("price")
        if isinstance(val,dict) and str(val.get("priceCurrency","")).upper()=="MAD":
            c.add("price_mad",val.get("price"),"jsonld.price.MAD",val.get("price"))
        area=listing.get("floorSize")
        if isinstance(area,dict) and str(area.get("unitCode","")).upper() in ("MTK","M2"):
            c.add("surface_total_m2",area.get("value"),"jsonld.floorSize.m2")
        route=re.match(r"^/fr/([^/]+)/(vendre|louer)/([^/]+)/\d+/",path)
        if route:
            typ,action,city=route.groups()
            c.add("property_type",FAMILIES.get(typ.casefold()),"url.property_type")
            c.add("transaction_type",{"vendre":"sale","louer":"rent"}[action],"url.action")
            if not address:c.add("city",city.replace("-"," ").title(),"url.city")
        head=tokens[:85]
        for i,v in enumerate(head):
            mm=re.fullmatch(r"(.{2,60}),\s*([^,]{2,45})",v)
            city_value=(address or {}).get("addressLocality") if isinstance(address,dict) else ""
            if (mm and city_value
                    and mm.group(2).casefold()==plain(city_value).casefold()
                    and not re.search(
                        r"\b(?:appartement|appartements|villa|studio|terrain|maison|"
                        r"vendre|louer|offre|bonne affaire)\b",
                        mm.group(1), re.I
                    )):
                c.add("district",mm.group(1),"visible.primary.district_city",v)
                break
    elif host=="agenz.ma":
        route=re.match(r"^/fr/annonces/immo-([^/]+)/(vente|location)-([^/]+)/([^/]+)/\d+$",path)
        if route:
            city,action,kind,district=route.groups()
            c.add("city",city.replace("-"," ").title(),"url.city")
            c.add("transaction_type","sale" if action=="vente" else "rent","url.transaction")
            c.add("property_type",FAMILIES.get(kind.casefold()),"url.category")
            c.add("district",district.replace("-"," ").title(),"url.district")
        area=rooms.get("floorSize")
        if isinstance(area,dict) and str(area.get("unitCode","")).upper() in ("MTK","M2"):
            c.add("surface_total_m2",area.get("value"),"jsonld.realestate.floorSize.m2")
        elif isinstance(area,(int,float)):
            c.add("surface_total_m2",area,"jsonld.realestate.floorSize.scalar")
        # Listings can have mortgage calculators and related cards: price
        # must be a standalone MAD amount in the first explicitly matched hero.
        for i,t in enumerate(tokens[:240]):
            match=re.fullmatch(r"([\d\s\u202f\u00a0.,]{4,22})\s*(?:DH|MAD)",t,re.I)
            n=number(match.group(1)) if match else None
            if n is not None and n>=50_000:
                c.add("price_mad",n,f"visible.hero[{i}]",t);break
    elif host=="mubawab.ma":
        offer=listing.get("offers")
        unit_rate_only=False
        if isinstance(offer,dict) and str(offer.get("priceCurrency","")).upper()=="MAD":
            desc=str(listing.get("description") or "")
            unit_values=re.findall(
                r"(?<!\d)([\d\s\u202f\u00a0.,]{2,17})\s*"
                r"(?:dhs?|mad|dirhams?)\s*(?:/|par)\s*m(?:²|2)\b",
                desc, re.I
            )
            price=number(offer.get("price"))
            unit_rate_only=price is not None and any(
                number(v)==price for v in unit_values
            )
            if not unit_rate_only:
                c.add("price_mad",offer.get("price"),"jsonld.RealEstateListing.offers.price.MAD")
        for i, t in enumerate(tokens[:65]):
            match=re.fullmatch(r"Immobilier\s+([\wÀ-ÿ][\wÀ-ÿ '\-]{1,55})",t)
            if not match or match.group(1).casefold()=="maroc":continue
            city=match.group(1).strip()
            if i+2>=len(tokens) or not tokens[i+1].endswith(city):continue
            c.add("city",city,f"visible.breadcrumb[{i}]")
            district=tokens[i+2]
            if re.fullmatch(r"[\wÀ-ÿ][\wÀ-ÿ '\-]{1,55}",district):
                c.add("district",district,f"visible.breadcrumb[{i+2}]")
            categ=tokens[i+1].casefold()
            if "appartements" in categ:
                # Special studio titles are a subtype of apartment listings.
                kind=("studio" if re.search(r"\bstudio\b",claim_title,re.I)
                      else "duplex" if re.search(r"\bduplex\b",claim_title,re.I)
                      else "apartment")
                c.add("property_type",kind,f"visible.category[{i+1}]+listing.title")
            elif "villa" in categ and re.search(r"\bvilla\b",claim_title,re.I):
                c.add("property_type","villa",f"visible.category[{i+1}]+title")
            elif "terrain" in categ:c.add("property_type","land",f"visible.category[{i+1}]")
            break
        # Only first primary hero m2 after financing CTA; title/description may
        # mention parking/terrace/lots, therefore they aren't area truth.
        for i,t in enumerate(tokens[:95]):
            if "Obtenir un financement" not in t:continue
            for j in range(i+1,min(i+16,len(tokens))):
                match=re.fullmatch(r"([\d ]{1,7})\s*m(?:²|2)",tokens[j],re.I)
                if match:
                    c.add("surface_total_m2",match.group(1),f"visible.primary.hero[{j}]",tokens[j]);break
            break
        if not c.items.get("property_type"):
            if re.search(r"\bstudio\b",claim_title,re.I):
                c.add("property_type","studio","jsonld.title.studio")
        # Strongly discount schema businessFunction #Sell: it is wrong on
        # real rental listings. Description used only when offer starts there.
        signals=title_transaction(claim_title)
        desc=plain(listing.get("description"))[:200]
        if not signals["sale"] and not signals["rent"]:
            # Restrict to first advertised introductory sentence only.
            intro=re.split(r"[.!?\n]",desc,maxsplit=1)[0][:160]
            signals=title_transaction(intro)
        if signals["sale"] and signals["rent"]:
            c.add("transaction_type","sale","listing.heading.explicit_sale",claim_title)
            c.add("transaction_type","rent","listing.heading.explicit_rent",claim_title)
        elif signals["sale"]:
            c.add("transaction_type","sale","listing.heading.explicit_sale",claim_title or desc)
        elif signals["rent"]:
            c.add("transaction_type","rent","listing.heading.explicit_rent",claim_title or desc)
    elif host=="avito.ma":
        og=plain(doc.meta.get("og:title") or "")
        # OG title is the listing's own publisher-provided headline.
        parts=og.split("|")
        if parts and not source_title:
            # Headline-only, not portal suffix
            c.items["title"]=[];c.add("title",parts[0].strip(),"meta.og:title.primary")
        title_source=parts[0] if parts else og
        m=re.findall(r"-\s*([\d\s\u00a0\u202f.,]{4,22})\s*(?:DH|MAD)\s*-",og,re.I)
        if len(m)==1:c.add("price_mad",m[0],"meta.og:title.price")
        signal=title_transaction(title_source)
        if signal["sale"] and signal["rent"]:
            c.add("transaction_type","sale","meta.og:title.sale")
            c.add("transaction_type","rent","meta.og:title.rent")
        elif signal["sale"]:c.add("transaction_type","sale","meta.og:title.sale")
        elif signal["rent"]:c.add("transaction_type","rent","meta.og:title.rent")
        kind=next((seg for seg in path.split("/") if seg in FAMILIES),None)
        if kind:c.add("property_type",FAMILIES[kind],"url.category")
        for i,t in enumerate(tokens[:75]):
            if t=="Tout le Maroc" and i+2<len(tokens):
                city,district=tokens[i+1:i+3]
                if city.casefold() in og.casefold():
                    c.add("city",city,f"visible.breadcrumb[{i+1}]")
                    c.add("district",district,f"visible.breadcrumb[{i+2}]")
                break
        for i,t in enumerate(tokens[:110]):
            m=re.fullmatch(r"(\d{1,5})\s*(?:Surface totale|Surface habitable)",t,re.I)
            if m:c.add("surface_total_m2",m.group(1),f"visible.primary.area[{i}]",t);break
    else:
        # Unknown portals: source title only, NO inferred values.
        pass
    claims=c.finish()
    explicit_supported=sum(x["state"]=="supported" for x in claims.values())
    conflicts=[key for key,item in claims.items() if item["state"]=="conflict"]
    return {"source_url":url,"portal":host,"claims":claims,
            "supported_field_count":explicit_supported,
            "conflicting_fields":conflicts}

def read_records(input_dir:Path,only:Path|None):
    root=input_dir.resolve()
    if any((base/".git").is_dir() for base in (root, *root.parents)):
        raise ValueError("PRIVATE_INPUT_OUTSIDE_GIT_REQUIRED")
    if only:
        raw=[json.loads(x) for x in only.read_text("utf8").splitlines() if x.strip()]
        rels=[x["canonical_page_file"].replace("\\","/") for x in raw]
        expected={x["canonical_page_file"].replace("\\","/"):x for x in raw}
    else:
        rels=[p.relative_to(root).as_posix() for p in sorted(root.rglob("*.html"))]
        expected={}
    if len(rels)!=len(set(rels)):raise ValueError("DUPLICATE_INPUT_REL")
    for rel in rels:
        p=(root/rel).resolve()
        if not p.is_relative_to(root) or p.suffix.lower()!=".html":raise ValueError("UNSAFE_INPUT_PATH")
        data=p.read_bytes()
        if len(data)>MAX_HTML:raise ValueError("OVERSIZED_HTML")
        meta=json.loads(Path(str(p)+".meta.json").read_text("utf8"))
        sha=hashlib.sha256(data).hexdigest()
        if sha!=meta.get("html_sha256") or meta.get("http_status")!=200:
            raise ValueError("SOURCE_HASH_OR_STATUS_INVALID:"+rel)
        if expected and (sha!=expected[rel].get("html_sha256")
                         or meta.get("source_url")!=expected[rel].get("source_url")):
            raise ValueError("FILTER_SOURCE_SHA_OR_URL_INVALID")
        yield rel,data,sha,meta["source_url"]

def main():
 ap=argparse.ArgumentParser()
 ap.add_argument("--input",type=Path,required=True)
 ap.add_argument("--out",type=Path,required=True)
 ap.add_argument("--expected",type=int,required=True)
 ap.add_argument("--filter",type=Path)
 args=ap.parse_args()
 dest=args.out.resolve()
 if args.out.exists() or args.out.is_symlink():raise FileExistsError("NO_OVERWRITE")
 if dest.is_relative_to(args.input.resolve()) or any((p/".git").is_dir() for p in (dest.parent,*dest.parents)):
    raise ValueError("PRIVATE_OUTPUT_OUTSIDE_GIT_REQUIRED")
 if not args.input.is_dir():raise FileNotFoundError("INPUT_NOT_DIR")
 records=list(read_records(args.input,args.filter))
 if len(records)!=args.expected:raise ValueError("UNEXPECTED_INPUT_COUNT")
 seen=set();results=[];states=defaultdict(Counter)
 for rel,data,sha,url in records:
    if url in seen:raise ValueError("DUPLICATE_URL")
    seen.add(url)
    claim=extract(data,url)
    claim.update({"source_file":rel.replace("/","\\"),"source_file_sha256":sha,"source_line":1})
    results.append(claim)
    for k,record in claim["claims"].items():states[k][record["state"]]+=1
 dest.parent.mkdir(parents=True,exist_ok=True)
 with dest.open("x",encoding="utf8") as f:
    for item in results:f.write(json.dumps(item,ensure_ascii=False,sort_keys=True)+"\n")
 manifest={"record_count":len(results),"source_only":True,
           "no_v2_v3_predictions_read":True,
           "not_human_ground_truth":True,
           "real_world_accuracy_certified":False,
           "source_sha_verified":len(results),
           "field_states":{k:dict(v) for k,v in states.items()},
           "sha256_output":hashlib.sha256(dest.read_bytes()).hexdigest()}
 dest.with_name(dest.name+".summary.json").write_text(json.dumps(manifest,ensure_ascii=False,sort_keys=True,indent=2),encoding="utf8")
 print(json.dumps(manifest,ensure_ascii=False,sort_keys=True),flush=True)

if __name__=="__main__":main()
