import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

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

test("runtime Supabase mutations are HA-fenced", () => {
  const files = [...walk(join(process.cwd(), "app")), ...walk(join(process.cwd(), "lib"))];
  const unguarded: string[] = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const hasSupabaseSurface =
      source.includes("getSupabaseServerClient") ||
      source.includes(".supabase") ||
      /Supabase[A-Za-z]*Client/.test(source);

    const hasTableMutation =
      /\.from\([^)]*\)[\s\S]{0,600}?\.(insert|update|upsert|delete)\s*\(/.test(source);

    const rpcNames = [...source.matchAll(/\.rpc\(\s*["'`]([^"'`]+)["'`]/g)].map(
      (match) => match[1],
    );
    const hasMutatingRpc = rpcNames.some(
      (name) => !/^(search|get|read|list|find|fetch)_/i.test(name),
    );

    const hasMutation = hasTableMutation || hasMutatingRpc;

    if (
      hasSupabaseSurface &&
      hasMutation &&
      !source.includes("assertHaSupabaseWriteAllowed")
    ) {
      unguarded.push(relative(process.cwd(), file).replaceAll("\\", "/"));
    }
  }

  assert.deepEqual(
    unguarded.sort(),
    [],
    `Supabase runtime mutations missing HA fence:\n${unguarded.join("\n")}`,
  );
});
