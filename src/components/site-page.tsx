import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowRight, ArrowUpRight, FileText, ImagePlus, Menu, Play, Plus, X } from "lucide-react";
import garden from "@/assets/garden-wedding.jpg";
import vows from "@/assets/vineyard-vows.jpg";
import coast from "@/assets/coastal-wedding.jpg";
import dance from "@/assets/candlelit-wedding.jpg";
import { Button } from "@/components/ui/button";
import { describeEnquiryMedia, ENQUIRY_MEDIA_ACCEPT, ENQUIRY_MEDIA_MAX_FILES, ENQUIRY_MEDIA_TOO_MANY, ENQUIRY_MEDIA_TOTAL, ENQUIRY_MEDIA_TOTAL_BYTES, type EnquiryFileKind } from "@/lib/enquiry-media";
import { inquirySchema } from "@/lib/inquiry-validation";
import { defaultSitePage, partnerLooks, publicVideoLink, safeColor, youtubeEmbed, youtubePoster, type PartnerLook, type SitePage } from "@/lib/site-content";
import { pathForSection, sectionHref, type PublicSection } from "@/lib/site-urls";
import { submitInquiry } from "@/lib/studio.functions";

const serviceFallbacks = [garden, vows, coast, dance];
const filmFallbacks = [garden, vows, coast];

type Props = {
  content: SitePage;
  section?: PublicSection;
  editing?: boolean;
  onChange?: (content: SitePage) => void;
};

