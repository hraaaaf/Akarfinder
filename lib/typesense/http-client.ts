import { TYPESENSE_COLLECTION, typesenseSearchCollectionSchema, type TypesenseSearchDocument } from "./search-readmodel";

type TypesenseConfig = { host: string; apiKey: string };

function config(env: NodeJS.ProcessEnv = process.env): TypesenseConfig {
  const host = env.TYPESENSE_HOST?.replace(/\/$/, "");
  const apiKey = env.TYPESENSE_ADMIN_API_KEY;
  if (!host || !apiKey) throw new Error("typesense_shadow_config_missing");
  return { host, apiKey };
}

async function request(path: string, init: RequestInit = {}, env: NodeJS.ProcessEnv = process.env) {
  const { host, apiKey } = config(env);
  const response = await fetch(`${host}${path}`, {
    ...init,
    headers: { "X-TYPESENSE-API-KEY": apiKey, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`typesense_request_failed:${response.status}:${await response.text()}`);
  return response;
}

export async function ensureTypesenseCollection(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const { host, apiKey } = config(env);
  const existing = await fetch(`${host}/collections/${TYPESENSE_COLLECTION}`, {
    headers: { "X-TYPESENSE-API-KEY": apiKey }, signal: AbortSignal.timeout(10_000),
  });
  if (existing.ok) return;
  if (existing.status !== 404) throw new Error(`typesense_collection_probe_failed:${existing.status}`);
  await request("/collections", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(typesenseSearchCollectionSchema),
  }, env);
}

export async function importTypesenseDocuments(documents: TypesenseSearchDocument[], env: NodeJS.ProcessEnv = process.env) {
  if (documents.length === 0) return { success: 0, failed: 0 };
  const body = documents.map((document) => JSON.stringify(document)).join("\n");
  const response = await request(`/collections/${TYPESENSE_COLLECTION}/documents/import?action=upsert`, {
    method: "POST", headers: { "content-type": "text/plain" }, body,
  }, env);
  const lines = (await response.text()).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as { success: boolean });
  return { success: lines.filter((line) => line.success).length, failed: lines.filter((line) => !line.success).length };
}
