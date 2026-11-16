export type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  video_url: string;
  featured: boolean;
  published: boolean;
  created_at: string;
};

export type InquiryAttachment = {
  url: string;
  name: string;
  kind: "image" | "video" | "document";
};

export type Inquiry = {
  id: string;
  submission_key: string;
  name: string;
  email: string;
  project_type: string;
  budget: string | null;
  message: string;
  status: string;
  created_at: string;
  media_url: string | null;
  media_name: string | null;
  media_kind: "image" | "video" | "document" | null;
  attachments: InquiryAttachment[];
  emailed: boolean;
};

export type StudioSettings = {
  contact_email: string;
  instagram: string;
  upwork: string;
};

export type StudioData = {
  projects: Project[];
  inquiries: Inquiry[];
  settings: StudioSettings;
  page?: unknown;
};

export type PublicFilm = Pick<
  Project,
  "id" | "title" | "description" | "category" | "thumbnail_url" | "video_url"
>;

export type ProjectInput = {
  id?: string | undefined;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  video_url: string;
  featured: boolean;
  published: boolean;
};
