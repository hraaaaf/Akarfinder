"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { geoMercator, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import { feature as topojsonFeature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, Objects } from "topojson-specification";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CanonicalCitySlug } from "@/lib/geo/geo-entity-registry";
import { selectNationalCityVisibility } from "@/lib/geo/territory-national-visibility";
import { selectStableTerritoryLabels } from "@/lib/geo/territory-label-stability";

interface QuartierStats {
  priceRepere?: number;
  landmarksVerified: number;
  status: "disponible" | "indisponible";
}

type Quartier = {
  name: string;
  slug: string;
  stats: QuartierStats;
};

type City = {
  name: string;
  slug: string;
  signature?: string;
  coordinates: [number, number];
  quartiers: Quartier[];
};

type Region = {
  name: string;
  slug: string;
  iso: `MA-${string}`;
  cities: City[];
};

type RegionFeatureProperties = {
  ISO?: string;
  NAME_1?: string;
  name?: string;
  shapeISO?: string;
  shapeName?: string;
};

type RegionFeature = Feature<Geometry, RegionFeatureProperties>;
type Level = "national" | "region" | "city";

type Camera = { x: number; y: number; k: number };
type TooltipState = { title: string; subtitle?: string; x: number; y: number } | null;

const MAP_WIDTH = 980;
const MAP_HEIGHT = 680;
const NAVY = "#071B33";
const TOPOLOGY_URLS = [
  "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09592ced973a3448cf66b6100b741b64c0d/releaseData/gbOpen/MAR/ADM1/geoBoundaries-MAR-ADM1.topojson",
  "https://www.geoboundaries.org/data/geoBoundaries-2_0_0/MAR/ADM1/geoBoundaries-2_0_0-MAR-ADM1.topojson",
] as const;

const REGION_TONES = [
  "#0B2847",
  "#113653",
  "#18435F",
  "#20516B",
  "#2A5F77",
  "#376D82",
  "#477C8D",
  "#588A98",
  "#6B99A4",
  "#80A8AF",
  "#96B7BB",
  "#ADC6C7",
] as const;

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const REGION_ALIASES: Record<string, string> = {
  [normalizeName("Tangier-Tetouan-Al Hoceima")]: "tanger-tetouan-al-hoceima",
  [normalizeName("Tanger-Tétouan-Al Hoceïma")]: "tanger-tetouan-al-hoceima",
  [normalizeName("Oriental")]: "oriental",
  [normalizeName("L'Oriental")]: "oriental",
  [normalizeName("Fès-Meknès")]: "fes-meknes",
  [normalizeName("Fes-Meknes")]: "fes-meknes",
  [normalizeName("Rabat-Salé-Kénitra")]: "rabat-sale-kenitra",
  [normalizeName("Rabat-Sale-Kenitra")]: "rabat-sale-kenitra",
  [normalizeName("Béni Mellal-Khénifra")]: "beni-mellal-khenifra",
  [normalizeName("Beni Mellal-Khenifra")]: "beni-mellal-khenifra",
  [normalizeName("Casablanca-Settat")]: "casablanca-settat",
  [normalizeName("Marrakech-Safi")]: "marrakech-safi",
  [normalizeName("Drâa-Tafilalet")]: "draa-tafilalet",
  [normalizeName("Draa-Tafilalet")]: "draa-tafilalet",
  [normalizeName("Souss-Massa")]: "souss-massa",
  [normalizeName("Guelmim-Oued Noun")]: "guelmim-oued-noun",
  [normalizeName("Laâyoune-Sakia El Hamra")]: "laayoune-sakia-el-hamra",
  [normalizeName("Laayoune-Sakia El Hamra")]: "laayoune-sakia-el-hamra",
  [normalizeName("Dakhla-Oued Ed-Dahab")]: "dakhla-oued-ed-dahab",
  [normalizeName("Eddakhla-Oued Eddahab")]: "dakhla-oued-ed-dahab",
};

