import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addFavoriteId,
  clearFavoriteIds,
  isFavorited,
  parseFavoriteIds,
  readFavoriteIds,
  removeFavoriteId,
  toggleFavoriteId,
} from "../../../lib/favorites/favorites-storage.js";

function createMemoryStorage(seed?: string[]) {
  const data = new Map<string, string>();
  if (seed) {
    data.set("akarfinder:favorites:listings", JSON.stringify(seed));
  }
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe("P15B favorites storage", () => {
  test("adds a listing to favorites", () => {
    const storage = createMemoryStorage();
    const result = addFavoriteId("abc", storage);
    assert.deepEqual(result, ["abc"]);
    assert.deepEqual(readFavoriteIds(storage), ["abc"]);
  });

  test("does not duplicate an already-favorited id", () => {
    const storage = createMemoryStorage(["abc"]);
    addFavoriteId("abc", storage);
    assert.deepEqual(readFavoriteIds(storage), ["abc"]);
  });

  test("adds multiple listings with no limit", () => {
    const storage = createMemoryStorage();
    for (let i = 1; i <= 20; i++) {
      addFavoriteId(String(i), storage);
    }
    assert.equal(readFavoriteIds(storage).length, 20);
  });

  test("removes a listing from favorites", () => {
    const storage = createMemoryStorage(["abc", "def"]);
    removeFavoriteId("abc", storage);
    assert.deepEqual(readFavoriteIds(storage), ["def"]);
  });

  test("clears all favorites", () => {
    const storage = createMemoryStorage(["abc", "def", "ghi"]);
    clearFavoriteIds(storage);
    assert.deepEqual(readFavoriteIds(storage), []);
  });

  test("toggles a listing (add then remove)", () => {
    const storage = createMemoryStorage();
    toggleFavoriteId("abc", storage);
    assert.deepEqual(readFavoriteIds(storage), ["abc"]);
    toggleFavoriteId("abc", storage);
    assert.deepEqual(readFavoriteIds(storage), []);
  });

  test("isFavorited returns correct state", () => {
    const storage = createMemoryStorage(["abc"]);
    assert.equal(isFavorited("abc", storage), true);
    assert.equal(isFavorited("xyz", storage), false);
  });

  test("parseFavoriteIds handles invalid payloads safely", () => {
    assert.deepEqual(parseFavoriteIds("{invalid"), []);
    assert.deepEqual(parseFavoriteIds(null), []);
    assert.deepEqual(parseFavoriteIds("[]"), []);
    assert.deepEqual(parseFavoriteIds('["abc","abc"]'), ["abc"]); // deduped
  });

  test("removeFavoriteId on non-existent id leaves state unchanged", () => {
    const storage = createMemoryStorage(["abc"]);
    removeFavoriteId("xyz", storage);
    assert.deepEqual(readFavoriteIds(storage), ["abc"]);
  });

  test("storage key is isolated from compare storage", () => {
    const storage = createMemoryStorage();
    addFavoriteId("abc", storage);
    assert.equal(storage.getItem("akarfinder:compare:listings"), null);
    assert.notEqual(storage.getItem("akarfinder:favorites:listings"), null);
  });
});
