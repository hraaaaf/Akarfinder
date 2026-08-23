#!/usr/bin/env python3
"""Run the V3 national territory catalog with the observed Barid city schema.

The Barid resource named "codes postaux des villes" exposes columns
REGION_POSTALE / PROVINCE / LOCALITE. Keep V3 unchanged for provenance, and
patch only the source adapter based on the observed header from CI.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

V3_PATH = Path(__file__).with_name("build-morocco-territory-registry-v3.py")
spec = importlib.util.spec_from_file_location("territory_v3", V3_PATH)
v3 = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(v3)


def read_barid_cities_fixed():
    rows, header_index, header = v3.parse_table(
        v3.BARID_CITIES_XLSX,
        "barid-cities-v3.xlsx",
        ["local"],
    )
    city_col = v3.find_column(header, ["localite", "ville", "local"])
    province_col = v3.find_column(header, ["province", "prefecture"])
    postal_col = v3.find_column(header, ["code_postal", "postal"])
    if city_col is None:
        raise RuntimeError(f"city/locality column missing: {header}")
    result = []
    for row in rows[header_index + 1:]:
        city = row[city_col].strip() if city_col < len(row) else ""
        province = row[province_col].strip() if province_col is not None and province_col < len(row) else ""
        postal = row[postal_col].strip() if postal_col is not None and postal_col < len(row) else ""
        if city:
            result.append({
                "city": city,
                "normalizedName": v3.base.norm(city),
                "province": province,
                "postalCode": postal,
            })
    return result, header


v3.read_barid_cities = read_barid_cities_fixed
v3.main()
