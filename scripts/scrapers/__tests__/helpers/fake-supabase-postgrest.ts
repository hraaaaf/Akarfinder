// OPENSERP-SERVERLESS-DB-CALL-TIMEOUT-SAFETY-1 — shared test helper.
// A PGlite-backed stand-in for @supabase/supabase-js that mimics exactly
// the postgrest-js builder surface the ingestion repositories use --
// including .abortSignal() (so withDbTimeout's real-abort behavior is
// exercised, not skipped) and injectable per-call latency (so slow-DB /
// hanging-DB scenarios run against fake timers-scale delays, never real
// production-scale waits). Not auto-run: this file is a helper, not a
// test, and lives outside every test glob in package.json.

import type { PGlite } from "@electric-sql/pglite";

export type FakeDbLatencyFn = (meta: { kind: "select" | "upsert" | "insert" | "update" | "delete" | "rpc"; table: string }) => number;

function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function abortError(): Error {
  const err = new Error("The operation was aborted");
  err.name = "AbortError";
  return err;
}

type BuilderState = {
  kind: "select" | "upsert" | "insert" | "update" | "delete";
  table: string;
  cols?: string;
  rows?: Array<Record<string, unknown>>;
  onConflict?: string;
  ignoreDuplicates?: boolean;
  updateValues?: Record<string, unknown>;
  filters: string[];
  orderBy?: { col: string; ascending: boolean };
  rangeFrom?: number;
  rangeTo?: number;
  limitN?: number;
  returning?: string;
};

