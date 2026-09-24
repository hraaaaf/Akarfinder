// Server-only Neon HTTP query adapter.
// Uses one-shot HTTPS queries; no long-lived TCP/WebSocket pool is created.
import { neon } from "@neondatabase/serverless";

export interface NeonQueryExecutor {
  query<T extends Record<string, unknown>>(
    text: string,
    params?: readonly unknown[],
  ): Promise<T[]>;
}

let cachedUrl: string | null = null;
let cachedSql: ReturnType<typeof neon> | null = null;

function getNeonSql() {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) {
    throw new Error("[neon] Missing NEON_DATABASE_URL");
  }

  if (!cachedSql || cachedUrl !== url) {
    cachedUrl = url;
    cachedSql = neon(url);
  }

  return cachedSql;
}

function timeoutMs(): number {
  const raw = Number(process.env.NEON_QUERY_TIMEOUT_MS ?? "8000");
  return Number.isFinite(raw) && raw >= 500 && raw <= 30000 ? raw : 8000;
}

export const neonExecutor: NeonQueryExecutor = {
  async query<T extends Record<string, unknown>>(
    text: string,
    params: readonly unknown[] = [],
  ): Promise<T[]> {
    const sql = getNeonSql();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs());

    try {
      return (await sql.query(text, [...params], {
        fetchOptions: { signal: controller.signal },
      })) as T[];
    } finally {
      clearTimeout(timer);
    }
  },
};
