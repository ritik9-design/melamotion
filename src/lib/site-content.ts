import { z } from "zod";
import { isSafeHttpsUrl } from "@/lib/site-urls";

const text = (max: number) => z.string().max(max);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const partnerLooks = ["stacked", "tracked", "sans", "italic"] as const;
export type PartnerLook = (typeof partnerLooks)[number];

const partnerItemSchema = z.object({
  id: z.string().min(1).max(80),
  name: text(120),
  subtitle: text(80),
  url: text(500),
  style: z.enum(partnerLooks),
});

export const sitePageSchema = z.object({
  colors: z.object({
    paper: hex,
    ink: hex,
    night: hex,
    accent: hex,
    muted: hex,
  }),
  nav: z.object({
    about: text(40),
    services: text(40),
    films: text(40),
    process: text(40),
    enquire: text(40),
  }),
  hero: z.object({
    kicker: text(120),
    title: text(80),
    subtitle: text(160),
    image: text(2000),
    video: text(500),
    logo: text(2000),
    logoVideo: text(500).default(""),
    filmsLabel: text(40),
    trialLabel: text(40),
    scroll: text(40),
    index: text(20),
  }),
  partners: z.object({
    heading: text(80),
    items: z.array(partnerItemSchema).max(40),
  }),
  about: z.object({
    kicker: text(120),
    heading: text(120),
    emphasis: text(120),
    copy: text(2000),
    image: text(2000),
    video: text(500).default(""),
    caption: text(160),
  }),
  services: z.object({
    kicker: text(120),
    index: text(40),
    heading: text(120),
    items: z.array(z.object({ title: text(80), detail: text(400), image: text(2000), video: text(500).default("") })).min(1).max(8),
  }),
  process: z.object({
    kicker: text(120),
    index: text(40),
    heading: text(120),
    emphasis: text(120),
    steps: z.array(z.object({ number: text(12), title: text(80), detail: text(400) })).min(1).max(6),
  }),
  films: z.object({
    kicker: text(120),
    index: text(40),
    heading: text(120),
    emphasis: text(120),
    intro: text(400),
    link: text(40),
    items: z.array(z.object({
      id: z.string().min(1).max(80),
      title: text(120),
      category: text(80),
      image: text(2000),
      video: text(500),
    })).max(12),
  }),
  quote: z.object({
    text: text(240),
    credit: text(120),
  }),
  trial: z.object({
    kicker: text(120),
    index: text(40),
    script: text(120),
    heading: text(120),
    copy: text(600),
    button: text(40),
  }),
  contact: z.object({
    kicker: text(80),
    heading: text(80),
    emphasis: text(80),
    footnote: text(240),
    success: text(80),
    successEmphasis: text(80),
  }),
  footer: z.object({
    name: text(80),
    tagline: text(120),
    enquire: text(40),
  }),
});

export type SitePage = z.infer<typeof sitePageSchema>;

export function defaultSitePage(): SitePage {
  return {
    colors: {
      paper: "#f7f4ee",
      ink: "#5c4a3e",
      night: "#3f342c",
      accent: "#c6a36a",
      muted: "#8f7d70",
    },
    nav: { about: "About", services: "Services", films: "Films", process: "Process", enquire: "Enquire" },
    hero: {
      kicker: "Wedding post-production for filmmakers",
      title: "Mela Motion Films",
      subtitle: "The edit room behind your studio.",
      image: "",
      video: "https://youtu.be/u16sn-tIvQw",
      logo: "",
      logoVideo: "",
      filmsLabel: "View our films",
      trialLabel: "Start a trial edit",
      scroll: "Scroll to explore",
      index: "01 — 04",
    },
    partners: {
      heading: "(Worked With)",
      items: [
        { id: "partner-wedding-weekender", name: "Wedding\nWeekender", subtitle: "", url: "", style: "stacked" },
        { id: "partner-marked-by-grace", name: "Marked by Grace", subtitle: "PRODUCTIONS", url: "", style: "tracked" },
        { id: "partner-filmed-by", name: "FILMED BY __", subtitle: "", url: "", style: "sans" },
        { id: "partner-she-said-yes", name: "SheSaidYes", subtitle: "Photography", url: "", style: "italic" },
      ],
    },
    about: {
      kicker: "An edit room built around your studio",
      heading: "You shoot the day.",
      emphasis: "We shape the film.",
      copy: "Mela Motion Films is the post-production team for wedding videographers. Send your footage and a short brief, and we return films that match your style, checked and ready to deliver to your couples.",
      image: "",
      video: "",
      caption: "For the moments that stay with you.",
    },
    services: {
      kicker: "Made for the full story",
      index: "01 / What we edit",
      heading: "What we edit",
      items: [
        { title: "Highlight films", detail: "Story-led films cut to licensed music and graded to your look.", image: "", video: "" },
        { title: "Teasers & reels", detail: "Short cuts made to post within days of the wedding.", image: "", video: "" },
        { title: "Ceremony & speeches", detail: "Multicam edits with clean, even audio throughout.", image: "", video: "" },
        { title: "Commercial & property", detail: "Brand, event and real estate edits for your other clients.", image: "", video: "" },
      ],
    },
    process: {
      kicker: "A considered workflow",
      index: "02 / Our process",
      heading: "From your footage",
      emphasis: "to their favourite film.",
      steps: [
        { number: "i", title: "Send the footage", detail: "Share a folder and a short brief with your references and must-have moments." },
        { number: "ii", title: "We edit and check", detail: "A dedicated editor builds the film, then audio, colour and names are checked." },
        { number: "iii", title: "Review and deliver", detail: "Get a preview link, send one round of notes, then receive final files under your brand." },
      ],
    },
    films: {
      kicker: "Selected work",
      index: "03 / Films we've edited",
      heading: "Films we've",
      emphasis: "edited.",
      intro: "Wedding stories, shaped with care and finished to feel like yours.",
      link: "Watch all films",
      items: [
        { id: "film-teaser", title: "Teaser", category: "Teaser", image: "", video: "https://youtu.be/wbTlIFUjwRo" },
        { id: "film-highlight", title: "Highlight", category: "Highlight", image: "", video: "https://youtu.be/Xtxfg2nPJ6Y" },
        { id: "film-feature", title: "Feature film", category: "Feature film", image: "", video: "https://youtu.be/9Wk2ot_A04U" },
      ],
    },
    quote: {
      text: "A little more room\nto make the work you love.",
      credit: "The edit room behind your studio",
    },
    trial: {
      kicker: "Your next story starts here",
      index: "04 / Let's cut your story",
      script: "Let's cut your story.",
      heading: "Try us on\none wedding.",
      copy: "Send one highlight to edit. If it feels like your work, we set up your standing workflow.",
      button: "Start a trial edit",
    },
    contact: {
      kicker: "A good place to begin",
      heading: "Tell us a little",
      emphasis: "about your film.",
      footnote: "Your message stays private and is only shared with our team.",
      success: "Thank you.",
      successEmphasis: "We'll be in touch.",
    },
    footer: {
      name: "Mela Motion Films",
      tagline: "Wedding post-production for filmmakers",
      enquire: "Make an enquiry",
    },
  };
}

