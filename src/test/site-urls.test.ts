import { describe, expect, it } from "vitest";
import { isSafeHttpsUrl, sectionHref, siteUrls } from "@/lib/site-urls";
import { publicImageLink, publicVideoLink } from "@/lib/site-content";

describe("site URLs", () => {
  it("keeps the public home page and hides the studio from the sitemap", () => {
    expect(siteUrls.find((entry) => entry.path === "/")?.index).toBe(true);
    expect(siteUrls.find((entry) => entry.path === "/admin")?.index).toBe(false);
    expect(siteUrls.find((entry) => entry.path === "/studio/files/:name")?.access).toBe("studio");
    expect(sectionHref.about).toBe("/about");
    expect(sectionHref.films).toBe("/films");
    expect(siteUrls.find((entry) => entry.path === "/films")?.index).toBe(true);
  });

  it("allows a public https image and rejects active or private targets", () => {
    expect(publicImageLink("https://images.example.com/photo.jpg")).toContain("https://images.example.com/photo.jpg");
    expect(publicImageLink("https://images.example.com/photo")).toContain("https://images.example.com/photo");
    expect(isSafeHttpsUrl("javascript:alert(1)")).toBe("");
    expect(publicImageLink("http://images.example.com/photo.jpg")).toBe("");
    expect(publicImageLink("https://user:pass@images.example.com/photo.jpg")).toBe("");
    expect(publicImageLink("https://images.example.com/photo.svg")).toBe("");
    expect(publicImageLink("https://127.0.0.1/photo.jpg")).toBe("");
    expect(publicImageLink("https://192.168.0.5/photo.jpg")).toBe("");
    expect(publicVideoLink("https://cdn.example.com/film.mp4")).toContain("film.mp4");
    expect(publicVideoLink("https://cdn.example.com/film.html")).toBe("");
  });
});
