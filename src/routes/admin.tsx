import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorDock, SitePage } from "@/components/site-page";
import { defaultSitePage, type SitePage as PageContent } from "@/lib/site-content";
import type { Inquiry } from "@/lib/studio-types";
import {
  clearStudioInquiries,
  deleteStudioInquiry,
  getDashboard,
  getSessionUser,
  getSitePage,
  saveSitePage,
  signInWithPassword,
  signOutStudio,
  updateStudioInquiry,
} from "@/lib/studio.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Studio — Mela Motion Films" },
      { name: "description", content: "Edit the Mela Motion Films website." },
    ],
  }),
  component: AdminPage,
});

function enquiryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminPage() {
  const [signedIn, setSignedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [content, setContent] = useState<PageContent>(defaultSitePage());
  const [notice, setNotice] = useState("");
  const [enquiriesOpen, setEnquiriesOpen] = useState(false);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiryVersion, setEnquiryVersion] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    void getSessionUser()
      .then((result) => setSignedIn(Boolean(result.email)))
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    void getSitePage().then(setContent).catch(() => setNotice("The page could not be loaded."));
  }, [signedIn]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");
    setBusy(true);
    const result = await signInWithPassword({ data: { email: email.trim(), password } });
    if (!result.ok) setAuthMessage(result.error);
    else setSignedIn(true);
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    setNotice("");
    try {
      const result = await saveSitePage({ data: content });
      if (!result.ok) setNotice(result.error);
      else {
        setContent(result.page);
        setNotice("Saved. The public site now uses these words, colours, and links.");
      }
    } catch {
      setNotice("The page could not be saved.");
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!enquiriesOpen) return;
    let stopped = false;
    const load = async () => {
      try {
        const data = await getDashboard();
        if (stopped) return;
        setInquiries(data.inquiries);
        setEnquiryError("");
      } catch {
        if (!stopped) setEnquiryError("Enquiries could not be loaded.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [enquiriesOpen, enquiryVersion]);

  function openEnquiries() {
    setConfirmClear(false);
    setEnquiriesOpen(true);
    setEnquiryVersion((version) => version + 1);
  }

  async function clearEnquiries() {
    setClearing(true);
    try {
      await clearStudioInquiries();
      setInquiries([]);
      setConfirmClear(false);
      setEnquiryVersion((version) => version + 1);
    } catch {
      setNotice("Enquiries could not be cleared.");
    }
    setClearing(false);
  }

  if (!authChecked) return <div className="admin-loading">Checking studio access…</div>;
  if (!signedIn) {
    return (
      <main className="admin-login">
        <a className="admin-back" href="/"><ArrowLeft size={15} /> Back to the films</a>
        <div className="admin-login-panel">
          <p className="eyebrow">Mela Motion Films</p>
          <h1 className="serif-heading">Studio<br /><em>sign in.</em></h1>
          <p>Sign in with the studio email and password from the env file. The editor is the same page visitors see.</p>
          <form onSubmit={signIn} className="admin-form">
            <label>Email address<input autoComplete="email" type="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <Button type="submit" variant="heroDark" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          {authMessage && <p className="admin-error" role="alert">{authMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <>
      <SitePage content={content} editing onChange={setContent} />
      <EditorDock content={content} busy={busy} notice={notice} onChange={setContent} onSave={() => void save()} onEnquiries={() => void openEnquiries()} onSignOut={() => void signOutStudio().then(() => setSignedIn(false))} />
      {enquiriesOpen && (
        <div className="film-modal-backdrop enquiry-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEnquiriesOpen(false); }}>
          <section className="contact-modal enquiry-panel" role="dialog" aria-modal="true" aria-label="Enquiries">
            <div className="enquiry-head">
              <div>
                <p className="eyebrow">Studio correspondence</p>
                <h2 className="enquiry-title">Enquiries</h2>
                <p className="enquiry-count">{inquiries.length === 0 ? "No messages yet" : `${inquiries.length} saved · ${inquiries.filter((item) => item.emailed).length} emailed`}</p>
              </div>
              <div className="enquiry-head-actions">
                {inquiries.length > 0 && !confirmClear && <button type="button" className="enquiry-clear" onClick={() => setConfirmClear(true)}>Clear all</button>}
                {confirmClear && (
                  <div className="enquiry-confirm">
                    <p>Remove every enquiry and its files?</p>
                    <button type="button" className="enquiry-clear danger" disabled={clearing} onClick={() => void clearEnquiries()}>{clearing ? "Clearing…" : "Clear"}</button>
                    <button type="button" className="enquiry-clear" onClick={() => setConfirmClear(false)}>Keep</button>
                  </div>
                )}
                <button className="modal-close" aria-label="Close enquiries" onClick={() => setEnquiriesOpen(false)}>×</button>
              </div>
            </div>
            {enquiryError && <p className="admin-error" role="alert">{enquiryError}</p>}
            {inquiries.length === 0 && !enquiryError && <p className="admin-empty">Enquiries stay in this list after the email is sent. They remain in the JSON file until you clear them.</p>}
            <div className="enquiry-list">
              {inquiries.map((item) => (
                <article className="enquiry-card" key={item.id}>
                  <div className="enquiry-card-top">
                    <div>
                      <h3>{item.name}</h3>
                      <a href={`mailto:${item.email}`}>{item.email}</a>
                    </div>
                    <div className="enquiry-card-meta">
                      <span className={`inquiry-status ${item.emailed ? "sent" : "saved"}`}>{item.emailed ? "Email sent" : "Saved"}</span>
                      <span className={`inquiry-status ${item.status}`}>{item.status}</span>
                      <time dateTime={item.created_at}>{enquiryDate(item.created_at)}</time>
                    </div>
                  </div>
                  <p className="enquiry-kind">{item.project_type}{item.budget ? ` · ${item.budget}` : ""}</p>
                  <p className="enquiry-copy">{item.message}</p>
                  {item.attachments.length > 0 && (
                    <div className="enquiry-files">
                      {item.attachments.map((file) => (
                        <a className="enquiry-file" key={file.url} href={file.url} target="_blank" rel="noreferrer">
                          {file.kind === "video" ? <video src={file.url} muted /> : file.kind === "image" ? <img src={file.url} alt="" /> : <span className="enquiry-doc">Doc</span>}
                          <span>{file.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="enquiry-card-actions">
                    <select aria-label={`Update status for ${item.name}`} value={item.status} onChange={(event) => void updateStudioInquiry({ data: { id: item.id, status: event.target.value as "new" | "read" | "replied" } }).then(() => setEnquiryVersion((version) => version + 1))}>
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                    <button className="admin-row-action danger" onClick={() => void deleteStudioInquiry({ data: { id: item.id } }).then(() => setEnquiryVersion((version) => version + 1))}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
