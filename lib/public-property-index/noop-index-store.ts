import type { PublicPropertyIndexRecord, PublicPropertyIndexSearchQuery, PublicPropertyIndexStore } from "./types";

export class NoopPublicPropertyIndexStore implements PublicPropertyIndexStore {
  constructor(private readonly reason = "public_index_disabled") {}

  async search(_query: PublicPropertyIndexSearchQuery): Promise<PublicPropertyIndexRecord[]> {
    void this.reason;
    return [];
  }

  async upsert(_records: PublicPropertyIndexRecord[]): Promise<void> {}
}
