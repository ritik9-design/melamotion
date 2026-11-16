import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describeEnquiryMedia, ENQUIRY_MEDIA_TYPE, enquiryMediaType, extensionForEnquiryType } from "@/lib/enquiry-media";
import { fileMatchesDeclaredType } from "@/lib/file-signatures";
import { mergeSitePage, publicImageLink, savedVideoLink, sitePageSchema, type SitePage } from "@/lib/site-content";
import { isSafeHttpsUrl } from "@/lib/site-urls";
import type { Inquiry, InquiryAttachment, Project, ProjectInput, PublicFilm, StudioData, StudioSettings } from "@/lib/studio-types";

const dataFile = path.join(process.cwd(), "data", "studio.json");
const enquiriesFile = path.join(process.cwd(), "data", "enquiries.json");
const uploadsDir = path.join(process.cwd(), "public", "uploads");
const privateUploadsDir = path.join(process.cwd(), "data", "private-uploads");
const enquiryInboxLimit = 300;

let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>) {
  const run = queue.then(task, task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStudio(): Promise<StudioData> {
  let parsed: Partial<StudioData> = {};
  try {
    const raw = await readFile(dataFile, "utf8");
    parsed = JSON.parse(raw) as Partial<StudioData>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return {
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    inquiries: await readEnquiries(),
    settings: {
      contact_email: parsed.settings?.contact_email ?? "",
      instagram: parsed.settings?.instagram ?? "",
      upwork: parsed.settings?.upwork ?? "",
    },
    page: parsed.page,
  };
}

async function readEnquiries(): Promise<Inquiry[]> {
  let raw: string;
  try {
    raw = await readFile(enquiriesFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return migrateEnquiries();
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is Inquiry => Boolean(item) && typeof item === "object").map((item) => normalizeInquiry(item));
}

async function migrateEnquiries(): Promise<Inquiry[]> {
  let legacy: Inquiry[] = [];
  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<StudioData>;
    legacy = (Array.isArray(parsed.inquiries) ? parsed.inquiries : []).map(normalizeInquiry);
    if (Array.isArray(parsed.inquiries)) {
      const { inquiries: _inquiries, ...site } = parsed;
      await writeFile(dataFile, JSON.stringify(site, null, 2), "utf8");
    }
  } catch {
    legacy = [];
  }
  await writeEnquiries(legacy);
  return legacy;
}

async function writeEnquiries(inquiries: Inquiry[]) {
  await mkdir(path.dirname(enquiriesFile), { recursive: true });
  await writeFile(enquiriesFile, JSON.stringify(inquiries, null, 2), "utf8");
}

async function writeSite(data: StudioData) {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const { inquiries: _inquiries, ...site } = data;
  await writeFile(dataFile, JSON.stringify(site, null, 2), "utf8");
}

export function readPage() {
  return withLock(async () => {
    const data = await readStudio();
    return mergeSitePage(data.page);
  });
}

export function writePage(page: SitePage) {
  const problem = invalidMedia(page);
  if (problem) return Promise.resolve({ ok: false as const, error: problem });
  return withLock(async () => {
    const cleaned = cleanPage(page);
    const data = await readStudio();
    data.page = cleaned;
    await writeSite(data);
    return { ok: true as const, page: cleaned };
  });
}

function invalidMedia(page: SitePage) {
  const images = [page.hero.image, page.hero.logo, page.about.image, ...page.services.items.map((item) => item.image), ...page.films.items.map((item) => item.image)];
  if (images.some((value) => value.trim() && !publicImageLink(value))) return "Image links need to be public https addresses.";
  const videos = [page.hero.video, page.hero.logoVideo, page.about.video, ...page.services.items.map((item) => item.video), ...page.films.items.map((item) => item.video)];
  if (videos.some((value) => value.trim() && !savedVideoLink(value))) return "Video links need to be a YouTube address or a public https video file, such as an .mp4 link.";
  return "";
}

function cleanPage(page: SitePage): SitePage {
  const next = mergeSitePage(page);
  next.hero.image = publicImageLink(next.hero.image);
  next.hero.video = savedVideoLink(next.hero.video);
  next.hero.logo = publicImageLink(next.hero.logo);
  next.hero.logoVideo = savedVideoLink(next.hero.logoVideo);
  next.about.image = publicImageLink(next.about.image);
  next.about.video = savedVideoLink(next.about.video);
  next.services.items = next.services.items.map((item) => ({
    ...item,
    image: publicImageLink(item.image),
    video: savedVideoLink(item.video),
  }));
  next.films.items = next.films.items.map((item) => ({
    ...item,
    image: publicImageLink(item.image),
    video: savedVideoLink(item.video),
  }));
  return sitePageSchema.parse(next);
}

export function publishedFilms(): Promise<PublicFilm[]> {
  return withLock(async () => {
    const data = await readStudio();
    return data.projects
      .filter((project) => project.published)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(({ id, title, description, category, thumbnail_url, video_url }) => ({
        id,
        title,
        description,
        category,
        thumbnail_url,
        video_url,
      }));
  });
}

export function dashboard() {
  return withLock(async () => {
    const data = await readStudio();
    return {
      projects: [...data.projects].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      inquiries: [...data.inquiries].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100),
      settings: data.settings,
    };
  });
}

function safeMedia(value: string) {
  if (!value) return true;
  if (/^\/uploads\/[a-zA-Z0-9._-]{1,180}$/.test(value) && !value.split("/").pop()?.startsWith("enquiry-")) return true;
  return Boolean(isSafeHttpsUrl(value));
}

export function saveProject(input: ProjectInput) {
  return withLock(async () => {
    const title = input.title.trim();
    const description = input.description.trim();
    const thumbnail = input.thumbnail_url.trim();
    const video = input.video_url.trim();
    if (title.length < 1 || title.length > 160 || description.length > 1000 || !safeMedia(thumbnail) || !safeMedia(video)) {
      return { ok: false as const, error: "Add a title under 160 characters and valid media links." };
    }
    const data = await readStudio();
    const existing = input.id ? data.projects.find((project) => project.id === input.id) : undefined;
    const project: Project = {
      id: existing?.id ?? crypto.randomUUID(),
      title,
      description,
      category: input.category.trim() || "Highlight films",
      thumbnail_url: thumbnail,
      video_url: video,
      featured: input.featured,
      published: input.published,
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    data.projects = existing
      ? data.projects.map((item) => (item.id === project.id ? project : item))
      : [project, ...data.projects];
    await writeSite(data);
    return { ok: true as const };
  });
}

export function removeProject(id: string) {
  return withLock(async () => {
    const data = await readStudio();
    const project = data.projects.find((item) => item.id === id);
    data.projects = data.projects.filter((item) => item.id !== id);
    await writeSite(data);
    if (project) await removeUpload(project.thumbnail_url, project.video_url);
    return { ok: true as const };
  });
}

function insideRoot(resolved: string, root: string) {
  const base = path.resolve(root);
  return resolved === base || resolved.startsWith(`${base}${path.sep}`);
}

function storedUploadPath(url: string) {
  let name = path.basename(url);
  try {
    name = decodeURIComponent(name);
  } catch {
    return "";
  }
  if (!/^[a-zA-Z0-9._-]{1,180}$/.test(name) || name.includes("..")) return "";
  if (url.startsWith("/studio/files/") && name.startsWith("enquiry-")) return path.join(privateUploadsDir, name);
  if (url.startsWith("/uploads/")) return path.join(uploadsDir, name);
  return "";
}

async function removeUpload(...urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      const filePath = storedUploadPath(url);
      if (!filePath) return;
      const resolved = path.resolve(filePath);
      if (!insideRoot(resolved, privateUploadsDir) && !insideRoot(resolved, uploadsDir)) return;
      await rm(resolved, { force: true });
    }),
  );
}

