import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { geometryAreaKm2, geometryAreaM2 } from "../../../lib/geo/geometry-area";

const R = 6_371_008.8;
const rad = (degrees: number) => degrees * Math.PI / 180;
const rectangleArea = (west: number, south: number, east: number, north: number) =>
  R * R * Math.abs(rad(east - west)) * Math.abs(Math.sin(rad(north)) - Math.sin(rad(south)));

const square = (west: number, south: number, east: number, north: number) => [[
  [west, south],
  [east, south],
  [east, north],
  [west, north],
  [west, south],
]] as const;

describe("geometryArea", () => {
  it("matches the analytical spherical rectangle area", () => {
    const geometry = { type: "Polygon" as const, coordinates: square(0, 0, 1, 1) };
    const expected = rectangleArea(0, 0, 1, 1);
    const actual = geometryAreaM2(geometry);
    assert.ok(Math.abs(actual - expected) / expected < 1e-12, `${actual} vs ${expected}`);
  });

  it("subtracts interior holes independently of ring orientation", () => {
    const outer = square(0, 0, 2, 2)[0];
    const hole = [...square(0.5, 0.5, 1.5, 1.5)[0]].reverse() as typeof outer;
    const geometry = { type: "Polygon" as const, coordinates: [outer, hole] };
    const expected = rectangleArea(0, 0, 2, 2) - rectangleArea(0.5, 0.5, 1.5, 1.5);
    const actual = geometryAreaM2(geometry);
    assert.ok(Math.abs(actual - expected) / expected < 1e-12, `${actual} vs ${expected}`);
  });

  it("sums MultiPolygon areas and exposes km²", () => {
    const geometry = {
      type: "MultiPolygon" as const,
      coordinates: [square(0, 0, 1, 1), square(2, 0, 3, 1)],
    };
    const expectedM2 = 2 * rectangleArea(0, 0, 1, 1);
    assert.ok(Math.abs(geometryAreaM2(geometry) - expectedM2) / expectedM2 < 1e-12);
    assert.ok(Math.abs(geometryAreaKm2(geometry) - expectedM2 / 1_000_000) < 1e-9);
  });
});
