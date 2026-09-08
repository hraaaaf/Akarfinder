type RuntimeFeature = [
  height: number,
  minHeight: number,
  precisionCode: 0 | 1,
  kindCode: 0 | 1,
  geometryTypeCode: 0 | 1,
  coordinates: unknown,
];

type RuntimePayload = {
  v?: number;
  source?: string;
  release?: string | null;
  license?: string;
  attribution?: string;
  floorEstimateMeters?: number;
  defaultHeightInvented?: boolean;
  features?: RuntimeFeature[];
};

const OVERTURE_RUNTIME_URL = "/data/vivre-ici/maarif-overture-3d.compact.json";
const MIN_OVERTURE_FEATURES = 1000;
const PRIMITIVE_BATCH_SIZE = 700;

function setShellAttribute(name: string, value: string) {
  document.querySelector<HTMLElement>("[data-cesium-spike]")?.setAttribute(name, value);
}

function ensureOvertureAttribution(payload: RuntimePayload) {
  const map = document.querySelector<HTMLElement>(".cesium-spike-map");
  if (!map) return;

  const existing = map.querySelector<HTMLElement>("[data-open-3d-attribution]");
  const attribution = existing ?? document.createElement("div");
  attribution.dataset.open3dAttribution = "true";
  attribution.className = "cesium-spike-osm-3d-attribution";
  attribution.textContent = `${payload.attribution ?? "© OpenStreetMap contributors, Overture Maps Foundation"} · volumes 3D: hauteur publiée ou estimation ~3 m/niveau`;
  if (!existing) map.appendChild(attribution);
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function ringToPositions(Cesium: any, ring: unknown): any[] | null {
  if (!Array.isArray(ring) || ring.length < 4) return null;
  const degrees: number[] = [];
  for (const coordinate of ring) {
    if (!Array.isArray(coordinate) || coordinate.length < 2) continue;
    const lng = finiteNumber(coordinate[0]);
    const lat = finiteNumber(coordinate[1]);
    if (lng === null || lat === null) continue;
    degrees.push(lng, lat);
  }
  if (degrees.length < 8) return null;
  return Cesium.Cartesian3.fromDegreesArray(degrees);
}

function polygonHierarchy(Cesium: any, polygon: unknown) {
  if (!Array.isArray(polygon) || !polygon.length) return null;
  const outer = ringToPositions(Cesium, polygon[0]);
  if (!outer) return null;

  const holes = polygon
    .slice(1)
    .map((ring) => ringToPositions(Cesium, ring))
    .filter(Boolean)
    .map((positions) => new Cesium.PolygonHierarchy(positions));

  return new Cesium.PolygonHierarchy(outer, holes);
}

function buildingColor(Cesium: any, height: number, precisionCode: 0 | 1, kindCode: 0 | 1) {
  const exact = precisionCode === 0;
  const part = kindCode === 1;
  if (height >= 36) return Cesium.Color.fromCssColorString(part ? "#b7783f" : exact ? "#c78a4d" : "#caa06e");
  if (height >= 24) return Cesium.Color.fromCssColorString(part ? "#c89158" : exact ? "#d4a36b" : "#d6b789");
  if (height >= 14) return Cesium.Color.fromCssColorString(part ? "#d8ae79" : exact ? "#e0bc8b" : "#dfc8a5");
  return Cesium.Color.fromCssColorString(part ? "#e4c79f" : exact ? "#ecd4b5" : "#e8dac7");
}

function polygonsForRecord(record: RuntimeFeature): unknown[] {
  const geometryTypeCode = record[4];
  const coordinates = record[5];
  if (!Array.isArray(coordinates)) return [];
  return geometryTypeCode === 0 ? [coordinates] : coordinates;
}

function createRuntimePrimitives(Cesium: any, records: RuntimeFeature[]) {
  const geometryInstances: any[] = [];
  const tallRoofInstances: any[] = [];
  let renderedFeatures = 0;
  let exactHeightCount = 0;
  let estimatedHeightCount = 0;

  for (const record of records) {
    if (!Array.isArray(record) || record.length < 6) continue;
    const height = finiteNumber(record[0]);
    const minHeight = finiteNumber(record[1]) ?? 0;
    const precisionCode = record[2] === 0 ? 0 : 1;
    const kindCode = record[3] === 1 ? 1 : 0;
    if (height === null || height <= 0 || height > 350 || minHeight < 0 || minHeight > 350) continue;

    const polygons = polygonsForRecord(record);
    let featureRendered = false;
    for (const polygon of polygons) {
      const hierarchy = polygonHierarchy(Cesium, polygon);
      if (!hierarchy) continue;
      const topHeight = minHeight + height;

      try {
        geometryInstances.push(
          new Cesium.GeometryInstance({
            geometry: new Cesium.PolygonGeometry({
              polygonHierarchy: hierarchy,
              height: minHeight,
              extrudedHeight: topHeight,
              closeTop: true,
              closeBottom: true,
              vertexFormat: Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            attributes: {
              color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                buildingColor(Cesium, height, precisionCode, kindCode),
              ),
            },
          }),
        );
        featureRendered = true;

        // A restrained roof edge on taller volumes materially improves facade reading
        // without outlining every footprint like a GIS debug view.
        if (height >= 18 && Array.isArray(polygon) && Array.isArray(polygon[0])) {
          const roofDegrees: number[] = [];
          for (const coordinate of polygon[0]) {
            if (!Array.isArray(coordinate) || coordinate.length < 2) continue;
            const lng = finiteNumber(coordinate[0]);
            const lat = finiteNumber(coordinate[1]);
            if (lng === null || lat === null) continue;
            roofDegrees.push(lng, lat, topHeight + 0.35);
          }
          if (roofDegrees.length >= 12 && Cesium.PolylineGeometry && Cesium.PolylineColorAppearance) {
            tallRoofInstances.push(
              new Cesium.GeometryInstance({
                geometry: new Cesium.PolylineGeometry({
                  positions: Cesium.Cartesian3.fromDegreesArrayHeights(roofDegrees),
                  width: height >= 30 ? 1.25 : 0.8,
                  vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
                }),
                attributes: {
                  color: Cesium.ColorGeometryInstanceAttribute.fromColor(
                    Cesium.Color.fromCssColorString("#6d5139").withAlpha(height >= 30 ? 0.72 : 0.42),
                  ),
                },
              }),
            );
          }
        }
      } catch {
        // Fail closed on malformed polygons; do not replace them with invented geometry.
      }
    }

    if (featureRendered) {
      renderedFeatures += 1;
      if (precisionCode === 0) exactHeightCount += 1;
      else estimatedHeightCount += 1;
    }
  }

  const primitives: any[] = [];
  for (let start = 0; start < geometryInstances.length; start += PRIMITIVE_BATCH_SIZE) {
    primitives.push(
      new Cesium.Primitive({
        geometryInstances: geometryInstances.slice(start, start + PRIMITIVE_BATCH_SIZE),
        appearance: new Cesium.PerInstanceColorAppearance({
          closed: true,
          translucent: false,
          flat: false,
        }),
        shadows: Cesium.ShadowMode?.ENABLED,
        asynchronous: false,
      }),
    );
  }

  for (let start = 0; start < tallRoofInstances.length; start += PRIMITIVE_BATCH_SIZE) {
    primitives.push(
      new Cesium.Primitive({
        geometryInstances: tallRoofInstances.slice(start, start + PRIMITIVE_BATCH_SIZE),
        appearance: new Cesium.PolylineColorAppearance({ translucent: true }),
        asynchronous: false,
      }),
    );
  }

  return { primitives, renderedFeatures, exactHeightCount, estimatedHeightCount };
}

export async function tryLoadOvertureStaticBuildings(Cesium: any, scene: any): Promise<boolean> {
  try {
    const response = await fetch(OVERTURE_RUNTIME_URL, { cache: "force-cache" });
    if (!response.ok) return false;
    const payload = (await response.json()) as RuntimePayload;

    if (
      payload.v !== 1
      || payload.defaultHeightInvented !== false
      || !Array.isArray(payload.features)
      || payload.features.length < MIN_OVERTURE_FEATURES
    ) {
      return false;
    }

    const built = createRuntimePrimitives(Cesium, payload.features);
    if (built.renderedFeatures < MIN_OVERTURE_FEATURES) return false;

    if (Cesium.SunLight) scene.light = new Cesium.SunLight({ intensity: 2.15 });
    if (scene.shadowMap) {
      scene.shadowMap.enabled = true;
      scene.shadowMap.softShadows = true;
    }
    for (const primitive of built.primitives) scene.primitives.add(primitive);
    scene.requestRender?.();

    ensureOvertureAttribution(payload);
    setShellAttribute("data-cesium-buildings-source", "overture-static");
    setShellAttribute("data-cesium-buildings-release", payload.release ?? "unknown");
    setShellAttribute("data-cesium-buildings-license", payload.license ?? "ODbL-1.0");
    setShellAttribute("data-cesium-buildings-count", String(built.renderedFeatures));
    setShellAttribute("data-cesium-buildings-exact-count", String(built.exactHeightCount));
    setShellAttribute("data-cesium-buildings-estimated-count", String(built.estimatedHeightCount));
    setShellAttribute(
      "data-cesium-buildings-precision",
      built.estimatedHeightCount > 0 ? "mixed" : "exact-height",
    );
    setShellAttribute("data-cesium-buildings-state", "available");
    return true;
  } catch (error) {
    console.warn("[vivre-ici-cesium-spike] materialized Overture buildings unavailable", error);
    return false;
  }
}
