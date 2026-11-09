"""Offline private QA: geometry-error identity and per-object OSM timestamp provenance."""
import importlib.util
from datetime import datetime, timezone
from pathlib import Path

source = Path(__file__).resolve().parents[1] / "maarif-geofabrik-private-qa.py"
spec = importlib.util.spec_from_file_location("maarif_qa_extractor", source)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
h = module.MaarifHandler()

class FakeInvalidArea:
    tags = {"leisure": "park", "name": "Synthetic invalid geometry"}
    def orig_id(self): return 999991
    def from_way(self): return True

h.area(FakeInvalidArea())
assert h.area_count == 1
assert h.rejected["area_geometry_error"] == 1, h.rejected
assert len(h.area_error_examples) == 1, h.area_error_examples
err = h.area_error_examples[0]
assert err["source_id"] == "way/999991", err
assert err["reason"] == "area_geometry_error", err
assert err["qa_only"] is True
assert err["exception_type"]
assert not h.records
print("PASS: invalid synthetic geometry recorded by OSM ID, fail-closed, no POI emitted")

class EditedFake:
    version = 5
    timestamp = datetime(2024, 9, 16, 20, 45, 32, tzinfo=timezone.utc)

class MissingDateFake:
    version = 1
    timestamp = datetime(1970, 1, 1, tzinfo=timezone.utc)

version, modified = module.object_source_metadata(EditedFake())
assert version == 5 and modified.startswith("2024-09-16"), (version, modified)
assert module.object_source_metadata(MissingDateFake()) == (1, None)
print("PASS: per-object timestamp preserved; uninitialized 1970 sentinel is NOT fresh")
