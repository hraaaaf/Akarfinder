import { createClient } from "npm:@supabase/supabase-js@2";

type AssetSpec = {
  role: "signature" | "immobilier" | "lifestyle";
  sourceKind: "commons_master" | "pinned_kartaview_master";
  sourceUrl: string;
  storagePath: string;
  width: number;
  height: number;
  bytes: number;
  sha1: string;
};

const BUCKET = "neighborhood-visuals";
const INGESTION_ENABLED = true;
const ASSETS: readonly AssetSpec[] = [
  {
    role: "signature",
    sourceKind: "commons_master",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Haj%20Hassan%20Al%20Akkari%20Mosque%20-%20Rabat.jpg",
    storagePath: "rabat/akkari/signature/master.jpg",
    width: 4000,
    height: 3000,
    bytes: 2_417_308,
    sha1: "b81c1ec25a3de2b176911a8e6662ad8967d2c411",
  },
  {
    role: "immobilier",
    sourceKind: "pinned_kartaview_master",
    sourceUrl: "https://raw.githubusercontent.com/hraaaaf/Akarfinder/main/public/neighborhood-visuals/rabat/akkari/immobilier/kartaview-260132875.jpg",
    storagePath: "rabat/akkari/immobilier/master.jpg",
    width: 1280,
    height: 720,
    bytes: 270_159,
    sha1: "2466f43109b1f2b0b5c55b4acca2a59585a7438e",
  },
  {
    role: "lifestyle",
    sourceKind: "pinned_kartaview_master",
    sourceUrl: "https://raw.githubusercontent.com/hraaaaf/Akarfinder/main/public/neighborhood-visuals/rabat/akkari/lifestyle/kartaview-260133961.jpg",
    storagePath: "rabat/akkari/lifestyle/master.jpg",
    width: 1280,
    height: 720,
    bytes: 251_579,
    sha1: "015123bef3d8a5c98d9f31ab3f3a581272a6ae4e",
  },
] as const;

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("source is not a JPEG");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1]; offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { height: (bytes[offset + 3] << 8) | bytes[offset + 4], width: (bytes[offset + 5] << 8) | bytes[offset + 6] };
    }
    offset += length;
  }
  throw new Error("JPEG dimensions could not be decoded");
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const exact = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-1", exact);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (!INGESTION_ENABLED) return Response.json({ error: "P1.2 Akkari ingestion is closed" }, { status: 410 });
  if (req.method !== "POST") return new Response("POST required", { status: 405 });
  const body = await req.json().catch(() => null) as { lot?: string; confirmExactSources?: boolean } | null;
  if (body?.lot !== "P1.2-AKKARI" || body.confirmExactSources !== true) return Response.json({ error: "bounded P1.2 confirmation required" }, { status: 400 });

  const url = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = secretKeysRaw ? JSON.parse(secretKeysRaw).default : legacyServiceRole;
  if (!url || !secretKey) return Response.json({ error: "admin storage environment unavailable" }, { status: 500 });
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results: Array<Record<string, unknown>> = [];

  for (const asset of ASSETS) {
    const response = await fetch(asset.sourceUrl, { headers: { "User-Agent": "AkarFinder-Neighborhood-Visual-Ingest/1.0" }, redirect: "follow" });
    if (!response.ok) throw new Error(`${asset.role}: source fetch failed ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const dimensions = jpegDimensions(bytes);
    if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw new Error(`${asset.role}: dimension drift ${dimensions.width}x${dimensions.height}`);
    if (bytes.byteLength !== asset.bytes) throw new Error(`${asset.role}: byte-size drift ${bytes.byteLength}`);
    const sha1 = await sha1Hex(bytes);
    if (sha1 !== asset.sha1) throw new Error(`${asset.role}: SHA-1 mismatch ${sha1}`);
    const exact = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const { data, error } = await admin.storage.from(BUCKET).upload(asset.storagePath, new Blob([exact], { type: "image/jpeg" }), { contentType: "image/jpeg", cacheControl: "31536000", upsert: true });
    if (error) throw new Error(`${asset.role}: storage upload failed: ${error.message}`);
    results.push({ role: asset.role, sourceKind: asset.sourceKind, bucket: BUCKET, path: data.path, width: dimensions.width, height: dimensions.height, bytes: bytes.byteLength, sha1 });
  }
  return Response.json({ lot: "P1.2-AKKARI", ingested: results.length, results });
});
