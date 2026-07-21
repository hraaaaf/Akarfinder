import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest } from "@/lib/professional/auth";
import { claimProfessionalListingOwnership } from "@/lib/professional/repository";
import { parseListingOwnershipClaim } from "@/lib/professional/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!identity) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const { organizationId } = await context.params;
    const propertyListingId = parseListingOwnershipClaim(await request.json().catch(() => null));
    if (!propertyListingId) {
      return NextResponse.json({ error: "INVALID_PROPERTY_LISTING_ID" }, { status: 400 });
    }

    const ownership = await claimProfessionalListingOwnership(
      identity.user_id,
      organizationId,
      propertyListingId,
    );
    if (!ownership) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    return NextResponse.json({
      ownership,
      notice: "La revendication est enregistrée. Elle ne constitue pas une validation publique tant que le statut n'est pas verified.",
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "LISTING_NOT_FOUND") {
      return NextResponse.json({ error: "LISTING_NOT_FOUND" }, { status: 404 });
    }
    console.error("[api/pro/ownership/listings] failed", error);
    return NextResponse.json({ error: "OWNERSHIP_CLAIM_FAILED" }, { status: 503 });
  }
}
