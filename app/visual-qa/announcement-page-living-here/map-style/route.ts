import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    version: 8,
    name: "ANN-L6 deterministic QA",
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": "#eef3f8" },
      },
    ],
  });
}
