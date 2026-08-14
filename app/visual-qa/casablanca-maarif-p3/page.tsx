import { notFound } from "next/navigation";
import { CasablancaMaarifP3QAFixture } from "@/components/search/CasablancaMaarifP3QAFixture";

export const dynamic = "force-dynamic";

export default function CasablancaMaarifP3Page() {
  if (process.env.NEIGHBORHOOD_VISUAL_QA !== "1" && process.env.CI !== "true") notFound();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-8">
      <div className="mx-auto max-w-none">
        <header className="mb-5 max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-bronze-600">
            AkarFinder · Visual QA
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-deepblue sm:text-3xl">
            P3.1 — Casablanca / Maârif
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Validation Search réelle des trois scènes contextuelles Maârif. Chaque image reste une photo d’ambiance, jamais une photo du bien affiché.
          </p>
        </header>
        <CasablancaMaarifP3QAFixture />
      </div>
    </main>
  );
}
