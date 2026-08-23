export async function collectKeysetPages<T>(
  fetchPage: (cursor: string | null, limit: number) => Promise<T[]>,
  getCursor: (row: T) => string,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("KEYSET_PAGE_SIZE_INVALID");
  }

  const out: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const rows = await fetchPage(cursor, pageSize);
    if (rows.length > pageSize) {
      throw new Error("KEYSET_PAGE_EXCEEDS_LIMIT");
    }

    out.push(...rows);
    if (rows.length < pageSize) break;

    const nextCursor = getCursor(rows[rows.length - 1]);
    if (!nextCursor || nextCursor === cursor) {
      throw new Error("KEYSET_CURSOR_NOT_ADVANCING");
    }
    cursor = nextCursor;
  }

  return out;
}
