import type {
  SearchGatewayCacheEntry,
  SearchGatewayCacheLookupResult,
  SearchGatewayCacheStore,
} from "./types";

export class NoopSearchGatewayCacheStore implements SearchGatewayCacheStore {
  constructor(private readonly reason = "cache_unavailable") {}

  async readFresh(): Promise<SearchGatewayCacheLookupResult> {
    return { status: "bypass", reason: this.reason };
  }

  async readStale(): Promise<SearchGatewayCacheLookupResult> {
    return { status: "bypass", reason: this.reason };
  }

  async write(_entry: SearchGatewayCacheEntry): Promise<void> {}

  async recordHit(_entry: SearchGatewayCacheEntry): Promise<void> {}
}
