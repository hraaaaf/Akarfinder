import { createClient } from "npm:@supabase/supabase-js@2";

type MasterSpec = {
  role: "signature" | "immobilier" | "lifestyle";
  sourceUrl: string;
  storagePath: string;
  width: number;
  height: number;
  sha1?: string;
};

const BUCKET = "neighborhood-visuals";
const MASTERS: readonly MasterSpec[] = [
  {
    role: "signature",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Avenue%20Mohamed%20VI%20Souissi%20Rabat.jpg",
    storagePath: "rabat/souissi/signature/master.jpg",
    width: 3072,
    height: 1728,
    sha1: "d8e09bfdbad2fdef60f28840b90b79b45f77b8c6",
  },
  {
    role: "immobilier",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Rabat%2CSouissi1.jpg",
    storagePath: "rabat/souissi/immobilier/master.jpg",
    width: 1440,
    height: 964,
  },
  {
    role: "lifestyle",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hassan%20II%20Park%20-%20Rabat%20-%20November%202024%20-%201.jpg",
    storagePath: "rabat/souissi/lifestyle/master.jpg",
    width: 4032,
    height: 3024,
  },
] as const;

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new Error("source is not a JPEG");
  }

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > bytes.length) break;

    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;

    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return { width, height };
    }
    offset += length;
  }

  throw new Error("JPEG dimensions could not be decoded");
}

async function sha1Hex(bytes: Uint8Array): Promise<string> {
  const exactBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-1", exactBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("POST required", { status: 405 });

  const body = await req.json().catch(() => null) as { lot?: string; confirmExactSources?: boolean } | null;
  if (body?.lot !== "P0.7-SOUISSI" || body.confirmExactSources !== true) {
    return Response.json({ error: "bounded P0.7 confirmation required" }, { status: 400 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacyServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const secretKey = secretKeysRaw ? JSON.parse(secretKeysRaw).default : legacyServiceRole;
  if (!url || !secretKey) return Response.json({ error: "admin storage environment unavailable" }, { status: 500 });

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const results: Array<Record<string, unknown>> = [];

  for (const master of MASTERS) {
    const response = await fetch(master.sourceUrl, {
      headers: { "User-Agent": "AkarFinder-Neighborhood-Visual-Ingest/1.0" },
      redirect: "follow",
    });
    if (!response.ok) throw new Error(`${master.role}: source fetch failed ${response.status}`);

    const bytes = new Uint8Array(await response.arrayBuffer());
    const dimensions = jpegDimensions(bytes);
    if (dimensions.width !== master.width || dimensions.height !== master.height) {
      throw new Error(`${master.role}: dimension drift ${dimensions.width}x${dimensions.height}`);
    }

    const sha1 = await sha1Hex(bytes);
    if (master.sha1 && sha1 !== master.sha1) {
      throw new Error(`${master.role}: SHA-1 mismatch ${sha1}`);
    }

    const exactBuffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([exactBuffer], { type: "image/jpeg" });
    const { data, error } = await admin.storage.from(BUCKET).upload(master.storagePath, blob, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`${master.role}: storage upload failed: ${error.message}`);

    results.push({
      role: master.role,
      bucket: BUCKET,
      path: data.path,
      width: dimensions.width,
      height: dimensions.height,
      bytes: bytes.byteLength,
      sha1,
    });
  }

  return Response.json({ lot: "P0.7-SOUISSI", ingested: results.length, results });
});
