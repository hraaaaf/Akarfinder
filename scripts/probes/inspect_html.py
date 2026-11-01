#!/usr/bin/env python3
"""Run-scoped DOM coverage inspector. The authoritative V6.4.1 parser is tested separately."""
from __future__ import annotations
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from bs4 import BeautifulSoup

def inspect(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(".listingBox")
    counts = {k:0 for k in ("with_link","with_title","with_price","with_surface","with_district","with_city","with_rooms","with_bedrooms","with_bathrooms","complete")}
    ignored, rejected, rows = {}, {}, []
    def bump(bag, reason):
        bag[reason] = bag.get(reason, 0) + 1
    for idx, card in enumerate(cards, 1):
        classes = set(card.get("class", []))
        if "emptyBox" in classes:
            bump(ignored,"empty_placeholder")
            continue
        a = card.select_one("a[href*='/a/']") or card.select_one("a[href]")
        raw = card.get("linkref") or (a.get("href") if a else "")
        url = urljoin("https://www.mubawab.ma", raw or "")
        bits = urlsplit(url)
        link = (bits.scheme == "https" and bits.hostname in ("www.mubawab.ma","mubawab.ma")
                and bool(re.search(r"/a/\d{5,}(?:/|$)",bits.path)))
        if not link and "adBoostBox" in classes:
            bump(ignored,"promotion_without_detail_link")
            continue
        title_el = card.select_one(".listingTit,.listingTitle")
        price_el = card.select_one(".priceTag,.hardPrice")
        title = title_el.get_text(" ",strip=True) if title_el else ""
        price_text = price_el.get_text(" ",strip=True) if price_el else ""
        price = bool(re.search(r"\d",price_text)) and not bool(re.search(r"sur demande",price_text,re.I))
        features = [x.get_text(" ",strip=True) for x in card.select(".adDetails .adDetailFeature,.listingDetails span")]
        surface = any(re.search(r"\d[\d\s.,]*\s*(?:m²|m2|sqm)\b",v,re.I) for v in features)
        detail = " ".join(features)
        rooms = bool(re.search(r"\d+\s*pi[eè]ces?\b",detail,re.I))
        bedrooms = bool(re.search(r"\d+\s*chambres?\b",detail,re.I))
        bathrooms = bool(re.search(r"\d+\s*salles?\s+de\s+bains?\b",detail,re.I))
        area_el = card.select_one(".listingH3")
        locality = [x.strip() for x in area_el.get_text(" ",strip=True).split(",") if x.strip()] if area_el else []
        district,city = len(locality)>1,len(locality)>1
        checks = {"link":link,"title":bool(title),"price":price,"surface":surface,"district":district,"city":city,"rooms":rooms,"bedrooms":bedrooms,"bathrooms":bathrooms}
        for name in ("link","title","price","surface","district","city","rooms","bedrooms","bathrooms"):
            if checks[name]:
                counts["with_"+name] += 1
        if link and title and price and surface:
            counts["complete"] += 1
        if not link or not title:
            bump(rejected,"missing_link" if not link else "missing_title")
        # No descriptions or personal identifiers are saved in the report.
        rows.append({"position":idx,"has":checks})
    eligible = len(rows)
    cov = {name:round(counts["with_"+name]/eligible,4) if eligible else 0.0
           for name in ("link","title","price","surface","district","city","rooms","bedrooms","bathrooms")}
    summary = {"listingBox_count":len(cards),"eligible_cards":eligible,
               "ignored":ignored,"rejected":rejected,"counts":counts,
               "coverage_on_eligible":cov,"card_flags":rows,
               "note":"DOM-only coverage; full V6.4.1 numeric parsing is checked offline against this fixture"}
    return summary

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("html_file",type=Path)
    ap.add_argument("--json",type=Path,required=True)
    args=ap.parse_args()
    data=inspect(args.html_file.read_text(encoding="utf-8"))
    args.json.write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in data.items() if k!="card_flags"},ensure_ascii=False))
    return 0 if data["eligible_cards"] and data["counts"]["with_link"] else 2
if __name__=="__main__":
    raise SystemExit(main())
