import { SitePage } from "@/components/site-page";
import { defaultSitePage, type SitePage as PageContent } from "@/lib/site-content";
import { publicSections, type PublicSection } from "@/lib/site-urls";
import { getSitePage } from "@/lib/studio.functions";

export function loadPublicPage() {
  return getSitePage().catch(() => defaultSitePage());
}

export function publicHead(content: PageContent | undefined, section: PublicSection) {
  const name = content?.hero.title ?? "Mela Motion Films";
  const label = publicSections.find((entry) => entry.id === section)?.label ?? "Home";
  const title = section === "home" ? `${name} — Wedding Post-Production for Filmmakers` : `${label} — ${name}`;
  const description = content?.hero.subtitle ?? "The edit room behind your studio.";
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: content?.about.heading ?? "You shoot the day. We shape the film." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}

export function PublicPage({ content, section }: { content: PageContent; section: PublicSection }) {
  return <SitePage content={content} section={section} />;
}
