#!/usr/bin/env python3
import hashlib
import json
import os
from pathlib import Path

ROOT = Path(os.environ.get("Q1A_ARTIFACT_ROOT", ".tmp/q1a-materializable-artifacts"))
OUT = Path(os.environ.get("Q1A_PREFLIGHT_OUT", ".tmp/q1a-materializable-preflight"))

ARTIFACTS = {
    "9971118875": ["avito_baseline"],
    "9974670013": ["akaar"],
    "9969651653": ["mubawab_direct"],
    "9888335708": ["marocannonces"],
    "9897323745": ["sarouty"],
    "9898224274": ["agenz_direct"],
    "9997114366": ["db_backed_union"],
    "9205427369": ["aykana_mass_x5"],
    "9205374370": ["kawtar_mass_x5"],
    "9203620957": ["atlas_mass_x5", "promo_mass_x5"],
    "9205410118": ["masaken_mass_x5"],
    "9205361327": ["souk_mass_x5"],
    "9205390731": ["mouldar_mass_x5"],
    "9974714576": ["domio"],
    "9974939355": ["immodirect"],
    "9976337671": ["yakeey_purchase"],
    "9976383551": ["yakeey_rental"],
    "9998233478": ["mass_x2"],
    "9988296190": ["mass1_additive"],
    "9998238197": ["oneimmo_historical"],
    "9989328673": ["agenz_historical"],
    "9991042950": ["mubawab_realestatebuddy"],
    "9991207598": ["mubawab_hicham", "avito_hicham"],
    "9991403015": ["mubawab_marwane"],
    "9991447841": ["mubawab_public_batch"],
    "9991488198": ["avito_public_batch"],
}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    rows = []
    failures = []
    for artifact_id, lanes in ARTIFACTS.items():
        directory = ROOT / artifact_id
        files = sorted(path for path in directory.rglob("*") if path.is_file())
        if not files:
            failures.append(f"artifact {artifact_id} is missing or empty")
        rows.append({
            "artifactId": int(artifact_id),
            "lanes": lanes,
            "fileCount": len(files),
            "bytes": sum(path.stat().st_size for path in files),
            "files": [{
                "path": str(path.relative_to(directory)),
                "bytes": path.stat().st_size,
                "sha256": digest(path),
            } for path in files],
        })

    report = {
        "schemaVersion": "q1a-materializable-artifact-preflight-v1",
        "artifactCount": len(ARTIFACTS),
        "laneInputCount": sum(len(lanes) for lanes in ARTIFACTS.values()),
        "allArtifactsAvailable": not failures,
        "failures": failures,
        "data49bIncluded": False,
        "data49bAggregateOnlyCount": 2326,
        "readOnly": True,
        "databaseWrites": 0,
        "productionWrites": 0,
        "sourceSiteFetches": 0,
        "vercelDeployments": 0,
        "artifacts": rows,
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "preflight.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in (
        "artifactCount", "laneInputCount", "allArtifactsAvailable",
        "data49bAggregateOnlyCount", "failures",
    )}, indent=2))
    if failures:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
