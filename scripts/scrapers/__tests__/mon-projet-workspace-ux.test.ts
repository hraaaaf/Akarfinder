import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Mon Projet workspace", () => {
  it("uses one canonical Mon Projet vocabulary", () => {
    const companionPage = source("app/compagnon/page.tsx");
    const projectPage = source("app/mon-projet/page.tsx");
    const workspace = source("components/account/UserContinuityWorkspace.tsx");
    assert.ok(companionPage.includes("Mon Projet AkarFinder"));
    assert.ok(projectPage.includes("Mon Projet AkarFinder"));
    assert.ok(workspace.includes("Mon Projet AkarFinder"));
    assert.ok(!workspace.includes("Mon espace AkarFinder"));
  });

  it("does not create empty manual project shells from the workspace", () => {
    const workspace = source("components/account/UserContinuityWorkspace.tsx");
    assert.ok(!workspace.includes("async function createProject"));
    assert.ok(!workspace.includes("projectName"));
    assert.ok(workspace.includes("Nouveau projet avec le Compagnon"));
  });

  it("reuses structured project profiles to resume Search", () => {
    const workspace = source("components/account/UserContinuityWorkspace.tsx");
    assert.ok(workspace.includes("isDynamicSearchProfileV2"));
    assert.ok(workspace.includes("companionProfileToSearchParams"));
    assert.ok(workspace.includes('params.set("project_id", project.id)'));
    assert.ok(workspace.includes("Reprendre la recherche"));
    assert.ok(workspace.includes("summary.objective"));
    assert.ok(workspace.includes("summary.location"));
    assert.ok(workspace.includes("summary.budget"));
  });

  it("keeps legacy buyer routes redirect-only", () => {
    const profile = source("app/profil-recherche/page.tsx");
    const onboarding = source("app/onboarding/page.tsx");
    assert.ok(profile.includes('redirect("/compagnon")'));
    assert.ok(!profile.includes("SearchProfileWizard"));
    assert.ok(onboarding.includes("/compagnon?"));
    assert.ok(!onboarding.includes("BuyerOnboardingFlow"));
  });
});
