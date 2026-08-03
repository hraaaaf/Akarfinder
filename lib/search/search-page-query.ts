import { enrichSearchQueryWithTextIntent } from "./query-intent";
import {
  buildSearchRequestQuery,
  type SearchParamReader,
} from "./search-request-query";
import type { SearchQuery } from "./types";

type SearchPageParams = Record<string, string | string[] | undefined>;

export const SEARCH_PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_SEARCH_PAGE_SIZE = 10;

export type SearchPagination = {
  page: number;
  perPage: number;
};

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function pageParamReader(searchParams: SearchPageParams): SearchParamReader {
  return (name) => pickFirst(searchParams[name]);
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.trunc(parsed);
}

function searchPageSize(raw: string | undefined): number {
  const parsed = positiveInteger(raw, DEFAULT_SEARCH_PAGE_SIZE);
  return SEARCH_PAGE_SIZES.includes(parsed as (typeof SEARCH_PAGE_SIZES)[number])
    ? parsed
    : DEFAULT_SEARCH_PAGE_SIZE;
}

export function resolveSearchPagination(searchParams: SearchPageParams): SearchPagination {
  const perPage = searchPageSize(pickFirst(searchParams.per_page));
  const explicitPage = positiveInteger(pickFirst(searchParams.page), 0);
  const offset = Number(pickFirst(searchParams.offset));
  const offsetPage = Number.isFinite(offset) && offset > 0
    ? Math.floor(offset / perPage) + 1
    : 1;

  return {
    page: explicitPage > 0 ? explicitPage : offsetPage,
    perPage,
  };
}

export function buildRawSearchPageQuery(searchParams: SearchPageParams): SearchQuery {
  return buildSearchRequestQuery(pageParamReader(searchParams));
}

export function buildSearchPageQuery(searchParams: SearchPageParams): SearchQuery {
  return enrichSearchQueryWithTextIntent(buildRawSearchPageQuery(searchParams));
}
