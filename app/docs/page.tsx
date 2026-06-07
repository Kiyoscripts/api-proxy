import DocsContent from "@/components/docs/docs-content";
import { LandingNav } from "@/components/landing-nav";

export default function DocsPage() {
  return (
    <div className="landing-page">
      <LandingNav />
      <div className="public-docs-wrap">
        <DocsContent />
      </div>
    </div>
  );
}
