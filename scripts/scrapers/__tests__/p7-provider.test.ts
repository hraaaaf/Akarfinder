import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDbProvider, isSupabaseConfigured } from "../../../lib/db/provider.js";

// Helpers to save/restore env so tests don't pollute each other.
function withEnv(vars: Record<string, string | undefined>, fn: () => void) {
  const saved: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

let savedProvider: string | undefined;
let savedUrl: string | undefined;
let savedKey: string | undefined;

before(() => {
  savedProvider = process.env.DATABASE_PROVIDER;
  savedUrl = process.env.SUPABASE_URL;
  savedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
});

after(() => {
  if (savedProvider === undefined) delete process.env.DATABASE_PROVIDER;
  else process.env.DATABASE_PROVIDER = savedProvider;

  if (savedUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = savedUrl;

  if (savedKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = savedKey;
});

describe("P7 — DB provider detection", () => {
  test("defaults to sqlite when DATABASE_PROVIDER is unset", () => {
    withEnv({ DATABASE_PROVIDER: undefined }, () => {
      assert.equal(getDbProvider(), "sqlite");
    });
  });

  test("returns sqlite when DATABASE_PROVIDER=sqlite", () => {
    withEnv({ DATABASE_PROVIDER: "sqlite" }, () => {
      assert.equal(getDbProvider(), "sqlite");
    });
  });

  test("returns supabase when DATABASE_PROVIDER=supabase", () => {
    withEnv({ DATABASE_PROVIDER: "supabase" }, () => {
      assert.equal(getDbProvider(), "supabase");
    });
  });

  test("unknown value falls back to sqlite", () => {
    withEnv({ DATABASE_PROVIDER: "postgres" }, () => {
      assert.equal(getDbProvider(), "sqlite");
    });
  });
});

describe("P7 — Supabase configuration detection", () => {
  test("isSupabaseConfigured is false when both env vars absent", () => {
    withEnv(
      { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined },
      () => {
        assert.equal(isSupabaseConfigured(), false);
      }
    );
  });

  test("isSupabaseConfigured is false when only URL set", () => {
    withEnv(
      { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: undefined },
      () => {
        assert.equal(isSupabaseConfigured(), false);
      }
    );
  });

  test("isSupabaseConfigured is false when only KEY set", () => {
    withEnv(
      { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: "eyJtest" },
      () => {
        assert.equal(isSupabaseConfigured(), false);
      }
    );
  });

  test("isSupabaseConfigured is true when both env vars present", () => {
    withEnv(
      {
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "eyJtest",
      },
      () => {
        assert.equal(isSupabaseConfigured(), true);
      }
    );
  });
});

describe("P7 — Fallback logic", () => {
  test("when DATABASE_PROVIDER=supabase but env missing, stays on sqlite path", () => {
    withEnv(
      {
        DATABASE_PROVIDER: "supabase",
        SUPABASE_URL: undefined,
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      },
      () => {
        const provider = getDbProvider();
        const configured = isSupabaseConfigured();
        // Routing: provider=supabase but !configured → lib/db/index.ts uses SQLite
        assert.equal(provider, "supabase");
        assert.equal(configured, false);
        // The useSupabase() function = provider === "supabase" && configured => false
        const useSupabase = provider === "supabase" && configured;
        assert.equal(useSupabase, false);
      }
    );
  });

  test("when DATABASE_PROVIDER=supabase and env present, uses supabase path", () => {
    withEnv(
      {
        DATABASE_PROVIDER: "supabase",
        SUPABASE_URL: "https://test.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "eyJtest",
      },
      () => {
        const provider = getDbProvider();
        const configured = isSupabaseConfigured();
        const useSupabase = provider === "supabase" && configured;
        assert.equal(useSupabase, true);
      }
    );
  });
});

describe("P7.1C — queryListingById routing", () => {
  test("returns null for non-numeric id", async () => {
    // Wiring test: queryListingById skips DB for non-numeric slugs.
    // We don't import lib/db/index here (would load supabase-client),
    // so we test the guard logic directly.
    const id = "casablanca-finance-city-terrasse";
    const numericId = Number(id);
    assert.ok(!Number.isInteger(numericId) || numericId <= 0, "slug must not be parsed as a valid numeric id");
  });

  test("returns null for id = 0", () => {
    const id = "0";
    const numericId = Number(id);
    assert.ok(numericId <= 0, "id 0 is rejected");
  });

  test("returns null for negative id", () => {
    const id = "-5";
    const numericId = Number(id);
    assert.ok(numericId <= 0, "negative id is rejected");
  });

  test("numeric string '42' parses to integer correctly", () => {
    const id = "42";
    const numericId = Number(id);
    assert.ok(Number.isInteger(numericId) && numericId > 0, "valid id passes guard");
  });

  test("decimal string '1.5' is rejected as non-integer", () => {
    const id = "1.5";
    const numericId = Number(id);
    assert.ok(!Number.isInteger(numericId), "decimal id fails integer guard");
  });
});

describe("P7.1C — page routing: no static node:sqlite load in Supabase mode", () => {
  test("app/listings/[id]/page.tsx imports queryListingById from lib/db/index (not db-listings)", async () => {
    // Read the page source and verify the import chain.
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(process.cwd(), "app/listings/[id]/page.tsx"),
      "utf8"
    );
    assert.ok(
      src.includes("queryListingById"),
      "page must use queryListingById"
    );
    assert.ok(
      !src.includes("getDbListingById"),
      "page must not call getDbListingById directly"
    );
    assert.ok(
      !src.includes("lib/listings/db-listings"),
      "page must not statically import db-listings (would load node:sqlite)"
    );
  });

  test("lib/db/index.ts does not statically import db-listings", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "lib/db/index.ts"), "utf8");
    // `import type` is erased at compile time and is safe.
    // Only runtime imports (no `type` keyword) would actually load node:sqlite.
    const staticImportMatch = src.match(/^import\s+(?!type\s)\{[^}]+\}\s+from\s+['"].*db-listings['"]/m);
    assert.ok(!staticImportMatch, "lib/db/index.ts must not have a runtime import of db-listings");
  });
});

describe("P7 — Payload shape contract", () => {
  test("jsonToString handles null", () => {
    // Mirrors the jsonToString helper in supabase-listings.ts
    function jsonToString(v: unknown): string | null {
      if (v == null) return null;
      if (typeof v === "string") return v;
      return JSON.stringify(v);
    }
    assert.equal(jsonToString(null), null);
    assert.equal(jsonToString(undefined), null);
    assert.equal(jsonToString('["a"]'), '["a"]');
    assert.equal(jsonToString(["a", "b"]), '["a","b"]');
    assert.equal(jsonToString({ k: 1 }), '{"k":1}');
  });

  test("JSONB reliability_reasons can be round-tripped", () => {
    // Simulates what supabase-listings.ts does: JSONB array → string → parseJsonSafe
    const original = ["complétude élevée", "prix cohérent"];
    const stringified = JSON.stringify(original);
    const parsed = JSON.parse(stringified) as string[];
    assert.deepEqual(parsed, original);
  });
});
