export const ENQUIRY_MEDIA_MAX_BYTES = 15 * 1024 * 1024;
export const ENQUIRY_MEDIA_TOTAL_BYTES = 22 * 1024 * 1024;
export const ENQUIRY_MEDIA_MAX_FILES = 8;
export const ENQUIRY_MEDIA_TOO_BIG = "Each file needs to stay under 15 MB.";
export const ENQUIRY_MEDIA_TOTAL = "Please keep all files under 22 MB together so the email can send them.";
export const ENQUIRY_MEDIA_TOO_MANY = "Please attach 8 files or fewer.";
export const ENQUIRY_MEDIA_TYPE = "Use a photo, video, PDF, Word, PowerPoint, Excel, text, or zip file.";
export const ENQUIRY_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.rtf,.zip";

export type EnquiryFileKind = "image" | "video" | "document";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const documentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/rtf",
  "application/zip",
  "application/x-zip-compressed",
]);

const byExtension: Record<string, { type: string; kind: EnquiryFileKind }> = {
  jpg: { type: "image/jpeg", kind: "image" },
  jpeg: { type: "image/jpeg", kind: "image" },
  png: { type: "image/png", kind: "image" },
  webp: { type: "image/webp", kind: "image" },
  gif: { type: "image/gif", kind: "image" },
  mp4: { type: "video/mp4", kind: "video" },
  webm: { type: "video/webm", kind: "video" },
  mov: { type: "video/quicktime", kind: "video" },
  pdf: { type: "application/pdf", kind: "document" },
  doc: { type: "application/msword", kind: "document" },
  docx: { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", kind: "document" },
  ppt: { type: "application/vnd.ms-powerpoint", kind: "document" },
  pptx: { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", kind: "document" },
  xls: { type: "application/vnd.ms-excel", kind: "document" },
  xlsx: { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", kind: "document" },
  txt: { type: "text/plain", kind: "document" },
  csv: { type: "text/csv", kind: "document" },
  rtf: { type: "application/rtf", kind: "document" },
  zip: { type: "application/zip", kind: "document" },
};

const extensionForType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/rtf": "rtf",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

const dangerousExtensions = new Set([
  "html",
  "htm",
  "svg",
  "svgz",
  "js",
  "mjs",
  "cjs",
  "xml",
  "xhtml",
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

function dangerousName(name: string) {
  const base = (name.split(/[/\\]/).pop() ?? "").toLowerCase();
  if (!base || base === "." || base === ".." || base.includes("\0")) return true;
  return base.split(".").some((part) => dangerousExtensions.has(part));
}

export function extensionForEnquiryType(type: string) {
  return extensionForType[type] ?? "";
}

export function describeEnquiryMedia(file: { name: string; type: string; size: number }) {
  if (file.size <= 0) return { ok: false as const, error: "That file is empty. Please choose another one." };
  if (file.size > ENQUIRY_MEDIA_MAX_BYTES) return { ok: false as const, error: ENQUIRY_MEDIA_TOO_BIG };
  if (dangerousName(file.name)) return { ok: false as const, error: ENQUIRY_MEDIA_TYPE };

  const base = file.name.split(/[/\\]/).pop() ?? "";
  const extension = base.includes(".") ? (base.split(".").pop()?.toLowerCase() ?? "") : "";
  const fromExtension = extension ? byExtension[extension] : undefined;
  let kind: EnquiryFileKind | null = null;
  let type = file.type;

  if (imageTypes.has(file.type)) kind = "image";
  else if (videoTypes.has(file.type)) kind = "video";
  else if (documentTypes.has(file.type)) kind = "document";
  else if (fromExtension) {
    kind = fromExtension.kind;
    type = fromExtension.type;
  }

  if (!kind) return { ok: false as const, error: ENQUIRY_MEDIA_TYPE };
  if (fromExtension && file.type && fromExtension.type !== file.type) return { ok: false as const, error: ENQUIRY_MEDIA_TYPE };
  if (fromExtension) type = fromExtension.type;
  return { ok: true as const, kind, type };
}

export function enquiryMediaType(name: string, kind: EnquiryFileKind | null) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return byExtension[extension]?.type ?? (kind === "video" ? "video/mp4" : kind === "document" ? "application/octet-stream" : "image/jpeg");
}