export function makeFakeSupabaseClient(db: InstanceType<typeof PGlite>, latency: FakeDbLatencyFn = () => 0) {
  async function applyLatency(meta: Parameters<FakeDbLatencyFn>[0], signal: AbortSignal | undefined): Promise<void> {
    const delayMs = latency(meta);
    if (delayMs <= 0) {
      if (signal?.aborted) throw abortError();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      const timer = setTimeout(resolve, delayMs);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(abortError());
      });
    });
  }

  async function execute(state: BuilderState): Promise<{ data: unknown; error: null | { message: string } }> {
    try {
      if (state.kind === "select") {
        let sql = `select ${state.cols === "*" || !state.cols ? "*" : state.cols} from ${state.table}`;
        if (state.filters.length > 0) sql += ` where ${state.filters.join(" and ")}`;
        if (state.orderBy) sql += ` order by ${state.orderBy.col} ${state.orderBy.ascending ? "asc" : "desc"}`;
        if (state.limitN !== undefined) sql += ` limit ${state.limitN}`;
        if (state.rangeFrom !== undefined && state.rangeTo !== undefined) {
          sql += ` limit ${state.rangeTo - state.rangeFrom + 1} offset ${state.rangeFrom}`;
        }
        const result = await db.query(`${sql};`);
        return { data: result.rows, error: null };
      }
      if (state.kind === "upsert" || state.kind === "insert") {
        const returned: unknown[] = [];
        for (const row of state.rows ?? []) {
          const cols = Object.keys(row);
          const values = cols.map((c) => toSqlLiteral(typeof row[c] === "object" && row[c] !== null ? JSON.stringify(row[c]) : row[c]));
          let sql = `insert into ${state.table} (${cols.join(",")}) values (${values.join(",")})`;
          if (state.kind === "upsert" && state.onConflict) {
            sql += state.ignoreDuplicates
              ? ` on conflict (${state.onConflict}) do nothing`
              : ` on conflict (${state.onConflict}) do update set ${cols
                  .filter((c) => !state.onConflict!.split(",").includes(c))
                  .map((c) => `${c} = excluded.${c}`)
                  .join(", ")}`;
          }
          if (state.returning) sql += ` returning ${state.returning}`;
          const result = await db.query(`${sql};`);
          returned.push(...result.rows);
        }
        return { data: state.returning ? returned : null, error: null };
      }
      if (state.kind === "update") {
        const sets = Object.entries(state.updateValues ?? {})
          .map(([k, v]) => `${k} = ${toSqlLiteral(typeof v === "object" && v !== null ? JSON.stringify(v) : v)}`)
          .join(", ");
        let sql = `update ${state.table} set ${sets}`;
        if (state.filters.length > 0) sql += ` where ${state.filters.join(" and ")}`;
        await db.query(`${sql};`);
        return { data: null, error: null };
      }
      if (state.kind === "delete") {
        let sql = `delete from ${state.table}`;
        if (state.filters.length > 0) sql += ` where ${state.filters.join(" and ")}`;
        await db.query(`${sql};`);
        return { data: null, error: null };
      }
      return { data: null, error: { message: `unsupported kind ${state.kind}` } };
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
    }
  }

  function makeBuilder(state: BuilderState): Record<string, unknown> {
    let signal: AbortSignal | undefined;
    const builder: Record<string, unknown> = {
      in(col: string, values: unknown[]) {
        state.filters.push(values.length === 0 ? "false" : `${col} in (${values.map(toSqlLiteral).join(",")})`);
        return builder;
      },
      is(col: string, value: null) {
        void value;
        state.filters.push(`${col} is null`);
        return builder;
      },
      not(col: string, op: string, value: null) {
        void value;
        if (op === "is") state.filters.push(`${col} is not null`);
        else throw new Error(`fake client: unsupported not(${op})`);
        return builder;
      },
      eq(col: string, value: unknown) {
        state.filters.push(`${col} = ${toSqlLiteral(value)}`);
        return builder;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        state.orderBy = { col, ascending: opts?.ascending ?? true };
        return builder;
      },
      range(from: number, to: number) {
        state.rangeFrom = from;
        state.rangeTo = to;
        return builder;
      },
      limit(n: number) {
        state.limitN = n;
        return builder;
      },
      select(cols: string) {
        // post-upsert/insert .select() -> returning clause
        state.returning = cols;
        return builder;
      },
      abortSignal(s: AbortSignal) {
        signal = s;
        return builder;
      },
      then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        const promise = (async () => {
          await applyLatency({ kind: state.kind, table: state.table }, signal);
          return execute(state);
        })();
        return promise.then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  return {
    from(table: string) {
      return {
        select(cols: string) {
          return makeBuilder({ kind: "select", table, cols, filters: [] });
        },
        upsert(rows: Array<Record<string, unknown>>, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
          return makeBuilder({ kind: "upsert", table, rows, onConflict: opts?.onConflict, ignoreDuplicates: opts?.ignoreDuplicates, filters: [] });
        },
        insert(rows: Array<Record<string, unknown>>) {
          return makeBuilder({ kind: "insert", table, rows, filters: [] });
        },
        update(values: Record<string, unknown>) {
          return makeBuilder({ kind: "update", table, updateValues: values, filters: [] });
        },
        delete() {
          return makeBuilder({ kind: "delete", table, filters: [] });
        },
      };
    },
    rpc(fnName: string, params: Record<string, unknown>) {
      let signal: AbortSignal | undefined;
      const builder: Record<string, unknown> = {
        abortSignal(s: AbortSignal) {
          signal = s;
          return builder;
        },
        then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
          const promise = (async () => {
            await applyLatency({ kind: "rpc", table: fnName }, signal);
            try {
              if (fnName === "acquire_openserp_ingestion_lock") {
                const r = await db.query(
                  `select * from acquire_openserp_ingestion_lock(${toSqlLiteral(params.p_lock_name)}, ${toSqlLiteral(params.p_owner_id)}, ${toSqlLiteral(params.p_lease_seconds)});`,
                );
                return { data: r.rows, error: null };
              }
              if (fnName === "release_openserp_ingestion_lock") {
                const r = await db.query(
                  `select release_openserp_ingestion_lock(${toSqlLiteral(params.p_lock_name)}, ${toSqlLiteral(params.p_owner_id)}) as result;`,
                );
                return { data: (r.rows[0] as { result: boolean }).result, error: null };
              }
              return { data: null, error: { message: `unknown rpc: ${fnName}` } };
            } catch (error) {
              return { data: null, error: { message: error instanceof Error ? error.message : String(error) } };
            }
          })();
          return promise.then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  };
}
