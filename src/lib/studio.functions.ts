import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ENQUIRY_MEDIA_MAX_FILES, ENQUIRY_MEDIA_TOO_MANY, ENQUIRY_MEDIA_TOTAL, ENQUIRY_MEDIA_TOTAL_BYTES } from "@/lib/enquiry-media";
import { inquirySchema } from "@/lib/inquiry-validation";
import { sitePageSchema, type SitePage } from "@/lib/site-content";
import { isSafeHttpsUrl } from "@/lib/site-urls";
import type { ProjectInput, StudioSettings } from "@/lib/studio-types";

const projectInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  thumbnail_url: z.string(),
  video_url: z.string(),
  featured: z.boolean(),
  published: z.boolean(),
});

const optionalHttps = z.string().max(500).refine((value) => value.trim() === "" || isSafeHttpsUrl(value.trim()) !== "");
const optionalEmail = z.string().max(255).refine((value) => value.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));

const settingsInput = z.object({
  contact_email: optionalEmail,
  instagram: optionalHttps,
  upwork: optionalHttps,
});

export const getSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { currentUser } = await import("@/server/auth.server");
  return { email: await currentUser() };
});

export const signInWithPassword = createServerFn({ method: "POST" })
  .validator((data: { email: string; password: string }) => ({
    email: String(data.email ?? "").slice(0, 255),
    password: String(data.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { login } = await import("@/server/auth.server");
    return login(data.email, data.password);
  });

export const signOutStudio = createServerFn({ method: "POST" }).handler(async () => {
  const { logout } = await import("@/server/auth.server");
  await logout();
  return { ok: true };
});

export const getSitePage = createServerFn({ method: "GET" }).handler(async () => {
  const { readPage } = await import("@/server/store.server");
  return readPage();
});

export const saveSitePage = createServerFn({ method: "POST" })
  .validator((data: SitePage) => sitePageSchema.parse(data))
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { writePage } = await import("@/server/store.server");
      return writePage(data);
    });
  });

export const listPublishedFilms = createServerFn({ method: "GET" }).handler(async () => {
  const { publishedFilms } = await import("@/server/store.server");
  return publishedFilms();
});

