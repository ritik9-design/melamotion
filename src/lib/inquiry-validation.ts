import { z } from "zod";

const oneLine = (value: string) => !/[\r\n\u0000]/.test(value);

export const inquirySchema = z.object({
  name: z.string().trim().min(1).max(100).refine(oneLine),
  email: z.string().trim().email().max(255).refine(oneLine),
  project_type: z.string().trim().min(1).max(100).refine(oneLine),
  budget: z.string().trim().max(100).optional().refine((value) => value === undefined || oneLine(value)),
  message: z.string().trim().min(1).max(3000).refine((value) => !value.includes("\u0000")),
});

export type InquiryInput = z.infer<typeof inquirySchema>;