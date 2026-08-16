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

  it("keeps one explicit main landmark, global mobile-dock clearance and the production detail body", () => {
    const shell = read("components/listings/AnnouncementPageShell.tsx");
    const mainCount = (shell.match(/<main\b/g) ?? []).length;
    assert.equal(mainCount, 1);
    assert.match(shell, /pb-40 lg:pb-0/);
    assert.match(shell, /<PropertyDetailV2\b/);
    assert.match(shell, /listing=\{listing\}/);
    assert.match(shell, /detail=\{detail\}/);
    assert.match(shell, /<MobilePropertyDecisionBar listing=\{listing\} model=\{proConversion\} \/>/);
  });

  it("keeps exactly one public H1 across the active detail composition", () => {
    const shell = read("components/listings/AnnouncementPageShell.tsx");
    const detail = read("components/listings/PropertyDetailV2.tsx");
    const core = read("components/listings/PropertyCore.tsx");
    const h1Count = (detail.match(/<h1\b/g) ?? []).length + (core.match(/<h1\b/g) ?? []).length;
    assert.equal(h1Count, 1);
    assert.match(detail, /<PropertyCore listing=\{listing\} \/>/);
    assert.match(core, /data-property-core-title/);
    assert.doesNotMatch(shell, /PropertyDecisionHeader/);
  });

  it("ships truthful loading and unavailable states with the same Search chrome", () => {
    const loading = read("app/listings/[id]/loading.tsx");
    const notFound = read("app/listings/[id]/not-found.tsx");

    assert.match(loading, /<SiteHeader searchMode fluid \/>/);
    assert.match(loading, /aria-busy="true"/);
    assert.match(loading, /data-announcement-loading="ann-l1"/);
    assert.match(notFound, /<SiteHeader searchMode fluid \/>/);
    assert.match(notFound, /Annonce indisponible/);
    assert.match(notFound, /ne plus être publiable sur AkarFinder/);
    assert.doesNotMatch(notFound, /vendu|réservé|supprimé par le vendeur/i);
  });

  it("provides a deterministic noindex visual QA route using the same shell", () => {
    const qa = read("app/visual-qa/announcement-page/page.tsx");
    assert.match(qa, /robots:\s*\{ index: false, follow: false \}/);
    assert.match(qa, /<AnnouncementPageShell listing=\{listing\} detail=\{detail\} visualQa \/>/);
    assert.match(qa, /production_allowed: false/);
    assert.match(qa, /image_permission_status: "unknown"/);
    assert.match(qa, /can_show_contact: false/);
    assert.match(qa, /can_show_gallery: false/);
  });
});
