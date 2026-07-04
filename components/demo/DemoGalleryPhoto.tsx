// DEMO-LISTING-VISUALS-1 — Fictional, illustrative visuals for /demo
// property galleries. Locally-hosted stock-style photos (no external
// requests), never a real listing photo. Always paired with the
// "Visuel fictif" label.
import Image from "next/image";

type DemoGalleryPhotoProps = {
  src: string;
  ratio?: "4:3" | "16:10";
  className?: string;
};

const RATIO_CLASS: Record<NonNullable<DemoGalleryPhotoProps["ratio"]>, string> = {
  "4:3": "aspect-[4/3]",
  "16:10": "aspect-[16/10]",
};

export function DemoGalleryPhoto({ src, ratio = "16:10", className = "" }: DemoGalleryPhotoProps) {
  return (
    <div className={`relative overflow-hidden ${RATIO_CLASS[ratio]} ${className}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        className="object-cover"
      />
      <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        Visuel fictif
      </span>
    </div>
  );
}
