import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  Heart,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import { BrandLogo } from "@/components/ui/BrandLogo";
import { ui } from "@/components/ui/design-system";

const TARGETS = ["home", "search", "map", "quartier", "listing", "mon-projet", "publier", "professionnels"] as const;
type Target = (typeof TARGETS)[number];
type PageProps = { searchParams: Promise<{ target?: string }> };

const PINS = [
  { left: 24, top: 30, label: "1,8M" },
  { left: 57, top: 22, label: "2,4M" },
  { left: 68, top: 58, label: "3,1M" },
  { left: 37, top: 67, label: "1,5M" },
] as const;

const PROJECT_CHOICES: Array<{ icon: LucideIcon; title: string; detail: string }> = [
  { icon: Home, title: "Acheter", detail: "Pour y vivre ou préparer un projet patrimonial" },
  { icon: Building2, title: "Louer", detail: "Trouver un logement adapté à votre quotidien" },
  { icon: WalletCards, title: "Investir", detail: "Structurer vos critères sans rendement promis" },
  { icon: Sparkles, title: "Neuf", detail: "Explorer les programmes neufs" },
];

const PRO_PILLARS: Array<{ icon: LucideIcon; title: string; detail: string }> = [
  { icon: Users, title: "Identité pro", detail: "Profil, équipe et provenance visibles." },
  { icon: Upload, title: "Publication structurée", detail: "Même Listing Standard pour tous." },
  { icon: BarChart3, title: "Intelligence marché", detail: "Lecture territoriale sans donnée inventée." },
];

function targetOf(value?: string): Target {
  return TARGETS.includes(value as Target) ? (value as Target) : "home";
}

function Header({ transparent = false }: { transparent?: boolean }) {
  return (
    <header className={`flex h-16 items-center justify-between border-b px-4 sm:px-7 ${transparent ? "absolute inset-x-0 top-0 z-30 border-white/15 bg-transparent text-white" : "border-[#DCE8F5] bg-white text-[#0B2545]"}`}>
      <BrandLogo className="h-8 w-auto" variant={transparent ? "dark" : "default"} onDark={transparent} />
      <nav className="hidden items-center gap-6 text-xs font-bold md:flex">
        <span>Acheter</span><span>Louer</span><span>Neuf</span><span>Carte</span><span>Mon Projet</span>
      </nav>
      <button className={`min-h-10 rounded-[12px] px-4 text-xs font-extrabold ${transparent ? "border border-white/35 bg-white/10" : "border border-[#DCE8F5] bg-white"}`}>Se connecter</button>
    </header>
  );
}

