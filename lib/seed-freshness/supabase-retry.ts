export const SUPABASE_RETRY_ATTEMPTS = 4;

export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const ordered = {
      message: record.message ?? null,
      code: record.code ?? null,
      details: record.details ?? null,
      hint: record.hint ?? null,
      status: record.status ?? null,
      statusCode: record.statusCode ?? null,
    };
    return JSON.stringify(ordered);
  }
  return String(error);
}

export function isRetryableSupabaseError(error: unknown): boolean {
  const text = formatSupabaseError(error).toLowerCase();
  if (text.includes("statement timeout")) return true;
  if (text.includes("query_canceled")) return true;
  if (text.includes('"code":"57014"')) return true;
  if (text.includes("fetch failed")) return true;
  if (text.includes('"status":500') || text.includes('"statuscode":500')) return true;
  if (text.includes('"status":502') || text.includes('"statuscode":502')) return true;
  if (text.includes('"status":503') || text.includes('"statuscode":503')) return true;
  if (text.includes('"status":504') || text.includes('"statuscode":504')) return true;
  return false;
}

export async function withSupabaseRetry<T>(
  operation: () => Promise<T>,
  label: string,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? SUPABASE_RETRY_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? 750;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryableSupabaseError(error) || attempt === attempts) break;
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.warn(`[seed-freshness] retry ${attempt}/${attempts - 1} ${label}: ${formatSupabaseError(error)}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`${label} failed: ${formatSupabaseError(lastError)}`);
}