export const submitInquiry = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected an enquiry");
    return data;
  })
  .handler(async ({ data }) => {
    const { clientAddress } = await import("@/server/client-address.server");
    const { takeRateLimit } = await import("@/lib/rate-limit");
    const address = clientAddress();
    const personal = takeRateLimit(`enquiry:${address}`, 30, 60 * 60 * 1000);
    if (!personal.ok) return { ok: false as const, error: "Too many enquiries were sent from this network. Please wait and try again." };
    const global = takeRateLimit("enquiry:all", 60, 60 * 60 * 1000);
    if (!global.ok) return { ok: false as const, error: "Too many enquiries were sent from this network. Please wait and try again." };

    const submissionKey = String(data.get("submission_key") ?? "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(submissionKey)) {
      return { ok: false as const, error: "Your enquiry couldn't be sent. Please try again." };
    }

    if (String(data.get("website") ?? "").trim()) return { ok: true as const, emailed: false };

    const parsed = inquirySchema.safeParse({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      project_type: String(data.get("project_type") ?? ""),
      budget: String(data.get("budget") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    });
    if (!parsed.success) return { ok: false as const, error: "Please check each field and try again." };

    const { addInquiry, discardInquiryUpload, markInquiryEmailed, readInquiryFiles, replaceInquiryAttachments, saveInquiryMedia } =
      await import("@/server/store.server");
    const { sendEnquiryMail } = await import("@/server/mail.server");

    const uploaded = data.getAll("media").filter((item): item is File => item instanceof File && item.size > 0);
    if (uploaded.length > ENQUIRY_MEDIA_MAX_FILES) {
      return { ok: false as const, error: ENQUIRY_MEDIA_TOO_MANY };
    }
    const saved: Array<{ path: string; name: string; kind: "image" | "video" | "document" }> = [];
    let total = 0;
    for (const file of uploaded) {
      total += file.size;
      if (total > ENQUIRY_MEDIA_TOTAL_BYTES) {
        for (const item of saved) await discardInquiryUpload(item.path);
        return { ok: false as const, error: ENQUIRY_MEDIA_TOTAL };
      }
      const result = await saveInquiryMedia(file, submissionKey);
      if (!result.ok) {
        for (const item of saved) await discardInquiryUpload(item.path);
        return result;
      }
      saved.push(result);
    }
    const attachments = saved.map((file) => ({ url: file.path, name: file.name, kind: file.kind }));

    const stored = await addInquiry({
      submission_key: submissionKey,
      name: parsed.data.name,
      email: parsed.data.email,
      project_type: parsed.data.project_type,
      budget: parsed.data.budget,
      message: parsed.data.message,
      attachments,
    });
    if (!stored.ok) {
      for (const file of saved) await discardInquiryUpload(file.path);
      return stored;
    }

    if (stored.duplicate && stored.inquiry.emailed) {
      for (const file of saved) {
        if (!stored.inquiry.attachments.some((item) => item.url === file.path)) await discardInquiryUpload(file.path);
      }
      return { ok: true as const, emailed: true };
    }

    let inquiry = stored.inquiry;
    if (stored.duplicate && saved.length) {
      const updated = await replaceInquiryAttachments(inquiry.id, attachments);
      if (updated) inquiry = updated;
    }

    const mailFiles = await readInquiryFiles(inquiry.attachments);
    const mailed = await sendEnquiryMail({
      name: inquiry.name,
      email: inquiry.email,
      project_type: inquiry.project_type,
      budget: inquiry.budget,
      message: inquiry.message,
      attachmentNames: mailFiles.map((file) => file.filename),
      attachments: mailFiles,
    });
    if (!mailed.ok) return mailed;
    await markInquiryEmailed({ ...inquiry, emailed: true });
    return { ok: true as const, emailed: true };
  });

async function guarded<T>(task: () => Promise<T>) {
  const { requireStudio } = await import("@/server/auth.server");
  await requireStudio();
  return task();
}

export const getDashboard = createServerFn({ method: "POST" }).handler(async () => {
  return guarded(async () => {
    const { dashboard } = await import("@/server/store.server");
    return dashboard();
  });
});

export const saveStudioProject = createServerFn({ method: "POST" })
  .validator((data: ProjectInput) => projectInput.parse(data))
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { saveProject } = await import("@/server/store.server");
      return saveProject(data);
    });
  });

export const deleteStudioProject = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { removeProject } = await import("@/server/store.server");
      return removeProject(data.id);
    });
  });

export const updateStudioInquiry = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: string }) => ({
    id: z.string().uuid().parse(data.id),
    status: z.enum(["new", "read", "replied"]).parse(data.status),
  }))
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { setInquiryStatus } = await import("@/server/store.server");
      return setInquiryStatus(data.id, data.status);
    });
  });

export const clearStudioInquiries = createServerFn({ method: "POST" }).handler(async () => {
  return guarded(async () => {
    const { clearInquiries } = await import("@/server/store.server");
    return clearInquiries();
  });
});

export const deleteStudioInquiry = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => ({ id: z.string().uuid().parse(data.id) }))
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { removeInquiry } = await import("@/server/store.server");
      return removeInquiry(data.id);
    });
  });

export const saveStudioSettings = createServerFn({ method: "POST" })
  .validator((data: StudioSettings) => settingsInput.parse(data))
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { saveSettings } = await import("@/server/store.server");
      return saveSettings(data);
    });
  });

export const uploadStudioMedia = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Expected a file upload");
    return data;
  })
  .handler(async ({ data }) => {
    return guarded(async () => {
      const { saveUpload } = await import("@/server/store.server");
      const file = data.get("file");
      const projectId = String(data.get("projectId") ?? "");
      const kind = String(data.get("kind") ?? "");
      if (!(file instanceof File)) {
        return { ok: false as const, error: "A media file could not be uploaded. Please check the file size and try again." };
      }
      return saveUpload(file, projectId, kind);
    });
  });
