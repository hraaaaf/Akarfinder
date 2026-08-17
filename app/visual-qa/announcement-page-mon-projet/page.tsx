import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import { ANN_L12_QA_PROJECT_ID, annL12QaDetail, annL12QaListing } from "./fixture";

export const metadata: Metadata = {
  title: "QA — ANN-L12 Mon Projet personnalisé",
  robots: { index: false, follow: false },
};

export default function AnnouncementPageMonProjetQa() {
  return (
    <AnnouncementPageShell
      listing={annL12QaListing}
      detail={annL12QaDetail}
      projectId={ANN_L12_QA_PROJECT_ID}
      visualQa
    />
  );
}
