import {
  analyzeGatewayQueryContext,
  scoreGatewayResultRelevance,
} from "../../lib/search-gateway/search-gateway-relevance-tuning";
import type { SearchGatewayNormalizedResult } from "../../lib/search-gateway/search-gateway-types";

type AuditGrade = "A" | "B" | "C" | "D";

const QUERIES = [
  "appartement casablanca",
  "appartement a vendre casablanca",
  "location studio casablanca",
  "location appartement rabat",
  "villa rabat",
  "villa a vendre rabat",
  "appartement marrakech",
  "terrain marrakech",
  "terrain a vendre marrakech",
  "programme neuf casablanca",
  "location tanger",
  "maison fes",
];

function classifyResult(
  result: SearchGatewayNormalizedResult,
  query: string,
): { grade: AuditGrade; score: number; flags: ReturnType<typeof scoreGatewayResultRelevance>["flags"] } {
  const analysis = analyzeGatewayQueryContext({ q: query });
  const breakdown = scoreGatewayResultRelevance(result, analysis);

  if (
    breakdown.flags.hasTransactionMismatch ||
    (breakdown.flags.cityMismatch && !breakdown.flags.cityMatched && breakdown.totalScore < 10)
  ) {
    return { grade: "D", score: breakdown.totalScore, flags: breakdown.flags };
  }

  if (
    breakdown.totalScore >= 36 &&
    !breakdown.flags.isNationalPage &&
    !breakdown.flags.isPriceReferencePage &&
    !breakdown.flags.isGenericPage
  ) {
    return { grade: "A", score: breakdown.totalScore, flags: breakdown.flags };
  }

  if (breakdown.totalScore >= 16) {
    return { grade: "B", score: breakdown.totalScore, flags: breakdown.flags };
  }

  if (breakdown.totalScore >= 0) {
    return { grade: "C", score: breakdown.totalScore, flags: breakdown.flags };
  }

  return { grade: "D", score: breakdown.totalScore, flags: breakdown.flags };
}

async function fetchGatewayResults(baseUrl: string, query: string) {
  const response = await fetch(`${baseUrl}/api/search/gateway?q=${encodeURIComponent(query)}`, {
    headers: { "user-agent": "AkarFinder audit" },
  });
  if (!response.ok) {
    throw new Error(`Gateway request failed for "${query}" (${response.status})`);
  }
  const payload = await response.json();
  return (payload.results ?? []) as SearchGatewayNormalizedResult[];
}

async function run() {
  const baseUrl = process.argv[2]?.trim() || "https://akarfinder.vercel.app";
  const rows = [];

  for (const query of QUERIES) {
    const results = await fetchGatewayResults(baseUrl, query);
    const graded = results.map((result) => ({
      result,
      ...classifyResult(result, query),
    }));

    const counts = { A: 0, B: 0, C: 0, D: 0 } as Record<AuditGrade, number>;
    for (const item of graded) counts[item.grade] += 1;

    const top10 = graded.slice(0, 10);
    const top10Relevant = top10.filter((item) => item.grade === "A" || item.grade === "B").length;
    const sources = Object.entries(
      graded.reduce<Record<string, number>>((acc, item) => {
        const source = item.result.source_name || item.result.source_id;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    rows.push({
      query,
      total: results.length,
      A: counts.A,
      B: counts.B,
      C: counts.C,
      D: counts.D,
      abRate: results.length ? Number((((counts.A + counts.B) / results.length) * 100).toFixed(1)) : 0,
      mismatch: graded.filter((item) => item.flags.hasTransactionMismatch).length,
      national: graded.filter((item) => item.flags.isNationalPage).length,
      price: graded.filter((item) => item.flags.isPriceReferencePage).length,
      generic: graded.filter((item) => item.flags.isGenericPage).length,
      top10: `${top10Relevant}/10`,
      sources,
      top3: graded.slice(0, 3).map((item) => ({
        source: item.result.source_name,
        title: item.result.title,
        score: item.score,
        grade: item.grade,
      })),
    });
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.A += row.A;
      acc.B += row.B;
      acc.C += row.C;
      acc.D += row.D;
      return acc;
    },
    { total: 0, A: 0, B: 0, C: 0, D: 0 },
  );

  const summary = {
    baseUrl,
    queries: rows.length,
    averageResults: Number((totals.total / rows.length).toFixed(1)),
    abRate: totals.total ? Number((((totals.A + totals.B) / totals.total) * 100).toFixed(1)) : 0,
    rows,
  };

  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
