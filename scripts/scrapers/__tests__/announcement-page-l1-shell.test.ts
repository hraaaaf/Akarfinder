import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("ANN-L1 premium shell", () => {
  it("routes production listing detail through one shared shell", () => {
    const page = read("app/listings/[id]/page.tsx");
    assert.match(page, /AnnouncementPageShell/);
    assert.doesNotMatch(page, /PropertyDecisionHeader/);
    assert.doesNotMatch(page, /<SiteHeader/);
  });

  it("reuses the exact Search header mode and light search surface", () => {
    const shell = read("components/listings/AnnouncementPageShell.tsx");
    assert.match(shell, /<SiteHeader searchMode fluid \/>/);
    assert.match(shell, /ui\.pageLight/);
    assert.match(shell, /max-w-\[1500px\]/);
    assert.match(shell, /data-announcement-premium-shell="ann-l1"/);
  });

  it("keeps the mobile decision bar and production detail body in the shared shell", () => {
    const shell = read("components/listings/AnnouncementPageShell.tsx");
    assert.match(shell, /<PropertyDetailV2 listing=\{listing\} detail=\{detail\} \/>/);
    assert.match(shell, /<MobilePropertyDecisionBar listingId=\{listing\.id\} \/>/);
  });

  it("has a single public H1 source after removing the legacy decision header from composition", () => {
    const detail = read("components/listings/PropertyDetailV2.tsx");
    const h1Count = (detail.match(/<h1\b/g) ?? []).length;
    assert.equal(h1Count, 1);
  });

  it("provides a deterministic noindex visual QA route using the same shell", () => {
    const qa = read("app/visual-qa/announcement-page/page.tsx");
    assert.match(qa, /robots:\s*\{ index: false, follow: false \}/);
    assert.match(qa, /<AnnouncementPageShell listing=\{listing\} detail=\{detail\} visualQa \/>/);
    assert.match(qa, /production_allowed: false/);
    assert.match(qa, /image_permission_status: "unknown"/);
  });
});
