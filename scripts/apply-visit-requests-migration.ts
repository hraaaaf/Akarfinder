#!/usr/bin/env tsx
// Apply db/supabase-visit-requests-migration.sql via Supabase Management API.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:visit-migration
//
// Alternative: apply the SQL manually via Supabase Dashboard → SQL Editor.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const envFile = join(process.cwd(), ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_URL) {
  console.error("[apply-visit-migration] Missing SUPABASE_URL in .env.local");
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error(
    "\n[apply-visit-migration] Missing SUPABASE_ACCESS_TOKEN.\n" +
      "\n  Option 1 — Run with token:\n" +
      "    SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:visit-migration\n" +
      "\n  Option 2 — Apply SQL manually:\n" +
      "    1. Open https://supabase.com/dashboard\n" +
      "    2. Select your project\n" +
      "    3. Go to SQL Editor\n" +
      "    4. Paste the contents of db/supabase-visit-requests-migration.sql\n" +
      "    5. Click Run\n"
  );
  process.exit(1);
}

const refMatch = SUPABASE_URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
if (!refMatch) {
  console.error(
    "[apply-visit-migration] Could not extract project ref from SUPABASE_URL:",
    SUPABASE_URL
  );
  process.exit(1);
}
const projectRef = refMatch[1];

const sqlPath = join(
  process.cwd(),
  "db",
  "supabase-visit-requests-migration.sql"
);
if (!existsSync(sqlPath)) {
  console.error("[apply-visit-migration] SQL file not found:", sqlPath);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");

console.log(`\n[apply-visit-migration] Applying migration to project: ${projectRef}`);
console.log("[apply-visit-migration] SQL file:", sqlPath);

async function main() {
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error(`[apply-visit-migration] API error ${res.status}:`, body);
      process.exit(1);
    }

    const result = await res.json();
    console.log("[apply-visit-migration] Migration applied successfully.");
    if (result && Array.isArray(result)) {
      console.log(`[apply-visit-migration] Statements executed: ${result.length}`);
    }
  } catch (err) {
    console.error("[apply-visit-migration] Network error:", err);
    process.exit(1);
  }
}

void main();
