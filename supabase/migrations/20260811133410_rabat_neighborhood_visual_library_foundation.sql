-- RABAT-NEIGHBORHOOD-VISUAL-LIBRARY-1
-- Canonical database foundation for real-reference-grounded AkarFinder neighborhood visuals.
-- Atmosphere/reference imagery must never be represented as a property photo.

create table public.neighborhood_visual_collections (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  city_slug text not null,
  neighborhood text not null,
  neighborhood_slug text not null,
  visual_identity_version text not null default 'akarfinder-concept-1',
  status text not null default 'planning' check (status in ('planning','researching','ready','active','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_slug, neighborhood_slug)
);

create table public.neighborhood_visual_assets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.neighborhood_visual_collections(id) on delete cascade,
  scene_role text not null check (scene_role in ('signature','immobilier','lifestyle')),
  variant_index smallint not null default 1 check (variant_index > 0),
  title_fr text not null,
  visual_brief_fr text not null,
  reference_query text,
  reference_url text,
  source_name text,
  source_license text,
  source_attribution text,
  reference_status text not null default 'planned' check (reference_status in ('planned','researched','verified','approved','rejected')),
  verified_location boolean not null default false,
  image_storage_path text,
  transformed_asset_url text,
  property_types text[] not null default '{}'::text[],
  visual_tags text[] not null default '{}'::text[],
  avoid_tags text[] not null default '{}'::text[],
  landmark_policy text,
  fidelity_notes text,
  sort_order smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, scene_role, variant_index)
);

create index neighborhood_visual_collections_city_idx
  on public.neighborhood_visual_collections (city_slug, status);
create index neighborhood_visual_assets_collection_idx
  on public.neighborhood_visual_assets (collection_id, scene_role, reference_status);

alter table public.neighborhood_visual_collections enable row level security;
alter table public.neighborhood_visual_assets enable row level security;

comment on table public.neighborhood_visual_collections is
  'AkarFinder canonical city/neighborhood visual library collections. Private by default; no public RLS policy.';
comment on table public.neighborhood_visual_assets is
  'AkarFinder neighborhood visual reference and transformed asset slots. Atmosphere/reference imagery must never be represented as a property photo.';

insert into public.neighborhood_visual_collections
(city, city_slug, neighborhood, neighborhood_slug, status, notes)
values
('Rabat','rabat','Agdal','agdal','researching','Rabat pilot. Real-reference-grounded AkarFinder Concept 1.'),
('Rabat','rabat','Hay Riad','hay-riad','researching','Rabat pilot. Real-reference-grounded AkarFinder Concept 1.'),
('Rabat','rabat','Souissi','souissi','researching','Rabat pilot. Real-reference-grounded AkarFinder Concept 1.'),
('Rabat','rabat','Hassan','hassan','researching','Rabat pilot. Real-reference-grounded AkarFinder Concept 1.'),
('Rabat','rabat','Océan','ocean','researching','Canonicalizes raw Ocean/Océan visual identity to neighborhood_slug=ocean.'),
('Rabat','rabat','Médina','medina','researching','Rabat pilot. Real-reference-grounded AkarFinder Concept 1.'),
('Rabat','rabat','Les Orangers','les-orangers','researching','Direction validated; master reference still requires stronger geo verification.'),
('Rabat','rabat','Aviation','aviation','researching','Rabat pilot. Real-reference-grounded AkarFinder Concept 1.'),
('Rabat','rabat','Yacoub El Mansour','yacoub-el-mansour','researching','Rabat pilot. Everyday urban identity; do not premiumize.'),
('Rabat','rabat','Akkari','akkari','researching','Visual DNA validated; master reference still requires stronger geo verification.');