function Filters() {
  return (
    <div className="flex gap-2 overflow-hidden border-b border-[#DCE8F5] bg-white px-3 py-2.5 sm:px-6">
      {["Acheter", "Rabat", "Prix", "Surface", "Type", "Chambres", "Filtres"].map((label, index) => (
        <span key={label} className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold ${index < 2 ? "border-[#0B63CE] bg-[#EEF6FF] text-[#0B63CE]" : "border-[#DCE8F5] bg-white text-[#36506F]"}`}>{label}</span>
      ))}
    </div>
  );
}

function ListingCard({ compact = false, title = "Appartement lumineux à Agdal", price = "2 450 000 DH" }: { compact?: boolean; title?: string; price?: string }) {
  return (
    <article className={`overflow-hidden rounded-[20px] border border-[#DCE8F5] bg-white shadow-[0_10px_30px_rgba(11,31,58,0.07)] ${compact ? "grid grid-cols-[112px_1fr]" : ""}`}>
      <div className={`${compact ? "min-h-[120px]" : "h-36"} relative bg-[#EAF3FF]`}>
        <Image src="/brand/visual-system/property-apartment.svg" alt="" fill className="object-cover" />
        <span className="absolute left-2 top-2 rounded-full border border-white/80 bg-white/90 px-2 py-1 text-[9px] font-extrabold text-[#0B2545]">Appartement</span>
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2"><p className="text-sm font-black text-[#0B1F3A]">{price}</p><Heart size={15} className="text-slate-400" /></div>
        <p className="mt-1 text-[11px] font-extrabold text-[#0B1F3A]">{title}</p>
        <p className="mt-1 text-[10px] text-slate-500">Rabat · Agdal · 96 m² · 2 ch.</p>
        <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-emerald-700"><ShieldCheck size={12} /> Confiance élevée</div>
      </div>
    </article>
  );
}

function MapCanvas({ selected = false }: { selected?: boolean }) {
  return (
    <div className="relative min-h-[430px] overflow-hidden bg-[#E8F0E9]" data-mock-map>
      <div className="absolute inset-0 opacity-65" style={{ backgroundImage: "linear-gradient(31deg,transparent 46%,rgba(255,255,255,.95) 47%,rgba(255,255,255,.95) 50%,transparent 51%),linear-gradient(121deg,transparent 43%,rgba(255,255,255,.8) 44%,rgba(255,255,255,.8) 47%,transparent 48%)", backgroundSize: "92px 92px,128px 128px" }} />
      <div className="absolute left-[13%] top-[22%] h-32 w-40 rounded-[42%] border-2 border-[#0B63CE]/25 bg-[#0B63CE]/10" />
      <div className="absolute right-[12%] top-[38%] h-40 w-52 rounded-[46%] border-2 border-emerald-600/20 bg-emerald-500/10" />
      {PINS.map((pin) => <span key={pin.label} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0B2545] px-2.5 py-1.5 text-[10px] font-black text-white shadow-lg" style={{ left: `${pin.left}%`, top: `${pin.top}%` }}>{pin.label}</span>)}
      <button className="absolute left-1/2 top-4 -translate-x-1/2 rounded-[13px] bg-white px-4 py-2.5 text-[11px] font-extrabold text-[#0B2545] shadow-lg">Rechercher dans cette zone</button>
      {selected ? <div className="absolute bottom-4 left-4 right-4 max-w-sm"><ListingCard compact /></div> : null}
    </div>
  );
}

function HomeTarget() {
  return <main className="min-h-screen bg-[#F4F8FC]" data-canonical-target="home">
    <section className="relative flex min-h-[78vh] items-center overflow-hidden bg-[#061027]">
      <Image src="/images/hero/akar-residence-sunset-desktop.webp" alt="Résidence marocaine" fill priority className="object-cover opacity-65" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,13,31,.34),rgba(4,13,31,.72))]" />
      <Header transparent />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 pt-20 text-center text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-100">Immobilier · Maroc</p>
        <h1 className="mx-auto mt-4 max-w-4xl text-[2.4rem] font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">1er moteur de recherche immobilier au Maroc</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-blue-50/90 sm:text-base">Cherchez un bien, puis comprenez son quartier, son marché et la fiabilité de l’annonce avant de décider.</p>
        <div className="mx-auto mt-8 flex max-w-3xl items-center gap-2 rounded-[18px] bg-white p-2.5 text-left shadow-2xl"><Search className="ml-2 shrink-0 text-[#0B63CE]" size={20} /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-500">Ville, quartier ou type de bien</span><button className="rounded-[14px] bg-[#0B63CE] px-5 py-3 text-sm font-extrabold text-white">Rechercher</button></div>
      </div>
    </section>
    <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 sm:grid-cols-3">{[["Marché observé","Prix, volumes et fraîcheur qualifiés."],["Confiance lisible","Provenance et précision visibles."],["Territoire utile","Quartiers et vie locale avant le clic."]].map(([title,detail]) => <article key={title} className={`${ui.surfacePremium} p-5`}><p className={ui.eyebrow}>AkarFinder</p><h2 className="mt-2 text-lg font-extrabold text-[#0B1F3A]">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></article>)}</section>
  </main>;
}

function SearchTarget() {
  return <main className="min-h-screen bg-white" data-canonical-target="search"><Header /><Filters /><div className="grid min-h-[calc(100vh-113px)] lg:grid-cols-[1.08fr_.92fr]"><MapCanvas /><section className="border-l border-[#DCE8F5] bg-[#F7FAFE] p-4 sm:p-5"><div className="flex items-end justify-between gap-3"><div><p className={ui.eyebrow}>Rabat · Agdal</p><h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[#0B1F3A]">247 biens</h1></div><button className={ui.secondaryAction}>Trier <ChevronDown size={14}/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2"><ListingCard/><ListingCard title="Villa contemporaine à Hay Riad" price="5 900 000 DH"/><ListingCard title="Studio rénové proche tram" price="1 120 000 DH"/></div></section></div></main>;
}

function MapTarget() {
  return <main className="min-h-screen bg-white" data-canonical-target="map"><Header/><div className="flex gap-2 overflow-hidden border-b border-[#DCE8F5] bg-white px-4 py-3">{["Prix","Densité","Annonces","Confiance","Vie locale"].map((label,index) => <span key={label} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-extrabold ${index===0?"bg-[#0B2545] text-white":"border border-[#DCE8F5] text-[#36506F]"}`}>{label}</span>)}</div><div className="relative min-h-[calc(100vh-118px)]"><MapCanvas selected/><aside className="absolute left-4 top-4 hidden w-72 rounded-[22px] border border-white/90 bg-white/95 p-5 shadow-xl backdrop-blur md:block"><p className={ui.eyebrow}>Rabat</p><h1 className="mt-2 text-2xl font-black text-[#0B1F3A]">Comprendre avant de chercher</h1><div className="mt-4 grid grid-cols-2 gap-2 text-center">{[["18 420","DH/m²"],["1 284","annonces"],["72/100","confiance"],["14 j","fraîcheur"]].map(([number,label]) => <div key={label} className={`${ui.subtlePanel} p-3`}><strong className="block text-sm text-[#0B1F3A]">{number}</strong><span className="text-[9px] text-slate-500">{label}</span></div>)}</div></aside></div></main>;
}

function QuartierTarget() {
  return <main className={`min-h-screen ${ui.pageLight}`} data-canonical-target="quartier"><Header/><section className="border-b border-[#DCE8F5] bg-white"><div className="mx-auto grid max-w-6xl gap-7 px-5 py-8 lg:grid-cols-[1.05fr_.95fr] lg:py-12"><div><p className={ui.eyebrow}>Rabat · Quartier</p><h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#0B1F3A] sm:text-5xl">Agdal, en données utiles</h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">Prix observés, vie locale et stock immobilier réunis avant de parcourir les annonces.</p><div className="mt-6 grid grid-cols-3 gap-2">{[["18 420","DH/m²"],["286","biens"],["78/100","confiance"]].map(([number,label]) => <div key={label} className={`${ui.subtlePanel} p-4`}><strong className="block text-base text-[#0B1F3A]">{number}</strong><span className="text-[9px] text-slate-500">{label}</span></div>)}</div></div><div className="overflow-hidden rounded-[28px] border border-[#DCE8F5]"><MapCanvas/></div></div></section><section className="mx-auto max-w-6xl px-5 py-8"><div className="flex items-center justify-between gap-3"><div><p className={ui.eyebrow}>Biens</p><h2 className="mt-1 text-2xl font-black text-[#0B1F3A]">À voir dans Agdal</h2></div><button className={ui.primaryAction}>Voir 286 biens <ArrowRight size={15}/></button></div><div className="mt-5 grid gap-4 md:grid-cols-3"><ListingCard/><ListingCard title="Duplex calme proche écoles" price="3 250 000 DH"/><ListingCard title="Appartement terrasse" price="2 980 000 DH"/></div></section></main>;
}

function ListingTarget() {
  return <main className={`min-h-screen ${ui.pageLight}`} data-canonical-target="listing"><Header/><div className="mx-auto max-w-6xl px-5 py-6"><div className="grid gap-3 overflow-hidden rounded-[26px] lg:grid-cols-[1.4fr_.6fr]"><div className="relative min-h-[340px] bg-[#EAF3FF]"><Image src="/brand/visual-system/property-apartment.svg" alt="" fill className="object-cover"/></div><div className="hidden gap-3 lg:grid"><div className="relative bg-[#EEF6FF]"><Image src="/brand/visual-system/property-apartment.svg" alt="" fill className="object-cover opacity-80"/></div><div className="relative bg-[#F4F8FC]"><Image src="/brand/visual-system/property-apartment.svg" alt="" fill className="object-cover opacity-65"/></div></div></div><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_330px]"><section><p className={ui.eyebrow}>Bien</p><div className="mt-2 flex items-start justify-between gap-3"><div><h1 className="text-3xl font-black tracking-[-0.045em] text-[#0B1F3A]">2 450 000 DH</h1><p className="mt-2 text-sm font-bold text-[#36506F]">Appartement lumineux · Rabat, Agdal</p></div><button className={ui.secondaryAction}><Heart size={16}/></button></div><div className="mt-5 grid grid-cols-3 gap-2">{[["96 m²","Surface"],["2","Chambres"],["4e","Étage"]].map(([number,label]) => <div key={label} className={`${ui.subtlePanel} p-3`}><strong className="block text-sm text-[#0B1F3A]">{number}</strong><span className="text-[9px] text-slate-500">{label}</span></div>)}</div><div className="mt-6 space-y-3">{[["Confiance","Source agence partenaire · localisation exacte"],["Marché","4 % sous la médiane observée du quartier"],["Vie locale","Tram, commerces et écoles accessibles à proximité"]].map(([title,detail]) => <article key={title} className={`${ui.surfacePremium} p-5`}><p className={ui.eyebrow}>{title}</p><p className="mt-2 text-sm font-bold text-[#0B1F3A]">{detail}</p></article>)}</div></section><aside className={`${ui.surfacePremium} h-fit p-5 lg:sticky lg:top-4`}><p className={ui.eyebrow}>Décision</p><h2 className="mt-2 text-xl font-black text-[#0B1F3A]">Avancer sur ce bien</h2><button className={`${ui.primaryAction} mt-5 w-full`}>Demander une visite</button><button className={`${ui.secondaryAction} mt-2 w-full`}>Ajouter à Mon Projet</button><button className="mt-4 flex items-center gap-2 text-xs font-extrabold text-[#0B63CE]"><MapPin size={14}/> Voir sur la carte</button></aside></div></div></main>;
}

function MonProjetTarget() {
  return <main className={`min-h-screen ${ui.pageLight}`} data-canonical-target="mon-projet"><Header/><div className="mx-auto max-w-6xl px-5 py-7"><div className="grid gap-5 lg:grid-cols-[220px_1fr]"><aside className={`${ui.surfacePremium} h-fit p-5`}><p className={ui.eyebrow}>Mon Projet</p><p className="mt-2 text-sm font-black text-[#0B1F3A]">Étape 1 sur 8</p><div className="mt-4 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[12.5%] rounded-full bg-[#0B63CE]"/></div><div className="mt-5 space-y-2 text-[11px] font-bold text-slate-500">{["Votre projet","Zone et budget","Le bien","Votre quotidien","Priorités","Compromis","Récapitulatif","Recherche"].map((label,index) => <p key={label} className={index===0?"text-[#0B63CE]":""}>{index+1}. {label}</p>)}</div></aside><section className={`${ui.surfacePremium} p-5 sm:p-8`}><p className={ui.eyebrow}>Votre projet</p><h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-[#0B1F3A] sm:text-5xl">Que cherchez-vous à accomplir ?</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">Une question à la fois. Vos réponses deviennent directement des critères de recherche.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{PROJECT_CHOICES.map(({icon:Icon,title,detail}) => <button key={title} className="rounded-[20px] border border-[#DCE8F5] bg-white p-5 text-left transition hover:border-[#0B63CE]"><Icon className="text-[#0B63CE]" size={20}/><strong className="mt-4 block text-sm text-[#0B1F3A]">{title}</strong><span className="mt-1 block text-[11px] leading-5 text-slate-500">{detail}</span></button>)}</div></section></div></div></main>;
}

function PublierTarget() {
  return <main className={`min-h-screen ${ui.pageLight}`} data-canonical-target="publier"><Header/><div className="mx-auto max-w-6xl px-5 py-7"><div className="grid gap-5 lg:grid-cols-[220px_1fr_280px]"><aside className={`${ui.surfacePremium} h-fit p-5`}><p className={ui.eyebrow}>Publier</p><h2 className="mt-2 text-lg font-black text-[#0B1F3A]">Dossier du bien</h2><div className="mt-5 space-y-3">{["Type","Localisation","Caractéristiques","Prix","Médias","Vérification"].map((label,index) => <div key={label} className={`flex items-center gap-2 text-xs font-bold ${index===0?"text-[#0B63CE]":"text-slate-500"}`}><span className={`grid h-6 w-6 place-items-center rounded-full ${index===0?"bg-[#0B63CE] text-white":"bg-slate-100"}`}>{index+1}</span>{label}</div>)}</div></aside><section className={`${ui.surfacePremium} p-5 sm:p-7`}><p className={ui.eyebrow}>Étape 1</p><h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-[#0B1F3A]">Commençons par le type de bien</h1><p className="mt-2 text-sm text-slate-500">Le formulaire s’adaptera ensuite à ce bien. Pas de champs inutiles.</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{["Appartement","Villa","Maison","Terrain","Bureau","Commerce"].map((label,index) => <button key={label} className={`rounded-[18px] border p-4 text-left ${index===0?"border-[#0B63CE] bg-[#EEF6FF]":"border-[#DCE8F5] bg-white"}`}><Building2 size={18} className="text-[#0B63CE]"/><strong className="mt-3 block text-xs text-[#0B1F3A]">{label}</strong></button>)}</div><div className="mt-6 flex justify-end"><button className={ui.primaryAction}>Continuer <ArrowRight size={15}/></button></div></section><aside className={`${ui.surfacePremium} hidden h-fit p-5 lg:block`}><p className={ui.eyebrow}>Qualité du dossier</p><div className="mt-3 flex items-end gap-2"><strong className="text-3xl text-[#0B1F3A]">12%</strong><span className="pb-1 text-xs text-slate-400">complété</span></div><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-full w-[12%] rounded-full bg-[#0B63CE]"/></div><p className="mt-4 text-[11px] leading-5 text-slate-500">Complétude et confiance restent deux mesures différentes.</p></aside></div></div></main>;
}

function ProfessionnelsTarget() {
  return <main className="min-h-screen bg-[#061027] text-white" data-canonical-target="professionnels"><Header transparent/><section className="relative overflow-hidden px-5 pb-16 pt-28"><div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(11,99,206,.28),transparent_35%)]"/><div className="relative mx-auto grid max-w-6xl items-center gap-9 lg:grid-cols-[1fr_.85fr]"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-300">AkarFinder Pro</p><h1 className="mt-4 max-w-2xl text-4xl font-black leading-[1.03] tracking-[-0.055em] sm:text-6xl">Vos annonces, votre identité, notre intelligence territoriale.</h1><p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">Agences et promoteurs publient des dossiers structurés, conservent leur provenance et gagnent une lecture marché cohérente.</p><div className="mt-7 flex flex-wrap gap-3"><button className="rounded-[14px] bg-white px-5 py-3 text-sm font-extrabold text-[#0B2545]">Devenir partenaire</button><button className="rounded-[14px] border border-white/20 px-5 py-3 text-sm font-extrabold">Voir les standards</button></div></div><div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur"><div className="rounded-[22px] bg-white p-5 text-[#0B1F3A]"><div className="flex items-center justify-between"><div><p className={ui.eyebrow}>Agence partenaire</p><h2 className="mt-1 text-xl font-black">Tableau de bord</h2></div><ShieldCheck className="text-emerald-600"/></div><div className="mt-5 grid grid-cols-3 gap-2">{[["42","annonces"],["18","leads"],["91%","complétude"]].map(([number,label]) => <div key={label} className={`${ui.subtlePanel} p-3 text-center`}><strong className="block text-base">{number}</strong><span className="text-[9px] text-slate-500">{label}</span></div>)}</div><div className="mt-4 space-y-2">{["Villa Souissi · 6,9 M DH","Appartement Agdal · 2,4 M DH","Programme Hay Riad · dès 1,8 M DH"].map((label) => <div key={label} className="flex items-center justify-between rounded-[14px] border border-[#DCE8F5] px-3 py-3 text-[11px] font-bold"><span>{label}</span><ArrowRight size={13}/></div>)}</div></div></div></div></section><section className="border-t border-white/10 bg-white/[.035] px-5 py-8"><div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">{PRO_PILLARS.map(({icon:Icon,title,detail}) => <article key={title} className="rounded-[22px] border border-white/10 bg-white/5 p-5"><Icon size={19} className="text-blue-300"/><h2 className="mt-3 text-sm font-extrabold">{title}</h2><p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p></article>)}</div></section></main>;
}

export default async function CanonicalTargetsPage({ searchParams }: PageProps) {
  const target = targetOf((await searchParams).target);
  if (target === "search") return <SearchTarget />;
  if (target === "map") return <MapTarget />;
  if (target === "quartier") return <QuartierTarget />;
  if (target === "listing") return <ListingTarget />;
  if (target === "mon-projet") return <MonProjetTarget />;
  if (target === "publier") return <PublierTarget />;
  if (target === "professionnels") return <ProfessionnelsTarget />;
  return <HomeTarget />;
}
