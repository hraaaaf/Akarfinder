#!/usr/bin/env tsx
// Apply db/supabase-p18a-alerts-migration.sql via Supabase Management API.
// Usage: SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:alerts-migration
//
// How to get your access token:
//   https://supabase.com/dashboard/account/tokens → "Generate new token"
//
// Alternative: apply the SQL manually via Supabase Dashboard → SQL Editor:
//   Paste contents of db/supabase-p18a-alerts-migration.sql and click "Run"

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
  console.error("[apply-alerts-migration] Missing SUPABASE_URL in .env.local");
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error(
    "\n[apply-alerts-migration] Missing SUPABASE_ACCESS_TOKEN.\n" +
    "\n  Option 1 — Run with token:\n" +
    "    SUPABASE_ACCESS_TOKEN=sbp_... npm run apply:alerts-migration\n" +
    "\n  Option 2 — Apply SQL manually (recommended):\n" +
    "    1. Open https://supabase.com/dashboard\n" +
    "    2. Select your project\n" +
    "    3. Go to SQL Editor\n" +
    "    4. Paste the contents of db/supabase-p18a-alerts-migration.sql\n" +
    "    5. Click Run\n"
  );
  process.exit(1);
}

const refMatch = SUPABASE_URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
if (!refMatch) {
  console.error("[apply-alerts-migration] Could not extract project ref from SUPABASE_URL:", SUPABASE_URL);
  process.exit(1);
}
const projectRef = refMatch[1];

const sqlPath = join(process.cwd(), "db", "supabase-p18a-alerts-migration.sql");
if (!existsSync(sqlPath)) {
  console.error("[apply-alerts-migration] SQL file not found:", sqlPath);
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");

console.log(`\n[apply-alerts-migration] Applying migration to project: ${projectRef}`);
console.log("[apply-alerts-migration] SQL file:", sqlPath);

try {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`[apply-alerts-migration] API error ${res.status}:`, body);
    process.exit(1);
  }

  const result = await res.json();
  console.log("[apply-alerts-migration] Migration applied successfully.");
  if (result && Array.isArray(result)) {
    console.log(`[apply-alerts-migration] Statements executed: ${result.length}`);
  }
} catch (err) {
  console.error("[apply-alerts-migration] Network error:", err);
  process.exit(1);
}