export function saveSettings(settings: StudioSettings) {
  return withLock(async () => {
    const contact = settings.contact_email.trim();
    const instagram = settings.instagram.trim();
    const upwork = settings.upwork.trim();
    const emailOk = contact === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const instagramOk = instagram === "" || Boolean(isSafeHttpsUrl(instagram));
    const upworkOk = upwork === "" || Boolean(isSafeHttpsUrl(upwork));
    if (!emailOk || !instagramOk || !upworkOk) {
      return { ok: false as const, error: "Use a valid email and public https links." };
    }
    const data = await readStudio();
    data.settings = {
      contact_email: contact,
      instagram: instagram ? isSafeHttpsUrl(instagram) : "",
      upwork: upwork ? isSafeHttpsUrl(upwork) : "",
    };
    await writeSite(data);
    return { ok: true as const };
  });
}

function allowedAttachmentUrl(url: string) {
  if (url.includes("..") || url.includes("\\") || url.includes("?")) return false;
  if (/^\/studio\/files\/enquiry-[a-zA-Z0-9-]{20,140}\.[a-z0-9]{2,8}$/.test(url)) return true;
  return /^\/uploads\/enquiry-[a-zA-Z0-9._-]{1,180}$/.test(url);
}

function asAttachment(entry: unknown): InquiryAttachment | null {
  if (!entry || typeof entry !== "object") return null;
  const file = entry as Partial<InquiryAttachment>;
  if (typeof file.url !== "string" || !allowedAttachmentUrl(file.url)) return null;
  const kind = file.kind === "video" || file.kind === "document" || file.kind === "image" ? file.kind : "document";
  return { url: file.url, name: typeof file.name === "string" && file.name ? file.name : "file", kind };
}

