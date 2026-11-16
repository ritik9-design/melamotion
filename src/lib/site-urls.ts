export type UrlAccess = "public" | "studio";

export type SiteUrl = {
  path: string;
  access: UrlAccess;
  label: string;
  /** Included in sitemap.xml. Studio and machine files stay out of the index. */
  index: boolean;
};

/** Public pages. The address is the path, never a hash such as /#films. */
export const publicSections = [
  { id: "home", path: "/", label: "Home" },
  { id: "about", path: "/about", label: "About" },
  { id: "services", path: "/services", label: "Services" },
  { id: "films", path: "/films", label: "Films" },
  { id: "process", path: "/process", label: "Process" },
  { id: "contact", path: "/contact", label: "Contact" },
] as const;

export type PublicSection = (typeof publicSections)[number]["id"];

export const sectionHref = {
  home: "/",
  about: "/about",
  services: "/services",
  films: "/films",
  process: "/process",
  contact: "/contact",
} as const satisfies Record<PublicSection, string>;

export function pathForSection(id: string) {
  return publicSections.find((entry) => entry.id === id)?.path ?? "";
}

/** Every URL this app serves. Add a page here when a route is added. */
export const siteUrls: SiteUrl[] = [
  ...publicSections.map((entry) => ({ path: entry.path, access: "public" as const, label: entry.label, index: true })),
  { path: "/admin", access: "studio", label: "Studio", index: false },
  { path: "/robots.txt", access: "public", label: "Crawler rules", index: false },
  { path: "/sitemap.xml", access: "public", label: "Sitemap", index: false },
  { path: "/favicon.png", access: "public", label: "Icon", index: false },
  { path: "/studio/files/:name", access: "studio", label: "Private enquiry file", index: false },
];

export const studioActions = [
  { name: "getSessionUser", access: "public" as const, label: "Check studio session" },
  { name: "signInWithPassword", access: "public" as const, label: "Studio sign-in" },
  { name: "signOutStudio", access: "studio" as const, label: "Studio sign-out" },
  { name: "getSitePage", access: "public" as const, label: "Read the public page" },
  { name: "saveSitePage", access: "studio" as const, label: "Save page content" },
  { name: "submitInquiry", access: "public" as const, label: "Send an enquiry" },
  { name: "getDashboard", access: "studio" as const, label: "Read the enquiry inbox" },
  { name: "updateStudioInquiry", access: "studio" as const, label: "Update an enquiry" },
  { name: "deleteStudioInquiry", access: "studio" as const, label: "Delete an enquiry" },
  { name: "clearStudioInquiries", access: "studio" as const, label: "Clear the inbox" },
  { name: "uploadStudioMedia", access: "studio" as const, label: "Upload studio media" },
  { name: "saveStudioProject", access: "studio" as const, label: "Save a film" },
  { name: "deleteStudioProject", access: "studio" as const, label: "Delete a film" },
  { name: "saveStudioSettings", access: "studio" as const, label: "Save studio links" },
];

const blockedExtensions = new Set([
  "svg",
  "svgz",
  "html",
  "htm",
  "xhtml",
  "xml",
  "js",
  "mjs",
  "cjs",
  "php",
  "phtml",
  "exe",
  "bat",
  "cmd",
  "com",
  "sh",
  "ps1",
  "dll",
  "msi",
  "jar",
  "scr",
  "hta",
]);

function isPrivateHost(host: string) {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/**
 * Accept a public https URL and return the normalized form.
 * Rejects scripts, private hosts, credentials, and active-content file types.
 * When `extensions` is set, the path must end with one of them.
 */
export function isSafeHttpsUrl(value: string, extensions?: readonly string[]) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2000 || /[\u0000-\u001F\u007F\\]/.test(trimmed)) return "";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" || url.username || url.password) return "";
  if (url.port && url.port !== "443") return "";
  const host = url.hostname.toLowerCase().replace(/\.+$/, "");
  if (!host || !host.includes(".") || host.startsWith(".") || host.includes(":")) return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || isPrivateHost(host)) return "";

  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return "";
  }
  const lowerPath = pathname.toLowerCase();
  const dotted = lowerPath.split("/").pop()?.includes(".") ?? false;
  const extension = dotted ? (lowerPath.split(".").pop() ?? "") : "";
  if (extension && blockedExtensions.has(extension)) return "";
  if (extensions && !extensions.some((ext) => lowerPath.endsWith(ext))) return "";
  return url.toString();
}

export function indexablePaths() {
  return siteUrls.filter((entry) => entry.index).map((entry) => entry.path);
}