export function mergeSitePage(input: unknown): SitePage {
  const base = defaultSitePage();
  if (!input || typeof input !== "object") return base;
  const raw = input as Partial<SitePage>;
  const candidate = {
    ...base,
    ...raw,
    colors: { ...base.colors, ...raw.colors },
    nav: { ...base.nav, ...raw.nav },
    hero: { ...base.hero, ...raw.hero },
    partners: {
      ...base.partners,
      ...raw.partners,
      items: Array.isArray(raw.partners?.items) ? normalizePartners(raw.partners.items) : base.partners.items,
    },
    about: { ...base.about, ...raw.about },
    services: {
      ...base.services,
      ...raw.services,
      items: raw.services?.items?.length
        ? raw.services.items.map((item) => ({ ...item, video: item.video || "" }))
        : base.services.items,
    },
    process: {
      ...base.process,
      ...raw.process,
      steps: raw.process?.steps?.length ? raw.process.steps : base.process.steps,
    },
    films: {
      ...base.films,
      ...raw.films,
      items: raw.films?.items?.length ? raw.films.items : base.films.items,
    },
    quote: { ...base.quote, ...raw.quote },
    trial: { ...base.trial, ...raw.trial },
    contact: { ...base.contact, ...raw.contact },
    footer: { ...base.footer, ...raw.footer },
  };
  const parsed = sitePageSchema.safeParse(candidate);
  return parsed.success ? parsed.data : base;
}

function normalizePartners(items: unknown[]): SitePage["partners"]["items"] {
  return items.slice(0, 40).map((item, index) => {
    const raw = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const styleValue = raw["style"];
    const idValue = raw["id"];
    const nameValue = raw["name"];
    const subtitleValue = raw["subtitle"];
    const urlValue = raw["url"];
    const style = partnerLooks.includes(styleValue as PartnerLook) ? styleValue as PartnerLook : partnerLooks[index % partnerLooks.length] ?? "stacked";
    return {
      id: typeof idValue === "string" && idValue.trim() ? idValue.trim().slice(0, 80) : `partner-${index + 1}`,
      name: typeof nameValue === "string" ? nameValue.slice(0, 120) : "",
      subtitle: typeof subtitleValue === "string" ? subtitleValue.slice(0, 80) : "",
      url: typeof urlValue === "string" ? urlValue.slice(0, 500) : "",
      style,
    };
  });
}

export function youtubeId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    else if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/live/")) {
        id = url.pathname.split("/").filter(Boolean)[1] ?? "";
      } else id = url.searchParams.get("v") ?? "";
    }
    return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : "";
  } catch {
    return "";
  }
}

export function youtubeEmbed(value: string, sound: boolean) {
  const id = youtubeId(value);
  if (!id) return "";
  const params = new URLSearchParams({
    autoplay: "1",
    mute: sound ? "0" : "1",
    loop: "1",
    playlist: id,
    controls: sound ? "1" : "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    fs: sound ? "1" : "0",
    disablekb: sound ? "0" : "1",
    iv_load_policy: "3",
    cc_load_policy: "0",
    enablejsapi: "1",
    vq: "hd1080",
    hd: "1",
    autohide: "1",
    showinfo: "0",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

const videoFiles = [".mp4", ".webm", ".ogg", ".ogv", ".mov", ".m4v"];

export function publicVideoLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed || youtubeId(trimmed)) return "";
  return isSafeHttpsUrl(trimmed, videoFiles);
}

export function savedVideoLink(value: string) {
  const trimmed = value.trim();
  if (youtubeId(trimmed)) return trimmed;
  return publicVideoLink(trimmed);
}

export function youtubePoster(value: string) {
  const id = youtubeId(value);
  return id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : "";
}

export function safeColor(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

export function publicImageLink(value: string) {
  return isSafeHttpsUrl(value);
}

export function publicPartnerUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const upgraded = trimmed.replace(/^http:\/\//i, "https://");
  const withProtocol = /^https:\/\//i.test(upgraded) ? upgraded : `https://${upgraded}`;
  return isSafeHttpsUrl(withProtocol);
}