function useMapData() {
  return useMemo<Region[]>(
    () => [
      {
        name: "Tanger-Tétouan-Al Hoceïma",
        slug: "tanger-tetouan-al-hoceima",
        iso: "MA-01",
        cities: [
          {
            name: "Tanger",
            slug: "tanger",
            signature: "Maritime & Industrie",
            coordinates: [-5.8128, 35.7595],
            quartiers: [
              // MOCK — statistiques de démonstration uniquement, aucune lecture Supabase.
              { name: "Malabata", slug: "malabata", stats: { priceRepere: 15400, landmarksVerified: 9, status: "disponible" } },
              { name: "Iberia", slug: "iberia", stats: { priceRepere: 17100, landmarksVerified: 7, status: "disponible" } },
              { name: "Centre-ville", slug: "centre-ville-tanger", stats: { priceRepere: 13200, landmarksVerified: 11, status: "disponible" } },
              { name: "Médina", slug: "medina-tanger", stats: { landmarksVerified: 5, status: "indisponible" } },
              { name: "Charf", slug: "charf", stats: { priceRepere: 11800, landmarksVerified: 6, status: "disponible" } },
            ],
          },
        ],
      },
      { name: "L’Oriental", slug: "oriental", iso: "MA-02", cities: [] },
      {
        name: "Fès-Meknès",
        slug: "fes-meknes",
        iso: "MA-03",
        cities: [
          {
            name: "Fès",
            slug: "fes",
            signature: "Artisanat & Culture",
            coordinates: [-5.0033, 34.0331],
            quartiers: [
              { name: "Ville Nouvelle", slug: "ville-nouvelle-fes", stats: { priceRepere: 9700, landmarksVerified: 10, status: "disponible" } },
              { name: "Médina", slug: "medina-fes", stats: { landmarksVerified: 13, status: "indisponible" } },
              { name: "Route Immouzer", slug: "route-immouzer", stats: { priceRepere: 10400, landmarksVerified: 6, status: "disponible" } },
              { name: "Agdal", slug: "agdal-fes", stats: { priceRepere: 8900, landmarksVerified: 5, status: "disponible" } },
              { name: "Narjiss", slug: "narjiss", stats: { priceRepere: 8300, landmarksVerified: 4, status: "disponible" } },
            ],
          },
        ],
      },
      {
        name: "Rabat-Salé-Kénitra",
        slug: "rabat-sale-kenitra",
        iso: "MA-04",
        cities: [
          {
            name: "Rabat",
            slug: "rabat",
            signature: "Capitale & Administration",
            coordinates: [-6.8498, 34.0209],
            quartiers: [
              { name: "Agdal", slug: "agdal", stats: { priceRepere: 18400, landmarksVerified: 14, status: "disponible" } },
              { name: "Hay Riad", slug: "hay-riad", stats: { priceRepere: 21300, landmarksVerified: 12, status: "disponible" } },
              { name: "Souissi", slug: "souissi", stats: { priceRepere: 23600, landmarksVerified: 8, status: "disponible" } },
              { name: "Hassan", slug: "hassan", stats: { priceRepere: 16600, landmarksVerified: 10, status: "disponible" } },
              { name: "Océan", slug: "ocean", stats: { priceRepere: 14200, landmarksVerified: 9, status: "disponible" } },
              { name: "Médina", slug: "medina-rabat", stats: { landmarksVerified: 11, status: "indisponible" } },
            ],
          },
          {
            name: "Kénitra",
            slug: "kenitra",
            coordinates: [-6.5802, 34.261],
            quartiers: [
              { name: "Centre-ville", slug: "centre-ville-kenitra", stats: { priceRepere: 9300, landmarksVerified: 8, status: "disponible" } },
              { name: "Bir Rami", slug: "bir-rami", stats: { priceRepere: 10100, landmarksVerified: 5, status: "disponible" } },
              { name: "Ouled Oujih", slug: "ouled-oujih", stats: { priceRepere: 7600, landmarksVerified: 4, status: "disponible" } },
              { name: "Maamora", slug: "maamora-kenitra", stats: { landmarksVerified: 5, status: "indisponible" } },
            ],
          },
        ],
      },
      { name: "Béni Mellal-Khénifra", slug: "beni-mellal-khenifra", iso: "MA-05", cities: [] },
      {
        name: "Casablanca-Settat",
        slug: "casablanca-settat",
        iso: "MA-06",
        cities: [
          {
            name: "Casablanca",
            slug: "casablanca",
            signature: "Économique & Affaires",
            coordinates: [-7.5898, 33.5731],
            quartiers: [
              { name: "Maârif", slug: "maarif", stats: { priceRepere: 17600, landmarksVerified: 15, status: "disponible" } },
              { name: "Aïn Diab", slug: "ain-diab", stats: { priceRepere: 26800, landmarksVerified: 12, status: "disponible" } },
              { name: "Gauthier", slug: "gauthier", stats: { priceRepere: 20500, landmarksVerified: 13, status: "disponible" } },
              { name: "Racine", slug: "racine", stats: { priceRepere: 22400, landmarksVerified: 10, status: "disponible" } },
              { name: "Californie", slug: "californie", stats: { priceRepere: 19700, landmarksVerified: 7, status: "disponible" } },
              { name: "Anfa", slug: "anfa", stats: { priceRepere: 27900, landmarksVerified: 9, status: "disponible" } },
              { name: "Sidi Maârouf", slug: "sidi-maarouf", stats: { priceRepere: 13100, landmarksVerified: 6, status: "disponible" } },
              { name: "Bourgogne", slug: "bourgogne", stats: { priceRepere: 18100, landmarksVerified: 11, status: "disponible" } },
              { name: "Oasis", slug: "oasis", stats: { priceRepere: 18900, landmarksVerified: 8, status: "disponible" } },
              { name: "Palmier", slug: "palmier", stats: { landmarksVerified: 6, status: "indisponible" } },
            ],
          },
          {
            name: "Mohammedia",
            slug: "mohammedia",
            coordinates: [-7.3844, 33.6861],
            quartiers: [
              { name: "Corniche", slug: "corniche-mohammedia", stats: { priceRepere: 13900, landmarksVerified: 7, status: "disponible" } },
              { name: "Centre-ville", slug: "centre-ville-mohammedia", stats: { priceRepere: 11600, landmarksVerified: 8, status: "disponible" } },
              { name: "Manesman", slug: "manesman", stats: { priceRepere: 12800, landmarksVerified: 5, status: "disponible" } },
              { name: "Parc", slug: "parc-mohammedia", stats: { landmarksVerified: 4, status: "indisponible" } },
            ],
          },
        ],
      },
      {
        name: "Marrakech-Safi",
        slug: "marrakech-safi",
        iso: "MA-07",
        cities: [
          {
            name: "Marrakech",
            slug: "marrakech",
            signature: "Tourisme & Patrimoine",
            coordinates: [-7.9811, 31.6295],
            quartiers: [
              { name: "Guéliz", slug: "gueliz", stats: { priceRepere: 18900, landmarksVerified: 15, status: "disponible" } },
              { name: "Hivernage", slug: "hivernage", stats: { priceRepere: 22600, landmarksVerified: 10, status: "disponible" } },
              { name: "Palmeraie", slug: "palmeraie", stats: { priceRepere: 20400, landmarksVerified: 8, status: "disponible" } },
              { name: "Médina", slug: "medina-marrakech", stats: { landmarksVerified: 17, status: "indisponible" } },
              { name: "Targa", slug: "targa", stats: { priceRepere: 14200, landmarksVerified: 6, status: "disponible" } },
              { name: "Sidi Ghanem", slug: "sidi-ghanem", stats: { priceRepere: 11200, landmarksVerified: 5, status: "disponible" } },
            ],
          },
        ],
      },
      { name: "Drâa-Tafilalet", slug: "draa-tafilalet", iso: "MA-08", cities: [] },
      {
        name: "Souss-Massa",
        slug: "souss-massa",
        iso: "MA-09",
        cities: [
          {
            name: "Agadir",
            slug: "agadir",
            signature: "Littoral & Qualité de vie",
            coordinates: [-9.5981, 30.4278],
            quartiers: [
              { name: "Founty", slug: "founty", stats: { priceRepere: 16700, landmarksVerified: 9, status: "disponible" } },
              { name: "Talborjt", slug: "talborjt", stats: { priceRepere: 12100, landmarksVerified: 11, status: "disponible" } },
              { name: "Hay Mohammadi", slug: "hay-mohammadi", stats: { priceRepere: 10800, landmarksVerified: 7, status: "disponible" } },
              { name: "Sonaba", slug: "sonaba", stats: { priceRepere: 17800, landmarksVerified: 6, status: "disponible" } },
              { name: "Centre-ville", slug: "centre-ville-agadir", stats: { landmarksVerified: 10, status: "indisponible" } },
            ],
          },
        ],
      },
      { name: "Guelmim-Oued Noun", slug: "guelmim-oued-noun", iso: "MA-10", cities: [] },
      { name: "Laâyoune-Sakia El Hamra", slug: "laayoune-sakia-el-hamra", iso: "MA-11", cities: [] },
      { name: "Dakhla-Oued Ed-Dahab", slug: "dakhla-oued-ed-dahab", iso: "MA-12", cities: [] },
    ],
    [],
  );
}

