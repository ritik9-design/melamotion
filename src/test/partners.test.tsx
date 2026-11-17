import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { SitePage } from "@/components/site-page";
import { defaultSitePage, mergeSitePage, publicPartnerUrl, type SitePage as PageContent } from "@/lib/site-content";

beforeAll(() => {
  class MockObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal("IntersectionObserver", MockObserver);
});

function pageWith(partners: PageContent["partners"]): PageContent {
  return { ...defaultSitePage(), partners };
}

describe("worked with companies", () => {
  it("keeps saved companies and fills the row when a page has none yet", () => {
    expect(mergeSitePage({}).partners.heading).toBe("(Worked With)");
    expect(mergeSitePage({}).partners.items).toHaveLength(4);
    const saved = mergeSitePage({
      partners: {
        heading: "Clients",
        items: [{ id: "studio-1", name: "North Studio", subtitle: "", url: "north.example", style: "sans" }],
      },
    });
    expect(saved.partners.heading).toBe("Clients");
    expect(saved.partners.items).toEqual([
      { id: "studio-1", name: "North Studio", subtitle: "", url: "north.example", style: "sans" },
    ]);
    expect(mergeSitePage({ partners: { heading: "Clients", items: [] } }).partners.items).toEqual([]);
  });

  it("accepts a company site and drops a script link", () => {
    expect(publicPartnerUrl("https://north.example/films")).toBe("https://north.example/films");
    expect(publicPartnerUrl("north.example/films")).toBe("https://north.example/films");
    expect(publicPartnerUrl("http://north.example/films")).toBe("https://north.example/films");
    expect(publicPartnerUrl("javascript:alert(1)")).toBe("");
    expect(publicPartnerUrl("")).toBe("");
  });

  it("places the row between the opening film and the intro, and opens a company link", () => {
    const content = pageWith({
      heading: "(Worked With)",
      items: [{ id: "studio-1", name: "North Studio", subtitle: "FILMS", url: "https://north.example/films", style: "tracked" }],
    });
    render(<SitePage content={content} />);

    const html = document.body.innerHTML;
    const hero = html.indexOf("The edit room behind your studio.");
    const worked = html.indexOf("(Worked With)");
    const intro = html.indexOf("You shoot the day.");
    expect(hero).toBeGreaterThan(-1);
    expect(worked).toBeGreaterThan(hero);
    expect(intro).toBeGreaterThan(worked);

    const link = screen.getByRole("link", { name: /North Studio/i });
    expect(link).toHaveAttribute("href", "https://north.example/films");
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.queryByRole("link", { name: /Quiet Name/i })).toBeNull();
  });

  it("adds a company name and keeps the link typed in the studio", () => {
    const content = pageWith({ heading: "(Worked With)", items: [] });
    const onChange = vi.fn();
    const { rerender } = render(<SitePage content={content} editing onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /add a company/i }));
    const added = onChange.mock.calls[0]?.[0] as PageContent;
    expect(added.partners.items).toHaveLength(1);
    expect(added.partners.items[0]?.name).toBe("New company");

    rerender(<SitePage content={added} editing onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: /link for new company/i }), { target: { value: "https://new.example" } });
    const linked = onChange.mock.calls.at(-1)?.[0] as PageContent;
    expect(linked.partners.items[0]?.url).toBe("https://new.example");
  });
});
