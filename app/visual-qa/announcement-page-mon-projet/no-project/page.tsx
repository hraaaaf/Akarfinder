import type { Metadata } from "next";
import { AnnouncementPageShell } from "@/components/listings/AnnouncementPageShell";
import { annL12QaDetail, annL12QaListing } from "../fixture";

export const metadata: Metadata = {
  title: "QA — ANN-L12 sans projet",
  robots: { index: false, follow: false },
};

export default function AnnouncementPageWithoutProjectQa() {
  return <AnnouncementPageShell listing={annL12QaListing} detail={annL12QaDetail} visualQa />;
}
