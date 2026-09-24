#!/usr/bin/env tsx
// Recovery-only helper: merges the offline source overlay into the checkout's
// local registry for a shadow harvest process. The modified file is never
// committed by this script and grants no production/publication authorization.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Entry = {
  domain: string;
  status: string;
  listing_url_patterns?: unknown[];
  external_web_result?: boolean;
};

type Registry = { domains: Entry[]; [key: string]: unknown };
type Overlay = { schema_version: string; purpose: string; domains: Entry[] };

const root = process.cwd();
const registryPath = join(root, "data/openserp/source-domain-registry.json");
const overlayPath = join(root, "data/recovery/offline-200k-source-overlay.json");

const registry = JSON.parse(readFileSync(registryPath, "utf8")) as Registry;
const overlay = JSON.parse(readFileSync(overlayPath, "utf8")) as Overlay;

if (overlay.schema_version !== "akarfinder-recovery-source-overlay-v1") {
  throw new Error("Unexpected recovery overlay schema");
}
if (!Array.isArray(overlay.domains) || overlay.domains.length === 0) {
  throw new Error("Recovery overlay has no domains");
}

const byDomain = new Map(registry.domains.map((entry) => [entry.domain, entry]));
for (const entry of overlay.domains) {
  const domain = entry.domain?.trim().toLowerCase();
  if (!domain || domain !== entry.domain) throw new Error(`Invalid overlay domain: ${entry.domain}`);
  if (entry.status !== "approved_discovery") throw new Error(`Overlay domain not discovery-approved: ${domain}`);
  if (entry.external_web_result !== true) throw new Error(`Overlay domain not external-web enabled: ${domain}`);
  if (!Array.isArray(entry.listing_url_patterns) || entry.listing_url_patterns.length === 0) {
    throw new Error(`Overlay domain lacks listing patterns: ${domain}`);
  }
  byDomain.set(domain, entry);
}

registry.domains = [...byDomain.values()];
writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  ok: true,
  mode: "recovery_shadow_runtime_overlay",
  overlay_domains: overlay.domains.map((d) => d.domain).sort(),
  canonical_registry_committed: false,
  production_authorization_granted: false
}, null, 2));
