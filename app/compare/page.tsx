import { SiteFooter } from "@/components/landing/SiteFooter";
import { ComparePageShell } from "@/components/compare/ComparePageShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />
      <Container>
        <ComparePageShell />
      </Container>
      <SiteFooter />
    </main>
  );
}
