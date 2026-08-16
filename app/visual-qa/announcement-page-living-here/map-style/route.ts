import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    version: 8,
    name: "ANN-L6 deterministic QA",
    sources: {
      "qa-roads": {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [[-6.851, 33.988], [-6.845, 33.994]],
              },
            },
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [[-6.852, 33.992], [-6.846, 33.987]],
              },
            },
          ],
        },
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#eef3f8" },
      },
      {
        id: "qa-roads",
        type: "line",
        source: "qa-roads",
        paint: { "line-color": "#cbd5e1", "line-width": 4 },
      },
    ],
  });
}
