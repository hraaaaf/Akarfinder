"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LegacyIntentHashRedirect({ intent }: { intent: "buy" | "rent" }) {
  const router = useRouter();

  useEffect(() => {
    if (intent === "rent" && window.location.hash === "#alerte") {
      router.replace("/mon-projet");
      return;
    }
    if (intent === "buy" && window.location.hash === "#financement") {
      router.replace("/credit");
    }
  }, [intent, router]);

  return null;
}