function normalizeInquiry(item: Inquiry): Inquiry {
  const stored = Array.isArray(item.attachments) ? item.attachments : [];
  const attachments = stored.map(asAttachment).filter((file): file is InquiryAttachment => file !== null);
  if (!attachments.length && item.media_url) {
    const legacy = asAttachment({
      url: item.media_url,
      name: item.media_name,
      kind: item.media_kind === "video" || item.media_kind === "document" ? item.media_kind : "image",
    });
    if (legacy) attachments.push(legacy);
  }
  const first = attachments[0];
  return {
    ...item,
    attachments,
    media_url: first?.url ?? null,
    media_name: first?.name ?? null,
    media_kind: first?.kind ?? null,
    emailed: item.emailed === true,
  };
}

export function addInquiry(input: {
  submission_key: string;
  name: string;
  email: string;
  project_type: string;
  budget?: string | undefined;
  message: string;
  attachments: InquiryAttachment[];
}) {
  return withLock(async () => {
    const data = await readStudio();
    const existing = data.inquiries.find((item) => item.submission_key === input.submission_key);
    if (existing) return { ok: true as const, inquiry: existing, duplicate: true as const };
    if (data.inquiries.length >= enquiryInboxLimit) {
      return { ok: false as const, error: "The studio can't take another enquiry right now. Please try again later." };
    }
    const first = input.attachments[0];
    const inquiry: Inquiry = {
      id: crypto.randomUUID(),
      submission_key: input.submission_key,
      name: input.name,
      email: input.email,
      project_type: input.project_type,
      budget: input.budget?.trim() ? input.budget.trim() : null,
      message: input.message,
      status: "new",
      created_at: new Date().toISOString(),
      attachments: input.attachments,
      media_url: first?.url ?? null,
      media_name: first?.name ?? null,
      media_kind: first?.kind ?? null,
      emailed: false,
    };
    data.inquiries.unshift(inquiry);
    await writeEnquiries(data.inquiries);
    return { ok: true as const, inquiry, duplicate: false as const };
  });
}

export function replaceInquiryAttachments(id: string, attachments: InquiryAttachment[]) {
  return withLock(async () => {
    const data = await readStudio();
    const inquiry = data.inquiries.find((item) => item.id === id);
    if (!inquiry) return null;
    const previous = inquiry.attachments.map((file) => file.url);
    const first = attachments[0];
    inquiry.attachments = attachments;
    inquiry.media_url = first?.url ?? null;
    inquiry.media_name = first?.name ?? null;
    inquiry.media_kind = first?.kind ?? null;
    await writeEnquiries(data.inquiries);
    const kept = new Set(attachments.map((file) => file.url));
    await removeUpload(...previous.filter((url) => !kept.has(url)));
    return inquiry;
  });
}

export function markInquiryEmailed(inquiry: Inquiry) {
  return withLock(async () => {
    const inquiries = await readEnquiries();
    const index = inquiries.findIndex((item) => item.id === inquiry.id || item.submission_key === inquiry.submission_key);
    const saved = { ...inquiry, emailed: true };
    if (index >= 0) inquiries[index] = { ...inquiries[index], ...saved, emailed: true };
    else inquiries.unshift(saved);
    await writeEnquiries(inquiries);
  });
}

const inquiryStatuses = new Set(["new", "read", "replied"]);

export function setInquiryStatus(id: string, status: string) {
  return withLock(async () => {
    if (!inquiryStatuses.has(status)) return { ok: false as const, error: "The enquiry could not be updated." };
    const data = await readStudio();
    const inquiry = data.inquiries.find((item) => item.id === id);
    if (!inquiry) return { ok: false as const, error: "The enquiry could not be updated." };
    inquiry.status = status;
    await writeEnquiries(data.inquiries);
    return { ok: true as const };
  });
}

