import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import {
  ANN_L12_QA_PROJECT_ID,
  annL12QaDetail,
  annL12QaListing,
  annL13QaMarketComparables,
} from "./fixture";

export const metadata: Metadata = {
  title: "QA — ANN-L13 Certification 10/10",
  robots: { index: false, follow: false },
};

export default function AnnouncementPageMonProjetQa() {
  return (
    <AnnouncementPageShell
      listing={annL12QaListing}
      detail={annL12QaDetail}
      marketComparables={annL13QaMarketComparables}
      projectId={ANN_L12_QA_PROJECT_ID}
      visualQa
    />
  );
}
