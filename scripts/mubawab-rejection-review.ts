import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const runDir = join(process.cwd(), "data-ingestion", "runs", "mubawab", "lot6-multitype");

type Listing = {
  source: { source_id: string; url: string };
  title: string | null;
  description: string | null;
  transaction: string | null;
  property_type: string | null;
  price: { amount: number | null; currency: string; period: string | null; on_request: boolean };
  raw: Record<string, unknown>;
};

type QualityError = {
  stage: string;
  source_id: string | null;
  url: string | null;
  message: string;
  retryable: boolean;
};

async function readListings(): Promise<Map<string, Listing>> {
  const byId = new Map<string, Listing>();
  const files = (await readdir(runDir)).filter((name) => /^listings-\d{4}\.jsonl$/.test(name)).sort();
  for (const file of files) {
    const raw = await readFile(join(runDir, file), "utf8");
    for (const line of raw.split("\n").filter(Boolean)) {
      const listing = JSON.parse(line) as Listing;
      byId.set(listing.source.source_id, listing);
    }
  }
  return byId;
}

async function main() {
  const listings = await readListings();
  const errorsRaw = await readFile(join(runDir, "errors.jsonl"), "utf8");
  const errors = errorsRaw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as QualityError);
  const qualityRejects = errors.filter((error) => error.stage === "quality");

  const review = qualityRejects.map((error) => {
    const listing = error.source_id ? listings.get(error.source_id) : undefined;
    const evidence = listing?.raw?.transaction_evidence ?? null;
    return {
      source_id: error.source_id,
      canonical_url: listing?.source.url ?? error.url,
      reasons: error.message.split(",").filter(Boolean),
      title: listing?.title ?? null,
      property_type: listing?.property_type ?? null,
      transaction: listing?.transaction ?? null,
      price: listing?.price ?? null,
      description_excerpt: listing?.description ? listing.description.slice(0, 500) : null,
      transaction_evidence: evidence,
      requires_manual_review: true,
    };
  });

  const output = {
    generated_at: new Date().toISOString(),
    rejection_count: review.length,
    policy: "Every new quality rejection must be reviewed with its canonical discovered URL before Lot 6 expansion is accepted.",
    rejections: review,
  };

  await writeFile(join(runDir, "rejection-review.json"), JSON.stringify(output, null, 2), "utf8");
  console.log(JSON.stringify({ rejection_count: review.length }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