with c as (
  select id, neighborhood_slug
  from public.neighborhood_visual_collections
  where city_slug='rabat'
), v as (
  select * from (values
  ('agdal','signature','Avenue Fal Ould Oumeir','Préserver la perspective réelle de Fal Ould Oumeir : avenue commerçante, arbres, immeubles urbains de hauteur moyenne et rez-de-chaussée actifs.','Avenue Fal Ould Oumeir Agdal Rabat photo réelle','researched',array['apartment']::text[],array['avenue','commerces','arbres','immeubles','urbain']::text[],array['villa_luxe','grande_parcelle','skyline']::text[],'Aucun landmark ajouté artificiellement.',1),
  ('agdal','immobilier','Appartements urbains','Immeuble résidentiel urbain représentatif d’Agdal, façades réelles, hauteur modérée, contexte de rue crédible.','immeuble appartement Agdal Rabat photo réelle','researched',array['apartment']::text[],array['résidence','immeuble','urbain']::text[],array['villa_luxe','resort']::text[],'Aucun landmark requis.',2),
  ('agdal','lifestyle','Cafés & commerces','Scène réelle de cafés, commerces, vitrines et marche à pied dans Agdal.','cafés commerces Agdal Rabat Fal Ould Oumeir photo','researched',array[]::text[],array['cafés','commerces','piétons','walkability']::text[],array['plage','palmeraie']::text[],'Aucun landmark requis.',3),

  ('hay-riad','signature','Boulevard Annakhil','Préserver Boulevard/Avenue Annakhil : grande perspective, terre-plein et végétation, architecture moderne et échelle réelle.','Boulevard Annakhil Hay Riad Rabat photo réelle','researched',array['apartment','villa']::text[],array['boulevard','verdure','moderne','palmiers']::text[],array['skyline_inventée','tours_partout']::text[],'Landmark uniquement s’il est réellement visible depuis la photo source.',1),
  ('hay-riad','immobilier','Villas & résidences','Villa moderne ou résidence basse/moyenne réellement représentative de Hay Riad.','villa résidence Hay Riad Rabat photo réelle','researched',array['villa','apartment']::text[],array['villa','résidence','moderne','jardin']::text[],array['gratte_ciel','resort']::text[],'Aucun landmark requis.',2),
  ('hay-riad','lifestyle','Mahaj Riad','Scène réelle de Mahaj Riad : promenade, cafés, commerces, façades et espace public.','Mahaj Riad Rabat photo réelle','researched',array[]::text[],array['mahaj','cafés','commerces','promenade']::text[],array['plage','médina']::text[],'Mahaj Riad autorisé comme repère local.',3),

  ('souissi','signature','Rue résidentielle verdoyante','Rue réelle de Souissi dominée par la végétation, murs/portails, faible densité et grandes propriétés en retrait.','rue Souissi Rabat villas verdure photo réelle','researched',array['villa']::text[],array['verdure','faible_densité','grandes_parcelles','résidentiel']::text[],array['cafés','immeuble_haut','densité']::text[],'Pas de faux landmark : le paysage résidentiel est la signature.',1),
  ('souissi','immobilier','Grande villa avec jardin','Grande villa réelle dans une parcelle généreuse, avec jardin mature dominant visuellement.','villa Souissi Rabat jardin photo réelle','researched',array['villa']::text[],array['villa','jardin','grande_parcelle']::text[],array['tour','immeuble_dense']::text[],'Aucun landmark requis.',2),
  ('souissi','lifestyle','Calme & verdure','Ambiance de calme résidentiel, jardins, arbres matures et espace.','Souissi Rabat quartier verdoyant photo réelle','researched',array[]::text[],array['calme','verdure','jardins']::text[],array['nightlife','commerce_dense']::text[],'Aucun landmark requis.',3),

  ('hassan','signature','Perspective vers la Tour Hassan','Utiliser uniquement une vraie perspective urbaine où la Tour Hassan est réellement visible dans le point de fuite ou le champ.','quartier Hassan Rabat rue Tour Hassan perspective photo','researched',array['apartment']::text[],array['tour_hassan','avenue','palmiers','centre']::text[],array['landmark_collé','médina_fictive']::text[],'Tour Hassan autorisée uniquement si présente dans la scène réelle.',1),
  ('hassan','immobilier','Appartement central','Immeuble/appartement urbain central représentatif du quartier Hassan.','immeuble appartement Hassan Rabat photo réelle','researched',array['apartment']::text[],array['immeuble','centre','urbain']::text[],array['villa_suburbaine']::text[],'Aucun landmark requis.',2),
  ('hassan','lifestyle','Jardins & Bouregreg','Jardins de la Tour Hassan / promenade et relation réelle au Bouregreg.','Jardins Tour Hassan Bouregreg Rabat photo réelle','researched',array[]::text[],array['jardin','bouregreg','promenade','patrimoine']::text[],array['plage_atlantique']::text[],'Tour Hassan/Bouregreg seulement si cohérents avec le cadrage réel.',3),

  ('ocean','signature','Boulevard côtier & Atlantique','Préserver l’identité d’Océan : quartier urbain rbati tourné vers l’Atlantique, boulevard/promenade et façades résidentielles réelles.','quartier Océan Rabat boulevard Atlantique photo réelle','researched',array['apartment']::text[],array['atlantique','boulevard','urbain','palmiers']::text[],array['ain_diab_style','beach_club_luxe','villa_resort']::text[],'Aucun landmark ajouté.',1),
  ('ocean','immobilier','Appartements urbains','Immeuble urbain réel du quartier Océan ; vue mer uniquement si la source le prouve.','appartement quartier Océan Rabat photo réelle','researched',array['apartment']::text[],array['immeuble','urbain','mer_si_réelle']::text[],array['villa_luxe','resort']::text[],'Vue mer non inventée.',2),
  ('ocean','lifestyle','Promenade & plage','Promenade ou plage réellement rattachée au quartier Océan, ambiance quotidienne rbatie.','promenade plage quartier Océan Rabat photo réelle','researched',array[]::text[],array['promenade','plage','atlantique']::text[],array['club_luxe','corniche_casablanca']::text[],'Aucun landmark requis.',3),

  ('medina','signature','Rue des Consuls','Préserver la morphologie réelle de la Rue des Consuls : voie piétonne, arcades, boutiques et artisanat.','Rue des Consuls Médina Rabat photo réelle','researched',array['riad','house']::text[],array['rue_des_consuls','arcades','artisanat','piéton']::text[],array['immeuble_moderne','boulevard']::text[],'Rue des Consuls est le repère principal.',1),
  ('medina','immobilier','Riad / maison traditionnelle','Maison traditionnelle ou riad réel de la Médina, sans modernisation artificielle de la façade.','riad maison traditionnelle Médina Rabat photo réelle','researched',array['riad','house']::text[],array['riad','maison_traditionnelle','patrimoine']::text[],array['résidence_moderne','verre']::text[],'Aucun landmark requis.',2),
  ('medina','lifestyle','Souks & artisanat','Bab El Had, Souika ou scène artisanale réelle, avec priorité à la vie piétonne et aux commerces traditionnels.','Bab El Had Souika artisanat Médina Rabat photo réelle','researched',array[]::text[],array['souks','artisanat','bab_el_had','souika']::text[],array['mall','boulevard_moderne']::text[],'Bab El Had autorisé seulement si la référence le montre.',3),

  ('les-orangers','signature','Rue résidentielle arborée','Petite rue réelle, calme, centrale et arborée ; échelle résidentielle ancienne/modérée.','Les Orangers Rabat rue quartier photo réelle','planned',array['apartment','house']::text[],array['rue_arborée','calme','central']::text[],array['souissi_luxe','tour']::text[],'Aucun landmark tant que non vérifié.',1),
  ('les-orangers','immobilier','Appartement ancien & maison','Appartement plus ancien ou petite maison réellement située aux Orangers.','Les Orangers Rabat appartement maison photo réelle','planned',array['apartment','house']::text[],array['appartement_ancien','maison','central']::text[],array['villa_palais','gratte_ciel']::text[],'Aucun landmark requis.',2),
  ('les-orangers','lifestyle','Quartier central calme','Ambiance de proximité centrale et calme, sans sur-promesse premium.','Les Orangers Rabat quartier calme photo réelle','planned',array[]::text[],array['calme','proximité','résidentiel']::text[],array['nightlife','resort']::text[],'Aucun landmark tant que non vérifié.',3),

  ('aviation','signature','Avenue Souss / rue résidentielle','Scène réelle autour de l’avenue Souss : rue calme, maisons/villas compactes, verdure et échelle humaine.','Avenue Souss Aviation Rabat photo réelle','researched',array['house','villa']::text[],array['avenue_souss','calme','résidentiel','verdure']::text[],array['immeuble_haut','souissi_grande_parcelle']::text[],'Pas de motif aviation/avion inventé.',1),
  ('aviation','immobilier','Maison / villa compacte','Maison ou villa compacte réellement représentative d’Aviation.','villa maison Aviation Rabat photo réelle','researched',array['house','villa']::text[],array['maison','villa_compacte','résidentiel']::text[],array['palais','tour']::text[],'Aucun landmark requis.',2),
  ('aviation','lifestyle','Proximité Mohammed VI','Vie résidentielle quotidienne et relation à l’axe Mohammed VI seulement si géographiquement démontrée.','Aviation Rabat avenue Mohammed VI quartier photo réelle','researched',array[]::text[],array['walkability','proximité','axe_urbain']::text[],array['landmark_inventé']::text[],'Axe Mohammed VI mentionnable, pas de landmark artificiel.',3),

  ('yacoub-el-mansour','signature','El Massira / Al Kifah','Scène réelle d’un grand axe du quartier : tissu urbain dense, commerces, circulation et habitat quotidien.','Avenue El Massira Al Kifah Yacoub El Mansour Rabat photo réelle','researched',array['apartment','house']::text[],array['axe_urbain','dense','quotidien','commerces']::text[],array['premiumisation','villa_luxe','faux_landmark']::text[],'Ne pas confondre Avenue Yacoub El Mansour hors quartier avec le quartier.',1),
  ('yacoub-el-mansour','immobilier','Habitat urbain','Appartement ou immeuble résidentiel courant, fidèle au tissu urbain réel.','immeuble appartement Yacoub El Mansour Rabat photo réelle','researched',array['apartment','house']::text[],array['immeuble','habitat_urbain','quotidien']::text[],array['resort','palais']::text[],'Aucun landmark requis.',2),
  ('yacoub-el-mansour','lifestyle','Commerces & vie de quartier','Commerces, services, piétons et activité locale sur un axe réellement situé dans le quartier.','commerces Yacoub El Mansour Rabat photo réelle','researched',array[]::text[],array['commerces','services','vie_locale']::text[],array['mall_luxe']::text[],'Aucun landmark requis.',3),

  ('akkari','signature','Rue urbaine dense','Rue/axe réellement géolocalisé à Akkari, densité urbaine et activité locale ; aucune scène maîtresse approuvée avant vérification.','Akkari Rabat rue quartier photo réelle géolocalisée','planned',array['apartment','house']::text[],array['urbain','dense','local']::text[],array['faux_landmark','premiumisation']::text[],'Aucun landmark jusqu’à preuve géographique.',1),
  ('akkari','immobilier','Appartement & maison urbaine','Appartement ou maison urbaine réellement située à Akkari.','appartement maison Akkari Rabat photo réelle','planned',array['apartment','house']::text[],array['appartement','maison_urbaine']::text[],array['villa_luxe','resort']::text[],'Aucun landmark requis.',2),
  ('akkari','lifestyle','Commerces & mobilité','Commerces, tram/mobilité ou vie quotidienne uniquement si la référence est précisément géolocalisée à Akkari.','Akkari Rabat commerces tram photo réelle','planned',array[]::text[],array['commerces','mobilité','quotidien']::text[],array['landmark_non_vérifié']::text[],'Tram seulement si visible et géolocalisé dans la scène.',3)
  ) as t(neighborhood_slug,scene_role,title_fr,visual_brief_fr,reference_query,reference_status,property_types,visual_tags,avoid_tags,landmark_policy,sort_order)
)
insert into public.neighborhood_visual_assets
(collection_id,scene_role,variant_index,title_fr,visual_brief_fr,reference_query,reference_status,property_types,visual_tags,avoid_tags,landmark_policy,sort_order)
select c.id, v.scene_role, 1, v.title_fr, v.visual_brief_fr, v.reference_query, v.reference_status,
       v.property_types, v.visual_tags, v.avoid_tags, v.landmark_policy, v.sort_order
from c
join v on v.neighborhood_slug=c.neighborhood_slug;