export function removeInquiry(id: string) {
  return withLock(async () => {
    const data = await readStudio();
    const removed = data.inquiries.find((item) => item.id === id);
    data.inquiries = data.inquiries.filter((item) => item.id !== id);
    await writeEnquiries(data.inquiries);
    if (removed) await removeUpload(...enquiryFiles(removed));
    return { ok: true as const };
  });
}

function enquiryFiles(item: Inquiry) {
  const urls = new Set(item.attachments.map((file) => file.url));
  if (item.media_url) urls.add(item.media_url);
  return [...urls];
}

export function clearInquiries() {
  return withLock(async () => {
    const data = await readStudio();
    const urls = data.inquiries.flatMap(enquiryFiles);
    await writeEnquiries([]);
    await removeUpload(...urls);
    return { ok: true as const };
  });
}

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const studioExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
const uploadRejected = { ok: false as const, error: "A media file could not be uploaded. Please check the file size and try again." };

export async function saveUpload(file: File, projectId: string, kind: string) {
  const isImage = kind === "thumbnail";
  const isVideo = kind === "film";
  const maxBytes = isImage ? 15 * 1024 * 1024 : 2 * 1024 * 1024 * 1024;
  const allowed = isImage ? imageTypes : isVideo ? videoTypes : null;
  const extension = studioExtensions[file.type] ?? "";
  if (!allowed || !allowed.has(file.type) || !extension || file.size > maxBytes || !/^[a-zA-Z0-9-]{8,80}$/.test(projectId)) {
    return uploadRejected;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!fileMatchesDeclaredType(bytes, file.type)) return uploadRejected;
  const filename = `${projectId}-${kind}-${Date.now()}.${extension}`;
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), bytes);
  return { ok: true as const, path: `/uploads/${filename}` };
}

export async function saveInquiryMedia(file: File, id: string) {
  const described = describeEnquiryMedia({ name: file.name, type: file.type, size: file.size });
  if (!described.ok) return described;
  const extension = extensionForEnquiryType(described.type);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!extension || !fileMatchesDeclaredType(bytes, described.type)) {
    return { ok: false as const, error: ENQUIRY_MEDIA_TYPE };
  }
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 40) || "enquiry";
  const filename = `enquiry-${safeId}-${crypto.randomUUID()}.${extension}`;
  await mkdir(privateUploadsDir, { recursive: true });
  await writeFile(path.join(privateUploadsDir, filename), bytes);
  return {
    ok: true as const,
    path: `/studio/files/${filename}`,
    name: file.name.replace(/[\r\n"]/g, "").slice(0, 180) || `file.${extension}`,
    kind: described.kind,
  };
}

export async function readInquiryFiles(files: InquiryAttachment[]) {
  const attachments = [];
  for (const file of files) {
    const read = await readInquiryMedia(file.url, file.name, file.kind);
    if (read) attachments.push(read);
  }
  return attachments;
}

export async function readInquiryMedia(url: string | null, name: string | null, kind: "image" | "video" | "document" | null) {
  const filePath = url ? storedUploadPath(url) : "";
  if (!filePath) return null;
  const resolved = path.resolve(filePath);
  if (!insideRoot(resolved, privateUploadsDir) && !insideRoot(resolved, uploadsDir)) return null;
  try {
    const filename = (name || path.basename(resolved)).replace(/[\r\n"]/g, "").slice(0, 180);
    const content = await readFile(resolved);
    return { filename, content, contentType: enquiryMediaType(path.basename(resolved), kind) };
  } catch {
    return null;
  }
}

const privateEnquiryName = /^enquiry-[a-zA-Z0-9-]{20,140}\.[a-z0-9]{2,8}$/;

export async function readPrivateEnquiryFile(pathname: string) {
  if (!pathname.startsWith("/studio/files/")) return null;
  let name = pathname.slice("/studio/files/".length);
  try {
    name = decodeURIComponent(name);
  } catch {
    return null;
  }
  if (!privateEnquiryName.test(name) || name !== path.basename(name)) return null;
  const resolved = path.resolve(privateUploadsDir, name);
  if (!insideRoot(resolved, privateUploadsDir)) return null;
  try {
    return { name, content: await readFile(resolved) };
  } catch {
    return null;
  }
}

export function discardInquiryUpload(url: string) {
  return removeUpload(url);
}
