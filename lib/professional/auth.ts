import type { NextRequest } from "next/server";
import {
  authenticateBearerRequest,
  readBearerToken,
  type AuthIdentity,
} from "@/lib/auth/server-auth";

export type ProfessionalAuthIdentity = AuthIdentity;
export { readBearerToken };

export async function authenticateProfessionalRequest(
  request: Pick<NextRequest, "headers">,
): Promise<ProfessionalAuthIdentity | null> {
  return authenticateBearerRequest(request);
}

export function requireAkarFinderStaff(identity: ProfessionalAuthIdentity | null): boolean {
  return identity?.is_akarfinder_staff === true;
}
