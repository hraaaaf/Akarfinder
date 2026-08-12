import { createClient } from "npm:@supabase/supabase-js@2";

type AssetSpec = {
  role: "signature" | "immobilier" | "lifestyle";
  sourceKind: "commons_master" | "project_supplied_derivative";
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
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Al%20Boraq%20Railway%20station%20Rabat%20Agdal.jpg",
    storagePath: "rabat/agdal/signature/master.jpg",
    width: 4160,
    height: 2340,
    bytes: 2_880_808,
    sha1: "6cded8a860ea6b7517e81c432c1bf858ccf6b52e",
  },
  {
    role: "immobilier",
    sourceKind: "project_supplied_derivative",
    sourceUrl: "https://raw.githubusercontent.com/hraaaaf/Akarfinder/main/public/neighborhood-visuals/rabat/agdal/immobilier/fal-ould-oumeir-search.jpg",
    storagePath: "rabat/agdal/immobilier/search.jpg",
    width: 320,
    height: 180,
    bytes: 11_487,
    sha1: "dd4eaab40b68090dcba6f85c58f1365213e0177f",
  },
  {
    role: "lifestyle",
    sourceKind: "commons_master",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Jardin%20d%27essai%20botanique%2C%20Rabat.jpg",
    storagePath: "rabat/agdal/lifestyle/master.jpg",
    width: 4080,
    height: 3060,
    bytes: 3_651_983,
    sha1: "73da97f09b0dc9cf796a9bac8a210f78525667ff",
  },
] as const;

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("source is not a JPEG");
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += length;
  }
  throw new Error("JPEG dimensions could not be decoded");
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const exactBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-1", exactBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (!INGESTION_ENABLED) return Response.json({ error: "P1.1 Agdal ingestion is closed" }, { status: 410 });
  if (req.method !== "POST") return new Response("POST required", { status: 405 });

  const body = await req.json().catch(() => null) as { lot?: string; confirmExactSources?: boolean } | null;
  if (body?.lot !== "P1.1-AGDAL" || body.confirmExactSources !== true) {
    return Response.json({ error: "bounded P1.1 confirmation required" }, { status: 400 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = secretKeysRaw ? JSON.parse(secretKeysRaw).default : legacyServiceRole;
  if (!url || !secretKey) return Response.json({ error: "admin storage environment unavailable" }, { status: 500 });

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results: Array<Record<string, unknown>> = [];

  for (const asset of ASSETS) {
    const response = await fetch(asset.sourceUrl, {
      headers: { "User-Agent": "AkarFinder-Neighborhood-Visual-Ingest/1.0" },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`${asset.role}: source fetch failed ${response.status}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const dimensions = jpegDimensions(bytes);
    if (dimensions.width !== asset.width || dimensions.height !== asset.height) {
      throw new Error(`${asset.role}: dimension drift ${dimensions.width}x${dimensions.height}`);
    }
    if (bytes.byteLength !== asset.bytes) throw new Error(`${asset.role}: byte-size drift ${bytes.byteLength}`);
    const sha1 = await sha1Hex(bytes);
    if (sha1 !== asset.sha1) throw new Error(`${asset.role}: SHA-1 mismatch ${sha1}`);

    const exactBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([exactBuffer], { type: "image/jpeg" });
    const { data, error } = await admin.storage.from(BUCKET).upload(asset.storagePath, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`${asset.role}: storage upload failed: ${error.message}`);

    results.push({
      role: asset.role,
      sourceKind: asset.sourceKind,
      bucket: BUCKET,
      path: data.path,
      width: dimensions.width,
      height: dimensions.height,
      bytes: bytes.byteLength,
      sha1,
    });
  }

  return Response.json({ lot: "P1.1-AGDAL", ingested: results.length, results });
});
