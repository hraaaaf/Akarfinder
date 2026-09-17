import {
  validateTerritoryDictionary,
  type TerritoryDictionary,
  type TerritoryEntity,
  type TerritoryEntityType,
  type TerritoryValidationIssue,
} from "./territory-dictionary";

export type TerritoryCatalog = {
  entities: TerritoryDictionary;
  byId: ReadonlyMap<string, TerritoryEntity>;
  getChildren(parentId: string, type?: TerritoryEntityType): TerritoryEntity[];
};

export type TerritoryCatalogResult =
  | { ok: true; catalog: TerritoryCatalog }
  | { ok: false; issues: TerritoryValidationIssue[] };

export function createTerritoryCatalog(dictionary: TerritoryDictionary): TerritoryCatalogResult {
  const issues = validateTerritoryDictionary(dictionary);
  if (issues.length > 0) return { ok: false, issues };

  const byId = new Map<string, TerritoryEntity>();
  const children = new Map<string, TerritoryEntity[]>();

  for (const entity of dictionary) {
    byId.set(entity.id, entity);
    if (!entity.parentId) continue;
    const list = children.get(entity.parentId) ?? [];
    list.push(entity);
    children.set(entity.parentId, list);
  }

  for (const list of children.values()) {
    list.sort((a, b) => {
      if (a.importance.score !== b.importance.score) {
        return b.importance.score - a.importance.score;
      }
      return a.canonicalName.localeCompare(b.canonicalName, "fr");
    });
  }

  return {
    ok: true,
    catalog: {
      entities: dictionary,
      byId,
      getChildren(parentId, type) {
        const list = children.get(parentId) ?? [];
        return type ? list.filter((entity) => entity.type === type) : [...list];
      },
    },
  };
}
