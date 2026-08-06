import { NextResponse, type NextRequest } from "next/server";
import { authenticateProfessionalRequest, requireAkarFinderStaff } from "@/lib/professional/auth";
import { convertProfessionalActivationToOrganization } from "@/lib/professional/identity-repository";
import { parseProfessionalActivationConversionInput } from "@/lib/professional/identity-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ activationRequestId: string }> };

function conversionErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("NOT_FOUND")) return 404;
  if (message.includes("ALREADY_CONVERTED")) return 409;
  if (
    message.includes("NOT_QUALIFIED")
    || message.includes("TYPE_UNSUPPORTED")
    || message.includes("SLUG_INVALID")
    || message.includes("OWNER_USER_REQUIRED")
  ) return 422;
  if (message.includes("OWNER_USER_NOT_FOUND")) return 422;
  if (message.includes("duplicate key") || message.includes("unique constraint")) return 409;
  return 503;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const identity = await authenticateProfessionalRequest(request);
    if (!requireAkarFinderStaff(identity)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { activationRequestId } = await context.params;
    const input = parseProfessionalActivationConversionInput(
      activationRequestId,
      await request.json().catch(() => null),
    );
    if (!input) {
      return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
    }

    const conversion = await convertProfessionalActivationToOrganization(input);
    return NextResponse.json({ conversion }, { status: 201 });
  } catch (error) {
    const status = conversionErrorStatus(error);
    console.error("[api/admin/pro/activation-conversion] failed", error);
    return NextResponse.json(
      { error: status === 503 ? "ACTIVATION_CONVERSION_FAILED" : "ACTIVATION_CONVERSION_REJECTED" },
      { status },
    );
  }
}
