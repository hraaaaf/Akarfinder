# Landmark Factory — Rabat / Océan — 2026-09-20

## Starting density

Canonical district: `district_rabat_ocean`.
Existing verified runtime landmark: `Place de Russie` (score 88). No duplicate museum entry was found in the inspected registry.

## Candidate review

### RETAIN — Musée National de la Photographie / Fort Rottembourg — 98/100

- Public visibility: 19/20
- Orientation value: 19/20
- Local anchoring: 20/20
- Visual distinctiveness: 20/20
- Source reliability: 20/20
- Final: **98/100 — Iconique**

Canonical name: `Musée National de la Photographie — Fort Rottembourg`
Aliases: `Musée National de la Photographie`, `Fort Rottembourg`, `Fort Hervé`, `Borj El Kebir`.
Category: `heritage`.
Parent: `district_rabat_ocean`.

### Evidence

Primary: Fondation Nationale des Musées identifies the museum in Fort Rottembourg / Fort Hervé / Borj El Kebir and gives the address `Fort Rottembourg, 61 Avenue Mokhtar Jazoulite, Rabat`.

Territorial primary/official heritage source: Rabat heritage inventory explicitly places Fort Hervé / Fort Ruthenburg **au niveau du quartier l’Océan** and describes its distinctive fortified architecture.

Independent corroboration: Le360 explicitly identifies Fort Rottembourg as a monument in **quartier de l’Océan, Rabat**. Visit Rabat independently confirms the museum identity and 61 Av. Mokhtar Gazoulit address.

Geolocation corroboration: published Plus Code `24GX+7W8` for the museum resolves to the entrance vicinity around `34.02569,-6.85019`; an independent geographic source places the museum around `34.02500,-6.85083`. The retained point is **34.02569,-6.85019**, representing the public entrance/location code rather than a synthetic building centroid.

Sources:
- https://www.fnm.ma/museums/36
- https://rabatsites.ma/tour-item/musee-national-de-la-photographie/
- https://www.visitrabat.com/lieux/musee-national-de-la-photographie/
- https://fr.le360.ma/culture/video-rabat-linauguration-du-premier-musee-national-de-la-photographie-comme-si-vous-y-etiez-206656/
- https://www.waze.com/live-map/directions/morocco/rabat-sale-kenitra/rabat/almthf-alwtny-lltswyr?to=place.ChIJob14I7xtpw0RIEy1p3G8VYk

### Runtime target

- score: `98`
- tier: `flagship`
- `minZoom: 13.4`
- `retainPriority: true`
- coordinates: `34.02569,-6.85019`
- GPS remains immutable; if it collides with another Océan landmark, priority/reveal decides visibility rather than moving the point.

### Artwork brief

Semi-figurative simplified fort scene: low ochre/stone fortified mass, broad central arched entrance, heavy parapet, two historic cannon silhouettes kept subtle, Atlantic horizon behind. Clean editorial AkarFinder rendering on a light background. No generic camera icon and no photorealism.

## Other candidates checked

### HOLD — Place d’Italie — 90/100

- Public visibility 18/20; orientation 20/20; local anchoring 20/20; visual distinctiveness 14/20; source reliability 18/20.
- Multiple 2025–2026 sources explicitly place it in quartier Océan and confirm its major public-space/transport role; the new underground parking entered service in March 2026.
- **Hold reason:** the surface space has just been substantially requalified. The current stable visual identity and exact canonical anchor need one more post-works geometry/visual verification before an AkarFinder artwork is locked. No guessed representation.

### HOLD — Agora de Rabat / ex-Complexe Mehdi Ben Barka — 86/100 provisional

- Primary 2026 architectural plans explicitly place the project at angle rue de la Résistance / rue Al Congo, Océan, Rabat.
- Le360 corroborates the former covered hall/church in the Océan regeneration area.
- **Hold reason:** demolition/reconstruction into the new multifunctional `Agora de Rabat` is active in the primary plans; landmark identity and final silhouette are not stable enough yet for promotion.

## Safety

No Supabase mutation. No listing/business-data mutation. No ranking change. No merge. No deploy.