export function SitePage({ content, section = "home", editing = false, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filmId, setFilmId] = useState<string | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const page = useRef<HTMLElement>(null);
  const patch = (next: SitePage) => onChange?.(next);
  const film = content.films.items.find((item) => item.id === filmId) ?? null;

  useEffect(() => {
    const root = page.current;
    if (!root || editing) return;
    const nodes = [...root.querySelectorAll(".reveal")];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      nodes.forEach((node) => node.classList.add("is-shown"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-shown");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0, rootMargin: "0px 0px -48px 0px" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [editing]);

  useEffect(() => {
    if (!contactOpen && !filmId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContactOpen(false);
        setFilmId(null);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [contactOpen, filmId]);

  const colors = content.colors;
  const theme = `:root{--hero-paper:${safeColor(colors.paper, "#f7f4ee")};--background:${safeColor(colors.paper, "#f7f4ee")};--hero-ink:${safeColor(colors.ink, "#5c4a3e")};--foreground:${safeColor(colors.ink, "#5c4a3e")};--hero-night:${safeColor(colors.night, "#3f342c")};--hero-deep:${safeColor(colors.night, "#3f342c")};--primary:${safeColor(colors.night, "#3f342c")};--hero-muted:${safeColor(colors.muted, "#8f7d70")};--site-accent:${safeColor(colors.accent, "#c6a36a")}}`;

  useEffect(() => {
    if (editing || section !== "home") return;
    const id = window.location.hash.replace(/^#/, "");
    const path = pathForSection(id);
    if (!path || path === "/") return;
    window.location.replace(path);
  }, [editing, section]);

  useEffect(() => {
    if (editing || section === "home") return;
    if (section === "contact") setContactOpen(true);
    const node = document.getElementById(section);
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [editing, section]);

  function openContact() {
    setMenuOpen(false);
    if (!editing) {
      window.location.assign(sectionHref.contact);
      return;
    }
    setContactOpen(true);
  }

  return (
    <main ref={page} className={editing ? "site-editing" : undefined}>
      <style>{theme}</style>
      <header className="site-header">
        <button className="menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">
          <a href={sectionHref.about} onMouseDown={(event) => editing && event.preventDefault()} onClick={(event) => { if (editing) event.preventDefault(); setMenuOpen(false); }}><Editable value={content.nav.about} editing={editing} onChange={(about) => patch({ ...content, nav: { ...content.nav, about } })} /></a>
          <a href={sectionHref.services} onMouseDown={(event) => editing && event.preventDefault()} onClick={(event) => { if (editing) event.preventDefault(); setMenuOpen(false); }}><Editable value={content.nav.services} editing={editing} onChange={(services) => patch({ ...content, nav: { ...content.nav, services } })} /></a>
          <a href={sectionHref.films} onMouseDown={(event) => editing && event.preventDefault()} onClick={(event) => { if (editing) event.preventDefault(); setMenuOpen(false); }}><Editable value={content.nav.films} editing={editing} onChange={(films) => patch({ ...content, nav: { ...content.nav, films } })} /></a>
          <a href={sectionHref.process} onMouseDown={(event) => editing && event.preventDefault()} onClick={(event) => { if (editing) event.preventDefault(); setMenuOpen(false); }}><Editable value={content.nav.process} editing={editing} onChange={(process) => patch({ ...content, nav: { ...content.nav, process } })} /></a>
          <a className="nav-enquire" href={sectionHref.contact} onClick={(event) => { if (editing) { event.preventDefault(); openContact(); } else setMenuOpen(false); }}><Editable value={content.nav.enquire} editing={editing} onChange={(enquire) => patch({ ...content, nav: { ...content.nav, enquire } })} /></a>
        </nav>
      </header>

      <section className="hero" id="home">
        <MediaSlot
          className="hero-media"
          image={content.hero.image}
          video={content.hero.video}
          fallback={garden}
          editing={editing}
          allowVideo
          label="Change photo or video"
          onChange={(image, video) => patch({ ...content, hero: { ...content.hero, image, video } })}
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p className="eyebrow hero-kicker"><Editable value={content.hero.kicker} editing={editing} onChange={(kicker) => patch({ ...content, hero: { ...content.hero, kicker } })} /></p>
          <div className="hero-mark">
            <MediaSlot
              className="hero-logo-slot"
              image={content.hero.logo}
              video={content.hero.logoVideo}
              fallback="/mela-motion-logo.png"
              editing={editing}
              allowVideo
              label="Change logo"
              onChange={(logo, logoVideo) => patch({ ...content, hero: { ...content.hero, logo, logoVideo } })}
            />
          </div>
          <h1 className="sr-only">{content.hero.title}</h1>
          <p className="hero-subtitle"><Editable value={content.hero.subtitle} editing={editing} onChange={(subtitle) => patch({ ...content, hero: { ...content.hero, subtitle } })} /></p>
          <div className="hero-actions">
            <Button className="button" variant="heroOutline" asChild><a href={sectionHref.films} onMouseDown={(event) => editing && event.preventDefault()} onClick={(event) => editing && event.preventDefault()}><Editable value={content.hero.filmsLabel} editing={editing} onChange={(filmsLabel) => patch({ ...content, hero: { ...content.hero, filmsLabel } })} /></a></Button>
            <Button className="button" variant="heroSolid" asChild><a href={sectionHref.contact} onClick={(event) => { if (editing) { event.preventDefault(); openContact(); } }}><Editable value={content.hero.trialLabel} editing={editing} onChange={(trialLabel) => patch({ ...content, hero: { ...content.hero, trialLabel } })} /></a></Button>
          </div>
        </div>
        <a className="scroll-cue" href={sectionHref.about} onMouseDown={(event) => editing && event.preventDefault()} onClick={(event) => editing && event.preventDefault()}><span><Editable value={content.hero.scroll} editing={editing} onChange={(scroll) => patch({ ...content, hero: { ...content.hero, scroll } })} /></span><ArrowDown size={15} /></a>
        <span className="hero-index"><Editable value={content.hero.index} editing={editing} onChange={(index) => patch({ ...content, hero: { ...content.hero, index } })} /></span>
      </section>

      <WorkedWithSection partners={content.partners} editing={editing} onChange={(partners) => patch({ ...content, partners })} />

      <section id="about" className="intro-section reveal">
        <p className="eyebrow section-kicker"><Editable value={content.about.kicker} editing={editing} onChange={(kicker) => patch({ ...content, about: { ...content.about, kicker } })} /></p>
        <h2 className="serif-heading"><Editable value={content.about.heading} editing={editing} onChange={(heading) => patch({ ...content, about: { ...content.about, heading } })} /><br /><em><Editable value={content.about.emphasis} editing={editing} onChange={(emphasis) => patch({ ...content, about: { ...content.about, emphasis } })} /></em></h2>
        <p className="intro-copy"><Editable value={content.about.copy} editing={editing} onChange={(copy) => patch({ ...content, about: { ...content.about, copy } })} /></p>
        <figure className="intro-image">
          <MediaSlot image={content.about.image} video={content.about.video} fallback={coast} editing={editing} allowVideo label="Change photo or video" onChange={(image, video) => patch({ ...content, about: { ...content.about, image, video } })} />
          <figcaption><Editable value={content.about.caption} editing={editing} onChange={(caption) => patch({ ...content, about: { ...content.about, caption } })} /></figcaption>
        </figure>
      </section>

      <section className="services-section reveal" id="services">
        <div className="section-topline"><p className="eyebrow"><Editable value={content.services.kicker} editing={editing} onChange={(kicker) => patch({ ...content, services: { ...content.services, kicker } })} /></p><span className="eyebrow"><Editable value={content.services.index} editing={editing} onChange={(index) => patch({ ...content, services: { ...content.services, index } })} /></span></div>
        <h2 className="serif-heading"><Editable value={content.services.heading} editing={editing} onChange={(heading) => patch({ ...content, services: { ...content.services, heading } })} /></h2>
        <div className="services-grid">
          {content.services.items.map((service, index) => (
            <article className="service-item" key={`${service.title}-${index}`}>
              <div className="service-image-wrap">
                <MediaSlot image={service.image} video={service.video} fallback={serviceFallbacks[index % serviceFallbacks.length] ?? garden} editing={editing} allowVideo label="Change photo or video" onChange={(image, video) => {
                  const items = content.services.items.map((item, itemIndex) => itemIndex === index ? { ...item, image, video } : item);
                  patch({ ...content, services: { ...content.services, items } });
                }} />
                <span className="service-number">0{index + 1}</span>
              </div>
              <h3><Editable value={service.title} editing={editing} onChange={(title) => {
                const items = content.services.items.map((item, itemIndex) => itemIndex === index ? { ...item, title } : item);
                patch({ ...content, services: { ...content.services, items } });
              }} /></h3>
              <p><Editable value={service.detail} editing={editing} onChange={(detail) => {
                const items = content.services.items.map((item, itemIndex) => itemIndex === index ? { ...item, detail } : item);
                patch({ ...content, services: { ...content.services, items } });
              }} /></p>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section reveal" id="process">
        <div className="section-topline"><p className="eyebrow"><Editable value={content.process.kicker} editing={editing} onChange={(kicker) => patch({ ...content, process: { ...content.process, kicker } })} /></p><span className="eyebrow"><Editable value={content.process.index} editing={editing} onChange={(index) => patch({ ...content, process: { ...content.process, index } })} /></span></div>
        <h2 className="serif-heading"><Editable value={content.process.heading} editing={editing} onChange={(heading) => patch({ ...content, process: { ...content.process, heading } })} /><br /><em><Editable value={content.process.emphasis} editing={editing} onChange={(emphasis) => patch({ ...content, process: { ...content.process, emphasis } })} /></em></h2>
        <div className="steps-grid">
          {content.process.steps.map((step, index) => (
            <article className="step-item" key={step.number + index}>
              <span className="step-number"><Editable value={step.number} editing={editing} onChange={(number) => updateStep(index, { number })} /></span>
              <span className="step-rule" />
              <h3><Editable value={step.title} editing={editing} onChange={(title) => updateStep(index, { title })} /></h3>
              <p><Editable value={step.detail} editing={editing} onChange={(detail) => updateStep(index, { detail })} /></p>
            </article>
          ))}
        </div>
      </section>

      <section className="films-section reveal" id="films">
        <div className="section-topline"><p className="eyebrow"><Editable value={content.films.kicker} editing={editing} onChange={(kicker) => patch({ ...content, films: { ...content.films, kicker } })} /></p><span className="eyebrow"><Editable value={content.films.index} editing={editing} onChange={(index) => patch({ ...content, films: { ...content.films, index } })} /></span></div>
        <div className="films-heading-row">
          <h2 className="serif-heading"><Editable value={content.films.heading} editing={editing} onChange={(heading) => patch({ ...content, films: { ...content.films, heading } })} /><br /><em><Editable value={content.films.emphasis} editing={editing} onChange={(emphasis) => patch({ ...content, films: { ...content.films, emphasis } })} /></em></h2>
          <p><Editable value={content.films.intro} editing={editing} onChange={(intro) => patch({ ...content, films: { ...content.films, intro } })} /></p>
        </div>
        <div className="films-grid">
          {content.films.items.map((item, index) => (
            <article className="film-item" key={item.id}>
              <div className="film-image-wrap" role="button" tabIndex={0} aria-label={`Play ${item.title}`} onClick={() => setFilmId(item.id)} onKeyDown={(event) => { if (event.key === "Enter") setFilmId(item.id); }}>
                <MediaSlot
                  image={item.image}
                  video={item.video}
                  fallback={filmFallbacks[index % filmFallbacks.length] ?? garden}
                  editing={editing}
                  allowVideo
                  label="Change photo or video"
                  onChange={(image, video) => updateFilm(item.id, { image, video })}
                />
                <span className="film-play"><Play size={16} fill="currentColor" /></span>
              </div>
              <span className="film-meta">
                <strong><Editable value={item.title} editing={editing} onChange={(title) => updateFilm(item.id, { title })} /></strong>
                <span><Editable value={item.category} editing={editing} onChange={(category) => updateFilm(item.id, { category })} /><ArrowUpRight size={14} /></span>
              </span>
              {editing && <button type="button" className="film-remove" onClick={() => patch({ ...content, films: { ...content.films, items: content.films.items.filter((filmItem) => filmItem.id !== item.id) } })}>Remove this film</button>}
            </article>
          ))}
        </div>
        {editing && content.films.items.length < 12 && <button type="button" className="add-film" onClick={() => patch({ ...content, films: { ...content.films, items: [...content.films.items, { id: crypto.randomUUID(), title: "New film", category: "Highlight film", image: "", video: "" }] } })}><Plus size={15} /> Add a film</button>}
        <a className="text-link" href={sectionHref.contact} onClick={(event) => { if (editing) { event.preventDefault(); openContact(); } }}><Editable value={content.films.link} editing={editing} onChange={(link) => patch({ ...content, films: { ...content.films, link } })} /> <ArrowRight size={15} /></a>
      </section>

      <section className="quote-section reveal">
        <span className="quote-mark">“</span>
        <p className="quote-text"><Editable value={content.quote.text} editing={editing} onChange={(text) => patch({ ...content, quote: { ...content.quote, text } })} /></p>
        <p className="eyebrow"><Editable value={content.quote.credit} editing={editing} onChange={(credit) => patch({ ...content, quote: { ...content.quote, credit } })} /></p>
      </section>

      <section className="trial-section reveal" id="contact">
        <div className="section-topline"><p className="eyebrow"><Editable value={content.trial.kicker} editing={editing} onChange={(kicker) => patch({ ...content, trial: { ...content.trial, kicker } })} /></p><span className="eyebrow"><Editable value={content.trial.index} editing={editing} onChange={(index) => patch({ ...content, trial: { ...content.trial, index } })} /></span></div>
        <p className="trial-script"><Editable value={content.trial.script} editing={editing} onChange={(script) => patch({ ...content, trial: { ...content.trial, script } })} /></p>
        <h2><Editable value={content.trial.heading} editing={editing} onChange={(heading) => patch({ ...content, trial: { ...content.trial, heading } })} /></h2>
        <p className="trial-copy"><Editable value={content.trial.copy} editing={editing} onChange={(copy) => patch({ ...content, trial: { ...content.trial, copy } })} /></p>
        <Button className="button" variant="heroSolid" asChild><a href={sectionHref.contact} onClick={(event) => { if (editing) { event.preventDefault(); openContact(); } }}><Editable value={content.trial.button} editing={editing} onChange={(button) => patch({ ...content, trial: { ...content.trial, button } })} /> <ArrowRight size={16} /></a></Button>
      </section>

      <footer className="site-footer reveal">
        <a href={sectionHref.home} className="footer-name"><Editable value={content.footer.name} editing={editing} onChange={(name) => patch({ ...content, footer: { ...content.footer, name } })} /></a>
        <span className="eyebrow"><Editable value={content.footer.tagline} editing={editing} onChange={(tagline) => patch({ ...content, footer: { ...content.footer, tagline } })} /></span>
        <a className="footer-enquire" href={sectionHref.contact} onClick={(event) => { if (editing) { event.preventDefault(); openContact(); } }}><Editable value={content.footer.enquire} editing={editing} onChange={(enquire) => patch({ ...content, footer: { ...content.footer, enquire } })} /> <ArrowUpRight size={15} /></a>
        <span className="footer-copy">© {new Date().getFullYear()} {content.footer.name}</span>
      </footer>

      {contactOpen && <ContactModal content={content} editing={editing} onChange={patch} onClose={() => setContactOpen(false)} />}
      {film && <FilmModal item={film} fallback={filmFallbacks[content.films.items.findIndex((entry) => entry.id === film.id) % filmFallbacks.length] ?? garden} onClose={() => setFilmId(null)} />}
    </main>
  );

  function updateStep(index: number, change: Partial<SitePage["process"]["steps"][number]>) {
    const steps = content.process.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...change } : step);
    patch({ ...content, process: { ...content.process, steps } });
  }

  function updateFilm(id: string, change: Partial<SitePage["films"]["items"][number]>) {
    const items = content.films.items.map((item) => item.id === id ? { ...item, ...change } : item);
    patch({ ...content, films: { ...content.films, items } });
  }
}

function Editable({ value, editing, onChange }: { value: string; editing: boolean; onChange: (value: string) => void }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current && ref.current.innerText !== value) ref.current.innerText = value;
  }, [value]);
  if (!editing) return <Lines text={value} />;
  return (
    <span
      ref={(node) => {
        ref.current = node;
        if (node && document.activeElement !== node && node.innerText !== value) node.innerText = value;
      }}
      className="is-editable"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      title="Click to edit"
      onMouseDown={(event) => {
        event.stopPropagation();
        const left = window.scrollX;
        const top = window.scrollY;
        const pin = () => window.scrollTo(left, top);
        requestAnimationFrame(pin);
        window.setTimeout(pin, 0);
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onBlur={(event) => onChange(event.currentTarget.innerText.replace(/\n+$/, ""))}
    />
  );
}

const partnerClass: Record<PartnerLook, string> = {
  stacked: "wedding-weekender",
  tracked: "marked-grace",
  sans: "filmed-by",
  italic: "she-said-yes",
};

const partnerLookLabel: Record<PartnerLook, string> = {
  stacked: "Two-line serif",
  tracked: "Serif + spaced line",
  sans: "Sans, spaced",
  italic: "Serif + italic line",
};

function WorkedWithSection({
  partners,
  editing,
  onChange,
}: {
  partners: SitePage["partners"];
  editing: boolean;
  onChange: (partners: SitePage["partners"]) => void;
}) {
  const items = editing ? partners.items : partners.items.filter((item) => item.name.trim());
  if (!editing && items.length === 0) return null;

  function update(id: string, change: Partial<SitePage["partners"]["items"][number]>) {
    onChange({ ...partners, items: partners.items.map((item) => item.id === id ? { ...item, ...change } : item) });
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= partners.items.length) return;
    const copy = [...partners.items];
    const [item] = copy.splice(index, 1);
    if (!item) return;
    copy.splice(next, 0, item);
    onChange({ ...partners, items: copy });
  }

  function add() {
    if (partners.items.length >= 40) return;
    const style = partnerLooks[partners.items.length % partnerLooks.length] ?? "stacked";
    onChange({
      ...partners,
      items: [...partners.items, { id: crypto.randomUUID(), name: "New company", subtitle: "", url: "", style }],
    });
  }

  return (
    <section className="worked-with-section reveal" aria-label={partners.heading || "Worked with"}>
      <h2 className="worked-with-heading">
        <Editable value={partners.heading} editing={editing} onChange={(heading) => onChange({ ...partners, heading })} />
      </h2>
      <div className="worked-with-container">
        {items.map((item, index) => {
          const subtitle = item.subtitle.trim();
          const mark = (
            <>
              <div className="partner-name">
                {editing ? <Editable value={item.name} editing onChange={(name) => update(item.id, { name })} /> : <Lines text={item.name} />}
              </div>
              {(subtitle || editing) && (
                <div className="partner-subtitle">
                  {editing ? <Editable value={item.subtitle} editing onChange={(nextSubtitle) => update(item.id, { subtitle: nextSubtitle })} /> : subtitle}
                </div>
              )}
            </>
          );
          return (
            <div className={`partner-item ${partnerClass[item.style]}`} key={item.id}>
              <div className="partner-mark">
                {!editing && item.url ? (
                  <a className="partner-link" href={item.url} target="_blank" rel="noopener noreferrer">{mark}</a>
                ) : (
                  <div className="partner-link">{mark}</div>
                )}
              </div>
              {editing && (
                <div className="partner-tools">
                  <label>
                    Look
                    <select aria-label={`Look for ${item.name || "company"}`} value={item.style} onChange={(event) => update(item.id, { style: event.target.value as PartnerLook })}>
                      {partnerLooks.map((look) => <option key={look} value={look}>{partnerLookLabel[look]}</option>)}
                    </select>
                  </label>
                  <label>
                    Link
                    <input aria-label={`Link for ${item.name || "company"}`} value={item.url} placeholder="https://their-site.com" onChange={(event) => update(item.id, { url: event.target.value })} />
                  </label>
                  <div className="partner-tool-row">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0}>Left</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === partners.items.length - 1}>Right</button>
                    <button type="button" onClick={() => onChange({ ...partners, items: partners.items.filter((entry) => entry.id !== item.id) })}>Remove</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {editing && partners.items.length < 40 && <button type="button" className="add-film" onClick={add}><Plus size={15} /> Add a company</button>}
      {editing && <p className="partner-hint">Press Enter inside a name for a second line. A link opens in a new tab when someone clicks that company. Press Save when the row looks right.</p>}
    </section>
  );
}

function Lines({ text }: { text: string }) {
  const lines = text.split("\n");
  return <>{lines.map((line, index) => <span key={`${index}-${line}`}>{index > 0 && <br />}{line}</span>)}</>;
}

function YoutubeFrame({
  embed,
  title,
  className,
  allow,
  allowFullScreen = false,
  background = false,
}: {
  embed: string;
  title: string;
  className: string;
  allow: string;
  allowFullScreen?: boolean;
  background?: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const playerId = useRef(Math.floor(Math.random() * 1_000_000_000) + 1);
  const [src, setSrc] = useState("");

  useEffect(() => {
    const url = new URL(embed);
    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("cc_load_policy", "0");
    url.searchParams.set("vq", "hd1080");
    url.searchParams.set("hd", "1");
    url.searchParams.set("origin", window.location.origin);
    setSrc(url.toString());
  }, [embed]);

  useEffect(() => {
    const node = frame.current;
    if (!node || !src) return;
    let qualityTries = 0;
    const post = (payload: object) => node.contentWindow?.postMessage(JSON.stringify(payload), "*");
    const command = (func: string, args: unknown[]) => post({ event: "command", func, args, id: playerId.current, channel: "widget" });
    const tune = () => {
      post({ event: "listening", id: playerId.current, channel: "widget" });
      command("setOption", ["captions", "track", {}]);
      command("unloadModule", ["captions"]);
      command("setPlaybackQualityRange", ["hd1080", "highres"]);
      command("setPlaybackQuality", ["highres"]);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== node.contentWindow || typeof event.data !== "string") return;
      let data: { event?: string; info?: { playbackQuality?: string } | number } = {};
      try {
        data = JSON.parse(event.data) as typeof data;
      } catch {
        return;
      }
      if (data.event === "onReady" || data.event === "initialDelivery" || (data.event === "onStateChange" && (data.info === 1 || data.info === 3))) tune();
      const quality = data.event === "infoDelivery" && data.info && typeof data.info === "object" ? data.info.playbackQuality ?? "" : "";
      if (["tiny", "small", "medium", "large"].includes(quality) && qualityTries < 6) {
        qualityTries += 1;
        tune();
      }
    };
    node.addEventListener("load", tune);
    window.addEventListener("message", onMessage);
    const timers = [700, 1800, 3500].map((delay) => window.setTimeout(tune, delay));
    return () => {
      node.removeEventListener("load", tune);
      window.removeEventListener("message", onMessage);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [src]);

  if (!src) return null;
  return <iframe ref={frame} className={className} src={src} title={title} allow={allow} allowFullScreen={allowFullScreen} tabIndex={background ? -1 : undefined} />;
}

function MediaSlot({
  image,
  video = "",
  fallback,
  editing,
  allowVideo = false,
  label,
  className,
  onChange,
}: {
  image: string;
  video?: string;
  fallback: string;
  editing: boolean;
  allowVideo?: boolean;
  label: string;
  className?: string;
  onChange: (image: string, video: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const embed = youtubeEmbed(video, false);
  const file = publicVideoLink(video);
  const src = image || youtubePoster(video) || fallback;
  return (
    <div className={className ? `media-slot ${className}` : "media-slot"}>
      <img src={src} alt="" onError={(event) => {
        const picture = event.currentTarget;
        if (picture.src.includes("maxresdefault")) {
          picture.src = picture.src.replace("maxresdefault", "hqdefault");
          return;
        }
        if (picture.dataset["fallback"] === "1" || !fallback) return;
        picture.dataset["fallback"] = "1";
        picture.src = fallback;
      }} />
      {embed && <YoutubeFrame embed={embed} title="" className="bg-video" allow="autoplay" background />}
      {file && <video className="file-video" src={file} autoPlay muted loop playsInline preload="auto" ref={(node) => { if (node) node.muted = true; }} />}
      {(embed || file) && <span className="video-shield" aria-hidden="true" />}
      {editing && <button type="button" className="media-change" onClick={(event) => { event.stopPropagation(); setOpen(true); }}>{label}</button>}
      {editing && open && typeof document !== "undefined" && createPortal(
        <div className="media-pop-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <form className="media-pop" role="dialog" aria-label={label} onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); setOpen(false); }}>
            <h3>{label}</h3>
            <label>Photo link<input value={image} onChange={(event) => onChange(event.target.value, video)} placeholder="Paste an https image link" /></label>
            {allowVideo && <label>Video link<input value={video} onChange={(event) => onChange(image, event.target.value)} placeholder="YouTube link or https://…/video.mp4" /></label>}
            <p>{allowVideo ? "Use a photo, a YouTube link, or a public video file such as an .mp4 link. The video plays by itself. Leave both blank to keep the original picture." : "Leave this blank to keep the original picture."} Press Save when it looks right.</p>
            <div className="media-pop-actions">
              <button type="button" onClick={() => { onChange("", ""); setOpen(false); }}>Use the original</button>
              <button type="submit">Done</button>
            </div>
          </form>
        </div>,
        document.body,
      )}
    </div>
  );
}

function FilmModal({ item, fallback, onClose }: { item: SitePage["films"]["items"][number]; fallback: string; onClose: () => void }) {
  const embed = youtubeEmbed(item.video, true);
  const file = publicVideoLink(item.video);
  return (
    <div className="film-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="film-modal" role="dialog" aria-modal="true" aria-label={item.title}>
        <button className="modal-close" aria-label="Close film" onClick={onClose}><X /></button>
        {embed ? <YoutubeFrame embed={embed} title={item.title} className="film-player" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /> : file ? <video className="film-player" src={file} autoPlay controls playsInline preload="auto" /> : <img className="film-player" src={item.image || youtubePoster(item.video) || fallback} alt="" onError={(event) => {
          const picture = event.currentTarget;
          if (picture.src.includes("maxresdefault")) picture.src = picture.src.replace("maxresdefault", "hqdefault");
        }} />}
        <div className="film-modal-copy"><p className="eyebrow">{item.category || "Selected film"}</p><h2 className="serif-heading">{item.title}</h2></div>
      </section>
    </div>
  );
}

type EnquiryPick = { id: string; file: File; kind: EnquiryFileKind; preview: string };

function fileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  const megabytes = size / (1024 * 1024);
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`;
}

function ContactModal({ content, editing, onChange, onClose }: { content: SitePage; editing: boolean; onChange?: (content: SitePage) => void; onClose: () => void }) {
  const submissionKey = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);
  const picksRef = useRef<EnquiryPick[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<EnquiryPick[]>([]);
  const [dragging, setDragging] = useState(false);
  const patch = (contact: SitePage["contact"]) => onChange?.({ ...content, contact });
  picksRef.current = files;

  useEffect(() => () => {
    for (const item of picksRef.current) if (item.preview) URL.revokeObjectURL(item.preview);
  }, []);

  function removeFile(id: string) {
    setFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return current.filter((item) => item.id !== id);
    });
  }

  function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    const accepted: EnquiryPick[] = [];
    let problem = "";
    let total = files.reduce((sum, item) => sum + item.file.size, 0);
    for (const file of incoming) {
      const described = describeEnquiryMedia({ name: file.name, type: file.type, size: file.size });
      if (!described.ok) { problem = `${file.name}: ${described.error}`; continue; }
      const duplicate = files.some((item) => item.file.name === file.name && item.file.size === file.size) || accepted.some((item) => item.file.name === file.name && item.file.size === file.size);
      if (duplicate) continue;
      if (files.length + accepted.length >= ENQUIRY_MEDIA_MAX_FILES) { problem = ENQUIRY_MEDIA_TOO_MANY; break; }
      if (total + file.size > ENQUIRY_MEDIA_TOTAL_BYTES) { problem = ENQUIRY_MEDIA_TOTAL; continue; }
      total += file.size;
      accepted.push({
        id: crypto.randomUUID(),
        file,
        kind: described.kind,
        preview: described.kind === "document" ? "" : URL.createObjectURL(file),
      });
    }
    if (accepted.length) setFiles((current) => [...current, ...accepted]);
    setError(problem);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fields = new FormData(event.currentTarget);
    if (String(fields.get("website") ?? "").trim()) { setSuccess(true); return; }
    const validated = inquirySchema.safeParse({
      name: String(fields.get("name") ?? "").trim(),
      email: String(fields.get("email") ?? "").trim(),
      project_type: String(fields.get("project_type") ?? ""),
      budget: String(fields.get("budget") ?? "").trim(),
      message: String(fields.get("message") ?? "").trim(),
    });
    if (!validated.success) { setError("Please check each field and try again."); return; }
    const total = files.reduce((sum, item) => sum + item.file.size, 0);
    if (total > ENQUIRY_MEDIA_TOTAL_BYTES) { setError(ENQUIRY_MEDIA_TOTAL); return; }
    for (const item of files) {
      const described = describeEnquiryMedia({ name: item.file.name, type: item.file.type, size: item.file.size });
      if (!described.ok) { setError(described.error); return; }
      fields.append("media", item.file);
    }
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
    fields.set("submission_key", submissionKey.current);
    setSubmitting(true);
    try {
      const result = await submitInquiry({ data: fields });
      if (result.ok) setSuccess(true);
      else setError(result.error);
    } catch {
      setError("Your enquiry couldn't be sent. Please try again, or email us directly.");
    }
    setSubmitting(false);
  }

  return (
    <div className="film-modal-backdrop contact-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-title">
        <button className="modal-close" aria-label="Close enquiry" onClick={onClose}><X /></button>
        {success ? (
          <div className="contact-success">
            <p className="eyebrow">Enquiry received</p>
            <h2 id="contact-title" className="serif-heading"><Editable value={content.contact.success} editing={editing} onChange={(successText) => patch({ ...content.contact, success: successText })} /><br /><em><Editable value={content.contact.successEmphasis} editing={editing} onChange={(successEmphasis) => patch({ ...content.contact, successEmphasis })} /></em></h2>
            <Button className="button" variant="heroDark" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <p className="eyebrow"><Editable value={content.contact.kicker} editing={editing} onChange={(kicker) => patch({ ...content.contact, kicker })} /></p>
            <h2 id="contact-title" className="serif-heading"><Editable value={content.contact.heading} editing={editing} onChange={(heading) => patch({ ...content.contact, heading })} /><br /><em><Editable value={content.contact.emphasis} editing={editing} onChange={(emphasis) => patch({ ...content.contact, emphasis })} /></em></h2>
            <span className="contact-rule" aria-hidden="true" />
            <form className="contact-form" onSubmit={submit}>
              <label><span className="field-name">Your name</span><input name="name" autoComplete="name" required maxLength={100} /></label>
              <label><span className="field-name">Email address</span><input name="email" type="email" autoComplete="email" required maxLength={255} /></label>
              <label>
                <span className="field-name">What are you looking for?</span>
                <select name="project_type" required defaultValue="">
                  <option value="" disabled>Select a film type</option>
                  <option>Highlight film</option>
                  <option>Teaser or reel</option>
                  <option>Ceremony or speeches</option>
                  <option>Commercial or property</option>
                  <option>Something else</option>
                </select>
              </label>
              <label><span className="field-name">Budget <span className="field-optional">(optional)</span></span><input name="budget" maxLength={100} placeholder="Your approximate budget" /></label>
              <label className="message-field"><span className="field-name">Tell us about it</span><textarea name="message" required maxLength={3000} rows={4} placeholder="Your studio, your style, the story…" /></label>
              <div className="media-field">
                <span className="field-name">Files <span className="field-optional">(optional)</span></span>
                <div
                  className={dragging ? "media-drop is-dragging" : "media-drop"}
                  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={(event) => {
                    const next = event.relatedTarget;
                    if (next instanceof Node && event.currentTarget.contains(next)) return;
                    setDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    addFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  <button type="button" className="media-pick" onClick={() => fileInput.current?.click()}>
                    <ImagePlus strokeWidth={1.25} aria-hidden="true" />
                    <strong>Add files</strong>
                    <em>Drop photos, videos, or documents here</em>
                  </button>
                  <input
                    ref={fileInput}
                    className="media-file-input"
                    type="file"
                    multiple
                    accept={ENQUIRY_MEDIA_ACCEPT}
                    tabIndex={-1}
                    aria-label="Add photos, videos, or documents"
                    onChange={(event) => {
                      addFiles(Array.from(event.target.files ?? []));
                      event.target.value = "";
                    }}
                  />
                </div>
                {files.length > 0 ? (
                  <ul className="media-list">
                    {files.map((item) => (
                      <li key={item.id}>
                        {item.kind === "video" ? <video className="media-thumb" src={item.preview} muted /> : item.kind === "image" ? <img className="media-thumb" src={item.preview} alt="" /> : <span className="media-doc"><FileText size={16} aria-hidden="true" />Doc</span>}
                        <span className="media-file-name">{item.file.name} · {fileSize(item.file.size)}</span>
                        <button type="button" className="media-clear" onClick={() => removeFile(item.id)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="media-file-name">Add as many photos, videos, PDFs, or Word files as you need. 22 MB total.</p>}
              </div>
              <label className="form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <Button className="button" type="submit" variant="heroDark" disabled={submitting}>{submitting ? "Sending…" : "Send enquiry"}<ArrowRight size={16} /></Button>
            </form>
            <p className="contact-footnote"><Editable value={content.contact.footnote} editing={editing} onChange={(footnote) => patch({ ...content.contact, footnote })} /></p>
          </>
        )}
      </section>
    </div>
  );
}

export function EditorDock({
  content,
  busy,
  notice,
  onChange,
  onSave,
  onEnquiries,
  onSignOut,
}: {
  content: SitePage;
  busy: boolean;
  notice: string;
  onChange: (content: SitePage) => void;
  onSave: () => void;
  onEnquiries: () => void;
  onSignOut: () => void;
}) {
  const [colorsOpen, setColorsOpen] = useState(false);
  const colors: Array<[keyof SitePage["colors"], string]> = [
    ["paper", "Background"],
    ["ink", "Text"],
    ["night", "Dark"],
    ["accent", "Gold"],
    ["muted", "Quiet text"],
  ];
  return (
    <div className="edit-dock">
      {colorsOpen && (
        <div className="edit-color-panel">
          <p>Pick a colour. It updates the whole page.</p>
          <label className="edit-title">Browser title<input value={content.hero.title} maxLength={80} onChange={(event) => onChange({ ...content, hero: { ...content.hero, title: event.target.value } })} /></label>
          <div className="edit-colors">
            {colors.map(([key, label]) => (
              <label key={key}>{label}<input type="color" aria-label={label} value={safeColor(content.colors[key], "#000000")} onChange={(event) => onChange({ ...content, colors: { ...content.colors, [key]: event.target.value } })} /></label>
            ))}
          </div>
          <button type="button" className="edit-color-reset" onClick={() => onChange({ ...content, colors: defaultSitePage().colors })}>Default colours</button>
        </div>
      )}
      <p>Click any words to rewrite them. Each picture has a Change button. Company names under the opening film can be added, restyled, and linked.</p>
      {notice && <p className="edit-notice">{notice}</p>}
      <div className="edit-dock-actions">
        <button type="button" onClick={() => setColorsOpen((open) => !open)}>{colorsOpen ? "Hide colours" : "Colours"}</button>
        <button type="button" onClick={onEnquiries}>Messages</button>
        <a href="/">See the live site</a>
        <button type="button" onClick={onSignOut}>Sign out</button>
        <button type="button" className="edit-save" onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

