import { NextResponse, type NextRequest } from "next/server";

import { authenticateConsumerRequest } from "@/lib/auth/session-cookies";
import { queryListingById } from "@/lib/db/index";
import { buildProjectRoutesForListing } from "@/lib/geo/project-routes-service";
import { mapDbRowToListing } from "@/lib/listings/map-db-listing";
import type { Listing } from "@/lib/listings/types";
import { parseDynamicSearchProfileV2 } from "@/lib/search-profile-v2/parse";
import { queryOwnerListingDetail } from "@/lib/seller/owner-listing-detail";
import { canShowInternalListingDetail } from "@/lib/sources/source-access-registry";
import { readOwnedProject } from "@/lib/user-continuity/project-reader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveListing(listingId: string): Promise<Listing | null> {
  if (listingId.startsWith("owner-")) {
    return await queryOwnerListingDetail(listingId.slice("owner-".length));
  }
  const row = await queryListingById(listingId);
  if (!row) return null;
  try {
    const listing = mapDbRowToListing(row);
    return canShowInternalListingDetail(listing.source_name ?? "") ? listing : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const identity = await authenticateConsumerRequest(request);
  if (!identity) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const projectId = body?.project_id;
  const listingId = body?.listing_id;
  if (!isUuid(projectId) || typeof listingId !== "string" || !listingId.trim() || listingId.length > 200) {
    return NextResponse.json({ error: "INVALID_PROJECT_ROUTE_INPUT" }, { status: 400 });
  }

  try {
    const project = await readOwnedProject(identity.user_id, projectId);
    if (!project) return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    const profile = parseDynamicSearchProfileV2(project.profile);
    if (!profile) return NextResponse.json({ error: "PROJECT_PROFILE_UNAVAILABLE" }, { status: 422 });

    const listing = await resolveListing(listingId.trim());
    if (!listing) return NextResponse.json({ error: "LISTING_NOT_FOUND" }, { status: 404 });

    const routes = await buildProjectRoutesForListing(listing, profile.location.anchors);
    return NextResponse.json({ project_id: project.id, listing_id: listing.id, routes });
  } catch (error) {
    console.error("[api/me/project-routes] failed closed", error);
    return NextResponse.json({ error: "PROJECT_ROUTES_FAILED" }, { status: 500 });
  }
}
