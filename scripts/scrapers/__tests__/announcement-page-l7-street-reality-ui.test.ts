import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

async function source(path: string): Promise<string> {
  return readFile(path, "utf8");
}

describe("ANN-L7 Street Reality public wiring", () => {
  it("builds Street Reality server-side and passes it through the premium shell", async () => {
    const page = await source("app/listings/[id]/page.tsx");
    const shell = await source("components/listings/AnnouncementPageShell.tsx");
    assert.match(page, /buildStreetRealityForListing\(listing\)/);
    assert.match(page, /streetReality=\{streetReality\}/);
    assert.match(shell, /streetReality\?: StreetRealityModel \| null/);
    assert.match(shell, /streetReality=\{streetReality\}/);
  });

  it("renders Street Reality after Vivre ici in PropertyDetailV2", async () => {
    const detail = await source("components/listings/PropertyDetailV2.tsx");
    const livingIndex = detail.indexOf("<LivingHereSection");
    const streetIndex = detail.indexOf("<StreetRealitySection");
    assert.notEqual(livingIndex, -1);
    assert.notEqual(streetIndex, -1);
    assert.equal(streetIndex > livingIndex, true);
  });

  it("labels imagery only as nearby street context and never as property photography", async () => {
    const section = await source("components/listings/StreetRealitySection.tsx");
    assert.match(section, /Vue de rue à proximité/);
    assert.match(section, /ne sont pas des photos du logement/);
    assert.doesNotMatch(section, />Photo du bien</);
    assert.match(section, /data-street-reality="ann-l7"/);
    assert.match(section, /distanceMeters/);
    assert.match(section, /capturedAt/);
    assert.match(section, /model\.attribution/);
  });

  it("keeps Mapillary credentials server-only", async () => {
    const env = await source(".env.local.example");
    const page = await source("app/listings/[id]/page.tsx");
    const section = await source("components/listings/StreetRealitySection.tsx");
    assert.match(env, /AKAR_GEO_MAPILLARY_ACCESS_TOKEN/);
    assert.doesNotMatch(env, /NEXT_PUBLIC_[A-Z0-9_]*MAPILLARY/);
    assert.doesNotMatch(page, /MAPILLARY_ACCESS_TOKEN/);
    assert.doesNotMatch(section, /MAPILLARY_ACCESS_TOKEN/);
  });
});
