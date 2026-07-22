import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Clarifier mon projet immobilier — AkarFinder",
  description:
    "Clarifiez votre objectif, votre budget, vos zones et vos critères avec le Compagnon AkarFinder.",
  robots: {
    index: false,
    follow: true,
  },
};

type Props = { searchParams: Promise<{ listing?: string; intent?: string }> };

function normalizeIntent(intent?: string): string | null {
  if (intent === "acheter") return "buy";
  if (intent === "louer") return "rent";
  if (intent === "neuf") return "new";
  return null;
}

/**
 * Legacy buyer/tenant lead-onboarding flow retired into the single Companion →
 * Mon Projet journey. Human-advisor CTAs coming from /neuf are routed to the
 * dedicated accompaniment form instead of masquerading as buyer onboarding.
 */
export default async function OnboardingPage({ searchParams }: Props) {
  const { listing, intent } = await searchParams;
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  let fromNeuf = intent === "neuf";
  if (!fromNeuf && referer) {
    try {
      fromNeuf = new URL(referer).pathname.startsWith("/neuf");
    } catch {
      fromNeuf = false;
    }
  }

  if (fromNeuf && !listing) {
    redirect("/accompagnement?intent=neuf");
  }

  const params = new URLSearchParams();
  const normalizedIntent = normalizeIntent(intent);
  if (normalizedIntent) params.set("type", normalizedIntent);
  if (listing) params.set("listing", listing);
  params.set("from", "legacy_onboarding");
  redirect(`/compagnon?${params.toString()}`);
}
