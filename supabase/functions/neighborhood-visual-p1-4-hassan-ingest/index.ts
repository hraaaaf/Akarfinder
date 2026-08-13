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
  { role: "signature", sourceUrl: `${COMMONS}%D9%86%D8%A7%D9%81%D9%88%D8%B1%D8%A9%20%D8%B5%D9%88%D9%85%D8%B9%D8%A9%20%D8%AD%D8%B3%D8%A7%D9%86.jpg`, storagePath: "rabat/hassan/signature/master.jpg", width: 5184, height: 3456, bytes: 8_754_722, sha1: "6522403ac6ec1bf56276a8aa5794693a66aa7c08" },
  { role: "immobilier", sourceUrl: `${COMMONS}View-of-Rabat-from-Hassan-Tower.jpg`, storagePath: "rabat/hassan/immobilier/master.jpg", width: 3456, height: 2304, bytes: 2_877_341, sha1: "ffc30f2a48e055403880d933e29e16a853986e3e" },
  { role: "lifestyle", sourceUrl: `${COMMONS}Quartier%20Hassan%2C%20Rabat%2C%20Morocco%20-%20panoramio%20%281%29.jpg`, storagePath: "rabat/hassan/lifestyle/master.jpg", width: 1375, height: 2048, bytes: 365_717, sha1: "fe36362031f75d1835931f46e15f8e43dccc4a7c" },
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
  if (body?.lot !== "P1.4-HASSAN" || body.confirmExactSources !== true) return Response.json({ error: "bounded P1.4 confirmation required" }, { status: 400 });

  const url = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = secretKeysRaw ? JSON.parse(secretKeysRaw).default : legacyServiceRole;
  if (!url || !secretKey) return Response.json({ error: "admin storage environment unavailable" }, { status: 500 });
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results: Array<Record<string, unknown>> = [];

  for (const asset of ASSETS) {
    const response = await fetch(asset.sourceUrl, { headers: { "User-Agent": "AkarFinder-P1.4-Hassan/1.0" }, redirect: "follow" });
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
  return Response.json({ lot: "P1.4-HASSAN", ingested: results.length, results });
});
