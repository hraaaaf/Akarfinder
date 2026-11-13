"""Only extract first-party, listing-scoped price/area evidence for one Agenz page.

This is a source-site claim, never proof of an active or unique property.
Recommendation cards and general body prices cannot stand in for the primary listing.
"""
from __future__ import annotations
import re
from bs4 import BeautifulSoup

_MONEY = r'(\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d{4,9})\s*(?:DH|DHS|MAD)\b'
_AREA = re.compile(r'\bSurface\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*m(?:²|2)\b', re.I)
_RENT_LONG = re.compile(r'\bLocation\s+longue\s+dur[ée]e\b[^\d]{0,70}'+_MONEY, re.I)
_PRICE = re.compile(_MONEY, re.I)


def _to_number(s: str) -> int:
    return int(re.sub(r'\D', '', s))


def _section(root, heading: str):
    matches = []
    for h in root.find_all('h2'):
        if ' '.join(h.get_text(' ', strip=True).split()).casefold() == heading.casefold():
            section = h.find_parent('section')
            if section and section.find_parent('main'):
                matches.append(section)
    return matches[0] if len(matches) == 1 else None


def evidence(html: str) -> dict:
    if not isinstance(html, str) or len(html.encode('utf-8')) > 2_000_000:
        raise ValueError('INVALID_SOURCE_HTML')
    soup = BeautifulSoup(html, 'html.parser')
    mains = soup.find_all('main')
    result = {
        'evidence_kind': 'AGENZ_SOURCE_HTML_SCOPED_CLAIMS_ONLY',
        'primary_rent_mad': None, 'primary_rent_period': None,
        'description_long_term_rent_mad': None, 'description_period': None,
        'characteristics_surface_m2': None,
        'primary_price_description_conflict': False,
        'needs_manual_review': True,
        'manual_review_reasons': [],
        'availability_verified': False,
        'physical_uniqueness_verified': False,
        'public_admission_authorized': False,
    }
    if len(mains) != 1:
        result['manual_review_reasons'].append('UNIQUE_SOURCE_MAIN_MISSING')
        return result
    main = mains[0]
    cost = _section(main, 'Coût mensuel')
    desc = _section(main, 'Description')
    props = _section(main, 'Caractéristiques')
    if cost:
        text = cost.get_text(' ', strip=True).replace('\u202f', ' ')
        all_prices = {_to_number(m.group(1)) for m in _PRICE.finditer(text)}
        if len(all_prices) == 1 and re.search(r'\b(?:Coût|Loyer)\s+mensuel\b', text, re.I):
            result['primary_rent_mad'] = next(iter(all_prices))
            result['primary_rent_period'] = 'month'
        else:
            result['manual_review_reasons'].append('PRIMARY_RENT_PRICE_AMBIGUOUS')
    else:
        result['manual_review_reasons'].append('PRIMARY_COST_SECTION_MISSING')
    if desc:
        text = desc.get_text(' ', strip=True).replace('\u202f', ' ')
        desc_prices = {_to_number(m.group(1)) for m in _RENT_LONG.finditer(text)}
        if len(desc_prices) == 1:
            result['description_long_term_rent_mad'] = next(iter(desc_prices))
            result['description_period'] = 'month' if re.search(
                r'\bLocation\s+longue\s+dur[ée]e\b[^\d]{0,70}\d[\d ]*\s*(?:DH|DHS|MAD)\s*/\s*mois', text, re.I
            ) else None
        elif len(desc_prices) > 1:
            result['manual_review_reasons'].append('DESCRIPTION_RENT_MULTIPLE_AMOUNTS')
    else:
        result['manual_review_reasons'].append('DESCRIPTION_SECTION_MISSING')
    if props:
        areas = set()
        for li in props.find_all('li'):
            m = _AREA.search(li.get_text(' ', strip=True))
            if m:
                areas.add(float(m.group(1).replace(',', '.')))
        if len(areas) == 1:
            result['characteristics_surface_m2'] = next(iter(areas))
        else:
            result['manual_review_reasons'].append('SURFACE_NOT_UNAMBIGUOUS_IN_FEATURES')
    else:
        result['manual_review_reasons'].append('CHARACTERISTICS_SECTION_MISSING')
    p, d = result['primary_rent_mad'], result['description_long_term_rent_mad']
    if p is not None and d is not None and p != d:
        result['primary_price_description_conflict'] = True
        result['manual_review_reasons'].append('AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT')
    if p is None or result['characteristics_surface_m2'] is None:
        result['manual_review_reasons'].append('SOURCE_SCOPED_VALUE_INCOMPLETE')
    return result
