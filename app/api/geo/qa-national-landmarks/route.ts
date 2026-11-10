import { NextRequest, NextResponse } from "next/server";
import { parseQaBbox, queryPrivateNationalQaPack } from "@/scripts/neighborhood-context/private-national-qa-tiles.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fail closed outside explicitly opted-in local development; never serve national QA tiles in PROD. */
export async function GET(request: NextRequest) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Robots-Tag": "noindex, nofollow",
  };
  const dir = process.env.AKAR_VIVRE_ICI_QA_TILE_PACK_DIR;
  const sha = process.env.AKAR_VIVRE_ICI_QA_EXPECTED_SHA256;
  if (process.env.NODE_ENV !== "development" ||
      process.env.AKAR_VIVRE_ICI_LOCAL_POI_PREVIEW !== "true" ||
      !dir || !sha) {
    return NextResponse.json({ status: "unavailable" }, { status: 404, headers });
  }
  try {
    const search = request.nextUrl.searchParams;
    const bbox = parseQaBbox(search.get("bbox") ?? "");
    const rawLimit = search.get("limit") ?? "180";
    if (!/^[1-9]\d{0,3}$/.test(rawLimit)) throw new RangeError("invalid_limit");
    const limit = Number(rawLimit);
    if (limit > 1000) throw new RangeError("invalid_limit");
    const payload = await queryPrivateNationalQaPack(dir, sha, bbox, limit);
    return NextResponse.json(payload, { status: 200, headers });
  } catch (error) {
    if (error instanceof RangeError) {
      return NextResponse.json({ status: "invalid_viewport" }, { status: 400, headers });
    }
    console.error("[vivre-ici-qa-tiles] private read model unavailable");
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers });
  }
}
