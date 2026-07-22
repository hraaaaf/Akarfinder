import { redirect } from "next/navigation";

export const metadata = {
  title: "AkarFinder Pro — Accès professionnel sécurisé",
  robots: "noindex, nofollow",
};

/**
 * The legacy token-based lead inbox is retired. Never expose an internal-looking
 * dead end from a public CTA: route legacy traffic back to the canonical Pro
 * acquisition surface until the authenticated organization workspace is live.
 */
export default function LegacyProLeadsRetiredPage() {
  redirect("/pro#contact");
}
