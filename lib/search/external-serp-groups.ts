import { buildExternalResultPresentation } from "@/lib/search/external-result-presentation";
import { groupPublicResultsBySimilarity } from "@/lib/public-result-similarity/group-public-results";
import { assertPublicResultSimilaritySafety } from "@/lib/public-result-similarity/public-safety";
import type {
  PublicResultSimilarityInternalSummary,
  PublicResultSimilaritySummary,
} from "@/lib/public-result-similarity/types";
import type { SearchGatewayNormalizedResult } from "@/lib/search-gateway/search-gateway-types";

export type ExternalSerpGroup = {
  key: string;
  results: SearchGatewayNormalizedResult[];
  similarPossible: boolean;
};

function toPublicSummary(
  summary: PublicResultSimilarityInternalSummary,
): PublicResultSimilaritySummary {
  return {
    similar_possible: summary.similar_possible,
    similar_count: summary.similar_count,
    similar_public_label: summary.similar_public_label,
    similar_reasons_public: summary.similar_reasons_public,
  };
}

function sourceHost(result: SearchGatewayNormalizedResult): string {
  const presentation = buildExternalResultPresentation(result);
  return presentation.sourceHost.replace(/^www\./i, "").toLowerCase();
}

export function buildExternalSerpGroups(
  results: SearchGatewayNormalizedResult[],
): ExternalSerpGroup[] {
  const visibleResults = results.filter((result) => result.can_show_result);
  if (visibleResults.length === 0) return [];

  const resultById = new Map(visibleResults.map((result) => [result.id, result]));
  const inputs = visibleResults.map((result) => {
    const presentation = buildExternalResultPresentation(result);
    return {
      id: result.id,
      title: presentation.title,
      snippet: presentation.snippet ?? undefined,
      original_url: result.original_url,
      display_url: presentation.displayUrl ?? result.display_url,
      source_name: result.source_name,
      source_host: presentation.sourceHost,
    };
  });

  const similarityGroups = groupPublicResultsBySimilarity(inputs);
  const similarityGroupByResultId = new Map<string, (typeof similarityGroups)[number]>();

  for (const group of similarityGroups) {
    for (const summary of Object.values(group.summaries)) {
      assertPublicResultSimilaritySafety(toPublicSummary(summary));
    }
    for (const resultId of group.result_ids) {
      similarityGroupByResultId.set(resultId, group);
    }
  }

  const consumed = new Set<string>();
  const output: ExternalSerpGroup[] = [];

  for (const result of visibleResults) {
    if (consumed.has(result.id)) continue;

    const similarityGroup = similarityGroupByResultId.get(result.id);
    if (similarityGroup) {
      const members = similarityGroup.result_ids
        .map((resultId) => resultById.get(resultId))
        .filter((member): member is SearchGatewayNormalizedResult => Boolean(member));
      const uniqueHosts = new Set(members.map(sourceHost));

      // Option B is deliberately multi-source: a same-site resemblance alone is not collapsed.
      if (members.length > 1 && uniqueHosts.size > 1) {
        for (const member of members) consumed.add(member.id);
        output.push({
          key: `multi-source:${members.map((member) => member.id).join(":")}`,
          results: members,
          similarPossible: true,
        });
        continue;
      }
    }

    consumed.add(result.id);
    output.push({ key: `single:${result.id}`, results: [result], similarPossible: false });
  }

  return output;
}