function featureSlug(feature: RegionFeature, regions: Region[]) {
  const properties = feature.properties ?? {};
  const iso = properties.ISO ?? properties.shapeISO;
  if (iso) {
    const normalizedIso = iso.toUpperCase().replace(/^MAR-/, "MA-");
    const byIso = regions.find((region) => normalizedIso === region.iso || normalizedIso.endsWith(region.iso.slice(-2)));
    if (byIso) return byIso.slug;
  }
  const rawName = properties.shapeName ?? properties.NAME_1 ?? properties.name ?? "";
  return REGION_ALIASES[normalizeName(rawName)] ?? null;
}

function neighborhoodPolygon(index: number) {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = 84 + column * 275 + (row % 2) * 18;
  const y = 130 + row * 126;
  const width = 246;
  const height = 103;
  const notch = 18 + ((index * 7) % 24);
  return `${x},${y + 10} ${x + width - notch},${y} ${x + width},${y + height - 20} ${x + width - 20},${y + height} ${x + 14},${y + height - 7} ${x},${y + 28}`;
}

function readablePrice(value?: number) {
  return value ? `${value.toLocaleString("fr-FR")} DH/m²` : "non disponible";
}

export function PremiumInteractiveMap() {
  const regions = useMapData();
  const [level, setLevel] = useState<Level>("national");
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string | null>(null);
  const [selectedCitySlug, setSelectedCitySlug] = useState<string | null>(null);
  const [selectedQuartierSlug, setSelectedQuartierSlug] = useState<string | null>(null);
  const [regionFeatures, setRegionFeatures] = useState<RegionFeature[]>([]);
  const [topologyState, setTopologyState] = useState<"loading" | "ready" | "error">("loading");
  const [topologySource, setTopologySource] = useState<string | null>(null);
  const [hoveredRegionSlug, setHoveredRegionSlug] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, k: 1 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const previousNationalCityLabelsRef = useRef<Set<string>>(new Set());

  const selectedRegion = useMemo(
    () => regions.find((region) => region.slug === selectedRegionSlug) ?? null,
    [regions, selectedRegionSlug],
  );
  const selectedCity = useMemo(
    () => selectedRegion?.cities.find((city) => city.slug === selectedCitySlug) ?? null,
    [selectedCitySlug, selectedRegion],
  );
  const selectedQuartier = useMemo(
    () => selectedCity?.quartiers.find((quartier) => quartier.slug === selectedQuartierSlug) ?? null,
    [selectedCity, selectedQuartierSlug],
  );

  const mappedCities = useMemo(
    () => regions.flatMap((region) => region.cities.map((city) => ({ city, regionSlug: region.slug }))),
    [regions],
  );

  const nationalTerritoryZoom = 4.2 + Math.max(0, camera.k - 1) * 4;
  const nationalPriority = useMemo(
    () => selectNationalCityVisibility({ zoom: nationalTerritoryZoom, maxLabels: 19 }),
    [nationalTerritoryZoom],
  );


  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      for (const url of TOPOLOGY_URLS) {
        try {
          const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
          if (!response.ok) continue;
          const raw = await response.text();
          if (raw.startsWith("version https://git-lfs.github.com/spec")) continue;
          const topology = JSON.parse(raw) as Topology<Objects<RegionFeatureProperties>>;
          const topologyObject = Object.values(topology.objects)[0];
          if (!topologyObject) continue;
          const decoded = topojsonFeature(topology, topologyObject);
          const collection = decoded.type === "FeatureCollection"
            ? (decoded as FeatureCollection<Geometry, RegionFeatureProperties>)
            : ({ type: "FeatureCollection", features: [decoded] } as FeatureCollection<Geometry, RegionFeatureProperties>);
          if (collection.features.length !== 12) continue;
          setRegionFeatures(collection.features);
          setTopologySource(url);
          setTopologyState("ready");
          return;
        } catch (error) {
          if ((error as Error).name === "AbortError") return;
        }
      }
      setTopologyState("error");
    };
    void load();
    return () => controller.abort();
  }, []);

  const projection = useMemo(() => {
    if (!regionFeatures.length) return null;
    const collection: FeatureCollection<Geometry, RegionFeatureProperties> = {
      type: "FeatureCollection",
      features: regionFeatures,
    };
    return geoMercator().fitExtent(
      [[42, 34], [MAP_WIDTH - 42, MAP_HEIGHT - 34]],
      collection,
    );
  }, [regionFeatures]);

  const pathGenerator = useMemo(() => (projection ? geoPath(projection) : null), [projection]);

  const nationalCityRenderItems = useMemo(() => {
    if (!projection) return [];
    const priorityBySlug = new Map(nationalPriority.map((item) => [item.citySlug, item]));
    const candidateMeta = mappedCities.flatMap(({ city, regionSlug }) => {
      const priority = priorityBySlug.get(city.slug as CanonicalCitySlug);
      const point = projection(city.coordinates);
      if (!priority || !point) return [];

      const labelWidth = Math.max(68, city.name.length * 7 + 30);
      const direction = city.slug === "casablanca" || city.slug === "agadir" || city.slug === "rabat" ? -1 : 1;
      const labelYOffset = city.slug === "rabat" ? -24 : city.slug === "mohammedia" ? 28 : 0;
      const screenX = camera.x + point[0] * camera.k;
      const screenY = camera.y + point[1] * camera.k;
      const labelCenterX = screenX + direction * (labelWidth / 2 + 17);

      return [{
        city,
        regionSlug,
        priority,
        point,
        labelWidth,
        direction,
        labelYOffset,
        collision: {
          id: city.slug,
          x: labelCenterX,
          y: screenY + labelYOffset,
          width: labelWidth,
          height: 28,
          visibilityScore: priority.visibilityScore,
          retainPriority: priority.retained,
        },
      }];
    });

    const capacity = camera.k < 1.1 ? 6 : camera.k < 1.2 ? 7 : 8;
    const selected = selectStableTerritoryLabels({
      candidates: candidateMeta.map((item) => item.collision),
      maxLabels: capacity,
      previousVisibleIds: previousNationalCityLabelsRef.current,
      paddingPx: 4,
      hysteresisBonus: 4,
    });
    const selectedIds = new Set(selected.map((item) => item.id));

    return candidateMeta.filter((item) => selectedIds.has(item.city.slug));
  }, [camera.k, camera.x, camera.y, mappedCities, nationalPriority, projection]);

  useEffect(() => {
    if (level !== "national") return;
    previousNationalCityLabelsRef.current = new Set(
      nationalCityRenderItems.map((item) => item.city.slug),
    );
  }, [level, nationalCityRenderItems]);

  useEffect(() => {
    if (!projection || !svgRef.current) return;
    const svg = select(svgRef.current);
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 7.4])
      .translateExtent([[-MAP_WIDTH * 0.75, -MAP_HEIGHT * 0.75], [MAP_WIDTH * 1.75, MAP_HEIGHT * 1.75]])
      .on("zoom", (event) => {
        const transform = event.transform as ZoomTransform;
        setCamera({ x: transform.x, y: transform.y, k: transform.k });
      });
    zoomBehaviorRef.current = behavior;
    svg.call(behavior);
    return () => {
      svg.on(".zoom", null);
      zoomBehaviorRef.current = null;
    };
  }, [projection]);

  const applyCamera = useCallback((next: ZoomTransform) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).call(zoomBehaviorRef.current.transform, next);
  }, []);

  const focusRegion = useCallback((slug: string) => {
    if (!pathGenerator) return;
    const regionFeature = regionFeatures.find((candidate) => featureSlug(candidate, regions) === slug);
    if (!regionFeature) return;
    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(regionFeature);
    const width = Math.max(1, x1 - x0);
    const height = Math.max(1, y1 - y0);
    const scale = Math.min(5.4, 0.78 / Math.max(width / MAP_WIDTH, height / MAP_HEIGHT));
    const x = MAP_WIDTH / 2 - scale * (x0 + x1) / 2;
    const y = MAP_HEIGHT / 2 - scale * (y0 + y1) / 2;
    applyCamera(zoomIdentity.translate(x, y).scale(scale));
  }, [applyCamera, pathGenerator, regionFeatures, regions]);

  const focusCity = useCallback((city: City) => {
    if (!projection) return;
    const point = projection(city.coordinates);
    if (!point) return;
    const scale = 6.2;
    applyCamera(zoomIdentity.translate(MAP_WIDTH / 2 - point[0] * scale, MAP_HEIGHT / 2 - point[1] * scale).scale(scale));
  }, [applyCamera, projection]);

  const goNational = useCallback(() => {
    setLevel("national");
    setSelectedRegionSlug(null);
    setSelectedCitySlug(null);
    setSelectedQuartierSlug(null);
    applyCamera(zoomIdentity);
  }, [applyCamera]);

  const selectRegion = useCallback((slug: string) => {
    setLevel("region");
    setSelectedRegionSlug(slug);
    setSelectedCitySlug(null);
    setSelectedQuartierSlug(null);
    setTooltip(null);
    focusRegion(slug);
  }, [focusRegion]);

  const selectCity = useCallback((city: City) => {
    const parentRegion = regions.find((region) => region.cities.some((candidate) => candidate.slug === city.slug));
    setLevel("city");
    setSelectedRegionSlug(parentRegion?.slug ?? null);
    setSelectedCitySlug(city.slug);
    setSelectedQuartierSlug(city.quartiers[0]?.slug ?? null);
    setTooltip(null);
    focusCity(city);
  }, [focusCity, regions]);

  const backToRegion = useCallback(() => {
    if (!selectedRegion) return goNational();
    setLevel("region");
    setSelectedCitySlug(null);
    setSelectedQuartierSlug(null);
    focusRegion(selectedRegion.slug);
  }, [focusRegion, goNational, selectedRegion]);

  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).call(
      zoomBehaviorRef.current.scaleBy,
      factor,
      [MAP_WIDTH / 2, MAP_HEIGHT / 2],
    );
  }, []);

  const displayRegionFeatures = useMemo(
    () => regionFeatures
      .map((regionFeature) => ({ regionFeature, slug: featureSlug(regionFeature, regions) }))
      .filter((entry): entry is { regionFeature: RegionFeature; slug: string } => Boolean(entry.slug)),
    [regionFeatures, regions],
  );

  const currentRegionTone = useCallback((slug: string) => {
    const index = regions.findIndex((region) => region.slug === slug);
    return REGION_TONES[Math.max(0, index) % REGION_TONES.length];
  }, [regions]);

  const cityCount = regions.reduce((total, region) => total + region.cities.length, 0);
  const quartierCount = regions.reduce(
    (total, region) => total + region.cities.reduce((cityTotal, city) => cityTotal + city.quartiers.length, 0),
    0,
  );

  return (
    <main
      className="min-h-[calc(100svh-64px)] px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-6"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
      data-premium-map
      data-map-level={level}
      data-topology-state={topologyState}
      data-db-mode="mock-only"
      data-national-territory-zoom={nationalTerritoryZoom.toFixed(2)}
      data-national-city-label-count={level === "national" ? nationalCityRenderItems.length : 0}
    >
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-4 flex flex-col gap-3 md:mb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: NAVY }}>
              <Compass size={15} aria-hidden="true" />
              AkarFinder · Carte interactive
            </div>
            <h1 className="text-[26px] font-black tracking-[-0.045em] sm:text-[32px] lg:text-[38px]">Où vivre au Maroc ?</h1>
            <p className="mt-1 max-w-2xl text-[12px] font-medium sm:text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Explorez le territoire par région, ville puis quartier. Les repères affichés dans ce prototype sont des données mock isolées.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-secondary)" }}>
            <span className="rounded-full border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>12 régions</span>
            <span className="rounded-full border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>{cityCount} villes indexées</span>
            <span className="rounded-full border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>{quartierCount} quartiers</span>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section
            className="relative min-h-[560px] overflow-hidden rounded-[26px] border shadow-[0_24px_70px_rgba(7,27,51,0.12)] sm:min-h-[650px]"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            aria-label="Carte interactive du Maroc"
          >
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 border-b px-3 py-3 backdrop-blur-xl sm:px-4" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}>
              <nav className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold" aria-label="Fil d’Ariane cartographique">
                <button type="button" onClick={goNational} className="rounded-lg px-2 py-1.5 hover:opacity-70">Maroc</button>
                {selectedRegion ? <><ChevronRight size={13} aria-hidden="true" /><button type="button" onClick={backToRegion} className="max-w-[170px] truncate rounded-lg px-2 py-1.5 hover:opacity-70">{selectedRegion.name}</button></> : null}
                {selectedCity ? <><ChevronRight size={13} aria-hidden="true" /><span className="max-w-[130px] truncate rounded-lg px-2 py-1.5" style={{ color: NAVY }}>{selectedCity.name}</span></> : null}
              </nav>
              <span className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white" style={{ background: NAVY }}>
                {level === "national" ? "National" : level === "region" ? "Région" : "Ville"}
              </span>
            </div>

            <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-2">
              <button type="button" onClick={() => zoomBy(1.25)} className="grid h-10 w-10 place-items-center rounded-xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="Zoomer"><Plus size={16} /></button>
              <button type="button" onClick={() => zoomBy(0.8)} className="grid h-10 w-10 place-items-center rounded-xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="Dézoomer"><Minus size={16} /></button>
              <button type="button" onClick={goNational} className="grid h-10 w-10 place-items-center rounded-xl border shadow-sm" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="Recentrer"><RotateCcw size={15} /></button>
            </div>

            {topologyState === "loading" ? (
              <div className="absolute inset-0 grid place-items-center pt-14">
                <div className="text-center"><div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-[#071B33]" /><p className="mt-3 text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>Chargement des 12 régions…</p></div>
              </div>
            ) : null}

            {topologyState === "error" ? (
              <div className="absolute inset-0 grid place-items-center px-6 pt-14 text-center">
                <div className="max-w-sm rounded-2xl border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <p className="text-[13px] font-black">Contours régionaux indisponibles</p>
                  <p className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>Le prototype refuse d’inventer une géométrie de secours. La navigation par liste reste disponible.</p>
                </div>
              </div>
            ) : null}

            {projection && pathGenerator ? (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="absolute inset-0 h-full w-full touch-none pt-12"
                role="img"
                aria-label="Carte des douze régions du Maroc"
                data-region-map-svg
              >
                <defs>
                  <filter id="region-shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#071B33" floodOpacity="0.18" /></filter>
                </defs>
                <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.k})`}>
                  {displayRegionFeatures.map(({ regionFeature, slug }) => {
                    const region = regions.find((item) => item.slug === slug);
                    if (!region) return null;
                    const d = pathGenerator(regionFeature);
                    if (!d) return null;
                    const active = selectedRegionSlug === slug;
                    const hovered = hoveredRegionSlug === slug;
                    return (
                      <path
                        key={slug}
                        d={d}
                        fill={active ? NAVY : currentRegionTone(slug)}
                        fillOpacity={active ? 1 : hovered ? 0.96 : 0.84}
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth={active ? 2.7 / camera.k : 1.8 / camera.k}
                        vectorEffect="non-scaling-stroke"
                        filter={active ? "url(#region-shadow)" : undefined}
                        className="cursor-pointer outline-none transition-[fill-opacity] duration-200 focus-visible:stroke-[4px]"
                        tabIndex={0}
                        role="button"
                        aria-label={`Explorer la région ${region.name}`}
                        data-region-slug={slug}
                        onPointerEnter={() => setHoveredRegionSlug(slug)}
                        onPointerLeave={() => { setHoveredRegionSlug(null); setTooltip(null); }}
                        onPointerMove={(event) => setTooltip({
                          title: region.name,
                          subtitle: region.cities.length ? `${region.cities.length} ville${region.cities.length > 1 ? "s" : ""} indexée${region.cities.length > 1 ? "s" : ""}` : "Exploration régionale",
                          x: event.clientX,
                          y: event.clientY,
                        })}
                        onClick={() => selectRegion(slug)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectRegion(slug);
                          }
                        }}
                      />
                    );
                  })}

                  {level === "national" && nationalCityRenderItems.map(({ city, point, labelWidth, direction, labelYOffset, priority }) => {
                    const labelX = direction > 0 ? 13 / camera.k : -(labelWidth + 13) / camera.k;
                    const textX = direction > 0 ? 24 / camera.k : -(labelWidth + 2) / camera.k;
                    const labelY = labelYOffset / camera.k;
                    return (
                      <g
                        key={city.slug}
                        transform={`translate(${point[0]} ${point[1]})`}
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`Explorer ${city.name}`}
                        data-city-slug={city.slug}
                        data-national-city-label={city.slug}
                        data-national-city-importance={priority.importanceScore}
                        onClick={(event) => { event.stopPropagation(); selectCity(city); }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectCity(city);
                          }
                        }}
                        onPointerMove={(event) => setTooltip({ title: city.name, subtitle: "Ville prioritaire", x: event.clientX, y: event.clientY })}
                        onPointerLeave={() => setTooltip(null)}
                      >
                        <circle r={12 / camera.k} fill="rgba(255,255,255,0.96)" stroke={NAVY} strokeWidth={2 / camera.k} vectorEffect="non-scaling-stroke" />
                        <circle r={4.4 / camera.k} fill={NAVY} />
                        <rect
                          x={labelX}
                          y={labelY - 13 / camera.k}
                          width={labelWidth / camera.k}
                          height={26 / camera.k}
                          rx={13 / camera.k}
                          fill="rgba(255,255,255,0.96)"
                          stroke="rgba(7,27,51,0.22)"
                          strokeWidth={1 / camera.k}
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={textX}
                          y={labelY + 4 / camera.k}
                          fill={NAVY}
                          fontSize={11 / camera.k}
                          fontWeight={900}
                          pointerEvents="none"
                        >
                          {city.name}
                        </text>
                      </g>
                    );
                  })}

                  {level !== "national" && selectedRegion && selectedRegion.cities.map((city) => {
                    const point = projection(city.coordinates);
                    if (!point) return null;
                    return (
                      <g
                        key={city.slug}
                        transform={`translate(${point[0]} ${point[1]})`}
                        className="cursor-pointer"
                        role="button"
                        tabIndex={0}
                        aria-label={`Explorer ${city.name}`}
                        data-city-slug={city.slug}
                        onClick={(event) => { event.stopPropagation(); selectCity(city); }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            selectCity(city);
                          }
                        }}
                        onPointerMove={(event) => setTooltip({ title: city.name, subtitle: city.signature ?? selectedRegion.name, x: event.clientX, y: event.clientY })}
                        onPointerLeave={() => setTooltip(null)}
                      >
                        <circle r={14 / camera.k} fill="rgba(255,255,255,0.95)" stroke={NAVY} strokeWidth={2.2 / camera.k} vectorEffect="non-scaling-stroke" />
                        <circle r={5.2 / camera.k} fill={NAVY} />
                      </g>
                    );
                  })}
                </g>
              </svg>
            ) : null}

            <AnimatePresence>
              {level === "city" && selectedCity ? (
                <motion.div
                  key={selectedCity.slug}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-3 bottom-3 top-[66px] z-10 overflow-hidden rounded-[22px] border backdrop-blur-md sm:inset-x-5 sm:bottom-5"
                  style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 72%, transparent)" }}
                  data-neighborhood-schematic
                >
                  <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-full" aria-label={`Quartiers schématiques de ${selectedCity.name}`}>
                    <text x="64" y="74" fill="var(--text-primary)" fontSize="25" fontWeight="900">{selectedCity.name}</text>
                    <text x="64" y="101" fill="var(--text-secondary)" fontSize="12" fontWeight="700">Frontières de quartiers stylisées · non cadastrales</text>
                    {selectedCity.quartiers.map((quartier, index) => {
                      const active = quartier.slug === selectedQuartierSlug;
                      const column = index % 3;
                      const row = Math.floor(index / 3);
                      const labelX = 84 + column * 275 + (row % 2) * 18 + 18;
                      const labelY = 130 + row * 126 + 55;
                      return (
                        <g key={quartier.slug} role="button" tabIndex={0} className="cursor-pointer outline-none" aria-label={`Sélectionner ${quartier.name}`} onClick={() => setSelectedQuartierSlug(quartier.slug)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedQuartierSlug(quartier.slug); } }}>
                          <motion.polygon
                            points={neighborhoodPolygon(index)}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: Math.min(index * 0.035, 0.25), duration: 0.32 }}
                            fill={active ? NAVY : "color-mix(in srgb, #6E8DA4 35%, var(--surface))"}
                            stroke={active ? NAVY : "var(--border-dark)"}
                            strokeWidth={active ? 3 : 1.5}
                            style={{ transformOrigin: `${labelX}px ${labelY}px` }}
                          />
                          <text x={labelX} y={labelY} fill={active ? "white" : "var(--text-primary)"} fontSize="13" fontWeight="850" pointerEvents="none">{quartier.name}</text>
                        </g>
                      );
                    })}
                  </svg>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {tooltip ? (
              <div className="pointer-events-none fixed z-[90] min-w-[160px] -translate-y-[calc(100%+14px)] rounded-xl border px-3 py-2 shadow-xl" style={{ left: tooltip.x, top: tooltip.y, borderColor: "var(--border)", background: "var(--surface)" }} data-map-tooltip>
                <p className="text-[11px] font-black">{tooltip.title}</p>
                {tooltip.subtitle ? <p className="mt-0.5 text-[9.5px] font-semibold" style={{ color: "var(--text-secondary)" }}>{tooltip.subtitle}</p> : null}
              </div>
            ) : null}

            <div className="pointer-events-none absolute bottom-3 left-3 z-20 max-w-[70%] rounded-full border px-3 py-1.5 text-[8.5px] font-bold backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)", color: "var(--text-secondary)" }}>
              Contours régionaux : geoBoundaries / OSM · 12 ADM1 · navigation prototype
            </div>
          </section>

          <aside className="rounded-[26px] border p-4 shadow-[0_20px_55px_rgba(7,27,51,0.08)] sm:p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }} aria-label="Détails territoriaux" data-map-side-panel>
            <AnimatePresence mode="wait">
              {level === "national" ? (
                <motion.div key="national" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: NAVY }}>Vue nationale</p>
                  <h2 className="mt-2 text-[22px] font-black tracking-[-0.035em]">12 régions, une lecture simple</h2>
                  <p className="mt-2 text-[11px] font-medium leading-5" style={{ color: "var(--text-secondary)" }}>Survolez une région pour l’identifier, puis cliquez pour voir les villes déjà supportées.</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    {regions.map((region, index) => (
                      <button key={region.slug} type="button" onClick={() => selectRegion(region.slug)} className="flex min-h-[52px] items-center gap-3 rounded-2xl border px-3 text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "var(--background)" }} data-region-list-slug={region.slug}>
                        <span className="h-8 w-2 rounded-full" style={{ background: REGION_TONES[index] }} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[11.5px] font-black">{region.name}</span><span className="mt-0.5 block text-[9.5px] font-semibold" style={{ color: "var(--text-secondary)" }}>{region.cities.length ? `${region.cities.length} ville${region.cities.length > 1 ? "s" : ""} indexée${region.cities.length > 1 ? "s" : ""}` : "à explorer"}</span></span>
                        <ChevronRight size={14} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {level === "region" && selectedRegion ? (
                <motion.div key={selectedRegion.slug} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  <button type="button" onClick={goNational} className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: NAVY }}><ArrowLeft size={14} /> Maroc</button>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: NAVY }}>Région</p>
                  <h2 className="mt-2 text-[22px] font-black tracking-[-0.035em]">{selectedRegion.name}</h2>
                  <p className="mt-2 text-[11px] font-medium leading-5" style={{ color: "var(--text-secondary)" }}>{selectedRegion.cities.length ? "Choisissez une ville pour descendre au niveau quartier." : "Aucune ville indexée dans cette région pour ce prototype. Le niveau national reste accessible."}</p>
                  <div className="mt-5 space-y-2">
                    {selectedRegion.cities.map((city) => (
                      <button key={city.slug} type="button" onClick={() => selectCity(city)} className="flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: "var(--border)", background: "var(--background)" }} data-city-list-slug={city.slug}>
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: NAVY }}><MapPin size={17} /></span>
                        <span className="min-w-0 flex-1"><span className="block text-[13px] font-black">{city.name}</span><span className="mt-0.5 block truncate text-[9.5px] font-semibold" style={{ color: "var(--text-secondary)" }}>{city.signature ?? selectedRegion.name} · {city.quartiers.length} quartiers</span></span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {level === "city" && selectedRegion && selectedCity ? (
                <motion.div key={selectedCity.slug} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                  <button type="button" onClick={backToRegion} className="mb-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]" style={{ color: NAVY }}><ArrowLeft size={14} /> {selectedRegion.name}</button>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: NAVY }}>Ville · quartiers</p>
                  <h2 className="mt-2 text-[24px] font-black tracking-[-0.04em]">{selectedCity.name}</h2>
                  {selectedCity.signature ? <p className="mt-1 text-[10.5px] font-bold" style={{ color: "var(--text-secondary)" }}>{selectedCity.signature}</p> : null}

                  {selectedQuartier ? (
                    <div className="mt-4 rounded-[20px] border p-4" style={{ borderColor: "var(--border)", background: "var(--background)" }} data-selected-quartier={selectedQuartier.slug}>
                      <div className="flex items-start justify-between gap-2"><div><p className="text-[9px] font-black uppercase tracking-[0.12em]" style={{ color: "var(--text-secondary)" }}>Quartier sélectionné</p><h3 className="mt-1 text-[17px] font-black">{selectedQuartier.name}</h3></div><span className="rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase" style={{ background: selectedQuartier.stats.status === "disponible" ? "color-mix(in srgb, #071B33 12%, var(--surface))" : "var(--background)", color: selectedQuartier.stats.status === "disponible" ? NAVY : "var(--text-secondary)" }}>{selectedQuartier.stats.status}</span></div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><p className="text-[8.5px] font-black uppercase tracking-[0.1em]" style={{ color: "var(--text-secondary)" }}>repère prix</p><p className="mt-1 text-[11px] font-black">{readablePrice(selectedQuartier.stats.priceRepere)}</p></div>
                        <div className="rounded-xl border p-2.5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}><p className="text-[8.5px] font-black uppercase tracking-[0.1em]" style={{ color: "var(--text-secondary)" }}>repère vérifié</p><p className="mt-1 flex items-center gap-1.5 text-[11px] font-black"><CheckCircle2 size={13} style={{ color: NAVY }} /> {selectedQuartier.stats.landmarksVerified}</p></div>
                      </div>
                      <Link href={`/immobilier/${selectedCity.slug}/${selectedQuartier.slug}`} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-black text-white" style={{ background: NAVY }} data-explorer-selected>Explorer <ChevronRight size={14} /></Link>
                    </div>
                  ) : null}

                  <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {selectedCity.quartiers.map((quartier) => (
                      <div key={quartier.slug} className="flex items-center gap-2 rounded-2xl border p-2.5" style={{ borderColor: quartier.slug === selectedQuartierSlug ? NAVY : "var(--border)", background: quartier.slug === selectedQuartierSlug ? "color-mix(in srgb, #071B33 6%, var(--surface))" : "var(--surface)" }}>
                        <button type="button" onClick={() => setSelectedQuartierSlug(quartier.slug)} className="min-w-0 flex-1 text-left"><span className="block truncate text-[11px] font-black">{quartier.name}</span><span className="mt-0.5 block text-[9px] font-semibold" style={{ color: "var(--text-secondary)" }}>{readablePrice(quartier.stats.priceRepere)} · {quartier.stats.landmarksVerified} repère{quartier.stats.landmarksVerified > 1 ? "s" : ""} vérifié{quartier.stats.landmarksVerified > 1 ? "s" : ""}</span></button>
                        <Link href={`/immobilier/${selectedCity.slug}/${quartier.slug}`} className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-xl border px-2.5 text-[9.5px] font-black" style={{ borderColor: "var(--border-dark)", color: NAVY, background: "var(--background)" }} data-explorer-link={quartier.slug}>Explorer <ChevronRight size={12} /></Link>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </aside>
        </div>

        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] font-semibold" style={{ color: "var(--text-secondary)" }}>
          <span className="inline-flex items-center gap-1.5"><Building2 size={12} /> Aucun appel Supabase · aucune écriture DB · mock isolé dans useMapData()</span>
          <span>{topologySource ? "TopoJSON ADM1 chargé" : "TopoJSON ADM1 en attente"}</span>
        </footer>
      </div>
    </main>
  );
}
