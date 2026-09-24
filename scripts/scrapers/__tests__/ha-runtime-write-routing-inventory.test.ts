import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const inventory = readFileSync(
  new URL(
    "../../../docs/ha-dr/HA05B_APPLICATION_WRITE_ROUTING_INVENTORY_2026-09-24.md",
    import.meta.url,
  ),
  "utf8",
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".ts") && !path.endsWith(".d.ts")) out.push(path);
  }
  return out;
}

function isMutationSurface(source: string): boolean {
  const hasSupabaseSurface =
    source.includes("getSupabaseServerClient") ||
    source.includes(".supabase") ||
    /Supabase[A-Za-z]*Client/.test(source);

  const hasTableMutation =
    /\.from\([^)]*\)[\s\S]{0,600}?\.(insert|update|upsert|delete)\s*\(/.test(source);

  const rpcNames = [...source.matchAll(/\.rpc\(\s*["\'`]([^"\'`]+)["\'`]/g)].map(
    (match) => match[1],
  );
  const hasMutatingRpc = rpcNames.some(
    (name) => !/^(search|get|read|list|find|fetch)_/i.test(name),
  );

  return hasSupabaseSurface && (hasTableMutation || hasMutatingRpc);
}

function escapeRegExp(value: string): string {
  return value.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

test("HA05-B inventory covers every audited runtime Supabase mutation surface", () => {
  const files = [...walk(join(process.cwd(), "app")), ...walk(join(process.cwd(), "lib"))];
  const writers = files
    .filter((file) => isMutationSurface(readFileSync(file, "utf8")))
    .map((file) => relative(process.cwd(), file).replaceAll("\\", "/"))
    .sort();

  assert.ok(writers.length > 0, "expected at least one audited runtime writer");
  for (const writer of writers) {
    assert.match(
      inventory,
      new RegExp(escapeRegExp(writer)),
      `missing routing inventory entry: ${writer}`,
    );
  }
});

test("HA05-B inventory never claims current Neon write readiness", () => {
  assert.match(inventory, /NOT PROVIDER-FAILOVER-READY/);
  assert.match(inventory, /APPLICATION WRITE ROUTING = BLOCKED \/ NOT FAILOVER-READY/);
  assert.match(inventory, /does \*\*not\*\* make those writes succeed on Neon/);
  assert.match(inventory, /No domain may silently fall back from Neon to Supabase/);
});

test("HA05-B inventory distinguishes fencing from routing", () => {
  assert.match(inventory, /assertHaSupabaseWriteAllowed\(\)/);
  assert.match(inventory, /prevents split-brain/);
  assert.match(inventory, /Provider-routed implementation/);
  assert.match(inventory, /Explicitly disabled during incident/);
});
