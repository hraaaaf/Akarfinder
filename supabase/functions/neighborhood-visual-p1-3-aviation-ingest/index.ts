import { createClient } from "npm:@supabase/supabase-js@2";

type AssetSpec = {
  role: "signature" | "immobilier" | "lifestyle";
  sourceUrl: string;
  storagePath: string;
  width: number;
  height: number;
  bytes: number;
  sha1: string;
};

const BUCKET = "neighborhood-visuals";
const COMMONS = "https://commons.wikimedia.org/wiki/Special:Redirect/file/";
const ASSETS: readonly AssetSpec[] = [
  { role: "signature", sourceUrl: `${COMMONS}Hassan%20II%20Park%20-%20Rabat%20-%20November%202024%20-%201.jpg`, storagePath: "rabat/aviation/signature/master.jpg", width: 4032, height: 3024, bytes: 3_222_903, sha1: "93cbebc360cb7424cfb554896b968fd917d43511" },
  { role: "immobilier", sourceUrl: `${COMMONS}Avenue%20Mohamed%20VI%20Souissi%20Rabat.jpg`, storagePath: "rabat/aviation/immobilier/master.jpg", width: 3072, height: 1728, bytes: 1_338_653, sha1: "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6" },
  { role: "lifestyle", sourceUrl: `${COMMONS}Hassan%20II%20Park%20-%20Rabat%20-%20November%202024%20-%202.jpg`, storagePath: "rabat/aviation/lifestyle/master.jpg", width: 4032, height: 3024, bytes: 3_502_946, sha1: "88d981adf174f55cdd77a5ad7518891dd1ec951d" },
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
  if (req.method !== "POST") return new Response("POST required", { status: 405 });
  const body = await req.json().catch(() => null) as { lot?: string; confirmExactSources?: boolean } | null;
  if (body?.lot !== "P1.3-AVIATION" || body.confirmExactSources !== true) return Response.json({ error: "bounded P1.3 confirmation required" }, { status: 400 });

  const url = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = secretKeysRaw ? JSON.parse(secretKeysRaw).default : legacyServiceRole;
  if (!url || !secretKey) return Response.json({ error: "admin storage environment unavailable" }, { status: 500 });
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results: Array<Record<string, unknown>> = [];

  for (const asset of ASSETS) {
    const response = await fetch(asset.sourceUrl, { headers: { "User-Agent": "AkarFinder-P1.3-Aviation/1.0" }, redirect: "follow" });
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
    results.push({ role: asset.role, path: data.path, width: dimensions.width, height: dimensions.height, bytes: bytes.byteLength, sha1 });
  }
  return Response.json({ lot: "P1.3-AVIATION", ingested: results.length, results });
});
