import { notFound } from "next/navigation";
import { AgdalNeighborhoodVisualQAFixture } from "@/components/search/AgdalNeighborhoodVisualQAFixture";

export const dynamic = "force-dynamic";

export default function AgdalNeighborhoodVisualQAPage() {
  if (process.env.NEIGHBORHOOD_VISUAL_QA !== "1") notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-none">
        <header className="mb-5 max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-bronze-600">AkarFinder · Visual QA</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-deepblue sm:text-3xl">Agdal — 3 scènes réelles</h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Certification uniquement. Sources réelles, zéro génération ; Fal Ould Oumeir utilise un crop/resize Search déterministe du master privé certifié.
          </p>
        </header>
        <AgdalNeighborhoodVisualQAFixture />
      </div>
    </main>
  );
}
