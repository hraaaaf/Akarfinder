import { enrichSearchQueryWithTextIntent } from "./query-intent";
import {
  buildSearchRequestQuery,
  type SearchParamReader,
} from "./search-request-query";
import type { SearchQuery } from "./types";

type SearchPageParams = Record<string, string | string[] | undefined>;

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function pageParamReader(searchParams: SearchPageParams): SearchParamReader {
  return (name) => pickFirst(searchParams[name]);
}

export function buildRawSearchPageQuery(searchParams: SearchPageParams): SearchQuery {
  return buildSearchRequestQuery(pageParamReader(searchParams));
}

export function buildSearchPageQuery(searchParams: SearchPageParams): SearchQuery {
  return enrichSearchQueryWithTextIntent(buildRawSearchPageQuery(searchParams));
}
