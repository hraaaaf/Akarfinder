import { neon } from "@neondatabase/serverless";

type NeonReadError = { message: string; code?: string };
export type NeonReadResult<T = Record<string, unknown>> = {
  data: T[] | null;
  error: NeonReadError | null;
};

function databaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required for Neon runtime reads");
  return value;
}

function identifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function selectList(value: string): string {
  if (value.trim() === "*") return "*";
  return value
    .split(",")
    .map((part) => identifier(part.trim()))
    .join(", ");
}

export async function queryNeonRows<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const sql = neon(databaseUrl());
  return (await sql.query(text, params)) as T[];
}

type Filter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] };

class NeonReadQuery<T = Record<string, unknown>>
  implements PromiseLike<NeonReadResult<T>> {
  private columns = "*";
  private readonly filters: Filter[] = [];
  private rowLimit: number | null = null;
  private rowOffset = 0;

  constructor(private readonly table: string) {
    identifier(table);
  }

  select(columns: string): this {
    selectList(columns);
    this.columns = columns;
    return this;
  }

  eq(column: string, value: unknown): this {
    identifier(column);
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  in(column: string, values: readonly unknown[]): this {
    identifier(column);
    this.filters.push({ kind: "in", column, values: [...values] });
    return this;
  }

  limit(count: number): this {
    this.rowLimit = Math.max(0, Math.trunc(count));
    return this;
  }

  range(from: number, to: number): this {
    this.rowOffset = Math.max(0, Math.trunc(from));
    this.rowLimit = Math.max(0, Math.trunc(to) - this.rowOffset + 1);
    return this;
  }

  private async execute(): Promise<NeonReadResult<T>> {
    try {
      const params: unknown[] = [];
      const predicates: string[] = [];

      for (const filter of this.filters) {
        const column = identifier(filter.column);
        if (filter.kind === "eq") {
          params.push(filter.value);
          predicates.push(`${column} = $${params.length}`);
          continue;
        }

        if (filter.values.length === 0) {
          predicates.push("FALSE");
          continue;
        }

        const placeholders = filter.values.map((value) => {
          params.push(value);
          return `$${params.length}`;
        });
        predicates.push(`${column} IN (${placeholders.join(", ")})`);
      }

      let query = `SELECT ${selectList(this.columns)} FROM ${identifier(this.table)}`;
      if (predicates.length) query += ` WHERE ${predicates.join(" AND ")}`;
      if (this.rowLimit != null) {
        params.push(this.rowLimit);
        query += ` LIMIT $${params.length}`;
      }
      if (this.rowOffset > 0) {
        params.push(this.rowOffset);
        query += ` OFFSET $${params.length}`;
      }

      return { data: await queryNeonRows<T>(query, params), error: null };
    } catch (error) {
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  then<TResult1 = NeonReadResult<T>, TResult2 = never>(
    onfulfilled?: ((value: NeonReadResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export type NeonReadClient = {
  from<T = Record<string, unknown>>(table: string): NeonReadQuery<T>;
};

export function getNeonReadClient(): NeonReadClient {
  return {
    from<T = Record<string, unknown>>(table: string) {
      return new NeonReadQuery<T>(table);
    },
  };
}
